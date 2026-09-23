import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWeatherStore } from '../useWeatherStore';

const mockSelect = vi.fn();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: () => ({
            select: mockSelect,
        }),
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
    }),
}));

vi.mock('@/lib/utils/mappers', () => ({
    mapDailyWeatherRow: (row: any) => ({
        id: row.id,
        date: row.date,
        location: row.location || 'Mountain View, CA',
        tempHigh: Number(row.temp_high),
        tempLow: Number(row.temp_low),
        tempUnit: row.temp_unit || 'F',
        weatherCode: row.weather_code ?? null,
        condition: row.condition,
        conditionCategory: row.condition_category,
        precipitationSum: Number(row.precipitation_sum) || 0,
        hasRain: row.has_rain === true,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }),
}));

describe('useWeatherStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useWeatherStore.setState({
            records: [],
            weatherByDate: {},
            isLoading: false,
            isLoaded: false,
        });
    });

    describe('ensureLoaded & loadFromSupabase', () => {
        it('loads records and populates weatherByDate map', async () => {
            const mockRows = [
                {
                    id: 'w-1',
                    date: '2026-09-22',
                    location: 'Mountain View, CA',
                    temp_high: 75,
                    temp_low: 55,
                    temp_unit: 'F',
                    weather_code: 1,
                    condition: 'Mainly clear',
                    condition_category: 'sunny',
                    precipitation_sum: 0,
                    has_rain: false,
                },
                {
                    id: 'w-2',
                    date: '2026-09-23',
                    location: 'Mountain View, CA',
                    temp_high: 68,
                    temp_low: 52,
                    temp_unit: 'F',
                    weather_code: 61,
                    condition: 'Rain',
                    condition_category: 'rain',
                    precipitation_sum: 0.25,
                    has_rain: true,
                },
            ];

            const mockOrder = vi.fn().mockResolvedValue({ data: mockRows, error: null });
            mockSelect.mockReturnValue({ order: mockOrder });

            await useWeatherStore.getState().ensureLoaded();

            const state = useWeatherStore.getState();
            expect(state.isLoaded).toBe(true);
            expect(state.records).toHaveLength(2);
            expect(state.weatherByDate['2026-09-22']?.tempHigh).toBe(75);
            expect(state.weatherByDate['2026-09-23']?.conditionCategory).toBe('rain');
        });
    });

    describe('getWeatherForDate', () => {
        it('returns record in O(1) by date key', () => {
            useWeatherStore.setState({
                weatherByDate: {
                    '2026-09-22': {
                        id: 'w-1',
                        date: '2026-09-22',
                        location: 'Mountain View, CA',
                        tempHigh: 75,
                        tempLow: 55,
                        tempUnit: 'F',
                        weatherCode: 1,
                        condition: 'Mainly clear',
                        conditionCategory: 'sunny',
                        precipitationSum: 0,
                        hasRain: false,
                    },
                },
            });

            const weather = useWeatherStore.getState().getWeatherForDate('2026-09-22');
            expect(weather).not.toBeNull();
            expect(weather?.condition).toBe('Mainly clear');

            const missing = useWeatherStore.getState().getWeatherForDate('2026-09-25');
            expect(missing).toBeNull();
        });
    });

    describe('subscribeToRealtime', () => {
        it('sets up channel and unsubscribes on cleanup', () => {
            const mockSubscribe = vi.fn().mockReturnThis();
            const mockOn = vi.fn().mockReturnValue({ subscribe: mockSubscribe });
            mockChannel.mockReturnValue({ on: mockOn });

            const unsubscribe = useWeatherStore.getState().subscribeToRealtime();
            expect(mockChannel).toHaveBeenCalledWith('daily_weather_changes');
            expect(mockOn).toHaveBeenCalledWith(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'daily_weather' },
                expect.any(Function)
            );

            unsubscribe();
            expect(mockRemoveChannel).toHaveBeenCalled();
        });

        it('handles INSERT and UPDATE events', () => {
            let changeCallback: ((payload: any) => void) | undefined;
            const mockSubscribe = vi.fn().mockReturnThis();
            const mockOn = vi.fn().mockImplementation((_event, _filter, callback) => {
                changeCallback = callback;
                return { subscribe: mockSubscribe };
            });
            mockChannel.mockReturnValue({ on: mockOn });

            useWeatherStore.getState().subscribeToRealtime();
            expect(changeCallback).toBeDefined();

            changeCallback!({
                eventType: 'INSERT',
                new: {
                    id: 'w-realtime-1',
                    date: '2026-09-24',
                    temp_high: 80,
                    temp_low: 58,
                    condition: 'Clear',
                    condition_category: 'sunny',
                    precipitation_sum: 0,
                    has_rain: false,
                },
            });

            const state = useWeatherStore.getState();
            expect(state.weatherByDate['2026-09-24']).toBeDefined();
            expect(state.weatherByDate['2026-09-24'].tempHigh).toBe(80);
        });
    });
});
