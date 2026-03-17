import { NextRequest, NextResponse } from 'next/server';
import { getDb, sql } from '@/lib/db';
import { requireDomainAdmin, getAuthUser, getUsername } from '@/lib/auth';
import { ApiResponse, Utilizator, UserUpdateData } from '@/lib/types';

interface RouteParams {
    params: Promise<{ id: string }>;
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

        const safeUser = { ...result.recordset[0] } as Record<string, unknown>;
        const parola = typeof safeUser.PAROLA === 'string' ? safeUser.PAROLA : '';
        const parolaLegacy = typeof safeUser.parola_c === 'string' ? safeUser.parola_c : '';
        if (!parola && parolaLegacy) {
            // Compatibilitate cu utilizatorii existenți unde hash-ul este în coloana legacy.
            safeUser.PAROLA = parolaLegacy;
        }
        delete safeUser.parola_c;
        delete safeUser.CHEIE_SECURITATE;

        return NextResponse.json<ApiResponse<Utilizator>>({
            success: true,
            data: safeUser,
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
    const body = await req.json() as Partial<Record<keyof UserUpdateData, unknown>>;

    if (isNaN(userId)) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'ID invalid',
        }, { status: 400 });
    }

    // Allowed fields to update
    const normalized: UserUpdateData = {};
    const hasOwn = (k: keyof UserUpdateData) => Object.prototype.hasOwnProperty.call(body, k);
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
        normalizeString('PAROLA', 512, { required: true });
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

        request.input('id', sql.Int, userId);
        request.input('modificat_de', sql.VarChar, getUsername(authUser));
        request.input('modificat_la', sql.DateTime2, new Date());

        const allowedFields: (keyof UserUpdateData)[] = [
            'NUME', 'PRENUME', 'EMAIL', 'ACTIV', 'LOCKED',
            'PAROLA', 'ticket_emails', 'adrese_mail_alternative',
        ];

        for (const field of allowedFields) {
            if (!hasOwn(field)) continue;
            const newValue = normalized[field];
            const currentValue = currentUser[field];
            const same = String(currentValue ?? '') === String(newValue ?? '');
            if (same) continue;

            hasRealChanges = true;
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
            return NextResponse.json<ApiResponse<{ updated: true, idempotent: boolean }>>({
                success: true,
                data: { updated: true, idempotent: true },
            });
        }

        // 2. Executare Scriere Efectivă
        updates.push('MODIFICAT_DE = @modificat_de');
        updates.push('MODIFICAT_LA = @modificat_la');
        if (hasOwn('PAROLA')) {
            updates.push('PASS_SET_DATE = @modificat_la');
            updates.push('parola_c = @PAROLA');
        }

        await request.query(`
      UPDATE DMS.UTILIZATORI 
      SET ${updates.join(', ')}
      WHERE ID = @id
    `);

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
