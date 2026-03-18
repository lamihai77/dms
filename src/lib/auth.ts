import { createHmac, timingSafeEqual } from 'crypto';
import { spawn } from 'child_process';
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

    const cookie = req.cookies.get('dms_admin_auth')?.value;
    if (cookie) {
        const parsed = verifyAuthToken(cookie);
        if (parsed) return parsed.user;
    }

    // Development fallback
    if (process.env.NODE_ENV === 'development') {
        return process.env.DEV_USER || 'DevUser';
    }

    return null;
}

function getAllowedAdmins(): string[] {
    return (process.env.DOMAIN_ADMINS || '')
        .split(',')
        .map((u) => u.trim().toLowerCase())
        .filter(Boolean);
}

export async function validateAdCredentials(username: string, password: string): Promise<boolean> {
    const adDomain = (process.env.AD_DOMAIN || '').trim();
    const shortUser = getUsername(username).trim();
    if (!adDomain || !shortUser || !password) return false;

    const psScript = `
$ErrorActionPreference = 'Stop'
try {
  Add-Type -AssemblyName System.DirectoryServices.AccountManagement
  $ctx = New-Object System.DirectoryServices.AccountManagement.PrincipalContext(
    [System.DirectoryServices.AccountManagement.ContextType]::Domain,
    $env:AD_DOMAIN
  )
  $ok = $ctx.ValidateCredentials($env:AD_USER, $env:AD_PASS, [System.DirectoryServices.AccountManagement.ContextOptions]::Negotiate)
  if ($ok) { Write-Output 'OK'; exit 0 } else { Write-Output 'INVALID'; exit 1 }
} catch {
  Write-Output 'ERROR'
  exit 2
}
`.trim();

    return await new Promise<boolean>((resolve) => {
        const child = spawn(
            'powershell.exe',
            ['-NoProfile', '-NonInteractive', '-Command', psScript],
            {
                windowsHide: true,
                env: {
                    ...process.env,
                    AD_DOMAIN: adDomain,
                    AD_USER: shortUser,
                    AD_PASS: password,
                },
            }
        );

        let settled = false;
        const timeout = setTimeout(() => {
            if (!settled) {
                settled = true;
                child.kill();
                resolve(false);
            }
        }, 10000);

        child.on('error', () => {
            if (!settled) {
                settled = true;
                clearTimeout(timeout);
                resolve(false);
            }
        });

        child.on('close', (code) => {
            if (!settled) {
                settled = true;
                clearTimeout(timeout);
                resolve(code === 0);
            }
        });
    });
}

export function isAllowedAdmin(fullOrShortUser: string): boolean {
    const allowed = getAllowedAdmins();
    const username = getUsername(fullOrShortUser).toLowerCase();
    if (allowed.length === 0) return false;
    return allowed.includes(username);
}

function getCookieSecret(): string {
    const secret = (process.env.COOKIE_SECRET || '').trim();
    if (secret) return secret;
    if (process.env.NODE_ENV === 'production') {
        throw new Error('[AUTH] COOKIE_SECRET lipsa in productie');
    }
    console.warn('[AUTH] COOKIE_SECRET lipsa - folosesc un secret de fallback (doar non-prod)');
    return 'dev-cookie-secret-change-in-prod';
}

function base64UrlEncode(value: string): string {
    return Buffer.from(value, 'utf8')
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function base64UrlDecode(value: string): string {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/')
        + '='.repeat((4 - (value.length % 4)) % 4);
    return Buffer.from(padded, 'base64').toString('utf8');
}

function signPayload(encodedPayload: string): string {
    return createHmac('sha256', getCookieSecret())
        .update(encodedPayload)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

export function createAuthToken(user: string, ttlSeconds = 60 * 60 * 8): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({
        u: getUsername(user),
        iat: now,
        exp: now + ttlSeconds,
    });
    const encodedPayload = base64UrlEncode(payload);
    const signature = signPayload(encodedPayload);
    return `v1.${encodedPayload}.${signature}`;
}

export function verifyAuthToken(token: string): { user: string } | null {
    try {
        const [version, encodedPayload, signature] = token.split('.');
        if (version !== 'v1' || !encodedPayload || !signature) return null;

        const expectedSignature = signPayload(encodedPayload);
        const given = Buffer.from(signature);
        const expected = Buffer.from(expectedSignature);
        if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
            return null;
        }

        const payload = JSON.parse(base64UrlDecode(encodedPayload)) as {
            u?: string;
            exp?: number;
        };

        if (!payload.u || !payload.exp) return null;
        if (payload.exp < Math.floor(Date.now() / 1000)) return null;

        return { user: payload.u };
    } catch {
        return null;
    }
}

/**
 * Middleware to check if user is authenticated and is a Domain Admin.
 * Returns NextResponse with 401/403 if not authorized.
 * Supports: IIS Windows Auth headers, cookie-based login (standalone mode).
 */
export function requireDomainAdmin(req: NextRequest): NextResponse | null {
    const user = getAuthUser(req);
    if (!user) {
        return NextResponse.json(
            { error: 'Autentificare necesară' },
            { status: 401 }
        );
    }

    if (!isAllowedAdmin(user)) {
        return NextResponse.json(
            { error: 'Nu ai drepturi de administrator' },
            { status: 403 }
        );
    }

    return null;
}

/**
 * Get the username without domain prefix.
 * e.g., "INTERN\\john.doe" -> "john.doe"
 */
export function getUsername(fullName: string): string {
    const parts = fullName.split('\\');
    return parts.length > 1 ? parts[1] : fullName;
}
