'use client';

import { useEffect, useRef } from 'react';
import { subscribeToTable, unsubscribeFromAll } from '@/lib/supabase/realtime';
import { useServicesStore } from '@/stores/useServicesStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useRemindersStore } from '@/stores/useRemindersStore';

/**
 * Hook to set up realtime subscriptions for all critical tables.
 * This ensures all devices stay in sync when data changes.
 * 
 * Should be used once at the app root level (e.g., in MainLayout or a provider).
 */
export function useRealtimeSync() {
    const servicesLoadFromSupabase = useServicesStore(state => state.loadFromSupabase);
    const mealsLoadFromSupabase = useMealsStore(state => state.loadFromSupabase);
    const guestsLoadFromSupabase = useGuestsStore(state => state.loadFromSupabase);
    const guestsLoadWarnings = useGuestsStore(state => state.loadGuestWarningsFromSupabase);
    const guestsLoadProxies = useGuestsStore(state => state.loadGuestProxiesFromSupabase);
    const remindersLoadFromSupabase = useRemindersStore(state => state.loadFromSupabase);

    // Track if subscriptions are set up
    const subscriptionsRef = useRef<(() => void)[]>([]);
    const isSetupRef = useRef(false);

    useEffect(() => {
        // Prevent double setup in strict mode
        if (isSetupRef.current) {
            return;
        }
        isSetupRef.current = true;

        console.log('[RealtimeSync] Setting up realtime subscriptions');

        // Debounce refreshes to prevent rapid-fire updates
        let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
        const debouncedRefresh = (refreshFn: () => void | Promise<void>, delay = 500) => {
            if (refreshTimeout) {
                clearTimeout(refreshTimeout);
            }
            refreshTimeout = setTimeout(() => {
                try {
                    const result = refreshFn();
                    // Only call .catch if it's a promise
                    if (result && typeof result.catch === 'function') {
                        result.catch(err => console.error('[RealtimeSync] Refresh error:', err));
                    }
                } catch (err) {
                    console.error('[RealtimeSync] Refresh error:', err);
                }
            }, delay);
        };

        // Subscribe to shower changes
        const unsubShowers = subscribeToTable({
            table: 'shower_reservations',
            onChange: () => debouncedRefresh(servicesLoadFromSupabase),
        });

        // Subscribe to laundry changes
        const unsubLaundry = subscribeToTable({
            table: 'laundry_bookings',
            onChange: () => debouncedRefresh(servicesLoadFromSupabase),
        });

        // Subscribe to meal attendance changes
        const unsubMeals = subscribeToTable({
            table: 'meal_attendance',
            onChange: () => debouncedRefresh(mealsLoadFromSupabase),
        });

        // Subscribe to bicycle repairs changes
        const unsubBicycles = subscribeToTable({
            table: 'bicycle_repairs',
            onChange: () => debouncedRefresh(servicesLoadFromSupabase),
        });

        // Subscribe to guest changes
        const unsubGuests = subscribeToTable({
            table: 'guests',
            onChange: () => debouncedRefresh(guestsLoadFromSupabase),
        });

        // Subscribe to guest warnings changes
        const unsubWarnings = subscribeToTable({
            table: 'guest_warnings',
            onChange: () => debouncedRefresh(guestsLoadWarnings),
        });

        // Subscribe to guest reminders changes
        const unsubReminders = subscribeToTable({
            table: 'guest_reminders',
            onChange: () => debouncedRefresh(remindersLoadFromSupabase),
        });

        // Store unsubscribe functions
        subscriptionsRef.current = [
            unsubShowers,
            unsubLaundry,
            unsubMeals,
            unsubBicycles,
            unsubGuests,
            unsubWarnings,
            unsubReminders,
        ];

        // Cleanup on unmount
        return () => {
            console.log('[RealtimeSync] Cleaning up realtime subscriptions');
            if (refreshTimeout) {
                clearTimeout(refreshTimeout);
            }
            subscriptionsRef.current.forEach(unsub => unsub());
            subscriptionsRef.current = [];
            isSetupRef.current = false;
        };
    }, [
        servicesLoadFromSupabase,
        mealsLoadFromSupabase,
        guestsLoadFromSupabase,
        guestsLoadWarnings,
        guestsLoadProxies,
        remindersLoadFromSupabase,
    ]);
}

/**
 * Provider component that sets up realtime sync.
 * Wrap your app with this component to enable realtime updates.
 */
export function RealtimeSyncProvider({ children }: { children: React.ReactNode }) {
    useRealtimeSync();
    return <>{children}</>;
}
