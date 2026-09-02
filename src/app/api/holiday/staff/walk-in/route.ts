import { NextRequest, NextResponse } from 'next/server';
import { getHolidayServiceClient } from '@/lib/holiday/server';
import { HolidayRegistrationInput } from '@/types/holiday';
import { HOLIDAY_EVENT_YEAR } from '@/lib/holiday/constants';
import { requireHolidayStaff } from '@/lib/holiday/staffAuth';
import { holidayRegistrationValidationError } from '@/lib/holiday/validation';
import { generateHolidayTicketToken, generateTicketQRCodeDataUrl } from '@/lib/holiday/ticketToken';
import { generateHolidayShopperToken } from '@/lib/holiday/shopperToken';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const authorization = await requireHolidayStaff();
        if (!authorization.authorized) return authorization.response;

        const body: HolidayRegistrationInput = await req.json();
        const validationError = holidayRegistrationValidationError(body);
        if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

        const supabase = getHolidayServiceClient();

        const { data, error } = await supabase.rpc('register_holiday_family', {
            p_parent_name: body.parentName.trim(),
            p_phone: body.phone.trim(),
            p_city: body.city.trim(),
            p_housing_status: body.housingStatus || 'house_apartment',
            p_income_range: body.incomeRange || '0_40k',
            p_time_slot: body.timeSlot ? body.timeSlot.trim() : null,
            p_language: body.language || 'en',
            p_children: body.children.map((c) => ({
                name: c.name.trim(),
                birthdate: c.birthdate || null,
                age: c.age,
                school: c.school?.trim() || null,
                gender: c.gender?.trim() || null,
            })),
        });

        if (error) {
            console.error('[holiday-staff-walkin] Error in register_holiday_family RPC:', error);
            const msg = error.message || '';
            if (msg.includes('ALL_SLOTS_FULL')) {
                return NextResponse.json(
                    { error: 'Registration is currently at full capacity for all arrival time slots.' },
                    { status: 409 }
                );
            }
            if (msg.includes('SLOT_FULL')) {
                return NextResponse.json(
                    { error: 'The specified time slot is full. Please pick another slot.' },
                    { status: 409 }
                );
            }
            return NextResponse.json({ error: error.message || 'Failed to create walk-in record' }, { status: 500 });
        }

        const ticketToken = generateHolidayTicketToken({
            id: data.id,
            ticketNumber: data.ticketNumber,
            eventYear: data.eventYear || HOLIDAY_EVENT_YEAR,
            parentName: data.parentName,
            timeSlot: data.timeSlot,
            childrenCount: Array.isArray(data.children) ? data.children.length : body.children.length,
        });

        const qrCodeDataUrl = await generateTicketQRCodeDataUrl(ticketToken);

        const shopperToken = generateHolidayShopperToken({
            ticketNumber: data.ticketNumber,
            timeSlot: data.timeSlot,
            children: (data.children || []).map((c: any) => ({
                id: c.id,
                age: c.age,
                ageGroup: c.ageGroup,
                gender: c.gender,
            })),
        });

        return NextResponse.json({
            registration: {
                ...data,
                ticketToken,
                shopperToken,
                qrCodeDataUrl,
            },
        });
    } catch (error) {
        console.error('[holiday-staff-walkin] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
