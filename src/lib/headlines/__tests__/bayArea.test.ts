import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    fetchAndSaveTodayBayAreaHeadlines,
    fetchBayAreaTopHeadlines,
    parseTopHeadlinesFromRss,
    saveDailyHeadlines,
} from '../bayArea';

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Bay Area news - Google News</title>
<item>
<title>Sharks win in overtime to take the series - Bay Area News Group</title>
<link>https://news.google.com/rss/articles/CBMiAA</link>
<pubDate>Sun, 11 Oct 2026 04:17:51 GMT</pubDate>
<source url="https://example.com">Bay Area News Group</source>
</item>
<item>
<title>ICE surge expected in Bay Area after Central Valley arrests - KQED</title>
<link>https://news.google.com/rss/articles/CBMiBB</link>
<pubDate>Sun, 11 Oct 2026 05:00:00 GMT</pubDate>
<source url="https://kqed.org">KQED</source>
</item>
<item>
<title>SNAP benefit cuts: what Bay Area families should know - SFGATE</title>
<link>https://news.google.com/rss/articles/CBMiCC</link>
<pubDate>Sun, 11 Oct 2026 06:00:00 GMT</pubDate>
<source url="https://sfgate.com">SFGATE</source>
</item>
</channel></rss>`;

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

describe('parseTopHeadlinesFromRss', () => {
    it('parses items in feed order with outlets from source tags', () => {
        const parsed = parseTopHeadlinesFromRss(SAMPLE_RSS);
        expect(parsed).toHaveLength(3);
        expect(parsed[0]).toEqual({
            headline: 'Sharks win in overtime to take the series',
            source: 'Bay Area News Group',
            url: 'https://news.google.com/rss/articles/CBMiAA',
            publishedAt: new Date('Sun, 11 Oct 2026 04:17:51 GMT').toISOString(),
        });
        // The policy stories survive below the sports result.
        expect(parsed[1].headline).toContain('ICE surge');
        expect(parsed[1].source).toBe('KQED');
        expect(parsed[2].headline).toContain('SNAP');
    });

    it('respects the limit', () => {
        expect(parseTopHeadlinesFromRss(SAMPLE_RSS, 2)).toHaveLength(2);
    });

    it('falls back to the title suffix when no source tag exists', () => {
        const xml = `<rss><channel><item><title>Missing woman&#39;s phone pings near park - SFGATE</title><link>https://example.com/x</link></item></channel></rss>`;
        const parsed = parseTopHeadlinesFromRss(xml);
        expect(parsed[0]?.headline).toBe("Missing woman's phone pings near park");
        expect(parsed[0]?.source).toBe('SFGATE');
    });

    it('decodes CDATA and entities', () => {
        const xml = `<rss><channel><item><title><![CDATA[Bay Area &amp; beyond: Q&amp;A - KQED]]></title></item></channel></rss>`;
        const parsed = parseTopHeadlinesFromRss(xml);
        expect(parsed[0]?.headline).toBe('Bay Area & beyond: Q&A');
        expect(parsed[0]?.source).toBe('KQED');
    });

    it('returns an empty list when there are no parseable items', () => {
        expect(parseTopHeadlinesFromRss('<rss><channel></channel></rss>')).toEqual([]);
        expect(
            parseTopHeadlinesFromRss('<rss><channel><item><link>x</link></item></channel></rss>')
        ).toEqual([]);
    });
});

describe('fetchBayAreaTopHeadlines', () => {
    it('returns the top headlines with today as the date', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({ ok: true, text: async () => SAMPLE_RSS }))
        );
        const headlines = await fetchBayAreaTopHeadlines();
        expect(headlines?.items).toHaveLength(3);
        expect(headlines?.items[0].headline).toContain('Sharks');
        expect(headlines?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns null on non-ok responses and network errors', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
        expect(await fetchBayAreaTopHeadlines()).toBeNull();

        vi.stubGlobal(
            'fetch',
            vi.fn(async () => {
                throw new Error('network down');
            })
        );
        expect(await fetchBayAreaTopHeadlines()).toBeNull();
    });
});

function stubSupabaseClient(upsertResult: { data: unknown; error: unknown }) {
    const gt = vi.fn(async () => ({ error: null }));
    const eq = vi.fn(() => ({ gt }));
    const del = vi.fn(() => ({ eq }));
    const select = vi.fn(async () => upsertResult);
    const upsert = vi.fn(() => ({ select }));
    return {
        client: { from: vi.fn(() => ({ upsert, delete: del })) } as any,
        upsert,
        del,
        eq,
        gt,
    };
}

describe('saveDailyHeadlines', () => {
    it('upserts ranked rows on date,rank conflict and prunes stale ranks', async () => {
        const rows = [1, 2, 3].map((rank) => ({
            id: `h-${rank}`,
            date: '2026-10-12',
            rank,
            headline: `Story ${rank}`,
            source: 'KQED',
            url: null,
            published_at: null,
        }));
        const { client, upsert, eq, gt } = stubSupabaseClient({ data: rows, error: null });
        const saved = await saveDailyHeadlines(
            '2026-10-12',
            rows.map((r) => ({ headline: r.headline, source: r.source })),
            client
        );
        expect(upsert).toHaveBeenCalledWith(
            [
                expect.objectContaining({ date: '2026-10-12', rank: 1 }),
                expect.objectContaining({ date: '2026-10-12', rank: 2 }),
                expect.objectContaining({ date: '2026-10-12', rank: 3 }),
            ],
            { onConflict: 'date,rank' }
        );
        expect(eq).toHaveBeenCalledWith('date', '2026-10-12');
        expect(gt).toHaveBeenCalledWith('rank', 3);
        expect(saved?.map((s) => s.rank)).toEqual([1, 2, 3]);
    });

    it('skips blank headlines and caps at five', async () => {
        const { client, upsert } = stubSupabaseClient({ data: [], error: null });
        const items = [
            { headline: '   ' },
            ...[1, 2, 3, 4, 5, 6].map((n) => ({ headline: `Story ${n}` })),
        ];
        await saveDailyHeadlines('2026-10-12', items, client);
        const payload = upsert.mock.calls[0][0];
        expect(payload).toHaveLength(5);
        expect(payload[0]).toMatchObject({ rank: 1, headline: 'Story 1' });
    });

    it('returns null for empty input and db errors', async () => {
        const { client, upsert } = stubSupabaseClient({ data: null, error: { message: 'db down' } });
        expect(await saveDailyHeadlines('2026-10-12', [{ headline: '   ' }], client)).toBeNull();
        expect(upsert).not.toHaveBeenCalled();
        expect(await saveDailyHeadlines('2026-10-12', [{ headline: 'Some news' }], client)).toBeNull();
    });
});

describe('fetchAndSaveTodayBayAreaHeadlines', () => {
    it('returns null when the feed is unavailable', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
        const { client } = stubSupabaseClient({ data: null, error: null });
        expect(await fetchAndSaveTodayBayAreaHeadlines(client)).toBeNull();
    });
});
