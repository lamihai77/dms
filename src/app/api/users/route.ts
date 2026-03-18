import { NextRequest, NextResponse } from 'next/server';
import { getDb, sql } from '@/lib/db';
import { requireDomainAdmin } from '@/lib/auth';
import { ApiResponse, Utilizator } from '@/lib/types';

/**
 * GET /api/users?email=...&cnp=...&username=...&nume=...
 * Search users by email, CNP, username, or name.
 */
export async function GET(req: NextRequest) {
    const authError = requireDomainAdmin(req);
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const cnp = searchParams.get('cnp');
    const username = searchParams.get('username');
    const nume = searchParams.get('nume');
    const q = searchParams.get('q');
    const limitRaw = searchParams.get('limit');

    const qVal = (q || '').trim();
    const emailVal = (email || '').trim();
    const cnpVal = (cnp || '').trim();
    const usernameVal = (username || '').trim();
    const numeVal = (nume || '').trim();
    const searchVal = (qVal || emailVal || cnpVal || usernameVal || numeVal).trim();
    const parsedLimit = Number(limitRaw ?? 200);
    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 200)
        : 200;

    if (!searchVal) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Specifică un criteriu de căutare',
        }, { status: 400 });
    }
    if (searchVal.length < 2) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Criteriul de căutare trebuie să aibă minim 2 caractere',
        }, { status: 400 });
    }
    if (searchVal.length > 120) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Criteriul de căutare este prea lung',
        }, { status: 400 });
    }

    try {
        const pool = await getDb();
        const request = pool.request();
        request.input('top', sql.Int, limit);

        let condition = '';
        if (qVal) {
            // Fallback broad search (contains) used by generic query box.
            condition = `(
                U.NUME LIKE @val OR
                U.PRENUME LIKE @val OR
                U.EMAIL LIKE @val OR
                U.USERNAME LIKE @val OR
                U.USERNAME_LDAP LIKE @val OR
                U.adrese_mail_alternative LIKE @val OR
                T.NUME LIKE @val OR
                T.COD_CUI LIKE @val OR
                T.CNP LIKE @val
            )`;
            request.input('val', sql.NVarChar, `%${qVal}%`);
        } else if (emailVal) {
            condition = '(U.EMAIL = @emailExact OR U.EMAIL LIKE @emailPrefix)';
            request.input('emailExact', sql.NVarChar, emailVal);
            request.input('emailPrefix', sql.NVarChar, `${emailVal}%`);
        } else if (cnpVal) {
            condition = '(T.CNP = @cnpExact OR T.CNP LIKE @cnpPrefix)';
            request.input('cnpExact', sql.VarChar, cnpVal);
            request.input('cnpPrefix', sql.VarChar, `${cnpVal}%`);
        } else if (usernameVal) {
            condition = `(
                U.USERNAME = @userExact OR
                U.USERNAME LIKE @userPrefix OR
                U.USERNAME_LDAP = @userExact OR
                U.USERNAME_LDAP LIKE @userPrefix
            )`;
            request.input('userExact', sql.VarChar, usernameVal);
            request.input('userPrefix', sql.VarChar, `${usernameVal}%`);
        } else {
            condition = `(
                U.NUME LIKE @namePrefix OR
                U.PRENUME LIKE @namePrefix OR
                (U.NUME + ' ' + U.PRENUME) LIKE @namePrefix
            )`;
            request.input('namePrefix', sql.NVarChar, `${numeVal}%`);
        }

        const result = await request.query(`
      SELECT TOP (@top)
        U.ID,
        U.NUME,
        U.PRENUME,
        U.USERNAME,
        U.EMAIL,
        U.ACTIV,
        U.LOCKED,
        U.LOCKED_AT,
        U.LOGIN_FAIL_REMAINS,
        U.DATA_ACTIV_START,
        U.DATA_ACTIV_END,
        U.CREAT_DE,
        U.CREAT_LA,
        U.MODIFICAT_DE,
        U.MODIFICAT_LA,
        U.PASS_SET_DATE,
        U.USERNAME_LDAP,
        U.READ_ONLY,
        U.ID_TERT,
        U.ticket_emails,
        U.adrese_mail_alternative,
        T.NUME AS TERT_NUME,
        T.COD_CUI AS TERT_CUI,
        T.CNP AS TERT_CNP,
        T.PERS_FIZ AS TERT_PERS_FIZ,
        J.DENUMIRE AS TERT_JUDET,
        L.DENUMIRE AS TERT_LOCALITATE,
        ISNULL(SC.NR_SUBCONTURI, 0) AS NR_SUBCONTURI
      FROM DMS.UTILIZATORI U
      LEFT JOIN DMS.TERT T ON U.ID_TERT = T.ID
      LEFT JOIN DMS.JUDET J ON T.ID_JUDET = J.ID
      LEFT JOIN DMS.LOCALITATE L ON T.ID_LOCALITATE = L.ID
      LEFT JOIN (
        SELECT S.ID_USER, COUNT(*) AS NR_SUBCONTURI
        FROM DMS.SUBCONTURI S
        GROUP BY S.ID_USER
      ) SC ON SC.ID_USER = U.ID
      WHERE ${condition}
      ORDER BY U.NUME, U.PRENUME
    `);

        return NextResponse.json<ApiResponse<Utilizator[]>>({
            success: true,
            data: result.recordset,
            total: result.recordset.length,
            _meta: { source: "DMS.UTILIZATORI + DMS.TERT" }
        });
    } catch (error) {
        console.error('Error searching users:', error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Eroare la căutarea utilizatorilor',
        }, { status: 500 });
    }
}
