import { NextRequest, NextResponse } from 'next/server';
import { getDb, sql } from '@/lib/db';
import { requireDomainAdmin, getAuthUser, getUsername } from '@/lib/auth';
import { ApiResponse } from '@/lib/types';

/**
 * POST /api/cleanup/execute — Execute duplicate cleanup
 * Body: { keepId: number, removeIds: number[] }
 * 
 * Steps:
 * 1. Check if any removeIds are allocated to users
 * 2. If yes, reassign users to keepId
 * 3. Delete the redundant TERT records
 */
export async function POST(req: NextRequest) {
    const authError = requireDomainAdmin(req);
    if (authError) return authError;

    const authUser = getAuthUser(req) || 'system';
    const body = await req.json();
    const { keepId, removeIds } = body as { keepId: number; removeIds: number[] };
    const keep = Number(keepId);
    const removeUnique = Array.from(new Set((removeIds || []).map((id) => Number(id))))
        .filter((id) => Number.isFinite(id) && id > 0);

    if (!Number.isFinite(keep) || keep <= 0 || removeUnique.length === 0) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Specifică keepId și removeIds',
        }, { status: 400 });
    }
    if (removeUnique.includes(keep)) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'keepId nu poate exista în removeIds',
        }, { status: 400 });
    }

    try {
        const pool = await getDb();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const request = new sql.Request(transaction);

            // Step 1: Reassign users from removeIds to keepId
            for (const removeId of removeUnique) {
                await request
                    .input(`keepId_${removeId}`, sql.Numeric, keep)
                    .input(`removeId_${removeId}`, sql.Numeric, removeId)
                    .input(`mod_de_${removeId}`, sql.VarChar, getUsername(authUser))
                    .input(`mod_la_${removeId}`, sql.DateTime2, new Date())
                    .query(`
            UPDATE UTILIZATORI 
            SET ID_TERT = @keepId_${removeId},
                MODIFICAT_DE = @mod_de_${removeId},
                MODIFICAT_LA = @mod_la_${removeId}
            WHERE ID_TERT = @removeId_${removeId}
          `);
            }

            // Step 2: Delete redundant TERT records
            // NOTE: Only delete if no other FK references exist
            // For safety, we just mark them as BLOCAT instead of deleting
            for (const removeId of removeUnique) {
                const reqBlock = new sql.Request(transaction);
                await reqBlock
                    .input('removeId', sql.Numeric, removeId)
                    .input('mod_de', sql.VarChar, getUsername(authUser))
                    .input('mod_la', sql.DateTime2, new Date())
                    .query(`
            UPDATE TERT 
            SET BLOCAT = 1,
                MODIFICAT_DE = @mod_de,
                MODIFICAT_LA = @mod_la,
                INFO = CASE 
                    WHEN ISNULL(INFO, '') LIKE '%[DUPLICATE - BLOCAT automat, keepId referință]%' THEN INFO
                    ELSE ISNULL(INFO, '') + ' [DUPLICATE - BLOCAT automat, keepId referință]'
                END
            WHERE ID = @removeId
              AND (
                ISNULL(BLOCAT, 0) <> 1
                OR ISNULL(INFO, '') NOT LIKE '%[DUPLICATE - BLOCAT automat, keepId referință]%'
              )
          `);
            }

            await transaction.commit();

            return NextResponse.json<ApiResponse<{ processed: number }>>({
                success: true,
                data: { processed: removeUnique.length },
            });
        } catch (innerError) {
            await transaction.rollback();
            throw innerError;
        }
    } catch (error) {
        console.error('Error executing cleanup:', error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Eroare la executarea cleanup-ului',
        }, { status: 500 });
    }
}
