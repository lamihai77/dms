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
    const { activ } = body;

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

        // 1. Verificare Idempotență (Pre-Validare)
        const checkResult = await pool.request()
            .input('id', sql.Numeric, userId)
            .query(`SELECT ACTIV FROM UTILIZATORI WHERE ID = @id`);

        if (checkResult.recordset.length === 0) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Utilizatorul nu există',
            }, { status: 404 });
        }

        const currentStatus = checkResult.recordset[0].ACTIV;
        if (currentStatus === activ) {
            // Idempotent: Nu e nevoie de niciun UPDATE în DB
            console.log(`[IDEMPOTENT] User ${userId} is already in status ${activ}. Skipping write.`);
            return NextResponse.json<ApiResponse<{ activ: number, idempotent: boolean }>>({
                success: true,
                data: { activ, idempotent: true },
            });
        }

        // 2. Executare Scriere (Post-Validare)
        await pool.request()
            .input('id', sql.Numeric, userId)
            .input('activ', sql.Numeric, activ)
            .input('modificat_la', sql.DateTime2, new Date())
            .query(`
        UPDATE UTILIZATORI 
        SET ACTIV = @activ, MODIFICAT_LA = @modificat_la
        WHERE ID = @id
      `);

        return NextResponse.json<ApiResponse<{ activ: number, idempotent: boolean }>>({
            success: true,
            data: { activ, idempotent: false },
        });
    } catch (error) {
        console.error('Error updating user status:', error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Eroare la actualizarea statusului',
        }, { status: 500 });
    }
}
