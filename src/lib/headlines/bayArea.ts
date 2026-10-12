import { createClient } from '@/lib/supabase/client';
import { todayPacificDateString } from '@/lib/utils/date';
import { mapDailyHeadlineRow } from '@/lib/utils/mappers';
import type { DailyHeadline } from '@/types/database';

export const BAY_AREA_NEWS_SOURCE = 'Bay Area News';
export const HEADLINES_REVALIDATE_SECONDS = 3600;
/** Number of top stories captured per day. */
export const MAX_HEADLINES_PER_DAY = 5;

export function buildBayAreaNewsFeedUrl() {
    const url = new URL('https://news.google.com/rss/search');
    url.searchParams.set('q', 'San Francisco Bay Area news');
    url.searchParams.set('hl', 'en-US');
    url.searchParams.set('gl', 'US');
    url.searchParams.set('ceid', 'US:en');
    return url;
}

const HEADLINES_USER_AGENT =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

export interface BayAreaHeadlineItem {
    headline: string;
    source: string;
    url: string | null;
    publishedAt: string | null;
}

export interface BayAreaHeadlines {
    date: string;
    items: BayAreaHeadlineItem[];
}

function stripCdata(value: string): string {
    return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

function decodeXmlEntities(value: string): string {
    return value
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/gi, "'")
        .replace(/&amp;/g, '&');
}

function extractTag(block: string, tag: string): string | null {
    const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
    return match ? decodeXmlEntities(stripCdata(match[1].trim())) : null;
}

function parseHeadlineItem(item: string): BayAreaHeadlineItem | null {
    const rawTitle = extractTag(item, 'title');
    if (!rawTitle) return null;

    const sourceTag = extractTag(item, 'source');
    let headline = rawTitle;
    let source = sourceTag || BAY_AREA_NEWS_SOURCE;
    if (!sourceTag) {
        const separator = rawTitle.lastIndexOf(' - ');
        if (separator > 0) {
            headline = rawTitle.slice(0, separator).trim();
            source = rawTitle.slice(separator + 3).trim() || BAY_AREA_NEWS_SOURCE;
        }
    } else if (rawTitle.endsWith(` - ${sourceTag}`)) {
        headline = rawTitle.slice(0, rawTitle.length - sourceTag.length - 3).trim();
    }
    if (!headline) return null;

    const url = extractTag(item, 'link');
    const pubDate = extractTag(item, 'pubDate');
    let publishedAt: string | null = null;
    if (pubDate) {
        const parsed = new Date(pubDate);
        if (!Number.isNaN(parsed.getTime())) {
            publishedAt = parsed.toISOString();
        }
    }

    return { headline, source, url, publishedAt };
}

/**
 * Parse the top stories from a Google News RSS document, in feed order
 * (rank 1 first). Titles arrive as "Headline text - Outlet Name"; the
 * <source> tag is preferred for the outlet, falling back to the title suffix.
 */
export function parseTopHeadlinesFromRss(xml: string, limit = MAX_HEADLINES_PER_DAY): BayAreaHeadlineItem[] {
    const items: BayAreaHeadlineItem[] = [];
    const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
    for (const block of itemBlocks) {
        if (items.length >= limit) break;
        const parsed = parseHeadlineItem(block);
        if (parsed) items.push(parsed);
    }
    return items;
}

export async function fetchBayAreaTopHeadlines(
    timeoutMs = 6000,
    limit = MAX_HEADLINES_PER_DAY
): Promise<BayAreaHeadlines | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(buildBayAreaNewsFeedUrl(), {
            signal: controller.signal,
            headers: { 'User-Agent': HEADLINES_USER_AGENT },
            next: { revalidate: HEADLINES_REVALIDATE_SECONDS },
        });
        if (!response.ok) return null;

        const xml = await response.text();
        const items = parseTopHeadlinesFromRss(xml, limit);
        if (items.length === 0) return null;

        return { date: todayPacificDateString(), items };
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

export interface SaveDailyHeadlineItem {
    headline: string;
    source?: string;
    url?: string | null;
    publishedAt?: string | null;
}

/**
 * Save the day's ranked headlines. Items are ranked 1..n in array order;
 * stale ranks beyond the new list are removed so a short feed never leaves
 * yesterday's lower stories behind.
 */
export async function saveDailyHeadlines(
    date: string,
    items: SaveDailyHeadlineItem[],
    supabaseClient = createClient()
): Promise<DailyHeadline[] | null> {
    try {
        const ranked = items
            .map((item) => ({
                headline: item.headline.trim(),
                source: item.source?.trim() || BAY_AREA_NEWS_SOURCE,
                url: item.url ?? null,
                published_at: item.publishedAt ?? null,
            }))
            .filter((item) => item.headline.length > 0)
            .slice(0, MAX_HEADLINES_PER_DAY);

        if (ranked.length === 0) return null;

        const payload = ranked.map((item, index) => ({ date, rank: index + 1, ...item }));

        const { data, error } = await supabaseClient
            .from('daily_headlines')
            .upsert(payload, { onConflict: 'date,rank' })
            .select();

        if (error || !data) {
            console.error('Failed to save daily headlines:', error);
            return null;
        }

        // Prune stale lower ranks (e.g. feed returned 3 stories but 5 stored).
        const prune = await supabaseClient
            .from('daily_headlines')
            .delete()
            .eq('date', date)
            .gt('rank', ranked.length);
        if (prune.error) {
            console.error('Failed to prune stale daily headlines:', prune.error);
        }

        return (data as unknown[]).map((row: any) => mapDailyHeadlineRow(row)).sort((a, b) => a.rank - b.rank);
    } catch (err) {
        console.error('Error saving daily headlines:', err);
        return null;
    }
}

export async function fetchAndSaveTodayBayAreaHeadlines(
    supabaseClient = createClient()
): Promise<DailyHeadline[] | null> {
    const headlines = await fetchBayAreaTopHeadlines();
    if (!headlines) return null;

    return saveDailyHeadlines(headlines.date, headlines.items, supabaseClient);
}
