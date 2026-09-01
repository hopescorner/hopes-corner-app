import { NextRequest, NextResponse } from 'next/server';
import { getHolidayServiceClient } from '@/lib/holiday/server';
import { requireHolidayStaff } from '@/lib/holiday/staffAuth';
import { isValidHolidayNotes } from '@/lib/holiday/validation';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
    try {
        const authorization = await requireHolidayStaff();
        if (!authorization.authorized) return authorization.response;

        const body = await req.json();
        const { id, notes } = body;

        if (!id) {
            return NextResponse.json({ error: 'Registration ID is required' }, { status: 400 });
        }
        if (!isValidHolidayNotes(notes)) {
            return NextResponse.json({ error: 'Notes are too long' }, { status: 400 });
        }

        const supabase = getHolidayServiceClient();

        const { error } = await supabase
            .from('holiday_registrations')
            .update({
                notes: notes ?? null,
            })
            .eq('id', id);

        if (error) {
            console.error('[holiday-staff-notes] Error updating notes:', error);
            return NextResponse.json({ error: 'Failed to update notes' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[holiday-staff-notes] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
