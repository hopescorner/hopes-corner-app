import { NextRequest, NextResponse } from 'next/server';
import { getHolidayServiceClient } from '@/lib/holiday/server';
import { HolidayLanguage } from '@/types/holiday';
import { HOLIDAY_EVENT_YEAR } from '@/lib/holiday/constants';
import { normalizeHolidayPhoneDigits } from '@/lib/holiday/phone';
import { HOLIDAY_TRANSLATIONS } from '@/lib/holiday/translations';
import { getHolidayClientIp, hashHolidayClientIp } from '@/lib/holiday/rateLimit';
import { generateHolidayTicketToken, generateTicketQRCodeDataUrl } from '@/lib/holiday/ticketToken';

export const dynamic = 'force-dynamic';

function resolveLanguage(value: unknown): HolidayLanguage {
    return value === 'es' || value === 'zh' || value === 'en' ? value : 'en';
}

/**
 * Public ticket lookup. Requires the phone number and parent name used at
 * registration and returns ticket metadata only — never child records.
 */
export async function POST(req: NextRequest) {
    let language: HolidayLanguage = 'en';

    try {
        const body = await req.json();
        language = resolveLanguage(body.language);
        const t = HOLIDAY_TRANSLATIONS[language];

        const phoneDigits = normalizeHolidayPhoneDigits(typeof body.phone === 'string' ? body.phone : '');
        const parentName = typeof body.parentName === 'string' ? body.parentName.trim() : '';

        if (phoneDigits.length !== 10 || !parentName) {
            return NextResponse.json({ error: t.findTicketMissingFields }, { status: 400 });
        }

        const supabase = getHolidayServiceClient();
        const { data: allowed, error: rateLimitError } = await supabase.rpc(
            'consume_holiday_registration_attempt',
            { p_client_hash: hashHolidayClientIp(getHolidayClientIp(req.headers), 'ticket-lookup') }
        );

        if (rateLimitError) {
            console.error('[holiday-lookup] Rate limiter error:', rateLimitError);
            return NextResponse.json({ error: t.errors.temporarilyUnavailable }, { status: 503 });
        }
        if (allowed !== true) {
            return NextResponse.json({ error: t.errors.rateLimited }, { status: 429 });
        }

        const { data: registrations, error } = await supabase
            .from('holiday_registrations')
            .select('*')
            .eq('event_year', HOLIDAY_EVENT_YEAR)
            .order('ticket_number', { ascending: false });

        if (error) {
            console.error('[holiday-lookup] Error fetching registrations:', error);
            return NextResponse.json({ error: t.findTicketError }, { status: 500 });
        }

        const match = (registrations || []).find(
            (row: any) =>
                normalizeHolidayPhoneDigits(row.phone) === phoneDigits &&
                String(row.parent_name || '').trim().toLowerCase() === parentName.toLowerCase()
        );

        if (!match) {
            return NextResponse.json({ error: t.findTicketNotFound }, { status: 404 });
        }

        const { data: children } = await supabase
            .from('holiday_children')
            .select('id')
            .eq('registration_id', match.id);

        const childrenCount = Array.isArray(children) ? children.length : 0;
        const ticketToken = generateHolidayTicketToken({
            id: match.id,
            ticketNumber: match.ticket_number,
            eventYear: match.event_year || HOLIDAY_EVENT_YEAR,
            parentName: match.parent_name,
            timeSlot: match.time_slot,
            childrenCount,
        });
        const qrCodeDataUrl = await generateTicketQRCodeDataUrl(ticketToken);

        return NextResponse.json({
            registration: {
                ticketNumber: match.ticket_number,
                timeSlot: match.time_slot,
                parentName: match.parent_name,
                phone: match.phone,
                city: match.city,
                childrenCount,
                language: resolveLanguage(match.language),
                qrCodeDataUrl,
            },
        });
    } catch (error) {
        console.error('[holiday-lookup] Unexpected error:', error);
        return NextResponse.json(
            { error: HOLIDAY_TRANSLATIONS[language].errors.submissionFailed },
            { status: 500 }
        );
    }
}
