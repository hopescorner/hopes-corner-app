import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    formatTimeElapsed,
    pacificDateStringFrom,
    todayPacificDateString,
    isoFromPacificDateString,
    formatDateForDisplay,
    weekStartPacificDateString,
    nextWeekStartPacificDateString
} from '../date';

describe('date utilities', () => {
    describe('formatTimeElapsed', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2025-01-06T12:00:00Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('returns empty string for null/undefined', () => {
            expect(formatTimeElapsed(null)).toBe('');
            expect(formatTimeElapsed(undefined)).toBe('');
        });

        it('returns "just now" for very recent times', () => {
            const now = new Date('2025-01-06T12:00:00Z');
            expect(formatTimeElapsed(now)).toBe('just now');
        });

        it('returns minutes ago for < 60 minutes', () => {
            const thirtyMinsAgo = new Date('2025-01-06T11:30:00Z');
            expect(formatTimeElapsed(thirtyMinsAgo)).toBe('30 min ago');
        });

        it('returns hours ago for < 24 hours', () => {
            const fiveHoursAgo = new Date('2025-01-06T07:00:00Z');
            expect(formatTimeElapsed(fiveHoursAgo)).toBe('5 hr ago');
        });

        it('returns days ago for >= 24 hours', () => {
            const twoDaysAgo = new Date('2025-01-04T12:00:00Z');
            expect(formatTimeElapsed(twoDaysAgo)).toBe('2 days ago');
        });

        it('handles date objects', () => {
            const fiveMinAgo = new Date('2025-01-06T11:55:00Z');
            expect(formatTimeElapsed(fiveMinAgo)).toBe('5 min ago');
        });

        it('handles invalid date string (returns NaN output)', () => {
            // Note: The current implementation doesn't validate dates, 
            // so 'invalid-date' results in NaN calculations
            const result = formatTimeElapsed('invalid-date');
            expect(result).toContain('NaN');
        });
    });

    describe('pacificDateStringFrom', () => {
        it('formats date in YYYY-MM-DD format', () => {
            // Using a date that's unambiguous in any timezone
            const result = pacificDateStringFrom(new Date('2025-06-15T20:00:00Z'));
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('uses current date when no argument provided', () => {
            const result = pacificDateStringFrom();
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('handles string input', () => {
            const result = pacificDateStringFrom('2025-06-15');
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('handles number (timestamp) input', () => {
            const timestamp = new Date('2025-06-15T12:00:00Z').getTime();
            const result = pacificDateStringFrom(timestamp);
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe('todayPacificDateString', () => {
        it('returns today date in YYYY-MM-DD format', () => {
            const result = todayPacificDateString();
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('returns same value as pacificDateStringFrom with current date', () => {
            const directCall = pacificDateStringFrom(new Date());
            const todayCall = todayPacificDateString();
            expect(todayCall).toBe(directCall);
        });
    });

    describe('isoFromPacificDateString', () => {
        it('converts Pacific date string to ISO timestamp', () => {
            const result = isoFromPacificDateString('2025-06-15');
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
        });

        it('roundtrips correctly with pacificDateStringFrom', () => {
            const original = '2025-09-15';
            const iso = isoFromPacificDateString(original);
            const backToPacific = pacificDateStringFrom(new Date(iso));
            expect(backToPacific).toBe(original);
        });

        it('handles edge cases at year boundaries', () => {
            const result = isoFromPacificDateString('2025-01-01');
            expect(result).toContain('2025');
        });
    });

    describe('formatDateForDisplay', () => {
        it('handles YYYY-MM-DD string format', () => {
            const result = formatDateForDisplay('2025-06-15');
            expect(result).toBeTruthy();
            // Should contain the date components
            expect(result).toMatch(/15/); // day
            expect(result).toMatch(/2025/); // year
        });

        it('handles Date object', () => {
            const date = new Date(2025, 5, 15); // June 15, 2025 (month is 0-indexed)
            const result = formatDateForDisplay(date);
            expect(result).toBeTruthy();
        });

        it('returns empty string for empty input', () => {
            expect(formatDateForDisplay('')).toBe('');
        });

        it('applies format options', () => {
            const result = formatDateForDisplay('2025-06-15', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            expect(result).toMatch(/June/);
            expect(result).toMatch(/2025/);
        });

        it('handles ISO string dates', () => {
            const result = formatDateForDisplay('2025-06-15T12:00:00Z');
            expect(result).toBeTruthy();
        });
    });

    describe('weekStartPacificDateString', () => {
        it('returns the same date when input is a Monday', () => {
            // 2025-01-06 is a Monday
            expect(weekStartPacificDateString('2025-01-06')).toBe('2025-01-06');
        });

        it('rolls back to the previous Monday for a Tuesday', () => {
            // 2025-01-07 is a Tuesday; the Monday that starts its week is 2025-01-06
            expect(weekStartPacificDateString('2025-01-07')).toBe('2025-01-06');
        });

        it('rolls back to the previous Monday for a Sunday (end of week)', () => {
            // 2025-01-12 is a Sunday; its week starts on Monday 2025-01-06
            expect(weekStartPacificDateString('2025-01-12')).toBe('2025-01-06');
        });

        it('rolls back across month boundaries', () => {
            // 2025-02-01 is a Saturday; its Monday is 2025-01-27
            expect(weekStartPacificDateString('2025-02-01')).toBe('2025-01-27');
        });
    });

    describe('nextWeekStartPacificDateString', () => {
        it('returns the Monday of the following week', () => {
            // Week of 2025-01-06 -> next Monday is 2025-01-13
            expect(nextWeekStartPacificDateString('2025-01-06')).toBe('2025-01-13');
        });

        it('advances by 7 days regardless of the day-of-week input', () => {
            expect(nextWeekStartPacificDateString('2025-01-09')).toBe('2025-01-13');
            expect(nextWeekStartPacificDateString('2025-01-12')).toBe('2025-01-13');
        });
    });
});
