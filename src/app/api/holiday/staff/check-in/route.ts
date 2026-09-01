import { NextRequest, NextResponse } from 'next/server';
import { getHolidayServiceClient } from '@/lib/holiday/server';
import { requireHolidayStaff } from '@/lib/holiday/staffAuth';
import { isValidHolidayCardCount, isValidHolidayNotes } from '@/lib/holiday/validation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const authorization = await requireHolidayStaff();
        if (!authorization.authorized) return authorization.response;
        const { session } = authorization;

        const body = await req.json();
        const { id, groceryCards, teenCards, notes } = body;

        if (!id) {
            return NextResponse.json({ error: 'Registration ID is required' }, { status: 400 });
        }
        if (groceryCards !== undefined && !isValidHolidayCardCount(groceryCards)) {
            return NextResponse.json({ error: 'Grocery card count must be a whole number from 0 to 100' }, { status: 400 });
        }
        if (teenCards !== undefined && !isValidHolidayCardCount(teenCards)) {
            return NextResponse.json({ error: 'Teen card count must be a whole number from 0 to 100' }, { status: 400 });
        }
        if (!isValidHolidayNotes(notes)) {
            return NextResponse.json({ error: 'Notes are too long' }, { status: 400 });
        }

        const supabase = getHolidayServiceClient();
        const staffIdentifier = session.user.name || session.user.email || 'Staff';

        const { data, error } = await supabase
            .from('holiday_registrations')
            .update({
                status: 'checked_in',
                grocery_cards: groceryCards ?? 1,
                teen_cards: teenCards ?? 0,
                notes: notes ?? null,
                checked_in_at: new Date().toISOString(),
                checked_in_by: staffIdentifier,
            })
            .eq('id', id)
            .select()
            .single();

        if (error || !data) {
            console.error('[holiday-staff-checkin] Error checking in:', error);
            return NextResponse.json({ error: 'Failed to complete check-in' }, { status: 500 });
        }

        return NextResponse.json({ success: true, registration: data });
    } catch (error) {
        console.error('[holiday-staff-checkin] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
