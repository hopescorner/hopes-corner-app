import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useServicesStore } from '../useServicesStore';

// Mock dependencies
const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
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
}));

vi.mock('@/lib/utils/date', () => ({
    todayPacificDateString: () => '2025-01-06',
    pacificDateStringFrom: (d: string) => d.split('T')[0],
    formatTimeInPacific: () => '12:00 PM',
    formatPacificTimeString: (timeStr: string) => timeStr,
}));

const createMockShowerRecord = (overrides = {}) => ({
    id: 'shower-1',
    guestId: 'guest-1',
    date: '2025-01-06',
    slotTime: '08:00',
    status: 'waiting',
    createdAt: '2025-01-06T08:00:00Z',
    ...overrides,
});

const createMockLaundryRecord = (overrides = {}) => ({
    id: 'laundry-1',
    guestId: 'guest-1',
    date: '2025-01-06',
    slotTime: '08:00 - 09:00',
    status: 'waiting',
    loadsQuantity: 1,
    isOffsite: false,
    createdAt: '2025-01-06T08:00:00Z',
    ...overrides,
});

const createMockBicycleRecord = (overrides = {}) => ({
    id: 'bicycle-1',
    guestId: 'guest-1',
    date: '2025-01-06',
    serviceType: 'repair',
    description: 'Flat tire fix',
    isNewBicycle: false,
    status: 'pending',
    createdAt: '2025-01-06T08:00:00Z',
    ...overrides,
});

