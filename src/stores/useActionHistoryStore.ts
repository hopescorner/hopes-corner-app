import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useMealsStore } from './useMealsStore';
import { useServicesStore } from './useServicesStore';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

export const MAX_ACTION_HISTORY = 300;

export type ActionType =
    | 'MEAL_ADDED'
    | 'EXTRA_MEALS_ADDED'
    | 'SHOWER_BOOKED'
    | 'LAUNDRY_BOOKED'
    | 'LAUNDRY_BOOKED'
    | 'BICYCLE_LOGGED'
    | 'HAIRCUT_LOGGED'
    | 'HOLIDAY_LOGGED';

export interface ActionEntry {
    id: string; // Action ID
    type: ActionType;
    timestamp: string;
    data: {
        recordId: string;
        guestId: string;
        [key: string]: any;
    };
}

interface ActionHistoryState {
    actionHistory: ActionEntry[];
    addAction: (type: ActionType, data: any) => void;
    undoAction: (actionId: string) => Promise<boolean>;
    clearHistory: () => void;
    getActionsForGuestToday: (guestId: string) => ActionEntry[];
}

export const useActionHistoryStore = create<ActionHistoryState>()(
    persist(
        (set, get) => ({
            actionHistory: [],

            addAction: (type, data) => {
                const newAction: ActionEntry = {
                    id: uuidv4(),
                    type,
                    timestamp: new Date().toISOString(),
                    data,
                };
                set((state) => ({
                    actionHistory: [newAction, ...state.actionHistory].slice(0, MAX_ACTION_HISTORY),
                }));
            },

            clearHistory: () => {
                set({ actionHistory: [] });
            },

            getActionsForGuestToday: (guestId: string) => {
                const { actionHistory } = get();
                // Filter for potentially recent actions (e.g. last 24h) or just matching today's date logic
                // For simplified "today" logic we can adhere to the timestamp check in the component
                // but usually we just return the list and let component filter by "today"
                return actionHistory.filter(a => a.data.guestId === guestId);
            },

            undoAction: async (actionId: string) => {
                const { actionHistory } = get();
                const action = actionHistory.find((a) => a.id === actionId);

                if (!action) {
                    console.error("Action not found");
                    return false;
                }

                try {
                    switch (action.type) {
                        case 'MEAL_ADDED': {
                            const { deleteMealRecord } = useMealsStore.getState();
                            await deleteMealRecord(action.data.recordId);
                            break;
                        }
                        case 'EXTRA_MEALS_ADDED': {
                            const { deleteExtraMealRecord } = useMealsStore.getState();
                            await deleteExtraMealRecord(action.data.recordId);
                            break;
                        }
                        case 'SHOWER_BOOKED': {
                            const { deleteShowerRecord } = useServicesStore.getState();
                            await deleteShowerRecord(action.data.recordId);
                            break;
                        }
                        case 'LAUNDRY_BOOKED': {
                            const { deleteLaundryRecord } = useServicesStore.getState();
                            await deleteLaundryRecord(action.data.recordId);
                            break;
                        }
                        case 'BICYCLE_LOGGED': {
                            const { deleteBicycleRecord } = useServicesStore.getState();
                            await deleteBicycleRecord(action.data.recordId);
                            break;
                        }
                        case 'HAIRCUT_LOGGED': {
                            const { deleteHaircutRecord } = useServicesStore.getState();
                            await deleteHaircutRecord(action.data.recordId);
                            break;
                        }
                        case 'HOLIDAY_LOGGED': {
                            const { deleteHolidayRecord } = useServicesStore.getState();
                            await deleteHolidayRecord(action.data.recordId);
                            break;
                        }
                        default:
                            console.warn("Unknown action type:", action.type);
                            return false;
                    }

                    // Remove from history on success
                    set((state) => ({
                        actionHistory: state.actionHistory.filter((a) => a.id !== actionId),
                    }));

                    return true;
                } catch (error) {
                    console.error("Failed to undo action:", error);
                    toast.error("Failed to undo action");
                    return false;
                }
            },
        }),
        {
            name: 'hopes-corner-action-history',
            storage: createJSONStorage(() => sessionStorage), // Session storage is safer for history to clear on close? 
            // Or maybe localStorage is fine. The old app seemingly used memory (AppContext).
            // Let's use sessionStorage to persist across reloads but not forever.
        }
    )
);
