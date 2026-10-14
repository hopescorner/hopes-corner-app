import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapDailyHeadlineRow } from '@/lib/utils/mappers';
import { fetchAndSaveTodayBayAreaHeadlines, saveDailyHeadlines } from '@/lib/headlines/bayArea';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const date = searchParams.get('date');

    const supabase = await createClient();
    let query = supabase
        .from('daily_headlines')
        .select('*')
        .order('date', { ascending: true })
        .order('rank', { ascending: true });

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
        headlines: (data || []).map(mapDailyHeadlineRow),
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { date, headline, headlines, source, url, syncToday } = body as {
            date?: string;
            headline?: string;
            headlines?: Array<{ headline?: string; source?: string; url?: string }>;
            source?: string;
            url?: string;
            syncToday?: boolean;
        };

        const manualItems = Array.isArray(headlines)
            ? headlines
            : headline
              ? [{ headline, source, url }]
              : [];
        if (!syncToday && !(date && manualItems.length > 0)) {
            return NextResponse.json(
                { error: 'Provide syncToday or date with headline(s)' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        if (syncToday) {
            const saved = await fetchAndSaveTodayBayAreaHeadlines(supabase);
            return NextResponse.json({ success: true, headlines: saved });
        }

        const saved = await saveDailyHeadlines(date!, manualItems as any, supabase);
        if (!saved) {
            return NextResponse.json({ error: 'Failed to save headlines' }, { status: 500 });
        }
        return NextResponse.json({ success: true, headlines: saved });
    } catch (err: any) {
        return NextResponse.json(
            { error: err?.message || 'Failed to sync headlines' },
            { status: 500 }
        );
    }
}
