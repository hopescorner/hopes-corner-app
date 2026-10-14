import { describe, it, expect, vi, afterEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: mockFrom,
    }),
}));

vi.mock('@/lib/headlines/bayArea', () => ({
    fetchAndSaveTodayBayAreaHeadlines: vi.fn(),
    saveDailyHeadlines: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(async () => ({
        from: mockFrom,
        __testServerClient: true,
    })),
}));

/** Build a select chain supporting .order().order() then terminal filters. */
function mockSelectChain(terminal: any) {
    const secondOrder = vi.fn().mockReturnValue(terminal);
    const firstOrder = vi.fn().mockReturnValue({
        order: secondOrder,
        eq: vi.fn().mockReturnValue(terminal),
        gte: vi.fn().mockReturnValue(terminal),
        lte: vi.fn().mockReturnValue(terminal),
    });
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order: firstOrder }) });
    return { firstOrder, secondOrder };
}

describe('GET and POST /api/headlines/daily', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/headlines/daily', () => {
        it('returns ranked daily headlines', async () => {
            const terminal = {
                data: [
                    {
                        id: 'h-1',
                        date: '2026-10-11',
                        rank: 1,
                        headline: 'Sharks win in overtime',
                        source: 'Bay Area News Group',
                        url: 'https://news.google.com/rss/articles/x',
                        published_at: '2026-10-11T04:17:51.000Z',
                    },
                    {
                        id: 'h-2',
                        date: '2026-10-11',
                        rank: 2,
                        headline: 'ICE surge expected in Bay Area',
                        source: 'KQED',
                        url: null,
                        published_at: null,
                    },
                ],
                error: null,
            };
            mockSelectChain(terminal);

            const { GET } = await import('../route');
            const request = new Request('http://localhost:3000/api/headlines/daily');
            const response = await GET(request);
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.headlines).toHaveLength(2);
            expect(json.headlines[0].rank).toBe(1);
            expect(json.headlines[1].source).toBe('KQED');
        });

        it('handles date range filters', async () => {
            const terminal: any = { data: [], error: null };
            const lte = vi.fn().mockResolvedValue(terminal);
            const eq = vi.fn().mockResolvedValue(terminal);
            const gte = vi.fn().mockReturnValue({ ...terminal, lte, eq });
            const secondOrder = vi.fn().mockReturnValue({ ...terminal, gte });
            mockFrom.mockReturnValue({
                select: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ order: secondOrder }) }),
            });

            const { GET } = await import('../route');
            const request = new Request(
                'http://localhost:3000/api/headlines/daily?startDate=2026-10-01&endDate=2026-10-10'
            );
            const response = await GET(request);

            expect(response.status).toBe(200);
            expect(gte).toHaveBeenCalledWith('date', '2026-10-01');
            expect(lte).toHaveBeenCalledWith('date', '2026-10-10');
        });

        it('returns 500 when query fails', async () => {
            mockSelectChain({ data: null, error: { message: 'Database query failed' } });

            const { GET } = await import('../route');
            const request = new Request('http://localhost:3000/api/headlines/daily');
            const response = await GET(request);

            expect(response.status).toBe(500);
        });
    });

    describe('POST /api/headlines/daily', () => {
        it('syncs today headlines when syncToday is true', async () => {
            const { fetchAndSaveTodayBayAreaHeadlines } = await import('@/lib/headlines/bayArea');
            vi.mocked(fetchAndSaveTodayBayAreaHeadlines).mockResolvedValue([
                {
                    id: 'h-today-1',
                    date: '2026-10-12',
                    rank: 1,
                    headline: 'Top Bay Area story',
                    source: 'KQED',
                    url: null,
                    publishedAt: null,
                },
            ]);

            const { POST } = await import('../route');
            const request = new Request('http://localhost:3000/api/headlines/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ syncToday: true }),
            });

            const response = await POST(request);
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.headlines[0].date).toBe('2026-10-12');
        });

        it('saves manually entered headlines', async () => {
            const { saveDailyHeadlines } = await import('@/lib/headlines/bayArea');
            vi.mocked(saveDailyHeadlines).mockResolvedValue([
                {
                    id: 'h-manual',
                    date: '2026-10-11',
                    rank: 1,
                    headline: 'Manually recorded story',
                    source: 'Mercury News',
                    url: 'https://www.mercurynews.com/2026/10/11/example/',
                    publishedAt: null,
                },
            ]);

            const { POST } = await import('../route');
            const request = new Request('http://localhost:3000/api/headlines/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: '2026-10-11',
                    headline: 'Manually recorded story',
                    source: 'Mercury News',
                }),
            });

            const response = await POST(request);
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.headlines[0].source).toBe('Mercury News');
            expect(vi.mocked(saveDailyHeadlines)).toHaveBeenCalledWith(
                '2026-10-11',
                [expect.objectContaining({ headline: 'Manually recorded story' })],
                expect.anything()
            );
        });

        it('returns 400 when missing required body fields', async () => {
            const { POST } = await import('../route');
            const request = new Request('http://localhost:3000/api/headlines/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            const response = await POST(request);
            expect(response.status).toBe(400);
        });
    });
});
