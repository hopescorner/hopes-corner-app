import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useHeadlinesStore } from '../useHeadlinesStore';

const mockSelect = vi.fn();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();
const mockUpsert = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: () => ({
            select: mockSelect,
            upsert: mockUpsert,
        }),
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
    }),
}));

vi.mock('@/lib/utils/mappers', () => ({
    mapDailyHeadlineRow: (row: any) => ({
        id: row.id,
        date: row.date,
        rank: row.rank ?? 1,
        headline: row.headline,
        source: row.source || 'Bay Area News',
        url: row.url ?? null,
        publishedAt: row.published_at ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }),
}));

vi.mock('@/lib/headlines/bayArea', async (importOriginal) => {
    const original = await importOriginal<typeof import('@/lib/headlines/bayArea')>();
    return {
        ...original,
        saveDailyHeadlines: vi.fn(),
    };
});

import { saveDailyHeadlines } from '@/lib/headlines/bayArea';

describe('useHeadlinesStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useHeadlinesStore.setState({
            records: [],
            headlineByDate: {},
            isLoading: false,
            isLoaded: false,
        });
    });

    describe('ensureLoaded & loadFromSupabase', () => {
        it('loads records grouped by date in rank order', async () => {
            const mockRows = [
                { id: 'h-2', date: '2026-10-11', rank: 2, headline: 'ICE surge expected', source: 'KQED' },
                { id: 'h-1', date: '2026-10-11', rank: 1, headline: 'Sharks win in overtime', source: 'Bay Area News Group' },
            ];

            const mockOrder = vi.fn().mockResolvedValue({ data: mockRows, error: null });
            mockSelect.mockReturnValue({ order: mockOrder });

            await useHeadlinesStore.getState().ensureLoaded();

            const state = useHeadlinesStore.getState();
            expect(state.isLoaded).toBe(true);
            expect(state.records).toHaveLength(2);
            expect(state.headlineByDate['2026-10-11']?.map((h) => h.rank)).toEqual([1, 2]);
        });
    });

    describe('getHeadlinesForDate', () => {
        it('returns ranked headlines for a date, empty list when missing', () => {
            useHeadlinesStore.setState({
                headlineByDate: {
                    '2026-10-11': [
                        { id: 'h-1', date: '2026-10-11', rank: 1, headline: 'Sharks win', source: 'BANG', url: null, publishedAt: null },
                    ],
                },
            });

            const headlines = useHeadlinesStore.getState().getHeadlinesForDate('2026-10-11');
            expect(headlines).toHaveLength(1);
            expect(headlines[0].headline).toContain('Sharks');

            expect(useHeadlinesStore.getState().getHeadlinesForDate('2026-10-12')).toEqual([]);
        });
    });

    describe('saveHeadlines', () => {
        it('replaces the day list via the shared saver', async () => {
            const saved = [
                { id: 'h-1', date: '2026-10-12', rank: 1, headline: 'Corrected top story', source: 'KQED', url: null, publishedAt: null },
            ];
            vi.mocked(saveDailyHeadlines).mockResolvedValue(saved);

            const result = await useHeadlinesStore
                .getState()
                .saveHeadlines('2026-10-12', [{ headline: 'Corrected top story', source: 'KQED' }]);

            expect(saveDailyHeadlines).toHaveBeenCalledWith(
                '2026-10-12',
                [expect.objectContaining({ headline: 'Corrected top story' })],
                expect.anything()
            );
            expect(result).toEqual(saved);
            expect(useHeadlinesStore.getState().headlineByDate['2026-10-12']?.[0].headline).toBe(
                'Corrected top story'
            );
        });

        it('rejects blank input without touching the db', async () => {
            const result = await useHeadlinesStore
                .getState()
                .saveHeadlines('2026-10-12', [{ headline: '   ' }]);
            expect(result).toBeNull();
            expect(saveDailyHeadlines).not.toHaveBeenCalled();
        });
    });

    describe('subscribeToRealtime', () => {
        it('sets up channel and unsubscribes on cleanup', () => {
            const mockSubscribe = vi.fn().mockReturnThis();
            const mockOn = vi.fn().mockReturnValue({ subscribe: mockSubscribe });
            mockChannel.mockReturnValue({ on: mockOn });

            const unsubscribe = useHeadlinesStore.getState().subscribeToRealtime();
            expect(mockChannel).toHaveBeenCalledWith('daily_headlines_changes');
            expect(mockOn).toHaveBeenCalledWith(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'daily_headlines' },
                expect.any(Function)
            );

            unsubscribe();
            expect(mockRemoveChannel).toHaveBeenCalled();
        });

        it('merges INSERT events into the ranked day list', () => {
            let changeCallback: ((payload: any) => void) | undefined;
            const mockSubscribe = vi.fn().mockReturnThis();
            const mockOn = vi.fn().mockImplementation((_event, _filter, callback) => {
                changeCallback = callback;
                return { subscribe: mockSubscribe };
            });
            mockChannel.mockReturnValue({ on: mockOn });

            useHeadlinesStore.getState().subscribeToRealtime();
            expect(changeCallback).toBeDefined();

            changeCallback!({
                eventType: 'INSERT',
                new: {
                    id: 'h-realtime-1',
                    date: '2026-10-12',
                    rank: 2,
                    headline: 'SNAP benefit cuts explained',
                    source: 'SFGATE',
                    url: null,
                    published_at: null,
                },
            });

            const state = useHeadlinesStore.getState();
            expect(state.headlineByDate['2026-10-12']).toHaveLength(1);
            expect(state.headlineByDate['2026-10-12'][0].rank).toBe(2);
        });
    });
});
