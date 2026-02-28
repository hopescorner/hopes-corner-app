import { describe, it, expect } from 'vitest';
import {
    levenshteinDistance,
    similarityScore,
    hasMatchingFirstChars,
    soundsLike,
    areNicknameVariants,
    getNicknameVariants,
    isKeyboardAdjacent,
    hasKeyboardTypo,
    hasTranspositionTypo,
    findFuzzySuggestions,
    formatSuggestionDisplay,
    COMMON_NICKNAMES,
} from '../fuzzyMatch';

describe('fuzzyMatch', () => {
    describe('levenshteinDistance', () => {
        it('returns 0 for identical strings', () => {
            expect(levenshteinDistance('hello', 'hello')).toBe(0);
        });

        it('returns length of other string when one is empty', () => {
            expect(levenshteinDistance('', 'hello')).toBe(5);
            expect(levenshteinDistance('hello', '')).toBe(5);
        });

        it('returns max length when both are empty', () => {
            expect(levenshteinDistance('', '')).toBe(0);
        });

        it('handles null/undefined inputs', () => {
            expect(levenshteinDistance(null as unknown as string, 'hello')).toBe(5);
            expect(levenshteinDistance('hello', undefined as unknown as string)).toBe(5);
        });

        it('calculates single character difference', () => {
            expect(levenshteinDistance('cat', 'bat')).toBe(1);
        });

        it('calculates insertion distance', () => {
            expect(levenshteinDistance('cat', 'cats')).toBe(1);
        });

        it('calculates deletion distance', () => {
            expect(levenshteinDistance('cats', 'cat')).toBe(1);
        });

        it('is case insensitive', () => {
            expect(levenshteinDistance('John', 'john')).toBe(0);
        });

        it('calculates multi-edit distance', () => {
            expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
        });

        it('supports maxDistance early termination', () => {
            const result = levenshteinDistance('abc', 'xyz', 1);
            expect(result).toBeGreaterThan(1);
        });

        it('returns exact distance when within maxDistance', () => {
            expect(levenshteinDistance('cat', 'bat', 2)).toBe(1);
        });
    });

    describe('similarityScore', () => {
        it('returns 1 for identical strings', () => {
            expect(similarityScore('hello', 'hello')).toBe(1);
        });

        it('returns 0 for empty inputs', () => {
            expect(similarityScore('', 'hello')).toBe(0);
            expect(similarityScore('hello', '')).toBe(0);
        });

        it('returns high score for similar strings', () => {
            expect(similarityScore('michael', 'micheal')).toBeGreaterThan(0.7);
        });

        it('returns low score for dissimilar strings', () => {
            expect(similarityScore('abc', 'xyz')).toBeLessThan(0.5);
        });

        it('respects minSimilarity threshold', () => {
            // Very different strings should return 0 with a high threshold
            expect(similarityScore('abc', 'xyz', 0.9)).toBe(0);
        });
    });

    describe('hasMatchingFirstChars', () => {
        it('returns true when first characters match', () => {
            expect(hasMatchingFirstChars('John', 'James')).toBe(true);
        });

        it('returns true for common first-letter swaps', () => {
            // "Jhon" vs "John" - first 2 chars sorted are the same (hj vs jh)
            expect(hasMatchingFirstChars('Jhon', 'John')).toBe(true);
        });

        it('returns false for different first characters', () => {
            expect(hasMatchingFirstChars('Alice', 'Bob')).toBe(false);
        });

        it('returns false for empty strings', () => {
            expect(hasMatchingFirstChars('', 'John')).toBe(false);
            expect(hasMatchingFirstChars('John', '')).toBe(false);
        });

        it('returns false for single character strings', () => {
            expect(hasMatchingFirstChars('J', 'John')).toBe(false);
        });
    });

    describe('areNicknameVariants', () => {
        it('matches William and Bill', () => {
            expect(areNicknameVariants('William', 'Bill')).toBe(true);
        });

        it('matches Bill and Billy', () => {
            expect(areNicknameVariants('Bill', 'Billy')).toBe(true);
        });

        it('matches Robert and Bob', () => {
            expect(areNicknameVariants('Robert', 'Bob')).toBe(true);
        });

        it('matches Elizabeth and Liz', () => {
            expect(areNicknameVariants('Elizabeth', 'Liz')).toBe(true);
        });

        it('matches same name to itself', () => {
            expect(areNicknameVariants('John', 'John')).toBe(true);
        });

        it('returns false for unrelated names', () => {
            expect(areNicknameVariants('John', 'Alice')).toBe(false);
        });

        it('returns false for empty inputs', () => {
            expect(areNicknameVariants('', 'John')).toBe(false);
            expect(areNicknameVariants('John', '')).toBe(false);
        });

        it('matches Spanish nickname variants', () => {
            expect(areNicknameVariants('Jose', 'Pepe')).toBe(true);
            expect(areNicknameVariants('Guadalupe', 'Lupe')).toBe(true);
            expect(areNicknameVariants('Eduardo', 'Lalo')).toBe(true);
        });
    });

    describe('getNicknameVariants', () => {
        it('returns variants for a formal name', () => {
            const variants = getNicknameVariants('william');
            expect(variants).toContain('william');
            expect(variants).toContain('bill');
            expect(variants).toContain('will');
        });

        it('returns variants when given a nickname', () => {
            const variants = getNicknameVariants('bob');
            expect(variants).toContain('robert');
            expect(variants).toContain('bob');
        });

        it('returns just the name if no known variants', () => {
            const variants = getNicknameVariants('xyzunknown');
            expect(variants).toEqual(['xyzunknown']);
        });

        it('returns empty array for empty input', () => {
            expect(getNicknameVariants('')).toEqual([]);
        });
    });

    describe('isKeyboardAdjacent', () => {
        it('returns true for adjacent keys', () => {
            expect(isKeyboardAdjacent('q', 'w')).toBe(true);
            expect(isKeyboardAdjacent('f', 'g')).toBe(true);
        });

        it('returns false for non-adjacent keys', () => {
            expect(isKeyboardAdjacent('q', 'p')).toBe(false);
        });

        it('returns false for empty inputs', () => {
            expect(isKeyboardAdjacent('', 'a')).toBe(false);
        });

        it('is case insensitive', () => {
            expect(isKeyboardAdjacent('Q', 'w')).toBe(true);
        });
    });

    describe('hasKeyboardTypo', () => {
        it('detects single adjacent key substitution', () => {
            // 'r' and 't' are adjacent on QWERTY, so cat→car is a keyboard typo
            expect(hasKeyboardTypo('cat', 'car')).toBe(true);
            // 't' and 'y' are adjacent on QWERTY, so cat→cay is a keyboard typo
            expect(hasKeyboardTypo('cat', 'cay')).toBe(true);
        });

        it('returns false for different length strings', () => {
            expect(hasKeyboardTypo('cat', 'cats')).toBe(false);
        });

        it('returns false for identical strings', () => {
            expect(hasKeyboardTypo('cat', 'cat')).toBe(false);
        });

        it('returns false for multiple differences', () => {
            expect(hasKeyboardTypo('abc', 'xyz')).toBe(false);
        });

        it('returns false for empty inputs', () => {
            expect(hasKeyboardTypo('', 'cat')).toBe(false);
        });
    });

    describe('hasTranspositionTypo', () => {
        it('detects adjacent character transposition', () => {
            expect(hasTranspositionTypo('teh', 'the')).toBe(true);
            expect(hasTranspositionTypo('micheal', 'michael')).toBe(true);
        });

        it('returns false for identical strings', () => {
            expect(hasTranspositionTypo('the', 'the')).toBe(false);
        });

        it('returns false for different length strings', () => {
            expect(hasTranspositionTypo('the', 'them')).toBe(false);
        });

        it('returns false for single character strings', () => {
            expect(hasTranspositionTypo('a', 'b')).toBe(false);
        });

        it('returns false for non-adjacent transposition', () => {
            // "abc" vs "cba" - differs in positions 0 and 2 (not adjacent)
            expect(hasTranspositionTypo('abc', 'cba')).toBe(false);
        });

        it('returns false for empty inputs', () => {
            expect(hasTranspositionTypo('', 'the')).toBe(false);
        });
    });

    describe('soundsLike', () => {
        it('matches phonetically similar English names', () => {
            expect(soundsLike('Philip', 'Filip')).toBe(true);
        });

        it('returns false for phonetically different names', () => {
            expect(soundsLike('John', 'Mary')).toBe(false);
        });

        it('returns false for empty inputs', () => {
            expect(soundsLike('', 'John')).toBe(false);
        });

        it('returns true for identical names', () => {
            expect(soundsLike('John', 'John')).toBe(true);
        });

        it('returns false for very short names that are different', () => {
            expect(soundsLike('Jo', 'Ma')).toBe(false);
        });
    });

    describe('findFuzzySuggestions', () => {
        const guests = [
            { id: '1', firstName: 'Michael', lastName: 'Smith' },
            { id: '2', firstName: 'John', lastName: 'Doe' },
            { id: '3', firstName: 'Robert', lastName: 'Johnson' },
            { id: '4', firstName: 'William', lastName: 'Brown' },
            { id: '5', firstName: 'Maria', lastName: 'Garcia' },
        ];

        it('returns empty array for empty search', () => {
            expect(findFuzzySuggestions('', guests)).toEqual([]);
        });

        it('returns empty array for empty guest list', () => {
            expect(findFuzzySuggestions('John', [])).toEqual([]);
        });

        it('finds nickname matches', () => {
            const results = findFuzzySuggestions('Bob', guests);
            const bobMatch = results.find(r => r.id === '3');
            expect(bobMatch).toBeDefined();
        });

        it('finds typo matches', () => {
            const results = findFuzzySuggestions('Micheal', guests);
            const match = results.find(r => r.id === '1');
            expect(match).toBeDefined();
        });

        it('limits results to maxSuggestions', () => {
            const manyGuests = Array.from({ length: 50 }, (_, i) => ({
                id: String(i),
                firstName: `John${i}`,
                lastName: 'Smith',
            }));
            const results = findFuzzySuggestions('John', manyGuests, 3);
            expect(results.length).toBeLessThanOrEqual(3);
        });

        it('includes suggestion metadata', () => {
            const results = findFuzzySuggestions('Bob', guests);
            if (results.length > 0) {
                expect(results[0]).toHaveProperty('_suggestionScore');
                expect(results[0]).toHaveProperty('_matchType');
            }
        });

        it('sorts by relevance (higher score first)', () => {
            const results = findFuzzySuggestions('Bob Johnson', guests);
            for (let i = 1; i < results.length; i++) {
                expect(results[i - 1]._suggestionScore).toBeGreaterThanOrEqual(results[i]._suggestionScore);
            }
        });
    });

    describe('formatSuggestionDisplay', () => {
        it('formats display with preferred name', () => {
            const result = formatSuggestionDisplay({
                id: '1',
                firstName: 'Robert',
                lastName: 'Smith',
                preferredName: 'Bob',
                _suggestionScore: 0.9,
                _matchType: 'nickname',
            });
            expect(result.displayName).toBe('Bob (Robert Smith)');
            expect(result.fullName).toBe('Robert Smith');
            expect(result.preferredName).toBe('Bob');
        });

        it('formats display without preferred name', () => {
            const result = formatSuggestionDisplay({
                id: '1',
                firstName: 'John',
                lastName: 'Doe',
                _suggestionScore: 0.8,
                _matchType: 'fuzzy',
            });
            expect(result.displayName).toBe('John Doe');
        });

        it('includes score and match type', () => {
            const result = formatSuggestionDisplay({
                id: '1',
                firstName: 'John',
                lastName: 'Doe',
                _suggestionScore: 0.85,
                _matchType: 'typo',
            });
            expect(result.score).toBe(0.85);
            expect(result.matchType).toBe('typo');
        });
    });

    describe('COMMON_NICKNAMES', () => {
        it('includes male names', () => {
            expect(COMMON_NICKNAMES['william']).toContain('bill');
            expect(COMMON_NICKNAMES['robert']).toContain('bob');
            expect(COMMON_NICKNAMES['james']).toContain('jim');
        });

        it('includes female names', () => {
            expect(COMMON_NICKNAMES['elizabeth']).toContain('liz');
            expect(COMMON_NICKNAMES['jennifer']).toContain('jen');
        });

        it('includes Spanish names', () => {
            expect(COMMON_NICKNAMES['jose']).toContain('pepe');
            expect(COMMON_NICKNAMES['guadalupe']).toContain('lupe');
        });
    });
});
