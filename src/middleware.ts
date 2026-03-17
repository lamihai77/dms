import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Lăsăm să treacă rutele publice (login, health și resurse statice)
    if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/api/auth/login') ||
        pathname.startsWith('/api/auth/logout') ||
        pathname.startsWith('/api/health') ||
        pathname.startsWith('/_next') ||
        pathname.match(/\.(png|jpg|jpeg|svg|css|js|ico)$/)
    ) {
        return NextResponse.next();
    }

    // Dacă există identitate AD transmisă de proxy/IIS, lăsăm request-ul mai departe.
    const adUser =
        request.headers.get('x-ms-client-principal-name') ||
        request.headers.get('remote-user') ||
        request.headers.get('x-forwarded-user');
    if (adUser) {
        return NextResponse.next();
    }

    // În standalone verificăm doar existența cookie-ului; validarea cryptografică este în API.
    const cookie = request.cookies.get('dms_admin_auth');
    console.log(`[MIDDLEWARE] Checking path: ${pathname} | User: ${cookie ? 'present' : 'missing'}`);

    // Dacă nu există cookie-ul, redirecționăm forțat către /login
    if (!cookie?.value) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/login';
        loginUrl.search = '';
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
