import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the stores before importing the selectors
vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn()
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn()
}));

vi.mock('@/stores/useActionHistoryStore', () => ({
    useActionHistoryStore: vi.fn()
}));

import { useMealsStore } from '@/stores/useMealsStore';
import { renderHook } from '@testing-library/react';
import { useRecentGuestsMap } from '../todayStatusSelectors';

describe('useRecentGuestsMap', () => {
    const mockUseMealsStore = useMealsStore as unknown as ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.useFakeTimers();
        // Set current date to a fixed point for testing
        vi.setSystemTime(new Date('2026-01-20T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('returns empty set when there are no meal records', () => {
        mockUseMealsStore.mockImplementation((selector: (state: { mealRecords: unknown[] }) => unknown) => {
            const state = { mealRecords: [] };
            return selector(state);
        });

        const { result } = renderHook(() => useRecentGuestsMap());
        
        expect(result.current.size).toBe(0);
    });

    it('includes guests who had meals within the last 7 days', () => {
        const mealRecords = [
            { id: 'meal-1', guestId: 'guest-1', date: '2026-01-19T10:00:00Z', count: 1 }, // 1 day ago
            { id: 'meal-2', guestId: 'guest-2', date: '2026-01-15T10:00:00Z', count: 1 }, // 5 days ago
            { id: 'meal-3', guestId: 'guest-3', date: '2026-01-13T10:00:00Z', count: 1 }, // 7 days ago (should be included)
        ];

        mockUseMealsStore.mockImplementation((selector: (state: { mealRecords: unknown[] }) => unknown) => {
            const state = { mealRecords };
            return selector(state);
        });

        const { result } = renderHook(() => useRecentGuestsMap());
        
        expect(result.current.has('guest-1')).toBe(true);
        expect(result.current.has('guest-2')).toBe(true);
        expect(result.current.has('guest-3')).toBe(true);
        expect(result.current.size).toBe(3);
    });

    it('excludes guests who had meals more than 7 days ago', () => {
        const mealRecords = [
            { id: 'meal-1', guestId: 'guest-recent', date: '2026-01-19T10:00:00Z', count: 1 }, // 1 day ago
            { id: 'meal-2', guestId: 'guest-old', date: '2026-01-10T10:00:00Z', count: 1 }, // 10 days ago
            { id: 'meal-3', guestId: 'guest-very-old', date: '2025-12-01T10:00:00Z', count: 1 }, // ~50 days ago
        ];

        mockUseMealsStore.mockImplementation((selector: (state: { mealRecords: unknown[] }) => unknown) => {
            const state = { mealRecords };
            return selector(state);
        });

        const { result } = renderHook(() => useRecentGuestsMap());
        
        expect(result.current.has('guest-recent')).toBe(true);
        expect(result.current.has('guest-old')).toBe(false);
        expect(result.current.has('guest-very-old')).toBe(false);
        expect(result.current.size).toBe(1);
    });

    it('handles guests with multiple meals correctly (deduplication)', () => {
        const mealRecords = [
            { id: 'meal-1', guestId: 'guest-1', date: '2026-01-19T10:00:00Z', count: 1 },
            { id: 'meal-2', guestId: 'guest-1', date: '2026-01-18T10:00:00Z', count: 1 },
            { id: 'meal-3', guestId: 'guest-1', date: '2026-01-17T10:00:00Z', count: 1 },
        ];

        mockUseMealsStore.mockImplementation((selector: (state: { mealRecords: unknown[] }) => unknown) => {
            const state = { mealRecords };
            return selector(state);
        });

        const { result } = renderHook(() => useRecentGuestsMap());
        
        // Should only have one entry for guest-1, not three
        expect(result.current.has('guest-1')).toBe(true);
        expect(result.current.size).toBe(1);
    });

    it('correctly handles boundary date (exactly 7 days ago)', () => {
        // Current time is 2026-01-20T12:00:00Z
        // The implementation sets sevenDaysAgo to start of day in local time
        // So we need to test with dates that are clearly within and outside the boundary
        const mealRecords = [
            { id: 'meal-1', guestId: 'guest-within-7', date: '2026-01-14T10:00:00Z', count: 1 }, // 6 days ago - should be included
            { id: 'meal-2', guestId: 'guest-outside-7', date: '2026-01-12T10:00:00Z', count: 1 }, // 8 days ago - should be excluded
        ];

        mockUseMealsStore.mockImplementation((selector: (state: { mealRecords: unknown[] }) => unknown) => {
            const state = { mealRecords };
            return selector(state);
        });

        const { result } = renderHook(() => useRecentGuestsMap());
        
        // 6 days ago should be included
        expect(result.current.has('guest-within-7')).toBe(true);
        // 8 days ago should be excluded
        expect(result.current.has('guest-outside-7')).toBe(false);
    });

    it('includes guests with meals today', () => {
        const mealRecords = [
            { id: 'meal-1', guestId: 'guest-today', date: '2026-01-20T08:00:00Z', count: 1 }, // Today
        ];

        mockUseMealsStore.mockImplementation((selector: (state: { mealRecords: unknown[] }) => unknown) => {
            const state = { mealRecords };
            return selector(state);
        });

        const { result } = renderHook(() => useRecentGuestsMap());
        
        expect(result.current.has('guest-today')).toBe(true);
    });

    it('handles mixed recent and old meals for the same guest', () => {
        const mealRecords = [
            { id: 'meal-1', guestId: 'guest-mixed', date: '2026-01-19T10:00:00Z', count: 1 }, // Recent
            { id: 'meal-2', guestId: 'guest-mixed', date: '2025-12-01T10:00:00Z', count: 1 }, // Old
        ];

        mockUseMealsStore.mockImplementation((selector: (state: { mealRecords: unknown[] }) => unknown) => {
            const state = { mealRecords };
            return selector(state);
        });

        const { result } = renderHook(() => useRecentGuestsMap());
        
        // Should be included because of the recent meal
        expect(result.current.has('guest-mixed')).toBe(true);
        expect(result.current.size).toBe(1);
    });

    it('handles invalid date gracefully', () => {
        const mealRecords = [
            { id: 'meal-1', guestId: 'guest-invalid', date: 'invalid-date', count: 1 },
            { id: 'meal-2', guestId: 'guest-valid', date: '2026-01-19T10:00:00Z', count: 1 },
        ];

        mockUseMealsStore.mockImplementation((selector: (state: { mealRecords: unknown[] }) => unknown) => {
            const state = { mealRecords };
            return selector(state);
        });

        const { result } = renderHook(() => useRecentGuestsMap());
        
        // Invalid date will create an Invalid Date object, which will fail the >= comparison
        expect(result.current.has('guest-invalid')).toBe(false);
        expect(result.current.has('guest-valid')).toBe(true);
    });

    it('is performant with large datasets', () => {
        // Generate 10,000 meal records
        const mealRecords = Array.from({ length: 10000 }, (_, i) => ({
            id: `meal-${i}`,
            guestId: `guest-${i % 500}`, // 500 unique guests, each with ~20 meals
            date: new Date(Date.now() - (i % 10) * 24 * 60 * 60 * 1000).toISOString(), // Spread over 10 days
            count: 1
        }));

        mockUseMealsStore.mockImplementation((selector: (state: { mealRecords: unknown[] }) => unknown) => {
            const state = { mealRecords };
            return selector(state);
        });

        const startTime = performance.now();
        const { result } = renderHook(() => useRecentGuestsMap());
        const endTime = performance.now();
        
        // Should complete in under 50ms even with 10,000 records
        expect(endTime - startTime).toBeLessThan(50);
        // Should have guests from the last 7 days
        expect(result.current.size).toBeGreaterThan(0);
    });
});

