import { NextRequest, NextResponse } from 'next/server';
import { getHolidayServiceClient } from '@/lib/holiday/server';
import { requireHolidayStaff } from '@/lib/holiday/staffAuth';

export const dynamic = 'force-dynamic';

export async function DELETE(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const authorization = await requireHolidayStaff();
        if (!authorization.authorized) return authorization.response;

        const { id } = await context.params;
        if (!id) {
            return NextResponse.json({ error: 'Registration ID is required' }, { status: 400 });
        }

        const supabase = getHolidayServiceClient();

        const { error } = await supabase
            .from('holiday_registrations')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[holiday-staff-delete] Error deleting registration:', error);
            return NextResponse.json({ error: 'Failed to delete registration' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[holiday-staff-delete] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
