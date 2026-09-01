import { NextResponse } from 'next/server';
import { getHolidayServiceClient } from '@/lib/holiday/server';
import { requireHolidayStaff } from '@/lib/holiday/staffAuth';
import { HOLIDAY_EVENT_YEAR } from '@/lib/holiday/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const authorization = await requireHolidayStaff();
        if (!authorization.authorized) return authorization.response;

        const supabase = getHolidayServiceClient();

        const { data: regRows, error: regError } = await supabase
            .from('holiday_registrations')
            .select('*')
            .eq('event_year', HOLIDAY_EVENT_YEAR)
            .order('ticket_number', { ascending: true });

        if (regError) {
            console.error('[holiday-staff-registrations] Error fetching registrations:', regError);
            return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
        }

        const regIds = (regRows || []).map((r) => r.id);
        let childrenRows: any[] = [];

        if (regIds.length > 0) {
            const { data: cData, error: cError } = await supabase
                .from('holiday_children')
                .select('*')
                .in('registration_id', regIds);

            if (cError) {
                console.error('[holiday-staff-registrations] Error fetching children:', cError);
            } else {
                childrenRows = cData || [];
            }
        }

        const childrenByReg: Record<string, any[]> = {};
        for (const child of childrenRows) {
            if (!childrenByReg[child.registration_id]) {
                childrenByReg[child.registration_id] = [];
            }
            childrenByReg[child.registration_id].push({
                id: child.id,
                registrationId: child.registration_id,
                name: child.name,
                birthdate: child.birthdate,
                age: child.age,
                school: child.school,
                gender: child.gender,
                ageGroup: child.age_group,
                createdAt: child.created_at,
            });
        }

        const registrations = (regRows || []).map((row) => ({
            id: row.id,
            ticketNumber: row.ticket_number,
            eventYear: row.event_year,
            parentName: row.parent_name,
            phone: row.phone,
            city: row.city,
            housingStatus: row.housing_status,
            incomeRange: row.income_range,
            timeSlot: row.time_slot,
            language: row.language,
            status: row.status,
            groceryCards: row.grocery_cards,
            teenCards: row.teen_cards,
            notes: row.notes,
            checkedInAt: row.checked_in_at,
            checkedInBy: row.checked_in_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            children: childrenByReg[row.id] || [],
        }));

        return NextResponse.json({ registrations });
    } catch (error) {
        console.error('[holiday-staff-registrations] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
