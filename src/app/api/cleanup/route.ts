import { NextRequest, NextResponse } from 'next/server';
import { getDb, sql } from '@/lib/db';
import { requireDomainAdmin } from '@/lib/auth';
import { ApiResponse } from '@/lib/types';

/**
 * GET /api/cleanup — Find duplicate companies (same COD_CUI with multiple entries)
 */
export async function GET(req: NextRequest) {
    const authError = requireDomainAdmin(req);
    if (authError) return authError;

    try {
        const pool = await getDb();

        // Find CUIs that have more than one TERT record
        const result = await pool.request().query(`
      SELECT 
        T.COD_CUI,
        COUNT(*) AS record_count,
        STRING_AGG(CAST(T.ID AS VARCHAR), ',') AS tert_ids,
        STRING_AGG(T.NUME, ' | ') AS tert_names
      FROM TERT T
      WHERE T.COD_CUI IS NOT NULL 
        AND T.COD_CUI != ''
      GROUP BY T.COD_CUI
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `);

        // For each duplicate, get detailed info
        const duplicates = [];
        for (const row of result.recordset.slice(0, 20)) {
            const ids = row.tert_ids.split(',').map((id: string) => parseInt(id));

            // Check which IDs are allocated to users
            const allocResult = await pool.request()
                .input('ids', sql.VarChar, row.tert_ids)
                .query(`
          SELECT U.ID AS USER_ID, U.NUME, U.PRENUME, U.EMAIL, U.ID_TERT
          FROM UTILIZATORI U
          WHERE U.ID_TERT IN (${ids.map((id: number) => `${id}`).join(',')})
        `);

            duplicates.push({
                COD_CUI: row.COD_CUI,
                record_count: row.record_count,
                tert_ids: ids,
                tert_names: row.tert_names,
                allocated_users: allocResult.recordset,
            });
        }

        return NextResponse.json<ApiResponse<typeof duplicates>>({
            success: true,
            data: duplicates,
            total: result.recordset.length,
        });
    } catch (error) {
        console.error('Error finding duplicates:', error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Eroare la căutarea duplicatelor',
        }, { status: 500 });
    }
}
