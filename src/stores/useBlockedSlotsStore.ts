import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import {
  capacityFor,
  normalizeBlockedCount,
  getBlockedCount as countFor,
  getEffectiveCapacity as capacityLeftFor,
  isFullyBlocked,
} from '@/lib/utils/blockedSlots';

export interface BlockedSlot {
    id: string;
    serviceType: 'shower' | 'laundry';
    slotTime: string;
    date: string;
    /** How many spots at this time are blocked. Null/undefined = legacy full block. */
    blockedCount?: number | null;
    createdAt?: string;
    blockedBy?: string;
}

interface BlockedSlotsState {
    blockedSlots: BlockedSlot[];
    loading: boolean;
    initialized: boolean;

    fetchBlockedSlots: () => Promise<void>;
    ensureLoaded: () => Promise<void>;
    /** Block the whole slot (or `blockedCount` spots when given). Defaults to full block. */
    blockSlot: (serviceType: 'shower' | 'laundry', slotTime: string, date: string, blockedCount?: number) => Promise<boolean>;
    /** Set how many spots are blocked at this time (0 = open). */
    setBlockedCount: (serviceType: 'shower' | 'laundry', slotTime: string, date: string, blockedCount: number) => Promise<boolean>;
    unblockSlot: (serviceType: 'shower' | 'laundry', slotTime: string, date: string) => Promise<boolean>;
    /** True only when every spot at this time is blocked (effective capacity 0). */
    isSlotBlocked: (serviceType: 'shower' | 'laundry', slotTime: string, date: string) => boolean;
    /** How many spots are blocked at this time (0 = open). */
    getBlockedCount: (serviceType: 'shower' | 'laundry', slotTime: string, date: string) => number;
    /** Remaining bookable spots at this time (0 = fully blocked). */
    getEffectiveCapacity: (serviceType: 'shower' | 'laundry', slotTime: string, date: string) => number;
}

let mutationVersion = 0;

export const useBlockedSlotsStore = create<BlockedSlotsState>((set, get) => ({
    blockedSlots: [],
    loading: false,
    initialized: false,

    ensureLoaded: async () => {
        if (get().initialized) return;
        await get().fetchBlockedSlots();
    },

    fetchBlockedSlots: async () => {
        const versionAtStart = mutationVersion;
        const supabase = createClient();
        set({ loading: true });
        try {
            const { data, error } = await supabase
                .from('blocked_slots')
                .select('*')
                .order('date', { ascending: true });

            if (error) throw error;

            if (data && versionAtStart === mutationVersion) {
                set({
                    blockedSlots: ((data as any[]) || []).map((item: any) => ({
                        id: item.id,
                        serviceType: item.service_type,
                        slotTime: item.slot_time,
                        date: item.date,
                        blockedCount: item.blocked_count ?? null,
                        createdAt: item.created_at,
                        blockedBy: item.blocked_by,
                    })),
                    initialized: true,
                });
            }
        } catch (error) {
            console.error('Error fetching blocked slots:', error);
            toast.error('Failed to load blocked slots');
        } finally {
            set({ loading: false });
        }
    },

    blockSlot: async (serviceType, slotTime, date, blockedCount) => {
        const desiredCount = normalizeBlockedCount(serviceType, blockedCount);
        if (desiredCount === 0) return get().unblockSlot(serviceType, slotTime, date);
        const matchesSlot = (s: BlockedSlot) => s.serviceType === serviceType && s.slotTime === slotTime && s.date === date;
        const originalSlot = get().blockedSlots.find(matchesSlot);
        const optimisticSlot: BlockedSlot = {
            ...originalSlot,
            id: originalSlot?.id ?? crypto.randomUUID(),
            serviceType, slotTime, date, blockedCount: desiredCount,
        };
        mutationVersion += 1;
        set((state) => ({ blockedSlots: [...state.blockedSlots.filter(s => !matchesSlot(s)), optimisticSlot] }));
        try {
            const { data, error } = await createClient()
                .from('blocked_slots')
                .upsert({ service_type: serviceType, slot_time: slotTime, date, blocked_count: desiredCount },
                    { onConflict: 'service_type,slot_time,date' })
                .select()
                .single();
            if (error) throw error;
            if (!data) throw new Error('No saved block returned');
            mutationVersion += 1;
            set((state) => ({ blockedSlots: state.blockedSlots.map(s => matchesSlot(s) ? {
                ...s, id: data.id, blockedCount: data.blocked_count ?? desiredCount,
                createdAt: data.created_at, blockedBy: data.blocked_by,
            } : s) }));
            return true;
        } catch (error) {
            mutationVersion += 1;
            console.error('Error blocking slot:', error);
            toast.error('Failed to block slot');
            set((state) => ({ blockedSlots: [
                ...state.blockedSlots.filter(s => !matchesSlot(s)),
                ...(originalSlot ? [originalSlot] : []),
            ] }));
            return false;
        }
    },

    setBlockedCount: async (serviceType, slotTime, date, blockedCount) => {
        const cap = capacityFor(serviceType);
        const desired = Math.max(0, Math.min(cap, Math.trunc(Number(blockedCount) || 0)));
        if (desired === 0) return get().unblockSlot(serviceType, slotTime, date);
        return get().blockSlot(serviceType, slotTime, date, desired);
    },

    unblockSlot: async (serviceType, slotTime, date) => {
        mutationVersion += 1;
        const originalSlot = get().blockedSlots.find(s =>
            s.serviceType === serviceType && s.slotTime === slotTime && s.date === date);

        set((state) => ({
            blockedSlots: state.blockedSlots.filter(
                (s) =>
                    !(
                        s.serviceType === serviceType &&
                        s.slotTime === slotTime &&
                        s.date === date
                    )
            ),
        }));

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('blocked_slots')
                .delete()
                .match({
                    service_type: serviceType,
                    slot_time: slotTime,
                    date: date,
                });

            if (error) throw error;
            mutationVersion += 1;
            return true;
        } catch (error) {
            mutationVersion += 1;
            console.error('Error unblocking slot:', error);
            toast.error('Failed to unblock slot');
            set((state) => ({ blockedSlots: [
                ...state.blockedSlots.filter(s => !(s.serviceType === serviceType && s.slotTime === slotTime && s.date === date)),
                ...(originalSlot ? [originalSlot] : []),
            ] }));
            return false;
        }
    },

    isSlotBlocked: (serviceType, slotTime, date) => {
        return isFullyBlocked(get().blockedSlots, serviceType, slotTime, date);
    },

    getBlockedCount: (serviceType, slotTime, date) => {
        return countFor(get().blockedSlots, serviceType, slotTime, date);
    },

    getEffectiveCapacity: (serviceType, slotTime, date) => {
        return capacityLeftFor(get().blockedSlots, serviceType, slotTime, date);
    },
}));
