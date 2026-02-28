import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDailyNotesStore } from '../useDailyNotesStore';

// Mock Supabase client
const mockSelect = vi.fn();
const mockUpsert = vi.fn();
const mockDelete = vi.fn();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: () => ({
            select: mockSelect,
            upsert: mockUpsert,
            delete: mockDelete,
        }),
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
    }),
}));

vi.mock('@/lib/utils/mappers', () => ({
    mapDailyNoteRow: (row: any) => ({
        id: row.id,
        noteDate: row.note_date,
        serviceType: row.service_type,
        noteText: row.note_text,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }),
}));

vi.mock('react-hot-toast', () => ({
    default: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

describe('useDailyNotesStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useDailyNotesStore.setState({
            notes: [],
            isLoading: false,
            isLoaded: false,
            lastLoadedAt: undefined,
        });
    });

    describe('getNotesForDate', () => {
        it('returns notes matching the given date', () => {
            useDailyNotesStore.setState({
                notes: [
                    { id: '1', noteDate: '2026-01-15', serviceType: 'meals', noteText: 'Note 1', createdBy: null, updatedBy: null },
                    { id: '2', noteDate: '2026-01-15', serviceType: 'showers', noteText: 'Note 2', createdBy: null, updatedBy: null },
                    { id: '3', noteDate: '2026-01-16', serviceType: 'meals', noteText: 'Note 3', createdBy: null, updatedBy: null },
                ],
            });

            const result = useDailyNotesStore.getState().getNotesForDate('2026-01-15');
            expect(result).toHaveLength(2);
            expect(result.map(n => n.id)).toEqual(['1', '2']);
        });

        it('returns empty array for date with no notes', () => {
            useDailyNotesStore.setState({
                notes: [
                    { id: '1', noteDate: '2026-01-15', serviceType: 'meals', noteText: 'Note 1', createdBy: null, updatedBy: null },
                ],
            });

            const result = useDailyNotesStore.getState().getNotesForDate('2026-01-20');
            expect(result).toHaveLength(0);
        });
    });

    describe('getNoteForDateAndService', () => {
        it('returns matching note', () => {
            useDailyNotesStore.setState({
                notes: [
                    { id: '1', noteDate: '2026-01-15', serviceType: 'meals', noteText: 'Meal note', createdBy: null, updatedBy: null },
                    { id: '2', noteDate: '2026-01-15', serviceType: 'showers', noteText: 'Shower note', createdBy: null, updatedBy: null },
                ],
            });

            const result = useDailyNotesStore.getState().getNoteForDateAndService('2026-01-15', 'showers');
            expect(result).not.toBeNull();
            expect(result!.id).toBe('2');
            expect(result!.noteText).toBe('Shower note');
        });

        it('returns null when no match', () => {
            useDailyNotesStore.setState({
                notes: [
                    { id: '1', noteDate: '2026-01-15', serviceType: 'meals', noteText: 'Note', createdBy: null, updatedBy: null },
                ],
            });

            const result = useDailyNotesStore.getState().getNoteForDateAndService('2026-01-15', 'showers');
            expect(result).toBeNull();
        });
    });

    describe('getNotesForDateRange', () => {
        it('returns notes within the date range (inclusive)', () => {
            useDailyNotesStore.setState({
                notes: [
                    { id: '1', noteDate: '2026-01-10', serviceType: 'meals', noteText: 'Before', createdBy: null, updatedBy: null },
                    { id: '2', noteDate: '2026-01-15', serviceType: 'meals', noteText: 'Start', createdBy: null, updatedBy: null },
                    { id: '3', noteDate: '2026-01-18', serviceType: 'meals', noteText: 'Middle', createdBy: null, updatedBy: null },
                    { id: '4', noteDate: '2026-01-20', serviceType: 'meals', noteText: 'End', createdBy: null, updatedBy: null },
                    { id: '5', noteDate: '2026-01-25', serviceType: 'meals', noteText: 'After', createdBy: null, updatedBy: null },
                ],
            });

            const result = useDailyNotesStore.getState().getNotesForDateRange('2026-01-15', '2026-01-20');
            expect(result).toHaveLength(3);
            expect(result.map(n => n.id)).toEqual(['2', '3', '4']);
        });

        it('returns empty array when no notes in range', () => {
            useDailyNotesStore.setState({
                notes: [
                    { id: '1', noteDate: '2026-01-10', serviceType: 'meals', noteText: 'Before', createdBy: null, updatedBy: null },
                ],
            });

            const result = useDailyNotesStore.getState().getNotesForDateRange('2026-02-01', '2026-02-28');
            expect(result).toHaveLength(0);
        });
    });

    describe('hasNoteForDate', () => {
        it('returns true when notes exist for date', () => {
            useDailyNotesStore.setState({
                notes: [
                    { id: '1', noteDate: '2026-01-15', serviceType: 'meals', noteText: 'Note', createdBy: null, updatedBy: null },
                ],
            });

            expect(useDailyNotesStore.getState().hasNoteForDate('2026-01-15')).toBe(true);
        });

        it('returns false when no notes exist for date', () => {
            useDailyNotesStore.setState({
                notes: [
                    { id: '1', noteDate: '2026-01-15', serviceType: 'meals', noteText: 'Note', createdBy: null, updatedBy: null },
                ],
            });

            expect(useDailyNotesStore.getState().hasNoteForDate('2026-01-20')).toBe(false);
        });
    });

    describe('hasNoteForDateAndService', () => {
        it('returns true for matching date and service', () => {
            useDailyNotesStore.setState({
                notes: [
                    { id: '1', noteDate: '2026-01-15', serviceType: 'meals', noteText: 'Note', createdBy: null, updatedBy: null },
                ],
            });

            expect(useDailyNotesStore.getState().hasNoteForDateAndService('2026-01-15', 'meals')).toBe(true);
        });

        it('returns false for matching date but different service', () => {
            useDailyNotesStore.setState({
                notes: [
                    { id: '1', noteDate: '2026-01-15', serviceType: 'meals', noteText: 'Note', createdBy: null, updatedBy: null },
                ],
            });

            expect(useDailyNotesStore.getState().hasNoteForDateAndService('2026-01-15', 'showers')).toBe(false);
        });
    });

    describe('ensureLoaded', () => {
        it('loads notes from Supabase on first call', async () => {
            mockSelect.mockReturnValue({
                order: vi.fn().mockResolvedValue({
                    data: [
                        { id: '1', note_date: '2026-01-15', service_type: 'meals', note_text: 'Test', created_by: null, updated_by: null },
                    ],
                    error: null,
                }),
            });

            await useDailyNotesStore.getState().ensureLoaded();

            const state = useDailyNotesStore.getState();
            expect(state.isLoaded).toBe(true);
            expect(state.notes).toHaveLength(1);
            expect(state.notes[0].noteDate).toBe('2026-01-15');
        });

        it('does not reload when already loaded', async () => {
            useDailyNotesStore.setState({ isLoaded: true });

            await useDailyNotesStore.getState().ensureLoaded();

            expect(mockSelect).not.toHaveBeenCalled();
        });

        it('reloads when force is true', async () => {
            useDailyNotesStore.setState({ isLoaded: true });

            mockSelect.mockReturnValue({
                order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                }),
            });

            await useDailyNotesStore.getState().ensureLoaded({ force: true });

            expect(mockSelect).toHaveBeenCalled();
        });

        it('handles Supabase error gracefully', async () => {
            mockSelect.mockReturnValue({
                order: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Connection failed' },
                }),
            });

            await useDailyNotesStore.getState().ensureLoaded();

            const state = useDailyNotesStore.getState();
            expect(state.isLoaded).toBe(false);
            expect(state.isLoading).toBe(false);
        });

        it('prevents concurrent loads', async () => {
            useDailyNotesStore.setState({ isLoading: true });

            await useDailyNotesStore.getState().ensureLoaded();

            expect(mockSelect).not.toHaveBeenCalled();
        });
    });

    describe('addOrUpdateNote', () => {
        it('deletes existing note when text is empty', async () => {
            useDailyNotesStore.setState({
                notes: [
                    { id: '1', noteDate: '2026-01-15', serviceType: 'meals', noteText: 'Existing', createdBy: null, updatedBy: null },
                ],
            });

            mockDelete.mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            });

            const result = await useDailyNotesStore.getState().addOrUpdateNote('2026-01-15', 'meals', '   ');
            expect(result).toBeNull();
        });

        it('upserts note and updates state', async () => {
            const mockRow = {
                id: 'new-1',
                note_date: '2026-01-15',
                service_type: 'meals',
                note_text: 'New note',
                created_by: 'user-1',
                updated_by: 'user-1',
            };

            mockUpsert.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
                }),
            });

            const result = await useDailyNotesStore.getState().addOrUpdateNote('2026-01-15', 'meals', 'New note', 'user-1');

            expect(result).not.toBeNull();
            expect(result!.noteText).toBe('New note');
            expect(useDailyNotesStore.getState().notes).toHaveLength(1);
        });

        it('throws on Supabase error', async () => {
            mockUpsert.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'Write failed' },
                    }),
                }),
            });

            await expect(
                useDailyNotesStore.getState().addOrUpdateNote('2026-01-15', 'meals', 'Note')
            ).rejects.toThrow('Unable to save note.');
        });
    });

    describe('deleteNote', () => {
        it('removes note from state optimistically', async () => {
            useDailyNotesStore.setState({
                notes: [
                    { id: '1', noteDate: '2026-01-15', serviceType: 'meals', noteText: 'Note', createdBy: null, updatedBy: null },
                    { id: '2', noteDate: '2026-01-16', serviceType: 'meals', noteText: 'Other', createdBy: null, updatedBy: null },
                ],
            });

            mockDelete.mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            });

            const result = await useDailyNotesStore.getState().deleteNote('1');

            expect(result).toBe(true);
            expect(useDailyNotesStore.getState().notes).toHaveLength(1);
            expect(useDailyNotesStore.getState().notes[0].id).toBe('2');
        });

        it('rolls back on Supabase error', async () => {
            useDailyNotesStore.setState({
                notes: [
                    { id: '1', noteDate: '2026-01-15', serviceType: 'meals', noteText: 'Note', createdBy: null, updatedBy: null },
                ],
            });

            mockDelete.mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
            });

            const result = await useDailyNotesStore.getState().deleteNote('1');

            expect(result).toBe(false);
            expect(useDailyNotesStore.getState().notes).toHaveLength(1);
        });
    });

    describe('loadFromSupabase', () => {
        it('delegates to ensureLoaded with force=true', async () => {
            mockSelect.mockReturnValue({
                order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                }),
            });

            await useDailyNotesStore.getState().loadFromSupabase();

            expect(mockSelect).toHaveBeenCalled();
        });
    });
});
