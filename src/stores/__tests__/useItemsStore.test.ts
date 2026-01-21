import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useItemsStore } from '../useItemsStore';

// Mock Supabase client
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: vi.fn(() => ({
            select: mockSelect,
            insert: mockInsert,
            delete: mockDelete,
        })),
    }),
}));

describe('useItemsStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useItemsStore.setState({
            distributedItems: [],
            isLoading: false,
            error: null,
        });

        mockSelect.mockReturnValue({
            eq: mockEq,
        });
        mockEq.mockReturnValue({
            order: mockOrder,
        });
        mockOrder.mockResolvedValue({ data: [], error: null });

        mockInsert.mockReturnValue({
            select: vi.fn().mockReturnValue({
                single: mockSingle,
            }),
        });
        mockSingle.mockResolvedValue({
            data: {
                id: 'new-item-id',
                guest_id: 'g1',
                item_key: 'tshirt',
                distributed_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
            },
            error: null,
        });

        // Setup delete mock chain
        mockDelete.mockReturnValue({
            eq: mockEq,
        });
    });

    describe('initial state', () => {
        it('initializes with default state', () => {
            const state = useItemsStore.getState();
            expect(state.distributedItems).toEqual([]);
            expect(state.isLoading).toBe(false);
            expect(state.error).toBe(null);
        });
    });

    describe('fetchItemsForGuest', () => {
        it('fetches items for a guest successfully', async () => {
            mockOrder.mockResolvedValueOnce({
                data: [
                    { id: 'i1', guest_id: 'g1', item_key: 'tshirt', distributed_at: '2025-01-06T10:00:00Z', created_at: '2025-01-06T10:00:00Z' },
                ],
                error: null,
            });

            const { fetchItemsForGuest } = useItemsStore.getState();
            await fetchItemsForGuest('g1');

            const state = useItemsStore.getState();
            expect(state.distributedItems.length).toBe(1);
            expect(state.distributedItems[0].itemKey).toBe('tshirt');
            expect(state.isLoading).toBe(false);
        });

        it('handles fetch error gracefully', async () => {
            mockOrder.mockResolvedValueOnce({
                data: null,
                error: { message: 'Fetch failed' },
            });

            const { fetchItemsForGuest } = useItemsStore.getState();
            await fetchItemsForGuest('g1');

            const state = useItemsStore.getState();
            expect(state.error).toBe('Fetch failed');
            expect(state.isLoading).toBe(false);
        });

        it('handles exception gracefully', async () => {
            mockOrder.mockRejectedValueOnce(new Error('Network error'));

            const { fetchItemsForGuest } = useItemsStore.getState();
            await fetchItemsForGuest('g1');

            const state = useItemsStore.getState();
            expect(state.error).toBe('Network error');
            expect(state.isLoading).toBe(false);
        });

        it('merges items for different guests', async () => {
            // First fetch for g1
            mockOrder.mockResolvedValueOnce({
                data: [{ id: 'i1', guest_id: 'g1', item_key: 'tshirt', distributed_at: new Date().toISOString(), created_at: new Date().toISOString() }],
                error: null,
            });
            await useItemsStore.getState().fetchItemsForGuest('g1');

            // Second fetch for g2
            mockOrder.mockResolvedValueOnce({
                data: [{ id: 'i2', guest_id: 'g2', item_key: 'backpack', distributed_at: new Date().toISOString(), created_at: new Date().toISOString() }],
                error: null,
            });
            await useItemsStore.getState().fetchItemsForGuest('g2');

            const state = useItemsStore.getState();
            expect(state.distributedItems.length).toBe(2);
        });
    });

    describe('giveItem', () => {
        it('gives item to guest successfully', async () => {
            const { giveItem } = useItemsStore.getState();
            const result = await giveItem('g1', 'tshirt');

            expect(result).toBeDefined();
            expect(result?.id).toBe('new-item-id');
            expect(result?.itemKey).toBe('tshirt');
            expect(useItemsStore.getState().isLoading).toBe(false);
        });

        it('handles give item error', async () => {
            mockInsert.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } }),
                }),
            });

            const { giveItem } = useItemsStore.getState();
            const result = await giveItem('g1', 'tshirt');

            expect(result).toBeNull();
            expect(useItemsStore.getState().error).toBe('Insert failed');
        });

        it('handles give item exception', async () => {
            mockInsert.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockRejectedValueOnce(new Error('Network error')),
                }),
            });

            const { giveItem } = useItemsStore.getState();
            const result = await giveItem('g1', 'tshirt');

            expect(result).toBeNull();
            expect(useItemsStore.getState().error).toBe('Network error');
        });

        it('adds item to distributedItems', async () => {
            const { giveItem } = useItemsStore.getState();
            await giveItem('g1', 'tshirt');

            const state = useItemsStore.getState();
            expect(state.distributedItems.length).toBe(1);
        });
    });

    describe('getLastGivenDate', () => {
        it('returns null if no items found', () => {
            const { getLastGivenDate } = useItemsStore.getState();
            const result = getLastGivenDate('g1', 'tshirt');
            expect(result).toBeNull();
        });

        it('returns the most recent date', () => {
            const older = new Date('2025-01-01T10:00:00Z');
            const newer = new Date('2025-01-06T10:00:00Z');

            useItemsStore.setState({
                distributedItems: [
                    { id: 'i1', guestId: 'g1', itemKey: 'tshirt', distributedAt: older.toISOString(), createdAt: older.toISOString() },
                    { id: 'i2', guestId: 'g1', itemKey: 'tshirt', distributedAt: newer.toISOString(), createdAt: newer.toISOString() },
                ],
            });

            const { getLastGivenDate } = useItemsStore.getState();
            const result = getLastGivenDate('g1', 'tshirt');
            expect(result?.toISOString()).toBe(newer.toISOString());
        });
    });

    describe('checkAvailability', () => {
        it('returns available for never-given item', () => {
            const { checkAvailability } = useItemsStore.getState();
            const result = checkAvailability('g1', 'tshirt');
            expect(result.available).toBe(true);
        });

        it('calculates cooldown for sleeping_bag (30 days)', () => {
            const recently = new Date();
            recently.setDate(recently.getDate() - 5);

            useItemsStore.setState({
                distributedItems: [
                    { id: '1', guestId: 'g1', itemKey: 'sleeping_bag', distributedAt: recently.toISOString(), createdAt: recently.toISOString() },
                ],
            });

            const { checkAvailability } = useItemsStore.getState();
            const result = checkAvailability('g1', 'sleeping_bag');
            expect(result.available).toBe(false);
            expect(result.daysRemaining).toBe(25);
        });

        it('calculates cooldown for backpack (30 days)', () => {
            const recently = new Date();
            recently.setDate(recently.getDate() - 10);

            useItemsStore.setState({
                distributedItems: [
                    { id: '1', guestId: 'g1', itemKey: 'backpack', distributedAt: recently.toISOString(), createdAt: recently.toISOString() },
                ],
            });

            const { checkAvailability } = useItemsStore.getState();
            const result = checkAvailability('g1', 'backpack');
            expect(result.available).toBe(false);
            expect(result.daysRemaining).toBe(20);
        });

        it('calculates cooldown for tent (30 days)', () => {
            const recently = new Date();
            recently.setDate(recently.getDate() - 15);

            useItemsStore.setState({
                distributedItems: [
                    { id: '1', guestId: 'g1', itemKey: 'tent', distributedAt: recently.toISOString(), createdAt: recently.toISOString() },
                ],
            });

            const { checkAvailability } = useItemsStore.getState();
            const result = checkAvailability('g1', 'tent');
            expect(result.available).toBe(false);
            expect(result.daysRemaining).toBe(15);
        });

        it('calculates cooldown for shoes (30 days)', () => {
            const recently = new Date();
            recently.setDate(recently.getDate() - 20);

            useItemsStore.setState({
                distributedItems: [
                    { id: '1', guestId: 'g1', itemKey: 'shoes', distributedAt: recently.toISOString(), createdAt: recently.toISOString() },
                ],
            });

            const { checkAvailability } = useItemsStore.getState();
            const result = checkAvailability('g1', 'shoes');
            expect(result.available).toBe(false);
            expect(result.daysRemaining).toBe(10);
        });

        it('calculates cooldown for blanket (30 days)', () => {
            const recently = new Date();
            recently.setDate(recently.getDate() - 25);

            useItemsStore.setState({
                distributedItems: [
                    { id: '1', guestId: 'g1', itemKey: 'blanket', distributedAt: recently.toISOString(), createdAt: recently.toISOString() },
                ],
            });

            const { checkAvailability } = useItemsStore.getState();
            const result = checkAvailability('g1', 'blanket');
            expect(result.available).toBe(false);
            expect(result.daysRemaining).toBe(5);
        });

        it('calculates cooldown for flipflops (30 days)', () => {
            const recently = new Date();
            recently.setDate(recently.getDate() - 2);

            useItemsStore.setState({
                distributedItems: [
                    { id: '1', guestId: 'g1', itemKey: 'flipflops', distributedAt: recently.toISOString(), createdAt: recently.toISOString() },
                ],
            });

            const { checkAvailability } = useItemsStore.getState();
            const result = checkAvailability('g1', 'flipflops');
            expect(result.available).toBe(false);
            expect(result.daysRemaining).toBe(28);
        });

        it('calculates cooldown for flip_flops (30 days)', () => {
            const recently = new Date();
            recently.setDate(recently.getDate() - 2);

            useItemsStore.setState({
                distributedItems: [
                    { id: '1', guestId: 'g1', itemKey: 'flip_flops', distributedAt: recently.toISOString(), createdAt: recently.toISOString() },
                ],
            });

            const { checkAvailability } = useItemsStore.getState();
            const result = checkAvailability('g1', 'flip_flops');
            expect(result.available).toBe(false);
            expect(result.daysRemaining).toBe(28);
        });

        it('calculates cooldown for jacket (15 days)', () => {
            const recently = new Date();
            recently.setDate(recently.getDate() - 5); // Given 5 days ago

            useItemsStore.setState({
                distributedItems: [
                    { id: '1', guestId: 'g1', itemKey: 'jacket', distributedAt: recently.toISOString(), createdAt: recently.toISOString() },
                ],
            });

            const { checkAvailability } = useItemsStore.getState();
            const result = checkAvailability('g1', 'jacket');
            expect(result.available).toBe(false);
            expect(result.daysRemaining).toBe(10); // 15 - 5 = 10 days remaining
        });

        it('allows jacket after cooldown expires', () => {
            const longAgo = new Date();
            longAgo.setDate(longAgo.getDate() - 16); // Given 16 days ago (past 15-day cooldown)

            useItemsStore.setState({
                distributedItems: [
                    { id: '1', guestId: 'g1', itemKey: 'jacket', distributedAt: longAgo.toISOString(), createdAt: longAgo.toISOString() },
                ],
            });

            const { checkAvailability } = useItemsStore.getState();
            const result = checkAvailability('g1', 'jacket');
            expect(result.available).toBe(true);
        });

        it('allows item after cooldown expires', () => {
            const longAgo = new Date();
            longAgo.setDate(longAgo.getDate() - 35);

            useItemsStore.setState({
                distributedItems: [
                    { id: '2', guestId: 'g1', itemKey: 'sleeping_bag', distributedAt: longAgo.toISOString(), createdAt: longAgo.toISOString() },
                ],
            });

            const { checkAvailability } = useItemsStore.getState();
            const result = checkAvailability('g1', 'sleeping_bag');
            expect(result.available).toBe(true);
        });

        it('returns available for unknown item types', () => {
            const recently = new Date();

            useItemsStore.setState({
                distributedItems: [
                    { id: '1', guestId: 'g1', itemKey: 'socks', distributedAt: recently.toISOString(), createdAt: recently.toISOString() },
                ],
            });

            const { checkAvailability } = useItemsStore.getState();
            const result = checkAvailability('g1', 'socks');
            expect(result.available).toBe(true);
        });

        it('handles tshirt weekly reset correctly (Monday logic)', () => {
            vi.useFakeTimers();

            const lastSat = new Date('2024-01-06T12:00:00Z'); // Saturday
            useItemsStore.setState({
                distributedItems: [
                    { id: '3', guestId: 'g1', itemKey: 'tshirt', distributedAt: lastSat.toISOString(), createdAt: lastSat.toISOString() },
                ],
            });

            // Sunday - not available yet
            vi.setSystemTime(new Date('2024-01-07T10:00:00Z'));
            let result = useItemsStore.getState().checkAvailability('g1', 'tshirt');
            expect(result.available).toBe(false);

            // Monday - available
            vi.setSystemTime(new Date('2024-01-08T10:00:00Z'));
            result = useItemsStore.getState().checkAvailability('g1', 'tshirt');
            expect(result.available).toBe(true);

            vi.useRealTimers();
        });

        it('handles tshirt given on Monday (next Monday)', () => {
            vi.useFakeTimers();

            const lastMon = new Date('2024-01-08T12:00:00Z'); // Monday
            useItemsStore.setState({
                distributedItems: [
                    { id: '4', guestId: 'g1', itemKey: 'tshirt', distributedAt: lastMon.toISOString(), createdAt: lastMon.toISOString() },
                ],
            });

            // Same Monday - not available
            vi.setSystemTime(new Date('2024-01-08T14:00:00Z'));
            let result = useItemsStore.getState().checkAvailability('g1', 'tshirt');
            expect(result.available).toBe(false);

            // Next Monday - available
            vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
            result = useItemsStore.getState().checkAvailability('g1', 'tshirt');
            expect(result.available).toBe(true);

            vi.useRealTimers();
        });
    });

    describe('undoItem', () => {
        it('undoes an item successfully', async () => {
            // Setup initial state with an item
            useItemsStore.setState({
                distributedItems: [
                    { id: 'item-to-undo', guestId: 'g1', itemKey: 'tshirt', distributedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
                ],
            });

            // Mock successful delete
            mockDelete.mockReturnValue({
                eq: vi.fn().mockResolvedValueOnce({ error: null }),
            });

            const { undoItem } = useItemsStore.getState();
            const result = await undoItem('item-to-undo');

            expect(result).toBe(true);
            const state = useItemsStore.getState();
            expect(state.distributedItems.length).toBe(0);
            expect(state.isLoading).toBe(false);
        });

        it('removes only the specified item from distributedItems', async () => {
            // Setup initial state with multiple items
            useItemsStore.setState({
                distributedItems: [
                    { id: 'item-1', guestId: 'g1', itemKey: 'tshirt', distributedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
                    { id: 'item-2', guestId: 'g1', itemKey: 'jacket', distributedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
                    { id: 'item-3', guestId: 'g2', itemKey: 'tent', distributedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
                ],
            });

            // Mock successful delete
            mockDelete.mockReturnValue({
                eq: vi.fn().mockResolvedValueOnce({ error: null }),
            });

            const { undoItem } = useItemsStore.getState();
            const result = await undoItem('item-2');

            expect(result).toBe(true);
            const state = useItemsStore.getState();
            expect(state.distributedItems.length).toBe(2);
            expect(state.distributedItems.find(i => i.id === 'item-2')).toBeUndefined();
            expect(state.distributedItems.find(i => i.id === 'item-1')).toBeDefined();
            expect(state.distributedItems.find(i => i.id === 'item-3')).toBeDefined();
        });

        it('handles undo item error', async () => {
            useItemsStore.setState({
                distributedItems: [
                    { id: 'item-to-undo', guestId: 'g1', itemKey: 'tshirt', distributedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
                ],
            });

            // Mock failed delete
            mockDelete.mockReturnValue({
                eq: vi.fn().mockResolvedValueOnce({ error: { message: 'Delete failed' } }),
            });

            const { undoItem } = useItemsStore.getState();
            const result = await undoItem('item-to-undo');

            expect(result).toBe(false);
            expect(useItemsStore.getState().error).toBe('Delete failed');
            // Item should still be in state
            expect(useItemsStore.getState().distributedItems.length).toBe(1);
        });

        it('handles undo item exception', async () => {
            useItemsStore.setState({
                distributedItems: [
                    { id: 'item-to-undo', guestId: 'g1', itemKey: 'tshirt', distributedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
                ],
            });

            // Mock exception
            mockDelete.mockReturnValue({
                eq: vi.fn().mockRejectedValueOnce(new Error('Network error')),
            });

            const { undoItem } = useItemsStore.getState();
            const result = await undoItem('item-to-undo');

            expect(result).toBe(false);
            expect(useItemsStore.getState().error).toBe('Network error');
            // Item should still be in state
            expect(useItemsStore.getState().distributedItems.length).toBe(1);
        });

        it('handles undoing non-existent item', async () => {
            // Setup initial state with no items
            useItemsStore.setState({
                distributedItems: [],
            });

            // Mock successful delete (even though item doesn't exist locally)
            mockDelete.mockReturnValue({
                eq: vi.fn().mockResolvedValueOnce({ error: null }),
            });

            const { undoItem } = useItemsStore.getState();
            const result = await undoItem('non-existent-id');

            expect(result).toBe(true);
            expect(useItemsStore.getState().distributedItems.length).toBe(0);
        });
    });
});
