import { describe, expect, it } from 'vitest';
import { buildHolidayEventIcs } from '../calendar';

describe('holiday calendar helper', () => {
    it('builds an all-day-friendly ICS event for the configured date', () => {
        const eventDate = new Date(2026, 11, 20, 9, 0, 0);
        const ics = buildHolidayEventIcs('es', eventDate);

        expect(ics).toContain('BEGIN:VCALENDAR');
        expect(ics).toContain('BEGIN:VEVENT');
        expect(ics).toContain('SUMMARY:HOPE\'S CORNER');
        expect(ics).toContain('LOCATION:Hope\'s Corner');
        expect(ics).toContain('DTSTART:');
        expect(ics).toContain('UID:holiday-2026@hopescorner.org');
        expect(ics).toContain('END:VCALENDAR');
    });
});
