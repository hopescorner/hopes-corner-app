import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useServicesStore } from '../useServicesStore';
import { useGuestsStore } from '../useGuestsStore';
import { getCachedLaundryRecords, getCachedShowerRecords } from '@/lib/supabase/cachedQueries';

const mutationResult = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({ from: () => ({ update: () => ({ eq: mutationResult }) }) }),
}));
vi.mock('@/lib/supabase/cachedQueries', () => ({
    getCachedShowerRecords: vi.fn(async () => []),
    getCachedLaundryRecords: vi.fn(async () => []),
    getCachedBicycleRecords: vi.fn(async () => []),
}));
vi.mock('@/lib/utils/supabasePagination', () => ({ fetchAllPaginated: vi.fn(async () => []) }));

const booking = (id: string, status: string) => ({
    id, guestId: 'guest-1', date: '2026-11-09', time: '09:00', status, laundryType: 'onsite', bagNumber: 'B1',
});

describe('service booking refresh', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useServicesStore.setState({
            showerRecords: [], laundryRecords: [], bicycleRecords: [], haircutRecords: [], holidayRecords: [],
            isLoaded: false, isLoading: false,
        });
        useGuestsStore.setState({ guests: [{ id: 'guest-1' }] as any });
        vi.mocked(getCachedShowerRecords).mockResolvedValue([]);
        vi.mocked(getCachedLaundryRecords).mockResolvedValue([]);
        mutationResult.mockReset().mockResolvedValue({ error: null });
    });

    it.each(['showerRecords', 'laundryRecords'] as const)('keeps a new %s booking received during a slow refresh', async (key) => {
        let finish!: (rows: any[]) => void;
        const fetch = key === 'showerRecords' ? getCachedShowerRecords : getCachedLaundryRecords;
        vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        const loading = useServicesStore.getState().loadFromSupabase();
        useServicesStore.setState({ [key]: [booking('new', 'done')] } as any);
        finish([]);
        await loading;
        expect(useServicesStore.getState()[key].map(record => record.id)).toEqual(['new']);
    });

    it.each(['showerRecords', 'laundryRecords'] as const)('does not undo a status change or resurrect a deleted %s booking', async (key) => {
        const initialStatus = key === 'showerRecords' ? 'awaiting' : 'waiting';
        const initial = [booking('updated', initialStatus), booking('deleted', initialStatus)];
        useServicesStore.setState({ [key]: initial } as any);
        let finish!: (rows: any[]) => void;
        const fetch = key === 'showerRecords' ? getCachedShowerRecords : getCachedLaundryRecords;
        vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        const loading = useServicesStore.getState().loadFromSupabase();
        useServicesStore.setState({ [key]: [booking('updated', 'done')] } as any);
        finish(initial);
        await loading;
        expect(useServicesStore.getState()[key].map(record => [record.id, record.status])).toEqual([['updated', 'done']]);
    });

    it('exposes a failed refresh, preserves the last data, and clears the error after retry', async () => {
        useServicesStore.setState({ isLoaded: true, laundryRecords: [booking('saved', 'done')] as any });
        vi.mocked(getCachedLaundryRecords).mockRejectedValueOnce(new Error('Offline'));
        await useServicesStore.getState().loadFromSupabase();
        expect(useServicesStore.getState()).toMatchObject({
            isLoaded: true, isLoading: false, loadError: 'Unable to load service bookings. Please try again.',
            laundryRecords: [expect.objectContaining({ id: 'saved' })],
        });
        await useServicesStore.getState().loadFromSupabase();
        expect(useServicesStore.getState()).toMatchObject({ loadError: null, isLoading: false, laundryRecords: [] });
    });

    it.each(['updateShowerStatus', 'updateLaundryStatus', 'updateLaundryBagNumber'] as const)('%s does not roll back a newer update from another device', async (action) => {
        const key = action === 'updateShowerStatus' ? 'showerRecords' : 'laundryRecords';
        useServicesStore.setState({ [key]: [booking('changed', key === 'showerRecords' ? 'awaiting' : 'waiting')] } as any);
        let finish!: (result: any) => void;
        mutationResult.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        const saving = useServicesStore.getState()[action]('changed', action === 'updateLaundryBagNumber' ? 'B2' : 'done');
        const newer = { ...booking('changed', 'done'), bagNumber: 'OTHER-DEVICE' };
        useServicesStore.setState({ [key]: [newer] } as any);
        finish({ error: { message: 'Offline' } });
        expect(await saving).toBe(false);
        expect(useServicesStore.getState()[key]).toEqual([newer]);
    });
});
