import { NextResponse } from 'next/server';
import { getHolidayServiceClient } from '@/lib/holiday/server';
import { HOLIDAY_TIME_SLOTS, MAX_PARENTS_PER_HOLIDAY_SLOT, HOLIDAY_EVENT_YEAR } from '@/lib/holiday/constants';
import { HolidayTimeSlotInfo } from '@/types/holiday';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = getHolidayServiceClient();

        const { data, error } = await supabase.rpc('get_holiday_slot_capacities', {
            p_event_year: HOLIDAY_EVENT_YEAR,
        });

        if (error) {
            console.error('[holiday-slots] Error querying slot capacities:', error);
            // Fallback to default slots with 0 bookings if query error
            const fallbackSlots: HolidayTimeSlotInfo[] = HOLIDAY_TIME_SLOTS.map((s) => ({
                slot: s.id,
                label: s.label,
                bookedCount: 0,
                maxCapacity: MAX_PARENTS_PER_HOLIDAY_SLOT,
                remaining: MAX_PARENTS_PER_HOLIDAY_SLOT,
                isFull: false,
            }));
            return NextResponse.json({ slots: fallbackSlots });
        }

        const countsBySlot: Record<string, number> = {};
        for (const row of (data as Array<{ time_slot: string; booked_count: number }>) || []) {
            if (row.time_slot) {
                countsBySlot[row.time_slot] = Number(row.booked_count) || 0;
            }
        }

        const slots: HolidayTimeSlotInfo[] = HOLIDAY_TIME_SLOTS.map((s) => {
            const bookedCount = countsBySlot[s.id] || 0;
            const remaining = Math.max(0, MAX_PARENTS_PER_HOLIDAY_SLOT - bookedCount);
            return {
                slot: s.id,
                label: s.label,
                bookedCount,
                maxCapacity: MAX_PARENTS_PER_HOLIDAY_SLOT,
                remaining,
                isFull: bookedCount >= MAX_PARENTS_PER_HOLIDAY_SLOT,
            };
        });

        return NextResponse.json({ slots });
    } catch (error) {
        console.error('[holiday-slots] Unexpected error:', error);
        return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 });
    }
}
