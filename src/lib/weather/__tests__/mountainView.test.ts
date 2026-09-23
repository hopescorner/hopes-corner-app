import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    deriveWeatherCondition,
    deriveWeatherConditionCategory,
    buildWeatherUrl,
    buildHistoricalWeatherUrl,
    fetchMountainViewWeather,
    saveDailyWeather,
    fetchAndSaveTodayMountainViewWeather,
    backfillMountainViewWeather,
    MOUNTAIN_VIEW_WEATHER_LOCATION,
} from '../mountainView';

describe('mountainView weather utilities', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    describe('deriveWeatherCondition', () => {
        it('maps WMO weather codes correctly', () => {
            expect(deriveWeatherCondition(0)).toBe('Clear');
            expect(deriveWeatherCondition(1)).toBe('Mainly clear');
            expect(deriveWeatherCondition(2)).toBe('Partly cloudy');
            expect(deriveWeatherCondition(3)).toBe('Overcast');
            expect(deriveWeatherCondition(45)).toBe('Fog');
            expect(deriveWeatherCondition(51)).toBe('Drizzle');
            expect(deriveWeatherCondition(61)).toBe('Rain');
            expect(deriveWeatherCondition(71)).toBe('Snow');
            expect(deriveWeatherCondition(95)).toBe('Thunderstorm');
            expect(deriveWeatherCondition(null)).toBe('Clear');
        });
    });

    describe('deriveWeatherConditionCategory', () => {
        it('categorizes based on code and precipitation', () => {
            expect(deriveWeatherConditionCategory(0, 0)).toBe('sunny');
            expect(deriveWeatherConditionCategory(1, 0)).toBe('sunny');
            expect(deriveWeatherConditionCategory(2, 0)).toBe('cloudy');
            expect(deriveWeatherConditionCategory(3, 0)).toBe('cloudy');
            expect(deriveWeatherConditionCategory(61, 0)).toBe('rain');
            expect(deriveWeatherConditionCategory(3, 0.25)).toBe('rain');
            expect(deriveWeatherConditionCategory(45, 0)).toBe('fog');
            expect(deriveWeatherConditionCategory(71, 0)).toBe('snow');
            expect(deriveWeatherConditionCategory(999, 0)).toBe('other');
        });
    });

    describe('buildWeatherUrl & buildHistoricalWeatherUrl', () => {
        it('builds forecast URL with coordinates and parameters', () => {
            const url = buildWeatherUrl({ pastDays: 7, forecastDays: 3 });
            expect(url.searchParams.get('latitude')).toBe('37.3861');
            expect(url.searchParams.get('longitude')).toBe('-122.0839');
            expect(url.searchParams.get('temperature_unit')).toBe('fahrenheit');
            expect(url.searchParams.get('past_days')).toBe('7');
            expect(url.searchParams.get('forecast_days')).toBe('3');
        });

        it('builds historical URL with start and end dates', () => {
            const url = buildHistoricalWeatherUrl('2026-08-01', '2026-08-31');
            expect(url.hostname).toBe('archive-api.open-meteo.com');
            expect(url.searchParams.get('start_date')).toBe('2026-08-01');
            expect(url.searchParams.get('end_date')).toBe('2026-08-31');
        });
    });

    describe('fetchMountainViewWeather', () => {
        it('parses daily high, low, precipitation and condition', async () => {
            const mockResponse = {
                current: { temperature_2m: 71.5, weather_code: 1 },
                daily: {
                    time: ['2026-09-22'],
                    temperature_2m_max: [76.2],
                    temperature_2m_min: [54.8],
                    weather_code: [1],
                    precipitation_sum: [0.0],
                },
            };
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(mockResponse), { status: 200 })));

            const weather = await fetchMountainViewWeather();
            expect(weather).not.toBeNull();
            expect(weather?.location).toBe(MOUNTAIN_VIEW_WEATHER_LOCATION);
            expect(weather?.temperatureF).toBe(71.5);
            expect(weather?.tempHigh).toBe(76.2);
            expect(weather?.tempLow).toBe(54.8);
            expect(weather?.condition).toBe('Mainly clear');
            expect(weather?.conditionCategory).toBe('sunny');
            expect(weather?.hasRain).toBe(false);
        });

        it('handles API errors gracefully', async () => {
            vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
            const weather = await fetchMountainViewWeather();
            expect(weather).toBeNull();
        });
    });

    describe('saveDailyWeather', () => {
        it('upserts record to daily_weather table', async () => {
            const mockClient = {
                from: vi.fn().mockReturnValue({
                    upsert: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: {
                                    id: 'w-1',
                                    date: '2026-09-22',
                                    location: 'Mountain View, CA',
                                    temp_high: 75.0,
                                    temp_low: 52.0,
                                    temp_unit: 'F',
                                    weather_code: 0,
                                    condition: 'Clear',
                                    condition_category: 'sunny',
                                    precipitation_sum: 0,
                                    has_rain: false,
                                },
                                error: null,
                            }),
                        }),
                    }),
                }),
            } as any;

            const saved = await saveDailyWeather({
                date: '2026-09-22',
                tempHigh: 75.0,
                tempLow: 52.0,
                weatherCode: 0,
                condition: 'Clear',
                conditionCategory: 'sunny',
            }, mockClient);

            expect(saved).not.toBeNull();
            expect(saved?.id).toBe('w-1');
            expect(saved?.tempHigh).toBe(75);
            expect(mockClient.from).toHaveBeenCalledWith('daily_weather');
        });
    });

    describe('fetchAndSaveTodayMountainViewWeather', () => {
        it('fetches and persists when high/low are available', async () => {
            const mockResponse = {
                current: { temperature_2m: 70, weather_code: 3 },
                daily: {
                    time: ['2026-09-22'],
                    temperature_2m_max: [74],
                    temperature_2m_min: [55],
                    weather_code: [3],
                    precipitation_sum: [0.1],
                },
            };
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(mockResponse), { status: 200 })));

            const mockClient = {
                from: vi.fn().mockReturnValue({
                    upsert: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: {
                                    id: 'w-today',
                                    date: '2026-09-22',
                                    location: 'Mountain View, CA',
                                    temp_high: 74,
                                    temp_low: 55,
                                    temp_unit: 'F',
                                    weather_code: 3,
                                    condition: 'Overcast',
                                    condition_category: 'rain',
                                    precipitation_sum: 0.1,
                                    has_rain: true,
                                },
                                error: null,
                            }),
                        }),
                    }),
                }),
            } as any;

            const result = await fetchAndSaveTodayMountainViewWeather(mockClient);
            expect(result).not.toBeNull();
            expect(result?.conditionCategory).toBe('rain');
        });
    });

    describe('backfillMountainViewWeather', () => {
        it('fetches archive API and batch upserts rows', async () => {
            const mockArchive = {
                daily: {
                    time: ['2026-08-01', '2026-08-02'],
                    temperature_2m_max: [80, 82],
                    temperature_2m_min: [55, 57],
                    weather_code: [0, 61],
                    precipitation_sum: [0, 0.3],
                },
            };
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(mockArchive), { status: 200 })));

            const mockClient = {
                from: vi.fn().mockReturnValue({
                    upsert: vi.fn().mockReturnValue({
                        select: vi.fn().mockResolvedValue({
                            data: [
                                {
                                    id: 'b-1',
                                    date: '2026-08-01',
                                    temp_high: 80,
                                    temp_low: 55,
                                    condition: 'Clear',
                                    condition_category: 'sunny',
                                    precipitation_sum: 0,
                                    has_rain: false,
                                },
                                {
                                    id: 'b-2',
                                    date: '2026-08-02',
                                    temp_high: 82,
                                    temp_low: 57,
                                    condition: 'Rain',
                                    condition_category: 'rain',
                                    precipitation_sum: 0.3,
                                    has_rain: true,
                                },
                            ],
                            error: null,
                        }),
                    }),
                }),
            } as any;

            const records = await backfillMountainViewWeather('2026-08-01', '2026-08-02', mockClient);
            expect(records.length).toBe(2);
            expect(records[0].conditionCategory).toBe('sunny');
            expect(records[1].conditionCategory).toBe('rain');
        });
    });
});
