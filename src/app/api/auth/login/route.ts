import { NextResponse } from 'next/server';
import { createAuthToken, getUsername, isAllowedAdmin, validateAdCredentials } from '@/lib/auth';

export async function POST(request: Request) {
    console.log('[LOGIN API] Received request');
    try {
        const formData = await request.formData();
        const username = (formData.get('username') as string || '').trim();
        const password = (formData.get('password') as string || '');
        const shortUser = getUsername(username);

        if (!shortUser || !password) {
            return NextResponse.json({ ok: false, error: 'Invalid' }, { status: 401 });
        }

        if (!isAllowedAdmin(shortUser)) {
            console.error(`[LOGIN API] User '${shortUser}' is not allowed by DOMAIN_ADMINS.`);
            return NextResponse.json({ ok: false, error: 'Invalid' }, { status: 403 });
        }

        const adOk = await validateAdCredentials(shortUser, password);
        if (!adOk) {
            console.log(`[LOGIN API] AD validation failed for user '${shortUser}'.`);
            return NextResponse.json({ ok: false, error: 'Invalid' }, { status: 401 });
        }

        const token = createAuthToken(shortUser);
        const response = NextResponse.json({ ok: true });
        response.cookies.set({
            name: 'dms_admin_auth',
            value: token,
            httpOnly: true,
            path: '/',
            maxAge: 60 * 60 * 8,
            sameSite: 'lax',
            secure: request.url.startsWith('https://'),
        });
        return response;
    } catch (error) {
        console.error('Eroare Login Server', error);
        return NextResponse.json({ ok: false, error: 'ServerFail' }, { status: 500 });
    }
}
