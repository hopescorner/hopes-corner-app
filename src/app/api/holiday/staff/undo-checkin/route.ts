import { NextRequest, NextResponse } from 'next/server';
import { getHolidayServiceClient } from '@/lib/holiday/server';
import { requireHolidayStaff } from '@/lib/holiday/staffAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const authorization = await requireHolidayStaff();
        if (!authorization.authorized) return authorization.response;

        const body = await req.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'Registration ID is required' }, { status: 400 });
        }

        const supabase = getHolidayServiceClient();

        const { error } = await supabase
            .from('holiday_registrations')
            .update({
                status: 'registered',
                checked_in_at: null,
                checked_in_by: null,
            })
            .eq('id', id);

        if (error) {
            console.error('[holiday-staff-undo] Error undoing check-in:', error);
            return NextResponse.json({ error: 'Failed to undo check-in' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[holiday-staff-undo] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
