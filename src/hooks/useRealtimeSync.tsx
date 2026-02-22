'use client';

import { useEffect, useRef } from 'react';
import { subscribeToTable } from '@/lib/supabase/realtime';
import {
    mapShowerRow,
    mapLaundryRow,
    mapBicycleRow,
    mapMealRow,
    mapGuestRow,
    mapGuestWarningRow,
    mapGuestProxyRow,
    mapGuestReminderRow,
    mapDailyNoteRow,
    mapDonationRow,
} from '@/lib/utils/mappers';
import { useServicesStore } from '@/stores/useServicesStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useRemindersStore } from '@/stores/useRemindersStore';
import { useBlockedSlotsStore } from '@/stores/useBlockedSlotsStore';
import { useDailyNotesStore } from '@/stores/useDailyNotesStore';
import { useDonationsStore } from '@/stores/useDonationsStore';

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
    const blockedSlotsFetch = useBlockedSlotsStore(state => state.fetchBlockedSlots);
    const dailyNotesLoadFromSupabase = useDailyNotesStore(state => state.loadFromSupabase);
    const donationsLoadFromSupabase = useDonationsStore(state => state.loadFromSupabase);

    // Track if subscriptions are set up
    const subscriptionsRef = useRef<(() => void)[]>([]);
    const isSetupRef = useRef(false);
    const realtimeDebugEnabled = process.env.NEXT_PUBLIC_REALTIME_DEBUG === 'true';

    useEffect(() => {
        // Prevent double setup in strict mode
        if (isSetupRef.current) {
            return;
        }
        isSetupRef.current = true;

        if (realtimeDebugEnabled) {
            console.log('[RealtimeSync] Setting up realtime subscriptions');
        }

        // Debounce updates per table so unrelated events don't cancel each other
        const refreshTimeouts: Record<string, ReturnType<typeof setTimeout> | null> = {
            showers: null,
            laundry: null,
            meals: null,
            bicycles: null,
            guests: null,
            warnings: null,
            proxies: null,
            reminders: null,
            blockedSlots: null,
            dailyNotes: null,
            donations: null,
        };

        const debouncedWork = (key: keyof typeof refreshTimeouts, work: () => void | Promise<void>, delay = 150) => {
            if (refreshTimeouts[key]) {
                clearTimeout(refreshTimeouts[key]!);
            }
            refreshTimeouts[key] = setTimeout(() => {
                try {
                    const result = work();
                    if (result && typeof (result as any).catch === 'function') {
                        (result as any).catch((err: any) => console.error('[RealtimeSync] Realtime update error:', err));
                    }
                } catch (err) {
                    console.error('[RealtimeSync] Realtime update error:', err);
                }
            }, delay);
        };

        const fallbackReload = (reloadFn: () => void | Promise<void>, label: string) => {
            try {
                const result = reloadFn();
                if (result && typeof (result as any).catch === 'function') {
                    (result as any).catch((err: any) => console.error(`[RealtimeSync] ${label} fallback reload failed:`, err));
                }
            } catch (err) {
                console.error(`[RealtimeSync] ${label} fallback reload failed:`, err);
            }
        };

        // Subscribe to shower changes
        const unsubShowers = subscribeToTable({
            table: 'shower_reservations',
            onChange: (payload) => debouncedWork('showers', () => {
                try {
                    if (payload.eventType === 'DELETE') {
                        const deletedId = (payload.old as any)?.id;
                        if (!deletedId) throw new Error('missing shower id in delete payload');
                        useServicesStore.setState((state: any) => ({
                            showerRecords: state.showerRecords.filter((r: any) => r.id !== deletedId),
                        }));
                        return;
                    }
                    const row = payload.new as any;
                    if (!row?.id) throw new Error('missing shower row payload');
                    const mapped = mapShowerRow(row);
                    useServicesStore.setState((state: any) => ({
                        showerRecords: [mapped, ...state.showerRecords.filter((r: any) => r.id !== mapped.id)],
                    }));
                } catch (error) {
                    console.error('[RealtimeSync] Shower patch failed, reloading:', error);
                    fallbackReload(servicesLoadFromSupabase, 'shower');
                }
            }),
        });

        // Subscribe to laundry changes
        const unsubLaundry = subscribeToTable({
            table: 'laundry_bookings',
            onChange: (payload) => debouncedWork('laundry', () => {
                try {
                    if (payload.eventType === 'DELETE') {
                        const deletedId = (payload.old as any)?.id;
                        if (!deletedId) throw new Error('missing laundry id in delete payload');
                        useServicesStore.setState((state: any) => ({
                            laundryRecords: state.laundryRecords.filter((r: any) => r.id !== deletedId),
                        }));
                        return;
                    }
                    const row = payload.new as any;
                    if (!row?.id) throw new Error('missing laundry row payload');
                    const mapped = mapLaundryRow(row);
                    useServicesStore.setState((state: any) => ({
                        laundryRecords: [mapped, ...state.laundryRecords.filter((r: any) => r.id !== mapped.id)],
                    }));
                } catch (error) {
                    console.error('[RealtimeSync] Laundry patch failed, reloading:', error);
                    fallbackReload(servicesLoadFromSupabase, 'laundry');
                }
            }),
        });

        // Subscribe to meal attendance changes
        const unsubMeals = subscribeToTable({
            table: 'meal_attendance',
            onChange: (payload) => debouncedWork('meals', () => {
                try {
                    const bucketOf = (type?: string | null) => {
                        switch (type) {
                            case 'rv': return 'rvMealRecords';
                            case 'extra': return 'extraMealRecords';
                            case 'day_worker': return 'dayWorkerMealRecords';
                            case 'shelter': return 'shelterMealRecords';
                            case 'united_effort': return 'unitedEffortMealRecords';
                            case 'lunch_bag': return 'lunchBagRecords';
                            default: return 'mealRecords';
                        }
                    };
                    if (payload.eventType === 'DELETE') {
                        const deletedId = (payload.old as any)?.id;
                        if (!deletedId) throw new Error('missing meal id in delete payload');
                        useMealsStore.setState((state: any) => ({
                            mealRecords: state.mealRecords.filter((r: any) => r.id !== deletedId),
                            rvMealRecords: state.rvMealRecords.filter((r: any) => r.id !== deletedId),
                            extraMealRecords: state.extraMealRecords.filter((r: any) => r.id !== deletedId),
                            dayWorkerMealRecords: state.dayWorkerMealRecords.filter((r: any) => r.id !== deletedId),
                            shelterMealRecords: state.shelterMealRecords.filter((r: any) => r.id !== deletedId),
                            unitedEffortMealRecords: state.unitedEffortMealRecords.filter((r: any) => r.id !== deletedId),
                            lunchBagRecords: state.lunchBagRecords.filter((r: any) => r.id !== deletedId),
                        }));
                        return;
                    }
                    const row = payload.new as any;
                    if (!row?.id) throw new Error('missing meal row payload');
                    const mapped = mapMealRow(row);
                    const bucket = bucketOf(mapped.type);
                    useMealsStore.setState((state: any) => {
                        const cleared = {
                            mealRecords: state.mealRecords.filter((r: any) => r.id !== mapped.id),
                            rvMealRecords: state.rvMealRecords.filter((r: any) => r.id !== mapped.id),
                            extraMealRecords: state.extraMealRecords.filter((r: any) => r.id !== mapped.id),
                            dayWorkerMealRecords: state.dayWorkerMealRecords.filter((r: any) => r.id !== mapped.id),
                            shelterMealRecords: state.shelterMealRecords.filter((r: any) => r.id !== mapped.id),
                            unitedEffortMealRecords: state.unitedEffortMealRecords.filter((r: any) => r.id !== mapped.id),
                            lunchBagRecords: state.lunchBagRecords.filter((r: any) => r.id !== mapped.id),
                        } as any;
                        cleared[bucket] = [mapped, ...cleared[bucket]];
                        return cleared;
                    });
                } catch (error) {
                    console.error('[RealtimeSync] Meal patch failed, reloading:', error);
                    fallbackReload(mealsLoadFromSupabase, 'meal');
                }
            }),
        });

        // Subscribe to bicycle repairs changes
        const unsubBicycles = subscribeToTable({
            table: 'bicycle_repairs',
            onChange: (payload) => debouncedWork('bicycles', () => {
                try {
                    if (payload.eventType === 'DELETE') {
                        const deletedId = (payload.old as any)?.id;
                        if (!deletedId) throw new Error('missing bicycle id in delete payload');
                        useServicesStore.setState((state: any) => ({
                            bicycleRecords: state.bicycleRecords.filter((r: any) => r.id !== deletedId),
                        }));
                        return;
                    }
                    const row = payload.new as any;
                    if (!row?.id) throw new Error('missing bicycle row payload');
                    const mapped = mapBicycleRow(row);
                    useServicesStore.setState((state: any) => ({
                        bicycleRecords: [mapped, ...state.bicycleRecords.filter((r: any) => r.id !== mapped.id)],
                    }));
                } catch (error) {
                    console.error('[RealtimeSync] Bicycle patch failed, reloading:', error);
                    fallbackReload(servicesLoadFromSupabase, 'bicycle');
                }
            }),
        });

        // Subscribe to guest changes
        const unsubGuests = subscribeToTable({
            table: 'guests',
            onChange: (payload) => debouncedWork('guests', () => {
                try {
                    if (payload.eventType === 'DELETE') {
                        const deletedId = (payload.old as any)?.id;
                        if (!deletedId) throw new Error('missing guest id in delete payload');
                        useGuestsStore.setState((state: any) => ({
                            guests: state.guests.filter((g: any) => g.id !== deletedId),
                        }));
                        return;
                    }
                    const row = payload.new as any;
                    if (!row?.id) throw new Error('missing guest row payload');
                    const mapped = mapGuestRow(row);
                    useGuestsStore.setState((state: any) => ({
                        guests: [mapped, ...state.guests.filter((g: any) => g.id !== mapped.id)],
                    }));
                } catch (error) {
                    console.error('[RealtimeSync] Guest patch failed, reloading:', error);
                    fallbackReload(guestsLoadFromSupabase, 'guest');
                }
            }),
        });

        // Subscribe to guest warnings changes
        const unsubWarnings = subscribeToTable({
            table: 'guest_warnings',
            onChange: (payload) => debouncedWork('warnings', () => {
                try {
                    if (payload.eventType === 'DELETE') {
                        const deletedId = (payload.old as any)?.id;
                        if (!deletedId) throw new Error('missing warning id in delete payload');
                        useGuestsStore.setState((state: any) => ({
                            warnings: state.warnings.filter((w: any) => w.id !== deletedId),
                        }));
                        return;
                    }
                    const row = payload.new as any;
                    if (!row?.id) throw new Error('missing warning row payload');
                    const mapped = mapGuestWarningRow(row);
                    useGuestsStore.setState((state: any) => ({
                        warnings: [mapped, ...state.warnings.filter((w: any) => w.id !== mapped.id)],
                    }));
                } catch (error) {
                    console.error('[RealtimeSync] Warning patch failed, reloading:', error);
                    fallbackReload(guestsLoadWarnings, 'warning');
                }
            }),
        });

        // Subscribe to guest proxies changes
        const unsubProxies = subscribeToTable({
            table: 'guest_proxies',
            onChange: (payload) => debouncedWork('proxies', () => {
                try {
                    if (payload.eventType === 'DELETE') {
                        const deletedId = (payload.old as any)?.id;
                        if (!deletedId) throw new Error('missing proxy id in delete payload');
                        useGuestsStore.setState((state: any) => ({
                            guestProxies: state.guestProxies.filter((p: any) => p.id !== deletedId),
                        }));
                        return;
                    }
                    const row = payload.new as any;
                    if (!row?.id) throw new Error('missing proxy row payload');
                    const mapped = mapGuestProxyRow(row);
                    useGuestsStore.setState((state: any) => ({
                        guestProxies: [mapped, ...state.guestProxies.filter((p: any) => p.id !== mapped.id)],
                    }));
                } catch (error) {
                    console.error('[RealtimeSync] Proxy patch failed, reloading:', error);
                    fallbackReload(guestsLoadProxies, 'proxy');
                }
            }),
        });

        // Subscribe to guest reminders changes
        const unsubReminders = subscribeToTable({
            table: 'guest_reminders',
            onChange: (payload) => debouncedWork('reminders', () => {
                try {
                    if (payload.eventType === 'DELETE') {
                        const deletedId = (payload.old as any)?.id;
                        if (!deletedId) throw new Error('missing reminder id in delete payload');
                        useRemindersStore.setState((state: any) => ({
                            reminders: state.reminders.filter((r: any) => r.id !== deletedId),
                        }));
                        return;
                    }
                    const row = payload.new as any;
                    if (!row?.id) throw new Error('missing reminder row payload');
                    const mapped = mapGuestReminderRow(row);
                    useRemindersStore.setState((state: any) => ({
                        reminders: [mapped, ...state.reminders.filter((r: any) => r.id !== mapped.id)],
                    }));
                } catch (error) {
                    console.error('[RealtimeSync] Reminder patch failed, reloading:', error);
                    fallbackReload(remindersLoadFromSupabase, 'reminder');
                }
            }),
        });

        // Subscribe to blocked slots changes (affects shower/laundry availability)
        const unsubBlockedSlots = subscribeToTable({
            table: 'blocked_slots',
            onChange: () => debouncedWork('blockedSlots', blockedSlotsFetch),
        });

        // Subscribe to daily notes changes
        const unsubDailyNotes = subscribeToTable({
            table: 'daily_notes',
            onChange: (payload) => debouncedWork('dailyNotes', () => {
                try {
                    if (payload.eventType === 'DELETE') {
                        const deletedId = (payload.old as any)?.id;
                        if (!deletedId) throw new Error('missing daily note id in delete payload');
                        useDailyNotesStore.setState((state: any) => ({
                            notes: state.notes.filter((n: any) => n.id !== deletedId),
                        }));
                        return;
                    }
                    const row = payload.new as any;
                    if (!row?.id) throw new Error('missing daily note row payload');
                    const mapped = mapDailyNoteRow(row);
                    useDailyNotesStore.setState((state: any) => ({
                        notes: [mapped, ...state.notes.filter((n: any) => n.id !== mapped.id)],
                    }));
                } catch (error) {
                    console.error('[RealtimeSync] Daily note patch failed, reloading:', error);
                    fallbackReload(dailyNotesLoadFromSupabase, 'daily_note');
                }
            }),
        });

        // Subscribe to donations changes
        const unsubDonations = subscribeToTable({
            table: 'donations',
            onChange: (payload) => debouncedWork('donations', () => {
                try {
                    if (payload.eventType === 'DELETE') {
                        const deletedId = (payload.old as any)?.id;
                        if (!deletedId) throw new Error('missing donation id in delete payload');
                        useDonationsStore.setState((state: any) => ({
                            donationRecords: state.donationRecords.filter((d: any) => d.id !== deletedId),
                        }));
                        return;
                    }
                    const row = payload.new as any;
                    if (!row?.id) throw new Error('missing donation row payload');
                    const mapped = mapDonationRow(row);
                    useDonationsStore.setState((state: any) => ({
                        donationRecords: [mapped, ...state.donationRecords.filter((d: any) => d.id !== mapped.id)],
                    }));
                } catch (error) {
                    console.error('[RealtimeSync] Donation patch failed, reloading:', error);
                    fallbackReload(donationsLoadFromSupabase, 'donation');
                }
            }),
        });

        // Store unsubscribe functions
        subscriptionsRef.current = [
            unsubShowers,
            unsubLaundry,
            unsubMeals,
            unsubBicycles,
            unsubGuests,
            unsubWarnings,
            unsubProxies,
            unsubReminders,
            unsubBlockedSlots,
            unsubDailyNotes,
            unsubDonations,
        ];

        // Cleanup on unmount
        return () => {
            if (realtimeDebugEnabled) {
                console.log('[RealtimeSync] Cleaning up realtime subscriptions');
            }
            for (const key of Object.keys(refreshTimeouts)) {
                const t = refreshTimeouts[key];
                if (t) clearTimeout(t);
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
        blockedSlotsFetch,
        dailyNotesLoadFromSupabase,
        donationsLoadFromSupabase,
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
