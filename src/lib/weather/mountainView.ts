import { createClient } from '@/lib/supabase/client';
import { todayPacificDateString } from '@/lib/utils/date';
import { mapDailyWeatherRow } from '@/lib/utils/mappers';
import type { DailyWeather, WeatherConditionCategory } from '@/types/database';

export const MOUNTAIN_VIEW_WEATHER_LOCATION = 'Mountain View, CA';
export const WEATHER_REVALIDATE_SECONDS = 900;

export const MOUNTAIN_VIEW = {
    latitude: 37.3861,
    longitude: -122.0839,
};

export interface MountainViewWeather {
    location: string;
    temperatureF: number;
    weatherCode: number | null;
    date?: string;
    tempHigh?: number | null;
    tempLow?: number | null;
    condition?: string;
    conditionCategory?: WeatherConditionCategory;
    precipitationSum?: number;
    hasRain?: boolean;
}

export function deriveWeatherCondition(code: number | null | undefined): string {
    if (code === 0) return 'Clear';
    if (code === 1) return 'Mainly clear';
    if (code === 2) return 'Partly cloudy';
    if (code === 3) return 'Overcast';
    if (code === 45 || code === 48) return 'Fog';
    if (code !== null && code !== undefined) {
        if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
        if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
        if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
        if ([95, 96, 99].includes(code)) return 'Thunderstorm';
    }
    return 'Clear';
}

export function deriveWeatherConditionCategory(
    weatherCode: number | null | undefined,
    precipitationSum?: number | null
): WeatherConditionCategory {
    if (precipitationSum !== null && precipitationSum !== undefined && precipitationSum > 0.01) {
        return 'rain';
    }
    if (weatherCode !== null && weatherCode !== undefined) {
        if (weatherCode === 0 || weatherCode === 1) return 'sunny';
        if (weatherCode === 2 || weatherCode === 3) return 'cloudy';
        if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(weatherCode)) return 'rain';
        if (weatherCode === 45 || weatherCode === 48) return 'fog';
        if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return 'snow';
    }
    return 'other';
}

export function buildWeatherUrl(options?: { pastDays?: number; forecastDays?: number }) {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(MOUNTAIN_VIEW.latitude));
    url.searchParams.set('longitude', String(MOUNTAIN_VIEW.longitude));
    url.searchParams.set('current', 'temperature_2m,weather_code');
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum');
    url.searchParams.set('temperature_unit', 'fahrenheit');
    url.searchParams.set('precipitation_unit', 'inch');
    url.searchParams.set('timezone', 'America/Los_Angeles');
    if (options?.pastDays) {
        url.searchParams.set('past_days', String(options.pastDays));
    }
    if (options?.forecastDays) {
        url.searchParams.set('forecast_days', String(options.forecastDays));
    }
    return url;
}

export function buildHistoricalWeatherUrl(startDate: string, endDate: string) {
    const url = new URL('https://archive-api.open-meteo.com/v1/archive');
    url.searchParams.set('latitude', String(MOUNTAIN_VIEW.latitude));
    url.searchParams.set('longitude', String(MOUNTAIN_VIEW.longitude));
    url.searchParams.set('start_date', startDate);
    url.searchParams.set('end_date', endDate);
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum');
    url.searchParams.set('temperature_unit', 'fahrenheit');
    url.searchParams.set('precipitation_unit', 'inch');
    url.searchParams.set('timezone', 'America/Los_Angeles');
    return url;
}

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

        const weatherCode = typeof data?.current?.weather_code === 'number' ? data.current.weather_code : null;

        const dailyTime = Array.isArray(data?.daily?.time) ? data.daily.time[0] : todayPacificDateString();
        const tempHigh = typeof data?.daily?.temperature_2m_max?.[0] === 'number' ? data.daily.temperature_2m_max[0] : null;
        const tempLow = typeof data?.daily?.temperature_2m_min?.[0] === 'number' ? data.daily.temperature_2m_min[0] : null;
        const dailyCode = typeof data?.daily?.weather_code?.[0] === 'number' ? data.daily.weather_code[0] : weatherCode;
        const precipitationSum = typeof data?.daily?.precipitation_sum?.[0] === 'number' ? data.daily.precipitation_sum[0] : 0;

        const condition = deriveWeatherCondition(dailyCode);
        const conditionCategory = deriveWeatherConditionCategory(dailyCode, precipitationSum);
        const hasRain = conditionCategory === 'rain' || precipitationSum > 0.01;

        const result: MountainViewWeather = {
            location: MOUNTAIN_VIEW_WEATHER_LOCATION,
            temperatureF,
            weatherCode,
        };

        if (tempHigh !== null && tempLow !== null) {
            result.date = dailyTime;
            result.tempHigh = tempHigh;
            result.tempLow = tempLow;
            result.condition = condition;
            result.conditionCategory = conditionCategory;
            result.precipitationSum = precipitationSum;
            result.hasRain = hasRain;
        }

        return result;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

