import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    useHolidayStore,
    selectHolidayMetrics,
    selectSlotCounts,
    selectFilteredHolidayRegistrations,
} from '../useHolidayStore';
import { HolidayRegistration } from '@/types/holiday';

const mockRegistrations: HolidayRegistration[] = [
    {
        id: 'reg-1',
        ticketNumber: 1,
        eventYear: 2026,
        parentName: 'Maria Garcia',
        phone: '650-555-0101',
        city: 'Mountain View',
        housingStatus: 'house_apartment',
        incomeRange: '0_40k',
        timeSlot: '09:00 AM - 09:20 AM',
        language: 'es',
        status: 'checked_in',
        groceryCards: 1,
        teenCards: 1,
        notes: 'Grandmother pickup',
        children: [
            { id: 'c1', name: 'Lucas', age: 1, ageGroup: 'infant' },
            { id: 'c2', name: 'Sofia', age: 14, ageGroup: 'teen_14' },
        ],
        createdAt: '2026-11-01T10:00:00Z',
        updatedAt: '2026-11-01T10:00:00Z',
    },
    {
        id: 'reg-2',
        ticketNumber: 2,
        eventYear: 2026,
        parentName: 'David Chen',
        phone: '408-555-0202',
        city: 'Sunnyvale',
        housingStatus: 'vehicle_rv_camper',
        incomeRange: '41_65k',
        timeSlot: '09:00 AM - 09:20 AM',
        language: 'zh',
        status: 'registered',
        groceryCards: 1,
        teenCards: 0,
        children: [
            { id: 'c3', name: 'Emily', age: 6, ageGroup: 'child' },
        ],
        createdAt: '2026-11-01T10:05:00Z',
        updatedAt: '2026-11-01T10:05:00Z',
    },
    {
        id: 'reg-3',
        ticketNumber: 3,
        eventYear: 2026,
        parentName: 'John Smith',
        phone: '650-555-0303',
        city: 'Palo Alto',
        housingStatus: 'temp_shelter_motel',
        incomeRange: '0_40k',
        timeSlot: '10:00 AM - 10:20 AM',
        language: 'en',
        status: 'registered',
        groceryCards: 1,
        teenCards: 2,
        children: [
            { id: 'c4', name: 'Jake', age: 15, ageGroup: 'teen_15' },
            { id: 'c5', name: 'Mia', age: 17, ageGroup: 'teen_16_17' },
        ],
        createdAt: '2026-11-01T10:10:00Z',
        updatedAt: '2026-11-01T10:10:00Z',
    },
    {
        id: 'reg-4',
        ticketNumber: 4,
        eventYear: 2026,
        parentName: 'Cancelled Family',
        phone: '555-000-0000',
        city: 'Mountain View',
        housingStatus: 'outside',
        incomeRange: '0_40k',
        timeSlot: '10:00 AM - 10:20 AM',
        language: 'en',
        status: 'cancelled',
        groceryCards: 1,
        teenCards: 0,
        children: [{ id: 'c6', name: 'Kid', age: 4, ageGroup: 'toddler' }],
        createdAt: '2026-11-01T10:15:00Z',
        updatedAt: '2026-11-01T10:15:00Z',
    },
];

