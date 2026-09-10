import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MOUNTAIN_VIEW = {
    latitude: 37.3861,
    longitude: -122.0839,
    label: 'Mountain View, CA',
};

const REVALIDATE_SECONDS = 900;

export function buildWeatherUrl() {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(MOUNTAIN_VIEW.latitude));
    url.searchParams.set('longitude', String(MOUNTAIN_VIEW.longitude));
    url.searchParams.set('current', 'temperature_2m,weather_code');
    url.searchParams.set('temperature_unit', 'fahrenheit');
    url.searchParams.set('timezone', 'America/Los_Angeles');
    return url;
}

export async function GET() {
    try {
        const response = await fetch(buildWeatherUrl(), { next: { revalidate: REVALIDATE_SECONDS } });
        if (!response.ok) {
            throw new Error(`Open-Meteo responded ${response.status}`);
        }

        const data = await response.json();
        const temperatureF = typeof data?.current?.temperature_2m === 'number' ? data.current.temperature_2m : null;
        const weatherCode = typeof data?.current?.weather_code === 'number' ? data.current.weather_code : null;

        if (temperatureF === null) {
            throw new Error('Missing temperature in weather response');
        }

        return NextResponse.json(
            { location: MOUNTAIN_VIEW.label, temperatureF, weatherCode },
            { headers: { 'Cache-Control': `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=300` } }
        );
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Weather unavailable' },
            { status: 502 }
        );
    }
}
