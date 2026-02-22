import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createClient } from '@/lib/supabase/client';
import { mapDailyNoteRow } from '@/lib/utils/mappers';
import { DailyNoteServiceType } from '@/types/database';
import toast from 'react-hot-toast';

export interface DailyNote {
    id: string;
    noteDate: string;              // YYYY-MM-DD format
    serviceType: DailyNoteServiceType;
    noteText: string;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt?: string;
    updatedAt?: string;
}

interface DailyNotesState {
    notes: DailyNote[];
    isLoading: boolean;
    isLoaded: boolean;
    lastLoadedAt?: string;

    // CRUD operations
    ensureLoaded: (options?: { force?: boolean; since?: string }) => Promise<void>;
    loadFromSupabase: () => Promise<void>;
    addOrUpdateNote: (
        noteDate: string,
        serviceType: DailyNoteServiceType,
        noteText: string,
        userId?: string
    ) => Promise<DailyNote | null>;
    deleteNote: (noteId: string) => Promise<boolean>;

    // Getters
    getNotesForDate: (date: string) => DailyNote[];
    getNoteForDateAndService: (date: string, serviceType: DailyNoteServiceType) => DailyNote | null;
    getNotesForDateRange: (startDate: string, endDate: string) => DailyNote[];
    hasNoteForDate: (date: string) => boolean;
    hasNoteForDateAndService: (date: string, serviceType: DailyNoteServiceType) => boolean;

    // Real-time subscription
    subscribeToRealtime: () => () => void;
}

export const useDailyNotesStore = create<DailyNotesState>()(
    devtools(
        persist(
            immer((set, get) => ({
                notes: [],
                isLoading: false,
                isLoaded: false,
                lastLoadedAt: undefined,

                // Load all notes from Supabase
                ensureLoaded: async ({ force = false, since }: { force?: boolean; since?: string } = {}) => {
                    if (!force && get().isLoaded) return;
                    if (get().isLoading) return;

                    const supabase = createClient();
                    set((state) => { state.isLoading = true; });

                    try {
                        const query = supabase
                            .from('daily_notes')
                            .select('*')
                            .order('note_date', { ascending: false });
                        const { data, error } = since ? await query.gte('note_date', since) : await query;

                        if (error) {
                            console.error('Failed to load daily notes from Supabase:', error);
                            return;
                        }

                        const mapped = (data || []).map(mapDailyNoteRow) as DailyNote[];
                        set((state) => {
                            state.notes = mapped;
                            state.isLoaded = true;
                            state.lastLoadedAt = new Date().toISOString();
                        });
                    } catch (error) {
                        console.error('Error loading daily notes:', error);
                    } finally {
                        set((state) => { state.isLoading = false; });
                    }
                },

                loadFromSupabase: async () => {
                    await get().ensureLoaded({ force: true });
                },

                // Add or update a note (upsert on note_date + service_type)
                addOrUpdateNote: async (noteDate, serviceType, noteText, userId) => {
                    const supabase = createClient();
                    const trimmedText = noteText.trim();

                    // Don't allow empty notes - delete instead
                    if (!trimmedText) {
                        const existing = get().getNoteForDateAndService(noteDate, serviceType);
                        if (existing) {
                            await get().deleteNote(existing.id);
                        }
                        return null;
                    }

                    const existing = get().getNoteForDateAndService(noteDate, serviceType);

                    const payload = {
                        note_date: noteDate,
                        service_type: serviceType,
                        note_text: trimmedText,
                        created_by: existing ? existing.createdBy : (userId || null),
                        updated_by: userId || null,
                    };

                    const { data, error } = await supabase
                        .from('daily_notes')
                        .upsert(payload, {
                            onConflict: 'note_date,service_type',
                        })
                        .select()
                        .single();

                    if (error) {
                        console.error('Failed to save daily note to Supabase:', error);
                        toast.error('Failed to save note');
                        throw new Error('Unable to save note.');
                    }

                    const mapped = mapDailyNoteRow(data) as DailyNote;
                    set((state) => {
                        // Remove existing note for this date/service if present
                        state.notes = state.notes.filter(
                            (n) => !(n.noteDate === noteDate && n.serviceType === serviceType)
                        );
                        // Add the new/updated note
                        state.notes.unshift(mapped);
                    });

                    return mapped;
                },

                // Delete a note
                deleteNote: async (noteId) => {
                    const supabase = createClient();

                    // Optimistic update
                    const originalNotes = get().notes;
                    set((state) => {
                        state.notes = state.notes.filter((n) => n.id !== noteId);
                    });

                    const { error } = await supabase
                        .from('daily_notes')
                        .delete()
                        .eq('id', noteId);

                    if (error) {
                        console.error('Failed to delete daily note:', error);
                        // Rollback
                        set((state) => {
                            state.notes = originalNotes;
                        });
                        toast.error('Failed to delete note');
                        return false;
                    }

                    return true;
                },

                // Get all notes for a specific date
                getNotesForDate: (date) => {
                    const { notes } = get();
                    return notes.filter((n) => n.noteDate === date);
                },

                // Get a specific note for date and service type
                getNoteForDateAndService: (date, serviceType) => {
                    const { notes } = get();
                    return notes.find((n) => n.noteDate === date && n.serviceType === serviceType) || null;
                },

                // Get all notes within a date range (inclusive)
                getNotesForDateRange: (startDate, endDate) => {
                    const { notes } = get();
                    return notes.filter((n) => n.noteDate >= startDate && n.noteDate <= endDate);
                },

                // Check if any note exists for a date
                hasNoteForDate: (date) => {
                    const { notes } = get();
                    return notes.some((n) => n.noteDate === date);
                },

                // Check if a note exists for a specific date and service
                hasNoteForDateAndService: (date, serviceType) => {
                    const { notes } = get();
                    return notes.some((n) => n.noteDate === date && n.serviceType === serviceType);
                },

                // Subscribe to real-time changes
                subscribeToRealtime: () => {
                    const supabase = createClient();

                    const subscription = supabase
                        .channel('daily_notes_changes')
                        .on(
                            'postgres_changes',
                            { event: '*', schema: 'public', table: 'daily_notes' },
                            (payload) => {
                                const { eventType, new: newRecord, old: oldRecord } = payload;

                                if (eventType === 'INSERT' || eventType === 'UPDATE') {
                                    const mapped = mapDailyNoteRow(newRecord as any) as DailyNote;
                                    set((state) => {
                                        // Remove existing if updating
                                        state.notes = state.notes.filter(
                                            (n) => n.id !== mapped.id
                                        );
                                        state.notes.unshift(mapped);
                                    });
                                } else if (eventType === 'DELETE') {
                                    const deletedId = (oldRecord as any)?.id;
                                    if (deletedId) {
                                        set((state) => {
                                            state.notes = state.notes.filter((n) => n.id !== deletedId);
                                        });
                                    }
                                }
                            }
                        )
                        .subscribe();

                    // Return unsubscribe function
                    return () => {
                        supabase.removeChannel(subscription);
                    };
                },
            })),
            {
                name: 'hopes-corner-daily-notes',
                partialize: (state) => ({ notes: state.notes }),
            }
        ),
        { name: 'DailyNotesStore' }
    )
);
