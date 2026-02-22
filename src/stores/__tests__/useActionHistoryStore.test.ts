import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MAX_ACTION_HISTORY, useActionHistoryStore } from '../useActionHistoryStore';
import { useMealsStore } from '../useMealsStore';
import { useServicesStore } from '../useServicesStore';

const mockMealsStore = {
    deleteMealRecord: vi.fn(),
    deleteExtraMealRecord: vi.fn(),
    deleteHaircutRecord: vi.fn(),
    deleteHolidayRecord: vi.fn(),
};

const mockServicesStore = {
    deleteShowerRecord: vi.fn(),
    deleteLaundryRecord: vi.fn(),
    deleteBicycleRecord: vi.fn(),
    deleteHaircutRecord: vi.fn(),
    deleteHolidayRecord: vi.fn(),
};

// Mock stores that undoAction depends on
vi.mock('../useMealsStore', () => ({
    useMealsStore: {
        getState: vi.fn(() => mockMealsStore),
    },
}));

vi.mock('../useServicesStore', () => ({
    useServicesStore: {
        getState: vi.fn(() => mockServicesStore),
    },
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
    default: {
        error: vi.fn(),
    },
}));

describe('useActionHistoryStore', () => {
    beforeEach(() => {
        useActionHistoryStore.getState().clearHistory();
        vi.clearAllMocks();
    });

    describe('initial state', () => {
        it('initializes with empty history', () => {
            const state = useActionHistoryStore.getState();
            expect(state.actionHistory).toEqual([]);
        });
    });

    describe('addAction', () => {
        it('adds a MEAL_ADDED action correctly', () => {
            const { addAction } = useActionHistoryStore.getState();
            addAction('MEAL_ADDED', { recordId: 'r1', guestId: 'g1' });

            const state = useActionHistoryStore.getState();
            expect(state.actionHistory.length).toBe(1);
            expect(state.actionHistory[0].type).toBe('MEAL_ADDED');
            expect(state.actionHistory[0].data.guestId).toBe('g1');
            expect(state.actionHistory[0].id).toBeDefined();
            expect(state.actionHistory[0].timestamp).toBeDefined();
        });

        it('adds a EXTRA_MEALS_ADDED action correctly', () => {
            const { addAction } = useActionHistoryStore.getState();
            addAction('EXTRA_MEALS_ADDED', { recordId: 'r1', guestId: 'g1', quantity: 2 });

            const state = useActionHistoryStore.getState();
            expect(state.actionHistory[0].type).toBe('EXTRA_MEALS_ADDED');
        });

        it('adds a SHOWER_BOOKED action correctly', () => {
            const { addAction } = useActionHistoryStore.getState();
            addAction('SHOWER_BOOKED', { recordId: 'r1', guestId: 'g1', slotId: 'slot-1' });

            const state = useActionHistoryStore.getState();
            expect(state.actionHistory[0].type).toBe('SHOWER_BOOKED');
        });

        it('adds a LAUNDRY_BOOKED action correctly', () => {
            const { addAction } = useActionHistoryStore.getState();
            addAction('LAUNDRY_BOOKED', { recordId: 'r1', guestId: 'g1' });

            const state = useActionHistoryStore.getState();
            expect(state.actionHistory[0].type).toBe('LAUNDRY_BOOKED');
        });

        it('adds a BICYCLE_LOGGED action correctly', () => {
            const { addAction } = useActionHistoryStore.getState();
            addAction('BICYCLE_LOGGED', { recordId: 'r1', guestId: 'g1' });

            const state = useActionHistoryStore.getState();
            expect(state.actionHistory[0].type).toBe('BICYCLE_LOGGED');
        });

        it('adds a HAIRCUT_LOGGED action correctly', () => {
            const { addAction } = useActionHistoryStore.getState();
            addAction('HAIRCUT_LOGGED', { recordId: 'r1', guestId: 'g1' });

            const state = useActionHistoryStore.getState();
            expect(state.actionHistory[0].type).toBe('HAIRCUT_LOGGED');
        });

        it('adds a HOLIDAY_LOGGED action correctly', () => {
            const { addAction } = useActionHistoryStore.getState();
            addAction('HOLIDAY_LOGGED', { recordId: 'r1', guestId: 'g1' });

            const state = useActionHistoryStore.getState();
            expect(state.actionHistory[0].type).toBe('HOLIDAY_LOGGED');
        });

        it('adds multiple actions and maintains order (newest first)', () => {
            const { addAction } = useActionHistoryStore.getState();
            addAction('MEAL_ADDED', { recordId: 'r1', guestId: 'g1' });
            addAction('SHOWER_BOOKED', { recordId: 'r2', guestId: 'g2' });
            addAction('LAUNDRY_BOOKED', { recordId: 'r3', guestId: 'g3' });

            const state = useActionHistoryStore.getState();
            expect(state.actionHistory.length).toBe(3);
            expect(state.actionHistory[0].type).toBe('LAUNDRY_BOOKED'); // Most recent first
            expect(state.actionHistory[2].type).toBe('MEAL_ADDED'); // Oldest last
        });

        it('caps history size to MAX_ACTION_HISTORY', () => {
            const { addAction } = useActionHistoryStore.getState();
            for (let i = 0; i < MAX_ACTION_HISTORY + 25; i++) {
                addAction('MEAL_ADDED', { recordId: `r-${i}`, guestId: 'g1' });
            }

            const state = useActionHistoryStore.getState();
            expect(state.actionHistory.length).toBe(MAX_ACTION_HISTORY);
            expect(state.actionHistory[0].data.recordId).toBe(`r-${MAX_ACTION_HISTORY + 24}`);
        });
    });

    describe('clearHistory', () => {
        it('clears all actions from history', () => {
            const { addAction, clearHistory } = useActionHistoryStore.getState();
            addAction('MEAL_ADDED', { recordId: 'r1', guestId: 'g1' });
            addAction('SHOWER_BOOKED', { recordId: 'r2', guestId: 'g2' });

            expect(useActionHistoryStore.getState().actionHistory.length).toBe(2);

            clearHistory();

            expect(useActionHistoryStore.getState().actionHistory.length).toBe(0);
        });
    });

    describe('getActionsForGuestToday', () => {
        it('filters actions for a specific guest', () => {
            const { addAction, getActionsForGuestToday } = useActionHistoryStore.getState();
            addAction('MEAL_ADDED', { recordId: 'r1', guestId: 'g1' });
            addAction('SHOWER_BOOKED', { recordId: 'r2', guestId: 'g2' });
            addAction('LAUNDRY_BOOKED', { recordId: 'r3', guestId: 'g1' });

            const g1Actions = getActionsForGuestToday('g1');
            expect(g1Actions.length).toBe(2);
            expect(g1Actions.every(a => a.data.guestId === 'g1')).toBe(true);
        });

        it('returns empty array for guest with no actions', () => {
            const { addAction, getActionsForGuestToday } = useActionHistoryStore.getState();
            addAction('MEAL_ADDED', { recordId: 'r1', guestId: 'g1' });

            const g2Actions = getActionsForGuestToday('g2');
            expect(g2Actions.length).toBe(0);
        });
    });

    describe('undoAction', () => {
        it('undoes a MEAL_ADDED action correctly', async () => {
            const { addAction, undoAction } = useActionHistoryStore.getState();
            addAction('MEAL_ADDED', { recordId: 'r1', guestId: 'g1' });
            const actionId = useActionHistoryStore.getState().actionHistory[0].id;

            const success = await undoAction(actionId);

            expect(success).toBe(true);
            expect(mockMealsStore.deleteMealRecord).toHaveBeenCalledWith('r1');
            expect(useActionHistoryStore.getState().actionHistory.length).toBe(0);
        });

        it('undoes a EXTRA_MEALS_ADDED action correctly', async () => {
            const { addAction, undoAction } = useActionHistoryStore.getState();
            addAction('EXTRA_MEALS_ADDED', { recordId: 'r1', guestId: 'g1' });
            const actionId = useActionHistoryStore.getState().actionHistory[0].id;

            const success = await undoAction(actionId);

            expect(success).toBe(true);
            expect(mockMealsStore.deleteExtraMealRecord).toHaveBeenCalledWith('r1');
        });

        it('undoes a SHOWER_BOOKED action correctly', async () => {
            const { addAction, undoAction } = useActionHistoryStore.getState();
            addAction('SHOWER_BOOKED', { recordId: 'r1', guestId: 'g1' });
            const actionId = useActionHistoryStore.getState().actionHistory[0].id;

            const success = await undoAction(actionId);

            expect(success).toBe(true);
            expect(mockServicesStore.deleteShowerRecord).toHaveBeenCalledWith('r1');
        });

        it('undoes a LAUNDRY_BOOKED action correctly', async () => {
            const { addAction, undoAction } = useActionHistoryStore.getState();
            addAction('LAUNDRY_BOOKED', { recordId: 'r1', guestId: 'g1' });
            const actionId = useActionHistoryStore.getState().actionHistory[0].id;

            const success = await undoAction(actionId);

            expect(success).toBe(true);
            expect(mockServicesStore.deleteLaundryRecord).toHaveBeenCalledWith('r1');
        });

        it('undoes a BICYCLE_LOGGED action correctly', async () => {
            const { addAction, undoAction } = useActionHistoryStore.getState();
            addAction('BICYCLE_LOGGED', { recordId: 'r1', guestId: 'g1' });
            const actionId = useActionHistoryStore.getState().actionHistory[0].id;

            const success = await undoAction(actionId);

            expect(success).toBe(true);
            expect(mockServicesStore.deleteBicycleRecord).toHaveBeenCalledWith('r1');
        });

        it('undoes a HAIRCUT_LOGGED action correctly', async () => {
            const { addAction, undoAction } = useActionHistoryStore.getState();
            addAction('HAIRCUT_LOGGED', { recordId: 'r1', guestId: 'g1' });
            const actionId = useActionHistoryStore.getState().actionHistory[0].id;

            const success = await undoAction(actionId);

            expect(success).toBe(true);
            expect(mockServicesStore.deleteHaircutRecord).toHaveBeenCalledWith('r1');
        });

        it('undoes a HOLIDAY_LOGGED action correctly', async () => {
            const { addAction, undoAction } = useActionHistoryStore.getState();
            addAction('HOLIDAY_LOGGED', { recordId: 'r1', guestId: 'g1' });
            const actionId = useActionHistoryStore.getState().actionHistory[0].id;

            const success = await undoAction(actionId);

            expect(success).toBe(true);
            expect(mockServicesStore.deleteHolidayRecord).toHaveBeenCalledWith('r1');
        });

        it('returns false when undoing non-existent action', async () => {
            const { undoAction } = useActionHistoryStore.getState();
            const success = await undoAction('invalid-id');
            expect(success).toBe(false);
        });

        it('returns false for unknown action type', async () => {
            useActionHistoryStore.setState({
                actionHistory: [{
                    id: 'unknown-action',
                    type: 'UNKNOWN_TYPE' as any,
                    timestamp: new Date().toISOString(),
                    data: { recordId: 'r1', guestId: 'g1' },
                }],
            });

            const { undoAction } = useActionHistoryStore.getState();
            const success = await undoAction('unknown-action');
            expect(success).toBe(false);
        });

        it('returns false and shows toast on delete error', async () => {
            mockMealsStore.deleteMealRecord.mockRejectedValueOnce(new Error('Delete failed'));

            const { addAction, undoAction } = useActionHistoryStore.getState();
            addAction('MEAL_ADDED', { recordId: 'r1', guestId: 'g1' });
            const actionId = useActionHistoryStore.getState().actionHistory[0].id;

            const success = await undoAction(actionId);

            expect(success).toBe(false);
            // Action should still be in history since undo failed
            expect(useActionHistoryStore.getState().actionHistory.length).toBe(1);
        });

        it('removes action from history after successful undo', async () => {
            const { addAction, undoAction } = useActionHistoryStore.getState();
            addAction('MEAL_ADDED', { recordId: 'r1', guestId: 'g1' });
            addAction('SHOWER_BOOKED', { recordId: 'r2', guestId: 'g2' });

            const actionId = useActionHistoryStore.getState().actionHistory[0].id;
            await undoAction(actionId);

            expect(useActionHistoryStore.getState().actionHistory.length).toBe(1);
            expect(useActionHistoryStore.getState().actionHistory[0].type).toBe('MEAL_ADDED');
        });
    });
});
