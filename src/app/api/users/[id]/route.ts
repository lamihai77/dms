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
            .input('id', sql.Numeric, userId)
            .query(`
        SELECT 
          U.*,
          T.NUME AS TERT_NUME,
          T.COD_CUI AS TERT_CUI,
          T.COD_FISCAL AS TERT_COD_FISCAL,
          T.ADRESA AS TERT_ADRESA,
          T.TELEFON AS TERT_TELEFON,
          T.EMAIL AS TERT_EMAIL
        FROM UTILIZATORI U
        LEFT JOIN TERT T ON U.ID_TERT = T.ID
        WHERE U.ID = @id
      `);

        if (result.recordset.length === 0) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Utilizatorul nu a fost găsit',
            }, { status: 404 });
        }

        return NextResponse.json<ApiResponse<Utilizator>>({
            success: true,
            data: result.recordset[0],
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
    const body: UserUpdateData = await req.json();

    if (isNaN(userId)) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'ID invalid',
        }, { status: 400 });
    }

    // Allowed fields to update
    const allowedFields: (keyof UserUpdateData)[] = [
        'NUME', 'PRENUME', 'EMAIL', 'ACTIV', 'LOCKED',
        'PAROLA', 'ticket_emails', 'adrese_mail_alternative',
    ];

    // Strict bounds validation
    if (body.ACTIV !== undefined && body.ACTIV !== 0 && body.ACTIV !== 1) {
        return NextResponse.json({ success: false, error: 'ACTIV trebuie să fie 0 sau 1' }, { status: 400 });
    }
    if (body.LOCKED !== undefined && body.LOCKED !== 0 && body.LOCKED !== 1) {
        return NextResponse.json({ success: false, error: 'LOCKED trebuie să fie 0 sau 1' }, { status: 400 });
    }

    try {
        const pool = await getDb();

        // 1. Verificare Idempotență. Extragem datele existente
        const currentDataResult = await pool.request()
            .input('id', sql.Numeric, userId)
            .query(`SELECT * FROM UTILIZATORI WHERE ID = @id`);

        if (currentDataResult.recordset.length === 0) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Utilizatorul nu a fost găsit',
            }, { status: 404 });
        }

        const currentUser = currentDataResult.recordset[0];
        const updates: string[] = [];
        const request = pool.request();
        let hasRealChanges = false;

        request.input('id', sql.Numeric, userId);
        request.input('modificat_de', sql.VarChar, getUsername(authUser));
        request.input('modificat_la', sql.DateTime2, new Date());

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                // Comparam valoarea primita cu cea existenta deja in DB pentru a evita update-uri false
                const currentValue = currentUser[field];
                const newValue = body[field];

                if (currentValue !== newValue) {
                    hasRealChanges = true;
                    updates.push(`${field} = @${field}`);
                    if (typeof newValue === 'number') {
                        request.input(field, sql.Numeric, newValue);
                    } else {
                        request.input(field, sql.NVarChar, newValue);
                    }
                }
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

        await request.query(`
      UPDATE UTILIZATORI 
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
