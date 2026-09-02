import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';

export interface BlockedSlot {
    id: string;
    serviceType: 'shower' | 'laundry';
    slotTime: string;
    date: string;
    createdAt?: string;
    blockedBy?: string;
}

interface BlockedSlotsState {
    blockedSlots: BlockedSlot[];
    loading: boolean;
    initialized: boolean;

    fetchBlockedSlots: () => Promise<void>;
    ensureLoaded: () => Promise<void>;
    blockSlot: (serviceType: 'shower' | 'laundry', slotTime: string, date: string) => Promise<boolean>;
    unblockSlot: (serviceType: 'shower' | 'laundry', slotTime: string, date: string) => Promise<boolean>;
    isSlotBlocked: (serviceType: 'shower' | 'laundry', slotTime: string, date: string) => boolean;
}

export const useBlockedSlotsStore = create<BlockedSlotsState>((set, get) => ({
    blockedSlots: [],
    loading: false,
    initialized: false,

    ensureLoaded: async () => {
        if (get().initialized) return;
        await get().fetchBlockedSlots();
    },

    fetchBlockedSlots: async () => {
        const supabase = createClient();
        set({ loading: true });
        try {
            const { data, error } = await supabase
                .from('blocked_slots')
                .select('*')
                .order('date', { ascending: true });

            if (error) throw error;

            if (data) {
                set({
                    blockedSlots: data.map((item) => ({
                        id: item.id,
                        serviceType: item.service_type,
                        slotTime: item.slot_time,
                        date: item.date,
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

    blockSlot: async (serviceType, slotTime, date) => {
        const tempId = `temp-${Date.now()}`;
        const newSlot: BlockedSlot = {
            id: tempId,
            serviceType,
            slotTime,
            date,
            createdAt: new Date().toISOString(),
        };

        // Optimistic update
        set((state) => ({
            blockedSlots: [...state.blockedSlots, newSlot],
        }));

        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('blocked_slots')
                .insert({
                    service_type: serviceType,
                    slot_time: slotTime,
                    date: date,
                })
                .select()
                .single();

            if (error) {
                // Ignore duplicate key errors (slot already blocked)
                if (error.code !== '23505') {
                    throw error;
                }
            }

            if (data) {
                set((state) => ({
                    blockedSlots: state.blockedSlots.map((s) =>
                        s.id === tempId
                            ? {
                                ...s,
                                id: data.id,
                                createdAt: data.created_at,
                                blockedBy: data.blocked_by,
                            }
                            : s
                    ),
                }));
            }
            return true;
        } catch (error) {
            console.error('Error blocking slot:', error);
            toast.error('Failed to block slot');
            // Revert optimistic update
            set((state) => ({
                blockedSlots: state.blockedSlots.filter((s) => s.id !== tempId),
            }));
            return false;
        }
    },

    unblockSlot: async (serviceType, slotTime, date) => {
        const originalSlots = get().blockedSlots;

        // Optimistic update
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
            return true;
        } catch (error) {
            console.error('Error unblocking slot:', error);
            toast.error('Failed to unblock slot');
            // Revert
            set({ blockedSlots: originalSlots });
            return false;
        }
    },

    isSlotBlocked: (serviceType, slotTime, date) => {
        const slots = get().blockedSlots;
        const cleanSlot = slotTime?.trim();
        const cleanDate = date?.trim();
        return slots.some(
            (s) =>
                s.serviceType === serviceType &&
                s.slotTime?.trim() === cleanSlot &&
                s.date?.trim() === cleanDate
        );
    },
}));
