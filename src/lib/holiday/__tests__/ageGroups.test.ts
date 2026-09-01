import { describe, it, expect } from 'vitest';
import {
    calculateAge,
    getHolidayAgeGroup,
    isTeen14Plus,
    calculateRecommendedCards,
    formatAgeGroupLabel,
} from '../ageGroups';

describe('Holiday ageGroups utilities', () => {
    describe('calculateAge', () => {
        it('returns 0 for empty or invalid birthdate', () => {
            expect(calculateAge('')).toBe(0);
            expect(calculateAge(undefined)).toBe(0);
            expect(calculateAge('invalid-date')).toBe(0);
        });

        it('calculates calendar age without UTC midnight date shift in Pacific Time', () => {
            // Reference: 2026-08-31
            const refDate = new Date(2026, 7, 31); // Month is 0-indexed (7 = August)
            
            // Birthday is tomorrow (2012-09-01) -> child is still 13 years old today, turns 14 tomorrow
            expect(calculateAge('2012-09-01', refDate)).toBe(13);
            
            // Birthday is today (2012-08-31) -> child turns 14 today
            expect(calculateAge('2012-08-31', refDate)).toBe(14);
            
            // Birthday was yesterday (2012-08-30) -> child is 14
            expect(calculateAge('2012-08-30', refDate)).toBe(14);
        });

        it('clamps age between 0 and 18', () => {
            expect(calculateAge('2050-01-01')).toBe(0);
            expect(calculateAge('1990-01-01')).toBe(18);
        });

    });

    describe('getHolidayAgeGroup', () => {
        it('assigns 0 and 1 to infant', () => {
            expect(getHolidayAgeGroup(0)).toBe('infant');
            expect(getHolidayAgeGroup(1)).toBe('infant');
        });

        it('assigns 2 through 4 to toddler', () => {
            expect(getHolidayAgeGroup(2)).toBe('toddler');
            expect(getHolidayAgeGroup(3)).toBe('toddler');
            expect(getHolidayAgeGroup(4)).toBe('toddler');
        });

        it('assigns 5 through 12 to child', () => {
            expect(getHolidayAgeGroup(5)).toBe('child');
            expect(getHolidayAgeGroup(8)).toBe('child');
            expect(getHolidayAgeGroup(12)).toBe('child');
        });

        it('assigns 13 to teen_13', () => {
            expect(getHolidayAgeGroup(13)).toBe('teen_13');
        });

        it('assigns 14 to teen_14', () => {
            expect(getHolidayAgeGroup(14)).toBe('teen_14');
        });

        it('assigns 15 to teen_15', () => {
            expect(getHolidayAgeGroup(15)).toBe('teen_15');
        });

        it('assigns 16 through 18 to teen_16_18', () => {
            expect(getHolidayAgeGroup(16)).toBe('teen_16_18');
            expect(getHolidayAgeGroup(17)).toBe('teen_16_18');
            expect(getHolidayAgeGroup(18)).toBe('teen_16_18');
        });
    });

    describe('isTeen14Plus', () => {
        it('returns true for ages 14 through 18', () => {
            expect(isTeen14Plus(14)).toBe(true);
            expect(isTeen14Plus(15)).toBe(true);
            expect(isTeen14Plus(16)).toBe(true);
            expect(isTeen14Plus(17)).toBe(true);
            expect(isTeen14Plus(18)).toBe(true);
        });

        it('returns false for ages under 14 or above 18', () => {
            expect(isTeen14Plus(0)).toBe(false);
            expect(isTeen14Plus(13)).toBe(false);
            expect(isTeen14Plus(19)).toBe(false);
        });
    });

    describe('calculateRecommendedCards', () => {
        it('returns 0 cards if no children', () => {
            expect(calculateRecommendedCards([])).toEqual({ groceryCards: 0, teenCards: 0 });
        });

        it('allocates 1 grocery card and 0 teen cards when no children are 14+', () => {
            const children = [{ age: 1 }, { age: 6 }, { age: 13 }];
            expect(calculateRecommendedCards(children)).toEqual({ groceryCards: 1, teenCards: 0 });
        });

        it('allocates 1 grocery card and counts children aged 14-18 for teen cards', () => {
            const children = [
                { age: 3 },
                { age: 14 },
                { age: 15 },
                { age: 17 },
            ];
            expect(calculateRecommendedCards(children)).toEqual({ groceryCards: 1, teenCards: 3 });
        });
    });

    describe('formatAgeGroupLabel', () => {
        it('formats all age group keys nicely', () => {
            expect(formatAgeGroupLabel('infant')).toBe('Infant (0-1)');
            expect(formatAgeGroupLabel('toddler')).toBe('Toddler (1-4)');
            expect(formatAgeGroupLabel('child')).toBe('Child (5-12)');
            expect(formatAgeGroupLabel('teen_13')).toBe('Teen (13)');
            expect(formatAgeGroupLabel('teen_14')).toBe('Teen (14)');
            expect(formatAgeGroupLabel('teen_15')).toBe('Teen (15)');
            expect(formatAgeGroupLabel('teen_16_18')).toBe('Teen (16-18)');
        });
    });

    describe('Holiday Constants and Slot Capacity Logic', () => {
        it('defines 15 20-minute time slots between 9am and 2pm', async () => {
            const { HOLIDAY_TIME_SLOTS } = await import('../constants');
            expect(HOLIDAY_TIME_SLOTS).toHaveLength(15);
            expect(HOLIDAY_TIME_SLOTS[0].id).toBe('09:00 AM - 09:20 AM');
            expect(HOLIDAY_TIME_SLOTS[14].id).toBe('01:40 PM - 02:00 PM');
        });

        it('getNextAvailableHolidaySlot finds the first slot under 16 parents', async () => {
            const { getNextAvailableHolidaySlot, HOLIDAY_TIME_SLOTS } = await import('../constants');
            
            // Empty
            expect(getNextAvailableHolidaySlot({})).toBe('09:00 AM - 09:20 AM');

            // Slot 1 full with 16
            const counts: Record<string, number> = {
                '09:00 AM - 09:20 AM': 16,
            };
            expect(getNextAvailableHolidaySlot(counts)).toBe('09:20 AM - 09:40 AM');

            // All slots full
            for (const slot of HOLIDAY_TIME_SLOTS) {
                counts[slot.id] = 16;
            }
            expect(getNextAvailableHolidaySlot(counts)).toBeNull();
        });
    });
});

