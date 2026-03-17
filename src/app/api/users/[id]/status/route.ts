import { NextRequest, NextResponse } from 'next/server';
import { getDb, sql } from '@/lib/db';
import { requireDomainAdmin, getAuthUser, getUsername } from '@/lib/auth';
import { ApiResponse } from '@/lib/types';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * PATCH /api/users/[id]/status — Toggle user active/inactive status
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
    const authError = requireDomainAdmin(req);
    if (authError) return authError;

    const { id } = await params;
    const userId = parseInt(id);
    const body = await req.json();
    const { activ } = body;
    const authUser = getAuthUser(req) || 'system';

    // Strict value bounds checking
    if (activ !== 0 && activ !== 1) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Campul "activ" trebuie să fie 0 sau 1.',
        }, { status: 400 });
    }

    if (isNaN(userId)) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'ID invalid',
        }, { status: 400 });
    }

    try {
        const pool = await getDb();
        const updateResult = await pool.request()
            .input('id', sql.Int, userId)
            .input('activ', sql.Int, activ)
            .input('modificat_de', sql.VarChar, getUsername(authUser))
            .input('modificat_la', sql.DateTime2, new Date())
            .query(`
        UPDATE DMS.UTILIZATORI 
        SET ACTIV = @activ, MODIFICAT_DE = @modificat_de, MODIFICAT_LA = @modificat_la
        WHERE ID = @id AND ISNULL(ACTIV, -1) <> @activ
      `);

        const existsResult = await pool.request()
            .input('id', sql.Int, userId)
            .query(`SELECT ACTIV FROM DMS.UTILIZATORI WHERE ID = @id`);

        if (existsResult.recordset.length === 0) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Utilizatorul nu există',
            }, { status: 404 });
        }

        const wasUpdated = (updateResult.rowsAffected?.[0] || 0) > 0;

        return NextResponse.json<ApiResponse<{ activ: number, idempotent: boolean }>>({
            success: true,
            data: { activ, idempotent: !wasUpdated },
        });
    } catch (error) {
        console.error('Error updating user status:', error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Eroare la actualizarea statusului',
        }, { status: 500 });
    }
}
