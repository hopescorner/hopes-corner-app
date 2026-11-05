import { describe, expect, it } from 'vitest';
import { formatHolidayPhone, normalizeHolidayPhoneDigits } from '../phone';

describe('holiday phone helpers', () => {
    it('formats a 10-digit number for display', () => {
        expect(formatHolidayPhone('6505551234')).toBe('(650) 555-1234');
        expect(formatHolidayPhone('650555')).toBe('(650) 555');
        expect(formatHolidayPhone('650')).toBe('650');
    });

    it('strips a leading +1 before formatting', () => {
        expect(normalizeHolidayPhoneDigits('+1 (650) 555-1234')).toBe('6505551234');
        expect(formatHolidayPhone('+1 (650) 555-1234')).toBe('(650) 555-1234');
        expect(formatHolidayPhone('16505551234')).toBe('(650) 555-1234');
    });

    it('caps input at 10 national digits', () => {
        expect(normalizeHolidayPhoneDigits('650555123499')).toBe('6505551234');
        expect(formatHolidayPhone('650555123499')).toBe('(650) 555-1234');
    });
});
