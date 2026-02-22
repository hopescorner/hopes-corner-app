import { describe, it, expect } from 'vitest';
import { pacificDateStringFrom, todayPacificDateString } from '@/lib/utils/date';

describe('Analytics Logic Advanced Tests', () => {
    describe('Percentage Change Calculations', () => {
        const calculateChange = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        it('calculates increase', () => {
            expect(calculateChange(150, 100)).toBe(50);
        });

        it('calculates decrease', () => {
            expect(calculateChange(80, 100)).toBe(-20);
        });

        it('handles zero previous value', () => {
            expect(calculateChange(100, 0)).toBe(100);
        });

        it('handles double zeros', () => {
            expect(calculateChange(0, 0)).toBe(0);
        });
    });

    describe('Demographic Aggregations', () => {
        const guests = [
            { gender: 'Male', age: 'Adult 18-59', housingStatus: 'unhoused' },
            { gender: 'Female', age: 'Senior 60+', housingStatus: 'housed' },
            { gender: 'Male', age: 'Adult 18-59', housingStatus: 'housed' },
            { gender: 'Male', age: 'Senior 60+', housingStatus: 'unhoused' },
        ];

        it('breaks down by gender', () => {
            const result = guests.reduce((acc: any, g) => {
                acc[g.gender] = (acc[g.gender] || 0) + 1;
                return acc;
            }, {});
            expect(result.Male).toBe(3);
            expect(result.Female).toBe(1);
        });

        it('breaks down by age group', () => {
            const result = guests.reduce((acc: any, g) => {
                acc[g.age] = (acc[g.age] || 0) + 1;
                return acc;
            }, {});
            expect(result['Adult 18-59']).toBe(2);
            expect(result['Senior 60+']).toBe(2);
        });

        it('calculates housing stability index', () => {
            const housedCount = guests.filter(g => g.housingStatus === 'housed').length;
            const index = (housedCount / guests.length) * 100;
            expect(index).toBe(50);
        });
    });

    describe('Trend Data Generation', () => {
        it('identifies growth trends', () => {
            const counts = [10, 12, 15, 14, 18, 20];
            const isGrowing = counts[counts.length - 1] > counts[0];
            expect(isGrowing).toBe(true);
        });

        it('calculates 7-day moving average', () => {
            const counts = [10, 20, 30, 40, 50, 60, 70, 80];
            const last7 = counts.slice(-7);
            const avg = last7.reduce((a, b) => a + b, 0) / 7;
            expect(avg).toBe(50);
        });
    });

    describe('Timezone-safe date handling for trends chart', () => {
        it('pacificDateStringFrom returns Pacific date even for UTC midnight timestamps', () => {
            // A UTC midnight ISO string for Feb 15, 2026 represents 4pm Feb 14 Pacific
            // pacificDateStringFrom must return the Pacific date (Feb 14), not the UTC date (Feb 15)
            const utcMidnight = '2026-02-15T00:00:00.000Z';
            const result = pacificDateStringFrom(utcMidnight);
            // UTC midnight is 4pm or 5pm previous day in Pacific (depending on PST/PDT)
            expect(result).toBe('2026-02-14');
        });

        it('pacificDateStringFrom returns correct date for afternoon Pacific timestamps', () => {
            // 8am Pacific on Feb 15 = 4pm UTC Feb 15 (PST, UTC-8)
            const pacificMorning = '2026-02-15T16:00:00.000Z';
            expect(pacificDateStringFrom(pacificMorning)).toBe('2026-02-15');
        });

        it('todayPacificDateString matches pacificDateStringFrom(now)', () => {
            const today1 = todayPacificDateString();
            const today2 = pacificDateStringFrom(new Date());
            expect(today1).toBe(today2);
        });

        it('date constructed with T12:00:00 stays on the correct calendar day', () => {
            // The fix appends T12:00:00 when constructing Date from YYYY-MM-DD for label generation
            const dateStr = '2026-02-15';
            const d = new Date(dateStr + 'T12:00:00');
            const label = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Los_Angeles' });
            // Feb 15, 2026 is a Sunday
            expect(label).toBe('Sun');
        });

        it('date constructed without T12:00:00 produces incorrect label due to UTC midnight', () => {
            // This demonstrates the bug that was fixed
            const dateStr = '2026-02-15';
            const d = new Date(dateStr); // Parsed as UTC midnight
            const pacificDate = pacificDateStringFrom(d);
            // UTC midnight Feb 15 = Feb 14 in Pacific timezone
            expect(pacificDate).toBe('2026-02-14');
        });

        it('date key lookup matches Pacific dateKey for records during business hours', () => {
            // Service at 9am Pacific on Feb 15 = 5pm UTC Feb 15
            const timestamp = '2026-02-15T17:00:00.000Z';
            const dateKey = pacificDateStringFrom(timestamp);
            expect(dateKey).toBe('2026-02-15');

            // The chart loop key for Feb 15 should also be '2026-02-15'
            const d = new Date('2026-02-15T12:00:00');
            const loopKey = pacificDateStringFrom(d);
            expect(loopKey).toBe('2026-02-15');

            // They match — data correctly appears under the right chart bar
            expect(dateKey).toBe(loopKey);
        });
    });
});
