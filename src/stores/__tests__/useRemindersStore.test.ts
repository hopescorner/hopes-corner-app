import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRemindersStore } from '../useRemindersStore';

// Mock Supabase client
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: () => ({
            select: mockSelect,
            insert: mockInsert,
            update: mockUpdate,
            delete: mockDelete,
        }),
    }),
}));

vi.mock('@/lib/utils/mappers', () => ({
    mapGuestReminderRow: (row: any) => ({
        id: row.id,
        guestId: row.guest_id,
        message: row.message,
        appliesTo: row.applies_to,
        createdBy: row.created_by,
        dismissedAt: row.dismissed_at,
        dismissedBy: row.dismissed_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }),
}));

describe('useRemindersStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset store state
        useRemindersStore.setState({
            reminders: [],
            isLoading: false,
            isLoaded: false,
        });
    });

    describe('ensureLoaded', () => {
        it('calls loadFromSupabase on first call', async () => {
            mockSelect.mockReturnValue({
                order: vi.fn().mockResolvedValue({
                    data: [
                        {
                            id: 'r1',
                            guest_id: 'g1',
                            message: 'Test reminder',
                            applies_to: ['shower'],
                            created_by: null,
                            dismissed_at: null,
                            dismissed_by: null,
                            created_at: '2026-02-21T10:00:00Z',
                            updated_at: '2026-02-21T10:00:00Z',
                        },
                    ],
                    error: null,
                }),
            });

            await useRemindersStore.getState().ensureLoaded();

            const state = useRemindersStore.getState();
            expect(state.isLoaded).toBe(true);
            expect(state.reminders).toHaveLength(1);
            expect(state.reminders[0].guestId).toBe('g1');
        });

        it('does not reload on second call', async () => {
            mockSelect.mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
            });

            await useRemindersStore.getState().ensureLoaded();
            expect(mockSelect).toHaveBeenCalledTimes(1);

            // Second call should be a no-op
            await useRemindersStore.getState().ensureLoaded();
            expect(mockSelect).toHaveBeenCalledTimes(1);
        });

        it('skips if already loading', async () => {
            useRemindersStore.setState({ isLoading: true });

            mockSelect.mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
            });

            await useRemindersStore.getState().ensureLoaded();
            expect(mockSelect).not.toHaveBeenCalled();
        });
    });

    describe('getRemindersForService', () => {
        it('returns reminders matching service type', () => {
            useRemindersStore.setState({
                reminders: [
                    { id: 'r1', guestId: 'g1', message: 'Shower note', appliesTo: ['shower'], createdBy: null, dismissedAt: null, dismissedBy: null },
                    { id: 'r2', guestId: 'g1', message: 'All services', appliesTo: ['all'], createdBy: null, dismissedAt: null, dismissedBy: null },
                    { id: 'r3', guestId: 'g1', message: 'Laundry only', appliesTo: ['laundry'], createdBy: null, dismissedAt: null, dismissedBy: null },
                ],
            } as any);

            const showerReminders = useRemindersStore.getState().getRemindersForService('g1', 'shower');
            expect(showerReminders).toHaveLength(2); // r1 (shower) + r2 (all)
            expect(showerReminders.map(r => r.id)).toEqual(['r1', 'r2']);
        });

        it('filters out dismissed reminders', () => {
            useRemindersStore.setState({
                reminders: [
                    { id: 'r1', guestId: 'g1', message: 'Active', appliesTo: ['shower'], createdBy: null, dismissedAt: null, dismissedBy: null },
                    { id: 'r2', guestId: 'g1', message: 'Dismissed', appliesTo: ['shower'], createdBy: null, dismissedAt: '2026-02-21', dismissedBy: null },
                ],
            } as any);

            const reminders = useRemindersStore.getState().getRemindersForService('g1', 'shower');
            expect(reminders).toHaveLength(1);
            expect(reminders[0].id).toBe('r1');
        });
    });

    describe('hasActiveReminder', () => {
        it('returns true for guest with active reminder', () => {
            useRemindersStore.setState({
                reminders: [
                    { id: 'r1', guestId: 'g1', message: 'Note', appliesTo: ['all'], createdBy: null, dismissedAt: null, dismissedBy: null },
                ],
            } as any);

            expect(useRemindersStore.getState().hasActiveReminder('g1')).toBe(true);
            expect(useRemindersStore.getState().hasActiveReminder('g2')).toBe(false);
        });

        it('filters by service type when specified', () => {
            useRemindersStore.setState({
                reminders: [
                    { id: 'r1', guestId: 'g1', message: 'Shower only', appliesTo: ['shower'], createdBy: null, dismissedAt: null, dismissedBy: null },
                ],
            } as any);

            expect(useRemindersStore.getState().hasActiveReminder('g1', 'shower')).toBe(true);
            expect(useRemindersStore.getState().hasActiveReminder('g1', 'laundry')).toBe(false);
        });
    });
});
