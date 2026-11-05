import { NextRequest, NextResponse } from 'next/server';
import { getHolidayServiceClient } from '@/lib/holiday/server';
import { HolidayLanguage } from '@/types/holiday';
import { HOLIDAY_EVENT_YEAR } from '@/lib/holiday/constants';
import { normalizeHolidayPhoneDigits } from '@/lib/holiday/phone';
import { HOLIDAY_TRANSLATIONS } from '@/lib/holiday/translations';
import { getHolidayClientIp, hashHolidayClientIp } from '@/lib/holiday/rateLimit';

export const dynamic = 'force-dynamic';

function resolveLanguage(value: unknown): HolidayLanguage {
    return value === 'es' || value === 'zh' || value === 'en' ? value : 'en';
}

/**
 * Privacy-conscious duplicate check. Returns only whether the phone number is
 * already registered for this event year; no names, tickets, or child data.
 */
export async function POST(req: NextRequest) {
    let language: HolidayLanguage = 'en';

    try {
        const body = await req.json();
        language = resolveLanguage(body.language);
        const t = HOLIDAY_TRANSLATIONS[language];

        const phoneDigits = normalizeHolidayPhoneDigits(typeof body.phone === 'string' ? body.phone : '');
        if (phoneDigits.length !== 10) {
            return NextResponse.json({ error: t.errors.phoneRequired }, { status: 400 });
        }

        const supabase = getHolidayServiceClient();
        const { data: allowed, error: rateLimitError } = await supabase.rpc(
            'consume_holiday_registration_attempt',
            { p_client_hash: hashHolidayClientIp(getHolidayClientIp(req.headers), 'duplicate-check') }
        );

        if (rateLimitError) {
            console.error('[holiday-duplicate-check] Rate limiter error:', rateLimitError);
            return NextResponse.json({ error: t.errors.temporarilyUnavailable }, { status: 503 });
        }
        if (allowed !== true) {
            return NextResponse.json({ error: t.errors.rateLimited }, { status: 429 });
        }

        const { data: registrations, error } = await supabase
            .from('holiday_registrations')
            .select('phone')
            .eq('event_year', HOLIDAY_EVENT_YEAR);

        if (error) {
            console.error('[holiday-duplicate-check] Error fetching registrations:', error);
            return NextResponse.json({ error: t.errors.temporarilyUnavailable }, { status: 500 });
        }

        const exists = (registrations || []).some(
            (row: any) => normalizeHolidayPhoneDigits(row.phone) === phoneDigits
        );

        return NextResponse.json({ exists });
    } catch (error) {
        console.error('[holiday-duplicate-check] Unexpected error:', error);
        return NextResponse.json(
            { error: HOLIDAY_TRANSLATIONS[language].errors.submissionFailed },
            { status: 500 }
        );
    }
}
