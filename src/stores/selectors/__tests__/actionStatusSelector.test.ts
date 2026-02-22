import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the stores before importing the selectors
vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn(),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn(),
}));

vi.mock('@/stores/useActionHistoryStore', () => ({
    useActionHistoryStore: vi.fn(),
}));

import { useActionHistoryStore } from '@/stores/useActionHistoryStore';
import { renderHook } from '@testing-library/react';
import { useTodayActionStatusMap } from '../todayStatusSelectors';

describe('useTodayActionStatusMap', () => {
    const mockUseActionHistoryStore = useActionHistoryStore as unknown as ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.useFakeTimers();
        // Use a date that's in Pacific time "today"
        vi.setSystemTime(new Date('2026-01-20T20:00:00Z')); // 12:00 PM Pacific
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('returns empty map when no actions exist', () => {
        mockUseActionHistoryStore.mockImplementation((selector: any) => {
            return selector({ actionHistory: [] });
        });

        const { result } = renderHook(() => useTodayActionStatusMap());
        expect(result.current.size).toBe(0);
    });

    it('maps MEAL_ADDED actions to mealActionId', () => {
        mockUseActionHistoryStore.mockImplementation((selector: any) => {
            return selector({
                actionHistory: [
                    { id: 'act-1', type: 'MEAL_ADDED', timestamp: '2026-01-20T20:00:00Z', data: { guestId: 'g1', recordId: 'r1' } },
                ],
            });
        });

        const { result } = renderHook(() => useTodayActionStatusMap());
        expect(result.current.get('g1')?.mealActionId).toBe('act-1');
    });

    it('maps EXTRA_MEALS_ADDED actions to extraMealActionId', () => {
        mockUseActionHistoryStore.mockImplementation((selector: any) => {
            return selector({
                actionHistory: [
                    { id: 'act-2', type: 'EXTRA_MEALS_ADDED', timestamp: '2026-01-20T20:00:00Z', data: { guestId: 'g1', recordId: 'r2' } },
                ],
            });
        });

        const { result } = renderHook(() => useTodayActionStatusMap());
        expect(result.current.get('g1')?.extraMealActionId).toBe('act-2');
    });

    it('tracks both meal and extra meal actions for the same guest', () => {
        mockUseActionHistoryStore.mockImplementation((selector: any) => {
            return selector({
                actionHistory: [
                    { id: 'act-1', type: 'MEAL_ADDED', timestamp: '2026-01-20T20:00:00Z', data: { guestId: 'g1', recordId: 'r1' } },
                    { id: 'act-2', type: 'EXTRA_MEALS_ADDED', timestamp: '2026-01-20T20:00:00Z', data: { guestId: 'g1', recordId: 'r2' } },
                ],
            });
        });

        const { result } = renderHook(() => useTodayActionStatusMap());
        const g1 = result.current.get('g1');
        expect(g1?.mealActionId).toBe('act-1');
        expect(g1?.extraMealActionId).toBe('act-2');
    });

    it('only keeps the first action of each type per guest', () => {
        mockUseActionHistoryStore.mockImplementation((selector: any) => {
            return selector({
                actionHistory: [
                    { id: 'act-1', type: 'EXTRA_MEALS_ADDED', timestamp: '2026-01-20T20:00:00Z', data: { guestId: 'g1', recordId: 'r1' } },
                    { id: 'act-2', type: 'EXTRA_MEALS_ADDED', timestamp: '2026-01-20T20:00:00Z', data: { guestId: 'g1', recordId: 'r2' } },
                ],
            });
        });

        const { result } = renderHook(() => useTodayActionStatusMap());
        // Should keep the first one (act-1)
        expect(result.current.get('g1')?.extraMealActionId).toBe('act-1');
    });

    it('ignores actions from other days', () => {
        mockUseActionHistoryStore.mockImplementation((selector: any) => {
            return selector({
                actionHistory: [
                    { id: 'act-old', type: 'EXTRA_MEALS_ADDED', timestamp: '2026-01-19T20:00:00Z', data: { guestId: 'g1', recordId: 'r1' } },
                ],
            });
        });

        const { result } = renderHook(() => useTodayActionStatusMap());
        expect(result.current.size).toBe(0);
    });

    it('maps all service action types correctly', () => {
        mockUseActionHistoryStore.mockImplementation((selector: any) => {
            return selector({
                actionHistory: [
                    { id: 'act-meal', type: 'MEAL_ADDED', timestamp: '2026-01-20T20:00:00Z', data: { guestId: 'g1', recordId: 'r1' } },
                    { id: 'act-extra', type: 'EXTRA_MEALS_ADDED', timestamp: '2026-01-20T20:00:00Z', data: { guestId: 'g1', recordId: 'r2' } },
                    { id: 'act-shower', type: 'SHOWER_BOOKED', timestamp: '2026-01-20T20:00:00Z', data: { guestId: 'g1', recordId: 'r3' } },
                    { id: 'act-laundry', type: 'LAUNDRY_BOOKED', timestamp: '2026-01-20T20:00:00Z', data: { guestId: 'g1', recordId: 'r4' } },
                    { id: 'act-bike', type: 'BICYCLE_LOGGED', timestamp: '2026-01-20T20:00:00Z', data: { guestId: 'g1', recordId: 'r5' } },
                    { id: 'act-haircut', type: 'HAIRCUT_LOGGED', timestamp: '2026-01-20T20:00:00Z', data: { guestId: 'g1', recordId: 'r6' } },
                    { id: 'act-holiday', type: 'HOLIDAY_LOGGED', timestamp: '2026-01-20T20:00:00Z', data: { guestId: 'g1', recordId: 'r7' } },
                ],
            });
        });

        const { result } = renderHook(() => useTodayActionStatusMap());
        const g1 = result.current.get('g1');
        expect(g1?.mealActionId).toBe('act-meal');
        expect(g1?.extraMealActionId).toBe('act-extra');
        expect(g1?.showerActionId).toBe('act-shower');
        expect(g1?.laundryActionId).toBe('act-laundry');
        expect(g1?.bicycleActionId).toBe('act-bike');
        expect(g1?.haircutActionId).toBe('act-haircut');
        expect(g1?.holidayActionId).toBe('act-holiday');
    });
});
