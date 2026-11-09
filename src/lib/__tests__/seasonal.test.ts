import { describe, it, expect } from 'vitest';
import {
    isHalloweenSeason,
    isTurkeySeason,
    getLastThursdayOfNovember,
    getTurkeySeasonEnd,
} from '@/lib/seasonal';

describe('isHalloweenSeason', () => {
    it('returns true during October', () => {
        expect(isHalloweenSeason(new Date(2026, 9, 16))).toBe(true);
        expect(isHalloweenSeason(new Date(2026, 9, 31))).toBe(true);
        expect(isHalloweenSeason(new Date(2026, 9, 1))).toBe(true);
    });

    it('reverts to false on Nov 1st', () => {
        expect(isHalloweenSeason(new Date(2026, 10, 1))).toBe(false);
        expect(isHalloweenSeason(new Date(2026, 10, 15))).toBe(false);
    });

    it('returns false outside October', () => {
        expect(isHalloweenSeason(new Date(2026, 0, 15))).toBe(false);
        expect(isHalloweenSeason(new Date(2026, 6, 4))).toBe(false);
        expect(isHalloweenSeason(new Date(2026, 11, 25))).toBe(false);
    });

    it('repeats every year (year-over-year, no year check)', () => {
        for (const year of [2024, 2025, 2026, 2027, 2030]) {
            expect(isHalloweenSeason(new Date(year, 9, 20))).toBe(true);
            expect(isHalloweenSeason(new Date(year, 10, 1))).toBe(false);
        }
    });
});

// Nov 2026: Nov 1 is a Sunday, so Thursdays are 5, 12, 19, 26 and the
// last Thursday is the 26th. Nov 15 (Sunday) through Thu Nov 26 is active.
describe('getLastThursdayOfNovember', () => {
    it('returns 26 for 2026', () => {
        expect(getLastThursdayOfNovember(2026)).toBe(26);
        // Verify the returned day really is a Thursday (getDay 4).
        expect(new Date(2026, 10, 26).getDay()).toBe(4);
    });

    it('always returns a Thursday between the 24th and 30th', () => {
        for (let year = 2024; year <= 2035; year++) {
            const last = getLastThursdayOfNovember(year);
            expect(last).toBeGreaterThanOrEqual(24);
            expect(last).toBeLessThanOrEqual(30);
            expect(new Date(year, 10, last).getDay()).toBe(4);
            // Adding 7 days must leave November.
            expect(last + 7).toBeGreaterThan(30);
        }
    });

    it('getTurkeySeasonEnd matches the last Thursday', () => {
        expect(getTurkeySeasonEnd(2026)).toBe(26);
    });
});

describe('isTurkeySeason', () => {
    it('is inactive before November 15th', () => {
        expect(isTurkeySeason(new Date(2026, 10, 14))).toBe(false);
        expect(isTurkeySeason(new Date(2026, 10, 1))).toBe(false);
        expect(isTurkeySeason(new Date(2026, 10, 10))).toBe(false);
    });

    it('is active from November 15th through the last Thursday (Nov 26, 2026)', () => {
        expect(isTurkeySeason(new Date(2026, 10, 15))).toBe(true);
        expect(isTurkeySeason(new Date(2026, 10, 20))).toBe(true);
        expect(isTurkeySeason(new Date(2026, 10, 26))).toBe(true);
    });

    it('disappears after the last Thursday', () => {
        expect(isTurkeySeason(new Date(2026, 10, 27))).toBe(false);
        expect(isTurkeySeason(new Date(2026, 10, 30))).toBe(false);
    });

    it('is inactive outside November', () => {
        expect(isTurkeySeason(new Date(2026, 9, 20))).toBe(false);
        expect(isTurkeySeason(new Date(2026, 11, 1))).toBe(false);
        expect(isTurkeySeason(new Date(2026, 0, 15))).toBe(false);
    });

    it('repeats every year with the computed last Thursday (year-over-year)', () => {
        for (let year = 2024; year <= 2032; year++) {
            const end = getLastThursdayOfNovember(year);
            expect(isTurkeySeason(new Date(year, 10, 14))).toBe(false);
            expect(isTurkeySeason(new Date(year, 10, 15))).toBe(true);
            expect(isTurkeySeason(new Date(year, 10, end))).toBe(true);
            if (end < 30) {
                expect(isTurkeySeason(new Date(year, 10, end + 1))).toBe(false);
            }
            expect(isTurkeySeason(new Date(year, 11, 1))).toBe(false);
        }
    });
});
