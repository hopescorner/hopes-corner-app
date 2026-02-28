import { describe, it, expect } from 'vitest';
import { findPotentialDuplicates } from '../duplicateDetection';

describe('duplicateDetection', () => {
    const makeGuest = (id: string, firstName: string, lastName: string, preferredName?: string) => ({
        id,
        firstName,
        lastName,
        preferredName,
    });

    describe('findPotentialDuplicates', () => {
        it('returns empty array for empty inputs', () => {
            expect(findPotentialDuplicates('', 'Smith', [])).toEqual([]);
            expect(findPotentialDuplicates('John', '', [])).toEqual([]);
            expect(findPotentialDuplicates('John', 'Smith', [])).toEqual([]);
        });

        it('detects exact name match with confidence 1.0', () => {
            const guests = [makeGuest('1', 'John', 'Smith')];
            const results = findPotentialDuplicates('John', 'Smith', guests);
            expect(results).toHaveLength(1);
            expect(results[0].reason).toBe('Exact name match');
            expect(results[0].confidence).toBe(1.0);
        });

        it('exact match is case insensitive', () => {
            const guests = [makeGuest('1', 'JOHN', 'SMITH')];
            const results = findPotentialDuplicates('john', 'smith', guests);
            expect(results).toHaveLength(1);
            expect(results[0].reason).toBe('Exact name match');
        });

        it('detects preferred name match', () => {
            const guests = [makeGuest('1', 'Robert', 'Smith', 'Bob')];
            const results = findPotentialDuplicates('Bob', 'Smith', guests);
            expect(results).toHaveLength(1);
            expect(results[0].reason).toBe('Matches preferred name');
            expect(results[0].confidence).toBe(0.95);
        });

        it('detects nickname variants', () => {
            const guests = [makeGuest('1', 'William', 'Brown')];
            const results = findPotentialDuplicates('Bill', 'Brown', guests);
            expect(results.length).toBeGreaterThanOrEqual(1);
            const match = results.find(r => r.guest.id === '1');
            expect(match).toBeDefined();
            expect(match!.reason).toContain('Nickname match');
        });

        it('detects typo in first name with same last name', () => {
            const guests = [makeGuest('1', 'Michael', 'Johnson')];
            const results = findPotentialDuplicates('Micheal', 'Johnson', guests);
            expect(results.length).toBeGreaterThanOrEqual(1);
            const match = results.find(r => r.guest.id === '1');
            expect(match).toBeDefined();
        });

        it('skips guests with very different last names', () => {
            const guests = [makeGuest('1', 'John', 'Anderson')];
            const results = findPotentialDuplicates('John', 'Smith', guests);
            expect(results).toHaveLength(0);
        });

        it('sorts results by confidence descending', () => {
            const guests = [
                makeGuest('1', 'John', 'Smith'),  // exact match
                makeGuest('2', 'Jon', 'Smith'),    // similar name
            ];
            const results = findPotentialDuplicates('John', 'Smith', guests);
            expect(results.length).toBeGreaterThanOrEqual(1);
            for (let i = 1; i < results.length; i++) {
                expect(results[i - 1].confidence).toBeGreaterThanOrEqual(results[i].confidence);
            }
        });

        it('handles guests with missing name fields', () => {
            const guests = [
                { id: '1', firstName: undefined, lastName: undefined } as any,
            ];
            const results = findPotentialDuplicates('John', 'Smith', guests);
            expect(results).toHaveLength(0);
        });

        it('trims whitespace from names', () => {
            const guests = [makeGuest('1', '  John  ', '  Smith  ')];
            const results = findPotentialDuplicates('John', 'Smith', guests);
            expect(results).toHaveLength(1);
            expect(results[0].reason).toBe('Exact name match');
        });

        it('does not match completely different names', () => {
            const guests = [
                makeGuest('1', 'Alice', 'Williams'),
                makeGuest('2', 'Carlos', 'Garcia'),
            ];
            const results = findPotentialDuplicates('John', 'Smith', guests);
            expect(results).toHaveLength(0);
        });

        it('detects phonetically similar names with same last name', () => {
            const guests = [makeGuest('1', 'Philip', 'Jones')];
            const results = findPotentialDuplicates('Filip', 'Jones', guests);
            expect(results.length).toBeGreaterThanOrEqual(1);
        });

        it('handles multiple potential duplicates', () => {
            const guests = [
                makeGuest('1', 'John', 'Smith'),
                makeGuest('2', 'Jon', 'Smith'),
                makeGuest('3', 'Johnny', 'Smith'),
            ];
            const results = findPotentialDuplicates('John', 'Smith', guests);
            expect(results.length).toBeGreaterThanOrEqual(2);
        });
    });
});
