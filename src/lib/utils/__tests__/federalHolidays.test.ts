import { describe, expect, it } from 'vitest';
import { getFederalHoliday, getWeekdayName } from '../federalHolidays';

describe('federalHolidays', () => {
    it('names fixed and weekday-rule holidays', () => {
        expect(getFederalHoliday('2026-10-12')).toBe('Columbus Day'); // 2nd Mon of Oct 2026
        expect(getFederalHoliday('2026-11-26')).toBe('Thanksgiving Day'); // 4th Thu Nov 2026
        expect(getFederalHoliday('2026-09-07')).toBe('Labor Day'); // 1st Mon Sep 2026
        expect(getFederalHoliday('2026-05-25')).toBe('Memorial Day'); // last Mon May 2026
        expect(getFederalHoliday('2026-01-19')).toBe('Martin Luther King Jr. Day');
        expect(getFederalHoliday('2026-02-16')).toBe("Presidents' Day");
        expect(getFederalHoliday('2026-06-19')).toBe('Juneteenth');
        expect(getFederalHoliday('2026-07-04')).toBe('Independence Day');
        expect(getFederalHoliday('2026-11-11')).toBe('Veterans Day');
        expect(getFederalHoliday('2026-12-25')).toBe('Christmas Day');
        expect(getFederalHoliday('2026-01-01')).toBe("New Year's Day");
    });

    it('labels observed weekdays when a fixed holiday falls on a weekend', () => {
        // Jul 4 2026 is a Saturday -> observed Fri Jul 3.
        expect(getFederalHoliday('2026-07-03')).toBe('Independence Day (observed)');
        // Jan 1 2023 was a Sunday -> observed Mon Jan 2.
        expect(getFederalHoliday('2023-01-02')).toBe("New Year's Day (observed)");
        // Jan 1 2022 was a Saturday -> observed Fri Dec 31 2021.
        expect(getFederalHoliday('2021-12-31')).toBe("New Year's Day (observed)");
    });

    it('returns null for ordinary days and invalid input', () => {
        expect(getFederalHoliday('2026-10-13')).toBeNull();
        expect(getFederalHoliday('not-a-date')).toBeNull();
    });

    it('reports the full weekday name', () => {
        expect(getWeekdayName('2026-10-12')).toBe('Monday');
        expect(getWeekdayName('2026-09-23')).toBe('Wednesday');
        expect(getWeekdayName('bogus')).toBeNull();
    });
});
