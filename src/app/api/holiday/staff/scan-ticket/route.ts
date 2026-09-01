import { NextRequest, NextResponse } from 'next/server';
import { requireHolidayStaff } from '@/lib/holiday/staffAuth';
import { verifyHolidayTicketToken } from '@/lib/holiday/ticketToken';
import { getHolidayServiceClient } from '@/lib/holiday/server';
import { HolidayRegistration, HolidayChild } from '@/types/holiday';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const authorization = await requireHolidayStaff();
        if (!authorization.authorized) return authorization.response;

        const body = await req.json();
        const { token } = body;

        if (!token || typeof token !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid ticket QR token' }, { status: 400 });
        }

        const verification = verifyHolidayTicketToken(token);
        if (!verification.valid) {
            return NextResponse.json({
                error: verification.error || 'Tampered or invalid ticket QR code',
                tampered: true,
            }, { status: 400 });
        }

        const { payload } = verification;
        const supabase = getHolidayServiceClient();

        const { data: regData, error: regError } = await supabase
            .from('holiday_registrations')
            .select('*')
            .eq('id', payload.id)
            .single();

        if (regError || !regData) {
            return NextResponse.json({
                error: `Ticket #${payload.ticketNumber} is validly signed but record was not found in database.`,
                payload,
            }, { status: 404 });
        }

        const { data: childrenData } = await supabase
            .from('holiday_children')
            .select('*')
            .eq('registration_id', regData.id)
            .order('created_at', { ascending: true });

        const mappedChildren: HolidayChild[] = (childrenData || []).map((c: any) => ({
            id: c.id,
            registrationId: c.registration_id,
            name: c.name,
            birthdate: c.birthdate,
            age: c.age,
            school: c.school,
            gender: c.gender,
            ageGroup: c.age_group,
            createdAt: c.created_at,
        }));

        const registration: HolidayRegistration = {
            id: regData.id,
            ticketNumber: regData.ticket_number,
            eventYear: regData.event_year,
            parentName: regData.parent_name,
            phone: regData.phone,
            city: regData.city,
            housingStatus: regData.housing_status,
            incomeRange: regData.income_range,
            timeSlot: regData.time_slot,
            language: regData.language,
            status: regData.status,
            groceryCards: regData.grocery_cards,
            teenCards: regData.teen_cards,
            notes: regData.notes,
            checkedInAt: regData.checked_in_at,
            checkedInBy: regData.checked_in_by,
            children: mappedChildren,
            createdAt: regData.created_at,
            updatedAt: regData.updated_at,
        };

        return NextResponse.json({
            success: true,
            verified: true,
            payload,
            registration,
        });
    } catch (error) {
        console.error('[holiday-scan-ticket] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
