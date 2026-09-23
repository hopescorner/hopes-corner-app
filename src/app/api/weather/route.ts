import { NextResponse } from 'next/server';
import { fetchMountainViewWeather, saveDailyWeather, WEATHER_REVALIDATE_SECONDS } from '@/lib/weather/mountainView';
import { todayPacificDateString } from '@/lib/utils/date';

export const dynamic = 'force-dynamic';

export async function GET() {
    const weather = await fetchMountainViewWeather();

    if (!weather) {
        return NextResponse.json({ error: 'Weather unavailable' }, { status: 502 });
    }

    if (weather.tempHigh !== null && weather.tempHigh !== undefined && weather.tempLow !== null && weather.tempLow !== undefined) {
        try {
            await saveDailyWeather({
                date: weather.date || todayPacificDateString(),
                location: weather.location,
                tempHigh: weather.tempHigh,
                tempLow: weather.tempLow,
                weatherCode: weather.weatherCode,
                condition: weather.condition || 'Clear',
                conditionCategory: weather.conditionCategory || 'sunny',
                precipitationSum: weather.precipitationSum ?? 0,
                hasRain: weather.hasRain ?? false,
            });
        } catch {
            // Non-blocking
        }
    }

    return NextResponse.json(weather, {
        headers: {
            'Cache-Control': `public, s-maxage=${WEATHER_REVALIDATE_SECONDS}, stale-while-revalidate=300`,
        },
    });
}
