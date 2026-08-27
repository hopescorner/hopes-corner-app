import { create } from 'zustand';
import type { CheckInGuestSummary, CheckInServiceRecord, CheckInSnapshot, CheckInTodayStatus } from '@/types/checkin';
import { createSearchIndex, searchWithIndex, type SearchIndex } from '@/lib/utils/guestSearchIndex';

const emptyStatus = (): CheckInTodayStatus => ({
    mealCount: 0,
    extraMealCount: 0,
    totalMeals: 0,
    shower: null,
    laundry: null,
    bicycle: null,
    haircut: null,
    holiday: null,
});

interface CheckInState {
    isReady: boolean;
    generatedAt: string;
    directoryVersion: string;
    serviceDate: string;
    guests: CheckInGuestSummary[];
    guestsById: Record<string, CheckInGuestSummary>;
    searchIndex: SearchIndex<CheckInGuestSummary>;
    todayByGuest: Record<string, CheckInTodayStatus>;
    dailyNotes: CheckInSnapshot['dailyNotes'];
    realtimeMealVersions: Record<string, string>;
    realtimeServiceVersions: Record<string, string>;
    realtimeMealQuantities: Record<string, number>;
    acknowledgedMealRecordIds: Set<string>;
    acknowledgedUndoRecordIds: Set<string>;
    hydrate: (snapshot: CheckInSnapshot) => void;
    searchGuests: (query: string) => CheckInGuestSummary[];
    optimisticMeal: (guestId: string, quantity: number, extra: boolean) => () => void;
    replaceMealCounts: (guestId: string, mealCount: number, extraMealCount: number) => void;
    replaceGuestStatus: (guestId: string, status: CheckInTodayStatus) => void;
    acknowledgeMealRecord: (recordId: string) => void;
    applyUndo: (action: {
        type: 'MEAL_ADDED' | 'EXTRA_MEALS_ADDED' | 'SHOWER_BOOKED' | 'LAUNDRY_BOOKED' | 'BICYCLE_LOGGED' | 'HAIRCUT_LOGGED' | 'HOLIDAY_LOGGED';
        guestId: string;
        recordId: string;
        quantity?: number;
    }) => void;
    applyRealtimeMealRecord: (event: {
        id: string;
        guestId: string;
        extra: boolean;
        quantity: number;
        eventType: 'INSERT' | 'UPDATE' | 'DELETE';
        version: string;
    }) => void;
    applyRealtimeServiceRecord: (event: {
        id: string;
        guestId: string;
        service: 'shower' | 'laundry' | 'bicycle' | 'haircut' | 'holiday';
        record: CheckInServiceRecord | null;
        version: string;
    }) => void;
    reset: () => void;
}

const initialState = {
    isReady: false,
    generatedAt: '',
    directoryVersion: '',
    serviceDate: '',
    guests: [] as CheckInGuestSummary[],
    guestsById: {} as Record<string, CheckInGuestSummary>,
    searchIndex: createSearchIndex([] as CheckInGuestSummary[]),
    todayByGuest: {} as Record<string, CheckInTodayStatus>,
    dailyNotes: [] as CheckInSnapshot['dailyNotes'],
    realtimeMealVersions: {} as Record<string, string>,
    realtimeServiceVersions: {} as Record<string, string>,
    realtimeMealQuantities: {} as Record<string, number>,
    acknowledgedMealRecordIds: new Set<string>(),
    acknowledgedUndoRecordIds: new Set<string>(),
};

