import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn(),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn(),
}));

vi.mock('@/stores/useActionHistoryStore', () => ({
    useActionHistoryStore: vi.fn(),
}));

vi.mock('@/stores/useBlockedSlotsStore', () => ({
    useBlockedSlotsStore: vi.fn(),
}));

import { useServicesStore } from '@/stores/useServicesStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { useActionHistoryStore } from '@/stores/useActionHistoryStore';
import { useBlockedSlotsStore } from '@/stores/useBlockedSlotsStore';
import { useNextAvailableSlots, useTodayStatusMaps } from '../todayStatusSelectors';

describe('useNextAvailableSlots', () => {
    const mockUseServicesStore = useServicesStore as unknown as ReturnType<typeof vi.fn>;
    const mockUseBlockedSlotsStore = useBlockedSlotsStore as unknown as ReturnType<typeof vi.fn>;
    const mockUseMealsStore = useMealsStore as unknown as ReturnType<typeof vi.fn>;
    const mockUseActionHistoryStore = useActionHistoryStore as unknown as ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-20T20:00:00Z'));

        mockUseMealsStore.mockImplementation((selector: any) => selector({
            mealRecords: [],
            extraMealRecords: [],
        }));
        mockUseActionHistoryStore.mockImplementation((selector: any) => selector({
            actionHistory: [],
        }));
        mockUseBlockedSlotsStore.mockImplementation((selector: any) => selector({
            isSlotBlocked: () => false,
        }));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    const setupServicesStore = (overrides: {
        showerRecords?: any[];
        laundryRecords?: any[];
    } = {}) => {
        const state = {
            showerRecords: overrides.showerRecords ?? [],
            laundryRecords: overrides.laundryRecords ?? [],
            bicycleRecords: [],
            haircutRecords: [],
            holidayRecords: [],
        };
        mockUseServicesStore.mockImplementation((selector: any) => selector(state));
    };

    it('returns first slots when no bookings exist', () => {
        setupServicesStore();
        const { result } = renderHook(() => useNextAvailableSlots());
        expect(result.current.nextAvailableShowerSlot?.slotTime).toBe('07:30');
        expect(result.current.nextAvailableLaundrySlot?.slotLabel).toBe('07:30 - 08:30');
    });

    it('advances shower slot when 07:30 is fully booked', () => {
        setupServicesStore({
            showerRecords: [
                { id: 's1', guestId: 'g1', dateKey: '2026-01-20', time: '07:30', status: 'awaiting' },
                { id: 's2', guestId: 'g2', dateKey: '2026-01-20', time: '07:30', status: 'done' },
            ],
        });
        const { result } = renderHook(() => useNextAvailableSlots());
        expect(result.current.nextAvailableShowerSlot?.slotTime).toBe('08:00');
    });

    it('advances laundry slot when 07:30 - 08:30 is booked', () => {
        setupServicesStore({
            laundryRecords: [
                { id: 'l1', guestId: 'g1', dateKey: '2026-01-20', time: '07:30 - 08:30', laundryType: 'onsite', status: 'waiting' },
            ],
        });
        const { result } = renderHook(() => useNextAvailableSlots());
        expect(result.current.nextAvailableLaundrySlot?.slotLabel).toBe('08:00 - 09:00');
    });

    it('skips blocked shower slot', () => {
        setupServicesStore();
        mockUseBlockedSlotsStore.mockImplementation((selector: any) => selector({
            isSlotBlocked: (service: string, slot: string) => service === 'shower' && slot === '07:30',
        }));
        const { result } = renderHook(() => useNextAvailableSlots());
        expect(result.current.nextAvailableShowerSlot?.slotTime).toBe('08:00');
    });

    it('skips blocked laundry slot', () => {
        setupServicesStore();
        mockUseBlockedSlotsStore.mockImplementation((selector: any) => selector({
            isSlotBlocked: (service: string, slot: string) => service === 'laundry' && slot === '07:30 - 08:30',
        }));
        const { result } = renderHook(() => useNextAvailableSlots());
        expect(result.current.nextAvailableLaundrySlot?.slotLabel).toBe('08:00 - 09:00');
    });

    it('useTodayStatusMaps returns next available slots', () => {
        setupServicesStore({
            showerRecords: [
                { id: 's1', guestId: 'g1', dateKey: '2026-01-20', time: '07:30', status: 'awaiting' },
                { id: 's2', guestId: 'g2', dateKey: '2026-01-20', time: '07:30', status: 'done' },
            ],
            laundryRecords: [
                { id: 'l1', guestId: 'g1', dateKey: '2026-01-20', time: '07:30 - 08:30', laundryType: 'onsite', status: 'waiting' },
            ],
        });
        const { result } = renderHook(() => useTodayStatusMaps());
        expect(result.current.nextAvailableShowerSlot?.slotTime).toBe('08:00');
        expect(result.current.nextAvailableLaundrySlot?.slotLabel).toBe('08:00 - 09:00');
    });
});
