import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createClient } from '@/lib/supabase/client';
import { mapDailyHeadlineRow } from '@/lib/utils/mappers';
import { MAX_HEADLINES_PER_DAY, saveDailyHeadlines } from '@/lib/headlines/bayArea';
import type { DailyHeadline } from '@/types/database';

export interface HeadlineDraft {
    headline: string;
    source?: string;
    url?: string | null;
}

export interface HeadlinesState {
    records: DailyHeadline[];
    headlineByDate: Record<string, DailyHeadline[]>;
    isLoading: boolean;
    isLoaded: boolean;
    ensureLoaded: (options?: { startDate?: string; endDate?: string; force?: boolean }) => Promise<void>;
    loadFromSupabase: (startDate?: string, endDate?: string) => Promise<void>;
    getHeadlinesForDate: (date: string) => DailyHeadline[];
    /** Manual correction: replace the day's ranked headlines (blank rows pruned). */
    saveHeadlines: (date: string, items: HeadlineDraft[]) => Promise<DailyHeadline[] | null>;
    subscribeToRealtime: () => () => void;
}

function byRank(a: DailyHeadline, b: DailyHeadline) {
    return a.rank - b.rank;
}

export const useHeadlinesStore = create<HeadlinesState>()(
    devtools(
        persist(
            immer((set, get) => ({
                records: [],
                headlineByDate: {},
                isLoading: false,
                isLoaded: false,

                ensureLoaded: async (options = {}) => {
                    const { startDate, endDate, force = false } = options;
                    if (!force && get().isLoaded && !startDate && !endDate) return;
                    if (get().isLoading) return;

                    const supabase = createClient();
                    set((state) => {
                        state.isLoading = true;
                    });

                    try {
                        let query: any = supabase.from('daily_headlines').select('*');

                        if (typeof query.order === 'function') {
                            query = query.order('date', { ascending: false });
                        }
                        if (startDate && typeof query.gte === 'function') {
                            query = query.gte('date', startDate);
                        }
                        if (endDate && typeof query.lte === 'function') {
                            query = query.lte('date', endDate);
                        }

                        const { data, error } = await query;
                        if (error) {
                            console.error('Failed to load daily headlines from Supabase:', error);
                            return;
                        }

                        const mapped = ((data || []) as unknown[])
                            .map((row: any) => mapDailyHeadlineRow(row))
                            .sort(byRank);
                        set((state) => {
                            state.records = mapped;
                            const map: Record<string, DailyHeadline[]> = { ...state.headlineByDate };
                            for (const item of mapped) {
                                map[item.date] = [...(map[item.date] || []), item].sort(byRank);
                            }
                            state.headlineByDate = map;
                            state.isLoaded = true;
                        });
                    } catch (error) {
                        console.error('Error loading daily headlines:', error);
                    } finally {
                        set((state) => {
                            state.isLoading = false;
                        });
                    }
                },

                loadFromSupabase: async (startDate?: string, endDate?: string) => {
                    await get().ensureLoaded({ startDate, endDate, force: true });
                },

                getHeadlinesForDate: (date: string) => {
                    return get().headlineByDate[date] || [];
                },

                saveHeadlines: async (date, items) => {
                    const cleaned = items
                        .map((item) => ({
                            headline: item.headline.trim(),
                            source: item.source?.trim() || undefined,
                            url: item.url?.trim() || null,
                        }))
                        .filter((item) => item.headline.length > 0)
                        .slice(0, MAX_HEADLINES_PER_DAY);
                    if (cleaned.length === 0) return null;

                    try {
                        const saved = await saveDailyHeadlines(date, cleaned, createClient());
                        if (!saved) return null;
                        set((state) => {
                            state.headlineByDate[date] = [...saved].sort(byRank);
                            const otherDates = state.records.filter((r) => r.date !== date);
                            state.records = [...otherDates, ...saved];
                        });
                        return saved;
                    } catch (error) {
                        console.error('Error saving daily headlines:', error);
                        return null;
                    }
                },

                subscribeToRealtime: () => {
                    const supabase = createClient();

                    const subscription = supabase
                        .channel('daily_headlines_changes')
                        .on(
                            'postgres_changes',
                            { event: '*', schema: 'public', table: 'daily_headlines' },
                            (payload: any) => {
                                const { eventType, new: newRecord, old: oldRecord } = payload;

                                if (eventType === 'INSERT' || eventType === 'UPDATE') {
                                    const mapped = mapDailyHeadlineRow(newRecord);
                                    set((state) => {
                                        const day = (state.headlineByDate[mapped.date] || []).filter(
                                            (r) => r.id !== mapped.id && r.rank !== mapped.rank
                                        );
                                        state.headlineByDate[mapped.date] = [...day, mapped].sort(byRank);
                                        state.records = state.records.filter((r) => r.id !== mapped.id);
                                        state.records.unshift(mapped);
                                    });
                                } else if (eventType === 'DELETE') {
                                    const deletedId = (oldRecord as any)?.id;
                                    if (deletedId) {
                                        set((state) => {
                                            const removed = state.records.find((r) => r.id === deletedId);
                                            if (removed) {
                                                state.headlineByDate[removed.date] = (
                                                    state.headlineByDate[removed.date] || []
                                                ).filter((r) => r.id !== deletedId);
                                            }
                                            state.records = state.records.filter((r) => r.id !== deletedId);
                                        });
                                    }
                                }
                            }
                        )
                        .subscribe();

                    return () => {
                        supabase.removeChannel(subscription);
                    };
                },
            })),
            {
                name: 'hopes-corner-daily-headlines',
                partialize: (state) => ({
                    records: state.records,
                    headlineByDate: state.headlineByDate,
                }),
            }
        ),
        { name: 'HeadlinesStore' }
    )
);
