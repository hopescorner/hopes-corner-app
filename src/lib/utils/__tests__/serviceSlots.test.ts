import { describe, it, expect } from 'vitest';
import { generateShowerSlots, generateLaundrySlots, formatSlotLabel } from '../serviceSlots';

describe('serviceSlots utilities', () => {
    describe('generateShowerSlots', () => {
        it('generates weekday slots starting at 07:30', () => {
            // Monday (day 1)
            const monday = new Date(2025, 0, 6); // January 6, 2025 is a Monday
            const slots = generateShowerSlots(monday);

            expect(slots[0]).toBe('07:30');
            expect(slots).toContain('08:00');
            expect(slots).toContain('12:00');
        });

        it('generates Saturday slots starting at 08:30', () => {
            const saturday = new Date(2025, 0, 4); // January 4, 2025 is a Saturday
            const slots = generateShowerSlots(saturday);

            expect(slots[0]).toBe('08:30');
            expect(slots).toContain('09:00');
            expect(slots).toContain('13:00');
        });

        it('returns 30-minute interval slots', () => {
            const monday = new Date(2025, 0, 6);
            const slots = generateShowerSlots(monday);

            // Check that consecutive slots are 30 minutes apart
            expect(slots[0]).toBe('07:30');
            expect(slots[1]).toBe('08:00');
            expect(slots[2]).toBe('08:30');
        });

        it('uses current date when no argument provided', () => {
            const slots = generateShowerSlots();
            expect(Array.isArray(slots)).toBe(true);
            expect(slots.length).toBeGreaterThan(0);
        });

        it('weekday slots do not go beyond 12:30', () => {
            const wednesday = new Date(2025, 0, 8); // Wednesday
            const slots = generateShowerSlots(wednesday);

            expect(slots).not.toContain('12:30');
            expect(slots[slots.length - 1]).toBe('12:00');
        });

        it('Saturday slots do not go beyond 13:30', () => {
            const saturday = new Date(2025, 0, 4);
            const slots = generateShowerSlots(saturday);

            expect(slots).not.toContain('13:30');
            expect(slots[slots.length - 1]).toBe('13:00');
        });
    });

    describe('generateLaundrySlots', () => {
        it('returns 10 slots for Monday', () => {
            const monday = new Date(2025, 0, 6);
            const slots = generateLaundrySlots(monday);

            expect(slots.length).toBe(10);
            expect(slots[0]).toBe('05:00 - 06:00');
            expect(slots[slots.length - 1]).toBe('09:30 - 11:45');
        });

        it('returns 10 slots for Wednesday', () => {
            const wednesday = new Date(2025, 0, 8);
            const slots = generateLaundrySlots(wednesday);

            expect(slots.length).toBe(10);
            expect(slots[0]).toBe('05:00 - 06:00');
            expect(slots[slots.length - 1]).toBe('09:30 - 11:45');
        });

        it('returns 5 slots for other weekdays', () => {
            const tuesday = new Date(2025, 0, 7);
            const slots = generateLaundrySlots(tuesday);

            expect(slots.length).toBe(5);
            expect(slots[0]).toBe('07:30 - 08:30');
            expect(slots[slots.length - 1]).toBe('09:30 - 11:45');
        });

        it('returns 5 slots for Saturday', () => {
            const saturday = new Date(2025, 0, 4);
            const slots = generateLaundrySlots(saturday);

            expect(slots.length).toBe(5);
            expect(slots[0]).toBe('08:30 - 10:00');
        });

        it('weekday slots have time ranges', () => {
            const wednesday = new Date(2025, 0, 8);
            const slots = generateLaundrySlots(wednesday);

            slots.forEach(slot => {
                expect(slot).toMatch(/^\d{2}:\d{2} - \d{2}:\d{2}$/);
            });
        });

        it('uses current date when no argument provided', () => {
            const slots = generateLaundrySlots();
            expect(Array.isArray(slots)).toBe(true);
            expect(slots.length).toBeGreaterThan(0);
        });
    });

    describe('formatSlotLabel', () => {
        it('handles empty input', () => {
            expect(formatSlotLabel('')).toBe('');
        });

        it('formats single time correctly', () => {
            const result = formatSlotLabel('08:30');
            expect(result).toContain('8');
            expect(result).toContain('30');
        });

        it('formats time range correctly', () => {
            const result = formatSlotLabel('08:30 - 10:00');
            expect(result).toContain('-');
        });

        it('handles afternoon times', () => {
            const result = formatSlotLabel('13:00');
            expect(result).toBeTruthy();
        });
    });
});
