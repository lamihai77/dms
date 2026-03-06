import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Lăsăm să treacă rutele publice (pagina de login, API-ul de login și resursele statice CSS/imagini)
    if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/api/auth/login') ||
        pathname.startsWith('/_next') ||
        pathname.match(/\.(png|jpg|jpeg|svg|css)$/)
    ) {
        return NextResponse.next();
    }

    // Verificăm dacă există cookie-ul creat la autentificare
    const cookie = request.cookies.get('dms_admin_auth');

    // Dacă nu există cookie-ul, redirecționăm forțat către /login
    if (!cookie || cookie.value !== 'authenticated') {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    // Are biletul? Îl lăsăm să acceseze platforma liniștit.
    return NextResponse.next();
}

// Spunem Next.js pe ce rute să aplice/verifice acest paznic
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
