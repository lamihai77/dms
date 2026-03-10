import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    console.log('[LOGIN API] Received request');
    try {
        const formData = await request.formData();
        const password = formData.get('password') as string;

        // Luăm parola corectă din env, sau folosim un default super simplu dacă lipsește
        const correctPassword = process.env.TEMP_LOGIN_PASSWORD || 'SecretAdmins2026';

        if (password === correctPassword) {
            console.log('[LOGIN API] Password matched. Setting cookie & Redirecting');
            // La Submit HTML standard trebuie returnat direct un Redirect!
            const host = request.headers.get('host') || '192.168.70.23:3000';
            const protocol = request.headers.get('x-forwarded-proto') || 'http';
            const response = NextResponse.redirect(new URL('/', `${protocol}://${host}`));
            response.cookies.set({
                name: 'dms_admin_auth',
                value: 'authenticated',
                httpOnly: true, // Nu poate fi citit prin Javascript (Securitate)
                path: '/',
                maxAge: 60 * 60 * 24, // Expiră în 24 ore
                sameSite: 'lax',
            });
            return response;
        }

        console.log('[LOGIN API] Invalid password provided.');
        // Trimite înapoi la login cu eroare printată prin QueryParams
        return NextResponse.redirect(new URL('/login?error=Invalid', request.url));
    } catch (error) {
        console.error('Eroare Login Server', error);
        return NextResponse.redirect(new URL('/login?error=ServerFail', request.url));
    }
}
