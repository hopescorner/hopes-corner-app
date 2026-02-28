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

import { useServicesStore } from '@/stores/useServicesStore';
import { renderHook } from '@testing-library/react';
import { useTodayServiceStatusMap } from '../todayStatusSelectors';

describe('useTodayServiceStatusMap', () => {
    const mockUseServicesStore = useServicesStore as unknown as ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.useFakeTimers();
        // 2026-01-20 12:00 PM Pacific
        vi.setSystemTime(new Date('2026-01-20T20:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    const setupStore = (overrides: {
        showerRecords?: any[];
        laundryRecords?: any[];
        bicycleRecords?: any[];
        haircutRecords?: any[];
        holidayRecords?: any[];
    } = {}) => {
        const state = {
            showerRecords: overrides.showerRecords ?? [],
            laundryRecords: overrides.laundryRecords ?? [],
            bicycleRecords: overrides.bicycleRecords ?? [],
            haircutRecords: overrides.haircutRecords ?? [],
            holidayRecords: overrides.holidayRecords ?? [],
        };
        mockUseServicesStore.mockImplementation((selector: any) => selector(state));
    };

    it('returns empty map when no records exist', () => {
        setupStore();
        const { result } = renderHook(() => useTodayServiceStatusMap());
        expect(result.current.size).toBe(0);
    });

    describe('shower records', () => {
        it('maps shower record for today', () => {
            setupStore({
                showerRecords: [
                    { id: 's1', guestId: 'g1', date: '2026-01-20T18:00:00Z', dateKey: '2026-01-20', time: '08:30', status: 'awaiting' },
                ],
            });

            const { result } = renderHook(() => useTodayServiceStatusMap());
            const status = result.current.get('g1');

            expect(status).toBeDefined();
            expect(status!.hasShower).toBe(true);
            expect(status!.showerRecord).toEqual({ id: 's1', time: '08:30', status: 'awaiting' });
        });

        it('ignores shower records from other days', () => {
            setupStore({
                showerRecords: [
                    { id: 's1', guestId: 'g1', date: '2026-01-19T18:00:00Z', dateKey: '2026-01-19', time: '08:30', status: 'awaiting' },
                ],
            });

            const { result } = renderHook(() => useTodayServiceStatusMap());
            expect(result.current.size).toBe(0);
        });
    });

    describe('laundry records', () => {
        it('maps laundry record for today', () => {
            setupStore({
                laundryRecords: [
                    { id: 'l1', guestId: 'g1', date: '2026-01-20T18:00:00Z', dateKey: '2026-01-20', time: '07:30 - 08:30', status: 'waiting' },
                ],
            });

            const { result } = renderHook(() => useTodayServiceStatusMap());
            const status = result.current.get('g1');

            expect(status!.hasLaundry).toBe(true);
            expect(status!.laundryRecord).toEqual({ id: 'l1', time: '07:30 - 08:30', status: 'waiting' });
        });
    });

    describe('bicycle records', () => {
        it('maps bicycle record for today', () => {
            setupStore({
                bicycleRecords: [
                    { id: 'b1', guestId: 'g1', date: '2026-01-20T18:00:00Z', dateKey: '2026-01-20', status: 'pending' },
                ],
            });

            const { result } = renderHook(() => useTodayServiceStatusMap());
            const status = result.current.get('g1');

            expect(status!.hasBicycle).toBe(true);
            expect(status!.bicycleRecord).toEqual({ id: 'b1', status: 'pending' });
        });
    });

    describe('haircut records', () => {
        it('maps haircut record for today', () => {
            setupStore({
                haircutRecords: [
                    { id: 'h1', guestId: 'g1', date: '2026-01-20T18:00:00Z', dateKey: '2026-01-20' },
                ],
            });

            const { result } = renderHook(() => useTodayServiceStatusMap());
            const status = result.current.get('g1');

            expect(status!.hasHaircut).toBe(true);
            expect(status!.haircutRecord).toEqual({ id: 'h1' });
        });
    });

    describe('holiday records', () => {
        it('maps holiday record for today', () => {
            setupStore({
                holidayRecords: [
                    { id: 'ho1', guestId: 'g1', date: '2026-01-20T18:00:00Z', dateKey: '2026-01-20' },
                ],
            });

            const { result } = renderHook(() => useTodayServiceStatusMap());
            const status = result.current.get('g1');

            expect(status!.hasHoliday).toBe(true);
            expect(status!.holidayRecord).toEqual({ id: 'ho1' });
        });
    });

    describe('multiple services for same guest', () => {
        it('aggregates all services into one status object', () => {
            setupStore({
                showerRecords: [
                    { id: 's1', guestId: 'g1', date: '2026-01-20T18:00:00Z', dateKey: '2026-01-20', time: '09:00', status: 'done' },
                ],
                laundryRecords: [
                    { id: 'l1', guestId: 'g1', date: '2026-01-20T18:00:00Z', dateKey: '2026-01-20', time: '08:00 - 09:00', status: 'washer' },
                ],
                bicycleRecords: [
                    { id: 'b1', guestId: 'g1', date: '2026-01-20T18:00:00Z', dateKey: '2026-01-20', status: 'in_progress' },
                ],
                haircutRecords: [
                    { id: 'h1', guestId: 'g1', date: '2026-01-20T18:00:00Z', dateKey: '2026-01-20' },
                ],
                holidayRecords: [
                    { id: 'ho1', guestId: 'g1', date: '2026-01-20T18:00:00Z', dateKey: '2026-01-20' },
                ],
            });

            const { result } = renderHook(() => useTodayServiceStatusMap());
            const status = result.current.get('g1');

            expect(status!.hasShower).toBe(true);
            expect(status!.hasLaundry).toBe(true);
            expect(status!.hasBicycle).toBe(true);
            expect(status!.hasHaircut).toBe(true);
            expect(status!.hasHoliday).toBe(true);
        });
    });

    describe('multiple guests', () => {
        it('tracks each guest independently', () => {
            setupStore({
                showerRecords: [
                    { id: 's1', guestId: 'g1', date: '2026-01-20T18:00:00Z', dateKey: '2026-01-20', time: '08:30', status: 'awaiting' },
                    { id: 's2', guestId: 'g2', date: '2026-01-20T19:00:00Z', dateKey: '2026-01-20', time: '09:00', status: 'done' },
                ],
            });

            const { result } = renderHook(() => useTodayServiceStatusMap());

            expect(result.current.size).toBe(2);
            expect(result.current.get('g1')!.showerRecord!.status).toBe('awaiting');
            expect(result.current.get('g2')!.showerRecord!.status).toBe('done');
        });
    });

    describe('default status values', () => {
        it('initializes all service flags to false', () => {
            setupStore({
                showerRecords: [
                    { id: 's1', guestId: 'g1', date: '2026-01-20T18:00:00Z', dateKey: '2026-01-20', time: '08:30', status: 'awaiting' },
                ],
            });

            const { result } = renderHook(() => useTodayServiceStatusMap());
            const status = result.current.get('g1');

            // Only shower should be true
            expect(status!.hasShower).toBe(true);
            expect(status!.hasLaundry).toBe(false);
            expect(status!.hasBicycle).toBe(false);
            expect(status!.hasHaircut).toBe(false);
            expect(status!.hasHoliday).toBe(false);
        });
    });

    describe('nullable record arrays', () => {
        it('handles null bicycleRecords gracefully', () => {
            mockUseServicesStore.mockImplementation((selector: any) =>
                selector({
                    showerRecords: [],
                    laundryRecords: [],
                    bicycleRecords: null,
                    haircutRecords: [],
                    holidayRecords: [],
                })
            );

            const { result } = renderHook(() => useTodayServiceStatusMap());
            expect(result.current.size).toBe(0);
        });

        it('handles null haircutRecords gracefully', () => {
            mockUseServicesStore.mockImplementation((selector: any) =>
                selector({
                    showerRecords: [],
                    laundryRecords: [],
                    bicycleRecords: [],
                    haircutRecords: null,
                    holidayRecords: [],
                })
            );

            const { result } = renderHook(() => useTodayServiceStatusMap());
            expect(result.current.size).toBe(0);
        });

        it('handles null holidayRecords gracefully', () => {
            mockUseServicesStore.mockImplementation((selector: any) =>
                selector({
                    showerRecords: [],
                    laundryRecords: [],
                    bicycleRecords: [],
                    haircutRecords: [],
                    holidayRecords: null,
                })
            );

            const { result } = renderHook(() => useTodayServiceStatusMap());
            expect(result.current.size).toBe(0);
        });
    });

    describe('dateKey fallback', () => {
        it('falls back to pacificDateStringFrom when dateKey is missing', () => {
            setupStore({
                showerRecords: [
                    { id: 's1', guestId: 'g1', date: '2026-01-20T20:00:00Z', time: '08:30', status: 'awaiting' },
                ],
            });

            const { result } = renderHook(() => useTodayServiceStatusMap());
            expect(result.current.get('g1')!.hasShower).toBe(true);
        });
    });
});
