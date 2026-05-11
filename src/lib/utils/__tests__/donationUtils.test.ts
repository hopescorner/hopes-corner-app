import { describe, it, expect } from 'vitest';
import { calculateDonationLineItemValue, calculateDonationValue, calculateServings, deriveDonationDateKey, formatProteinAndCarbsClipboardText, DENSITY_SERVINGS, MINIMAL_TYPES } from '../donationUtils';

describe('donationUtils', () => {
    describe('calculateDonationValue', () => {
        it('calculates donation dollar value from valid positive weights only', () => {
            const records = [
                { weightLbs: 10 },
                { weight_lbs: '5.5' },
                { weightLbs: 0 },
                { weightLbs: null },
                { weightLbs: undefined },
                { weightLbs: 'not-a-number' },
            ];

            expect(calculateDonationValue(records)).toBeCloseTo(30.535);
        });
    });

    describe('calculateDonationLineItemValue', () => {
        it('returns the estimated value for a valid weighted donation', () => {
            expect(calculateDonationLineItemValue({ weightLbs: 12.5 })).toBeCloseTo(24.625);
        });

        it('returns null when a donation does not have a positive usable weight', () => {
            expect(calculateDonationLineItemValue({ weightLbs: 0 })).toBeNull();
            expect(calculateDonationLineItemValue({ weightLbs: null })).toBeNull();
            expect(calculateDonationLineItemValue({})).toBeNull();
        });
    });

    describe('DENSITY_SERVINGS constant', () => {
        it('has correct values for all densities', () => {
            expect(DENSITY_SERVINGS.light).toBe(10);
            expect(DENSITY_SERVINGS.medium).toBe(20);
            expect(DENSITY_SERVINGS.high).toBe(30);
        });
    });

    describe('MINIMAL_TYPES constant', () => {
        it('includes School Lunch, Pastries, and Deli Foods', () => {
            expect(MINIMAL_TYPES.has('School Lunch')).toBe(true);
            expect(MINIMAL_TYPES.has('Pastries')).toBe(true);
            expect(MINIMAL_TYPES.has('Deli Foods')).toBe(true);
        });

        it('does not include other donation types', () => {
            expect(MINIMAL_TYPES.has('Protein')).toBe(false);
            expect(MINIMAL_TYPES.has('Carbs')).toBe(false);
            expect(MINIMAL_TYPES.has('Veggie Protein')).toBe(false);
        });
    });

    describe('calculateServings', () => {
        it('calculates servings based on trays and density', () => {
            expect(calculateServings('Protein', 0, 2, 'light')).toBe(20);
            expect(calculateServings('Protein', 0, 2, 'medium')).toBe(40);
            expect(calculateServings('Protein', 0, 2, 'high')).toBe(60);
            expect(calculateServings('Protein', 0, 2, 'unknown')).toBe(40); // default to medium
            expect(calculateServings('Protein', 0, 2)).toBe(40); // default to medium
        });

        it('calculates servings based on weight for Carbs', () => {
            expect(calculateServings('Carbs', 10)).toBe(40);
            expect(calculateServings('Carbs', '10')).toBe(40);
        });

        it('calculates servings based on weight for Protein/Veggie Protein', () => {
            expect(calculateServings('Protein', 10)).toBe(50);
            expect(calculateServings('Veggie Protein', 10)).toBe(50);
        });

        it('returns weight as servings for other types', () => {
            expect(calculateServings('Other', 10)).toBe(10);
        });

        it('handles missing or invalid inputs', () => {
            expect(calculateServings('Protein', null)).toBe(0);
            expect(calculateServings('Protein', undefined)).toBe(0);
            expect(calculateServings('Protein', 0, null)).toBe(0);
        });

        it('prioritizes trays over weight when both are provided', () => {
            // With trays=3 and medium density: 3 * 20 = 60
            expect(calculateServings('Protein', 10, 3, 'medium')).toBe(60);
        });

        it('falls back to weight calculation when trays is 0', () => {
            expect(calculateServings('Protein', 10, 0, 'medium')).toBe(50);
        });

        it('handles School Lunch donation type as Other', () => {
            expect(calculateServings('School Lunch', 15)).toBe(15);
        });

        it('handles Pastries donation type as Other', () => {
            expect(calculateServings('Pastries', 8)).toBe(8);
        });

        it('handles Deli Foods donation type as Other', () => {
            expect(calculateServings('Deli Foods', 12)).toBe(12);
        });

        it('handles string weight values', () => {
            expect(calculateServings('Protein', '5')).toBe(25);
            expect(calculateServings('Carbs', '7.5')).toBe(30);
        });

        it('handles fractional trays', () => {
            expect(calculateServings('Protein', 0, 1.5, 'medium')).toBe(30);
        });
    });

    describe('deriveDonationDateKey', () => {
        it('returns dateKey if present', () => {
            expect(deriveDonationDateKey({ dateKey: '2023-01-01' })).toBe('2023-01-01');
        });

        it('returns date if it matches YYYY-MM-DD', () => {
            expect(deriveDonationDateKey({ date: '2023-01-01' })).toBe('2023-01-01');
        });

        it('parses various date candidates', () => {
            expect(deriveDonationDateKey({ donatedAt: '2023-01-02' })).toBe('2023-01-02');
            expect(deriveDonationDateKey({ donated_at: '2023-01-03' })).toBe('2023-01-03');
            expect(deriveDonationDateKey({ createdAt: '2023-01-04' })).toBe('2023-01-04');
            expect(deriveDonationDateKey({ created_at: '2023-01-05' })).toBe('2023-01-05');
            expect(deriveDonationDateKey({ receivedAt: '2023-01-06' })).toBe('2023-01-06');
            expect(deriveDonationDateKey({ received_at: '2023-01-07' })).toBe('2023-01-07');
        });

        it('handles Date objects', () => {
            const date = new Date(2023, 0, 10); // Jan 10
            // We expect en-CA format YYYY-MM-DD
            expect(deriveDonationDateKey({ date })).toBe('2023-01-10');
        });

        it('handles timestamps', () => {
            const ts = new Date(2023, 0, 11).getTime();
            expect(deriveDonationDateKey({ date: ts })).toBe('2023-01-11');
        });

        it('returns null for invalid inputs', () => {
            expect(deriveDonationDateKey(null)).toBeNull();
            expect(deriveDonationDateKey({})).toBeNull();
            expect(deriveDonationDateKey({ date: 'invalid' })).toBeNull();
        });

        it('handles candidate with non-YYYY-MM-DD string', () => {
            expect(deriveDonationDateKey({ donatedAt: 'Jan 12 2023' })).toBe('2023-01-12');
        });

        it('prioritizes dateKey over other properties', () => {
            expect(deriveDonationDateKey({ 
                dateKey: '2023-06-15', 
                date: '2023-06-10',
                created_at: '2023-06-05'
            })).toBe('2023-06-15');
        });

        it('handles ISO date strings with time component', () => {
            const result = deriveDonationDateKey({ date: '2023-03-15T10:30:00Z' });
            expect(result).toBe('2023-03-15');
        });
    });

    describe('formatProteinAndCarbsClipboardText', () => {
        it('formats consolidated activity correctly', () => {
            const activity = [
                { type: 'Protein', itemName: 'Chicken', trays: 2, servings: 40 },
                { type: 'Carbs', itemName: 'Rice', trays: 1, servings: 20 },
                { type: 'Veggie Protein', itemName: 'Tofu', trays: 1, servings: 25 },
                { type: 'Dairy', itemName: 'Milk', trays: 0, servings: 0 }, // Should be ignored
            ];
            const text = formatProteinAndCarbsClipboardText(activity);
            expect(text).toContain('Donations');
            expect(text).toContain('Protein');
            expect(text).toContain('Chicken: 2 trays, 40 servings');
            expect(text).toContain('Rice: 1 tray, 20 servings');
            expect(text).toContain('Tofu: 1 tray, 25 servings');
        });

        it('handles empty activity', () => {
            const text = formatProteinAndCarbsClipboardText([]);
            expect(text).toContain('None');
        });

        it('handles null/undefined activity', () => {
            const text = formatProteinAndCarbsClipboardText(undefined as any);
            expect(text).toContain('None');
        });

        it('sorts items by servings desc then name', () => {
            const activity = [
                { type: 'Protein', itemName: 'Beef', trays: 1, servings: 30 },
                { type: 'Protein', itemName: 'Chicken', trays: 2, servings: 40 },
                { type: 'Protein', itemName: 'Aardvark', trays: 1, servings: 30 },
            ];
            const text = formatProteinAndCarbsClipboardText(activity);
            const chickenIndex = text.indexOf('Chicken');
            const aardvarkIndex = text.indexOf('Aardvark');
            const beefIndex = text.indexOf('Beef');

            expect(chickenIndex).toBeLessThan(aardvarkIndex);
            expect(aardvarkIndex).toBeLessThan(beefIndex);
        });

        it('includes all three types in output', () => {
            const activity = [
                { type: 'Protein', itemName: 'Chicken', trays: 1, servings: 20 },
            ];
            const text = formatProteinAndCarbsClipboardText(activity);
            expect(text).toContain('Protein');
            expect(text).toContain('Veggie Protein');
            expect(text).toContain('Carbs');
        });

        it('shows None for empty type categories', () => {
            const activity = [
                { type: 'Protein', itemName: 'Chicken', trays: 1, servings: 20 },
            ];
            const text = formatProteinAndCarbsClipboardText(activity);
            // Veggie Protein and Carbs should show None
            const lines = text.split('\n');
            const veggieIdx = lines.indexOf('Veggie Protein');
            const carbsIdx = lines.indexOf('Carbs');
            expect(lines[veggieIdx + 1]).toBe('None');
            expect(lines[carbsIdx + 1]).toBe('None');
        });

        it('handles singular tray correctly', () => {
            const activity = [
                { type: 'Protein', itemName: 'Fish', trays: 1, servings: 15 },
            ];
            const text = formatProteinAndCarbsClipboardText(activity);
            expect(text).toContain('1 tray,');
        });

        it('handles plural trays correctly', () => {
            const activity = [
                { type: 'Protein', itemName: 'Fish', trays: 3, servings: 45 },
            ];
            const text = formatProteinAndCarbsClipboardText(activity);
            expect(text).toContain('3 trays,');
        });

        it('handles singular serving correctly', () => {
            const activity = [
                { type: 'Protein', itemName: 'Sample', trays: 0, servings: 1 },
            ];
            const text = formatProteinAndCarbsClipboardText(activity);
            expect(text).toContain('1 serving');
        });

        it('handles plural servings correctly', () => {
            const activity = [
                { type: 'Protein', itemName: 'Sample', trays: 0, servings: 10 },
            ];
            const text = formatProteinAndCarbsClipboardText(activity);
            expect(text).toContain('10 servings');
        });

        it('handles zero trays and zero servings', () => {
            const activity = [
                { type: 'Protein', itemName: 'Empty', trays: 0, servings: 0 },
            ];
            const text = formatProteinAndCarbsClipboardText(activity);
            expect(text).toContain('Empty: 0 trays, 0 servings');
        });

        it('excludes non-protein/carbs types', () => {
            const activity = [
                { type: 'School Lunch', itemName: 'Packed Lunch', trays: 5, servings: 50 },
                { type: 'Pastries', itemName: 'Donuts', trays: 2, servings: 20 },
                { type: 'Deli Foods', itemName: 'Sandwiches', trays: 3, servings: 30 },
            ];
            const text = formatProteinAndCarbsClipboardText(activity);
            expect(text).not.toContain('Packed Lunch');
            expect(text).not.toContain('Donuts');
            expect(text).not.toContain('Sandwiches');
        });

        it('handles multiple items of same type', () => {
            const activity = [
                { type: 'Carbs', itemName: 'Rice', trays: 2, servings: 40 },
                { type: 'Carbs', itemName: 'Bread', trays: 1, servings: 20 },
                { type: 'Carbs', itemName: 'Pasta', trays: 3, servings: 60 },
            ];
            const text = formatProteinAndCarbsClipboardText(activity);
            expect(text).toContain('Rice');
            expect(text).toContain('Bread');
            expect(text).toContain('Pasta');
            // Verify sorting: Pasta (60) > Rice (40) > Bread (20)
            const pastaIdx = text.indexOf('Pasta');
            const riceIdx = text.indexOf('Rice');
            const breadIdx = text.indexOf('Bread');
            expect(pastaIdx).toBeLessThan(riceIdx);
            expect(riceIdx).toBeLessThan(breadIdx);
        });

        it('handles missing servings gracefully', () => {
            const activity = [
                { type: 'Protein', itemName: 'Test', trays: 1 },
            ];
            const text = formatProteinAndCarbsClipboardText(activity);
            expect(text).toContain('Test: 1 tray, 0 servings');
        });

        it('handles missing trays gracefully', () => {
            const activity = [
                { type: 'Protein', itemName: 'Test', servings: 25 },
            ];
            const text = formatProteinAndCarbsClipboardText(activity);
            expect(text).toContain('Test: 0 trays, 25 servings');
        });
    });
});
