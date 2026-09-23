import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { mapDailyWeatherRow } from '@/lib/utils/mappers';
import { backfillMountainViewWeather, fetchAndSaveTodayMountainViewWeather } from '@/lib/weather/mountainView';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const date = searchParams.get('date');

    const supabase = createClient();
    let query = supabase.from('daily_weather').select('*').order('date', { ascending: true });

    if (date) {
        query = query.eq('date', date);
    } else {
        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);
    }

    const { data, error } = await query;
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        weather: (data || []).map(mapDailyWeatherRow),
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { startDate, endDate, syncToday } = body as {
            startDate?: string;
            endDate?: string;
            syncToday?: boolean;
        };

        if (!syncToday && !(startDate && endDate)) {
            return NextResponse.json(
                { error: 'Provide syncToday or both startDate and endDate' },
                { status: 400 }
            );
        }

        // Server Supabase client (cookie-aware); the browser client has no
        // session in a route handler.
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = await createClient();

        if (syncToday) {
            const saved = await fetchAndSaveTodayMountainViewWeather(supabase);
            return NextResponse.json({ success: true, weather: saved });
        }

        const records = await backfillMountainViewWeather(startDate!, endDate!, supabase);
        return NextResponse.json({ success: true, count: records.length, records });
    } catch (err: any) {
        return NextResponse.json(
            { error: err?.message || 'Failed to sync weather' },
            { status: 500 }
        );
    }
}
