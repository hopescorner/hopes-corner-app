import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
    HolidayRegistration,
    HolidayRegistrationInput,
    HolidaySummaryMetrics,
} from '@/types/holiday';
import { isTeen14Plus } from '@/lib/holiday/ageGroups';



interface HolidayStoreState {
    registrations: HolidayRegistration[];
    isLoading: boolean;
    isLoaded: boolean;
    selectedSlotFilter: string | null;
    searchQuery: string;
    statusFilter: 'all' | 'registered' | 'checked_in';

    ensureLoaded: () => Promise<void>;
    loadFromSupabase: () => Promise<void>;
    checkInRegistration: (
        id: string,
        data: { groceryCards?: number; teenCards?: number; notes?: string; checkedInBy?: string }
    ) => Promise<boolean>;
    undoCheckIn: (id: string) => Promise<boolean>;
    updateRegistration: (id: string, updates: Partial<HolidayRegistration>) => Promise<boolean>;
    deleteRegistration: (id: string) => Promise<boolean>;
    addWalkInRegistration: (input: HolidayRegistrationInput) => Promise<HolidayRegistration | null>;
    setSelectedSlotFilter: (slot: string | null) => void;
    setSearchQuery: (query: string) => void;
    setStatusFilter: (filter: 'all' | 'registered' | 'checked_in') => void;
}

export const useHolidayStore = create<HolidayStoreState>()(
    devtools(
        immer((set, get) => ({
            registrations: [],
            isLoading: false,
            isLoaded: false,
            selectedSlotFilter: null,
            searchQuery: '',
            statusFilter: 'all',

            ensureLoaded: async () => {
                if (get().isLoaded || get().isLoading) return;
                await get().loadFromSupabase();
            },

            loadFromSupabase: async () => {
                set((state) => {
                    state.isLoading = true;
                });
                try {
                    const res = await fetch('/api/holiday/staff/registrations');
                    if (!res.ok) {
                        console.error('[useHolidayStore] Error loading registrations:', res.statusText);
                        set((state) => {
                            state.isLoading = false;
                        });
                        return;
                    }

                    const json = await res.json();
                    set((state) => {
                        state.registrations = json.registrations || [];
                        state.isLoaded = true;
                        state.isLoading = false;
                    });
                } catch (error) {
                    console.error('[useHolidayStore] Exception loading data:', error);
                    set((state) => {
                        state.isLoading = false;
                    });
                }
            },

            checkInRegistration: async (id, data) => {
                const now = new Date().toISOString();
                set((state) => {
                    const item = state.registrations.find((r) => r.id === id);
                    if (item) {
                        item.status = 'checked_in';
                        item.checkedInAt = now;
                        if (data.checkedInBy) item.checkedInBy = data.checkedInBy;
                        if (typeof data.groceryCards === 'number') item.groceryCards = data.groceryCards;
                        if (typeof data.teenCards === 'number') item.teenCards = data.teenCards;
                        if (typeof data.notes === 'string') item.notes = data.notes;
                    }
                });

                try {
                    const res = await fetch('/api/holiday/staff/check-in', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id,
                            groceryCards: data.groceryCards,
                            teenCards: data.teenCards,
                            notes: data.notes,
                        }),
                    });

                    if (!res.ok) {
                        console.error('[useHolidayStore] Error checking in:', res.statusText);
                        await get().loadFromSupabase();
                        return false;
                    }
                    return true;
                } catch (error) {
                    console.error('[useHolidayStore] Exception updating checkin:', error);
                    await get().loadFromSupabase();
                    return false;
                }
            },

            undoCheckIn: async (id) => {
                set((state) => {
                    const item = state.registrations.find((r) => r.id === id);
                    if (item) {
                        item.status = 'registered';
                        item.checkedInAt = undefined;
                    }
                });

                try {
                    const res = await fetch('/api/holiday/staff/undo-checkin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id }),
                    });

                    if (!res.ok) {
                        console.error('[useHolidayStore] Error undoing checkin:', res.statusText);
                        await get().loadFromSupabase();
                        return false;
                    }
                    return true;
                } catch (error) {
                    console.error('[useHolidayStore] Exception undoing checkin:', error);
                    await get().loadFromSupabase();
                    return false;
                }
            },

            updateRegistration: async (id, updates) => {
                set((state) => {
                    const item = state.registrations.find((r) => r.id === id);
                    if (item) {
                        Object.assign(item, updates);
                    }
                });

                try {
                    const res = await fetch('/api/holiday/staff/notes', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, notes: updates.notes }),
                    });

                    if (!res.ok) {
                        console.error('[useHolidayStore] Error updating notes:', res.statusText);
                        await get().loadFromSupabase();
                        return false;
                    }
                    return true;
                } catch (error) {
                    console.error('[useHolidayStore] Exception updating registration:', error);
                    await get().loadFromSupabase();
                    return false;
                }
            },

            deleteRegistration: async (id) => {
                set((state) => {
                    state.registrations = state.registrations.filter((r) => r.id !== id);
                });

                try {
                    const res = await fetch(`/api/holiday/staff/registrations/${id}`, {
                        method: 'DELETE',
                    });

                    if (!res.ok) {
                        console.error('[useHolidayStore] Error deleting registration:', res.statusText);
                        await get().loadFromSupabase();
                        return false;
                    }
                    return true;
                } catch (error) {
                    console.error('[useHolidayStore] Exception deleting registration:', error);
                    await get().loadFromSupabase();
                    return false;
                }
            },

            addWalkInRegistration: async (input) => {
                try {
                    const res = await fetch('/api/holiday/staff/walk-in', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(input),
                    });

                    if (!res.ok) {
                        console.error('[useHolidayStore] Error adding walk-in:', res.statusText);
                        return null;
                    }

                    const json = await res.json();
                    const newReg = json.registration as HolidayRegistration;
                    if (!newReg) return null;

                    set((state) => {
                        const exists = state.registrations.some((r) => r.id === newReg.id);
                        if (!exists) {
                            state.registrations.push(newReg);
                        }
                    });

                    return newReg;
                } catch (error) {
                    console.error('[useHolidayStore] Exception adding walk-in:', error);
                    return null;
                }
            },



            setSelectedSlotFilter: (slot) => {
                set((state) => {
                    state.selectedSlotFilter = slot;
                });
            },

            setSearchQuery: (query) => {
                set((state) => {
                    state.searchQuery = query;
                });
            },

            setStatusFilter: (filter) => {
                set((state) => {
                    state.statusFilter = filter;
                });
            },
        }))
    )
);

