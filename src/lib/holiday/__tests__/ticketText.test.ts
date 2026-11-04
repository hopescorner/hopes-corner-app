import { describe, it, expect } from 'vitest';
import {
    HOLIDAY_TICKET_TEXT,
    formatHolidayTicketString,
    getHolidayTicketText,
} from '../ticketText';

describe('holiday ticket text', () => {
    it('has wording for every supported language', () => {
        (['en', 'es', 'zh'] as const).forEach((language) => {
            const text = HOLIDAY_TICKET_TEXT[language];
            expect(text.title.length).toBeGreaterThan(0);
            expect(text.ticketNumberLabel.length).toBeGreaterThan(0);
            expect(text.checkInInstruction.length).toBeGreaterThan(0);
            expect(text.childrenLabel).toContain('{count}');
        });
    });

    it('falls back to English when no language is given', () => {
        expect(getHolidayTicketText()).toBe(HOLIDAY_TICKET_TEXT.en);
        expect(getHolidayTicketText(null)).toBe(HOLIDAY_TICKET_TEXT.en);
    });

    it('returns the language the family used on the form', () => {
        expect(getHolidayTicketText('es')).toBe(HOLIDAY_TICKET_TEXT.es);
        expect(getHolidayTicketText('zh')).toBe(HOLIDAY_TICKET_TEXT.zh);
    });

    it('fills placeholders for counts and ticket numbers', () => {
        expect(formatHolidayTicketString(HOLIDAY_TICKET_TEXT.es.childrenLabel, { count: 3 }))
            .toBe('Niños: 3 registrados');
        expect(formatHolidayTicketString(HOLIDAY_TICKET_TEXT.zh.shareTitle, { ticketNumber: 42 }))
            .toContain('#42');
        expect(formatHolidayTicketString('Keep {unknown}', {})).toBe('Keep {unknown}');
    });
});
