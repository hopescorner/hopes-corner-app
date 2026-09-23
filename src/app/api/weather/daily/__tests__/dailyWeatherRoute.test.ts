import { describe, it, expect, vi, afterEach } from 'vitest';

const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockGte = vi.fn();
const mockLte = vi.fn();
const mockEq = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: vi.fn().mockReturnValue({
            select: mockSelect,
        }),
    }),
}));

vi.mock('@/lib/weather/mountainView', () => ({
    fetchAndSaveTodayMountainViewWeather: vi.fn(),
    backfillMountainViewWeather: vi.fn(),
}));

describe('GET and POST /api/weather/daily', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/weather/daily', () => {
        it('returns list of daily weather records', async () => {
            mockOrder.mockResolvedValue({
                data: [
                    {
                        id: 'w-1',
                        date: '2026-09-22',
                        location: 'Mountain View, CA',
                        temp_high: 72,
                        temp_low: 54,
                        temp_unit: 'F',
                        weather_code: 1,
                        condition: 'Mainly clear',
                        condition_category: 'sunny',
                        precipitation_sum: 0,
                        has_rain: false,
                    },
                ],
                error: null,
            });
            mockSelect.mockReturnValue({ order: mockOrder });

            const { GET } = await import('../route');
            const request = new Request('http://localhost:3000/api/weather/daily');
            const response = await GET(request);
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.weather).toHaveLength(1);
            expect(json.weather[0].conditionCategory).toBe('sunny');
            expect(json.weather[0].tempHigh).toBe(72);
        });

        it('handles date range filters', async () => {
            mockLte.mockResolvedValue({ data: [], error: null });
            mockGte.mockReturnValue({ lte: mockLte });
            mockOrder.mockReturnValue({ gte: mockGte });
            mockSelect.mockReturnValue({ order: mockOrder });

            const { GET } = await import('../route');
            const request = new Request('http://localhost:3000/api/weather/daily?startDate=2026-09-01&endDate=2026-09-10');
            const response = await GET(request);

            expect(response.status).toBe(200);
            expect(mockGte).toHaveBeenCalledWith('date', '2026-09-01');
            expect(mockLte).toHaveBeenCalledWith('date', '2026-09-10');
        });

        it('returns 500 when query fails', async () => {
            mockOrder.mockResolvedValue({ data: null, error: { message: 'Database query failed' } });
            mockSelect.mockReturnValue({ order: mockOrder });

            const { GET } = await import('../route');
            const request = new Request('http://localhost:3000/api/weather/daily');
            const response = await GET(request);

            expect(response.status).toBe(500);
        });
    });

    describe('POST /api/weather/daily', () => {
        it('syncs today weather when syncToday is true', async () => {
            const { fetchAndSaveTodayMountainViewWeather } = await import('@/lib/weather/mountainView');
            vi.mocked(fetchAndSaveTodayMountainViewWeather).mockResolvedValue({
                id: 'w-today',
                date: '2026-09-22',
                location: 'Mountain View, CA',
                tempHigh: 75,
                tempLow: 52,
                tempUnit: 'F',
                weatherCode: 0,
                condition: 'Clear',
                conditionCategory: 'sunny',
                precipitationSum: 0,
                hasRain: false,
            });

            const { POST } = await import('../route');
            const request = new Request('http://localhost:3000/api/weather/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ syncToday: true }),
            });

            const response = await POST(request);
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.weather.date).toBe('2026-09-22');
        });

        it('backfills weather for date range', async () => {
            const { backfillMountainViewWeather } = await import('@/lib/weather/mountainView');
            vi.mocked(backfillMountainViewWeather).mockResolvedValue([
                {
                    id: 'b-1',
                    date: '2026-08-01',
                    location: 'Mountain View, CA',
                    tempHigh: 80,
                    tempLow: 55,
                    tempUnit: 'F',
                    weatherCode: 0,
                    condition: 'Clear',
                    conditionCategory: 'sunny',
                    precipitationSum: 0,
                    hasRain: false,
                },
            ]);

            const { POST } = await import('../route');
            const request = new Request('http://localhost:3000/api/weather/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate: '2026-08-01', endDate: '2026-08-01' }),
            });

            const response = await POST(request);
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.count).toBe(1);
        });

        it('returns 400 when missing required body fields', async () => {
            const { POST } = await import('../route');
            const request = new Request('http://localhost:3000/api/weather/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            const response = await POST(request);
            expect(response.status).toBe(400);
        });
    });
});
