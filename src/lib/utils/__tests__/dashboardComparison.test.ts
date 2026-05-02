import { describe, expect, it } from 'vitest';
import {
    calculateDashboardComparisonMetrics,
    calculatePercentChange,
    compareDashboardRanges,
} from '../dashboardComparison';

const comparisonData = {
    guests: [
        { id: 'g1', createdAt: '2026-04-02T09:00:00.000Z', location: 'Mountain View', age: 'Adult 18-59', gender: 'Male', housingStatus: 'Unhoused' },
        { id: 'g2', createdAt: '2026-04-04T09:00:00.000Z', location: 'Palo Alto', age: 'Senior 60+', gender: 'Female', housingStatus: 'Housed' },
        { id: 'g3', createdAt: '2026-03-02T09:00:00.000Z', location: 'Mountain View', age: 'Adult 18-59', gender: 'Female', housingStatus: 'Unhoused' },
    ],
    mealRecords: [
        { id: 'm1', guestId: 'g1', pickedUpByGuestId: 'g2', count: 2, date: '2026-04-03', dateKey: '2026-04-03' },
        { id: 'm2', guestId: 'g2', count: 1, date: '2026-04-04', dateKey: '2026-04-04' },
        { id: 'm3', guestId: 'g3', count: 1, date: '2026-03-03', dateKey: '2026-03-03' },
    ],
    rvMealRecords: [],
    extraMealRecords: [
        { id: 'e1', guestId: 'g1', count: 3, date: '2026-04-03', dateKey: '2026-04-03' },
    ],
    dayWorkerMealRecords: [],
    shelterMealRecords: [],
    unitedEffortMealRecords: [],
    lunchBagRecords: [],
    showerRecords: [
        { id: 's1', guestId: 'g1', status: 'done', date: '2026-04-03', dateKey: '2026-04-03' },
        { id: 's2', guestId: 'g2', status: 'cancelled', date: '2026-04-03', dateKey: '2026-04-03' },
        { id: 's3', guestId: 'g3', status: 'done', date: '2026-03-03', dateKey: '2026-03-03' },
    ],
    laundryRecords: [
        { id: 'l1', guestId: 'g1', status: 'returned', date: '2026-04-03', dateKey: '2026-04-03' },
        { id: 'l2', guestId: 'g3', status: 'picked_up', date: '2026-03-03', dateKey: '2026-03-03' },
    ],
    bicycleRecords: [
        { id: 'b1', guestId: 'g1', status: 'done', repairTypes: ['tires', 'brakes'], date: '2026-04-03', dateKey: '2026-04-03' },
        { id: 'b2', guestId: 'g3', status: 'done', repairTypes: [], repairType: 'chain', date: '2026-03-03', dateKey: '2026-03-03' },
    ],
};

describe('dashboard comparison utilities', () => {
    it('counts the requested dashboard metrics for an inclusive date range', () => {
        const metrics = calculateDashboardComparisonMetrics(comparisonData, {
            start: '2026-04-01',
            end: '2026-04-07',
        });

        expect(metrics).toEqual({
            newGuests: 2,
            totalGuests: 2,
            proxyPickups: 2,
            meals: 6,
            showers: 1,
            bicycles: 2,
            laundry: 1,
        });
    });

    it('applies area filters to guest-backed metrics', () => {
        const metrics = calculateDashboardComparisonMetrics(
            comparisonData,
            { start: '2026-04-01', end: '2026-04-07' },
            { location: 'Mountain View' },
        );

        expect(metrics).toEqual({
            newGuests: 1,
            totalGuests: 1,
            proxyPickups: 2,
            meals: 5,
            showers: 1,
            bicycles: 2,
            laundry: 1,
        });
    });

    it('compares two arbitrary date ranges with absolute and percentage changes', () => {
        const rows = compareDashboardRanges(comparisonData, {
            first: { start: '2026-04-01', end: '2026-04-07' },
            second: { start: '2026-03-01', end: '2026-03-07' },
        });

        const meals = rows.find((row) => row.key === 'meals');
        expect(meals).toMatchObject({ firstValue: 6, secondValue: 1, delta: 5, percentChange: 500 });

        const newGuests = rows.find((row) => row.key === 'newGuests');
        expect(newGuests).toMatchObject({ firstValue: 2, secondValue: 1, delta: 1, percentChange: 100 });
    });

    it('returns null percent change when the comparison range starts at zero', () => {
        expect(calculatePercentChange(4, 0)).toBeNull();
        expect(calculatePercentChange(15, 10)).toBe(50);
    });
});
