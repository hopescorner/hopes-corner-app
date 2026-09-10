'use client';

import { useEffect, useState } from 'react';
import {
    Cloud,
    CloudDrizzle,
    CloudFog,
    CloudLightning,
    CloudRain,
    CloudSnow,
    CloudSun,
    Sun,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const WEATHER_LOCATION = 'Mountain View, CA';

export interface WeatherCondition {
    label: string;
    Icon: typeof Sun;
}

/**
 * Maps a WMO weather code (Open-Meteo) to a label and icon.
 * https://open-meteo.com/en/docs
 */
export function getWeatherCondition(code: number | null | undefined): WeatherCondition {
    if (code === 0) return { label: 'Clear', Icon: Sun };
    if (code === 1) return { label: 'Mainly clear', Icon: Sun };
    if (code === 2) return { label: 'Partly cloudy', Icon: CloudSun };
    if (code === 3) return { label: 'Overcast', Icon: Cloud };
    if (code === 45 || code === 48) return { label: 'Fog', Icon: CloudFog };
    if (code !== null && code !== undefined) {
        if ([51, 53, 55, 56, 57].includes(code)) return { label: 'Drizzle', Icon: CloudDrizzle };
        if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: 'Rain', Icon: CloudRain };
        if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Snow', Icon: CloudSnow };
        if ([95, 96, 99].includes(code)) return { label: 'Thunderstorm', Icon: CloudLightning };
    }
    return { label: 'Weather', Icon: CloudSun };
}

interface WeatherData {
    temperatureF: number | null;
    weatherCode: number | null;
}

export function WeatherBadge({ className }: { className?: string }) {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [unavailable, setUnavailable] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        fetch('/api/weather', { signal: controller.signal })
            .then((response) => (response.ok ? response.json() : Promise.reject(new Error('Weather request failed'))))
            .then((data: WeatherData) => {
                if (typeof data?.temperatureF === 'number') {
                    setWeather(data);
                } else {
                    setUnavailable(true);
                }
            })
            .catch(() => {
                if (!controller.signal.aborted) setUnavailable(true);
            });

        return () => controller.abort();
    }, []);

    if (unavailable) return null;

    const { Icon, label } = getWeatherCondition(weather?.weatherCode ?? null);

    return (
        <span
            data-testid="weather-badge"
            title={`${label} in ${WEATHER_LOCATION}`}
            aria-label={weather ? `${label}, ${Math.round(weather.temperatureF ?? 0)} degrees Fahrenheit in ${WEATHER_LOCATION}` : `Loading weather for ${WEATHER_LOCATION}`}
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-sm font-semibold text-sky-700',
                className
            )}
        >
            <Icon size={16} className="text-sky-500" aria-hidden="true" />
            {weather ? (
                <>
                    <span>{Math.round(weather.temperatureF ?? 0)}°F</span>
                    <span className="hidden font-medium text-sky-600/80 sm:inline">{label}</span>
                </>
            ) : (
                <span className="inline-block h-4 w-10 animate-pulse rounded bg-sky-100" aria-hidden="true" />
            )}
        </span>
    );
}
