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

            // Pre-flight safety checks: keepId must exist; removeIds must all exist.
            const keepExists = await request
                .input('keepId', sql.Int, keep)
                .query(`SELECT TOP 1 ID FROM DMS.TERT WHERE ID = @keepId`);
            if (keepExists.recordset.length === 0) {
                await transaction.rollback();
                return NextResponse.json<ApiResponse<null>>({
                    success: false,
                    error: 'keepId nu există în DMS.TERT',
                }, { status: 400 });
            }

            const existsReq = new sql.Request(transaction);
            const existsInParams: string[] = [];
            removeUnique.forEach((id, index) => {
                const k = `rid${index}`;
                existsInParams.push(`@${k}`);
                existsReq.input(k, sql.Int, id);
            });
            const removeExists = await existsReq.query(`
              SELECT ID FROM DMS.TERT WHERE ID IN (${existsInParams.join(',')})
            `);
            if (removeExists.recordset.length !== removeUnique.length) {
                await transaction.rollback();
                return NextResponse.json<ApiResponse<null>>({
                    success: false,
                    error: 'Unul sau mai multe removeIds nu există în DMS.TERT',
                }, { status: 400 });
            }

            // Step 1: Reassign users from removeIds to keepId
            let reassignedUsers = 0;
            for (const removeId of removeUnique) {
                const updateUsersResult = await request
                    .input(`keepId_${removeId}`, sql.Int, keep)
                    .input(`removeId_${removeId}`, sql.Int, removeId)
                    .input(`mod_de_${removeId}`, sql.VarChar, getUsername(authUser))
                    .input(`mod_la_${removeId}`, sql.DateTime2, new Date())
                    .query(`
            UPDATE DMS.UTILIZATORI 
            SET ID_TERT = @keepId_${removeId},
                MODIFICAT_DE = @mod_de_${removeId},
                MODIFICAT_LA = @mod_la_${removeId}
            WHERE ID_TERT = @removeId_${removeId}
          `);
                reassignedUsers += updateUsersResult.rowsAffected?.[0] || 0;
            }

            // Step 2: Delete redundant TERT records
            // NOTE: Only delete if no other FK references exist
            // For safety, we just mark them as BLOCAT instead of deleting
            let blockedTerts = 0;
            for (const removeId of removeUnique) {
                const reqBlock = new sql.Request(transaction);
                const blockResult = await reqBlock
                    .input('removeId', sql.Int, removeId)
                    .input('mod_de', sql.VarChar, getUsername(authUser))
                    .input('mod_la', sql.DateTime2, new Date())
                    .query(`
            UPDATE DMS.TERT 
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
                blockedTerts += blockResult.rowsAffected?.[0] || 0;
            }

            await transaction.commit();

            return NextResponse.json<ApiResponse<{ processed: number; idempotent: boolean; reassignedUsers: number; blockedTerts: number }>>({
                success: true,
                data: {
                    processed: removeUnique.length,
                    idempotent: reassignedUsers === 0 && blockedTerts === 0,
                    reassignedUsers,
                    blockedTerts,
                },
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
