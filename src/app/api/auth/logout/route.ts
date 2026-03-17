import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    console.log('[LOGOUT API] Received request, clearing session cookie');
    const secure = request.url.startsWith('https://');
    const response = NextResponse.json({ ok: true });

    // Stergem cookie-ul dms_admin_auth setand maxAge la 0
    response.cookies.set({
        name: 'dms_admin_auth',
        value: '',
        httpOnly: true,
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
        secure,
    });

    return response;
}