describe('useServicesStore', () => {
    beforeEach(() => {
        useServicesStore.setState({
            showerRecords: [],
            laundryRecords: [],
            bicycleRecords: [],
            haircutRecords: [],
            holidayRecords: [],
        });
        vi.clearAllMocks();

        // Reset mocks to ensure no leakages
        mockSupabase.from.mockReturnThis();
        mockSupabase.select.mockReturnThis();
        mockSupabase.insert.mockReturnThis();
        mockSupabase.update.mockReturnThis();
        mockSupabase.delete.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.in.mockReturnThis();
        mockSupabase.or.mockReturnThis();
        mockSupabase.order.mockReturnThis();
        mockSupabase.limit.mockReturnThis();

        mockSupabase.single.mockReset();
        mockSupabase.single.mockResolvedValue({ data: { id: 'new-id' }, error: null });
    });

    describe('initial state', () => {
        it('starts with empty shower records', () => {
            const { showerRecords } = useServicesStore.getState();
            expect(showerRecords).toEqual([]);
        });

        it('starts with empty laundry records', () => {
            const { laundryRecords } = useServicesStore.getState();
            expect(laundryRecords).toEqual([]);
        });

        it('starts with empty bicycle records', () => {
            const { bicycleRecords } = useServicesStore.getState();
            expect(bicycleRecords).toEqual([]);
        });
    });

    describe('shower records', () => {
        describe('state management', () => {
            it('can add a shower record', () => {
                const record = createMockShowerRecord();
                useServicesStore.setState({ showerRecords: [record] });

                const { showerRecords } = useServicesStore.getState();
                expect(showerRecords.length).toBe(1);
            });

            it('can add multiple shower records', () => {
                const records = [
                    createMockShowerRecord({ id: 's1' }),
                    createMockShowerRecord({ id: 's2' }),
                    createMockShowerRecord({ id: 's3' }),
                ];

                useServicesStore.setState({ showerRecords: records });

                const { showerRecords } = useServicesStore.getState();
                expect(showerRecords.length).toBe(3);
            });

            it('can remove a shower record', () => {
                useServicesStore.setState({
                    showerRecords: [
                        createMockShowerRecord({ id: 's1' }),
                        createMockShowerRecord({ id: 's2' }),
                    ],
                });

                useServicesStore.setState((state) => ({
                    showerRecords: state.showerRecords.filter((r) => r.id !== 's1'),
                }));

                const { showerRecords } = useServicesStore.getState();
                expect(showerRecords.length).toBe(1);
            });

            it('can update a shower record status', () => {
                useServicesStore.setState({
                    showerRecords: [createMockShowerRecord({ id: 's1', status: 'waiting' })],
                });

                useServicesStore.setState((state) => ({
                    showerRecords: state.showerRecords.map((r) =>
                        r.id === 's1' ? { ...r, status: 'showering' } : r
                    ),
                }));

                const { showerRecords } = useServicesStore.getState();
                expect(showerRecords[0].status).toBe('showering');
            });
        });

        describe('filtering', () => {
            it('filters showers by date', () => {
                const records = [
                    createMockShowerRecord({ id: 's1', date: '2025-01-06' }),
                    createMockShowerRecord({ id: 's2', date: '2025-01-05' }),
                ];

                useServicesStore.setState({ showerRecords: records });

                const { showerRecords } = useServicesStore.getState();
                const todayShowers = showerRecords.filter((r) => r.date === '2025-01-06');
                expect(todayShowers.length).toBe(1);
            });

            it('filters showers by status', () => {
                const records = [
                    createMockShowerRecord({ id: 's1', status: 'waiting' }),
                    createMockShowerRecord({ id: 's2', status: 'showering' }),
                    createMockShowerRecord({ id: 's3', status: 'completed' }),
                ];

                useServicesStore.setState({ showerRecords: records });

                const { showerRecords } = useServicesStore.getState();
                const waitingShowers = showerRecords.filter((r) => r.status === 'waiting');
                expect(waitingShowers.length).toBe(1);
            });

            it('filters showers by slot time', () => {
                const records = [
                    createMockShowerRecord({ id: 's1', slotTime: '08:00' }),
                    createMockShowerRecord({ id: 's2', slotTime: '08:30' }),
                    createMockShowerRecord({ id: 's3', slotTime: '08:00' }),
                ];

                useServicesStore.setState({ showerRecords: records });

                const { showerRecords } = useServicesStore.getState();
                const slot8Showers = showerRecords.filter((r) => r.slotTime === '08:00');
                expect(slot8Showers.length).toBe(2);
            });

            it('filters showers by guest ID', () => {
                const records = [
                    createMockShowerRecord({ id: 's1', guestId: 'guest-1' }),
                    createMockShowerRecord({ id: 's2', guestId: 'guest-2' }),
                    createMockShowerRecord({ id: 's3', guestId: 'guest-1' }),
                ];

                useServicesStore.setState({ showerRecords: records });

                const { showerRecords } = useServicesStore.getState();
                const guest1Showers = showerRecords.filter((r) => r.guestId === 'guest-1');
                expect(guest1Showers.length).toBe(2);
            });
        });

        describe('status workflow', () => {
            it('tracks waiting status', () => {
                const record = createMockShowerRecord({ status: 'waiting' });
                useServicesStore.setState({ showerRecords: [record] });

                const { showerRecords } = useServicesStore.getState();
                expect(showerRecords[0].status).toBe('waiting');
            });

            it('tracks showering status', () => {
                const record = createMockShowerRecord({ status: 'showering' });
                useServicesStore.setState({ showerRecords: [record] });

                const { showerRecords } = useServicesStore.getState();
                expect(showerRecords[0].status).toBe('showering');
            });

            it('tracks completed status', () => {
                const record = createMockShowerRecord({ status: 'completed' });
                useServicesStore.setState({ showerRecords: [record] });

                const { showerRecords } = useServicesStore.getState();
                expect(showerRecords[0].status).toBe('completed');
            });

            it('tracks no-show status', () => {
                const record = createMockShowerRecord({ status: 'no-show' });
                useServicesStore.setState({ showerRecords: [record] });

                const { showerRecords } = useServicesStore.getState();
                expect(showerRecords[0].status).toBe('no-show');
            });
        });
    });

    describe('laundry records', () => {
        describe('state management', () => {
            it('can add a laundry record', () => {
                const record = createMockLaundryRecord();
                useServicesStore.setState({ laundryRecords: [record] });

                const { laundryRecords } = useServicesStore.getState();
                expect(laundryRecords.length).toBe(1);
            });

            it('can add multiple laundry records', () => {
                const records = [
                    createMockLaundryRecord({ id: 'l1' }),
                    createMockLaundryRecord({ id: 'l2' }),
                ];

                useServicesStore.setState({ laundryRecords: records });

                const { laundryRecords } = useServicesStore.getState();
                expect(laundryRecords.length).toBe(2);
            });

            it('can remove a laundry record', () => {
                useServicesStore.setState({
                    laundryRecords: [
                        createMockLaundryRecord({ id: 'l1' }),
                        createMockLaundryRecord({ id: 'l2' }),
                    ],
                });

                useServicesStore.setState((state) => ({
                    laundryRecords: state.laundryRecords.filter((r) => r.id !== 'l1'),
                }));

                const { laundryRecords } = useServicesStore.getState();
                expect(laundryRecords.length).toBe(1);
            });

            it('can update laundry record status', () => {
                useServicesStore.setState({
                    laundryRecords: [createMockLaundryRecord({ id: 'l1', status: 'waiting' })],
                });

                useServicesStore.setState((state) => ({
                    laundryRecords: state.laundryRecords.map((r) =>
                        r.id === 'l1' ? { ...r, status: 'in-progress' } : r
                    ),
                }));

                const { laundryRecords } = useServicesStore.getState();
                expect(laundryRecords[0].status).toBe('in-progress');
            });
        });

        describe('filtering', () => {
            it('filters laundry by date', () => {
                const records = [
                    createMockLaundryRecord({ id: 'l1', date: '2025-01-06' }),
                    createMockLaundryRecord({ id: 'l2', date: '2025-01-05' }),
                ];

                useServicesStore.setState({ laundryRecords: records });

                const { laundryRecords } = useServicesStore.getState();
                const todayLaundry = laundryRecords.filter((r) => r.date === '2025-01-06');
                expect(todayLaundry.length).toBe(1);
            });

            it('filters laundry by status', () => {
                const records = [
                    createMockLaundryRecord({ id: 'l1', status: 'waiting' }),
                    createMockLaundryRecord({ id: 'l2', status: 'washing' }),
                    createMockLaundryRecord({ id: 'l3', status: 'completed' }),
                ];

                useServicesStore.setState({ laundryRecords: records });

                const { laundryRecords } = useServicesStore.getState();
                const waitingLaundry = laundryRecords.filter((r) => r.status === 'waiting');
                expect(waitingLaundry.length).toBe(1);
            });

            it('filters laundry by offsite status', () => {
                const records = [
                    createMockLaundryRecord({ id: 'l1', isOffsite: false }),
                    createMockLaundryRecord({ id: 'l2', isOffsite: true }),
                    createMockLaundryRecord({ id: 'l3', isOffsite: false }),
                ];

                useServicesStore.setState({ laundryRecords: records });

                const { laundryRecords } = useServicesStore.getState();
                const onsiteLaundry = laundryRecords.filter((r) => !r.isOffsite);
                expect(onsiteLaundry.length).toBe(2);
            });
        });

        describe('load quantities', () => {
            it('tracks single load', () => {
                const record = createMockLaundryRecord({ loadsQuantity: 1 });
                useServicesStore.setState({ laundryRecords: [record] });

                const { laundryRecords } = useServicesStore.getState();
                expect(laundryRecords[0].loadsQuantity).toBe(1);
            });

            it('tracks multiple loads', () => {
                const record = createMockLaundryRecord({ loadsQuantity: 3 });
                useServicesStore.setState({ laundryRecords: [record] });

                const { laundryRecords } = useServicesStore.getState();
                expect(laundryRecords[0].loadsQuantity).toBe(3);
            });

            it('calculates total loads', () => {
                const records = [
                    createMockLaundryRecord({ id: 'l1', loadsQuantity: 1 }),
                    createMockLaundryRecord({ id: 'l2', loadsQuantity: 2 }),
                    createMockLaundryRecord({ id: 'l3', loadsQuantity: 3 }),
                ];

                useServicesStore.setState({ laundryRecords: records });

                const { laundryRecords } = useServicesStore.getState();
                const totalLoads = laundryRecords.reduce((sum, r) => sum + r.loadsQuantity, 0);
                expect(totalLoads).toBe(6);
            });
        });

        describe('status workflow', () => {
            it('tracks waiting status', () => {
                const record = createMockLaundryRecord({ status: 'waiting' });
                useServicesStore.setState({ laundryRecords: [record] });
                expect(useServicesStore.getState().laundryRecords[0].status).toBe('waiting');
            });

            it('tracks washing status', () => {
                const record = createMockLaundryRecord({ status: 'washing' });
                useServicesStore.setState({ laundryRecords: [record] });
                expect(useServicesStore.getState().laundryRecords[0].status).toBe('washing');
            });

            it('tracks drying status', () => {
                const record = createMockLaundryRecord({ status: 'drying' });
                useServicesStore.setState({ laundryRecords: [record] });
                expect(useServicesStore.getState().laundryRecords[0].status).toBe('drying');
            });

            it('tracks folding status', () => {
                const record = createMockLaundryRecord({ status: 'folding' });
                useServicesStore.setState({ laundryRecords: [record] });
                expect(useServicesStore.getState().laundryRecords[0].status).toBe('folding');
            });

            it('tracks ready status', () => {
                const record = createMockLaundryRecord({ status: 'ready' });
                useServicesStore.setState({ laundryRecords: [record] });
                expect(useServicesStore.getState().laundryRecords[0].status).toBe('ready');
            });

            it('tracks completed status', () => {
                const record = createMockLaundryRecord({ status: 'completed' });
                useServicesStore.setState({ laundryRecords: [record] });
                expect(useServicesStore.getState().laundryRecords[0].status).toBe('completed');
            });
        });
    });

    describe('bicycle records', () => {
        describe('state management', () => {
            it('can add a bicycle record', () => {
                const record = createMockBicycleRecord();
                useServicesStore.setState({ bicycleRecords: [record] });

                const { bicycleRecords } = useServicesStore.getState();
                expect(bicycleRecords.length).toBe(1);
            });

            it('can add multiple bicycle records', () => {
                const records = [
                    createMockBicycleRecord({ id: 'b1' }),
                    createMockBicycleRecord({ id: 'b2' }),
                ];

                useServicesStore.setState({ bicycleRecords: records });

                const { bicycleRecords } = useServicesStore.getState();
                expect(bicycleRecords.length).toBe(2);
            });

            it('can remove a bicycle record', () => {
                useServicesStore.setState({
                    bicycleRecords: [
                        createMockBicycleRecord({ id: 'b1' }),
                        createMockBicycleRecord({ id: 'b2' }),
                    ],
                });

                useServicesStore.setState((state) => ({
                    bicycleRecords: state.bicycleRecords.filter((r) => r.id !== 'b1'),
                }));

                const { bicycleRecords } = useServicesStore.getState();
                expect(bicycleRecords.length).toBe(1);
            });
        });

        describe('filtering', () => {
            it('filters bicycles by date', () => {
                const records = [
                    createMockBicycleRecord({ id: 'b1', date: '2025-01-06' }),
                    createMockBicycleRecord({ id: 'b2', date: '2025-01-05' }),
                ];

                useServicesStore.setState({ bicycleRecords: records });

                const { bicycleRecords } = useServicesStore.getState();
                const todayBicycles = bicycleRecords.filter((r) => r.date === '2025-01-06');
                expect(todayBicycles.length).toBe(1);
            });

            it('filters bicycles by service type', () => {
                const records = [
                    createMockBicycleRecord({ id: 'b1', serviceType: 'repair' }),
                    createMockBicycleRecord({ id: 'b2', serviceType: 'tune-up' }),
                    createMockBicycleRecord({ id: 'b3', serviceType: 'repair' }),
                ];

                useServicesStore.setState({ bicycleRecords: records });

                const { bicycleRecords } = useServicesStore.getState();
                const repairs = bicycleRecords.filter((r) => r.serviceType === 'repair');
                expect(repairs.length).toBe(2);
            });

            it('filters new bicycles', () => {
                const records = [
                    createMockBicycleRecord({ id: 'b1', isNewBicycle: true }),
                    createMockBicycleRecord({ id: 'b2', isNewBicycle: false }),
                    createMockBicycleRecord({ id: 'b3', isNewBicycle: true }),
                ];

                useServicesStore.setState({ bicycleRecords: records });

                const { bicycleRecords } = useServicesStore.getState();
                const newBicycles = bicycleRecords.filter((r) => r.isNewBicycle);
                expect(newBicycles.length).toBe(2);
            });

            it('filters by status', () => {
                const records = [
                    createMockBicycleRecord({ id: 'b1', status: 'pending' }),
                    createMockBicycleRecord({ id: 'b2', status: 'completed' }),
                    createMockBicycleRecord({ id: 'b3', status: 'pending' }),
                ];

                useServicesStore.setState({ bicycleRecords: records });

                const { bicycleRecords } = useServicesStore.getState();
                const pending = bicycleRecords.filter((r) => r.status === 'pending');
                expect(pending.length).toBe(2);
            });
        });

        describe('service types', () => {
            it('tracks repair service', () => {
                const record = createMockBicycleRecord({ serviceType: 'repair' });
                useServicesStore.setState({ bicycleRecords: [record] });
                expect(useServicesStore.getState().bicycleRecords[0].serviceType).toBe('repair');
            });

            it('tracks tune-up service', () => {
                const record = createMockBicycleRecord({ serviceType: 'tune-up' });
                useServicesStore.setState({ bicycleRecords: [record] });
                expect(useServicesStore.getState().bicycleRecords[0].serviceType).toBe('tune-up');
            });

            it('tracks new bicycle distribution', () => {
                const record = createMockBicycleRecord({ isNewBicycle: true });
                useServicesStore.setState({ bicycleRecords: [record] });
                expect(useServicesStore.getState().bicycleRecords[0].isNewBicycle).toBe(true);
            });
        });
    });

    describe('aggregate calculations', () => {
        it('counts total showers for today', () => {
            const records = [
                createMockShowerRecord({ id: 's1', date: '2025-01-06' }),
                createMockShowerRecord({ id: 's2', date: '2025-01-06' }),
                createMockShowerRecord({ id: 's3', date: '2025-01-05' }),
            ];

            useServicesStore.setState({ showerRecords: records });

            const { showerRecords } = useServicesStore.getState();
            const todayShowers = showerRecords.filter((r) => r.date === '2025-01-06');
            expect(todayShowers.length).toBe(2);
        });

        it('counts total laundry loads for today', () => {
            const records = [
                createMockLaundryRecord({ id: 'l1', date: '2025-01-06', loadsQuantity: 2 }),
                createMockLaundryRecord({ id: 'l2', date: '2025-01-06', loadsQuantity: 1 }),
                createMockLaundryRecord({ id: 'l3', date: '2025-01-05', loadsQuantity: 3 }),
            ];

            useServicesStore.setState({ laundryRecords: records });

            const { laundryRecords } = useServicesStore.getState();
            const todayLoads = laundryRecords
                .filter((r) => r.date === '2025-01-06')
                .reduce((sum, r) => sum + r.loadsQuantity, 0);
            expect(todayLoads).toBe(3);
        });

        it('counts unique guests across services', () => {
            useServicesStore.setState({
                showerRecords: [
                    createMockShowerRecord({ guestId: 'guest-1' }),
                    createMockShowerRecord({ guestId: 'guest-2' }),
                ],
                laundryRecords: [
                    createMockLaundryRecord({ guestId: 'guest-1' }),
                    createMockLaundryRecord({ guestId: 'guest-3' }),
                ],
                bicycleRecords: [
                    createMockBicycleRecord({ guestId: 'guest-2' }),
                ],
            });

            const state = useServicesStore.getState();
            const allGuests = new Set([
                ...state.showerRecords.map((r) => r.guestId),
                ...state.laundryRecords.map((r) => r.guestId),
                ...state.bicycleRecords.map((r) => r.guestId),
            ]);
            expect(allGuests.size).toBe(3);
        });
    });

    describe('edge cases', () => {
        it('handles empty arrays gracefully', () => {
            const state = useServicesStore.getState();
            expect(state.showerRecords.length).toBe(0);
            expect(state.laundryRecords.length).toBe(0);
            expect(state.bicycleRecords.length).toBe(0);
        });

        it('handles null guest IDs', () => {
            const record = createMockShowerRecord({ guestId: null as any });
            useServicesStore.setState({ showerRecords: [record] });

            const { showerRecords } = useServicesStore.getState();
            expect(showerRecords[0].guestId).toBeNull();
        });

        it('handles empty slot times', () => {
            const record = createMockShowerRecord({ slotTime: '' });
            useServicesStore.setState({ showerRecords: [record] });

            const { showerRecords } = useServicesStore.getState();
            expect(showerRecords[0].slotTime).toBe('');
        });

        it('handles future dates', () => {
            const record = createMockShowerRecord({ date: '2030-12-31' });
            useServicesStore.setState({ showerRecords: [record] });

            const { showerRecords } = useServicesStore.getState();
            expect(showerRecords[0].date).toBe('2030-12-31');
        });

        it('handles past dates', () => {
            const record = createMockLaundryRecord({ date: '2020-01-01' });
            useServicesStore.setState({ laundryRecords: [record] });

            const { laundryRecords } = useServicesStore.getState();
            expect(laundryRecords[0].date).toBe('2020-01-01');
        });
        describe('store actions (async)', () => {
            // Note: beforeEach at top level resets mocks

            describe('shower actions', () => {
                it('adds a shower record successfully', async () => {
                    const mockData = { id: 's123', guest_id: 'g1', scheduled_for: '2025-01-06' };
                    mockSupabase.single.mockResolvedValueOnce({ data: mockData, error: null });

                    const result = await useServicesStore.getState().addShowerRecord('g1', '08:00');

                    expect(result.id).toBe('s123');
                    expect(useServicesStore.getState().showerRecords).toHaveLength(1);
                    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
                        guest_id: 'g1',
                        scheduled_time: '08:00',
                        status: 'booked'
                    }));
                });

                it('adds a shower waitlist record successfully', async () => {
                    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'w1', status: 'waitlisted' }, error: null });
                    await useServicesStore.getState().addShowerWaitlist('g1');
                    expect(useServicesStore.getState().showerRecords[0].status).toBe('waitlisted');
                });

                it('throws error when guestId is missing in addShowerRecord', async () => {
                    await expect(useServicesStore.getState().addShowerRecord('')).rejects.toThrow('Guest ID is required');
                });

                it('throws error when Supabase insert fails in addShowerRecord', async () => {
                    mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } });
                    await expect(useServicesStore.getState().addShowerRecord('g1')).rejects.toThrow('Unable to save shower record');
                });

                it('updates shower status successfully', async () => {
                    useServicesStore.setState({ showerRecords: [createMockShowerRecord({ id: 's1', status: 'waiting' })] });
                    mockSupabase.update.mockReturnThis();
                    mockSupabase.eq.mockReturnThis();
                    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

                    const success = await useServicesStore.getState().updateShowerStatus('s1', 'showering');
                    expect(success).toBe(true);
                    expect(useServicesStore.getState().showerRecords[0].status).toBe('showering');
                });

                it('reverts shower status update on failure', async () => {
                    useServicesStore.setState({ showerRecords: [createMockShowerRecord({ id: 's1', status: 'waiting' })] });
                    // update().eq() chain without .single()
                    mockSupabase.eq.mockResolvedValueOnce({ error: { message: 'Update failed' } });

                    const success = await useServicesStore.getState().updateShowerStatus('s1', 'showering');
                    expect(success).toBe(false);
                    expect(useServicesStore.getState().showerRecords[0].status).toBe('waiting');
                });
            });

            describe('laundry actions', () => {
                it('adds a laundry record successfully', async () => {
                    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'l1' }, error: null });
                    await useServicesStore.getState().addLaundryRecord('g1', 'onsite', '08:00', 'B1');
                    expect(useServicesStore.getState().laundryRecords).toHaveLength(1);
                });

                it('adds a laundry waitlist successfully', async () => {
                    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'waitlist-1', status: 'waitlisted' }, error: null });
                    await useServicesStore.getState().addLaundryWaitlist('g1');
                    const records = useServicesStore.getState().laundryRecords;
                    expect(records.length).toBeGreaterThanOrEqual(1);
                });
                it('updates laundry status successfully', async () => {
                    useServicesStore.setState({ laundryRecords: [createMockLaundryRecord({ id: 'l1', status: 'waiting' })] });
                    mockSupabase.eq.mockResolvedValueOnce({ error: null });
                    await useServicesStore.getState().updateLaundryStatus('l1', 'washing');
                    expect(useServicesStore.getState().laundryRecords[0].status).toBe('washing');
                });

                it('updates laundry bag number successfully', async () => {
                    useServicesStore.setState({ laundryRecords: [createMockLaundryRecord({ id: 'l1', bagNumber: '1' })] });
                    mockSupabase.eq.mockResolvedValueOnce({ error: null });
                    await useServicesStore.getState().updateLaundryBagNumber('l1', '2');
                    expect(useServicesStore.getState().laundryRecords[0].bagNumber).toBe('2');
                });
            });
        });

        describe('bicycle actions', () => {
            it('adds a bicycle record successfully', async () => {
                mockSupabase.single.mockResolvedValueOnce({ data: { id: 'b1' }, error: null });
                await useServicesStore.getState().addBicycleRecord('g1', { repairType: 'Flat tire' });
                expect(useServicesStore.getState().bicycleRecords).toHaveLength(1);
            });

            it('updates a bicycle record successfully', async () => {
                useServicesStore.setState({ bicycleRecords: [createMockBicycleRecord({ id: 'b1', status: 'pending' })] });
                mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });
                await useServicesStore.getState().updateBicycleRecord('b1', { status: 'done' });
                expect(useServicesStore.getState().bicycleRecords[0].status).toBe('done');
                expect(useServicesStore.getState().bicycleRecords[0].doneAt).toBeDefined();
            });

            it('deletes a bicycle record successfully', async () => {
                useServicesStore.setState({ bicycleRecords: [createMockBicycleRecord({ id: 'b1' })] });
                await useServicesStore.getState().deleteBicycleRecord('b1');
                expect(useServicesStore.getState().bicycleRecords).toHaveLength(0);
            });
        });

        describe('haircut & holiday actions', () => {
            it('adds a haircut record successfully', async () => {
                mockSupabase.single.mockResolvedValueOnce({ data: { id: 'h1' }, error: null });
                await useServicesStore.getState().addHaircutRecord('g1');
                expect(useServicesStore.getState().haircutRecords).toHaveLength(1);
            });

            it('adds a holiday record successfully', async () => {
                mockSupabase.single.mockResolvedValueOnce({ data: { id: 'hol1' }, error: null });
                await useServicesStore.getState().addHolidayRecord('g1');
                expect(useServicesStore.getState().holidayRecords).toHaveLength(1);
            });
        });

        describe('general actions', () => {
            it('loads data from Supabase successfully', async () => {
                const { fetchAllPaginated } = await import('@/lib/utils/supabasePagination');
                vi.mocked(fetchAllPaginated).mockResolvedValue([{ id: '1' }]);

                await useServicesStore.getState().loadFromSupabase();

                expect(useServicesStore.getState().showerRecords).toHaveLength(1);
                expect(useServicesStore.getState().laundryRecords).toHaveLength(1);
                expect(useServicesStore.getState().bicycleRecords).toHaveLength(1);
            });

            it('clears all service records', () => {
                useServicesStore.setState({
                    showerRecords: [createMockShowerRecord()],
                    laundryRecords: [createMockLaundryRecord()],
                });
                useServicesStore.getState().clearServiceRecords();
                expect(useServicesStore.getState().showerRecords).toHaveLength(0);
                expect(useServicesStore.getState().laundryRecords).toHaveLength(0);
            });

            it('provides today specific records via selectors', () => {
                useServicesStore.setState({
                    showerRecords: [
                        createMockShowerRecord({ id: 's1', date: '2025-01-06' }),
                        createMockShowerRecord({ id: 's2', date: '2025-01-05' }),
                    ],
                    laundryRecords: [
                        createMockLaundryRecord({ id: 'l1', date: '2025-01-06', laundryType: 'onsite' }),
                        createMockLaundryRecord({ id: 'l2', date: '2025-01-06', laundryType: 'offsite' }),
                    ],
                    bicycleRecords: [
                        createMockBicycleRecord({ id: 'b1', status: 'pending' }),
                        createMockBicycleRecord({ id: 'b2', status: 'done' }),
                    ]
                });

                const store = useServicesStore.getState();
                expect(store.getTodayShowers()).toHaveLength(1);
                expect(store.getTodayLaundry()).toHaveLength(2);
                expect(store.getTodayOnsiteLaundry()).toHaveLength(1);
                expect(store.getTodayOffsiteLaundry()).toHaveLength(1);
                expect(store.getActiveBicycles()).toHaveLength(1);
                expect(store.getTodayBicycles()).toHaveLength(2);
            });
        });
    });

    describe('error handling and edge cases', () => {
        beforeEach(() => {
            vi.spyOn(console, 'error').mockImplementation(() => { });
        });

        describe('shower errors', () => {
            it('throws error when Supabase insert fails for addShowerWaitlist', async () => {
                mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } });
                await expect(useServicesStore.getState().addShowerWaitlist('g1')).rejects.toThrow('Unable to add to waitlist');
            });

            it('handles deleteShowerRecord failure gracefully', async () => {
                useServicesStore.setState({ showerRecords: [createMockShowerRecord({ id: 's1' })] });
                mockSupabase.delete.mockReturnThis();
                mockSupabase.eq.mockResolvedValueOnce({ error: { message: 'Delete failed' } });

                // Should not throw, just log error
                await useServicesStore.getState().deleteShowerRecord('s1');

                // Optimistic update removes it
                expect(useServicesStore.getState().showerRecords).toHaveLength(0);
            });
        });

        describe('laundry errors', () => {
            it('throws error when guest ID is missing for addLaundryRecord', async () => {
                await expect(useServicesStore.getState().addLaundryRecord('', 'onsite')).rejects.toThrow('Guest ID is required');
            });

            it('throws error when wash type is missing for addLaundryRecord', async () => {
                await expect(useServicesStore.getState().addLaundryRecord('g1', '')).rejects.toThrow('Wash type is required');
            });

            it('throws error when Supabase insert fails for addLaundryRecord', async () => {
                mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } });
                await expect(useServicesStore.getState().addLaundryRecord('g1', 'onsite')).rejects.toThrow('Unable to save laundry record');
            });

            it('throws error when Supabase insert fails for addLaundryWaitlist', async () => {
                mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } });
                await expect(useServicesStore.getState().addLaundryWaitlist('g1')).rejects.toThrow('Unable to add to waitlist');
            });

            it('handles deleteLaundryRecord failure gracefully', async () => {
                useServicesStore.setState({ laundryRecords: [createMockLaundryRecord({ id: 'l1' })] });
                mockSupabase.delete.mockReturnThis();
                mockSupabase.eq.mockResolvedValueOnce({ error: { message: 'Delete failed' } });

                // Should not throw
                await useServicesStore.getState().deleteLaundryRecord('l1');
                expect(useServicesStore.getState().laundryRecords).toHaveLength(0);
            });

            it('reverts updateLaundryStatus on failure', async () => {
                useServicesStore.setState({ laundryRecords: [createMockLaundryRecord({ id: 'l1', status: 'waiting' })] });
                mockSupabase.update.mockReturnThis();
                mockSupabase.eq.mockResolvedValueOnce({ error: { message: 'Update failed' } });

                const success = await useServicesStore.getState().updateLaundryStatus('l1', 'washing');

                expect(success).toBe(false);
                expect(useServicesStore.getState().laundryRecords[0].status).toBe('waiting');
            });

            it('returns false when updating status of non-existent laundry record', async () => {
                const success = await useServicesStore.getState().updateLaundryStatus('non-existent', 'washing');
                expect(success).toBe(false);
            });

            it('reverts updateLaundryBagNumber on failure', async () => {
                useServicesStore.setState({ laundryRecords: [createMockLaundryRecord({ id: 'l1', bagNumber: '1' })] });
                mockSupabase.eq.mockResolvedValueOnce({ error: { message: 'Update failed' } });

                const success = await useServicesStore.getState().updateLaundryBagNumber('l1', '2');

                expect(success).toBe(false);
                expect(useServicesStore.getState().laundryRecords[0].bagNumber).toBe('1');
            });

            it('returns false when updating bag number of non-existent laundry record', async () => {
                const success = await useServicesStore.getState().updateLaundryBagNumber('non-existent', '2');
                expect(success).toBe(false);
            });

            it('cancels multiple laundry records and uses correct table name', async () => {
                useServicesStore.setState({
                    laundryRecords: [
                        createMockLaundryRecord({ id: 'l1', status: 'waiting' }),
                        createMockLaundryRecord({ id: 'l2', status: 'washing' }),
                        createMockLaundryRecord({ id: 'l3', status: 'waiting' }),
                    ],
                });

                mockSupabase.in.mockResolvedValueOnce({ error: null });

                const success = await useServicesStore.getState().cancelMultipleLaundry(['l1', 'l2']);

                expect(success).toBe(true);
                expect(mockSupabase.from).toHaveBeenCalledWith('laundry_bookings');
                expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'cancelled' });
                expect(mockSupabase.in).toHaveBeenCalledWith('id', ['l1', 'l2']);

                const { laundryRecords } = useServicesStore.getState();
                expect(laundryRecords.find((r) => r.id === 'l1')?.status).toBe('cancelled');
                expect(laundryRecords.find((r) => r.id === 'l2')?.status).toBe('cancelled');
                expect(laundryRecords.find((r) => r.id === 'l3')?.status).toBe('waiting');
            });

            it('returns true and does nothing when given empty array', async () => {
                const success = await useServicesStore.getState().cancelMultipleLaundry([]);

                expect(success).toBe(true);
                expect(mockSupabase.from).not.toHaveBeenCalled();
            });

            it('reverts cancelMultipleLaundry on failure', async () => {
                useServicesStore.setState({
                    laundryRecords: [
                        createMockLaundryRecord({ id: 'l1', status: 'waiting' }),
                        createMockLaundryRecord({ id: 'l2', status: 'washing' }),
                    ],
                });

                mockSupabase.in.mockResolvedValueOnce({ error: { message: 'Update failed' } });

                const success = await useServicesStore.getState().cancelMultipleLaundry(['l1', 'l2']);

                expect(success).toBe(false);
                const { laundryRecords } = useServicesStore.getState();
                expect(laundryRecords.find((r) => r.id === 'l1')?.status).toBe('waiting');
                expect(laundryRecords.find((r) => r.id === 'l2')?.status).toBe('washing');
            });

            it('handles partial record matches in cancelMultipleLaundry', async () => {
                useServicesStore.setState({
                    laundryRecords: [
                        createMockLaundryRecord({ id: 'l1', status: 'waiting' }),
                    ],
                });

                mockSupabase.in.mockResolvedValueOnce({ error: null });

                // Passing non-existent id l2, but l1 exists
                const success = await useServicesStore.getState().cancelMultipleLaundry(['l1', 'l2']);

                expect(success).toBe(true);
                const { laundryRecords } = useServicesStore.getState();
                expect(laundryRecords.find((r) => r.id === 'l1')?.status).toBe('cancelled');
            });
        });

        describe('bicycle errors', () => {
            it('throws error when guest ID is missing for addBicycleRecord', async () => {
                await expect(useServicesStore.getState().addBicycleRecord('')).rejects.toThrow('Guest ID is required');
            });

            it('throws error when Supabase insert fails for addBicycleRecord', async () => {
                mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } });
                await expect(useServicesStore.getState().addBicycleRecord('g1')).rejects.toThrow('Unable to save bicycle record');
            });

            it('throws error when updating non-existent bicycle record', async () => {
                await expect(useServicesStore.getState().updateBicycleRecord('non-existent', {})).rejects.toThrow('Bicycle record not found');
            });

            it('reverts updateBicycleRecord on failure', async () => {
                useServicesStore.setState({ bicycleRecords: [createMockBicycleRecord({ id: 'b1', status: 'pending' })] });
                mockSupabase.update.mockReturnThis();
                mockSupabase.eq.mockResolvedValueOnce({ error: { message: 'Update failed' } });

                await expect(useServicesStore.getState().updateBicycleRecord('b1', { status: 'done' }))
                    .rejects.toThrow('Unable to update bicycle repair');

                const record = useServicesStore.getState().bicycleRecords[0];
                expect(record.status).toBe('pending');
                expect(record.doneAt).toBeUndefined();
            });

            it('handles deleteBicycleRecord failure gracefully', async () => {
                useServicesStore.setState({ bicycleRecords: [createMockBicycleRecord({ id: 'b1' })] });
                mockSupabase.delete.mockReturnThis();
                mockSupabase.eq.mockResolvedValueOnce({ error: { message: 'Delete failed' } });

                // Should not throw
                await useServicesStore.getState().deleteBicycleRecord('b1');
                expect(useServicesStore.getState().bicycleRecords).toHaveLength(0);
            });
        });

        describe('haircut errors', () => {
            it('throws error when guest ID is missing for addHaircutRecord', async () => {
                await expect(useServicesStore.getState().addHaircutRecord('')).rejects.toThrow('Guest ID is required');
            });

            it('throws error when Supabase insert fails for addHaircutRecord', async () => {
                mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } });
                await expect(useServicesStore.getState().addHaircutRecord('g1')).rejects.toThrow('Unable to save haircut record');
            });

            it('handles deleteHaircutRecord failure gracefully', async () => {
                useServicesStore.setState({
                    haircutRecords: [
                        { id: 'h1', guestId: 'g1', date: '2025-01-06', type: 'haircut' }
                    ]
                });
                mockSupabase.delete.mockReturnThis();
                mockSupabase.eq.mockResolvedValueOnce({ error: { message: 'Delete failed' } });

                await useServicesStore.getState().deleteHaircutRecord('h1');
                expect(useServicesStore.getState().haircutRecords).toHaveLength(0);
            });
        });

        describe('holiday errors', () => {
            it('throws error when guest ID is missing for addHolidayRecord', async () => {
                await expect(useServicesStore.getState().addHolidayRecord('')).rejects.toThrow('Guest ID is required');
            });

            it('throws error when Supabase insert fails for addHolidayRecord', async () => {
                mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } });
                await expect(useServicesStore.getState().addHolidayRecord('g1')).rejects.toThrow('Unable to save holiday record');
            });

            it('handles deleteHolidayRecord failure gracefully', async () => {
                useServicesStore.setState({
                    holidayRecords: [
                        { id: 'hol1', guestId: 'g1', date: '2025-01-06', type: 'holiday' }
                    ]
                });
                mockSupabase.delete.mockReturnThis();
                mockSupabase.eq.mockResolvedValueOnce({ error: { message: 'Delete failed' } });

                await useServicesStore.getState().deleteHolidayRecord('hol1');
                expect(useServicesStore.getState().holidayRecords).toHaveLength(0);
            });
        });

        describe('load errors', () => {
            it('handles loadFromSupabase failure gracefully', async () => {
                const { fetchAllPaginated } = await import('@/lib/utils/supabasePagination');
                vi.mocked(fetchAllPaginated).mockRejectedValue(new Error('Load failed'));

                // Should not throw, just log
                await useServicesStore.getState().loadFromSupabase();
                expect(useServicesStore.getState().showerRecords).toEqual([]);
            });
        });
    });
});
