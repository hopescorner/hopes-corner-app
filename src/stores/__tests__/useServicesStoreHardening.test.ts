import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useServicesStore } from '../useServicesStore';
import { useBlockedSlotsStore } from '../useBlockedSlotsStore';

const mockRpcResult = {
    single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
};
const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
};

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => mockSupabase,
}));

vi.mock('@/lib/utils/supabasePagination', () => ({
    fetchAllPaginated: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/utils/mappers', () => ({
    mapShowerRow: vi.fn((row: any) => row ? { ...row, id: row.id || 'mapped-shower-id', date: row.scheduled_for || '2025-01-06' } : null),
    mapLaundryRow: vi.fn((row: any) => row ? { ...row, id: row.id || 'mapped-laundry-id', date: row.scheduled_for || '2025-01-06' } : null),
    mapBicycleRow: vi.fn((row: any) => row ? { ...row, id: row.id || 'mapped-bicycle-id', date: row.requested_at || '2025-01-06' } : null),
    mapHaircutRow: vi.fn((row: any) => row ? { ...row, id: row.id || 'mapped-haircut-id', date: row.service_date || '2025-01-06' } : null),
    mapHolidayRow: vi.fn((row: any) => row ? { ...row, id: row.id || 'mapped-holiday-id', date: row.visit_date || '2025-01-06' } : null),
    mapShowerStatusToDb: vi.fn((status: string) => status === 'awaiting' ? 'booked' : status),
}));

vi.mock('@/lib/utils/date', () => ({
    todayPacificDateString: () => '2025-01-06',
    pacificDateStringFrom: (d: string | Date = new Date()) => (typeof d === 'string' ? d.split('T')[0] : '2025-01-06'),
    weekStartPacificDateString: () => '2025-01-06',
    nextWeekStartPacificDateString: () => '2025-01-13',
    formatDateForDisplay: () => 'Jan 13',
    formatTimeInPacific: () => '12:00 PM',
    formatPacificTimeString: (timeStr: string) => timeStr,
}));

describe('services production hardening (Critical C1/C6/C7)', () => {
    beforeEach(() => {
        useServicesStore.setState({
            showerRecords: [],
            laundryRecords: [],
            bicycleRecords: [],
            haircutRecords: [],
            holidayRecords: [],
        });
        useBlockedSlotsStore.setState({ blockedSlots: [] });
        vi.clearAllMocks();

        mockSupabase.from.mockReturnThis();
        mockSupabase.select.mockReturnThis();
        mockSupabase.insert.mockReturnThis();
        mockSupabase.update.mockReturnThis();
        mockSupabase.delete.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.in.mockReturnThis();
        mockSupabase.limit.mockReturnThis();

        mockSupabase.single.mockReset();
        mockSupabase.single.mockResolvedValue({ data: { id: 'new-id' }, error: null });

        mockRpcResult.single.mockReset();
        mockRpcResult.single.mockResolvedValue({ data: { id: 'new-id' }, error: null });
        mockSupabase.rpc = vi.fn().mockReturnValue(mockRpcResult);
    });

    it('C6: laundry waitlist insert includes laundry_type (NOT NULL)', async () => {
        mockSupabase.single.mockResolvedValueOnce({ data: { id: 'waitlist-1', status: 'waitlisted' }, error: null });
        await useServicesStore.getState().addLaundryWaitlist('g1');
        expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
            guest_id: 'g1',
            laundry_type: 'onsite',
            status: 'waitlisted',
        }));
    });

    it('C7: rebooking after End-of-Day cancel reuses the cancelled row', async () => {
        // capacity check (count 0) -> weekly check (count 0) -> reuse lookup (one cancelled row)
        mockSupabase.in
            .mockResolvedValueOnce({ count: 0, error: null })
            .mockResolvedValueOnce({ count: 0, error: null })
            .mockResolvedValueOnce({ data: [{ id: 'cancelled-9' }], error: null });
        mockSupabase.single.mockResolvedValueOnce({ data: { id: 'cancelled-9', status: 'waiting' }, error: null });

        const result = await useServicesStore.getState().addLaundryRecord('g1', 'onsite', '08:00 - 09:00', 'B7');

        expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
            status: 'waiting',
            slot_label: '08:00 - 09:00',
        }));
        expect(mockSupabase.insert).not.toHaveBeenCalled();
        expect(result.id).toBe('cancelled-9');
    });

    it('C7: duplicate laundry booking surfaces a friendly already-booked error', async () => {
        mockSupabase.in
            .mockResolvedValueOnce({ count: 0, error: null })
            .mockResolvedValueOnce({ count: 0, error: null })
            .mockResolvedValueOnce({ data: [], error: null });
        mockSupabase.single.mockResolvedValueOnce({
            data: null,
            error: { code: '23505', message: 'duplicate key value violates unique constraint "laundry_one_per_day"' },
        });

        await expect(
            useServicesStore.getState().addLaundryRecord('g1', 'onsite', '08:00 - 09:00', 'B7')
        ).rejects.toThrow(/already has a laundry booking/i);
    });

    it('C1: shower booking into a blocked slot is rejected before the RPC', async () => {
        useBlockedSlotsStore.setState({
            blockedSlots: [{ id: 'b1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06' } as any],
        });

        await expect(
            useServicesStore.getState().addShowerRecord('g1', '08:00')
        ).rejects.toThrow(/blocked/i);
        expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    it('C1: laundry booking into a blocked slot is rejected before insert', async () => {
        useBlockedSlotsStore.setState({
            blockedSlots: [{ id: 'b2', serviceType: 'laundry', slotTime: '08:00 - 09:00', date: '2025-01-06' } as any],
        });

        await expect(
            useServicesStore.getState().addLaundryRecord('g1', 'onsite', '08:00 - 09:00', 'B1')
        ).rejects.toThrow(/blocked/i);
        expect(mockSupabase.insert).not.toHaveBeenCalled();
    });

    it('C1: server SLOT_BLOCKED rejection surfaces a friendly blocked error', async () => {
        mockRpcResult.single.mockResolvedValueOnce({
            data: null,
            error: { message: 'SLOT_BLOCKED: Shower slot 08:00 on 2025-01-06 is blocked' },
        });

        await expect(
            useServicesStore.getState().addShowerRecord('g1', '08:00')
        ).rejects.toThrow(/blocked/i);
    });
});
