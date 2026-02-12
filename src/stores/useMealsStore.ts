import { create } from 'zustand';
import { persist, devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createClient } from '@/lib/supabase/client';
import { fetchAllPaginated } from '@/lib/utils/supabasePagination';
import {
    getCachedMealRecords,
    getCachedHolidayRecords,
    getCachedHaircutRecords,
} from '@/lib/supabase/cachedQueries';
import {
    mapMealRow,
    mapHolidayRow,
    mapHaircutRow,
} from '@/lib/utils/mappers';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';

export interface MealRecord {
    id: string;
    guestId: string;
    pickedUpByGuestId?: string | null;
    pickedUpByProxyId?: string | null;
    count: number;
    date: string;
    dateKey?: string;
    recordedAt?: string | null;
    servedOn?: string | null;
    createdAt?: string | null;
    type?: string | null;
    deduplicationKey?: string | null;
}

interface HolidayRecord {
    id: string;
    guestId: string;
    date: string;
    dateKey?: string;
    type: 'holiday';
}

interface HaircutRecord {
    id: string;
    guestId: string;
    date: string;
    dateKey?: string;
    type: 'haircut';
}

interface MealsState {
    mealRecords: MealRecord[]; // guest meals (default)
    rvMealRecords: MealRecord[];
    extraMealRecords: MealRecord[];
    dayWorkerMealRecords: MealRecord[];
    shelterMealRecords: MealRecord[];
    unitedEffortMealRecords: MealRecord[];
    lunchBagRecords: MealRecord[];
    holidayRecords: HolidayRecord[];
    haircutRecords: HaircutRecord[];

    addMealRecord: (guestId: string, quantity?: number, pickedUpByGuestId?: string | null, serviceDate?: string) => Promise<MealRecord>;
    deleteMealRecord: (recordId: string) => Promise<void>;
    addRvMealRecord: (guestId: string, quantity?: number) => Promise<Partial<MealRecord>>;
    deleteRvMealRecord: (recordId: string) => Promise<void>;
    addExtraMealRecord: (guestId: string, quantity?: number) => Promise<Partial<MealRecord>>;
    deleteExtraMealRecord: (recordId: string) => Promise<void>;
    addBulkMealRecord: (mealType: string, quantity: number, label?: string, deduplicationKey?: string, date?: string) => Promise<Partial<MealRecord>>;
    deleteBulkMealRecord: (recordId: string, mealType: string) => Promise<void>;
    addHolidayRecord: (guestId: string) => Promise<HolidayRecord | Partial<HolidayRecord>>;
    deleteHolidayRecord: (recordId: string) => Promise<void>;
    addHaircutRecord: (guestId: string) => Promise<HaircutRecord | Partial<HaircutRecord>>;
    deleteHaircutRecord: (recordId: string) => Promise<void>;

    // Updates
    updateMealRecord: (recordId: string, updates: Partial<MealRecord>) => Promise<void>;
    updateBulkMealRecord: (recordId: string, mealType: string, updates: Partial<MealRecord>) => Promise<void>;

    // Automation
    checkAndAddAutomaticMeals: () => Promise<void>;

    loadFromSupabase: () => Promise<void>;
    clearMealRecords: () => void;
    // Getters for specific days are useful helpers
    getDetailsForDate: (dateStr: string) => {
        meals: MealRecord[];
        rv: MealRecord[];
        extras: MealRecord[];
        dayWorker: MealRecord[];
        shelter: MealRecord[];
        unitedEffort: MealRecord[];
        lunchBags: MealRecord[];
    };
}

