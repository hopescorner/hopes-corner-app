import { NextResponse } from 'next/server';
import { fetchMountainViewWeather, WEATHER_REVALIDATE_SECONDS } from '@/lib/weather/mountainView';

export const dynamic = 'force-dynamic';

export async function GET() {
    const weather = await fetchMountainViewWeather();

    if (!weather) {
        return NextResponse.json({ error: 'Weather unavailable' }, { status: 502 });
    }

    return NextResponse.json(weather, {
        headers: {
            'Cache-Control': `public, s-maxage=${WEATHER_REVALIDATE_SECONDS}, stale-while-revalidate=300`,
        },
    });
}
