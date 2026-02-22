import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { renderHook, act, render } from '@testing-library/react';
import { useRealtimeSync, RealtimeSyncProvider } from '../useRealtimeSync';
import React from 'react';

// Mock the realtime module
const mockSubscribeToTable: Mock = vi.fn(() => vi.fn());
const mockUnsubscribeFromAll = vi.fn();

vi.mock('@/lib/supabase/realtime', () => ({
    subscribeToTable: (options: unknown) => mockSubscribeToTable(options),
    unsubscribeFromAll: () => mockUnsubscribeFromAll(),
}));

// Mock the stores
const mockServicesLoadFromSupabase = vi.fn();
const mockServicesSetState = vi.fn();
const mockMealsLoadFromSupabase = vi.fn();
const mockMealsSetState = vi.fn();
const mockGuestsLoadFromSupabase = vi.fn();
const mockGuestsLoadWarnings = vi.fn();
const mockGuestsLoadProxies = vi.fn();
const mockGuestsSetState = vi.fn();
const mockRemindersLoadFromSupabase = vi.fn();
const mockRemindersSetState = vi.fn();
const mockBlockedSlotsFetch = vi.fn();
const mockDailyNotesLoadFromSupabase = vi.fn();
const mockDailyNotesSetState = vi.fn();
const mockDonationsLoadFromSupabase = vi.fn();
const mockDonationsSetState = vi.fn();

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: Object.assign(function useServicesStore(selector: any) {
        if (typeof selector === 'function') {
            return selector({
                loadFromSupabase: mockServicesLoadFromSupabase,
            });
        }
        return { loadFromSupabase: mockServicesLoadFromSupabase };
    }, { setState: (...args: any[]) => mockServicesSetState(...args) }),
}));

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: Object.assign(function useMealsStore(selector: any) {
        if (typeof selector === 'function') {
            return selector({
                loadFromSupabase: mockMealsLoadFromSupabase,
            });
        }
        return { loadFromSupabase: mockMealsLoadFromSupabase };
    }, { setState: (...args: any[]) => mockMealsSetState(...args) }),
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: Object.assign(function useGuestsStore(selector: any) {
        if (typeof selector === 'function') {
            return selector({
                loadFromSupabase: mockGuestsLoadFromSupabase,
                loadGuestWarningsFromSupabase: mockGuestsLoadWarnings,
                loadGuestProxiesFromSupabase: mockGuestsLoadProxies,
            });
        }
        return {
            loadFromSupabase: mockGuestsLoadFromSupabase,
            loadGuestWarningsFromSupabase: mockGuestsLoadWarnings,
            loadGuestProxiesFromSupabase: mockGuestsLoadProxies,
        };
    }, { setState: (...args: any[]) => mockGuestsSetState(...args) }),
}));

vi.mock('@/stores/useRemindersStore', () => ({
    useRemindersStore: Object.assign(function useRemindersStore(selector: any) {
        if (typeof selector === 'function') {
            return selector({
                loadFromSupabase: mockRemindersLoadFromSupabase,
            });
        }
        return { loadFromSupabase: mockRemindersLoadFromSupabase };
    }, { setState: (...args: any[]) => mockRemindersSetState(...args) }),
}));

vi.mock('@/stores/useBlockedSlotsStore', () => ({
    useBlockedSlotsStore: (selector: any) => {
        if (typeof selector === 'function') {
            return selector({
                fetchBlockedSlots: mockBlockedSlotsFetch,
            });
        }
        return { fetchBlockedSlots: mockBlockedSlotsFetch };
    },
}));

vi.mock('@/stores/useDailyNotesStore', () => ({
    useDailyNotesStore: Object.assign(function useDailyNotesStore(selector: any) {
        if (typeof selector === 'function') {
            return selector({
                loadFromSupabase: mockDailyNotesLoadFromSupabase,
            });
        }
        return { loadFromSupabase: mockDailyNotesLoadFromSupabase };
    }, { setState: (...args: any[]) => mockDailyNotesSetState(...args) }),
}));

vi.mock('@/stores/useDonationsStore', () => ({
    useDonationsStore: Object.assign(function useDonationsStore(selector: any) {
        if (typeof selector === 'function') {
            return selector({
                loadFromSupabase: mockDonationsLoadFromSupabase,
            });
        }
        return { loadFromSupabase: mockDonationsLoadFromSupabase };
    }, { setState: (...args: any[]) => mockDonationsSetState(...args) }),
}));

