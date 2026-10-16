import { describe, it, expect } from 'vitest';
import { getGuestsMap } from '../guestLookup';
import type { Guest } from '@/stores/useGuestsStore';

describe('guestLookup', () => {
    it('returns empty map for empty or invalid input', () => {
        expect(getGuestsMap([] as any).size).toBe(0);
        expect(getGuestsMap(null as any).size).toBe(0);
        expect(getGuestsMap(undefined as any).size).toBe(0);
    });

    it('indexes guests by ID and caches the map for the same array reference', () => {
        const guests = [
            { id: 'g1', name: 'Alice' },
            { id: 'g2', name: 'Bob' },
        ] as Guest[];

        const map1 = getGuestsMap(guests);
        expect(map1.size).toBe(2);
        expect(map1.get('g1')?.name).toBe('Alice');
        expect(map1.get('g2')?.name).toBe('Bob');

        const map2 = getGuestsMap(guests);
        expect(map2).toBe(map1);
    });

    it('creates a new map when guests array reference changes', () => {
        const guests1 = [{ id: 'g1', name: 'Alice' }] as Guest[];
        const guests2 = [{ id: 'g1', name: 'Alice' }, { id: 'g2', name: 'Bob' }] as Guest[];

        const map1 = getGuestsMap(guests1);
        const map2 = getGuestsMap(guests2);

        expect(map1.size).toBe(1);
        expect(map2.size).toBe(2);
        expect(map2).not.toBe(map1);
    });
});
