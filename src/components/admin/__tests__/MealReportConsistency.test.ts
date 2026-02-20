/**
 * Tests that verify meal report calculations are consistent across the three
 * views: MealReport (Trend chart), MonthlyReportGenerator (PDF), and
 * MonthlySummaryReport (Summary table).
 *
 * These tests reproduce the root causes of prior inconsistencies:
 *  1. Bulk types (RV, Day Worker, etc.) were filtered by onsite service days
 *  2. RV day groupings missed some days
 *  3. Shelter was categorised differently across reports
 *  4. Timezone parsing could shift day-of-week
 */

import { describe, it, expect } from 'vitest';
import { parsePacificDateParts } from '@/lib/utils/date';

// ──────────────────── Shared helpers (mirror report logic) ────────────────────

/** Simulate MealReport (Trend chart) filtering AFTER the fix */
function trendFilter(
    records: { date: string; count: number }[],
    year: number,
    month: number,
    serviceDays: number[],
    isBulkType: boolean,
) {
    return records.filter(r => {
        const parts = parsePacificDateParts(r.date);
        if (!parts) return false;
        if (parts.year !== year || parts.month !== month) return false;
        // After fix: bulk types are NOT filtered by service day
        if (!isBulkType && !serviceDays.includes(parts.dayOfWeek)) return false;
        return true;
    });
}

function sumCounts(records: { count: number }[]) {
    return records.reduce((s, r) => s + (r.count || 0), 0);
}

/** Simulate MonthlyReportGenerator (PDF) filtering — all days in month */
function pdfFilter(records: { date: string; count: number }[], year: number, month: number) {
    return records.filter(r => {
        const parts = parsePacificDateParts(r.date);
        if (!parts) return false;
        return parts.year === year && parts.month === month;
    });
}

/** Simulate MonthlySummaryReport filtering by year/month and optional day-of-week */
function summaryFilter(
    records: { date: string; count: number }[],
    year: number,
    month: number,
    days?: number[],
) {
    return records.filter(r => {
        const parts = parsePacificDateParts(r.date);
        if (!parts) return false;
        if (parts.year !== year || parts.month !== month) return false;
        if (days && !days.includes(parts.dayOfWeek)) return false;
        return true;
    });
}

// ──────────────────── Test fixtures ────────────────────

/** January 2026 — ISO timestamps as Supabase would store them */
function makeJanuary2026Records() {
    // Guest meals on Mon(5), Wed(7), Fri(2,9,16,23,30), Sat(3,10,17,24,31)
    const guestMeals = [
        // Mon Jan 5
        { date: '2026-01-05T17:00:00.000Z', count: 120 },
        // Wed Jan 7
        { date: '2026-01-07T17:00:00.000Z', count: 110 },
        // Fri Jan 9
        { date: '2026-01-09T17:00:00.000Z', count: 100 },
        // Sat Jan 10
        { date: '2026-01-10T17:00:00.000Z', count: 130 },
    ];

    const extraMeals = [
        { date: '2026-01-05T18:00:00.000Z', count: 10 }, // Mon
        { date: '2026-01-10T18:00:00.000Z', count: 15 }, // Sat
    ];

    // RV meals on Mon(100), Wed(40), Thu(100), Sat(100) — Thu is NOT a service day
    const rvMeals = [
        { date: '2026-01-05T16:00:00.000Z', count: 100 }, // Mon
        { date: '2026-01-07T16:00:00.000Z', count: 40 },  // Wed
        { date: '2026-01-08T16:00:00.000Z', count: 100 }, // Thu ← was dropped by old Trend
        { date: '2026-01-10T16:00:00.000Z', count: 100 }, // Sat
    ];

    const dayWorkerMeals = [
        { date: '2026-01-10T16:00:00.000Z', count: 50 }, // Sat
    ];

    const shelterMeals = [
        { date: '2026-01-06T16:00:00.000Z', count: 20 }, // Tue — NOT a service day
    ];

    const unitedEffortMeals: { date: string; count: number }[] = [];

    const lunchBags = [
        { date: '2026-01-10T16:00:00.000Z', count: 100 }, // Sat
    ];

    return { guestMeals, extraMeals, rvMeals, dayWorkerMeals, shelterMeals, unitedEffortMeals, lunchBags };
}

// ──────────────────── Tests ────────────────────

