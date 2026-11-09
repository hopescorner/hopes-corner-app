import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBlockedSlotsStore } from '../useBlockedSlotsStore';

const mockOrder = vi.fn();
const mockSingle = vi.fn();
const mockMatch = vi.fn();
const mockUpdateMatch = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: () => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
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
        expect(mockUpdateMatch).toHaveBeenCalledWith(
            expect.objectContaining({ service_type: 'shower', slot_time: '08:00' })
        );
        expect(useBlockedSlotsStore.getState().getEffectiveCapacity('shower', '08:00', '2025-01-06')).toBe(1);
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
});