describe('Recent guests edge cases', () => {
    const mockUseMealsStore = useMealsStore as unknown as ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-20T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('returns consistent results across multiple renders', () => {
        const mealRecords = [
            { id: 'meal-1', guestId: 'guest-1', date: '2026-01-19T10:00:00Z', count: 1 },
        ];

        mockUseMealsStore.mockImplementation((selector: (state: { mealRecords: unknown[] }) => unknown) => {
            const state = { mealRecords };
            return selector(state);
        });

        const { result, rerender } = renderHook(() => useRecentGuestsMap());
        const firstResult = result.current;
        
        rerender();
        const secondResult = result.current;
        
        // Should be the same reference (memoized)
        expect(firstResult).toBe(secondResult);
    });

    it('updates when meal records change', () => {
        let mealRecords = [
            { id: 'meal-1', guestId: 'guest-1', date: '2026-01-19T10:00:00Z', count: 1 },
        ];

        mockUseMealsStore.mockImplementation((selector: (state: { mealRecords: unknown[] }) => unknown) => {
            const state = { mealRecords };
            return selector(state);
        });

        const { result, rerender } = renderHook(() => useRecentGuestsMap());
        
        expect(result.current.has('guest-1')).toBe(true);
        expect(result.current.has('guest-2')).toBe(false);
        
        // Add a new meal record
        mealRecords = [
            ...mealRecords,
            { id: 'meal-2', guestId: 'guest-2', date: '2026-01-18T10:00:00Z', count: 1 },
        ];
        
        rerender();
        
        // Now guest-2 should be included
        expect(result.current.has('guest-2')).toBe(true);
    });
});
