import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import { getHolidayServiceClient } from '@/lib/holiday/server';
import { HolidayLanguage, HolidayRegistrationInput } from '@/types/holiday';
import { HOLIDAY_EVENT_YEAR, MAX_PUBLIC_HOLIDAY_CHILDREN } from '@/lib/holiday/constants';
import {
    holidayRegistrationValidationErrorCode,
    holidayValidationMessage,
} from '@/lib/holiday/validation';
import { HOLIDAY_TRANSLATIONS } from '@/lib/holiday/translations';
import { generateHolidayTicketToken, generateTicketQRCodeDataUrl } from '@/lib/holiday/ticketToken';

export const dynamic = 'force-dynamic';

function hashClientIp(ip: string): string {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error('AUTH_SECRET or NEXTAUTH_SECRET is not configured');
    return createHmac('sha256', secret).update(ip).digest('hex');
}

function resolveLanguage(value: unknown): HolidayLanguage {
    return value === 'es' || value === 'zh' || value === 'en' ? value : 'en';
}

export async function POST(req: NextRequest) {
    let language: HolidayLanguage = 'en';

    try {
        const body: HolidayRegistrationInput & { website?: string; hp_field?: string } = await req.json();
        language = resolveLanguage(body.language);
        const t = HOLIDAY_TRANSLATIONS[language];

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
            return NextResponse.json({ error: t.errors.temporarilyUnavailable }, { status: 503 });
        }
        if (allowed !== true) {
            return NextResponse.json({ error: t.errors.rateLimited }, { status: 429 });
        }

        // Bot honeypot check
        if (body.website || body.hp_field) {
            return NextResponse.json({ error: t.errors.invalidSubmission }, { status: 400 });
        }

        // Families with more than three children register in person at the table.
        if (Array.isArray(body.children) && body.children.length > MAX_PUBLIC_HOLIDAY_CHILDREN) {
            return NextResponse.json({ error: t.errors.childLimitReached }, { status: 400 });
        }

        const validationCode = holidayRegistrationValidationErrorCode(body, {
            requireBirthdate: true,
            requireSchool: true,
            maxChildren: MAX_PUBLIC_HOLIDAY_CHILDREN,
        });
        if (validationCode) {
            return NextResponse.json(
                { error: holidayValidationMessage(validationCode, language) },
                { status: 400 }
            );
        }

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
                return NextResponse.json({ error: t.errors.allSlotsFull }, { status: 409 });
            }
            if (msg.includes('SLOT_FULL')) {
                return NextResponse.json({ error: t.errors.slotFull }, { status: 409 });
            }
            if (msg.includes('INVALID_TIME_SLOT')) {
                return NextResponse.json({ error: t.errors.slotRequired }, { status: 400 });
            }
            return NextResponse.json({ error: t.errors.submissionFailed }, { status: 500 });
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

        return NextResponse.json({
            registration: {
                ...data,
                ticketToken,
                qrCodeDataUrl,
            },
        });
    } catch (error) {
        console.error('[holiday-register] Unexpected error:', error);
        return NextResponse.json(
            { error: HOLIDAY_TRANSLATIONS[language].errors.submissionFailed },
            { status: 500 }
        );
    }
}
