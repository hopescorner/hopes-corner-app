import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createClient } from '@/lib/supabase/client';
import { mapGuestReminderRow } from '@/lib/utils/mappers';
import toast from 'react-hot-toast';

export type ReminderServiceType = 'shower' | 'laundry' | 'bicycle' | 'all';

export interface GuestReminder {
    id: string;
    guestId: string;
    message: string;
    appliesTo: ReminderServiceType[];
    createdBy: string | null;
    dismissedAt: string | null;
    dismissedBy: string | null;
    createdAt?: string;
    updatedAt?: string;
}

interface RemindersState {
    reminders: GuestReminder[];
    isLoading: boolean;
    isLoaded: boolean;

    // Core actions
    ensureLoaded: () => Promise<void>;
    loadFromSupabase: () => Promise<void>;
    addReminder: (guestId: string, options: {
        message: string;
        appliesTo?: ReminderServiceType[];
        createdBy?: string;
    }) => Promise<GuestReminder>;
    dismissReminder: (reminderId: string, dismissedBy?: string) => Promise<boolean>;
    deleteReminder: (reminderId: string) => Promise<boolean>;

    // Queries
    getRemindersForGuest: (guestId: string) => GuestReminder[];
    getActiveRemindersForGuest: (guestId: string) => GuestReminder[];
    getRemindersForService: (guestId: string, serviceType: ReminderServiceType) => GuestReminder[];
    hasActiveReminder: (guestId: string, serviceType?: ReminderServiceType) => boolean;
}

export const useRemindersStore = create<RemindersState>()(
    devtools(
        immer((set, get) => ({
            // State
            reminders: [],
            isLoading: false,
            isLoaded: false,

            // Ensure loaded (idempotent)
            ensureLoaded: async () => {
                if (get().isLoaded || get().isLoading) return;
                await get().loadFromSupabase();
            },

            // Load all reminders from Supabase
            loadFromSupabase: async () => {
                const supabase = createClient();
                set((state) => { state.isLoading = true; });

                try {
                    const { data, error } = await supabase
                        .from('guest_reminders')
                        .select('*')
                        .order('created_at', { ascending: false });

                    if (error) {
                        console.error('Failed to load reminders from Supabase:', error);
                        return;
                    }

                    const mapped = (data || []).map(mapGuestReminderRow);
                    set((state) => {
                        state.reminders = mapped as GuestReminder[];
                        state.isLoaded = true;
                    });
                } catch (error) {
                    console.error('Error loading reminders:', error);
                } finally {
                    set((state) => { state.isLoading = false; });
                }
            },

            // Add a new reminder
            addReminder: async (guestId, { message, appliesTo = ['all'], createdBy }) => {
                const supabase = createClient();

                const payload = {
                    guest_id: guestId,
                    message: message.trim(),
                    applies_to: appliesTo,
                    created_by: createdBy || null,
                };

                const { data, error } = await supabase
                    .from('guest_reminders')
                    .insert(payload)
                    .select()
                    .single();

                if (error) {
                    console.error('Failed to add reminder to Supabase:', error);
                    throw new Error('Unable to save reminder.');
                }

                const mapped = mapGuestReminderRow(data) as GuestReminder;
                set((state) => {
                    state.reminders.unshift(mapped);
                });

                return mapped;
            },

            // Dismiss a reminder (soft delete - sets dismissed_at)
            dismissReminder: async (reminderId, dismissedBy) => {
                const supabase = createClient();
                const now = new Date().toISOString();

                // Optimistic update
                const originalReminders = get().reminders;
                set((state) => {
                    const idx = state.reminders.findIndex(r => r.id === reminderId);
                    if (idx !== -1) {
                        state.reminders[idx].dismissedAt = now;
                        state.reminders[idx].dismissedBy = dismissedBy || null;
                    }
                });

                const { error } = await supabase
                    .from('guest_reminders')
                    .update({
                        dismissed_at: now,
                        dismissed_by: dismissedBy || null,
                    })
                    .eq('id', reminderId);

                if (error) {
                    console.error('Failed to dismiss reminder:', error);
                    // Rollback
                    set((state) => {
                        state.reminders = originalReminders;
                    });
                    return false;
                }

                return true;
            },

            // Permanently delete a reminder
            deleteReminder: async (reminderId) => {
                const supabase = createClient();

                // Optimistic update
                set((state) => {
                    state.reminders = state.reminders.filter(r => r.id !== reminderId);
                });

                const { error } = await supabase
                    .from('guest_reminders')
                    .delete()
                    .eq('id', reminderId);

                if (error) {
                    console.error('Failed to delete reminder:', error);
                    // Reload to restore state
                    get().loadFromSupabase();
                    return false;
                }

                return true;
            },

            // Get all reminders for a guest (including dismissed)
            getRemindersForGuest: (guestId) => {
                const { reminders } = get();
                return reminders.filter(r => r.guestId === guestId);
            },

            // Get only active (not dismissed) reminders for a guest
            getActiveRemindersForGuest: (guestId) => {
                const { reminders } = get();
                return reminders.filter(r => r.guestId === guestId && !r.dismissedAt);
            },

            // Get active reminders for a specific service type
            getRemindersForService: (guestId, serviceType) => {
                const { reminders } = get();
                return reminders.filter(r => {
                    if (r.guestId !== guestId) return false;
                    if (r.dismissedAt) return false;
                    // Check if reminder applies to this service
                    return r.appliesTo.includes('all') || r.appliesTo.includes(serviceType);
                });
            },

            // Check if guest has any active reminders (optionally for a specific service)
            hasActiveReminder: (guestId, serviceType) => {
                const { reminders } = get();
                return reminders.some(r => {
                    if (r.guestId !== guestId) return false;
                    if (r.dismissedAt) return false;
                    if (!serviceType) return true;
                    return r.appliesTo.includes('all') || r.appliesTo.includes(serviceType);
                });
            },
        })),
        { name: 'RemindersStore' }
    )
);
