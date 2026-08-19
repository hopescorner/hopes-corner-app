import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { renderHook, act, render } from '@testing-library/react';
import { useRealtimeSync, RealtimeSyncProvider } from '../useRealtimeSync';
import { useCheckInStore } from '@/stores/useCheckInStore';
import React from 'react';

const { mockToast } = vi.hoisted(() => {
    const mockToast = vi.fn();
    return { mockToast };
});
vi.mock('react-hot-toast', () => ({
    default: Object.assign(mockToast, {
        success: vi.fn(),
        error: vi.fn(),
    }),
}));

vi.mock('lucide-react', () => ({
    ShowerHead: 'ShowerHead',
    WashingMachine: 'WashingMachine',
}));

const mockSubscribeToTable: Mock = vi.fn(() => vi.fn());
const mockSubscribeToTables: Mock = vi.fn((options: unknown[]) => {
    const unsubscribers = options.map((option) => mockSubscribeToTable(option));
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
});
const mockUnsubscribeFromAll = vi.fn();

vi.mock('@/lib/supabase/realtime', () => ({
    subscribeToTables: (options: unknown[], scope: string, onStatus?: (status: string) => void) => mockSubscribeToTables(options, scope, onStatus),
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

const mockGuestsGetState = vi.fn(() => ({
    guests: [
        { id: 'g-1', firstName: 'John', lastName: 'Doe', preferredName: '' },
        { id: 'g-2', firstName: 'Jane', lastName: 'Smith', preferredName: 'Janey' },
    ],
    fetchGuestById: vi.fn().mockResolvedValue(null),
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
    }, {
        setState: (...args: any[]) => mockGuestsSetState(...args),
        getState: () => mockGuestsGetState(),
    }),
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

    it('subscribes to 11 tables through one route-scoped channel', () => {
        renderHook(() => useRealtimeSync());
        
        // 11 tables: showers, laundry, meals, bicycles, guests, warnings, proxies, reminders, blocked_slots, daily_notes, donations
        expect(mockSubscribeToTable).toHaveBeenCalledTimes(11);
        expect(mockSubscribeToTables).toHaveBeenCalledTimes(1);
        expect(mockSubscribeToTables).toHaveBeenCalledWith(expect.any(Array), 'operations', expect.any(Function));
    });

    it('reloads service records after the realtime channel subscribes', async () => {
        renderHook(() => useRealtimeSync());
        const onStatus = mockSubscribeToTables.mock.calls[0][2] as ((status: string) => void) | undefined;

        onStatus?.('SUBSCRIBED');
        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        expect(mockServicesLoadFromSupabase).toHaveBeenCalledTimes(1);
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

    it('keeps rapid shower changes for different reservations', async () => {
        let capturedOnChange: ((payload: any) => void) | undefined;
        mockSubscribeToTable.mockImplementation((options: { table: string; onChange?: (payload: any) => void }) => {
            if (options.table === 'shower_reservations') capturedOnChange = options.onChange;
            return vi.fn();
        });

        renderHook(() => useRealtimeSync());

        capturedOnChange?.({
            eventType: 'INSERT',
            new: { id: 'shower-1', guest_id: 'g-1', scheduled_for: '2025-01-06', scheduled_time: '08:00', status: 'booked' },
        });
        capturedOnChange?.({
            eventType: 'INSERT',
            new: { id: 'shower-2', guest_id: 'g-2', scheduled_for: '2025-01-06', scheduled_time: '08:30', status: 'booked' },
        });

        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        expect(mockServicesSetState).toHaveBeenCalledTimes(2);
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

    it('replaces the synthetic snapshot record when the real guest meal row arrives', async () => {
        let capturedOnChange: ((payload: any) => void) | undefined;
        mockSubscribeToTable.mockImplementation((options: { table: string; onChange?: (payload: any) => void }) => {
            if (options.table === 'meal_attendance') {
                capturedOnChange = options.onChange;
            }
            return vi.fn();
        });

        renderHook(() => useRealtimeSync());

        capturedOnChange?.({
            eventType: 'UPDATE',
            new: { id: 'm-real', guest_id: 'g-1', meal_type: 'guest', quantity: 2, served_on: '2025-01-06', created_at: '2025-01-06T17:05:00Z' },
        });

        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        expect(mockMealsSetState).toHaveBeenCalledTimes(1);
        const updater = mockMealsSetState.mock.calls[0][0];
        const next = updater({
            mealRecords: [
                { id: 'snapshot-meal-g-1', guestId: 'g-1', count: 1 },
                { id: 'snapshot-meal-g-2', guestId: 'g-2', count: 2 },
            ],
            rvMealRecords: [],
            extraMealRecords: [{ id: 'snapshot-extra-g-1', guestId: 'g-1', count: 1 }],
            dayWorkerMealRecords: [],
            shelterMealRecords: [],
            unitedEffortMealRecords: [],
            lunchBagRecords: [],
        });

        // The real row supersedes g-1's synthetic record; other guests keep theirs.
        expect(next.mealRecords.map((r: any) => r.id).sort()).toEqual(['m-real', 'snapshot-meal-g-2']);
        // Synthetic extras aggregate pre-snapshot rows, so they must survive.
        expect(next.extraMealRecords.map((r: any) => r.id)).toEqual(['snapshot-extra-g-1']);
    });

    it('keeps the synthetic guest meal record when an extra meal row arrives', async () => {
        let capturedOnChange: ((payload: any) => void) | undefined;
        mockSubscribeToTable.mockImplementation((options: { table: string; onChange?: (payload: any) => void }) => {
            if (options.table === 'meal_attendance') {
                capturedOnChange = options.onChange;
            }
            return vi.fn();
        });

        renderHook(() => useRealtimeSync());

        capturedOnChange?.({
            eventType: 'INSERT',
            new: { id: 'x-real', guest_id: 'g-1', meal_type: 'extra', quantity: 1, served_on: '2025-01-06', created_at: '2025-01-06T17:10:00Z' },
        });

        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        const updater = mockMealsSetState.mock.calls[0][0];
        const next = updater({
            mealRecords: [{ id: 'snapshot-meal-g-1', guestId: 'g-1', count: 1 }],
            rvMealRecords: [],
            extraMealRecords: [{ id: 'snapshot-extra-g-1', guestId: 'g-1', count: 1 }],
            dayWorkerMealRecords: [],
            shelterMealRecords: [],
            unitedEffortMealRecords: [],
            lunchBagRecords: [],
        });

        expect(next.mealRecords.map((r: any) => r.id)).toEqual(['snapshot-meal-g-1']);
        expect(next.extraMealRecords.map((r: any) => r.id).sort()).toEqual(['snapshot-extra-g-1', 'x-real']);
    });

    it('does not let an auto-added lunch bag overwrite the check-in meal count', async () => {
        // A 2-meal check-in also inserts one lunch_bag row attributed to the
        // same guest. That row must not touch the guest's meal count, or the
        // card drops from "2 MEALS" to "1 MEAL".
        useCheckInStore.getState().hydrate({
            generatedAt: '2025-01-06T17:00:00Z',
            directoryVersion: 'v1',
            serviceDate: '2025-01-06',
            guests: [],
            todayByGuest: {
                'g-1': {
                    mealCount: 2,
                    extraMealCount: 0,
                    totalMeals: 2,
                    shower: null,
                    laundry: null,
                    bicycle: null,
                    haircut: null,
                    holiday: null,
                },
            },
            dailyNotes: [],
        } as any);

        let capturedOnChange: ((payload: any) => void) | undefined;
        mockSubscribeToTable.mockImplementation((options: { table: string; onChange?: (payload: any) => void }) => {
            if (options.table === 'meal_attendance') {
                capturedOnChange = options.onChange;
            }
            return vi.fn();
        });

        renderHook(() => useRealtimeSync());

        capturedOnChange?.({
            eventType: 'INSERT',
            new: {
                id: 'bag-1',
                guest_id: 'g-1',
                meal_type: 'lunch_bag',
                quantity: 1,
                served_on: '2025-01-06',
                created_at: '2025-01-06T17:05:00Z',
            },
        });

        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        expect(useCheckInStore.getState().todayByGuest['g-1']).toMatchObject({
            mealCount: 2,
            totalMeals: 2,
        });
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

    it('shows toast when a new shower booking arrives via realtime', async () => {
        let capturedOnChange: ((payload: any) => void) | undefined;
        mockSubscribeToTable.mockImplementation((options: { table: string; onChange?: (payload: any) => void }) => {
            if (options.table === 'shower_reservations') {
                capturedOnChange = options.onChange;
            }
            return vi.fn();
        });

        renderHook(() => useRealtimeSync());

        capturedOnChange?.({
            eventType: 'INSERT',
            new: { id: 's-new', guest_id: 'g-1', scheduled_for: '2025-01-06', scheduled_time: '9:00 AM', status: 'booked' },
        });

        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        expect(mockToast).toHaveBeenCalledWith(
            'John Doe was signed up for Shower at 9:00 AM',
            { icon: expect.anything(), id: 'rt-shower-s-new' }
        );
    });

    it('shows toast with preferred name for shower booking', async () => {
        let capturedOnChange: ((payload: any) => void) | undefined;
        mockSubscribeToTable.mockImplementation((options: { table: string; onChange?: (payload: any) => void }) => {
            if (options.table === 'shower_reservations') {
                capturedOnChange = options.onChange;
            }
            return vi.fn();
        });

        renderHook(() => useRealtimeSync());

        capturedOnChange?.({
            eventType: 'INSERT',
            new: { id: 's-new-2', guest_id: 'g-2', scheduled_for: '2025-01-06', scheduled_time: '10:00 AM', status: 'booked' },
        });

        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        expect(mockToast).toHaveBeenCalledWith(
            'Janey was signed up for Shower at 10:00 AM',
            { icon: expect.anything(), id: 'rt-shower-s-new-2' }
        );
    });

    it('shows toast when a new laundry booking arrives via realtime', async () => {
        let capturedOnChange: ((payload: any) => void) | undefined;
        mockSubscribeToTable.mockImplementation((options: { table: string; onChange?: (payload: any) => void }) => {
            if (options.table === 'laundry_bookings') {
                capturedOnChange = options.onChange;
            }
            return vi.fn();
        });

        renderHook(() => useRealtimeSync());

        capturedOnChange?.({
            eventType: 'INSERT',
            new: { id: 'l-new', guest_id: 'g-1', laundry_type: 'onsite', slot_label: '11:00 AM - 12:00 PM', status: 'waiting' },
        });

        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        expect(mockToast).toHaveBeenCalledWith(
            'John Doe was signed up for Laundry at 11:00 AM - 12:00 PM',
            { icon: expect.anything(), id: 'rt-laundry-l-new' }
        );
    });

    it('does not show toast for shower UPDATE events', async () => {
        let capturedOnChange: ((payload: any) => void) | undefined;
        mockSubscribeToTable.mockImplementation((options: { table: string; onChange?: (payload: any) => void }) => {
            if (options.table === 'shower_reservations') {
                capturedOnChange = options.onChange;
            }
            return vi.fn();
        });

        renderHook(() => useRealtimeSync());

        capturedOnChange?.({
            eventType: 'UPDATE',
            new: { id: 's-1', guest_id: 'g-1', scheduled_for: '2025-01-06', status: 'done' },
        });

        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        expect(mockToast).not.toHaveBeenCalled();
    });

    it('does not show toast for laundry DELETE events', async () => {
        let capturedOnChange: ((payload: any) => void) | undefined;
        mockSubscribeToTable.mockImplementation((options: { table: string; onChange?: (payload: any) => void }) => {
            if (options.table === 'laundry_bookings') {
                capturedOnChange = options.onChange;
            }
            return vi.fn();
        });

        renderHook(() => useRealtimeSync());

        capturedOnChange?.({
            eventType: 'DELETE',
            old: { id: 'l-1' },
        });

        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        expect(mockToast).not.toHaveBeenCalled();
    });

    it('shows generic name when guest not found in store', async () => {
        mockGuestsGetState.mockReturnValueOnce({
            guests: [],
            fetchGuestById: vi.fn().mockResolvedValue(null),
        });

        let capturedOnChange: ((payload: any) => void) | undefined;
        mockSubscribeToTable.mockImplementation((options: { table: string; onChange?: (payload: any) => void }) => {
            if (options.table === 'shower_reservations') {
                capturedOnChange = options.onChange;
            }
            return vi.fn();
        });

        renderHook(() => useRealtimeSync());

        capturedOnChange?.({
            eventType: 'INSERT',
            new: { id: 's-unknown', guest_id: 'g-missing', scheduled_for: '2025-01-06', status: 'booked' },
        });

        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        expect(mockToast).toHaveBeenCalledWith(
            'A guest was signed up for Shower',
            { icon: expect.anything(), id: 'rt-shower-s-unknown' }
        );
    });

    it('shows shower toast without slot when scheduled_time is absent', async () => {
        let capturedOnChange: ((payload: any) => void) | undefined;
        mockSubscribeToTable.mockImplementation((options: { table: string; onChange?: (payload: any) => void }) => {
            if (options.table === 'shower_reservations') {
                capturedOnChange = options.onChange;
            }
            return vi.fn();
        });

        renderHook(() => useRealtimeSync());

        capturedOnChange?.({
            eventType: 'INSERT',
            new: { id: 's-noslot', guest_id: 'g-1', scheduled_for: '2025-01-06', status: 'booked' },
        });

        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        expect(mockToast).toHaveBeenCalledWith(
            'John Doe was signed up for Shower',
            { icon: expect.anything(), id: 'rt-shower-s-noslot' }
        );
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
