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
import { useServicesStore } from '@/stores/useServicesStore';
import { renderHook } from '@testing-library/react';
import { useLastVisitDateMap } from '../todayStatusSelectors';

const mockUseMealsStore = useMealsStore as unknown as ReturnType<typeof vi.fn>;
const mockUseServicesStore = useServicesStore as unknown as ReturnType<typeof vi.fn>;

const emptyMealsState = { mealRecords: [], extraMealRecords: [] };
const emptyServicesState = {
    showerRecords: [],
    laundryRecords: [],
    bicycleRecords: [],
    haircutRecords: [],
    holidayRecords: [],
};

function setupMocks(
    mealsOverrides: Partial<typeof emptyMealsState> = {},
    servicesOverrides: Partial<typeof emptyServicesState> = {}
) {
    const mealsState = { ...emptyMealsState, ...mealsOverrides };
    const servicesState = { ...emptyServicesState, ...servicesOverrides };

    mockUseMealsStore.mockImplementation((selector: (s: typeof mealsState) => unknown) =>
        selector(mealsState)
    );
    mockUseServicesStore.mockImplementation((selector: (s: typeof servicesState) => unknown) =>
        selector(servicesState)
    );
}

describe('useLastVisitDateMap', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-20T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('returns an empty map when there are no records', () => {
        setupMocks();
        const { result } = renderHook(() => useLastVisitDateMap());
        expect(result.current.size).toBe(0);
    });

    it('picks up the date from a meal record', () => {
        setupMocks({
            mealRecords: [
                { id: 'm1', guestId: 'g1', date: '2026-01-15T10:00:00Z', count: 1 },
            ],
        });
        const { result } = renderHook(() => useLastVisitDateMap());
        expect(result.current.get('g1')).toBe('2026-01-15');
    });

    it('picks up the date from a shower record', () => {
        setupMocks({}, {
            showerRecords: [
                { id: 's1', guestId: 'g2', date: '2026-01-18T10:00:00Z', status: 'done' },
            ],
        });
        const { result } = renderHook(() => useLastVisitDateMap());
        expect(result.current.get('g2')).toBe('2026-01-18');
    });

    it('picks up the date from a laundry record', () => {
        setupMocks({}, {
            laundryRecords: [
                { id: 'l1', guestId: 'g3', date: '2026-01-17T10:00:00Z', status: 'done' },
            ],
        });
        const { result } = renderHook(() => useLastVisitDateMap());
        expect(result.current.get('g3')).toBe('2026-01-17');
    });

    it('picks up the date from a bicycle record', () => {
        setupMocks({}, {
            bicycleRecords: [
                { id: 'b1', guestId: 'g4', date: '2026-01-16T10:00:00Z', status: 'done' },
            ],
        });
        const { result } = renderHook(() => useLastVisitDateMap());
        expect(result.current.get('g4')).toBe('2026-01-16');
    });

    it('picks up the date from a haircut record via serviceDate', () => {
        setupMocks({}, {
            haircutRecords: [
                { id: 'h1', guestId: 'g5', date: '2026-01-14T10:00:00Z', serviceDate: '2026-01-14', type: 'haircut' },
            ],
        });
        const { result } = renderHook(() => useLastVisitDateMap());
        expect(result.current.get('g5')).toBe('2026-01-14');
    });

    it('picks up the date from a holiday record', () => {
        setupMocks({}, {
            holidayRecords: [
                { id: 'hv1', guestId: 'g6', date: '2026-01-13T10:00:00Z', type: 'holiday' },
            ],
        });
        const { result } = renderHook(() => useLastVisitDateMap());
        expect(result.current.get('g6')).toBe('2026-01-13');
    });

    it('returns the most recent date across multiple service types for the same guest', () => {
        setupMocks(
            {
                mealRecords: [
                    { id: 'm1', guestId: 'g1', date: '2026-01-10T10:00:00Z', count: 1 },
                ],
            },
            {
                showerRecords: [
                    { id: 's1', guestId: 'g1', date: '2026-01-18T10:00:00Z', status: 'done' },
                ],
                bicycleRecords: [
                    { id: 'b1', guestId: 'g1', date: '2026-01-15T10:00:00Z', status: 'done' },
                ],
            }
        );
        const { result } = renderHook(() => useLastVisitDateMap());
        // Shower on Jan 18 is the most recent
        expect(result.current.get('g1')).toBe('2026-01-18');
    });

    it('handles multiple guests independently', () => {
        setupMocks(
            {
                mealRecords: [
                    { id: 'm1', guestId: 'g1', date: '2026-01-15T10:00:00Z', count: 1 },
                    { id: 'm2', guestId: 'g2', date: '2026-01-10T10:00:00Z', count: 1 },
                ],
            }
        );
        const { result } = renderHook(() => useLastVisitDateMap());
        expect(result.current.get('g1')).toBe('2026-01-15');
        expect(result.current.get('g2')).toBe('2026-01-10');
        expect(result.current.size).toBe(2);
    });

    it('prefers serviceDate over dateKey over computed date for haircut records', () => {
        setupMocks({}, {
            haircutRecords: [
                {
                    id: 'h1',
                    guestId: 'g1',
                    date: '2026-01-10T10:00:00Z',
                    dateKey: '2026-01-12',
                    serviceDate: '2026-01-14',
                    type: 'haircut',
                },
            ],
        });
        const { result } = renderHook(() => useLastVisitDateMap());
        // serviceDate takes priority
        expect(result.current.get('g1')).toBe('2026-01-14');
    });

    it('uses dateKey when available instead of computing from date', () => {
        setupMocks({
            mealRecords: [
                { id: 'm1', guestId: 'g1', date: '2026-01-10T10:00:00Z', dateKey: '2026-01-11', count: 1 },
            ],
        });
        const { result } = renderHook(() => useLastVisitDateMap());
        expect(result.current.get('g1')).toBe('2026-01-11');
    });

    it('returns a memoized result when inputs have not changed', () => {
        setupMocks({
            mealRecords: [{ id: 'm1', guestId: 'g1', date: '2026-01-15T10:00:00Z', count: 1 }],
        });

        const { result, rerender } = renderHook(() => useLastVisitDateMap());
        const first = result.current;

        rerender();

        expect(result.current).toBe(first);
    });

    it('handles records with missing or empty guestId gracefully', () => {
        setupMocks({
            mealRecords: [
                { id: 'm1', guestId: '', date: '2026-01-15T10:00:00Z', count: 1 },
                { id: 'm2', guestId: undefined as any, date: '2026-01-15T10:00:00Z', count: 1 },
                { id: 'm3', guestId: 'g1', date: '2026-01-15T10:00:00Z', count: 1 },
            ],
        });
        const { result } = renderHook(() => useLastVisitDateMap());
        // Only g1 should be present; empty/undefined guestIds are skipped
        expect(result.current.size).toBe(1);
        expect(result.current.get('g1')).toBe('2026-01-15');
    });
});
