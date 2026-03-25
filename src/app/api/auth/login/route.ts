import { NextResponse } from 'next/server';
import { createAuthToken, getUsername, isAllowedAdmin, validateAdCredentials } from '@/lib/auth';

type LoginAttemptState = {
    count: number;
    resetAt: number;
};

const loginAttempts = new Map<string, LoginAttemptState>();

function getRateLimitConfig() {
    const maxAttempts = Number.parseInt(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || '5', 10);
    const windowMs = Number.parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '60000', 10);
    return {
        maxAttempts: Number.isFinite(maxAttempts) && maxAttempts > 0 ? maxAttempts : 5,
        windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60000,
    };
}

function getClientIp(request: Request): string {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
    const xri = request.headers.get('x-real-ip');
    if (xri) return xri.trim();
    return 'unknown';
}

function purgeExpiredAttempts(now: number) {
    for (const [key, state] of loginAttempts.entries()) {
        if (state.resetAt <= now) loginAttempts.delete(key);
    }
}

function checkAndBumpLoginAttempts(key: string): { blocked: boolean; retryAfterSec: number } {
    const now = Date.now();
    purgeExpiredAttempts(now);
    const { maxAttempts, windowMs } = getRateLimitConfig();
    const current = loginAttempts.get(key);
    if (!current || current.resetAt <= now) {
        loginAttempts.set(key, { count: 1, resetAt: now + windowMs });
        return { blocked: false, retryAfterSec: Math.ceil(windowMs / 1000) };
    }
    if (current.count >= maxAttempts) {
        return { blocked: true, retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
    }
    current.count += 1;
    loginAttempts.set(key, current);
    return { blocked: false, retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
}

function resetLoginAttempts(key: string) {
    loginAttempts.delete(key);
}

export async function POST(request: Request) {
    console.log('[LOGIN API] Received request');
    try {
        const formData = await request.formData();
        const username = (formData.get('username') as string || '').trim();
        const password = (formData.get('password') as string || '');
        const shortUser = getUsername(username);
        const clientIp = getClientIp(request);
        const attemptKey = `${shortUser.toLowerCase()}|${clientIp}`;

        const rate = checkAndBumpLoginAttempts(attemptKey);
        if (rate.blocked) {
            return NextResponse.json(
                { ok: false, error: 'TooManyAttempts' },
                {
                    status: 429,
                    headers: { 'Retry-After': String(rate.retryAfterSec) },
                }
            );
        }

        if (!shortUser || !isAllowedAdmin(shortUser)) {
            console.error(`[LOGIN API] User '${shortUser}' is not allowed by DOMAIN_ADMINS.`);
            return NextResponse.json({ ok: false, error: 'NoAccess' }, { status: 403 });
        }

        if (!password) {
            return NextResponse.json({ ok: false, error: 'Invalid' }, { status: 401 });
        }

        const adOk = await validateAdCredentials(shortUser, password);
        if (!adOk) {
            console.log(`[LOGIN API] AD validation failed for user '${shortUser}'.`);
            return NextResponse.json({ ok: false, error: 'Invalid' }, { status: 401 });
        }
        resetLoginAttempts(attemptKey);

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
