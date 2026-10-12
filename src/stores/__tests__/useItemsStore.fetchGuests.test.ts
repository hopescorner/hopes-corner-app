import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useItemsStore } from '../useItemsStore';

const mockIn = vi.fn();
const mockOrder = vi.fn();
const mockSelect = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: vi.fn(() => ({
            select: mockSelect,
        })),
    }),
}));

describe('useItemsStore.fetchItemsForGuests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useItemsStore.setState({ distributedItems: [], isLoading: false, error: null });
        mockSelect.mockReturnValue({ in: mockIn });
        mockIn.mockReturnValue({ order: mockOrder });
        mockOrder.mockResolvedValue({ data: [], error: null });
    });

    it('fetches history for multiple guests in one query and merges into cache', async () => {
        mockOrder.mockResolvedValueOnce({
            data: [
                { id: 'i1', guest_id: 'g1', item_key: 'jacket', distributed_at: new Date().toISOString(), created_at: new Date().toISOString() },
                { id: 'i2', guest_id: 'g2', item_key: 'tent', distributed_at: new Date().toISOString(), created_at: new Date().toISOString() },
            ],
            error: null,
        });

        await useItemsStore.getState().fetchItemsForGuests(['g1', 'g2']);

        expect(mockSelect).toHaveBeenCalledWith('*');
        expect(mockIn).toHaveBeenCalledWith('guest_id', ['g1', 'g2']);
        expect(useItemsStore.getState().distributedItems.length).toBe(2);
        expect(useItemsStore.getState().isLoading).toBe(false);
    });

    it('dedupes guest ids and skips empty input without querying', async () => {
        await useItemsStore.getState().fetchItemsForGuests(['g1', 'g1', '']);
        expect(mockIn).toHaveBeenCalledWith('guest_id', ['g1']);

        vi.clearAllMocks();
        await useItemsStore.getState().fetchItemsForGuests([]);
        expect(mockSelect).not.toHaveBeenCalled();
    });

    it('replaces cached rows for refetched guests but keeps others', async () => {
        useItemsStore.setState({
            distributedItems: [
                { id: 'old', guestId: 'g1', itemKey: 'jacket', distributedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
                { id: 'keep', guestId: 'g9', itemKey: 'tent', distributedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
            ],
        });
        mockOrder.mockResolvedValueOnce({
            data: [{ id: 'new', guest_id: 'g1', item_key: 'jacket', distributed_at: new Date().toISOString(), created_at: new Date().toISOString() }],
            error: null,
        });

        await useItemsStore.getState().fetchItemsForGuests(['g1']);

        const items = useItemsStore.getState().distributedItems;
        expect(items.find((i) => i.id === 'old')).toBeUndefined();
        expect(items.find((i) => i.id === 'new')).toBeDefined();
        expect(items.find((i) => i.id === 'keep')).toBeDefined();
    });

    it('records fetch errors without throwing', async () => {
        mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'Fetch failed' } });
        await useItemsStore.getState().fetchItemsForGuests(['g1']);
        expect(useItemsStore.getState().error).toBe('Fetch failed');
        expect(useItemsStore.getState().isLoading).toBe(false);
    });
});