describe('Meal report consistency', () => {
    const data = makeJanuary2026Records();
    const year = 2026;
    const month = 0; // January
    const serviceDays = [1, 3, 5, 6]; // Mon, Wed, Fri, Sat

    describe('Trend chart (MealReport) – bulk types not filtered by service day', () => {
        it('includes Thursday RV meals', () => {
            const rvFiltered = trendFilter(data.rvMeals, year, month, serviceDays, true);
            expect(sumCounts(rvFiltered)).toBe(340); // 100+40+100+100
        });

        it('includes Tuesday shelter meals', () => {
            const shelterFiltered = trendFilter(data.shelterMeals, year, month, serviceDays, true);
            expect(sumCounts(shelterFiltered)).toBe(20);
        });

        it('still filters guest meals by service day', () => {
            const guestFiltered = trendFilter(data.guestMeals, year, month, serviceDays, false);
            // Mon(120) + Wed(110) + Fri(100) + Sat(130) = 460
            expect(sumCounts(guestFiltered)).toBe(460);
        });
    });

    describe('All three reports produce the same total for a month', () => {
        // Calculate Trend total
        const trendGuest = sumCounts(trendFilter(data.guestMeals, year, month, serviceDays, false));
        const trendExtra = sumCounts(trendFilter(data.extraMeals, year, month, serviceDays, false));
        const trendRv = sumCounts(trendFilter(data.rvMeals, year, month, serviceDays, true));
        const trendDayWorker = sumCounts(trendFilter(data.dayWorkerMeals, year, month, serviceDays, true));
        const trendShelter = sumCounts(trendFilter(data.shelterMeals, year, month, serviceDays, true));
        const trendUe = sumCounts(trendFilter(data.unitedEffortMeals, year, month, serviceDays, true));
        const trendLunchBags = sumCounts(trendFilter(data.lunchBags, year, month, serviceDays, true));
        const trendTotal = trendGuest + trendExtra + trendRv + trendDayWorker + trendShelter + trendUe + trendLunchBags;

        // Calculate PDF total (all days)
        const pdfGuest = sumCounts(pdfFilter(data.guestMeals, year, month));
        const pdfExtra = sumCounts(pdfFilter(data.extraMeals, year, month));
        const pdfRv = sumCounts(pdfFilter(data.rvMeals, year, month));
        const pdfDayWorker = sumCounts(pdfFilter(data.dayWorkerMeals, year, month));
        const pdfShelter = sumCounts(pdfFilter(data.shelterMeals, year, month));
        const pdfUe = sumCounts(pdfFilter(data.unitedEffortMeals, year, month));
        const pdfLunchBags = sumCounts(pdfFilter(data.lunchBags, year, month));
        const pdfTotal = pdfGuest + pdfExtra + pdfRv + pdfDayWorker + pdfShelter + pdfUe + pdfLunchBags;

        // Calculate Summary total
        const sumGuest = sumCounts(summaryFilter(data.guestMeals, year, month, serviceDays));
        const sumExtra = sumCounts(summaryFilter(data.extraMeals, year, month));
        const sumRvWedSat = sumCounts(summaryFilter(data.rvMeals, year, month, [3, 6]));
        const sumRvMonThu = sumCounts(summaryFilter(data.rvMeals, year, month, [1, 4]));
        const sumRvAll = sumCounts(summaryFilter(data.rvMeals, year, month));
        const sumRvOther = sumRvAll - sumRvWedSat - sumRvMonThu;
        const sumDayWorker = sumCounts(summaryFilter(data.dayWorkerMeals, year, month));
        const sumShelter = sumCounts(summaryFilter(data.shelterMeals, year, month));
        const sumUe = sumCounts(summaryFilter(data.unitedEffortMeals, year, month));
        const sumLunchBags = sumCounts(summaryFilter(data.lunchBags, year, month));
        const summaryTotalHot = sumGuest + sumExtra + sumRvWedSat + sumRvMonThu + sumRvOther +
            sumDayWorker + sumShelter + sumUe;
        const summaryTotal = summaryTotalHot + sumLunchBags;

        it('trend total equals PDF total', () => {
            expect(trendTotal).toBe(pdfTotal);
        });

        it('trend total equals summary total', () => {
            expect(trendTotal).toBe(summaryTotal);
        });

        it('PDF total equals summary total', () => {
            expect(pdfTotal).toBe(summaryTotal);
        });

        it('all totals match the expected value', () => {
            // guest(460) + extra(25) + rv(340) + dayWorker(50) + shelter(20) + ue(0) + lunchBags(100) = 995
            expect(trendTotal).toBe(995);
        });
    });

    describe('RV catch-all in Monthly Summary', () => {
        it('rvOther captures RV meals on uncovered days', () => {
            const rvWedSat = sumCounts(summaryFilter(data.rvMeals, year, month, [3, 6]));
            const rvMonThu = sumCounts(summaryFilter(data.rvMeals, year, month, [1, 4]));
            const rvAll = sumCounts(summaryFilter(data.rvMeals, year, month));
            const rvOther = rvAll - rvWedSat - rvMonThu;

            expect(rvWedSat).toBe(140); // Wed(40) + Sat(100)
            expect(rvMonThu).toBe(200); // Mon(100) + Thu(100)
            expect(rvOther).toBe(0);    // No RV meals on Tue/Fri/Sun in this fixture
            expect(rvWedSat + rvMonThu + rvOther).toBe(rvAll);
        });

        it('rvOther is non-zero when RV records exist on uncovered days', () => {
            const withFridayRv = [
                ...data.rvMeals,
                { date: '2026-01-09T16:00:00.000Z', count: 30 }, // Friday RV
            ];
            const rvWedSat = sumCounts(summaryFilter(withFridayRv, year, month, [3, 6]));
            const rvMonThu = sumCounts(summaryFilter(withFridayRv, year, month, [1, 4]));
            const rvAll = sumCounts(summaryFilter(withFridayRv, year, month));
            const rvOther = rvAll - rvWedSat - rvMonThu;

            expect(rvOther).toBe(30);
            expect(rvWedSat + rvMonThu + rvOther).toBe(rvAll);
        });
    });

    describe('Shelter is visible and consistently categorised', () => {
        it('shelter is included in Trend total', () => {
            const shelterFiltered = trendFilter(data.shelterMeals, year, month, serviceDays, true);
            expect(sumCounts(shelterFiltered)).toBe(20);
        });

        it('PDF "rvSafePark" = rvMeals + shelter', () => {
            const rv = sumCounts(pdfFilter(data.rvMeals, year, month));
            const shelter = sumCounts(pdfFilter(data.shelterMeals, year, month));
            expect(rv + shelter).toBe(360); // 340 + 20
        });

        it('Summary totalHotMeals includes shelter', () => {
            const sumGuest = sumCounts(summaryFilter(data.guestMeals, year, month, serviceDays));
            const sumExtra = sumCounts(summaryFilter(data.extraMeals, year, month));
            const rvAll = sumCounts(summaryFilter(data.rvMeals, year, month));
            const sumDayWorker = sumCounts(summaryFilter(data.dayWorkerMeals, year, month));
            const sumShelter = sumCounts(summaryFilter(data.shelterMeals, year, month));
            const totalHot = sumGuest + sumExtra + rvAll + sumDayWorker + sumShelter;
            expect(totalHot).toBe(895); // 460+25+340+50+20
        });
    });
});

