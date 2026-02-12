import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getMealServiceInfo,
    formatTime,
    formatTimeRemaining,
    getMealServiceStatus,
    getSundayServiceName,
    isSundayBrunch
} from '../mealServiceTime';

describe('mealServiceTime utilities', () => {
    describe('getMealServiceInfo', () => {
        it('returns Sunday Brunch schedule (10:00 - 14:00)', () => {
            const sunday = new Date(2025, 0, 5); // January 5, 2025 is a Sunday
            const service = getMealServiceInfo(sunday);
            
            expect(service).not.toBeNull();
            expect(service?.startHour).toBe(10);
            expect(service?.startMinute).toBe(0);
            expect(service?.endHour).toBe(14);
            expect(service?.endMinute).toBe(0);
        });

        it('returns null for Tuesday (no service)', () => {
            const tuesday = new Date(2025, 0, 7);
            expect(getMealServiceInfo(tuesday)).toBeNull();
        });

        it('returns null for Thursday (no service)', () => {
            const thursday = new Date(2025, 0, 9);
            expect(getMealServiceInfo(thursday)).toBeNull();
        });

        it('returns Monday schedule (8:00 - 9:00)', () => {
            const monday = new Date(2025, 0, 6);
            const service = getMealServiceInfo(monday);

            expect(service).not.toBeNull();
            expect(service?.startHour).toBe(8);
            expect(service?.startMinute).toBe(0);
            expect(service?.endHour).toBe(9);
            expect(service?.endMinute).toBe(0);
        });

        it('returns Wednesday schedule (8:00 - 9:00)', () => {
            const wednesday = new Date(2025, 0, 8);
            const service = getMealServiceInfo(wednesday);

            expect(service?.startHour).toBe(8);
            expect(service?.endHour).toBe(9);
        });

        it('returns Friday schedule (7:30 - 8:30)', () => {
            const friday = new Date(2025, 0, 10);
            const service = getMealServiceInfo(friday);

            expect(service?.startHour).toBe(7);
            expect(service?.startMinute).toBe(30);
            expect(service?.endHour).toBe(8);
            expect(service?.endMinute).toBe(30);
        });

        it('returns Saturday schedule (8:00 - 10:00)', () => {
            const saturday = new Date(2025, 0, 4);
            const service = getMealServiceInfo(saturday);

            expect(service?.startHour).toBe(8);
            expect(service?.endHour).toBe(10);
        });
    });

    describe('getSundayServiceName', () => {
        it('returns "Sunday Brunch"', () => {
            expect(getSundayServiceName()).toBe('Sunday Brunch');
        });
    });

    describe('isSundayBrunch', () => {
        it('returns true for Sunday', () => {
            const sunday = new Date(2025, 0, 5); // January 5, 2025 is a Sunday
            expect(isSundayBrunch(sunday)).toBe(true);
        });

        it('returns false for Monday', () => {
            const monday = new Date(2025, 0, 6);
            expect(isSundayBrunch(monday)).toBe(false);
        });

        it('returns false for Tuesday', () => {
            const tuesday = new Date(2025, 0, 7);
            expect(isSundayBrunch(tuesday)).toBe(false);
        });

        it('returns false for Wednesday', () => {
            const wednesday = new Date(2025, 0, 8);
            expect(isSundayBrunch(wednesday)).toBe(false);
        });

        it('returns false for Thursday', () => {
            const thursday = new Date(2025, 0, 9);
            expect(isSundayBrunch(thursday)).toBe(false);
        });

        it('returns false for Friday', () => {
            const friday = new Date(2025, 0, 10);
            expect(isSundayBrunch(friday)).toBe(false);
        });

        it('returns false for Saturday', () => {
            const saturday = new Date(2025, 0, 11);
            expect(isSundayBrunch(saturday)).toBe(false);
        });
    });

    describe('formatTime', () => {
        it('formats morning time correctly', () => {
            expect(formatTime(8, 0)).toBe('8:00 AM');
            expect(formatTime(8, 30)).toBe('8:30 AM');
        });

        it('formats afternoon time correctly', () => {
            expect(formatTime(13, 0)).toBe('1:00 PM');
            expect(formatTime(14, 30)).toBe('2:30 PM');
        });

        it('handles noon correctly', () => {
            expect(formatTime(12, 0)).toBe('12:00 PM');
        });

        it('handles midnight correctly', () => {
            expect(formatTime(0, 0)).toBe('12:00 AM');
        });

        it('pads minutes correctly', () => {
            expect(formatTime(9, 5)).toBe('9:05 AM');
        });
    });

    describe('formatTimeRemaining', () => {
        it('returns "less than a minute" for < 1 min', () => {
            expect(formatTimeRemaining(0.5)).toBe('less than a minute');
            expect(formatTimeRemaining(0)).toBe('less than a minute');
        });

        it('returns minutes only for < 60 min', () => {
            expect(formatTimeRemaining(30)).toBe('30 min');
            expect(formatTimeRemaining(45)).toBe('45 min');
        });

        it('returns hours only when minutes are 0', () => {
            expect(formatTimeRemaining(60)).toBe('1 hour');
            expect(formatTimeRemaining(120)).toBe('2 hours');
        });

        it('returns combined hours and minutes', () => {
            expect(formatTimeRemaining(90)).toBe('1h 30m');
            expect(formatTimeRemaining(150)).toBe('2h 30m');
        });
    });

    describe('getMealServiceStatus', () => {
        describe('Sunday Brunch service', () => {
            it('returns during-service for Sunday Brunch window', () => {
                const sunday = new Date(2025, 0, 5, 12, 0); // Sunday at noon
                const status = getMealServiceStatus(sunday);

                expect(status.type).toBe('during-service');
                expect(status.message).toContain('remaining');
            });

            it('returns before-service before Sunday Brunch start', () => {
                const sunday = new Date(2025, 0, 5, 9, 0); // Sunday at 9 AM
                const status = getMealServiceStatus(sunday);

                expect(status.type).toBe('before-service');
                expect(status.timeRemaining).toBe(60); // 60 minutes until 10:00
            });

            it('returns ended after Sunday Brunch ends', () => {
                const sunday = new Date(2025, 0, 5, 15, 0); // Sunday at 3 PM
                const status = getMealServiceStatus(sunday);

                expect(status.type).toBe('ended');
            });
        });

        describe('no-service days', () => {
            it('returns no-service for Tuesday', () => {
                const tuesday = new Date(2025, 0, 7, 9, 0);
                const status = getMealServiceStatus(tuesday);

                expect(status.type).toBe('no-service');
                expect(status.message).toBeNull();
            });

            it('returns no-service for Thursday', () => {
                const thursday = new Date(2025, 0, 9, 9, 0);
                const status = getMealServiceStatus(thursday);

                expect(status.type).toBe('no-service');
                expect(status.message).toBeNull();
            });
        });

        describe('before service', () => {
            it('returns before-service status before start time', () => {
                // Monday at 7:00 AM (before 8:00 start)
                const earlyMonday = new Date(2025, 0, 6, 7, 0);
                const status = getMealServiceStatus(earlyMonday);

                expect(status.type).toBe('before-service');
                expect(status.message).toContain('starts in');
                expect(status.timeRemaining).toBe(60); // 60 minutes until 8:00
            });
        });

        describe('during service', () => {
            it('returns during-service status within service window', () => {
                // Monday at 8:30 AM (during 8:00-9:00 service)
                const duringMonday = new Date(2025, 0, 6, 8, 30);
                const status = getMealServiceStatus(duringMonday);

                expect(status.type).toBe('during-service');
                expect(status.message).toContain('remaining');
                expect(status.timeRemaining).toBe(30); // 30 minutes until 9:00
            });

            it('includes elapsed time', () => {
                const duringMonday = new Date(2025, 0, 6, 8, 30);
                const status = getMealServiceStatus(duringMonday);

                expect(status.elapsed).toBe(30); // 30 minutes since 8:00
                expect(status.totalDuration).toBe(60); // 8:00 to 9:00
            });
        });

        describe('after service', () => {
            it('returns ended status after service window', () => {
                // Monday at 10:00 AM (after 9:00 end)
                const afterMonday = new Date(2025, 0, 6, 10, 0);
                const status = getMealServiceStatus(afterMonday);

                expect(status.type).toBe('ended');
                expect(status.message).toBe('Meal service ended for today');
            });
        });
    });
});
