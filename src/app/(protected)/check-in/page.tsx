import CheckInClient from '@/components/checkin/CheckInClient';
import { getCheckInRepository } from '@/lib/checkin/server';
import { todayPacificDateString } from '@/lib/utils/date';
import { fetchMountainViewWeather, saveDailyWeather, type MountainViewWeather } from '@/lib/weather/mountainView';

export const dynamic = 'force-dynamic';

/**
 * Persist today's Mountain View weather so meal service days get a
 * `daily_weather` row for attendance correlation. Best-effort: failures are
 * logged and never block rendering. Upsert on (date, location) keeps it
 * idempotent across reloads and devices.
 */
async function persistCheckInDayWeather(weather: MountainViewWeather | null): Promise<void> {
    if (weather?.tempHigh == null || weather?.tempLow == null) return;
    try {
        // Dynamic import keeps the server-only Supabase client (next/headers)
        // out of the client bundle and unit-test module graph.
        const { createClient } = await import('@/lib/supabase/server');
        await saveDailyWeather(
            {
                date: weather.date || todayPacificDateString(),
                location: weather.location,
                tempHigh: weather.tempHigh,
                tempLow: weather.tempLow,
                weatherCode: weather.weatherCode,
                condition: weather.condition || 'Clear',
                conditionCategory: weather.conditionCategory || 'sunny',
                precipitationSum: weather.precipitationSum ?? 0,
                hasRain: weather.hasRain ?? false,
            },
            await createClient()
        );
    } catch (error) {
        console.error('[check-in] Failed to persist daily weather', error);
    }
}

export default async function CheckInPage() {
    const weatherPromise = fetchMountainViewWeather();

    if (process.env.CHECKIN_V2_ENABLED === 'false') {
        const weather = await weatherPromise;
        await persistCheckInDayWeather(weather);
        return <CheckInClient v2Enabled={false} initialWeather={weather} />;
    }

    const snapshotPromise = getCheckInRepository()
        .getSnapshot(todayPacificDateString())
        .catch((error) => {
            console.error('[check-in] Server snapshot unavailable; using client fallback', error);
            return null;
        });
    const weather = await weatherPromise;
    // Overlap the weather write with the snapshot query so persisting adds no latency.
    const persistPromise = persistCheckInDayWeather(weather);
    const snapshot = await snapshotPromise;
    await persistPromise;

    return <CheckInClient initialSnapshot={snapshot} initialWeather={weather} v2Enabled={snapshot !== null} />;
}
