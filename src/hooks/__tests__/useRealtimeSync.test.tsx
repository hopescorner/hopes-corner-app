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
const mockMealsLoadFromSupabase = vi.fn();
const mockGuestsLoadFromSupabase = vi.fn();
const mockGuestsLoadWarnings = vi.fn();
const mockGuestsLoadProxies = vi.fn();
const mockRemindersLoadFromSupabase = vi.fn();

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: (selector: any) => {
        if (typeof selector === 'function') {
            return selector({
                loadFromSupabase: mockServicesLoadFromSupabase,
            });
        }
        return { loadFromSupabase: mockServicesLoadFromSupabase };
    },
}));

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: (selector: any) => {
        if (typeof selector === 'function') {
            return selector({
                loadFromSupabase: mockMealsLoadFromSupabase,
            });
        }
        return { loadFromSupabase: mockMealsLoadFromSupabase };
    },
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: (selector: any) => {
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
    },
}));

vi.mock('@/stores/useRemindersStore', () => ({
    useRemindersStore: (selector: any) => {
        if (typeof selector === 'function') {
            return selector({
                loadFromSupabase: mockRemindersLoadFromSupabase,
            });
        }
        return { loadFromSupabase: mockRemindersLoadFromSupabase };
    },
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
            expect.objectContaining({ table: 'guest_reminders' })
        );
    });

    it('subscribes to 7 tables', () => {
        renderHook(() => useRealtimeSync());
        
        // 7 tables: showers, laundry, meals, bicycles, guests, warnings, reminders
        expect(mockSubscribeToTable).toHaveBeenCalledTimes(7);
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
        let capturedOnChange: (() => void) | undefined;
        mockSubscribeToTable.mockImplementation((options: { table: string; onChange?: () => void }) => {
            if (options.table === 'shower_reservations') {
                capturedOnChange = options.onChange;
            }
            return vi.fn();
        });

        renderHook(() => useRealtimeSync());

        // Trigger the onChange callback
        capturedOnChange?.();

        // Fast-forward debounce timer
        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        // Should trigger services refresh (since showers are in services store)
        expect(mockServicesLoadFromSupabase).toHaveBeenCalled();
    });

    it('debounces rapid changes', async () => {
        let capturedOnChange: (() => void) | undefined;
        mockSubscribeToTable.mockImplementation((options: { table: string; onChange?: () => void }) => {
            if (options.table === 'meal_attendance') {
                capturedOnChange = options.onChange;
            }
            return vi.fn();
        });

        renderHook(() => useRealtimeSync());

        // Trigger multiple rapid changes
        capturedOnChange?.();
        capturedOnChange?.();
        capturedOnChange?.();

        // Fast-forward debounce timer
        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        // Should only call loadFromSupabase once due to debouncing
        expect(mockMealsLoadFromSupabase).toHaveBeenCalledTimes(1);
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
