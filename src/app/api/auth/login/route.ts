import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        // Luăm parola corectă din env, sau folosim un default super simplu dacă lipsește
        const correctPassword = process.env.TEMP_LOGIN_PASSWORD || 'SecretAdmins2026';

        if (password === correctPassword) {
            // Setăm cookie-ul care reprezintă "biletul de acces"
            const response = NextResponse.json({ success: true });
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

        return NextResponse.json(
            { error: 'Parolă incorectă. Acces interzis.' },
            { status: 401 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: 'Eroare la procesarea cererii.' },
            { status: 500 }
        );
    }
}
