import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createClient } from '@/lib/supabase/client';
import { mapDailyWeatherRow } from '@/lib/utils/mappers';
import type { DailyWeather } from '@/types/database';

export interface WeatherState {
    records: DailyWeather[];
    weatherByDate: Record<string, DailyWeather>;
    isLoading: boolean;
    isLoaded: boolean;
    ensureLoaded: (options?: { startDate?: string; endDate?: string; force?: boolean }) => Promise<void>;
    loadFromSupabase: (startDate?: string, endDate?: string) => Promise<void>;
    getWeatherForDate: (date: string) => DailyWeather | null;
    subscribeToRealtime: () => () => void;
}

export const useWeatherStore = create<WeatherState>()(
    devtools(
        persist(
            immer((set, get) => ({
                records: [],
                weatherByDate: {},
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
                        let query: any = supabase.from('daily_weather').select('*');

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
                            console.error('Failed to load daily weather from Supabase:', error);
                            return;
                        }

                        const mapped = (data || []).map(mapDailyWeatherRow);
                        set((state) => {
                            state.records = mapped;
                            const map: Record<string, DailyWeather> = { ...state.weatherByDate };
                            for (const item of mapped) {
                                map[item.date] = item;
                            }
                            state.weatherByDate = map;
                            state.isLoaded = true;
                        });
                    } catch (error) {
                        console.error('Error loading daily weather:', error);
                    } finally {
                        set((state) => {
                            state.isLoading = false;
                        });
                    }
                },

                loadFromSupabase: async (startDate?: string, endDate?: string) => {
                    await get().ensureLoaded({ startDate, endDate, force: true });
                },

                getWeatherForDate: (date: string) => {
                    return get().weatherByDate[date] || null;
                },

                subscribeToRealtime: () => {
                    const supabase = createClient();

                    const subscription = supabase
                        .channel('daily_weather_changes')
                        .on(
                            'postgres_changes',
                            { event: '*', schema: 'public', table: 'daily_weather' },
                            (payload: any) => {
                                const { eventType, new: newRecord, old: oldRecord } = payload;

                                if (eventType === 'INSERT' || eventType === 'UPDATE') {
                                    const mapped = mapDailyWeatherRow(newRecord);
                                    set((state) => {
                                        state.weatherByDate[mapped.date] = mapped;
                                        state.records = state.records.filter((r) => r.id !== mapped.id);
                                        state.records.unshift(mapped);
                                    });
                                } else if (eventType === 'DELETE') {
                                    const deletedId = (oldRecord as any)?.id;
                                    if (deletedId) {
                                        set((state) => {
                                            const removed = state.records.find((r) => r.id === deletedId);
                                            if (removed) {
                                                delete state.weatherByDate[removed.date];
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
                name: 'hopes-corner-daily-weather',
                partialize: (state) => ({
                    records: state.records,
                    weatherByDate: state.weatherByDate,
                }),
            }
        ),
        { name: 'WeatherStore' }
    )
);
