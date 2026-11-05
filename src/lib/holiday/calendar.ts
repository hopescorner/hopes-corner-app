import type { HolidayLanguage } from '@/types/holiday';
import { HOLIDAY_EVENT_LOCATION } from './constants';
import { HOLIDAY_TRANSLATIONS } from './translations';

function escapeIcsText(value: string): string {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
}

function toIcsDate(date: Date): string {
    return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

export function buildHolidayEventIcs(language: HolidayLanguage, eventDate: Date): string {
    const t = HOLIDAY_TRANSLATIONS[language];
    const endDate = new Date(eventDate.getTime() + 5 * 60 * 60 * 1000);

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Hopes Corner//Holiday Program//EN',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `UID:holiday-${eventDate.getFullYear()}@hopescorner.org`,
        `DTSTAMP:${toIcsDate(new Date())}`,
        `DTSTART:${toIcsDate(eventDate)}`,
        `DTEND:${toIcsDate(endDate)}`,
        `SUMMARY:${escapeIcsText(t.programTitle)}`,
        `LOCATION:${escapeIcsText(HOLIDAY_EVENT_LOCATION)}`,
        `DESCRIPTION:${escapeIcsText(t.importantNotesText)}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ];

    return `${lines.join('\r\n')}\r\n`;
}

export function downloadHolidayEventIcs(language: HolidayLanguage, eventDate: Date): boolean {
    if (typeof document === 'undefined') return false;

    try {
        const blob = new Blob([buildHolidayEventIcs(language, eventDate)], {
            type: 'text/calendar;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `HopesCorner-Holiday-${eventDate.getFullYear()}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return true;
    } catch {
        return false;
    }
}
