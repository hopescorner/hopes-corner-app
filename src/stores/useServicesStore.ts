import { create } from 'zustand';
import { persist, devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createClient } from '@/lib/supabase/client';
import { fetchAllPaginated } from '@/lib/utils/supabasePagination';
import {
    getCachedShowerRecords,
    getCachedLaundryRecords,
    getCachedBicycleRecords,
} from '@/lib/supabase/cachedQueries';
import {
    mapShowerRow,
    mapLaundryRow,
    mapBicycleRow,
    mapHaircutRow,
    mapHolidayRow,
    mapShowerStatusToDb,
} from '@/lib/utils/mappers';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';

interface ShowerRecord {
    id: string;
    guestId: string;
    time?: string | null;
    scheduledFor?: string | null;
    date: string;
    dateKey?: string;
    status: string;
    createdAt?: string;
    lastUpdated?: string;
}

interface LaundryRecord {
    id: string;
    guestId: string;
    time?: string | null;
    laundryType?: string;
    washType?: string; // App-side compatibility
    bagNumber?: string;
    scheduledFor?: string | null;
    date: string;
    dateKey?: string;
    status: string;
    createdAt?: string;
    lastUpdated?: string;
}

interface BicycleRecord {
    id: string;
    guestId: string;
    date: string;
    dateKey?: string;
    type: string;
    repairType: string;
    repairTypes: string[];
    completedRepairs: string[];
    notes?: string;
    status: string;
    priority: number;
    doneAt?: string | null;
    lastUpdated?: string;
    returnedAt?: string | null;
    createdAt?: string;
}

interface HaircutRecord {
    id: string;
    guestId: string;
    date: string;
    dateKey?: string;
    type: string;
    createdAt?: string;
}

interface HolidayRecord {
    id: string;
    guestId: string;
    date: string;
    dateKey?: string;
    type: string;
    createdAt?: string;
}

interface ServicesState {
    showerRecords: ShowerRecord[];
    laundryRecords: LaundryRecord[];
    bicycleRecords: BicycleRecord[];
    haircutRecords: HaircutRecord[];
    holidayRecords: HolidayRecord[];

    addShowerRecord: (guestId: string, time?: string, serviceDate?: string, initialStatus?: 'booked' | 'done') => Promise<ShowerRecord | Partial<ShowerRecord>>;
    addShowerWaitlist: (guestId: string, serviceDate?: string) => Promise<ShowerRecord | Partial<ShowerRecord>>;
    deleteShowerRecord: (recordId: string) => Promise<void>;
    addLaundryRecord: (guestId: string, washType: string, slotLabel?: string, bagNumber?: string, serviceDate?: string, initialStatus?: string) => Promise<LaundryRecord | Partial<LaundryRecord>>;
    addLaundryWaitlist: (guestId: string, serviceDate?: string) => Promise<LaundryRecord | Partial<LaundryRecord>>;
    deleteLaundryRecord: (recordId: string) => Promise<void>;
    updateLaundryStatus: (recordId: string, status: string) => Promise<boolean>;
    updateLaundryBagNumber: (recordId: string, bagNumber: string) => Promise<boolean>;
    updateShowerStatus: (recordId: string, status: string) => Promise<boolean>;
    cancelMultipleShowers: (recordIds: string[]) => Promise<boolean>;
    cancelMultipleLaundry: (recordIds: string[]) => Promise<boolean>;
    addBicycleRecord: (guestId: string, repairOptions?: any) => Promise<BicycleRecord | Partial<BicycleRecord>>;
    updateBicycleRecord: (recordId: string, updates: Partial<BicycleRecord>) => Promise<void>;
    deleteBicycleRecord: (recordId: string) => Promise<void>;
    addHaircutRecord: (guestId: string) => Promise<HaircutRecord | Partial<HaircutRecord>>;
    deleteHaircutRecord: (recordId: string) => Promise<void>;
    addHolidayRecord: (guestId: string) => Promise<HolidayRecord | Partial<HolidayRecord>>;
    deleteHolidayRecord: (recordId: string) => Promise<void>;
    loadFromSupabase: () => Promise<void>;
    clearServiceRecords: () => void;
    getTodayShowers: () => ShowerRecord[];
    getTodayLaundry: () => LaundryRecord[];
    getTodayOnsiteLaundry: () => LaundryRecord[];
    getTodayOffsiteLaundry: () => LaundryRecord[];
    getActiveBicycles: () => BicycleRecord[];
    getTodayBicycles: () => BicycleRecord[];
}

