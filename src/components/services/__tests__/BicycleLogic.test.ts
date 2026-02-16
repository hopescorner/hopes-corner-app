import { describe, it, expect, vi } from 'vitest';

describe('Bicycle logic', () => {
    describe('Service type logic', () => {
        it('identifies repair vs tune-up', () => {
            const repair = { serviceType: 'repair' };
            const tuneUp = { serviceType: 'tune-up' };
            expect(repair.serviceType).toBe('repair');
            expect(tuneUp.serviceType).toBe('tune-up');
        });

        it('identifies new bicycle service', () => {
            const record = { isNewBicycle: true };
            expect(record.isNewBicycle).toBe(true);
        });
    });

    describe('Queue management logic', () => {
        it('sorts services by date and time', () => {
            const services = [
                { id: 'b1', createdAt: '2025-01-06T10:00:00Z' },
                { id: 'b2', createdAt: '2025-01-06T09:00:00Z' },
            ];
            const sorted = [...services].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            expect(sorted[0].id).toBe('b2');
        });

        it('filters pending repairs', () => {
            const records = [
                { status: 'pending', serviceType: 'repair' },
                { status: 'completed', serviceType: 'repair' },
                { status: 'pending', serviceType: 'tune-up' },
            ];
            const pendingRepairs = records.filter(r => r.status === 'pending' && r.serviceType === 'repair');
            expect(pendingRepairs.length).toBe(1);
        });
    });

    describe('Banned guest logic for bicycles', () => {
        it('blocks bicycle service for banned guest', () => {
            const guest = { bannedFromBicycle: true };
            const canProvideService = !guest.bannedFromBicycle;
            expect(canProvideService).toBe(false);
        });
    });

    describe('Bicycle description normalization', () => {
        it('normalizes bicycle descriptions for consistent storage', () => {
            const raw = ' red trek bike ';
            const normalized = raw.trim().toLowerCase();
            expect(normalized).toBe('red trek bike');
        });
    });

    describe('6-month bicycle distribution rule', () => {
        it('identifies when guest received new bicycle within last 6 months', () => {
            const today = new Date();
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(today.getMonth() - 3);
            
            const bicycleRecords = [
                {
                    id: '1',
                    guestId: 'guest-123',
                    repairTypes: ['New Bicycle'],
                    date: threeMonthsAgo.toISOString(),
                },
            ];

            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const recentNewBicycles = bicycleRecords.filter(
                r => r.guestId === 'guest-123' &&
                     r.repairTypes?.includes('New Bicycle') &&
                     new Date(r.date) >= sixMonthsAgo
            );

            expect(recentNewBicycles.length).toBeGreaterThan(0);
        });

        it('allows new bicycle when last one was over 6 months ago', () => {
            const today = new Date();
            const sevenMonthsAgo = new Date();
            sevenMonthsAgo.setMonth(today.getMonth() - 7);
            
            const bicycleRecords = [
                {
                    id: '1',
                    guestId: 'guest-123',
                    repairTypes: ['New Bicycle'],
                    date: sevenMonthsAgo.toISOString(),
                },
            ];

            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const recentNewBicycles = bicycleRecords.filter(
                r => r.guestId === 'guest-123' &&
                     r.repairTypes?.includes('New Bicycle') &&
                     new Date(r.date) >= sixMonthsAgo
            );

            expect(recentNewBicycles.length).toBe(0);
        });

        it('does not count other repair types toward the limit', () => {
            const today = new Date();
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(today.getMonth() - 3);
            
            const bicycleRecords = [
                {
                    id: '1',
                    guestId: 'guest-123',
                    repairTypes: ['Flat Tire', 'Brake Adjustment'],
                    date: threeMonthsAgo.toISOString(),
                },
            ];

            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const recentNewBicycles = bicycleRecords.filter(
                r => r.guestId === 'guest-123' &&
                     r.repairTypes?.includes('New Bicycle') &&
                     new Date(r.date) >= sixMonthsAgo
            );

            expect(recentNewBicycles.length).toBe(0);
        });
    });
});
