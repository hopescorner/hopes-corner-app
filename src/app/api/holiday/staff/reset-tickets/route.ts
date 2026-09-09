import { NextRequest, NextResponse } from 'next/server';
import { getHolidayServiceClient } from '@/lib/holiday/server';
import { requireHolidayStaff } from '@/lib/holiday/staffAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const authorization = await requireHolidayStaff();
        if (!authorization.authorized) return authorization.response;

        let body: any = {};
        try {
            body = await req.json();
        } catch {
            // Body is optional
        }

        const clearRegistrations = body.clearRegistrations !== undefined ? Boolean(body.clearRegistrations) : true;
        const targetNumber = Number.isInteger(body.targetNumber) && body.targetNumber > 0 ? body.targetNumber : 1;

        const supabase = getHolidayServiceClient();
        const { data, error } = await supabase.rpc('reset_holiday_ticket_counter', {
            p_clear_registrations: clearRegistrations,
            p_target_number: targetNumber,
        });

        if (error) {
            console.error('[holiday-reset-tickets] RPC error:', error);
            // Include the database message (staff-only route): a generic
            // message once hid a stale function body referencing a renamed
            // table, which was only diagnosable from server logs.
            const detail = error.message ? `: ${error.message}` : '';
            return NextResponse.json({ error: `Failed to reset ticket counter${detail}` }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        console.error('[holiday-reset-tickets] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