export const useServicesStore = create<ServicesState>()(
    devtools(
        subscribeWithSelector(
            persist(
                immer((set, get) => ({
                    // State
                    showerRecords: [],
                    laundryRecords: [],
                    bicycleRecords: [],
                    haircutRecords: [],
                    holidayRecords: [],

                    // Shower Actions
                    addShowerRecord: async (guestId: string, time: string | null = null, serviceDate?: string, initialStatus: 'booked' | 'done' = 'booked') => {
                        if (!guestId) throw new Error('Guest ID is required');
                        const targetDate = serviceDate || todayPacificDateString();
                        const supabase = createClient();

                        const payload = {
                            guest_id: guestId,
                            scheduled_for: targetDate,
                            scheduled_time: time,
                            status: initialStatus,
                        };

                        const { data, error } = await supabase
                            .from('shower_reservations')
                            .insert(payload)
                            .select()
                            .single();

                        if (error) {
                            console.error('Failed to add shower record to Supabase:', error);
                            throw new Error('Unable to save shower record');
                        }

                        const mapped = mapShowerRow(data);
                        set((state) => {
                            state.showerRecords.push(mapped as any);
                        });
                        return mapped;
                    },

                    addShowerWaitlist: async (guestId: string, serviceDate?: string) => {
                        if (!guestId) throw new Error('Guest ID is required');
                        const targetDate = serviceDate || todayPacificDateString();
                        const supabase = createClient();

                        const payload = {
                            guest_id: guestId,
                            scheduled_for: targetDate,
                            status: 'waitlisted',
                        };

                        const { data, error } = await supabase
                            .from('shower_reservations')
                            .insert(payload)
                            .select()
                            .single();

                        if (error) {
                            console.error('Failed to add waitlist record to Supabase:', error);
                            throw new Error('Unable to add to waitlist');
                        }

                        const mapped = mapShowerRow(data);
                        set((state) => {
                            state.showerRecords.push(mapped as any);
                        });
                        return mapped;
                    },

                    deleteShowerRecord: async (recordId: string) => {
                        const { showerRecords } = get();
                        const target = showerRecords.find((r) => r.id === recordId);

                        set((state) => {
                            state.showerRecords = state.showerRecords.filter(
                                (r) => r.id !== recordId
                            );
                        });

                        const supabase = createClient();
                        if (target) {
                            const { error } = await supabase
                                .from('shower_reservations')
                                .delete()
                                .eq('id', recordId);

                            if (error) {
                                console.error('Failed to delete shower record from Supabase:', error);
                            }
                        }
                    },

                    // Laundry Actions
                    addLaundryRecord: async (guestId: string, washType: string, slotLabel: string | null = null, bagNumber: string = '', serviceDate?: string, initialStatus?: string) => {
                        if (!guestId) throw new Error('Guest ID is required');
                        if (!washType) throw new Error('Wash type is required');

                        const targetDate = serviceDate || todayPacificDateString();
                        const supabase = createClient();

                        const payload = {
                            guest_id: guestId,
                            laundry_type: washType.toLowerCase(),
                            slot_label: slotLabel,
                            bag_number: bagNumber,
                            scheduled_for: targetDate,
                            status: initialStatus || (washType.toLowerCase() === 'offsite' ? 'pending' : 'waiting'),
                        };

                        const { data, error } = await supabase
                            .from('laundry_bookings')
                            .insert(payload)
                            .select()
                            .single();

                        if (error) {
                            console.error('Failed to add laundry record to Supabase:', error);
                            throw new Error('Unable to save laundry record');
                        }

                        const mapped = mapLaundryRow(data);
                        set((state) => {
                            state.laundryRecords.push(mapped as any);
                        });
                        return mapped;
                    },

                    addLaundryWaitlist: async (guestId: string, serviceDate?: string) => {
                        if (!guestId) throw new Error('Guest ID is required');
                        const targetDate = serviceDate || todayPacificDateString();
                        const supabase = createClient();

                        const payload = {
                            guest_id: guestId,
                            scheduled_for: targetDate,
                            status: 'waitlisted',
                        };

                        const { data, error } = await supabase
                            .from('laundry_bookings')
                            .insert(payload)
                            .select()
                            .single();

                        if (error) {
                            console.error('Failed to add laundry waitlist to Supabase:', error);
                            throw new Error('Unable to add to waitlist');
                        }

                        const mapped = mapLaundryRow(data);
                        set((state) => {
                            state.laundryRecords.push(mapped as any);
                        });
                        return mapped;
                    },

                    deleteLaundryRecord: async (recordId: string) => {
                        const { laundryRecords } = get();
                        const target = laundryRecords.find((r) => r.id === recordId);

                        set((state) => {
                            state.laundryRecords = state.laundryRecords.filter(
                                (r) => r.id !== recordId
                            );
                        });

                        const supabase = createClient();
                        if (target) {
                            const { error } = await supabase
                                .from('laundry_bookings')
                                .delete()
                                .eq('id', recordId);

                            if (error) {
                                console.error('Failed to delete laundry record from Supabase:', error);
                            }
                        }
                    },

                    updateLaundryStatus: async (recordId: string, status: string) => {
                        const { laundryRecords } = get();
                        const target = laundryRecords.find((r) => r.id === recordId);
                        if (!target) return false;

                        set((state) => {
                            const index = state.laundryRecords.findIndex((r) => r.id === recordId);
                            if (index !== -1) {
                                state.laundryRecords[index].status = status;
                            }
                        });

                        const supabase = createClient();
                        const { error } = await supabase
                            .from('laundry_bookings')
                            .update({ status })
                            .eq('id', recordId);

                        if (error) {
                            console.error('Failed to update laundry status:', error);
                            // Revert
                            set((state) => {
                                const index = state.laundryRecords.findIndex((r) => r.id === recordId);
                                if (index !== -1) state.laundryRecords[index].status = target.status;
                            });
                            return false;
                        }
                        return true;
                    },

                    updateLaundryBagNumber: async (recordId: string, bagNumber: string) => {
                        const { laundryRecords } = get();
                        const target = laundryRecords.find((r) => r.id === recordId);
                        if (!target) return false;

                        set((state) => {
                            const index = state.laundryRecords.findIndex((r) => r.id === recordId);
                            if (index !== -1) {
                                state.laundryRecords[index].bagNumber = bagNumber;
                            }
                        });

                        const supabase = createClient();
                        const { error } = await supabase
                            .from('laundry_bookings')
                            .update({ bag_number: bagNumber })
                            .eq('id', recordId);

                        if (error) {
                            console.error('Failed to update laundry bag number:', error);
                            // Revert
                            set((state) => {
                                const index = state.laundryRecords.findIndex((r) => r.id === recordId);
                                if (index !== -1) state.laundryRecords[index].bagNumber = target.bagNumber;
                            });
                            return false;
                        }
                        return true;
                    },

                    updateShowerStatus: async (recordId: string, status: string) => {
                        const { showerRecords } = get();
                        const target = showerRecords.find((r) => r.id === recordId);
                        if (!target) return false;

                        set((state) => {
                            const index = state.showerRecords.findIndex((r) => r.id === recordId);
                            if (index !== -1) {
                                state.showerRecords[index].status = status;
                            }
                        });

                        const supabase = createClient();
                        // Map app status to DB status (e.g., 'awaiting' -> 'booked')
                        const dbStatus = mapShowerStatusToDb(status as any);
                        const { error } = await supabase
                            .from('shower_reservations')
                            .update({ status: dbStatus })
                            .eq('id', recordId);

                        if (error) {
                            console.error('Failed to update shower status:', error);
                            // Revert
                            set((state) => {
                                const index = state.showerRecords.findIndex((r) => r.id === recordId);
                                if (index !== -1) state.showerRecords[index].status = target.status;
                            });
                            return false;
                        }
                        return true;
                    },

                    // End Service Day - Cancel Multiple Actions
                    cancelMultipleShowers: async (recordIds: string[]) => {
                        if (!recordIds.length) return true;

                        const { showerRecords } = get();
                        const previousStatuses = new Map<string, string>();

                        // Store previous statuses for potential rollback
                        recordIds.forEach((id) => {
                            const record = showerRecords.find((r) => r.id === id);
                            if (record) previousStatuses.set(id, record.status);
                        });

                        // Optimistic update
                        set((state) => {
                            state.showerRecords = state.showerRecords.map((r) =>
                                recordIds.includes(r.id) ? { ...r, status: 'cancelled' } : r
                            );
                        });

                        const supabase = createClient();
                        const { error } = await supabase
                            .from('shower_reservations')
                            .update({ status: 'cancelled' })
                            .in('id', recordIds);

                        if (error) {
                            console.error('Failed to cancel showers:', error);
                            // Rollback
                            set((state) => {
                                state.showerRecords = state.showerRecords.map((r) => {
                                    const prev = previousStatuses.get(r.id);
                                    return prev ? { ...r, status: prev } : r;
                                });
                            });
                            return false;
                        }
                        return true;
                    },

                    cancelMultipleLaundry: async (recordIds: string[]) => {
                        if (!recordIds.length) return true;

                        const { laundryRecords } = get();
                        const previousStatuses = new Map<string, string>();

                        // Store previous statuses for potential rollback
                        recordIds.forEach((id) => {
                            const record = laundryRecords.find((r) => r.id === id);
                            if (record) previousStatuses.set(id, record.status);
                        });

                        // Optimistic update
                        set((state) => {
                            state.laundryRecords = state.laundryRecords.map((r) =>
                                recordIds.includes(r.id) ? { ...r, status: 'cancelled' } : r
                            );
                        });

                        const supabase = createClient();
                        const { error } = await supabase
                            .from('laundry_bookings')
                            .update({ status: 'cancelled' })
                            .in('id', recordIds);

                        if (error) {
                            console.error('Failed to cancel laundry:', error);
                            // Rollback
                            set((state) => {
                                state.laundryRecords = state.laundryRecords.map((r) => {
                                    const prev = previousStatuses.get(r.id);
                                    return prev ? { ...r, status: prev } : r;
                                });
                            });
                            return false;
                        }
                        return true;
                    },

                    // Bicycle Actions
                    addBicycleRecord: async (guestId: string, repairOptions: any = {}) => {
                        if (!guestId) throw new Error('Guest ID is required');

                        const {
                            repairType = 'Flat Tire',
                            repairTypes = null,
                            notes = '',
                            status = 'pending',
                            priority = 0,
                        } = repairOptions;

                        const supabase = createClient();
                        const payload = {
                            guest_id: guestId,
                            repair_type: repairType,
                            repair_types: repairTypes || [repairType],
                            notes,
                            status,
                            priority,
                            completed_repairs: [],
                            requested_at: new Date().toISOString(),
                        };

                        const { data, error } = await supabase
                            .from('bicycle_repairs')
                            .insert(payload)
                            .select()
                            .single();

                        if (error) {
                            console.error('Failed to add bicycle record to Supabase:', error);
                            throw new Error('Unable to save bicycle record');
                        }

                        const mapped = mapBicycleRow(data);
                        set((state) => {
                            state.bicycleRecords.push(mapped as any);
                        });
                        return mapped;
                    },

                    updateBicycleRecord: async (recordId: string, updates: any) => {
                        const { bicycleRecords } = get();
                        const target = bicycleRecords.find((r) => r.id === recordId);

                        if (!target) throw new Error('Bicycle record not found');

                        const completedAt = updates.status === 'done' ? new Date().toISOString() : null;

                        set((state) => {
                            const index = state.bicycleRecords.findIndex(
                                (r) => r.id === recordId
                            );
                            if (index !== -1) {
                                Object.assign(state.bicycleRecords[index], {
                                    ...updates,
                                    doneAt: updates.status === 'done' ? completedAt : state.bicycleRecords[index].doneAt,
                                });
                            }
                        });

                        const supabase = createClient();
                        // Convert camelCase to snake_case for database
                        const payload: any = {};
                        Object.keys(updates).forEach((key) => {
                            if (key === 'completedRepairs') {
                                payload.completed_repairs = updates[key];
                            } else {
                                payload[key] = updates[key];
                            }
                        });
                        
                        if (updates.status === 'done') {
                            payload.completed_at = completedAt;
                        }

                        const { error } = await supabase
                            .from('bicycle_repairs')
                            .update(payload)
                            .eq('id', recordId);

                        if (error) {
                            console.error('Failed to update bicycle repair in Supabase:', error);
                            // Revert optimistic update
                            set((state) => {
                                const index = state.bicycleRecords.findIndex(
                                    (r) => r.id === recordId
                                );
                                if (index !== -1) {
                                    state.bicycleRecords[index] = { ...target };
                                }
                            });
                            throw new Error('Unable to update bicycle repair');
                        }
                    },

                    deleteBicycleRecord: async (recordId: string) => {
                        const { bicycleRecords } = get();
                        const target = bicycleRecords.find((r) => r.id === recordId);

                        set((state) => {
                            state.bicycleRecords = state.bicycleRecords.filter(
                                (r) => r.id !== recordId
                            );
                        });

                        const supabase = createClient();
                        if (target) {
                            const { error } = await supabase
                                .from('bicycle_repairs')
                                .delete()
                                .eq('id', recordId);

                            if (error) {
                                console.error('Failed to delete bicycle record from Supabase:', error);
                            }
                        }
                    },

                    addHaircutRecord: async (guestId: string) => {
                        if (!guestId) throw new Error('Guest ID is required');
                        const todayStr = todayPacificDateString();
                        const supabase = createClient();

                        const payload = {
                            guest_id: guestId,
                            served_at: new Date().toISOString(), // Use exact timestamp for uniqueness if needed, or date string based on logic
                            service_date: todayStr
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
                        return mapped;
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

                    addHolidayRecord: async (guestId: string) => {
                        if (!guestId) throw new Error('Guest ID is required');
                        const todayStr = todayPacificDateString();
                        const supabase = createClient();

                        const payload = {
                            guest_id: guestId,
                            visit_date: todayStr, // Holiday visits usually keyed by date
                            served_at: new Date().toISOString()
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
                        return mapped;
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

                    // Load from Supabase
                    loadFromSupabase: async () => {
                        const supabase = createClient();
                        try {
                            const [showerRows, laundryRows, bicycleRows, haircutRows, holidayRows] = await Promise.all([
                                getCachedShowerRecords(),
                                getCachedLaundryRecords(),
                                getCachedBicycleRecords(),
                                // Haircuts and holidays still use direct queries (not in cached)
                                fetchAllPaginated(supabase, {
                                    table: 'haircut_visits',
                                    select: 'id,guest_id,served_at,service_date,created_at',
                                    orderBy: 'created_at',
                                    ascending: false,
                                    pageSize: 1000,
                                    mapper: mapHaircutRow,
                                }),
                                fetchAllPaginated(supabase, {
                                    table: 'holiday_visits',
                                    select: 'id,guest_id,served_at,visit_date,created_at',
                                    orderBy: 'created_at',
                                    ascending: false,
                                    pageSize: 1000,
                                    mapper: mapHolidayRow,
                                }),
                            ]);

                            set((state) => {
                                state.showerRecords = (showerRows || []) as any;
                                state.laundryRecords = (laundryRows || []) as any;
                                state.bicycleRecords = (bicycleRows || []) as any;
                                state.haircutRecords = (haircutRows || []) as any;
                                state.holidayRecords = (holidayRows || []) as any;
                            });
                        } catch (error) {
                            console.error('Failed to load service records from Supabase:', error);
                        }
                    },

                    clearServiceRecords: () => {
                        set((state) => {
                            state.showerRecords = [];
                            state.laundryRecords = [];
                            state.bicycleRecords = [];
                            state.haircutRecords = [];
                            state.holidayRecords = [];
                        });
                    },

                    // Selectors
                    getTodayShowers: () => {
                        const today = todayPacificDateString();
                        return get().showerRecords.filter(
                            (r) => pacificDateStringFrom(r.date) === today
                        );
                    },

                    getTodayLaundry: () => {
                        const today = todayPacificDateString();
                        return get().laundryRecords.filter(
                            (r) => pacificDateStringFrom(r.date) === today
                        );
                    },

                    getTodayOnsiteLaundry: () => {
                        const today = todayPacificDateString();
                        return get().laundryRecords.filter(
                            (r) =>
                                pacificDateStringFrom(r.date) === today &&
                                r.laundryType === 'onsite'
                        );
                    },

                    getTodayOffsiteLaundry: () => {
                        const today = todayPacificDateString();
                        return get().laundryRecords.filter(
                            (r) =>
                                pacificDateStringFrom(r.date) === today &&
                                r.laundryType === 'offsite'
                        );
                    },

                    getActiveBicycles: () => {
                        return get().bicycleRecords.filter((r) => r.status !== 'done');
                    },

                    getTodayBicycles: () => {
                        const today = todayPacificDateString();
                        return get().bicycleRecords.filter(
                            (r) => pacificDateStringFrom(r.date) === today
                        );
                    },
                })),
                {
                    name: 'hopes-corner-services',
                }
            )
        ),
        { name: 'ServicesStore' }
    )
);
