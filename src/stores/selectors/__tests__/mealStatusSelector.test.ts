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

import { useMealsStore } from '@/stores/useMealsStore';
import { renderHook } from '@testing-library/react';
import { useTodayMealStatusMap } from '../todayStatusSelectors';

describe('useTodayMealStatusMap', () => {
    const mockUseMealsStore = useMealsStore as unknown as ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.useFakeTimers();
        // 2026-01-20 12:00 PM Pacific
        vi.setSystemTime(new Date('2026-01-20T20:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    const setupStore = (mealRecords: any[], extraMealRecords: any[] = []) => {
        mockUseMealsStore.mockImplementation((selector: any) => {
            return selector({ mealRecords, extraMealRecords });
        });
    };

    it('returns empty map when no records exist', () => {
        setupStore([], []);
        const { result } = renderHook(() => useTodayMealStatusMap());
        expect(result.current.size).toBe(0);
    });

    it('maps a single meal record for today', () => {
        setupStore([
            { id: 'm1', guestId: 'g1', date: '2026-01-20T20:00:00Z', dateKey: '2026-01-20', count: 1 },
        ]);

        const { result } = renderHook(() => useTodayMealStatusMap());
        const status = result.current.get('g1');

        expect(status).toBeDefined();
        expect(status!.hasMeal).toBe(true);
        expect(status!.mealCount).toBe(1);
        expect(status!.extraMealCount).toBe(0);
        expect(status!.totalMeals).toBe(1);
        expect(status!.hasReachedMealLimit).toBe(false);
        expect(status!.hasReachedExtraMealLimit).toBe(false);
    });

    it('accumulates multiple meal records for the same guest', () => {
        setupStore([
            { id: 'm1', guestId: 'g1', date: '2026-01-20T20:00:00Z', dateKey: '2026-01-20', count: 1 },
            { id: 'm2', guestId: 'g1', date: '2026-01-20T21:00:00Z', dateKey: '2026-01-20', count: 1 },
        ]);

        const { result } = renderHook(() => useTodayMealStatusMap());
        const status = result.current.get('g1');

        expect(status!.mealCount).toBe(2);
        expect(status!.totalMeals).toBe(2);
    });

    it('tracks extra meals separately', () => {
        setupStore(
            [{ id: 'm1', guestId: 'g1', date: '2026-01-20T20:00:00Z', dateKey: '2026-01-20', count: 1 }],
            [{ id: 'e1', guestId: 'g1', date: '2026-01-20T20:00:00Z', dateKey: '2026-01-20', count: 1 }],
        );

        const { result } = renderHook(() => useTodayMealStatusMap());
        const status = result.current.get('g1');

        expect(status!.mealCount).toBe(1);
        expect(status!.extraMealCount).toBe(1);
        expect(status!.totalMeals).toBe(2);
    });

    it('sets hasReachedMealLimit when total reaches MAX_TOTAL_MEALS_PER_DAY (4)', () => {
        setupStore(
            [
                { id: 'm1', guestId: 'g1', date: '2026-01-20T18:00:00Z', dateKey: '2026-01-20', count: 1 },
                { id: 'm2', guestId: 'g1', date: '2026-01-20T19:00:00Z', dateKey: '2026-01-20', count: 1 },
            ],
            [
                { id: 'e1', guestId: 'g1', date: '2026-01-20T20:00:00Z', dateKey: '2026-01-20', count: 1 },
                { id: 'e2', guestId: 'g1', date: '2026-01-20T21:00:00Z', dateKey: '2026-01-20', count: 1 },
            ],
        );

        const { result } = renderHook(() => useTodayMealStatusMap());
        const status = result.current.get('g1');

        expect(status!.totalMeals).toBe(4);
        expect(status!.hasReachedMealLimit).toBe(true);
    });

    it('sets hasReachedExtraMealLimit when extras reach MAX_EXTRA_MEALS_PER_DAY (2)', () => {
        setupStore(
            [],
            [
                { id: 'e1', guestId: 'g1', date: '2026-01-20T20:00:00Z', dateKey: '2026-01-20', count: 1 },
                { id: 'e2', guestId: 'g1', date: '2026-01-20T21:00:00Z', dateKey: '2026-01-20', count: 1 },
            ],
        );

        const { result } = renderHook(() => useTodayMealStatusMap());
        const status = result.current.get('g1');

        expect(status!.extraMealCount).toBe(2);
        expect(status!.hasReachedExtraMealLimit).toBe(true);
    });

    it('handles guest with only extra meals (no base meals)', () => {
        setupStore(
            [],
            [{ id: 'e1', guestId: 'g1', date: '2026-01-20T20:00:00Z', dateKey: '2026-01-20', count: 1 }],
        );

        const { result } = renderHook(() => useTodayMealStatusMap());
        const status = result.current.get('g1');

        expect(status!.hasMeal).toBe(false);
        expect(status!.mealCount).toBe(0);
        expect(status!.extraMealCount).toBe(1);
        expect(status!.totalMeals).toBe(1);
    });

    it('ignores records from other days', () => {
        setupStore([
            { id: 'm1', guestId: 'g1', date: '2026-01-19T20:00:00Z', dateKey: '2026-01-19', count: 1 },
        ]);

        const { result } = renderHook(() => useTodayMealStatusMap());
        expect(result.current.size).toBe(0);
    });

    it('tracks multiple guests independently', () => {
        setupStore([
            { id: 'm1', guestId: 'g1', date: '2026-01-20T18:00:00Z', dateKey: '2026-01-20', count: 1 },
            { id: 'm2', guestId: 'g2', date: '2026-01-20T19:00:00Z', dateKey: '2026-01-20', count: 1 },
        ]);

        const { result } = renderHook(() => useTodayMealStatusMap());
        expect(result.current.size).toBe(2);
        expect(result.current.get('g1')!.mealCount).toBe(1);
        expect(result.current.get('g2')!.mealCount).toBe(1);
    });

    it('uses record.count for multi-count meals', () => {
        setupStore([
            { id: 'm1', guestId: 'g1', date: '2026-01-20T20:00:00Z', dateKey: '2026-01-20', count: 3 },
        ]);

        const { result } = renderHook(() => useTodayMealStatusMap());
        const status = result.current.get('g1');

        expect(status!.mealCount).toBe(3);
        expect(status!.totalMeals).toBe(3);
    });

    it('defaults to count=1 when count is missing', () => {
        setupStore([
            { id: 'm1', guestId: 'g1', date: '2026-01-20T20:00:00Z', dateKey: '2026-01-20' },
        ]);

        const { result } = renderHook(() => useTodayMealStatusMap());
        expect(result.current.get('g1')!.mealCount).toBe(1);
    });

    it('stores the mealRecord reference on first meal', () => {
        const record = { id: 'm1', guestId: 'g1', date: '2026-01-20T20:00:00Z', dateKey: '2026-01-20', count: 1 };
        setupStore([record]);

        const { result } = renderHook(() => useTodayMealStatusMap());
        expect(result.current.get('g1')!.mealRecord).toBe(record);
    });

    it('handles null extraMealRecords gracefully', () => {
        mockUseMealsStore.mockImplementation((selector: any) => {
            return selector({ mealRecords: [], extraMealRecords: null });
        });

        const { result } = renderHook(() => useTodayMealStatusMap());
        expect(result.current.size).toBe(0);
    });
});
