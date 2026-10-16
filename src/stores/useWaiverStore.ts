'use client';

import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

type ServiceType = 'shower' | 'laundry' | 'bicycle';

interface WaiverState {
    waiverVersion: number;
    guestNeedsWaiverReminder: (guestId: string, serviceType: ServiceType) => Promise<boolean>;
    dismissWaiver: (guestId: string, serviceType: ServiceType, reason?: string) => Promise<boolean>;
    hasActiveWaiver: (guestId: string, serviceType: ServiceType) => Promise<boolean>;
    incrementWaiverVersion: () => void;
}

/**
 * Waiver Store
 * 
 * Manages service waiver tracking for shower, laundry, and bicycle services.
 * - Shower and laundry share a common waiver (signing one covers both)
 * - Bicycle has a separate waiver
 * - Waivers reset on January 1st each year
 */
const reminderCache = new Map<string, boolean>();
const activeWaiverCache = new Map<string, boolean>();

export const clearWaiverStoreCache = () => {
    reminderCache.clear();
    activeWaiverCache.clear();
};

export const useWaiverStore = create<WaiverState>()((set, get) => ({
    waiverVersion: 0,

    guestNeedsWaiverReminder: async (guestId: string, serviceType: ServiceType): Promise<boolean> => {
        if (!guestId || !serviceType) return false;

        const cacheKey = `${guestId}:${serviceType}`;
        if (reminderCache.has(cacheKey)) {
            return reminderCache.get(cacheKey)!;
        }

        try {
            const supabase = createClient();
            const { data, error } = await supabase.rpc('guest_needs_waiver_reminder', {
                p_guest_id: guestId,
                p_service_type: serviceType,
            });

            if (error) {
                console.error('[WaiverStore] Error checking waiver reminder:', error);
                return false;
            }

            const result = data || false;
            reminderCache.set(cacheKey, result);
            return result;
        } catch (error) {
            console.error('[WaiverStore] Exception in guestNeedsWaiverReminder:', error);
            return false;
        }
    },

    dismissWaiver: async (guestId: string, serviceType: ServiceType, reason: string = 'signed_by_staff'): Promise<boolean> => {
        if (!guestId || !serviceType) return false;

        try {
            const supabase = createClient();
            const { error } = await supabase.rpc('dismiss_waiver', {
                p_guest_id: guestId,
                p_service_type: serviceType,
                p_dismissed_reason: reason,
            });

            if (error) {
                console.error('[WaiverStore] Error dismissing waiver:', error);
                return false;
            }

            reminderCache.delete(`${guestId}:${serviceType}`);
            activeWaiverCache.set(`${guestId}:${serviceType}`, true);
            if (serviceType === 'shower' || serviceType === 'laundry') {
                const other = serviceType === 'shower' ? 'laundry' : 'shower';
                reminderCache.delete(`${guestId}:${other}`);
                activeWaiverCache.set(`${guestId}:${other}`, true);
            }

            get().incrementWaiverVersion();
            return true;
        } catch (error) {
            console.error('[WaiverStore] Exception in dismissWaiver:', error);
            return false;
        }
    },

    hasActiveWaiver: async (guestId: string, serviceType: ServiceType): Promise<boolean> => {
        if (!guestId || !serviceType) return false;

        const cacheKey = `${guestId}:${serviceType}`;
        if (activeWaiverCache.has(cacheKey)) {
            return activeWaiverCache.get(cacheKey)!;
        }

        try {
            const supabase = createClient();
            const { data, error } = await supabase.rpc('has_active_waiver', {
                p_guest_id: guestId,
                p_service_type: serviceType,
            });

            if (error) {
                console.error('[WaiverStore] Error checking active waiver:', error);
                return false;
            }

            const result = data || false;
            activeWaiverCache.set(cacheKey, result);
            return result;
        } catch (error) {
            console.error('[WaiverStore] Exception in hasActiveWaiver:', error);
            return false;
        }
    },

    incrementWaiverVersion: () => {
        clearWaiverStoreCache();
        set((state) => ({ waiverVersion: state.waiverVersion + 1 }));
    },
}));
