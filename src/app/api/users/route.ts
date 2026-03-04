import { NextRequest, NextResponse } from 'next/server';
import { getDb, sql } from '@/lib/db';
import { requireDomainAdmin, getAuthUser, getUsername } from '@/lib/auth';
import { ApiResponse, Utilizator, UserSearchParams } from '@/lib/types';

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

    if (!email && !cnp && !username && !nume) {
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Specifică cel puțin un criteriu de căutare (email, cnp, username, sau nume)',
        }, { status: 400 });
    }

    try {
        const pool = await getDb();
        const request = pool.request();

        const conditions: string[] = [];

        if (email) {
            conditions.push('U.EMAIL LIKE @email');
            request.input('email', sql.VarChar, `%${email}%`);
        }
        if (cnp) {
            conditions.push('T.CNP LIKE @cnp');
            request.input('cnp', sql.VarChar, `%${cnp}%`);
        }
        if (username) {
            conditions.push('(U.USERNAME LIKE @username OR U.USERNAME_LDAP LIKE @username)');
            request.input('username', sql.VarChar, `%${username}%`);
        }
        if (nume) {
            conditions.push('(U.NUME LIKE @nume OR U.PRENUME LIKE @nume)');
            request.input('nume', sql.NVarChar, `%${nume}%`);
        }

        const whereClause = conditions.join(' AND ');

        const result = await request.query(`
      SELECT TOP 50
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
        T.COD_CUI AS TERT_CUI
      FROM UTILIZATORI U
      LEFT JOIN TERT T ON U.ID_TERT = T.ID
      WHERE ${whereClause}
      ORDER BY U.NUME, U.PRENUME
    `);

        return NextResponse.json<ApiResponse<Utilizator[]>>({
            success: true,
            data: result.recordset,
            total: result.recordset.length,
        });
    } catch (error) {
        console.error('Error searching users:', error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Eroare la căutarea utilizatorilor',
        }, { status: 500 });
    }
}
