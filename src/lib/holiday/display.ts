import { HOLIDAY_NO_SCHOOL_VALUE } from './constants';

/**
 * Convert the stored school marker into display text. Falls back to the raw
 * school name for normal records.
 */
export function formatHolidaySchoolLabel(
    school: string | null | undefined,
    notInSchoolLabel = 'Not in school yet'
): string {
    if (!school) return '';
    return school === HOLIDAY_NO_SCHOOL_VALUE ? notInSchoolLabel : school;
}
