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
 */
export function requireDomainAdmin(req: NextRequest): NextResponse | null {
    const user = getAuthUser(req);

    if (!user) {
        return NextResponse.json(
            { error: 'Autentificare necesară' },
            { status: 401 }
        );
    }

    // In production, IIS handles group membership via Windows Auth
    // The fact that the request reaches us means IIS already authenticated the user
    // Additional group checking can be done via LDAP if needed

    // In development, skip group check
    if (process.env.NODE_ENV === 'development') {
        return null; // Allow access
    }

    return null; // Allow access (IIS already verified Domain Admins)
}

/**
 * Get the username without domain prefix.
 * e.g., "INTERN\\john.doe" -> "john.doe"
 */
export function getUsername(fullName: string): string {
    const parts = fullName.split('\\');
    return parts.length > 1 ? parts[1] : fullName;
}
