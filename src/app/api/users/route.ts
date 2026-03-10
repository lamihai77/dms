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

    const searchVal = (q || email || cnp || username || nume || '').trim();

    if (!searchVal) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Specifică un criteriu de căutare',
        }, { status: 400 });
    }

    try {
        const pool = await getDb();
        const request = pool.request();

        // Universal search across multiple fields for better UX
        const condition = `(
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

        request.input('val', sql.NVarChar, `%${searchVal}%`);

        const result = await request.query(`
      SELECT TOP 200
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
        (SELECT COUNT(*) FROM DMS.SUBCONTURI S WHERE S.ID_USER = U.ID) AS NR_SUBCONTURI
      FROM DMS.UTILIZATORI U
      LEFT JOIN DMS.TERT T ON U.ID_TERT = T.ID
      LEFT JOIN DMS.JUDET J ON T.ID_JUDET = J.ID
      LEFT JOIN DMS.LOCALITATE L ON T.ID_LOCALITATE = L.ID
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
