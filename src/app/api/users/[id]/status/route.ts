import { NextRequest, NextResponse } from 'next/server';
import { getDb, sql } from '@/lib/db';
import { requireDomainAdmin } from '@/lib/auth';
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
    const { activ } = body as { activ: number };

    if (isNaN(userId) || (activ !== 0 && activ !== 1)) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'ID invalid sau valoare status invalidă (trebuie 0 sau 1)',
        }, { status: 400 });
    }

    try {
        const pool = await getDb();
        await pool.request()
            .input('id', sql.Numeric, userId)
            .input('activ', sql.Numeric, activ)
            .input('modificat_la', sql.DateTime2, new Date())
            .query(`
        UPDATE UTILIZATORI 
        SET ACTIV = @activ, MODIFICAT_LA = @modificat_la
        WHERE ID = @id
      `);

        return NextResponse.json<ApiResponse<{ activ: number }>>({
            success: true,
            data: { activ },
        });
    } catch (error) {
        console.error('Error updating user status:', error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Eroare la actualizarea statusului',
        }, { status: 500 });
    }
}
