import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBlockedSlotsStore } from '../useBlockedSlotsStore';

const mockOrder = vi.fn();
const mockSingle = vi.fn();
const mockMatch = vi.fn();
const mockUpdateMatch = vi.fn();
const mockUpsert = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: () => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            upsert: mockUpsert,
            delete: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnValue({ match: mockUpdateMatch }),
            order: mockOrder,
            match: mockMatch,
            single: mockSingle,
        }),
    }),
}));

vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('useBlockedSlotsStore — partial blocking', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useBlockedSlotsStore.setState({
            blockedSlots: [],
            loading: false,
            initialized: false,
        });
        mockOrder.mockResolvedValue({ data: [], error: null });
        mockSingle.mockResolvedValue({
            data: { id: 'new-id', blocked_count: 1, created_at: new Date().toISOString(), blocked_by: null },
            error: null,
        });
        mockMatch.mockResolvedValue({ error: null });
        mockUpdateMatch.mockResolvedValue({ error: null });
        mockUpsert.mockReturnValue({ select: () => ({ single: mockSingle }) });
    });

    it('half-blocked shower slot is not fully blocked (effective capacity 1)', () => {
        useBlockedSlotsStore.setState({
            blockedSlots: [
                { id: '1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06', blockedCount: 1 },
            ],
        });
        const state = useBlockedSlotsStore.getState();
        expect(state.isSlotBlocked('shower', '08:00', '2025-01-06')).toBe(false);
        expect(state.getBlockedCount('shower', '08:00', '2025-01-06')).toBe(1);
        expect(state.getEffectiveCapacity('shower', '08:00', '2025-01-06')).toBe(1);
    });

    it('fully blocked shower slot reports effective capacity 0', () => {
        useBlockedSlotsStore.setState({
            blockedSlots: [
                { id: '1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06', blockedCount: 2 },
            ],
        });
        const state = useBlockedSlotsStore.getState();
        expect(state.isSlotBlocked('shower', '08:00', '2025-01-06')).toBe(true);
        expect(state.getEffectiveCapacity('shower', '08:00', '2025-01-06')).toBe(0);
    });

    it('legacy rows without blockedCount still mean fully blocked', () => {
        useBlockedSlotsStore.setState({
            blockedSlots: [
                { id: '1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06' },
            ],
        });
        const state = useBlockedSlotsStore.getState();
        expect(state.isSlotBlocked('shower', '08:00', '2025-01-06')).toBe(true);
        expect(state.getEffectiveCapacity('shower', '08:00', '2025-01-06')).toBe(0);
    });

    it('blockSlot with count 1 inserts a half block', async () => {
        const { blockSlot } = useBlockedSlotsStore.getState();
        const ok = await blockSlot('shower', '09:00', '2025-01-06', 1);
        expect(ok).toBe(true);
        const { blockedSlots } = useBlockedSlotsStore.getState();
        expect(blockedSlots.length).toBe(1);
        expect(blockedSlots[0].blockedCount).toBe(1);
    });

    it('setBlockedCount adjusts an existing full block down to a half block', async () => {
        useBlockedSlotsStore.setState({
            blockedSlots: [
                { id: '1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06', blockedCount: 2 },
            ],
        });
        const ok = await useBlockedSlotsStore.getState().setBlockedCount('shower', '08:00', '2025-01-06', 1);
        expect(ok).toBe(true);
        expect(mockUpsert).toHaveBeenCalledWith(
            expect.objectContaining({ service_type: 'shower', slot_time: '08:00', blocked_count: 1 }),
            { onConflict: 'service_type,slot_time,date' },
        );
        expect(useBlockedSlotsStore.getState().getEffectiveCapacity('shower', '08:00', '2025-01-06')).toBe(1);
    });

    it('setBlockedCount 2 upgrades a half block to a full block (no staff on-site)', async () => {
        mockSingle.mockResolvedValueOnce({
            data: { id: 'new-id', blocked_count: 2, created_at: new Date().toISOString(), blocked_by: null },
            error: null,
        });
        useBlockedSlotsStore.setState({
            blockedSlots: [
                { id: '1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06', blockedCount: 1 },
            ],
        });
        const ok = await useBlockedSlotsStore.getState().setBlockedCount('shower', '08:00', '2025-01-06', 2);
        expect(ok).toBe(true);
        expect(mockUpsert).toHaveBeenCalledWith(
            { service_type: 'shower', slot_time: '08:00', date: '2025-01-06', blocked_count: 2 },
            { onConflict: 'service_type,slot_time,date' },
        );
        const state = useBlockedSlotsStore.getState();
        expect(state.getBlockedCount('shower', '08:00', '2025-01-06')).toBe(2);
        expect(state.isSlotBlocked('shower', '08:00', '2025-01-06')).toBe(true);
        expect(state.getEffectiveCapacity('shower', '08:00', '2025-01-06')).toBe(0);
    });

    it('setBlockedCount clamps a block to the service capacity', async () => {
        const ok = await useBlockedSlotsStore.getState().setBlockedCount('laundry', '08:00 - 09:00', '2025-01-06', 2);
        expect(ok).toBe(true);
        expect(mockUpsert).toHaveBeenCalledWith(
            expect.objectContaining({ service_type: 'laundry', blocked_count: 1 }),
            { onConflict: 'service_type,slot_time,date' },
        );
    });

    it('setBlockedCount 0 unblocks the slot', async () => {
        useBlockedSlotsStore.setState({
            blockedSlots: [
                { id: '1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06', blockedCount: 1 },
            ],
        });
        const ok = await useBlockedSlotsStore.getState().setBlockedCount('shower', '08:00', '2025-01-06', 0);
        expect(ok).toBe(true);
        expect(useBlockedSlotsStore.getState().blockedSlots.length).toBe(0);
    });

    it('fetchBlockedSlots maps blocked_count', async () => {
        mockOrder.mockResolvedValueOnce({
            data: [
                {
                    id: 'slot-1',
                    service_type: 'shower',
                    slot_time: '08:00',
                    date: '2025-01-06',
                    blocked_count: 1,
                    created_at: '2025-01-05T10:00:00Z',
                    blocked_by: 'admin',
                },
            ],
            error: null,
        });
        await useBlockedSlotsStore.getState().fetchBlockedSlots();
        const { blockedSlots } = useBlockedSlotsStore.getState();
        expect(blockedSlots[0].blockedCount).toBe(1);
    });

    it('writes the requested count atomically even when another device has already blocked this time', async () => {
        await useBlockedSlotsStore.getState().setBlockedCount('shower', '08:00', '2025-01-06', 1);
        expect(mockUpsert).toHaveBeenCalledWith(
            { service_type: 'shower', slot_time: '08:00', date: '2025-01-06', blocked_count: 1 },
            { onConflict: 'service_type,slot_time,date' },
        );
        expect(useBlockedSlotsStore.getState().getBlockedCount('shower', '08:00', '2025-01-06')).toBe(1);
    });

    it('does not trust a cached block count when another device may have changed it', async () => {
        useBlockedSlotsStore.setState({ blockedSlots: [
            { id: '1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06', blockedCount: 1 },
        ] });
        await useBlockedSlotsStore.getState().setBlockedCount('shower', '08:00', '2025-01-06', 1);
        expect(mockUpsert).toHaveBeenCalled();
    });

    it('a failed unblock does not erase a successful change to another time', async () => {
        useBlockedSlotsStore.setState({ blockedSlots: [
            { id: '1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06', blockedCount: 2 },
        ] });
        let finishDelete!: (result: any) => void;
        mockMatch.mockImplementationOnce(() => new Promise(resolve => { finishDelete = resolve; }));
        const removal = useBlockedSlotsStore.getState().unblockSlot('shower', '08:00', '2025-01-06');
        await useBlockedSlotsStore.getState().setBlockedCount('shower', '09:00', '2025-01-06', 1);
        finishDelete({ error: { message: 'Network error' } });
        expect(await removal).toBe(false);
        expect(useBlockedSlotsStore.getState().getBlockedCount('shower', '09:00', '2025-01-06')).toBe(1);
        expect(useBlockedSlotsStore.getState().getBlockedCount('shower', '08:00', '2025-01-06')).toBe(2);
    });
});