export function selectHolidayMetrics(registrations: HolidayRegistration[]): HolidaySummaryMetrics {
    let checkedInCount = 0;
    let pendingCount = 0;
    let infantsCount = 0;
    let toddlersCount = 0;
    let childrenCount = 0;
    let teen13Count = 0;
    let teen14Count = 0;
    let teen15Count = 0;
    let teen16To18Count = 0;
    let totalChildrenCount = 0;
    let teen14PlusCount = 0;
    let groceryCardsCount = 0;
    let teenCardsCount = 0;

    for (const reg of registrations) {
        if (reg.status === 'cancelled') continue;
        if (reg.status === 'checked_in') {
            checkedInCount++;
        } else {
            pendingCount++;
        }

        groceryCardsCount += reg.groceryCards || 0;
        teenCardsCount += reg.teenCards || 0;

        for (const child of reg.children || []) {
            totalChildrenCount++;
            const age = child.age;
            if (isTeen14Plus(age)) {
                teen14PlusCount++;
            }

            switch (child.ageGroup) {
                case 'infant':
                    infantsCount++;
                    break;
                case 'toddler':
                    toddlersCount++;
                    break;
                case 'child':
                    childrenCount++;
                    break;
                case 'teen_13':
                    teen13Count++;
                    break;
                case 'teen_14':
                    teen14Count++;
                    break;
                case 'teen_15':
                    teen15Count++;
                    break;
                case 'teen_16_18':
                    teen16To18Count++;
                    break;
            }
        }
    }

    return {
        totalRegistrations: registrations.filter((r) => r.status !== 'cancelled').length,
        checkedInCount,
        pendingCount,
        infantsCount,
        toddlersCount,
        childrenCount,
        teen13Count,
        teen14Count,
        teen15Count,
        teen16To18Count,
        totalChildrenCount,
        teen14PlusCount,
        groceryCardsCount,
        teenCardsCount,
    };
}

export function selectSlotCounts(registrations: HolidayRegistration[]): Record<string, number> {
    const map: Record<string, number> = {};
    for (const reg of registrations) {
        if (reg.status !== 'cancelled' && reg.timeSlot) {
            map[reg.timeSlot] = (map[reg.timeSlot] || 0) + 1;
        }
    }
    return map;
}

export function selectFilteredHolidayRegistrations(
    registrations: HolidayRegistration[],
    searchQuery: string,
    slotFilter: string | null,
    statusFilter: 'all' | 'registered' | 'checked_in'
): HolidayRegistration[] {
    const q = searchQuery.trim().toLowerCase();
    const qNum = parseInt(q.replace('#', ''), 10);

    return registrations.filter((r) => {
        if (r.status === 'cancelled') return false;

        if (statusFilter !== 'all' && r.status !== statusFilter) {
            return false;
        }

        if (slotFilter && r.timeSlot !== slotFilter) {
            return false;
        }

        if (q) {
            if (!isNaN(qNum) && r.ticketNumber === qNum) return true;
            if (r.parentName.toLowerCase().includes(q)) return true;
            if (r.phone.includes(q)) return true;
            if (r.city.toLowerCase().includes(q)) return true;
            if (r.notes && r.notes.toLowerCase().includes(q)) return true;
            if (r.children && r.children.some((c) => c.name.toLowerCase().includes(q) || (c.school && c.school.toLowerCase().includes(q)))) {
                return true;
            }
            return false;
        }

        return true;
    });
}
