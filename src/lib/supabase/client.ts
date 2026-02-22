import { createBrowserClient } from '@supabase/ssr';

type PerfWindow = Window & {
    __hcSupabaseFetchCount?: number;
    __hcSupabaseFetchWindowStart?: number;
    __hcSupabaseFetchesPerMinute?: number;
};

const instrumentedFetch: typeof fetch = async (input, init) => {
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
        const perfWindow = window as PerfWindow;
        const now = Date.now();
        const windowStart = perfWindow.__hcSupabaseFetchWindowStart ?? now;
        const nextCount = (perfWindow.__hcSupabaseFetchCount ?? 0) + 1;
        perfWindow.__hcSupabaseFetchCount = nextCount;
        perfWindow.__hcSupabaseFetchWindowStart = windowStart;
        const elapsedMs = Math.max(now - windowStart, 1);
        perfWindow.__hcSupabaseFetchesPerMinute = Math.round((nextCount * 60000) / elapsedMs);
    }
    return fetch(input, init);
};

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
        { global: { fetch: instrumentedFetch } }
    );
}
