export const MOUNTAIN_VIEW_WEATHER_LOCATION = 'Mountain View, CA';
export const WEATHER_REVALIDATE_SECONDS = 900;

const MOUNTAIN_VIEW = {
    latitude: 37.3861,
    longitude: -122.0839,
};

export interface MountainViewWeather {
    location: string;
    temperatureF: number;
    weatherCode: number | null;
}

export function buildWeatherUrl() {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(MOUNTAIN_VIEW.latitude));
    url.searchParams.set('longitude', String(MOUNTAIN_VIEW.longitude));
    url.searchParams.set('current', 'temperature_2m,weather_code');
    url.searchParams.set('temperature_unit', 'fahrenheit');
    url.searchParams.set('timezone', 'America/Los_Angeles');
    return url;
}

/**
 * Fetches the current Mountain View weather in Fahrenheit.
 * Resolves to null rather than throwing so callers can render gracefully.
 */
export async function fetchMountainViewWeather(timeoutMs = 4000): Promise<MountainViewWeather | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(buildWeatherUrl(), {
            signal: controller.signal,
            next: { revalidate: WEATHER_REVALIDATE_SECONDS },
        });
        if (!response.ok) return null;

        const data = await response.json();
        const temperatureF = typeof data?.current?.temperature_2m === 'number' ? data.current.temperature_2m : null;
        if (temperatureF === null) return null;

        return {
            location: MOUNTAIN_VIEW_WEATHER_LOCATION,
            temperatureF,
            weatherCode: typeof data?.current?.weather_code === 'number' ? data.current.weather_code : null,
        };
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}