export interface SaveDailyWeatherInput {
    date: string;
    location?: string;
    tempHigh: number;
    tempLow: number;
    tempUnit?: string;
    weatherCode: number | null;
    condition: string;
    conditionCategory: WeatherConditionCategory;
    precipitationSum?: number;
    hasRain?: boolean;
}

export async function saveDailyWeather(
    input: SaveDailyWeatherInput,
    supabaseClient = createClient()
): Promise<DailyWeather | null> {
    try {
        const payload = {
            date: input.date,
            location: input.location || MOUNTAIN_VIEW_WEATHER_LOCATION,
            temp_high: input.tempHigh,
            temp_low: input.tempLow,
            temp_unit: input.tempUnit || 'F',
            weather_code: input.weatherCode,
            condition: input.condition,
            condition_category: input.conditionCategory,
            precipitation_sum: input.precipitationSum ?? 0,
            has_rain: input.hasRain ?? (input.precipitationSum ? input.precipitationSum > 0.01 : false),
        };

        const { data, error } = await supabaseClient
            .from('daily_weather')
            .upsert(payload, { onConflict: 'date,location' })
            .select()
            .single();

        if (error || !data) {
            console.error('Failed to save daily weather:', error);
            return null;
        }

        return mapDailyWeatherRow(data);
    } catch (err) {
        console.error('Error saving daily weather:', err);
        return null;
    }
}

export async function fetchAndSaveTodayMountainViewWeather(
    supabaseClient = createClient()
): Promise<DailyWeather | null> {
    const weather = await fetchMountainViewWeather();
    if (!weather || weather.tempHigh === null || weather.tempHigh === undefined || weather.tempLow === null || weather.tempLow === undefined) {
        return null;
    }

    const date = weather.date || todayPacificDateString();
    return saveDailyWeather({
        date,
        location: weather.location,
        tempHigh: weather.tempHigh,
        tempLow: weather.tempLow,
        weatherCode: weather.weatherCode,
        condition: weather.condition || 'Clear',
        conditionCategory: weather.conditionCategory || 'sunny',
        precipitationSum: weather.precipitationSum ?? 0,
        hasRain: weather.hasRain ?? false,
    }, supabaseClient);
}

export async function backfillMountainViewWeather(
    startDate: string,
    endDate: string,
    supabaseClient = createClient()
): Promise<DailyWeather[]> {
    try {
        const response = await fetch(buildHistoricalWeatherUrl(startDate, endDate));
        if (!response.ok) return [];

        const data = await response.json();
        const times: string[] = data?.daily?.time || [];
        const maxTemps: number[] = data?.daily?.temperature_2m_max || [];
        const minTemps: number[] = data?.daily?.temperature_2m_min || [];
        const codes: (number | null)[] = data?.daily?.weather_code || [];
        const precip: number[] = data?.daily?.precipitation_sum || [];

        const rowsToUpsert = times.map((dateStr, i) => {
            const high = maxTemps[i] ?? 0;
            const low = minTemps[i] ?? 0;
            const code = codes[i] ?? null;
            const pSum = precip[i] ?? 0;
            const condition = deriveWeatherCondition(code);
            const conditionCategory = deriveWeatherConditionCategory(code, pSum);
            const hasRain = conditionCategory === 'rain' || pSum > 0.01;

            return {
                date: dateStr,
                location: MOUNTAIN_VIEW_WEATHER_LOCATION,
                temp_high: high,
                temp_low: low,
                temp_unit: 'F',
                weather_code: code,
                condition,
                condition_category: conditionCategory,
                precipitation_sum: pSum,
                has_rain: hasRain,
            };
        });

        if (rowsToUpsert.length === 0) return [];

        const { data: savedRows, error } = await supabaseClient
            .from('daily_weather')
            .upsert(rowsToUpsert, { onConflict: 'date,location' })
            .select();

        if (error || !savedRows) {
            console.error('Failed to backfill daily weather:', error);
            return [];
        }

        return savedRows.map(mapDailyWeatherRow);
    } catch (err) {
        console.error('Error during weather backfill:', err);
        return [];
    }
}
