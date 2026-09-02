import { NextRequest, NextResponse } from 'next/server';
import { getHolidayServiceClient } from '@/lib/holiday/server';
import { requireHolidayStaff } from '@/lib/holiday/staffAuth';
import { HolidayRegistrationInput } from '@/types/holiday';
import { holidayRegistrationValidationError } from '@/lib/holiday/validation';
import { generateHolidayShopperToken } from '@/lib/holiday/shopperToken';

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

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const authorization = await requireHolidayStaff();
        if (!authorization.authorized) return authorization.response;

        const { id } = await context.params;
        if (!id) {
            return NextResponse.json({ error: 'Registration ID is required' }, { status: 400 });
        }

        const body: HolidayRegistrationInput = await req.json();
        const validationError = holidayRegistrationValidationError(body);
        if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

        const supabase = getHolidayServiceClient();

        const { data, error } = await supabase.rpc('update_holiday_family', {
            p_registration_id: id,
            p_parent_name: body.parentName.trim(),
            p_phone: body.phone.trim(),
            p_city: body.city.trim(),
            p_housing_status: body.housingStatus || 'house_apartment',
            p_income_range: body.incomeRange || '0_40k',
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
            console.error('[holiday-staff-update] Error in update_holiday_family RPC:', error);
            const msg = error.message || '';
            if (msg.includes('REGISTRATION_NOT_FOUND')) {
                return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
            }
            if (msg.includes('ALREADY_CHECKED_IN')) {
                return NextResponse.json(
                    { error: 'This family already checked in and can no longer be edited.' },
                    { status: 409 }
                );
            }
            return NextResponse.json({ error: error.message || 'Failed to update registration' }, { status: 500 });
        }

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
                shopperToken,
            },
        });
    } catch (error) {
        console.error('[holiday-staff-update] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
