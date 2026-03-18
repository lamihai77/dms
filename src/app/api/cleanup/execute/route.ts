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
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

        try {
            const modBy = getUsername(authUser);
            const now = new Date();
            const inParams: string[] = [];
            removeUnique.forEach((_, index) => {
                inParams.push(`@rid${index}`);
            });

            // Pre-flight safety checks: keepId must exist; removeIds must all exist.
            const keepExists = await new sql.Request(transaction)
                .input('keepId', sql.Int, keep)
                .query(`SELECT TOP 1 ID FROM DMS.TERT WITH (UPDLOCK, HOLDLOCK) WHERE ID = @keepId`);
            if (keepExists.recordset.length === 0) {
                await transaction.rollback();
                return NextResponse.json<ApiResponse<null>>({
                    success: false,
                    error: 'keepId nu există în DMS.TERT',
                }, { status: 400 });
            }

            const existsReq = new sql.Request(transaction);
            removeUnique.forEach((id, index) => {
                const k = `rid${index}`;
                existsReq.input(k, sql.Int, id);
            });
            const removeExists = await existsReq.query(`
              SELECT ID FROM DMS.TERT WITH (UPDLOCK, HOLDLOCK) WHERE ID IN (${inParams.join(',')})
            `);
            if (removeExists.recordset.length !== removeUnique.length) {
                await transaction.rollback();
                return NextResponse.json<ApiResponse<null>>({
                    success: false,
                    error: 'Unul sau mai multe removeIds nu există în DMS.TERT',
                }, { status: 400 });
            }

            // Step 1: Reassign users from removeIds to keepId (set-based).
            const usersReq = new sql.Request(transaction)
                .input('keepId', sql.Int, keep)
                .input('mod_de', sql.VarChar, modBy)
                .input('mod_la', sql.DateTime2, now);
            removeUnique.forEach((id, index) => usersReq.input(`rid${index}`, sql.Int, id));
            const updateUsersResult = await usersReq.query(`
            UPDATE DMS.UTILIZATORI
            SET ID_TERT = @keepId,
                MODIFICAT_DE = @mod_de,
                MODIFICAT_LA = @mod_la
            WHERE ID_TERT IN (${inParams.join(',')})
          `);
            const reassignedUsers = updateUsersResult.rowsAffected?.[0] || 0;

            // Step 2: Mark redundant TERT records
            // NOTE: Only delete if no other FK references exist
            // For safety, we just mark them as BLOCAT instead of deleting
            const blockReq = new sql.Request(transaction)
                .input('mod_de', sql.VarChar, modBy)
                .input('mod_la', sql.DateTime2, now);
            removeUnique.forEach((id, index) => blockReq.input(`rid${index}`, sql.Int, id));
            const blockResult = await blockReq.query(`
            UPDATE DMS.TERT 
            SET BLOCAT = 1,
                MODIFICAT_DE = @mod_de,
                MODIFICAT_LA = @mod_la,
                INFO = CASE 
                    WHEN ISNULL(INFO, '') LIKE '%[DUPLICATE - BLOCAT automat, keepId referință]%' THEN INFO
                    ELSE ISNULL(INFO, '') + ' [DUPLICATE - BLOCAT automat, keepId referință]'
                END
            WHERE ID IN (${inParams.join(',')})
              AND (
                ISNULL(BLOCAT, 0) <> 1
                OR ISNULL(INFO, '') NOT LIKE '%[DUPLICATE - BLOCAT automat, keepId referință]%'
              )
          `);
            const blockedTerts = blockResult.rowsAffected?.[0] || 0;

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
