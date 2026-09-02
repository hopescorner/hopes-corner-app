import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBlockedSlotsStore } from '../useBlockedSlotsStore';

// Mock Supabase client
const mockOrder = vi.fn();
const mockSingle = vi.fn();
const mockMatch = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: () => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            order: mockOrder,
            match: mockMatch,
            single: mockSingle,
        }),
    }),
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('useBlockedSlotsStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset store
        useBlockedSlotsStore.setState({
            blockedSlots: [],
            loading: false,
            initialized: false,
        });

        // Default mock implementations
        mockOrder.mockResolvedValue({ data: [], error: null });
        mockSingle.mockResolvedValue({
            data: { id: 'new-id', created_at: new Date().toISOString(), blocked_by: null },
            error: null,
        });
        mockMatch.mockResolvedValue({ error: null });
    });

    describe('initial state', () => {
        it('starts with empty blocked slots', () => {
            const { blockedSlots, loading, initialized } = useBlockedSlotsStore.getState();

            expect(blockedSlots).toEqual([]);
            expect(loading).toBe(false);
            expect(initialized).toBe(false);
        });
    });

    describe('isSlotBlocked', () => {
        it('returns false for non-blocked slot', () => {
            const { isSlotBlocked } = useBlockedSlotsStore.getState();

            expect(isSlotBlocked('shower', '08:00', '2025-01-06')).toBe(false);
        });

        it('returns true for blocked slot', () => {
            useBlockedSlotsStore.setState({
                blockedSlots: [
                    { id: '1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06' },
                ],
            });

            const { isSlotBlocked } = useBlockedSlotsStore.getState();
            expect(isSlotBlocked('shower', '08:00', '2025-01-06')).toBe(true);
        });

        it('distinguishes between service types', () => {
            useBlockedSlotsStore.setState({
                blockedSlots: [
                    { id: '1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06' },
                ],
            });

            const { isSlotBlocked } = useBlockedSlotsStore.getState();
            expect(isSlotBlocked('shower', '08:00', '2025-01-06')).toBe(true);
            expect(isSlotBlocked('laundry', '08:00', '2025-01-06')).toBe(false);
        });

        it('distinguishes between dates', () => {
            useBlockedSlotsStore.setState({
                blockedSlots: [
                    { id: '1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06' },
                ],
            });

            const { isSlotBlocked } = useBlockedSlotsStore.getState();
            expect(isSlotBlocked('shower', '08:00', '2025-01-06')).toBe(true);
            expect(isSlotBlocked('shower', '08:00', '2025-01-07')).toBe(false);
        });

        it('distinguishes between slot times', () => {
            useBlockedSlotsStore.setState({
                blockedSlots: [
                    { id: '1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06' },
                ],
            });

            const { isSlotBlocked } = useBlockedSlotsStore.getState();
            expect(isSlotBlocked('shower', '08:00', '2025-01-06')).toBe(true);
            expect(isSlotBlocked('shower', '09:00', '2025-01-06')).toBe(false);
        });

        it('handles whitespace in slot times and dates gracefully', () => {
            useBlockedSlotsStore.setState({
                blockedSlots: [
                    { id: '1', serviceType: 'laundry', slotTime: ' 07:30 - 08:30 ', date: ' 2025-01-06 ' },
                ],
            });

            const { isSlotBlocked } = useBlockedSlotsStore.getState();
            expect(isSlotBlocked('laundry', '07:30 - 08:30', '2025-01-06')).toBe(true);
            expect(isSlotBlocked('laundry', ' 07:30 - 08:30 ', ' 2025-01-06 ')).toBe(true);
        });
    });

    describe('blockSlot', () => {
        it('adds slot optimistically', async () => {
            const { blockSlot } = useBlockedSlotsStore.getState();

            const promise = blockSlot('laundry', '09:00', '2025-01-06');

            // Check optimistic update
            const { blockedSlots } = useBlockedSlotsStore.getState();
            expect(blockedSlots.length).toBe(1);
            expect(blockedSlots[0].serviceType).toBe('laundry');
            expect(blockedSlots[0].slotTime).toBe('09:00');

            await promise;
        });

        it('returns true on success', async () => {
            const { blockSlot } = useBlockedSlotsStore.getState();
            const result = await blockSlot('shower', '10:00', '2025-01-06');

            expect(result).toBe(true);
        });

        it('updates slot with server data on success', async () => {
            mockSingle.mockResolvedValueOnce({
                data: {
                    id: 'server-id-123',
                    created_at: '2025-01-06T10:00:00Z',
                    blocked_by: 'user-123',
                },
                error: null,
            });

            const { blockSlot } = useBlockedSlotsStore.getState();
            await blockSlot('shower', '10:00', '2025-01-06');

            const { blockedSlots } = useBlockedSlotsStore.getState();
            expect(blockedSlots[0].id).toBe('server-id-123');
            expect(blockedSlots[0].blockedBy).toBe('user-123');
        });

        it('ignores duplicate key error (23505)', async () => {
            mockSingle.mockResolvedValueOnce({
                data: null,
                error: { code: '23505', message: 'Duplicate key' },
            });

            const { blockSlot } = useBlockedSlotsStore.getState();
            const result = await blockSlot('shower', '10:00', '2025-01-06');

            expect(result).toBe(true);
        });

        it('reverts optimistic update on error', async () => {
            mockSingle.mockResolvedValueOnce({
                data: null,
                error: { code: '12345', message: 'Some error' },
            });

            const { blockSlot } = useBlockedSlotsStore.getState();
            const result = await blockSlot('shower', '10:00', '2025-01-06');

            expect(result).toBe(false);
            expect(useBlockedSlotsStore.getState().blockedSlots.length).toBe(0);
        });

        it('handles exception and reverts state', async () => {
            mockSingle.mockRejectedValueOnce(new Error('Network error'));

            const { blockSlot } = useBlockedSlotsStore.getState();
            const result = await blockSlot('shower', '10:00', '2025-01-06');

            expect(result).toBe(false);
            expect(useBlockedSlotsStore.getState().blockedSlots.length).toBe(0);
        });
    });

    describe('unblockSlot', () => {
        it('removes slot optimistically', async () => {
            useBlockedSlotsStore.setState({
                blockedSlots: [
                    { id: '1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06' },
                ],
            });

            const { unblockSlot } = useBlockedSlotsStore.getState();
            const promise = unblockSlot('shower', '08:00', '2025-01-06');

            // Check optimistic removal
            const { blockedSlots } = useBlockedSlotsStore.getState();
            expect(blockedSlots.length).toBe(0);

            await promise;
        });

        it('returns true on success', async () => {
            useBlockedSlotsStore.setState({
                blockedSlots: [
                    { id: '1', serviceType: 'laundry', slotTime: '09:00', date: '2025-01-06' },
                ],
            });

            const { unblockSlot } = useBlockedSlotsStore.getState();
            const result = await unblockSlot('laundry', '09:00', '2025-01-06');

            expect(result).toBe(true);
        });

        it('reverts optimistic removal on error', async () => {
            useBlockedSlotsStore.setState({
                blockedSlots: [
                    { id: '1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06' },
                ],
            });

            mockMatch.mockResolvedValueOnce({ error: { message: 'Delete failed' } });

            const { unblockSlot } = useBlockedSlotsStore.getState();
            const result = await unblockSlot('shower', '08:00', '2025-01-06');

            expect(result).toBe(false);
            expect(useBlockedSlotsStore.getState().blockedSlots.length).toBe(1);
        });

        it('handles exception and reverts state', async () => {
            useBlockedSlotsStore.setState({
                blockedSlots: [
                    { id: '1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06' },
                ],
            });

            mockMatch.mockRejectedValueOnce(new Error('Network error'));

            const { unblockSlot } = useBlockedSlotsStore.getState();
            const result = await unblockSlot('shower', '08:00', '2025-01-06');

            expect(result).toBe(false);
            expect(useBlockedSlotsStore.getState().blockedSlots.length).toBe(1);
        });
    });

    describe('fetchBlockedSlots', () => {
        it('sets loading state during fetch', async () => {
            const { fetchBlockedSlots } = useBlockedSlotsStore.getState();

            const promise = fetchBlockedSlots();

            // Should be loading
            expect(useBlockedSlotsStore.getState().loading).toBe(true);

            await promise;

            // Should finish loading
            expect(useBlockedSlotsStore.getState().loading).toBe(false);
        });

        it('sets initialized to true after fetch', async () => {
            const { fetchBlockedSlots } = useBlockedSlotsStore.getState();

            expect(useBlockedSlotsStore.getState().initialized).toBe(false);

            await fetchBlockedSlots();

            expect(useBlockedSlotsStore.getState().initialized).toBe(true);
        });

        it('maps server data correctly', async () => {
            mockOrder.mockResolvedValueOnce({
                data: [
                    {
                        id: 'slot-1',
                        service_type: 'shower',
                        slot_time: '08:00',
                        date: '2025-01-06',
                        created_at: '2025-01-05T10:00:00Z',
                        blocked_by: 'admin',
                    },
                    {
                        id: 'slot-2',
                        service_type: 'laundry',
                        slot_time: '09:00',
                        date: '2025-01-06',
                        created_at: '2025-01-05T11:00:00Z',
                        blocked_by: null,
                    },
                ],
                error: null,
            });

            const { fetchBlockedSlots } = useBlockedSlotsStore.getState();
            await fetchBlockedSlots();

            const { blockedSlots } = useBlockedSlotsStore.getState();
            expect(blockedSlots.length).toBe(2);
            expect(blockedSlots[0].serviceType).toBe('shower');
            expect(blockedSlots[0].blockedBy).toBe('admin');
            expect(blockedSlots[1].serviceType).toBe('laundry');
        });

        it('handles fetch error gracefully', async () => {
            mockOrder.mockResolvedValueOnce({
                data: null,
                error: { message: 'Fetch failed' },
            });

            const { fetchBlockedSlots } = useBlockedSlotsStore.getState();
            await fetchBlockedSlots();

            expect(useBlockedSlotsStore.getState().loading).toBe(false);
            // Initialized should not be set on error
        });

        it('handles exception gracefully', async () => {
            mockOrder.mockRejectedValueOnce(new Error('Network error'));

            const { fetchBlockedSlots } = useBlockedSlotsStore.getState();
            await fetchBlockedSlots();

            expect(useBlockedSlotsStore.getState().loading).toBe(false);
        });
    });

    describe('ensureLoaded', () => {
        it('fetches blocked slots when not yet initialized', async () => {
            mockOrder.mockResolvedValueOnce({
                data: [{ id: 'slot-1', service_type: 'shower', slot_time: '08:00', date: '2025-01-06' }],
                error: null,
            });

            const { ensureLoaded } = useBlockedSlotsStore.getState();
            await ensureLoaded();

            expect(useBlockedSlotsStore.getState().initialized).toBe(true);
            expect(useBlockedSlotsStore.getState().blockedSlots.length).toBe(1);
        });

        it('does not re-fetch when already initialized', async () => {
            useBlockedSlotsStore.setState({
                initialized: true,
                blockedSlots: [{ id: 'slot-1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06' }],
            });

            const { ensureLoaded } = useBlockedSlotsStore.getState();
            await ensureLoaded();

            expect(mockOrder).not.toHaveBeenCalled();
        });
    });
});
