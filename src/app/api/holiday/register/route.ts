import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import { getHolidayServiceClient } from '@/lib/holiday/server';
import { HolidayRegistrationInput } from '@/types/holiday';
import { holidayRegistrationValidationError } from '@/lib/holiday/validation';
import { generateHolidayTicketToken, generateTicketQRCodeDataUrl } from '@/lib/holiday/ticketToken';

export const dynamic = 'force-dynamic';

function hashClientIp(ip: string): string {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error('AUTH_SECRET or NEXTAUTH_SECRET is not configured');
    return createHmac('sha256', secret).update(ip).digest('hex');
}

export async function POST(req: NextRequest) {
    try {
        const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            req.headers.get('x-real-ip') ||
            'unknown-client';
        const supabase = getHolidayServiceClient();

        const { data: allowed, error: rateLimitError } = await supabase.rpc(
            'consume_holiday_registration_attempt',
            { p_client_hash: hashClientIp(clientIp) }
        );
        if (rateLimitError) {
            console.error('[holiday-register] Rate limiter error:', rateLimitError);
            return NextResponse.json(
                { error: 'Registration is temporarily unavailable. Please try again shortly.' },
                { status: 503 }
            );
        }
        if (allowed !== true) {
            return NextResponse.json(
                { error: 'Too many registration requests. Please wait a few minutes and try again.' },
                { status: 429 }
            );
        }

        const body: HolidayRegistrationInput & { website?: string; hp_field?: string } = await req.json();

        // Bot honeypot check
        if (body.website || body.hp_field) {
            return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
        }

        const validationError = holidayRegistrationValidationError(body);
        if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

        // Call transactional atomic RPC on server
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
            console.error('[holiday-register] Error in register_holiday_family RPC:', error);
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
            if (msg.includes('INVALID_TIME_SLOT')) {
                return NextResponse.json(
                    { error: 'Invalid time slot specified.' },
                    { status: 400 }
                );
            }
            return NextResponse.json({ error: error.message || 'Failed to create registration record' }, { status: 500 });
        }

        const ticketToken = generateHolidayTicketToken({
            id: data.id,
            ticketNumber: data.ticketNumber,
            eventYear: data.eventYear || 2026,
            parentName: data.parentName,
            timeSlot: data.timeSlot,
            childrenCount: Array.isArray(data.children) ? data.children.length : body.children.length,
        });

        const qrCodeDataUrl = await generateTicketQRCodeDataUrl(ticketToken);

        return NextResponse.json({
            registration: {
                ...data,
                ticketToken,
                qrCodeDataUrl,
            },
        });
    } catch (error) {
        console.error('[holiday-register] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
