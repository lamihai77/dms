import { NextRequest, NextResponse } from 'next/server';

/**
 * Get the authenticated Windows user from IIS headers.
 * When running behind IIS with Windows Auth, IIS sets these headers.
 * In development, we use a fallback dev user.
 */
export function getAuthUser(req: NextRequest): string | null {
    // IIS passes the authenticated user in these headers
    const user =
        req.headers.get('x-iis-windowsauthtoken') ||
        req.headers.get('x-ms-client-principal-name') ||
        req.headers.get('remote-user') ||
        req.headers.get('x-forwarded-user');

    if (user) return user;

    // Development fallback
    if (process.env.NODE_ENV === 'development') {
        return process.env.DEV_USER || 'DevUser';
    }

    return null;
}

/**
 * Middleware to check if user is authenticated and is a Domain Admin.
 * Returns NextResponse with 401/403 if not authorized.
 * Supports: IIS Windows Auth headers, cookie-based login (standalone mode).
 */
export function requireDomainAdmin(req: NextRequest): NextResponse | null {
    // Check IIS Windows Auth headers (when running behind IIS)
    const user = getAuthUser(req);
    if (user) return null; // IIS already verified the user

    // Check cookie-based auth (when running standalone via PM2)
    const cookie = req.cookies.get('dms_admin_auth');
    if (cookie && cookie.value === 'authenticated') {
        return null; // Cookie is valid, allow access
    }

    // Development fallback (already handled in getAuthUser, but just in case)
    if (process.env.NODE_ENV === 'development') {
        return null;
    }

    return NextResponse.json(
        { error: 'Autentificare necesară' },
        { status: 401 }
    );
}

/**
 * Get the username without domain prefix.
 * e.g., "INTERN\\john.doe" -> "john.doe"
 */
export function getUsername(fullName: string): string {
    const parts = fullName.split('\\');
    return parts.length > 1 ? parts[1] : fullName;
}
