import { NextRequest, NextResponse } from 'next/server';
import { getDb, sql } from '@/lib/db';
import { requireDomainAdmin } from '@/lib/auth';
import { ApiResponse } from '@/lib/types';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(
    req: NextRequest,
    { params }: RouteParams
) {
    const authError = requireDomainAdmin(req);
    if (authError) return authError;

    const { id: userId } = await params;
    try {
        const pool = await getDb();
        const result = await pool.request()
            .input('userId', sql.VarChar, userId)
            .query(`
                SELECT 
                    S.ID,
                    S.ID_USER,
                    S.ID_TERT,
                    T.NUME AS TERT_NUME,
                    T.COD_CUI AS TERT_CUI,
                    T.CNP AS TERT_CNP,
                    T.ACTIV AS TERT_ACTIV,
                    T.BLOCAT AS TERT_BLOCAT,
                    J.DENUMIRE AS TERT_JUDET,
                    L.DENUMIRE AS TERT_LOCALITATE
                FROM DMS.SUBCONTURI S
                LEFT JOIN DMS.TERT T ON S.ID_TERT = T.ID
                LEFT JOIN DMS.JUDET J ON T.ID_JUDET = J.ID
                LEFT JOIN DMS.LOCALITATE L ON T.ID_LOCALITATE = L.ID
                WHERE S.ID_USER = @userId
                ORDER BY T.NUME
            `);

        return NextResponse.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Error fetching subaccounts:', error);
        return NextResponse.json({
            success: false,
            error: 'Eroare la preluarea subconturilor'
        }, { status: 500 });
    }
}
