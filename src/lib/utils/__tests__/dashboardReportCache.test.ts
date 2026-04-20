import { describe, expect, it } from 'vitest';

import {
    getMealReportData,
    getMonthlyReportData,
    getMonthlySummaryDatasets,
    warmDashboardReportCache,
} from '../dashboardReportCache';

const mealTypeFilters = {
    guest: true,
    extras: true,
    rv: true,
    dayWorker: true,
    shelter: true,
    unitedEffort: true,
    lunchBags: true,
};

const createInput = () => ({
    mealRecords: [
        { date: '2025-01-06T12:00:00', count: 2, guestId: 'g1' },
        { date: '2025-01-08T12:00:00', count: 1, guestId: 'g2', pickedUpByGuestId: 'proxy-1' },
        { date: '2025-02-03T12:00:00', count: 1, guestId: 'g1' },
    ],
    extraMealRecords: [
        { date: '2025-01-06T12:00:00', count: 1, guestId: 'g3' },
    ],
    rvMealRecords: [
        { date: '2025-01-09T12:00:00', count: 5, guestId: 'g4' },
        { date: '2025-01-11T12:00:00', count: 6, guestId: 'g4' },
    ],
    dayWorkerMealRecords: [
        { date: '2025-01-07T12:00:00', count: 7, guestId: 'g5' },
    ],
    lunchBagRecords: [
        { date: '2025-01-10T12:00:00', count: 3, guestId: 'g6' },
    ],
    shelterMealRecords: [
        { date: '2025-01-12T12:00:00', count: 4, guestId: 'g7' },
    ],
    unitedEffortMealRecords: [
        { date: '2025-01-13T12:00:00', count: 2, guestId: 'g8' },
    ],
    showerRecords: [
        { date: '2025-01-05', status: 'done', guestId: 'g1' },
        { date: '2025-01-06', status: 'attended', guestId: 'g2' },
        { date: '2025-01-07', status: 'cancelled', guestId: 'g9' },
    ],
    laundryRecords: [
        { date: '2025-01-05', status: 'picked_up', guestId: 'g1', laundryType: 'onsite' },
        { date: '2025-01-06', status: 'offsite_picked_up', guestId: 'g3', laundryType: 'offsite' },
        { date: '2025-01-07', status: 'waiting', guestId: 'g4', laundryType: 'onsite' },
    ],
    bicycleRecords: [
        { date: '2025-01-05', status: 'done', repairTypes: ['Flat tire', 'New Bicycle'], guestId: 'g1' },
        { date: '2025-01-07', status: 'in_progress', repairTypes: ['Chain'], guestId: 'g2' },
        { date: '2025-01-09', status: 'pending', repairTypes: ['Brake'], guestId: 'g3' },
    ],
    haircutRecords: [
        { serviceDate: '2025-01-15', guestId: 'g1' },
        { dateKey: '2025-01-20', guestId: 'g2' },
    ],
    guests: [
        { id: 'g1', housingStatus: 'Unhoused', location: 'San Jose', age: 'Adult 18-59' },
        { id: 'g2', housingStatus: 'Housed', location: 'Sunnyvale', age: 'Senior 60+' },
        { id: 'g3', housingStatus: 'RV or vehicle', location: 'San Jose', age: 'Child 0-17' },
        { id: 'g4', housingStatus: 'Temp. shelter', location: 'Santa Clara', age: 'Adult 18-59' },
        { id: 'g5', housingStatus: 'Unhoused', location: 'Mountain View', age: 'Adult 18-59' },
        { id: 'g6', housingStatus: 'Unhoused', location: 'San Jose', age: 'Adult 18-59' },
        { id: 'g7', housingStatus: 'Housed', location: 'Sunnyvale', age: 'Senior 60+' },
        { id: 'g8', housingStatus: 'Unhoused', location: 'San Jose', age: 'Adult 18-59' },
    ],
});

