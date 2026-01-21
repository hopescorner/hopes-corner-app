'use client';

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createClient } from '@/lib/supabase/client';
import { todayPacificDateString } from '@/lib/utils/date';

export interface DistributedItem {
    id: string;
    guestId: string;
    itemKey: string;
    distributedAt: string;
    createdAt: string;
}

interface ItemsState {
    distributedItems: DistributedItem[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchItemsForGuest: (guestId: string) => Promise<void>;
    giveItem: (guestId: string, itemKey: string) => Promise<DistributedItem | null>;
    undoItem: (itemId: string) => Promise<boolean>;
    checkAvailability: (guestId: string, itemKey: string) => { available: boolean; nextAvailable?: Date; daysRemaining?: number };

    // Internal helper (exposed for potential debugging or specific use)
    getLastGivenDate: (guestId: string, itemKey: string) => Date | null;
}

export const useItemsStore = create<ItemsState>()(
    devtools(
        immer((set, get) => ({
            distributedItems: [],
            isLoading: false,
            error: null,

            fetchItemsForGuest: async (guestId: string) => {
                set({ isLoading: true, error: null });
                const supabase = createClient();
                try {
                    const { data, error } = await supabase
                        .from('items_distributed')
                        .select('*')
                        .eq('guest_id', guestId)
                        .order('distributed_at', { ascending: false });

                    if (error) throw error;

                    // Map snake_case to camelCase
                    const mappedItems = (data || []).map(item => ({
                        id: item.id,
                        guestId: item.guest_id,
                        itemKey: item.item_key,
                        distributedAt: item.distributed_at,
                        createdAt: item.created_at,
                    }));

                    set((state) => {
                        // Merge strategies? For now, we append or replace? 
                        // Since we fetch by guest, we should probably update the cache for that guest.
                        // Ideally we keep a map or just a large list. 
                        // To allow multi-guest viewing, we filter out existing items for this guest and add new ones.
                        state.distributedItems = [
                            ...state.distributedItems.filter(i => i.guestId !== guestId),
                            ...mappedItems
                        ];
                        state.isLoading = false;
                    });
                } catch (err: any) {
                    console.error('Error fetching distributed items:', err);
                    set({ isLoading: false, error: err.message });
                }
            },

            giveItem: async (guestId: string, itemKey: string) => {
                set({ isLoading: true, error: null });
                const supabase = createClient();
                const now = new Date().toISOString();

                try {
                    const { data, error } = await supabase
                        .from('items_distributed')
                        .insert({
                            guest_id: guestId,
                            item_key: itemKey,
                            distributed_at: now
                        })
                        .select()
                        .single();

                    if (error) throw error;

                    const newItem: DistributedItem = {
                        id: data.id,
                        guestId: data.guest_id,
                        itemKey: data.item_key,
                        distributedAt: data.distributed_at,
                        createdAt: data.created_at,
                    };

                    set((state) => {
                        state.distributedItems.unshift(newItem);
                        state.isLoading = false;
                    });

                    return newItem;
                } catch (err: any) {
                    console.error('Error giving item:', err);
                    set({ isLoading: false, error: err.message });
                    return null;
                }
            },

            undoItem: async (itemId: string) => {
                set({ isLoading: true, error: null });
                const supabase = createClient();

                try {
                    const { error } = await supabase
                        .from('items_distributed')
                        .delete()
                        .eq('id', itemId);

                    if (error) throw error;

                    set((state) => {
                        state.distributedItems = state.distributedItems.filter(
                            (item) => item.id !== itemId
                        );
                        state.isLoading = false;
                    });

                    return true;
                } catch (err: any) {
                    console.error('Error undoing item:', err);
                    set({ isLoading: false, error: err.message });
                    return false;
                }
            },

            getLastGivenDate: (guestId: string, itemKey: string) => {
                const { distributedItems } = get();
                const items = distributedItems.filter(i => i.guestId === guestId && i.itemKey === itemKey);
                if (items.length === 0) return null;

                // Sort descending just in case
                items.sort((a, b) => new Date(b.distributedAt).getTime() - new Date(a.distributedAt).getTime());
                return new Date(items[0].distributedAt);
            },

            checkAvailability: (guestId: string, itemKey: string) => {
                const lastDate = get().getLastGivenDate(guestId, itemKey);

                if (!lastDate) {
                    return { available: true };
                }

                // Logic ported from AppContext.jsx
                const last = new Date(lastDate);
                last.setHours(0, 0, 0, 0);

                let nextAvailable: Date | null = null;
                const now = new Date();
                now.setHours(0, 0, 0, 0);

                if (itemKey === 'tshirt') {
                    // Weekly reset on Monday
                    const day = last.getDay(); // 0 is Sunday
                    // Calculate days until next Monday (1)
                    // If today is Monday (1), days until next Mon is 7.
                    let daysUntilNextMon = (8 - day) % 7;
                    if (daysUntilNextMon === 0) daysUntilNextMon = 7;

                    const next = new Date(last);
                    next.setDate(last.getDate() + daysUntilNextMon);
                    nextAvailable = next;
                } else if (itemKey === 'jacket') {
                    // 15 days cooldown for jackets
                    const next = new Date(last);
                    next.setDate(last.getDate() + 15);
                    next.setHours(0, 0, 0, 0);
                    nextAvailable = next;
                } else if (['sleeping_bag', 'backpack', 'tent', 'flipflops', 'flip_flops', 'shoes', 'blanket'].includes(itemKey)) {
                    // 30 days cooldown for big ticket items
                    const next = new Date(last);
                    next.setDate(last.getDate() + 30);
                    next.setHours(0, 0, 0, 0);
                    nextAvailable = next;
                } else {
                    // Default to always available for other items (socks, hygiene kits, etc.)
                    // Or implement daily limit? Old app didn't specify others.
                    // Assuming others are daily or unlimited. 
                    // Let's assume unlimited/daily for now unless specified.
                    // Actually, if it's not in the list, old app returned null availability date which meant "return true" (available).
                    return { available: true };
                }

                if (nextAvailable && now < nextAvailable) {
                    const diffTime = Math.abs(nextAvailable.getTime() - now.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return { available: false, nextAvailable, daysRemaining: diffDays };
                }

                return { available: true };
            }
        })),
        { name: 'ItemsStore' }
    )
);
