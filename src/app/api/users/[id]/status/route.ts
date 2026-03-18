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
    const body = await req.json() as {
        activ?: unknown;
        dryRun?: unknown;
        expectedModificatLa?: unknown;
    };
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Payload invalid',
        }, { status: 400 });
    }
    const allowedBodyKeys = new Set(['activ', 'dryRun', 'expectedModificatLa']);
    const unknownKeys = Object.keys(body).filter((k) => !allowedBodyKeys.has(k));
    if (unknownKeys.length > 0) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: `Câmpuri nepermise în payload: ${unknownKeys.join(', ')}`,
        }, { status: 400 });
    }
    const activ = body.activ;
    const dryRun = body.dryRun === true;
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
        const existsResult = await pool.request()
            .input('id', sql.Int, userId)
            .query(`SELECT ACTIV, MODIFICAT_LA FROM DMS.UTILIZATORI WHERE ID = @id`);

        if (existsResult.recordset.length === 0) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Utilizatorul nu există',
            }, { status: 404 });
        }

        const current = existsResult.recordset[0] as { ACTIV: number | null; MODIFICAT_LA: Date | string | null };
        const currentStatus = Number(current.ACTIV ?? 0);
        const currentModDate = current.MODIFICAT_LA instanceof Date
            ? current.MODIFICAT_LA
            : (current.MODIFICAT_LA ? new Date(String(current.MODIFICAT_LA)) : null);
        const currentVersion = currentModDate && !Number.isNaN(currentModDate.getTime())
            ? currentModDate.toISOString()
            : null;

        if (dryRun) {
            const oldValue = currentStatus === 1 ? '1 (Activ)' : '0 (Inactiv)';
            const newValue = activ === 1 ? '1 (Activ)' : '0 (Inactiv)';
            const idempotent = currentStatus === activ;
            return NextResponse.json<ApiResponse<{
                activ: number;
                idempotent: boolean;
                dryRun: boolean;
                currentVersion: string | null;
                changes: Array<{ field: string; oldValue: string; newValue: string }>;
            }>>({
                success: true,
                data: {
                    activ,
                    idempotent,
                    dryRun: true,
                    currentVersion,
                    changes: idempotent ? [] : [{ field: 'ACTIV', oldValue, newValue }],
                },
            });
        }

        if (!(typeof body.expectedModificatLa === 'string' || body.expectedModificatLa === null)) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Lipsește precondiția de concurență (expectedModificatLa). Rulează întâi dry-run.',
            }, { status: 428 });
        }
        let expectedModificatLa: Date | null = null;
        if (typeof body.expectedModificatLa === 'string') {
            const parsed = new Date(body.expectedModificatLa);
            if (Number.isNaN(parsed.getTime())) {
                return NextResponse.json<ApiResponse<null>>({
                    success: false,
                    error: 'expectedModificatLa invalid',
                }, { status: 400 });
            }
            expectedModificatLa = parsed;
        }

        if (currentStatus === activ) {
            return NextResponse.json<ApiResponse<{ activ: number, idempotent: boolean }>>({
                success: true,
                data: { activ, idempotent: true },
            });
        }

        const request = pool.request()
            .input('id', sql.Int, userId)
            .input('activ', sql.Int, activ)
            .input('modificat_de', sql.VarChar, getUsername(authUser))
            .input('modificat_la', sql.DateTime2, new Date())
            .input('expected_modificat_la', sql.DateTime2, expectedModificatLa);

        const updateResult = await request.query(`
        UPDATE DMS.UTILIZATORI 
        SET ACTIV = @activ, MODIFICAT_DE = @modificat_de, MODIFICAT_LA = @modificat_la
        WHERE ID = @id
          AND (
            (MODIFICAT_LA IS NULL AND @expected_modificat_la IS NULL)
            OR MODIFICAT_LA = @expected_modificat_la
          )
      `);

        const wasUpdated = (updateResult.rowsAffected?.[0] || 0) > 0;
        if (!wasUpdated) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Înregistrarea a fost modificată între timp de alt operator. Reîncarcă datele și reîncearcă.',
            }, { status: 409 });
        }

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
