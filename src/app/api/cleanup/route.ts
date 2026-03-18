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

        // Limit directly in SQL to avoid computing full duplicate set on every request.
        const duplicateCuiResult = await pool.request().query(`
      SELECT TOP 20
        T.COD_CUI,
        COUNT(*) AS record_count
      FROM DMS.TERT T
      WHERE T.COD_CUI IS NOT NULL
        AND T.COD_CUI != ''
      GROUP BY T.COD_CUI
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `);

        const duplicateRows = duplicateCuiResult.recordset as Array<{ COD_CUI: string; record_count: number }>;
        if (duplicateRows.length === 0) {
            return NextResponse.json<ApiResponse<[]>>({
                success: true,
                data: [],
                total: 0,
            });
        }

        const detailsReq = pool.request();
        const cuiParams: string[] = [];
        duplicateRows.forEach((row, index) => {
            const key = `cui${index}`;
            cuiParams.push(`@${key}`);
            detailsReq.input(key, sql.VarChar, row.COD_CUI);
        });

        const detailsResult = await detailsReq.query(`
      SELECT
        T.COD_CUI,
        T.ID AS TERT_ID,
        T.NUME AS TERT_NUME,
        U.ID AS USER_ID,
        U.NUME AS USER_NUME,
        U.PRENUME AS USER_PRENUME,
        U.EMAIL AS USER_EMAIL,
        U.ID_TERT
      FROM DMS.TERT T
      LEFT JOIN DMS.UTILIZATORI U ON U.ID_TERT = T.ID
      WHERE T.COD_CUI IN (${cuiParams.join(',')})
      ORDER BY T.COD_CUI, T.ID
    `);

        const byCui = new Map<string, {
            COD_CUI: string;
            record_count: number;
            tert_ids: number[];
            tert_names: string[];
            allocated_users: Array<{ USER_ID: number; NUME: string; PRENUME: string; EMAIL: string; ID_TERT: number }>;
        }>();

        for (const row of duplicateRows) {
            byCui.set(row.COD_CUI, {
                COD_CUI: row.COD_CUI,
                record_count: row.record_count,
                tert_ids: [],
                tert_names: [],
                allocated_users: [],
            });
        }

        for (const row of detailsResult.recordset as Array<Record<string, unknown>>) {
            const cui = String(row.COD_CUI || '');
            const bucket = byCui.get(cui);
            if (!bucket) continue;

            const tertId = Number(row.TERT_ID);
            if (Number.isInteger(tertId) && tertId > 0 && !bucket.tert_ids.includes(tertId)) {
                bucket.tert_ids.push(tertId);
            }

            const tertName = String(row.TERT_NUME || '').trim();
            if (tertName && !bucket.tert_names.includes(tertName)) {
                bucket.tert_names.push(tertName);
            }

            const userId = Number(row.USER_ID);
            if (Number.isInteger(userId) && userId > 0) {
                bucket.allocated_users.push({
                    USER_ID: userId,
                    NUME: String(row.USER_NUME || ''),
                    PRENUME: String(row.USER_PRENUME || ''),
                    EMAIL: String(row.USER_EMAIL || ''),
                    ID_TERT: Number(row.ID_TERT || 0),
                });
            }
        }

        const duplicates = duplicateRows
            .map((row) => byCui.get(row.COD_CUI))
            .filter((row): row is NonNullable<typeof row> => Boolean(row))
            .map((row) => ({
                COD_CUI: row.COD_CUI,
                record_count: row.record_count,
                tert_ids: row.tert_ids,
                tert_names: row.tert_names.join(' | '),
                allocated_users: row.allocated_users,
            }));

        return NextResponse.json<ApiResponse<typeof duplicates>>({
            success: true,
            data: duplicates,
            total: duplicates.length,
        });
    } catch (error) {
        console.error('Error finding duplicates:', error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Eroare la căutarea duplicatelor',
        }, { status: 500 });
    }
}