describe('useRealtimeSync', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('sets up subscriptions on mount', () => {
        renderHook(() => useRealtimeSync());

        // Should subscribe to all critical tables
        expect(mockSubscribeToTable).toHaveBeenCalledWith(
            expect.objectContaining({ table: 'shower_reservations' })
        );
        expect(mockSubscribeToTable).toHaveBeenCalledWith(
            expect.objectContaining({ table: 'laundry_bookings' })
        );
        expect(mockSubscribeToTable).toHaveBeenCalledWith(
            expect.objectContaining({ table: 'meal_attendance' })
        );
        expect(mockSubscribeToTable).toHaveBeenCalledWith(
            expect.objectContaining({ table: 'bicycle_repairs' })
        );
        expect(mockSubscribeToTable).toHaveBeenCalledWith(
            expect.objectContaining({ table: 'guests' })
        );
        expect(mockSubscribeToTable).toHaveBeenCalledWith(
            expect.objectContaining({ table: 'guest_warnings' })
        );
        expect(mockSubscribeToTable).toHaveBeenCalledWith(
            expect.objectContaining({ table: 'guest_proxies' })
        );
        expect(mockSubscribeToTable).toHaveBeenCalledWith(
            expect.objectContaining({ table: 'guest_reminders' })
        );
        expect(mockSubscribeToTable).toHaveBeenCalledWith(
            expect.objectContaining({ table: 'blocked_slots' })
        );
        expect(mockSubscribeToTable).toHaveBeenCalledWith(
            expect.objectContaining({ table: 'daily_notes' })
        );
        expect(mockSubscribeToTable).toHaveBeenCalledWith(
            expect.objectContaining({ table: 'donations' })
        );
    });

    it('subscribes to 11 tables', () => {
        renderHook(() => useRealtimeSync());
        
        // 11 tables: showers, laundry, meals, bicycles, guests, warnings, proxies, reminders, blocked_slots, daily_notes, donations
        expect(mockSubscribeToTable).toHaveBeenCalledTimes(11);
    });

    it('cleans up subscriptions on unmount', () => {
        const unsubFn = vi.fn();
        mockSubscribeToTable.mockReturnValue(unsubFn);

        const { unmount } = renderHook(() => useRealtimeSync());
        
        unmount();

        // Should call unsubscribe for each subscription
        expect(unsubFn).toHaveBeenCalled();
    });

    it('provides onChange callback that triggers store refresh', async () => {
        let capturedOnChange: ((payload: any) => void) | undefined;
        mockSubscribeToTable.mockImplementation((options: { table: string; onChange?: (payload: any) => void }) => {
            if (options.table === 'shower_reservations') {
                capturedOnChange = options.onChange;
            }
            return vi.fn();
        });

        renderHook(() => useRealtimeSync());

        // Trigger the onChange callback
        capturedOnChange?.({ eventType: 'INSERT', new: { id: 's-1', guest_id: 'g-1', scheduled_for: '2025-01-06', status: 'booked' } });

        // Fast-forward debounce timer
        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        expect(mockServicesSetState).toHaveBeenCalled();
        expect(mockServicesLoadFromSupabase).not.toHaveBeenCalled();
    });

    it('debounces rapid changes', async () => {
        let capturedOnChange: ((payload: any) => void) | undefined;
        mockSubscribeToTable.mockImplementation((options: { table: string; onChange?: (payload: any) => void }) => {
            if (options.table === 'meal_attendance') {
                capturedOnChange = options.onChange;
            }
            return vi.fn();
        });

        renderHook(() => useRealtimeSync());

        // Trigger multiple rapid changes
        capturedOnChange?.({ eventType: 'INSERT', new: { id: 'm-1', guest_id: 'g-1', meal_type: 'guest', quantity: 1, served_on: '2025-01-06' } });
        capturedOnChange?.({ eventType: 'INSERT', new: { id: 'm-2', guest_id: 'g-1', meal_type: 'guest', quantity: 1, served_on: '2025-01-06' } });
        capturedOnChange?.({ eventType: 'INSERT', new: { id: 'm-3', guest_id: 'g-1', meal_type: 'guest', quantity: 1, served_on: '2025-01-06' } });

        // Fast-forward debounce timer
        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        expect(mockMealsSetState).toHaveBeenCalledTimes(1);
        expect(mockMealsLoadFromSupabase).not.toHaveBeenCalled();
    });

    it('refreshes services when laundry booking is created on another device', async () => {
        let capturedOnChange: ((payload: any) => void) | undefined;
        mockSubscribeToTable.mockImplementation((options: { table: string; onChange?: (payload: any) => void }) => {
            if (options.table === 'laundry_bookings') {
                capturedOnChange = options.onChange;
            }
            return vi.fn();
        });

        renderHook(() => useRealtimeSync());

        // Simulate a laundry booking insert event from another device
        capturedOnChange?.({ eventType: 'INSERT', new: { id: 'l-1', guest_id: 'g-1', laundry_type: 'onsite', status: 'waiting' } });

        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        expect(mockServicesSetState).toHaveBeenCalled();
        expect(mockServicesLoadFromSupabase).not.toHaveBeenCalled();
    });

    it('refreshes blocked slots when a slot is blocked/unblocked', async () => {
        let capturedOnChange: (() => void) | undefined;
        mockSubscribeToTable.mockImplementation((options: { table: string; onChange?: () => void }) => {
            if (options.table === 'blocked_slots') {
                capturedOnChange = options.onChange;
            }
            return vi.fn();
        });

        renderHook(() => useRealtimeSync());

        capturedOnChange?.();

        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        expect(mockBlockedSlotsFetch).toHaveBeenCalledTimes(1);
    });

    it('refreshes proxies when guest_proxies change', async () => {
        let capturedOnChange: ((payload: any) => void) | undefined;
        mockSubscribeToTable.mockImplementation((options: { table: string; onChange?: (payload: any) => void }) => {
            if (options.table === 'guest_proxies') {
                capturedOnChange = options.onChange;
            }
            return vi.fn();
        });

        renderHook(() => useRealtimeSync());

        capturedOnChange?.({ eventType: 'INSERT', new: { id: 'p-1', guest_id: 'g-1', proxy_id: 'g-2' } });

        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        expect(mockGuestsSetState).toHaveBeenCalled();
        expect(mockGuestsLoadProxies).not.toHaveBeenCalled();
    });
});

describe('RealtimeSyncProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders children', () => {
        const TestChild = () => <div data-testid="child">Child</div>;
        
        const { getByTestId } = render(
            <RealtimeSyncProvider>
                <TestChild />
            </RealtimeSyncProvider>
        );

        // Provider should render children
        expect(getByTestId('child')).toBeDefined();
    });

    it('sets up realtime sync for wrapped components', () => {
        render(
            <RealtimeSyncProvider>
                <div>Test</div>
            </RealtimeSyncProvider>
        );

        expect(mockSubscribeToTable).toHaveBeenCalled();
    });
});