export const useMealsStore = create<MealsState>()(
    devtools(
        subscribeWithSelector(
            persist(
                immer((set, get) => ({
                    // State
                    mealRecords: [],
                    rvMealRecords: [],
                    extraMealRecords: [],
                    dayWorkerMealRecords: [],
                    shelterMealRecords: [],
                    unitedEffortMealRecords: [],
                    lunchBagRecords: [],
                    holidayRecords: [],
                    haircutRecords: [],

                    // Meal Actions
                    addMealRecord: async (guestId: string, quantity = 1, pickedUpByGuestId: string | null = null, serviceDate?: string) => {
                        if (!guestId) throw new Error('Guest ID is required');

                        const targetDate = serviceDate || todayPacificDateString();
                        const supabase = createClient();

                        const payload: any = {
                            guest_id: guestId,
                            quantity,
                            served_on: targetDate,
                            recorded_at: new Date().toISOString(),
                            picked_up_by_guest_id: pickedUpByGuestId || null,
                        };

                        const { data, error } = await supabase
                            .from('meal_attendance')
                            .insert(payload)
                            .select()
                            .single();

                        if (error) {
                            console.error('Failed to add meal record to Supabase:', error);
                            throw new Error('Unable to save meal record');
                        }

                        const mapped = mapMealRow(data);
                        set((state) => {
                            state.mealRecords.push(mapped);
                        });

                        // Auto-add lunch bag
                        try {
                            await get().addBulkMealRecord('lunch_bag', 1, 'Auto-added with meal', undefined, targetDate);
                            // If proxy pickup, add another? Logic from old app:
                            // "If proxy pickup (different guest picked up), add additional lunch bag for the proxy guest"
                            if (pickedUpByGuestId && pickedUpByGuestId !== guestId) {
                                await get().addBulkMealRecord('lunch_bag', 1, 'Auto-added for proxy pickup', undefined, targetDate);
                            }
                        } catch (err) {
                            console.error('Failed to auto-add lunch bag', err);
                        }

                        return mapped;
                    },

                    deleteMealRecord: async (recordId: string) => {
                        const { mealRecords } = get();
                        const target = mealRecords.find((r) => r.id === recordId);

                        set((state) => {
                            state.mealRecords = state.mealRecords.filter(
                                (r) => r.id !== recordId
                            );
                        });

                        const supabase = createClient();
                        if (target) {
                            const { error } = await supabase
                                .from('meal_attendance')
                                .delete()
                                .eq('id', recordId);

                            if (error) {
                                console.error('Failed to delete meal record from Supabase:', error);
                            }
                        }
                    },

                    // RV Meal Actions
                    addRvMealRecord: async (guestId: string, quantity = 1) => {
                        // For RV meals, we might use a dummy/system guestId if it's not a registered guest,
                        // but usually it's tied to an internal ID or just a count. 
                        // If we are just tracking "100 meals delivered", we might not need a specific guestId if the DB allows nullable.
                        // However, the schema implies guest_id is a foreign key. 
                        // If the backend requires a guestId, we assume one is provided.

                        const supabase = createClient();
                        const todayStr = todayPacificDateString();

                        const payload = {
                            guest_id: guestId,
                            quantity,
                            served_on: todayStr,
                            meal_type: 'rv',
                            recorded_at: new Date().toISOString(),
                        };

                        const { data, error } = await supabase
                            .from('meal_attendance')
                            .insert(payload)
                            .select()
                            .single();

                        if (error) {
                            console.error('Failed to add RV meal record:', error);
                            // Fallback for optimistic UI or error handling
                            throw new Error('Unable to save RV meal record');
                        }

                        const mapped = mapMealRow(data);
                        set((state) => {
                            state.rvMealRecords.push(mapped);
                        });
                        return mapped;
                    },

                    deleteRvMealRecord: async (recordId: string) => {
                        const { rvMealRecords } = get();
                        // Optimistic update
                        set((state) => {
                            state.rvMealRecords = state.rvMealRecords.filter(r => r.id !== recordId);
                        });

                        const supabase = createClient();
                        const { error } = await supabase.from('meal_attendance').delete().eq('id', recordId);
                        if (error) {
                            console.error('Failed to delete RV meal record:', error);
                            // Revert if needed, but for now we trust optimistic
                        }
                    },

                    // Extra Meal Actions
                    addExtraMealRecord: async (guestId: string, quantity = 1) => {
                        const supabase = createClient();
                        const todayStr = todayPacificDateString();

                        const payload = {
                            guest_id: guestId,
                            quantity,
                            served_on: todayStr,
                            meal_type: 'extra',
                            recorded_at: new Date().toISOString(),
                        };

                        const { data, error } = await supabase
                            .from('meal_attendance')
                            .insert(payload)
                            .select()
                            .single();

                        if (error) {
                            console.error('Failed to add Extra meal record:', error);
                            throw new Error('Unable to save Extra meal record');
                        }

                        const mapped = mapMealRow(data);
                        set((state) => {
                            state.extraMealRecords.push(mapped);
                        });
                        return mapped;
                    },

                    deleteExtraMealRecord: async (recordId: string) => {
                        set((state) => {
                            state.extraMealRecords = state.extraMealRecords.filter(r => r.id !== recordId);
                        });
                        const supabase = createClient();
                        const { error } = await supabase.from('meal_attendance').delete().eq('id', recordId);
                        if (error) {
                            console.error('Failed to delete Extra meal record:', error);
                        }
                    },

                    // Bulk Meal Actions (Day Worker, Shelter, Lunch Bags, United Effort)
                    addBulkMealRecord: async (mealType: string, quantity: number, label?: string, deduplicationKey?: string, date?: string) => {
                        const supabase = createClient();
                        const targetDate = date || todayPacificDateString();

                        // For bulk entries, we use a system/placeholder guest_id or null if schema allows
                        // Using a special 'system' entry approach with null guest_id
                        const payload = {
                            guest_id: null, // Bulk entries don't have a specific guest
                            quantity,
                            served_on: targetDate,
                            meal_type: mealType,
                            recorded_at: new Date().toISOString(),
                            notes: label || null,
                            deduplication_key: deduplicationKey || null,
                        };

                        const { data, error } = await supabase
                            .from('meal_attendance')
                            .insert(payload)
                            .select()
                            .single();

                        if (error) {
                            // If unique violation (duplicate key), just ignore/return null (idempotent)
                            if (error.code === '23505') {
                                console.log(`Skipping duplicate ${mealType} meal (deduplication key collision)`);
                                return {};
                            }
                            console.error(`Failed to add ${mealType} meal record:`, error);
                            throw new Error(`Unable to save ${mealType} meal record`);
                        }

                        const mapped = mapMealRow(data);
                        set((state) => {
                            // Push to appropriate array based on type
                            switch (mealType) {
                                case 'rv':
                                    state.rvMealRecords.push(mapped);
                                    break;
                                case 'day_worker':
                                    state.dayWorkerMealRecords.push(mapped);
                                    break;
                                case 'shelter':
                                    state.shelterMealRecords.push(mapped);
                                    break;
                                case 'lunch_bag':
                                    state.lunchBagRecords.push(mapped);
                                    break;
                                case 'united_effort':
                                    state.unitedEffortMealRecords.push(mapped);
                                    break;
                                default:
                                    state.extraMealRecords.push(mapped);
                            }
                        });
                        return mapped;
                    },

                    deleteBulkMealRecord: async (recordId: string, mealType: string) => {
                        set((state) => {
                            switch (mealType) {
                                case 'rv':
                                    state.rvMealRecords = state.rvMealRecords.filter(r => r.id !== recordId);
                                    break;
                                case 'day_worker':
                                    state.dayWorkerMealRecords = state.dayWorkerMealRecords.filter(r => r.id !== recordId);
                                    break;
                                case 'shelter':
                                    state.shelterMealRecords = state.shelterMealRecords.filter(r => r.id !== recordId);
                                    break;
                                case 'lunch_bag':
                                    state.lunchBagRecords = state.lunchBagRecords.filter(r => r.id !== recordId);
                                    break;
                                case 'united_effort':
                                    state.unitedEffortMealRecords = state.unitedEffortMealRecords.filter(r => r.id !== recordId);
                                    break;
                            }
                        });
                        const supabase = createClient();
                        const { error } = await supabase.from('meal_attendance').delete().eq('id', recordId);
                        if (error) {
                            console.error(`Failed to delete ${mealType} meal record:`, error);
                        }
                    },

                    // Holiday Records
                    addHolidayRecord: async (guestId: string) => {
                        if (!guestId) throw new Error('Guest ID is required');
                        const todayStr = todayPacificDateString();
                        const supabase = createClient();

                        const payload = {
                            guest_id: guestId,
                            served_at: new Date().toISOString(),
                        };

                        const { data, error } = await supabase
                            .from('holiday_visits')
                            .insert(payload)
                            .select()
                            .single();

                        if (error) {
                            console.error('Failed to add holiday record to Supabase:', error);
                            throw new Error('Unable to save holiday record');
                        }

                        const mapped = mapHolidayRow(data);
                        set((state) => {
                            state.holidayRecords.push(mapped as any);
                        });
                        return mapped as HolidayRecord;
                    },

                    deleteHolidayRecord: async (recordId: string) => {
                        const { holidayRecords } = get();
                        const target = holidayRecords.find((r) => r.id === recordId);

                        set((state) => {
                            state.holidayRecords = state.holidayRecords.filter(
                                (r) => r.id !== recordId
                            );
                        });

                        const supabase = createClient();
                        if (target) {
                            const { error } = await supabase
                                .from('holiday_visits')
                                .delete()
                                .eq('id', recordId);

                            if (error) {
                                console.error('Failed to delete holiday record from Supabase:', error);
                            }
                        }
                    },

                    // Haircut Records
                    addHaircutRecord: async (guestId: string) => {
                        if (!guestId) throw new Error('Guest ID is required');
                        const todayStr = todayPacificDateString();
                        const supabase = createClient();

                        const payload = {
                            guest_id: guestId,
                            served_at: new Date().toISOString(),
                        };

                        const { data, error } = await supabase
                            .from('haircut_visits')
                            .insert(payload)
                            .select()
                            .single();

                        if (error) {
                            console.error('Failed to add haircut record to Supabase:', error);
                            throw new Error('Unable to save haircut record');
                        }

                        const mapped = mapHaircutRow(data);
                        set((state) => {
                            state.haircutRecords.push(mapped as any);
                        });
                        return mapped as HaircutRecord;
                    },

                    deleteHaircutRecord: async (recordId: string) => {
                        const { haircutRecords } = get();
                        const target = haircutRecords.find((r) => r.id === recordId);

                        set((state) => {
                            state.haircutRecords = state.haircutRecords.filter(
                                (r) => r.id !== recordId
                            );
                        });

                        const supabase = createClient();
                        if (target) {
                            const { error } = await supabase
                                .from('haircut_visits')
                                .delete()
                                .eq('id', recordId);

                            if (error) {
                                console.error('Failed to delete haircut record from Supabase:', error);
                            }
                        }
                    },

                    // Updates
                    updateMealRecord: async (recordId: string, updates: Partial<MealRecord>) => {
                        set((state) => {
                            const idx = state.mealRecords.findIndex(r => r.id === recordId);
                            if (idx !== -1) {
                                state.mealRecords[idx] = { ...state.mealRecords[idx], ...updates };
                            }
                        });
                        const supabase = createClient();
                        const { error } = await supabase.from('meal_attendance').update({
                            quantity: updates.count,
                            notes: (updates as any).notes // cast to any if notes not in MealRecord interface
                        }).eq('id', recordId);
                        if (error) {
                            console.error('Failed to update meal record:', error);
                        }
                    },

                    updateBulkMealRecord: async (recordId: string, mealType: string, updates: Partial<MealRecord>) => {
                        set((state) => {
                            let list: MealRecord[] | undefined;
                            switch (mealType) {
                                case 'rv': list = state.rvMealRecords; break;
                                case 'day_worker': list = state.dayWorkerMealRecords; break;
                                case 'shelter': list = state.shelterMealRecords; break;
                                case 'lunch_bag': list = state.lunchBagRecords; break;
                                case 'united_effort': list = state.unitedEffortMealRecords; break;
                                default: list = state.extraMealRecords;
                            }

                            if (list) {
                                const idx = list.findIndex(r => r.id === recordId);
                                if (idx !== -1) {
                                    list[idx] = { ...list[idx], ...updates };
                                }
                            }
                        });

                        const supabase = createClient();
                        const { error } = await supabase.from('meal_attendance').update({
                            quantity: updates.count
                        }).eq('id', recordId);
                        if (error) {
                            console.error(`Failed to update ${mealType} meal record:`, error);
                        }
                    },

                    // Automation
                    checkAndAddAutomaticMeals: async () => {
                        const today = new Date();
                        const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
                        const todayStr = todayPacificDateString();
                        const { rvMealRecords, dayWorkerMealRecords, lunchBagRecords, addBulkMealRecord } = get();

                        const todaysRv = rvMealRecords.filter(r => pacificDateStringFrom(r.date) === todayStr);
                        const todaysDayWorker = dayWorkerMealRecords.filter(r => pacificDateStringFrom(r.date) === todayStr);
                        const todaysLunchBags = lunchBagRecords.filter(r => pacificDateStringFrom(r.date) === todayStr);

                        // Schedule Logic (from older app's automaticMealEntries.js)
                        // Sun (0): 150 RV
                        // Mon (1): 100 RV
                        // Wed (3): 40 RV
                        // Thu (4): 100 RV
                        // Sat (6): 100 Lunch Bags, 100 RV, 50 Day Worker

                        if (dayOfWeek === 0) { // Sun
                            if (todaysRv.length === 0) await addBulkMealRecord('rv', 150, 'Automatic Entry (Sun)', `rv_${todayStr}`);
                        } else if (dayOfWeek === 1) { // Mon
                            if (todaysRv.length === 0) await addBulkMealRecord('rv', 100, 'Automatic Entry (Mon)', `rv_${todayStr}`);
                        } else if (dayOfWeek === 3) { // Wed
                            if (todaysRv.length === 0) await addBulkMealRecord('rv', 40, 'Automatic Entry (Wed)', `rv_${todayStr}`);
                        } else if (dayOfWeek === 4) { // Thu
                            if (todaysRv.length === 0) await addBulkMealRecord('rv', 100, 'Automatic Entry (Thu)', `rv_${todayStr}`);
                        } else if (dayOfWeek === 6) { // Sat
                            if (todaysLunchBags.length === 0) await addBulkMealRecord('lunch_bag', 100, 'Automatic Entry (Sat)', `lunch_bag_${todayStr}`);
                            if (todaysRv.length === 0) await addBulkMealRecord('rv', 100, 'Automatic Entry (Sat)', `rv_${todayStr}`);
                            if (todaysDayWorker.length === 0) await addBulkMealRecord('day_worker', 50, 'Automatic Entry (Sat)', `day_worker_${todayStr}`);
                        }
                    },

                    // Load from Supabase
                    loadFromSupabase: async () => {
                        try {
                            // Use cached queries to prevent duplicate fetches in parallel loads
                            const [mealRows, holidayRows, haircutRows] = await Promise.all([
                                getCachedMealRecords(),
                                getCachedHolidayRecords(),
                                getCachedHaircutRecords(),
                            ]);

                            set((state) => {
                                // Distribute ALL meal rows into buckets
                                const allMeals = (mealRows || []).map(r => r as MealRecord);

                                state.mealRecords = allMeals.filter(r => r.type === 'guest' || !r.type);
                                state.rvMealRecords = allMeals.filter(r => r.type === 'rv');
                                state.extraMealRecords = allMeals.filter(r => r.type === 'extra');
                                state.dayWorkerMealRecords = allMeals.filter(r => r.type === 'day_worker');
                                state.shelterMealRecords = allMeals.filter(r => r.type === 'shelter');
                                state.unitedEffortMealRecords = allMeals.filter(r => r.type === 'united_effort');
                                state.lunchBagRecords = allMeals.filter(r => r.type === 'lunch_bag');

                                state.holidayRecords = (holidayRows || []) as any;
                                state.haircutRecords = (haircutRows || []) as any;
                            });
                        } catch (error) {
                            console.error('Failed to load meal records from Supabase:', error);
                        }
                    },

                    clearMealRecords: () => {
                        set((state) => {
                            state.mealRecords = [];
                            state.rvMealRecords = [];
                            state.extraMealRecords = [];
                            state.holidayRecords = [];
                            state.haircutRecords = [];
                        });
                    },

                    // Selectors
                    getDetailsForDate: (dateStr: string) => {
                        const {
                            mealRecords, rvMealRecords, extraMealRecords,
                            dayWorkerMealRecords, shelterMealRecords,
                            unitedEffortMealRecords, lunchBagRecords
                        } = get();

                        const check = (r: MealRecord) => pacificDateStringFrom(r.date) === dateStr;

                        return {
                            meals: mealRecords.filter(check),
                            rv: rvMealRecords.filter(check),
                            extras: extraMealRecords.filter(check),
                            dayWorker: dayWorkerMealRecords.filter(check),
                            shelter: shelterMealRecords.filter(check),
                            unitedEffort: unitedEffortMealRecords.filter(check),
                            lunchBags: lunchBagRecords.filter(check),
                        };
                    },
                })),
                {
                    name: 'hopes-corner-meals',
                }
            )
        ),
        { name: 'MealsStore' }
    )
);
