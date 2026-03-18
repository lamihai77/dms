import { NextRequest, NextResponse } from 'next/server';
import { getDb, sql } from '@/lib/db';
import { requireDomainAdmin, getAuthUser, getUsername } from '@/lib/auth';
import { ApiResponse, Utilizator, UserUpdateData } from '@/lib/types';

interface RouteParams {
    params: Promise<{ id: string }>;
}

type SanitizedUtilizator = Omit<Utilizator, 'CHEIE_SECURITATE' | 'parola_c'>;

function hasStoredPassword(row: Record<string, unknown>): boolean {
    const candidates = ['PAROLA', 'parola_c', 'PAROLA_C', 'CHEIE_SECURITATE'] as const;
    for (const key of candidates) {
        const value = row[key];
        if (typeof value !== 'string') continue;
        const normalized = value.trim();
        if (!normalized) continue;
        if (normalized.toLowerCase() === 'null') continue;
        return true;
    }
    return false;
}

/**
 * GET /api/users/[id] — Get a single user with full details
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
    const authError = requireDomainAdmin(req);
    if (authError) return authError;

    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'ID invalid',
        }, { status: 400 });
    }

    try {
        const pool = await getDb();
        const result = await pool.request()
            .input('id', sql.Int, userId)
            .query(`
        SELECT 
          U.*,
          T.NUME AS TERT_NUME,
          T.COD_CUI AS TERT_CUI,
          T.COD_FISCAL AS TERT_COD_FISCAL,
          T.ADRESA AS TERT_ADRESA,
          T.TELEFON AS TERT_TELEFON,
          T.EMAIL AS TERT_EMAIL
        FROM DMS.UTILIZATORI U
        LEFT JOIN DMS.TERT T ON U.ID_TERT = T.ID
        WHERE U.ID = @id
      `);

        if (result.recordset.length === 0) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Utilizatorul nu a fost găsit',
            }, { status: 404 });
        }

        const sourceUser = result.recordset[0] as Record<string, unknown>;
        const safeUser = { ...sourceUser } as Record<string, unknown>;
        safeUser.PASSWORD_SET = hasStoredPassword(sourceUser);
        // Nu expunem parola (nici hash/encrypted) catre client.
        safeUser.PAROLA = '';
        delete safeUser.parola_c;
        delete safeUser.PAROLA_C;
        delete safeUser.CHEIE_SECURITATE;

        return NextResponse.json<ApiResponse<SanitizedUtilizator>>({
            success: true,
            data: safeUser as SanitizedUtilizator,
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Eroare la încărcarea utilizatorului',
        }, { status: 500 });
    }
}

/**
 * PUT /api/users/[id] — Update user fields
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
    const authError = requireDomainAdmin(req);
    if (authError) return authError;

    const { id } = await params;
    const userId = parseInt(id);
    const authUser = getAuthUser(req) || 'system';
    const body = await req.json() as Partial<Record<keyof UserUpdateData, unknown>> & {
        dryRun?: unknown;
        expectedModificatLa?: unknown;
    };
    const dryRun = body.dryRun === true;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Payload invalid',
        }, { status: 400 });
    }
    const allowedBodyKeys = new Set<keyof UserUpdateData | 'dryRun' | 'expectedModificatLa'>([
        'NUME', 'PRENUME', 'EMAIL', 'PAROLA', 'ACTIV', 'LOCKED', 'ticket_emails', 'adrese_mail_alternative',
        'dryRun', 'expectedModificatLa',
    ]);
    const unknownKeys = Object.keys(body).filter((k) => !allowedBodyKeys.has(k as keyof UserUpdateData | 'dryRun' | 'expectedModificatLa'));
    if (unknownKeys.length > 0) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: `Câmpuri nepermise în payload: ${unknownKeys.join(', ')}`,
        }, { status: 400 });
    }

    if (isNaN(userId)) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'ID invalid',
        }, { status: 400 });
    }

    // Allowed fields to update
    const normalized: UserUpdateData = {};
    const hasOwn = (k: keyof UserUpdateData) => Object.prototype.hasOwnProperty.call(body, k);
    const hasNormalizedOwn = (k: keyof UserUpdateData) => Object.prototype.hasOwnProperty.call(normalized, k);
    type StringField = 'NUME' | 'PRENUME' | 'EMAIL' | 'PAROLA' | 'ticket_emails' | 'adrese_mail_alternative';

    const normalizeString = (key: StringField, maxLen: number, options?: { required?: boolean; email?: boolean }) => {
        if (!hasOwn(key)) return;
        const raw = body[key];
        if (typeof raw !== 'string') {
            throw new Error(`Câmpul ${key} trebuie să fie text`);
        }
        const value = raw.trim();
        if (options?.required && value.length === 0) {
            throw new Error(`Câmpul ${key} este obligatoriu`);
        }
        if (value.length > maxLen) {
            throw new Error(`Câmpul ${key} depășește ${maxLen} caractere`);
        }
        if (options?.email && value.length > 0) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                throw new Error('Email invalid');
            }
        }
        (normalized as Record<StringField, string>)[key] = value;
    };

    const normalizeBit = (key: 'ACTIV' | 'LOCKED') => {
        if (!hasOwn(key)) return;
        const raw = body[key];
        const asNumber = typeof raw === 'number' ? raw : Number(raw);
        if (!Number.isInteger(asNumber) || (asNumber !== 0 && asNumber !== 1)) {
            throw new Error(`Câmpul ${key} trebuie să fie 0 sau 1`);
        }
        normalized[key] = asNumber;
    };

    try {
        normalizeString('NUME', 100, { required: true });
        normalizeString('PRENUME', 100, { required: true });
        normalizeString('EMAIL', 254, { email: true });
        if (hasOwn('PAROLA')) {
            const rawPassword = body.PAROLA;
            if (typeof rawPassword !== 'string') {
                throw new Error('Câmpul PAROLA trebuie să fie text');
            }
            const passwordValue = rawPassword.trim();
            // Parola este opțională la update: dacă e goală, ignorăm câmpul.
            if (passwordValue.length > 0) {
                if (passwordValue.length > 512) {
                    throw new Error('Câmpul PAROLA depășește 512 caractere');
                }
                normalized.PAROLA = passwordValue;
            }
        }
        normalizeString('ticket_emails', 2000);
        normalizeString('adrese_mail_alternative', 4000);
        normalizeBit('ACTIV');
        normalizeBit('LOCKED');
    } catch (validationError) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: validationError instanceof Error ? validationError.message : 'Date invalide',
        }, { status: 400 });
    }

    let expectedModificatLa: Date | null = null;
    if (!dryRun) {
        if (!(typeof body.expectedModificatLa === 'string' || body.expectedModificatLa === null)) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Lipsește precondiția de concurență (expectedModificatLa). Rulează întâi dry-run.',
            }, { status: 428 });
        }
        if (typeof body.expectedModificatLa === 'string') {
            const parsed = new Date(body.expectedModificatLa);
            if (Number.isNaN(parsed.getTime())) {
                return NextResponse.json<ApiResponse<null>>({
                    success: false,
                    error: 'expectedModificatLa invalid',
                }, { status: 400 });
            }
            expectedModificatLa = parsed;
        }
    }

    try {
        const pool = await getDb();

        // 1. Verificare Idempotență. Extragem datele existente
        const currentDataResult = await pool.request()
            .input('id', sql.Int, userId)
            .query(`SELECT * FROM DMS.UTILIZATORI WHERE ID = @id`);

        if (currentDataResult.recordset.length === 0) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Utilizatorul nu a fost găsit',
            }, { status: 404 });
        }

        const currentUser = currentDataResult.recordset[0] as Record<string, unknown>;
        const updates: string[] = [];
        const request = pool.request();
        let hasRealChanges = false;
        const diffs: Array<{ field: string; oldValue: string; newValue: string }> = [];

        const currentModRaw = currentUser.MODIFICAT_LA;
        const currentModDate = currentModRaw instanceof Date
            ? currentModRaw
            : (currentModRaw ? new Date(String(currentModRaw)) : null);
        const currentModIso = currentModDate && !Number.isNaN(currentModDate.getTime())
            ? currentModDate.toISOString()
            : null;

        request.input('id', sql.Int, userId);
        request.input('modificat_de', sql.VarChar, getUsername(authUser));
        request.input('modificat_la', sql.DateTime2, new Date());

        const allowedFields: (keyof UserUpdateData)[] = [
            'NUME', 'PRENUME', 'EMAIL', 'ACTIV', 'LOCKED',
            'PAROLA', 'ticket_emails', 'adrese_mail_alternative',
        ];

        for (const field of allowedFields) {
            if (!hasOwn(field)) continue;
            if (field === 'PAROLA' && !hasNormalizedOwn('PAROLA')) continue;
            const newValue = normalized[field];
            const currentValue = currentUser[field];
            const same = String(currentValue ?? '') === String(newValue ?? '');
            if (same) continue;

            hasRealChanges = true;
            diffs.push({
                field,
                oldValue: String(currentValue ?? ''),
                newValue: String(newValue ?? ''),
            });
            updates.push(`${field} = @${field}`);
            if (typeof newValue === 'number') {
                request.input(field, sql.Int, newValue);
            } else {
                request.input(field, sql.NVarChar, newValue ?? '');
            }
        }

        if (updates.length === 0 || !hasRealChanges) {
            // Idempotent: Nu e nevoie de niciun UPDATE în DB
            console.log(`[IDEMPOTENT] No changes detected for User ${userId}. Skipping write.`);
            return NextResponse.json<ApiResponse<{ updated: true, idempotent: boolean; dryRun?: boolean; changes?: Array<{ field: string; oldValue: string; newValue: string }>; currentVersion?: string | null }>>({
                success: true,
                data: {
                    updated: true,
                    idempotent: true,
                    dryRun,
                    changes: [],
                    currentVersion: currentModIso,
                },
            });
        }

        if (dryRun) {
            return NextResponse.json<ApiResponse<{ updated: false; idempotent: boolean; dryRun: boolean; changes: Array<{ field: string; oldValue: string; newValue: string }>; currentVersion: string | null }>>({
                success: true,
                data: {
                    updated: false,
                    idempotent: false,
                    dryRun: true,
                    changes: diffs,
                    currentVersion: currentModIso,
                },
            });
        }

        // 2. Executare Scriere Efectivă
        updates.push('MODIFICAT_DE = @modificat_de');
        updates.push('MODIFICAT_LA = @modificat_la');
        if (hasNormalizedOwn('PAROLA')) {
            updates.push('PASS_SET_DATE = @modificat_la');
            updates.push('parola_c = @PAROLA');
        }
        request.input('expected_modificat_la', sql.DateTime2, expectedModificatLa);

        const writeResult = await request.query(`
      UPDATE DMS.UTILIZATORI 
      SET ${updates.join(', ')}
      WHERE ID = @id
        AND (
          (MODIFICAT_LA IS NULL AND @expected_modificat_la IS NULL)
          OR MODIFICAT_LA = @expected_modificat_la
        )
    `);
        const rowsAffected = writeResult.rowsAffected?.[0] || 0;
        if (rowsAffected === 0) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Înregistrarea a fost modificată între timp de alt operator. Reîncarcă datele și reîncearcă.',
            }, { status: 409 });
        }

        return NextResponse.json<ApiResponse<{ updated: true, idempotent: boolean }>>({
            success: true,
            data: { updated: true, idempotent: false },
        });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Eroare la actualizarea utilizatorului',
        }, { status: 500 });
    }
}
