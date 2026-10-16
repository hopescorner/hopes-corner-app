import { describe, it, expect } from 'vitest';
import { isHalloweenSeason } from '@/lib/seasonal';

describe('isHalloweenSeason', () => {
    it('returns true during October', () => {
        expect(isHalloweenSeason(new Date(2026, 9, 16))).toBe(true);
        expect(isHalloweenSeason(new Date(2026, 9, 31))).toBe(true);
        expect(isHalloweenSeason(new Date(2026, 9, 1))).toBe(true);
    });

    it('reverts to false on Nov 1st', () => {
        expect(isHalloweenSeason(new Date(2026, 10, 1))).toBe(false);
        expect(isHalloweenSeason(new Date(2026, 10, 15))).toBe(false);
    });

    it('returns false outside October', () => {
        expect(isHalloweenSeason(new Date(2026, 0, 15))).toBe(false);
        expect(isHalloweenSeason(new Date(2026, 6, 4))).toBe(false);
        expect(isHalloweenSeason(new Date(2026, 11, 25))).toBe(false);
    });
});
