import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getUsername } from '@/lib/auth';

/**
 * GET /api/me — Returns the currently authenticated user info
 */
export async function GET(req: NextRequest) {
    const fullUser = getAuthUser(req);

    if (!fullUser) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const username = getUsername(fullUser);
    const initials = username
        .split('.')
        .map((part: string) => part[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 2);

    return NextResponse.json({
        authenticated: true,
        fullName: fullUser,
        username: username,
        initials: initials || 'U',
        group: 'Domain Admins',
    });
}
