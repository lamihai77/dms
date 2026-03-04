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

    const updates: string[] = [];
    const pool = await getDb();
    const request = pool.request();
    request.input('id', sql.Numeric, userId);
    request.input('modificat_de', sql.VarChar, getUsername(authUser));
    request.input('modificat_la', sql.DateTime2, new Date());

    for (const field of allowedFields) {
        if (body[field] !== undefined) {
            updates.push(`${field} = @${field}`);
            const value = body[field];
            if (typeof value === 'number') {
                request.input(field, sql.Numeric, value);
            } else {
                request.input(field, sql.NVarChar, value);
            }
        }
    }

    if (updates.length === 0) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Niciun câmp de actualizat',
        }, { status: 400 });
    }

    updates.push('MODIFICAT_DE = @modificat_de');
    updates.push('MODIFICAT_LA = @modificat_la');

    try {
        await request.query(`
      UPDATE UTILIZATORI 
      SET ${updates.join(', ')}
      WHERE ID = @id
    `);

        return NextResponse.json<ApiResponse<{ updated: true }>>({
            success: true,
            data: { updated: true },
        });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Eroare la actualizarea utilizatorului',
        }, { status: 500 });
    }
}