describe('parsePacificDateParts', () => {
    it('returns correct parts for ISO timestamp', () => {
        // 2026-01-08T16:00:00.000Z is Jan 8 in Pacific (UTC-8) = 8 AM PST
        const parts = parsePacificDateParts('2026-01-08T16:00:00.000Z');
        expect(parts).not.toBeNull();
        expect(parts!.year).toBe(2026);
        expect(parts!.month).toBe(0); // January
        expect(parts!.day).toBe(8);
        expect(parts!.dayOfWeek).toBe(4); // Thursday
    });

    it('returns correct parts for YYYY-MM-DD string', () => {
        const parts = parsePacificDateParts('2026-01-05');
        expect(parts).not.toBeNull();
        expect(parts!.year).toBe(2026);
        expect(parts!.month).toBe(0);
        expect(parts!.day).toBe(5);
        expect(parts!.dayOfWeek).toBe(1); // Monday
    });

    it('handles midnight UTC which could shift day in Pacific', () => {
        // 2026-01-08T00:00:00.000Z = still Jan 7 in Pacific (4 PM PST Jan 7)
        const parts = parsePacificDateParts('2026-01-08T00:00:00.000Z');
        expect(parts).not.toBeNull();
        // In Pacific time, midnight UTC Jan 8 is still Jan 7
        expect(parts!.day).toBe(7);
        expect(parts!.dayOfWeek).toBe(3); // Wednesday
    });

    it('returns null for empty string', () => {
        expect(parsePacificDateParts('')).toBeNull();
    });
});
