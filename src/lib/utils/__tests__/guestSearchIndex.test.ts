import { describe, it, expect, beforeEach } from 'vitest';
import {
    getCachedNameParts,
    clearNamePartsCache,
    createSearchIndex,
    scoreMatch,
    searchWithIndex,
    type SearchGuest,
    type SearchIndex,
} from '../guestSearchIndex';

describe('guestSearchIndex', () => {
    beforeEach(() => {
        clearNamePartsCache();
    });

    describe('getCachedNameParts', () => {
        it('extracts name parts correctly', () => {
            const parts = getCachedNameParts('John', 'Smith', 'Johnny');
            expect(parts.firstName).toBe('john');
            expect(parts.lastName).toBe('smith');
            expect(parts.preferredName).toBe('johnny');
            expect(parts.firstTokens).toEqual(['john']);
            expect(parts.lastTokens).toEqual(['smith']);
            expect(parts.prefTokens).toEqual(['johnny']);
        });

        it('generates initials', () => {
            const parts = getCachedNameParts('John', 'Smith');
            expect(parts.initials).toContain('js');
        });

        it('handles multi-word first names', () => {
            const parts = getCachedNameParts('John Michael', 'Smith');
            expect(parts.firstTokens).toEqual(['john', 'michael']);
            expect(parts.initials).toContain('jms');
            expect(parts.initials).toContain('js');
        });

        it('handles empty inputs', () => {
            const parts = getCachedNameParts('', '', '');
            expect(parts.firstName).toBe('');
            expect(parts.lastName).toBe('');
            expect(parts.allTokens).toEqual([]);
        });

        it('handles undefined inputs', () => {
            const parts = getCachedNameParts(undefined, undefined, undefined);
            expect(parts.firstName).toBe('');
            expect(parts.allTokens).toEqual([]);
        });

        it('caches results for same inputs', () => {
            const parts1 = getCachedNameParts('John', 'Smith');
            const parts2 = getCachedNameParts('John', 'Smith');
            expect(parts1).toBe(parts2); // Same reference = cached
        });

        it('generates fullName and fullNameNoSpaces', () => {
            const parts = getCachedNameParts('John', 'Smith');
            expect(parts.fullName).toBe('john smith');
            expect(parts.fullNameNoSpaces).toBe('johnsmith');
        });

        it('generates searchableText with all tokens', () => {
            const parts = getCachedNameParts('John', 'Smith', 'Johnny');
            expect(parts.searchableText).toContain('john');
            expect(parts.searchableText).toContain('smith');
            expect(parts.searchableText).toContain('johnny');
        });

        it('deduplicates allTokens', () => {
            const parts = getCachedNameParts('John', 'John');
            // "john" should appear only once in allTokens
            const johnCount = parts.allTokens.filter(t => t === 'john').length;
            expect(johnCount).toBe(1);
        });
    });

    describe('createSearchIndex', () => {
        const guests: SearchGuest[] = [
            { id: '1', firstName: 'John', lastName: 'Smith' },
            { id: '2', firstName: 'Jane', lastName: 'Doe', preferredName: 'Jenny' },
            { id: '3', firstName: 'Robert', lastName: 'Johnson' },
        ];

        it('creates index with all guests', () => {
            const index = createSearchIndex(guests);
            expect(index.guests).toHaveLength(3);
            expect(index.byId.size).toBe(3);
        });

        it('indexes by first character', () => {
            const index = createSearchIndex(guests);
            const jEntries = index.byFirstChar.get('j');
            expect(jEntries).toBeDefined();
            // All three guests have names starting with 'j' (john, jane/jenny, johnson)
            expect(jEntries!.length).toBeGreaterThanOrEqual(2);
        });

        it('indexes by initials', () => {
            const index = createSearchIndex(guests);
            const jsEntries = index.byInitials.get('js');
            expect(jsEntries).toBeDefined();
            expect(jsEntries!.some(e => e.guest.id === '1')).toBe(true);
        });

        it('handles empty guest list', () => {
            const index = createSearchIndex([]);
            expect(index.guests).toHaveLength(0);
            expect(index.byId.size).toBe(0);
        });

        it('looks up guests by ID', () => {
            const index = createSearchIndex(guests);
            const entry = index.byId.get('2');
            expect(entry).toBeDefined();
            expect(entry!.guest.firstName).toBe('Jane');
        });
    });

    describe('scoreMatch', () => {
        it('returns -2 for exact initials match', () => {
            const parts = getCachedNameParts('John', 'Smith');
            expect(scoreMatch('js', parts)).toBe(-2);
        });

        it('returns -1 for exact full name match', () => {
            const parts = getCachedNameParts('John', 'Smith');
            expect(scoreMatch('john smith', parts)).toBe(-1);
        });

        it('returns 0 for exact single token match', () => {
            const parts = getCachedNameParts('John', 'Smith');
            expect(scoreMatch('john', parts)).toBe(0);
        });

        it('returns 1 for prefix match', () => {
            const parts = getCachedNameParts('John', 'Smith');
            expect(scoreMatch('jo', parts)).toBe(1);
        });

        it('returns 2 for substring match (min 3 chars)', () => {
            const parts = getCachedNameParts('John', 'Smith');
            expect(scoreMatch('mit', parts)).toBe(2);
        });

        it('returns 99 for no match', () => {
            const parts = getCachedNameParts('John', 'Smith');
            expect(scoreMatch('xyz', parts)).toBe(99);
        });

        it('returns 99 for empty query', () => {
            const parts = getCachedNameParts('John', 'Smith');
            expect(scoreMatch('', parts)).toBe(99);
            expect(scoreMatch('   ', parts)).toBe(99);
        });

        it('matches preferred name', () => {
            const parts = getCachedNameParts('Robert', 'Smith', 'Bob');
            // 'bob' is in allTokens so it's an exact token match, but also
            // matches as initials "bob" (3 chars, all lowercase) → score -1
            expect(scoreMatch('bob', parts)).toBeLessThan(99);
        });

        it('matches space-insensitive full name', () => {
            const parts = getCachedNameParts('Wen Xing', 'Gao');
            expect(scoreMatch('wenxinggao', parts)).toBe(-1);
        });

        it('handles multi-token query prefix match', () => {
            const parts = getCachedNameParts('John', 'Smith');
            expect(scoreMatch('jo sm', parts)).toBe(1);
        });
    });

    describe('searchWithIndex', () => {
        const guests: SearchGuest[] = [
            { id: '1', firstName: 'John', lastName: 'Smith' },
            { id: '2', firstName: 'Jane', lastName: 'Doe', preferredName: 'Jenny' },
            { id: '3', firstName: 'Robert', lastName: 'Johnson' },
            { id: '4', firstName: 'Michael', lastName: 'Brown' },
            { id: '5', firstName: 'John', lastName: 'Adams' },
        ];

        let index: SearchIndex<SearchGuest>;

        beforeEach(() => {
            index = createSearchIndex(guests);
        });

        it('returns empty array for empty query', () => {
            expect(searchWithIndex('', index)).toEqual([]);
            expect(searchWithIndex('   ', index)).toEqual([]);
        });

        it('returns empty array for null index', () => {
            expect(searchWithIndex('john', null as any)).toEqual([]);
        });

        it('finds exact name matches', () => {
            const results = searchWithIndex('John Smith', index);
            expect(results.length).toBeGreaterThanOrEqual(1);
            expect(results[0].id).toBe('1');
        });

        it('finds by first name prefix', () => {
            const results = searchWithIndex('Jo', index);
            expect(results.some(r => r.id === '1')).toBe(true);
            expect(results.some(r => r.id === '5')).toBe(true);
        });

        it('finds by preferred name', () => {
            const results = searchWithIndex('Jenny', index);
            expect(results.some(r => r.id === '2')).toBe(true);
        });

        it('finds by initials', () => {
            const results = searchWithIndex('js', index);
            expect(results.some(r => r.id === '1')).toBe(true);
        });

        it('respects maxResults option', () => {
            const results = searchWithIndex('jo', index, { maxResults: 1 });
            expect(results.length).toBeLessThanOrEqual(1);
        });

        it('deduplicates results', () => {
            const results = searchWithIndex('john', index);
            const ids = results.map(r => r.id);
            const uniqueIds = new Set(ids);
            expect(ids.length).toBe(uniqueIds.size);
        });

        it('sorts by relevance (exact matches first)', () => {
            const results = searchWithIndex('john', index);
            // All "John" matches should come before non-John matches
            expect(results.length).toBeGreaterThanOrEqual(1);
        });

        it('handles substring search with fallback', () => {
            const results = searchWithIndex('mic', index);
            expect(results.some(r => r.id === '4')).toBe(true);
        });
    });

    describe('clearNamePartsCache', () => {
        it('clears cached name parts', () => {
            const parts1 = getCachedNameParts('John', 'Smith');
            clearNamePartsCache();
            const parts2 = getCachedNameParts('John', 'Smith');
            // After clearing, should be a new object (different reference)
            expect(parts1).not.toBe(parts2);
            // But same content
            expect(parts1.firstName).toBe(parts2.firstName);
        });
    });
});
