import { NextRequest, NextResponse } from 'next/server';
import { getDb, sql } from '@/lib/db';
import { requireDomainAdmin } from '@/lib/auth';
import { ApiResponse, Tert } from '@/lib/types';

/**
 * GET /api/companies?cui=...&denumire=...
 * Search companies (TERT) by CUI or name.
 */
export async function GET(req: NextRequest) {
    const authError = requireDomainAdmin(req);
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const cui = searchParams.get('cui')?.trim();
    const denumire = searchParams.get('denumire')?.trim();
    const userId = searchParams.get('userId');

    if (cui && cui.length > 64) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'CUI prea lung',
        }, { status: 400 });
    }
    if (denumire && denumire.length > 120) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Denumire prea lungă',
        }, { status: 400 });
    }

    try {
        const pool = await getDb();
        const request = pool.request();
        const conditions: string[] = [];

        if (cui) {
            conditions.push('T.COD_CUI LIKE @cui');
            request.input('cui', sql.VarChar, `%${cui}%`);
        }
        if (denumire) {
            conditions.push('T.NUME LIKE @denumire');
            request.input('denumire', sql.NVarChar, `%${denumire}%`);
        }
        if (userId) {
            const parsedUserId = Number(userId);
            if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
                return NextResponse.json<ApiResponse<null>>({
                    success: false,
                    error: 'userId invalid',
                }, { status: 400 });
            }
            // Find the TERT associated with a specific user
            conditions.push('T.ID IN (SELECT ID_TERT FROM DMS.UTILIZATORI WHERE ID = @userId AND ID_TERT IS NOT NULL)');
            request.input('userId', sql.Int, parsedUserId);
        }

        if (conditions.length === 0) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Specifică cel puțin un criteriu: cui, denumire, sau userId',
            }, { status: 400 });
        }

        const whereClause = conditions.join(' AND ');

        const result = await request.query(`
      SELECT TOP 50
        T.ID,
        T.NUME,
        T.COD_CUI,
        T.COD_FISCAL,
        T.RJ,
        T.ADRESA,
        T.ID_JUDET,
        T.COD_POSTAL,
        T.TELEFON,
        T.EMAIL,
        T.WEB,
        T.PERSOANA_CONTACT,
        T.REPREZ_LEGAL,
        T.PERS_FIZ,
        T.CNP,
        T.SERIE_ACT,
        T.NUMAR_ACT,
        T.ACTIV,
        T.BLOCAT,
        T.Suspendat,
        T.Radiat,
        T.AUTORIZAT,
        T.LICENTE_AUTORIZATII,
        T.PROIECTARE_INST_ELEC,
        T.EXECUTIE_INST_ELEC,
        T.CREAT_DE,
        T.CREAT_LA,
        T.MODIFICAT_DE,
        T.MODIFICAT_LA
      FROM DMS.TERT T
      WHERE ${whereClause}
      ORDER BY T.NUME
    `);

        return NextResponse.json<ApiResponse<Tert[]>>({
            success: true,
            data: result.recordset,
            total: result.recordset.length,
            _meta: { source: "DMS.TERT" }
        });
    } catch (error) {
        console.error('Error searching companies:', error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Eroare la căutarea companiilor',
        }, { status: 500 });
    }
}