export const useCheckInStore = create<CheckInState>()((set, get) => ({
    ...initialState,
    hydrate: (snapshot) => set((state) => {
        if (state.generatedAt && snapshot.generatedAt < state.generatedAt) return state;
        return {
            ...state,
            isReady: true,
            generatedAt: snapshot.generatedAt,
            directoryVersion: snapshot.directoryVersion,
            serviceDate: snapshot.serviceDate,
            guests: snapshot.guests,
            guestsById: Object.fromEntries(snapshot.guests.map((guest) => [guest.id, guest])),
            searchIndex: state.directoryVersion === snapshot.directoryVersion
                ? state.searchIndex
                : createSearchIndex(snapshot.guests),
            todayByGuest: snapshot.todayByGuest,
            dailyNotes: snapshot.dailyNotes,
        };
    }),
    searchGuests: (query) => searchWithIndex(query, get().searchIndex, {
        maxResults: 100,
        earlyTerminationThreshold: 20,
    }),
    optimisticMeal: (guestId, quantity, extra) => {
        const previous = get().todayByGuest[guestId];
        set((state) => {
            const current = state.todayByGuest[guestId] || emptyStatus();
            const mealCount = current.mealCount + (extra ? 0 : quantity);
            const extraMealCount = current.extraMealCount + (extra ? quantity : 0);
            return {
                todayByGuest: {
                    ...state.todayByGuest,
                    [guestId]: {
                        ...current,
                        mealCount,
                        extraMealCount,
                        totalMeals: mealCount + extraMealCount,
                    },
                },
            };
        });
        return () => set((state) => {
            const next = { ...state.todayByGuest };
            if (previous) next[guestId] = previous;
            else delete next[guestId];
            return { todayByGuest: next };
        });
    },
    replaceMealCounts: (guestId, mealCount, extraMealCount) => set((state) => ({
        todayByGuest: {
            ...state.todayByGuest,
            [guestId]: {
                ...(state.todayByGuest[guestId] || emptyStatus()),
                mealCount,
                extraMealCount,
                totalMeals: mealCount + extraMealCount,
            },
        },
    })),
    replaceGuestStatus: (guestId, status) => set((state) => ({
        todayByGuest: { ...state.todayByGuest, [guestId]: status },
    })),
    acknowledgeMealRecord: (recordId) => set((state) => ({
        acknowledgedMealRecordIds: new Set(state.acknowledgedMealRecordIds).add(recordId),
    })),
    applyUndo: (action) => set((state) => {
        const current = state.todayByGuest[action.guestId] || emptyStatus();
        const next = { ...current };

        switch (action.type) {
            case 'MEAL_ADDED':
                next.mealCount = 0;
                break;
            case 'EXTRA_MEALS_ADDED':
                next.extraMealCount = Math.max(0, next.extraMealCount - (action.quantity ?? 1));
                break;
            case 'SHOWER_BOOKED':
                next.shower = null;
                break;
            case 'LAUNDRY_BOOKED':
                next.laundry = null;
                break;
            case 'BICYCLE_LOGGED':
                next.bicycle = null;
                break;
            case 'HAIRCUT_LOGGED':
                next.haircut = null;
                break;
            case 'HOLIDAY_LOGGED':
                next.holiday = null;
                break;
        }
        next.totalMeals = next.mealCount + next.extraMealCount;

        return {
            acknowledgedUndoRecordIds: new Set(state.acknowledgedUndoRecordIds).add(action.recordId),
            todayByGuest: { ...state.todayByGuest, [action.guestId]: next },
        };
    }),
    applyRealtimeMealRecord: (event) => set((state) => {
        const previousVersion = state.realtimeMealVersions[event.id];
        if (previousVersion && previousVersion >= event.version) return state;

        const versions = { ...state.realtimeMealVersions, [event.id]: event.version };
        const undone = new Set(state.acknowledgedUndoRecordIds);
        if (event.eventType === 'DELETE' && undone.delete(event.id)) {
            return { realtimeMealVersions: versions, acknowledgedUndoRecordIds: undone };
        }
        const acknowledged = new Set(state.acknowledgedMealRecordIds);
        if (acknowledged.delete(event.id)) {
            return { realtimeMealVersions: versions, acknowledgedMealRecordIds: acknowledged };
        }

        const current = state.todayByGuest[event.guestId] || emptyStatus();
        const quantities = { ...state.realtimeMealQuantities };
        const previousQuantity = quantities[event.id];
        let mealCount = current.mealCount;
        let extraMealCount = current.extraMealCount;

        if (event.extra) {
            if (event.eventType === 'INSERT') extraMealCount += event.quantity;
            else if (event.eventType === 'DELETE') extraMealCount = Math.max(0, extraMealCount - (previousQuantity ?? event.quantity));
            else if (previousQuantity != null) extraMealCount = Math.max(0, extraMealCount + event.quantity - previousQuantity);
        } else if (event.eventType === 'DELETE') {
            mealCount = Math.max(0, mealCount - (previousQuantity ?? event.quantity));
        } else {
            mealCount = event.quantity;
        }

        if (event.eventType === 'DELETE') delete quantities[event.id];
        else quantities[event.id] = event.quantity;
        return {
            realtimeMealVersions: versions,
            realtimeMealQuantities: quantities,
            acknowledgedMealRecordIds: acknowledged,
            todayByGuest: {
                ...state.todayByGuest,
                [event.guestId]: {
                    ...current,
                    mealCount,
                    extraMealCount,
                    totalMeals: mealCount + extraMealCount,
                },
            },
        };
    }),
    applyRealtimeServiceRecord: (event) => set((state) => {
        const key = `${event.service}:${event.id}`;
        const previousVersion = state.realtimeServiceVersions[key];
        if (previousVersion && previousVersion >= event.version) return state;
        const undone = new Set(state.acknowledgedUndoRecordIds);
        if (event.record === null && undone.delete(event.id)) {
            return {
                realtimeServiceVersions: { ...state.realtimeServiceVersions, [key]: event.version },
                acknowledgedUndoRecordIds: undone,
            };
        }
        const current = state.todayByGuest[event.guestId] || emptyStatus();
        return {
            realtimeServiceVersions: { ...state.realtimeServiceVersions, [key]: event.version },
            todayByGuest: {
                ...state.todayByGuest,
                [event.guestId]: { ...current, [event.service]: event.record },
            },
        };
    }),
    reset: () => set(initialState),
}));
