import { describe, expect, it } from 'vitest';
import { calculateDashboardOverviewMetrics } from '../dashboardOverviewMetrics';

const mealRecords = [
    { date: '2026-05-01', count: 2 },
    { date: '2026-04-30', count: 5 },
    { date: '2025-05-01', count: 7 },
];

const rvMealRecords = [
    { date: '2026-05-02', count: 3 },
];

const extraMealRecords = [
    { date: '2026-05-03', count: 4 },
];

const unitedEffortMealRecords = [
    { date: '2026-01-10', count: 6 },
];

const showerRecords = [
    { date: '2026-05-02', status: 'done' },
    { date: '2026-05-03', status: 'cancelled' },
    { date: '2026-02-01', status: 'done' },
];

const laundryRecords = [
    { date: '2026-05-04', status: 'done' },
    { date: '2026-05-05', status: 'picked_up' },
    { date: '2026-01-04', status: 'done' },
];

const bicycleRecords = [
    { date: '2026-05-06', status: 'done' },
    { date: '2026-05-07', status: 'pending' },
    { date: '2026-03-01', status: 'done' },
];

describe('calculateDashboardOverviewMetrics', () => {
    it('calculates month and year metrics with one shared pass over each record group', () => {
        const metrics = calculateDashboardOverviewMetrics({
            mealRecords,
            rvMealRecords,
            extraMealRecords,
            unitedEffortMealRecords,
            showerRecords,
            laundryRecords,
            bicycleRecords,
        }, new Date(2026, 4, 15));

        expect(metrics.month).toEqual({
            meals: 9,
            showers: 1,
            laundry: 1,
            bicycles: 1,
        });
        expect(metrics.year).toEqual({
            meals: 20,
            showers: 2,
            laundry: 2,
            bicycles: 2,
        });
    });

    it('ignores invalid dates and non-completed services without throwing', () => {
        const metrics = calculateDashboardOverviewMetrics({
            mealRecords: [{ date: '', count: 10 }, { date: 'not-a-date', count: 8 }],
            showerRecords: [{ date: '2026-05-01', status: 'waiting' }],
            laundryRecords: [{ date: '2026-05-01', status: 'cancelled' }],
            bicycleRecords: [{ date: '2026-05-01', status: 'in_progress' }],
        }, new Date(2026, 4, 15));

        expect(metrics.month).toEqual({ meals: 0, showers: 0, laundry: 0, bicycles: 0 });
        expect(metrics.year).toEqual({ meals: 0, showers: 0, laundry: 0, bicycles: 0 });
    });
});
