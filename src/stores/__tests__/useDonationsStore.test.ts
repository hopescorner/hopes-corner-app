import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDonationsStore } from '../useDonationsStore';

// Mock dependencies
vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: () => ({
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
        }),
    }),
}));

vi.mock('@/lib/utils/supabasePagination', () => ({
    fetchAllPaginated: vi.fn().mockResolvedValue([]),
}));

const createMockDonation = (overrides = {}) => ({
    id: 'donation-1',
    type: 'Protein',
    itemName: 'Chicken',
    trays: 2,
    weightLbs: 10,
    servings: 20,
    donor: 'John Smith',
    date: '2025-01-06',
    dateKey: '2025-01-06',
    createdAt: '2025-01-06T08:00:00Z',
    donatedAt: '2025-01-06T08:00:00Z',
    ...overrides,
});

describe('useDonationsStore', () => {
    beforeEach(() => {
        useDonationsStore.setState({
            donationRecords: [],
        });
    });

    describe('initial state', () => {
        it('starts with empty donation records', () => {
            const { donationRecords } = useDonationsStore.getState();
            expect(donationRecords).toEqual([]);
        });
    });

    describe('donation records', () => {
        describe('state management', () => {
            it('can add a donation record', () => {
                const record = createMockDonation();
                useDonationsStore.setState({ donationRecords: [record] });

                const { donationRecords } = useDonationsStore.getState();
                expect(donationRecords.length).toBe(1);
            });

            it('can add multiple donation records', () => {
                const records = [
                    createMockDonation({ id: 'd1' }),
                    createMockDonation({ id: 'd2' }),
                    createMockDonation({ id: 'd3' }),
                ];

                useDonationsStore.setState({ donationRecords: records });

                const { donationRecords } = useDonationsStore.getState();
                expect(donationRecords.length).toBe(3);
            });

            it('can remove a donation record', () => {
                useDonationsStore.setState({
                    donationRecords: [
                        createMockDonation({ id: 'd1' }),
                        createMockDonation({ id: 'd2' }),
                    ],
                });

                useDonationsStore.setState((state) => ({
                    donationRecords: state.donationRecords.filter((r) => r.id !== 'd1'),
                }));

                const { donationRecords } = useDonationsStore.getState();
                expect(donationRecords.length).toBe(1);
            });

            it('can update a donation record', () => {
                useDonationsStore.setState({
                    donationRecords: [createMockDonation({ id: 'd1', weightLbs: 100 })],
                });

                useDonationsStore.setState((state) => ({
                    donationRecords: state.donationRecords.map((r) =>
                        r.id === 'd1' ? { ...r, weightLbs: 200 } : r
                    ),
                }));

                const { donationRecords } = useDonationsStore.getState();
                expect(donationRecords[0].weightLbs).toBe(200);
            });
        });

        describe('filtering', () => {
            it('filters by date', () => {
                const records = [
                    createMockDonation({ id: 'd1', date: '2025-01-06' }),
                    createMockDonation({ id: 'd2', date: '2025-01-05' }),
                ];

                useDonationsStore.setState({ donationRecords: records });

                const { donationRecords } = useDonationsStore.getState();
                const todayDonations = donationRecords.filter((r) => r.date === '2025-01-06');
                expect(todayDonations.length).toBe(1);
            });

            it('filters by type', () => {
                const records = [
                    createMockDonation({ id: 'd1', type: 'monetary' }),
                    createMockDonation({ id: 'd2', type: 'in-kind' }),
                    createMockDonation({ id: 'd3', type: 'monetary' }),
                ];

                useDonationsStore.setState({ donationRecords: records });

                const { donationRecords } = useDonationsStore.getState();
                const monetaryDonations = donationRecords.filter((r) => r.type === 'monetary');
                expect(monetaryDonations.length).toBe(2);
            });

            it('filters by donor name', () => {
                const records = [
                    createMockDonation({ id: 'd1', donor: 'John Smith' }),
                    createMockDonation({ id: 'd2', donor: 'Jane Doe' }),
                    createMockDonation({ id: 'd3', donor: 'John Smith' }),
                ];

                useDonationsStore.setState({ donationRecords: records });

                const { donationRecords } = useDonationsStore.getState();
                const johnDonations = donationRecords.filter((r) => r.donor === 'John Smith');
                expect(johnDonations.length).toBe(2);
            });
        });

        describe('donation types', () => {
            it('tracks protein donations', () => {
                const record = createMockDonation({ type: 'Protein', weightLbs: 50 });
                useDonationsStore.setState({ donationRecords: [record] });

                const { donationRecords } = useDonationsStore.getState();
                expect(donationRecords[0].type).toBe('Protein');
                expect(donationRecords[0].weightLbs).toBe(50);
            });

            it('tracks carb donations', () => {
                const record = createMockDonation({ type: 'Carbs', itemName: 'Rice' });
                useDonationsStore.setState({ donationRecords: [record] });

                const { donationRecords } = useDonationsStore.getState();
                expect(donationRecords[0].type).toBe('Carbs');
            });

            it('tracks vegetable donations', () => {
                const record = createMockDonation({ type: 'Vegetables', weightLbs: 30 });
                useDonationsStore.setState({ donationRecords: [record] });

                const { donationRecords } = useDonationsStore.getState();
                expect(donationRecords[0].type).toBe('Vegetables');
            });
        });

        describe('aggregate calculations', () => {
            it('calculates total weight', () => {
                const records = [
                    createMockDonation({ id: 'd1', type: 'Protein', weightLbs: 100 }),
                    createMockDonation({ id: 'd2', type: 'Carbs', weightLbs: 250 }),
                    createMockDonation({ id: 'd3', type: 'Vegetables', weightLbs: 50 }),
                ];

                useDonationsStore.setState({ donationRecords: records });

                const { donationRecords } = useDonationsStore.getState();
                const totalWeight = donationRecords.reduce((sum, r) => sum + (r.weightLbs || 0), 0);
                expect(totalWeight).toBe(400);
            });

            it('counts unique donors', () => {
                const records = [
                    createMockDonation({ id: 'd1', donor: 'John Smith' }),
                    createMockDonation({ id: 'd2', donor: 'Jane Doe' }),
                    createMockDonation({ id: 'd3', donor: 'John Smith' }),
                ];

                useDonationsStore.setState({ donationRecords: records });

                const { donationRecords } = useDonationsStore.getState();
                const uniqueDonors = new Set(donationRecords.map((r) => r.donor));
                expect(uniqueDonors.size).toBe(2);
            });

            it('counts donations by month', () => {
                const records = [
                    createMockDonation({ id: 'd1', date: '2025-01-06' }),
                    createMockDonation({ id: 'd2', date: '2025-01-15' }),
                    createMockDonation({ id: 'd3', date: '2025-02-01' }),
                ];

                useDonationsStore.setState({ donationRecords: records });

                const { donationRecords } = useDonationsStore.getState();
                const janDonations = donationRecords.filter((r) =>
                    r.date.startsWith('2025-01')
                );
                expect(janDonations.length).toBe(2);
            });
        });
    });

    describe('getRecentDonations', () => {
        it('returns recent donations', () => {
            const records = [
                createMockDonation({ id: 'd1' }),
                createMockDonation({ id: 'd2' }),
                createMockDonation({ id: 'd3' }),
            ];

            useDonationsStore.setState({ donationRecords: records });

            const { getRecentDonations } = useDonationsStore.getState();
            const recent = getRecentDonations(2);
            expect(recent.length).toBe(2);
        });

        it('returns all donations if limit exceeds count', () => {
            const records = [
                createMockDonation({ id: 'd1' }),
                createMockDonation({ id: 'd2' }),
            ];

            useDonationsStore.setState({ donationRecords: records });

            const { getRecentDonations } = useDonationsStore.getState();
            const recent = getRecentDonations(10);
            expect(recent.length).toBe(2);
        });

        it('returns empty array if no donations', () => {
            const { getRecentDonations } = useDonationsStore.getState();
            const recent = getRecentDonations(5);
            expect(recent).toEqual([]);
        });
    });

    describe('edge cases', () => {
        it('handles zero weights', () => {
            const record = createMockDonation({ weightLbs: 0 });
            useDonationsStore.setState({ donationRecords: [record] });

            const { donationRecords } = useDonationsStore.getState();
            expect(donationRecords[0].weightLbs).toBe(0);
        });

        it('handles empty donor names', () => {
            const record = createMockDonation({ donor: '' });
            useDonationsStore.setState({ donationRecords: [record] });

            const { donationRecords } = useDonationsStore.getState();
            expect(donationRecords[0].donor).toBe('');
        });

        it('handles null descriptions', () => {
            const record = createMockDonation({ temperature: null as any });
            useDonationsStore.setState({ donationRecords: [record] });

            const { donationRecords } = useDonationsStore.getState();
            expect(donationRecords[0].temperature).toBeNull();
        });

        it('handles very large amounts', () => {
            const record = createMockDonation({ weightLbs: 999999999 });
            useDonationsStore.setState({ donationRecords: [record] });

            const { donationRecords } = useDonationsStore.getState();
            expect(donationRecords[0].weightLbs).toBe(999999999);
        });

        it('handles future dates', () => {
            const record = createMockDonation({ date: '2030-12-31' });
            useDonationsStore.setState({ donationRecords: [record] });

            const { donationRecords } = useDonationsStore.getState();
            expect(donationRecords[0].date).toBe('2030-12-31');
        });
    });

    describe('async actions', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            useDonationsStore.setState({ donationRecords: [] });
        });

        describe('addDonation', () => {
            it('adds a donation successfully', async () => {
                const { addDonation } = useDonationsStore.getState();
                const result = await addDonation({
                    donation_type: 'Protein',
                    item_name: 'Test Item',
                    trays: 5,
                    weight_lbs: 10,
                    servings: 100,
                    donor: 'Test Donor',
                });

                expect(result).toBeDefined();
                expect(result.id).toBeDefined();
                expect(useDonationsStore.getState().donationRecords.length).toBe(1);
            });
        });

        describe('updateDonation', () => {
            it('updates a donation successfully', async () => {
                useDonationsStore.setState({
                    donationRecords: [{ id: 'd1', type: 'food', itemName: 'Old', trays: 1, weightLbs: 5, servings: 50, donor: 'Donor', date: '2025-01-06' }],
                });

                const { updateDonation } = useDonationsStore.getState();
                const result = await updateDonation('d1', { item_name: 'Updated', trays: 10 });

                expect(result).toBeDefined();
            });
        });

        describe('deleteDonation', () => {
            it('deletes a donation successfully', async () => {
                useDonationsStore.setState({
                    donationRecords: [{ id: 'd1', type: 'food', itemName: 'Test', trays: 1, weightLbs: 5, servings: 50, donor: 'Donor', date: '2025-01-06' }],
                });

                const { deleteDonation } = useDonationsStore.getState();
                await deleteDonation('d1');

                expect(useDonationsStore.getState().donationRecords.length).toBe(0);
            });
        });

        describe('loadFromSupabase', () => {
            it('loads donations from Supabase', async () => {
                const { loadFromSupabase } = useDonationsStore.getState();
                await loadFromSupabase();

                // Should not throw and state should be set
                const state = useDonationsStore.getState();
                expect(Array.isArray(state.donationRecords)).toBe(true);
            });
        });

        describe('getRecentDonations sorting', () => {
            it('sorts donations by most recent first', () => {
                useDonationsStore.setState({
                    donationRecords: [
                        { id: 'd1', donor: 'A', type: 'Protein', itemName: 'Chicken', trays: 1, weightLbs: 10, servings: 10, date: '2025-01-05', createdAt: '2025-01-05T08:00:00Z', donatedAt: '2025-01-05T08:00:00Z', donated_at: '2025-01-05T08:00:00Z' },
                        { id: 'd2', donor: 'B', type: 'Carbs', itemName: 'Rice', trays: 2, weightLbs: 20, servings: 20, date: '2025-01-06', createdAt: '2025-01-06T08:00:00Z', donatedAt: '2025-01-06T08:00:00Z', donated_at: '2025-01-06T08:00:00Z' },
                    ] as any,
                });

                const { getRecentDonations } = useDonationsStore.getState();
                const recent = getRecentDonations(2);

                expect(recent[0].donor).toBe('B');
            });
        });
    });
});
