import { describe, it, expect, vi, afterEach } from 'vitest';

describe('GET /api/weather', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('returns Fahrenheit temperature and weather code for Mountain View', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
            current: { temperature_2m: 68.4, weather_code: 2 },
        }), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        const { GET } = await import('@/app/api/weather/route');
        const response = await GET();
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({ location: 'Mountain View, CA', temperatureF: 68.4, weatherCode: 2 });

        const requestedUrl = String(fetchMock.mock.calls[0][0]);
        expect(requestedUrl).toContain('latitude=37.3861');
        expect(requestedUrl).toContain('longitude=-122.0839');
        expect(requestedUrl).toContain('temperature_unit=fahrenheit');
    });

    it('returns 502 when the upstream request fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 500 })));

        const { GET } = await import('@/app/api/weather/route');
        const response = await GET();

        expect(response.status).toBe(502);
    });
});