describe('useHolidayStore & Selectors', () => {
    describe('selectHolidayMetrics', () => {
        it('calculates metrics across non-cancelled registrations correctly', () => {
            const metrics = selectHolidayMetrics(mockRegistrations);

            expect(metrics.totalRegistrations).toBe(3);
            expect(metrics.checkedInCount).toBe(1);
            expect(metrics.pendingCount).toBe(2);

            expect(metrics.infantsCount).toBe(1);
            expect(metrics.toddlersCount).toBe(0);
            expect(metrics.childrenCount).toBe(1);
            expect(metrics.teen13Count).toBe(0);
            expect(metrics.teen14Count).toBe(1);
            expect(metrics.teen15Count).toBe(1);
            expect(metrics.teen16To18Count).toBe(1);
            expect(metrics.totalChildrenCount).toBe(5);
            expect(metrics.teen14PlusCount).toBe(3);

            expect(metrics.groceryCardsCount).toBe(3);
            expect(metrics.teenCardsCount).toBe(3);
        });
    });

    describe('selectSlotCounts', () => {
        it('aggregates non-cancelled registrations by time slot', () => {
            const slotCounts = selectSlotCounts(mockRegistrations);
            expect(slotCounts['09:00 AM - 09:20 AM']).toBe(2);
            expect(slotCounts['10:00 AM - 10:20 AM']).toBe(1);
        });
    });

    describe('selectFilteredHolidayRegistrations', () => {
        it('filters by status correctly', () => {
            const checkedInOnly = selectFilteredHolidayRegistrations(
                mockRegistrations,
                '',
                null,
                'checked_in'
            );
            expect(checkedInOnly).toHaveLength(1);
            expect(checkedInOnly[0].ticketNumber).toBe(1);

            const pendingOnly = selectFilteredHolidayRegistrations(
                mockRegistrations,
                '',
                null,
                'registered'
            );
            expect(pendingOnly).toHaveLength(2);
        });

        it('filters by slot correctly', () => {
            const slotFiltered = selectFilteredHolidayRegistrations(
                mockRegistrations,
                '',
                '09:00 AM - 09:20 AM',
                'all'
            );
            expect(slotFiltered).toHaveLength(2);
        });

        it('searches by ticket number, parent name, phone, or child name', () => {
            expect(selectFilteredHolidayRegistrations(mockRegistrations, '#2', null, 'all')).toHaveLength(1);
            expect(selectFilteredHolidayRegistrations(mockRegistrations, '2', null, 'all')).toHaveLength(1);
            expect(selectFilteredHolidayRegistrations(mockRegistrations, 'chen', null, 'all')).toHaveLength(1);
            expect(selectFilteredHolidayRegistrations(mockRegistrations, '0303', null, 'all')).toHaveLength(1);
            expect(selectFilteredHolidayRegistrations(mockRegistrations, 'sofia', null, 'all')).toHaveLength(1);
        });
    });

    describe('Store actions', () => {
        const originalFetch = global.fetch;

        beforeEach(() => {
            useHolidayStore.setState({
                registrations: [...mockRegistrations],
                isLoading: false,
                isLoaded: true,
                selectedSlotFilter: null,
                searchQuery: '',
                statusFilter: 'all',
            });
        });

        afterEach(() => {
            global.fetch = originalFetch;
        });

        it('updates status filter and slot filter', () => {
            const { setStatusFilter, setSelectedSlotFilter, setSearchQuery } = useHolidayStore.getState();

            setStatusFilter('checked_in');
            expect(useHolidayStore.getState().statusFilter).toBe('checked_in');

            setSelectedSlotFilter('09:00 AM - 09:20 AM');
            expect(useHolidayStore.getState().selectedSlotFilter).toBe('09:00 AM - 09:20 AM');

            setSearchQuery('test search');
            expect(useHolidayStore.getState().searchQuery).toBe('test search');
        });

        it('loads registrations from staff registrations endpoint', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ registrations: mockRegistrations }),
            } as any);

            await useHolidayStore.getState().loadFromSupabase();
            expect(global.fetch).toHaveBeenCalledWith('/api/holiday/staff/registrations');
            expect(useHolidayStore.getState().registrations).toHaveLength(4);
            expect(useHolidayStore.getState().isLoaded).toBe(true);
        });

        it('checks in a registration via staff check-in endpoint', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
            } as any);

            const result = await useHolidayStore.getState().checkInRegistration('reg-2', {
                groceryCards: 1,
                teenCards: 0,
                notes: 'Checked in by staff',
            });

            expect(result).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith('/api/holiday/staff/check-in', expect.objectContaining({
                method: 'POST',
            }));
            const updated = useHolidayStore.getState().registrations.find((r) => r.id === 'reg-2');
            expect(updated?.status).toBe('checked_in');
        });

        it('adds a walk-in registration via staff walk-in endpoint', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    registration: {
                        id: 'walk-in-id-1',
                        ticketNumber: 50,
                        eventYear: 2026,
                        parentName: 'Walk-In Parent',
                        phone: '650-555-4321',
                        city: 'Mountain View',
                        housingStatus: 'house_apartment',
                        incomeRange: '0_40k',
                        timeSlot: '09:40 AM - 10:00 AM',
                        language: 'en',
                        status: 'registered',
                        groceryCards: 1,
                        teenCards: 1,
                        children: [{ id: 'cw-1', name: 'Kid 1', age: 14, ageGroup: 'teen_14' }],
                        createdAt: '2026-11-01T12:00:00Z',
                        updatedAt: '2026-11-01T12:00:00Z',
                    },
                }),
            } as any);

            const result = await useHolidayStore.getState().addWalkInRegistration({
                parentName: 'Walk-In Parent',
                phone: '650-555-4321',
                city: 'Mountain View',
                housingStatus: 'house_apartment',
                incomeRange: '0_40k',
                language: 'en',
                children: [{ name: 'Kid 1', age: 14 }],
            });

            expect(result).toBeDefined();
            expect(result?.ticketNumber).toBe(50);
            expect(useHolidayStore.getState().registrations.some((r) => r.id === 'walk-in-id-1')).toBe(true);
        });

        it('updates a family registration via PATCH and replaces it in state', async () => {
            const updatedReg = {
                ...mockRegistrations[0],
                parentName: 'Updated Parent',
                children: [
                    { id: 'c1', name: 'Kid 1', age: 8, ageGroup: 'child' },
                    { id: 'c2', name: 'Kid 2', age: 15, ageGroup: 'teen_15' },
                ],
                teenCards: 1,
                updatedAt: '2026-09-02T00:00:00Z',
            };
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ registration: updatedReg }),
            } as any);

            const result = await useHolidayStore.getState().updateFamilyRegistration('reg-1', {
                parentName: 'Updated Parent',
                phone: '650-555-1111',
                city: 'Mountain View',
                housingStatus: 'house_apartment',
                incomeRange: '0_40k',
                language: 'en',
                children: [
                    { name: 'Kid 1', age: 8 },
                    { name: 'Kid 2', age: 15 },
                ],
            });

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/holiday/staff/registrations/reg-1',
                expect.objectContaining({ method: 'PATCH' })
            );
            expect(result?.parentName).toBe('Updated Parent');
            const inState = useHolidayStore.getState().registrations.find((r) => r.id === 'reg-1');
            expect(inState?.parentName).toBe('Updated Parent');
            expect(inState?.children).toHaveLength(2);
            expect(inState?.teenCards).toBe(1);
        });

        it('returns null when the family update fails', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: false,
                statusText: 'Conflict',
                json: async () => ({ error: 'This family already checked in and can no longer be edited.' }),
            } as any);

            const result = await useHolidayStore.getState().updateFamilyRegistration('reg-1', {
                parentName: 'Updated Parent',
                phone: '650-555-1111',
                city: 'Mountain View',
                housingStatus: 'house_apartment',
                incomeRange: '0_40k',
                language: 'en',
                children: [{ name: 'Kid 1', age: 8 }],
            });

            expect(result).toBeNull();
        });
    });
});