describe('dashboardReportCache', () => {
    it('reuses the warmed cache for identical input references', () => {
        const input = createInput();

        const first = warmDashboardReportCache(input);
        const second = warmDashboardReportCache(input);
        const third = warmDashboardReportCache({
            ...input,
            mealRecords: [...input.mealRecords],
        });

        expect(second).toBe(first);
        expect(third).not.toBe(first);
    });

    it('builds meal report data from pre-aggregated month buckets', () => {
        const input = createInput();

        const [january] = getMealReportData(input, {
            selectedYear: 2025,
            selectedMonth: 0,
            comparisonMonths: 0,
            selectedDays: [1, 3],
            mealTypeFilters,
        });

        expect(january.month).toBe('January 2025');
        expect(january.guestMeals).toBe(3);
        expect(january.extras).toBe(1);
        expect(january.rvMeals).toBe(11);
        expect(january.dayWorkerMeals).toBe(7);
        expect(january.shelterMeals).toBe(4);
        expect(january.unitedEffortMeals).toBe(2);
        expect(january.lunchBags).toBe(3);
        expect(january.totalMeals).toBe(31);
        expect(january.uniqueGuests).toBe(8);
        expect(january.ageGroups['Adult 18-59']).toBe(5);
        expect(january.ageGroups['Senior 60+']).toBe(2);
        expect(january.ageGroups['Child 0-17']).toBe(1);
    });

    it('builds monthly report data without rescanning every store array', () => {
        const input = createInput();

        const reportData = getMonthlyReportData(input, 2025, 0);

        expect(reportData.month).toBe('January');
        expect(reportData.year).toBe(2025);
        expect(reportData.monthStats.totalMeals).toBe(31);
        expect(reportData.monthStats.onsiteHotMeals).toBe(4);
        expect(reportData.monthStats.rvSafePark).toBe(15);
        expect(reportData.monthStats.showers).toBe(1);
        expect(reportData.monthStats.laundry).toBe(2);
        expect(reportData.monthStats.bikeService).toBe(1);
        expect(reportData.monthStats.newBicycles).toBe(1);
        expect(reportData.monthStats.haircuts).toBe(2);
        expect(reportData.ytdStats.totalMeals).toBe(31);
        expect(reportData.totalActiveGuests).toBe(8);
        expect(reportData.housingBreakdown[0]).toMatchObject({ label: 'Unhoused', count: 4 });
        expect(reportData.topLocations[0]).toMatchObject({ label: 'San Jose', count: 4 });
        expect(reportData.ageBreakdown[0]).toMatchObject({ label: 'Adult 18-59', count: 5 });
    });

    it('builds monthly summary datasets from the shared cache', () => {
        const input = createInput();

        const { monthlyData, bicycleSummary, showerLaundrySummary } = getMonthlySummaryDatasets(input, 2025, 2025, 1);
        const januaryMeals = monthlyData.months[0];
        const februaryMeals = monthlyData.months[1];
        const januaryBicycles = bicycleSummary.months[0];
        const januaryServices = showerLaundrySummary.months[0];

        expect(januaryMeals.month).toBe('January');
        expect(januaryMeals.mondayMeals).toBe(2);
        expect(januaryMeals.wednesdayMeals).toBe(1);
        expect(januaryMeals.uniqueGuests).toBe(2);
        expect(januaryMeals.newGuests).toBe(2);
        expect(januaryMeals.proxyPickups).toBe(1);
        expect(januaryMeals.rvWedSat).toBe(6);
        expect(januaryMeals.rvMonThu).toBe(5);
        expect(januaryMeals.totalHotMeals).toBe(28);
        expect(januaryMeals.totalWithLunchBags).toBe(31);
        expect(februaryMeals.newGuests).toBe(0);
        expect(monthlyData.totals.uniqueGuests).toBe(2);
        expect(monthlyData.totals.newGuests).toBe(2);

        expect(januaryBicycles).toMatchObject({ month: 'January', newBikes: 1, services: 1, total: 2 });
        expect(bicycleSummary.totals).toMatchObject({ newBikes: 1, services: 1, total: 2 });

        expect(januaryServices.showers).toBe(2);
        expect(januaryServices.laundryLoads).toBe(2);
        expect(januaryServices.totalParticipants).toBe(3);
        expect(januaryServices.newGuests).toBe(3);
        expect(januaryServices.uniqueLaundryGuests).toBe(2);
        expect(januaryServices.newLaundryGuests).toBe(2);
        expect(januaryServices.onsiteLoads).toBe(1);
        expect(januaryServices.offsiteLoads).toBe(1);
        expect(showerLaundrySummary.totals.totalParticipants).toBe(3);
        expect(showerLaundrySummary.totals.uniqueLaundryGuests).toBe(2);
    });
});