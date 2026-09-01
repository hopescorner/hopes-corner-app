import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';

const HOLIDAY_STAFF_ROLES = new Set(['admin', 'staff']);

export async function requireHolidayStaff() {
    const session = await auth();

    if (!session?.user) {
        return {
            authorized: false as const,
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }

    if (!HOLIDAY_STAFF_ROLES.has(session.user.role)) {
        return {
            authorized: false as const,
            response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
        };
    }

    return { authorized: true as const, session };
}
