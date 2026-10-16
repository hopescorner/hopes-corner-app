import type { Guest } from '@/stores/useGuestsStore';

const guestsMapCache = new WeakMap<Guest[], Map<string, Guest>>();

export function getGuestsMap(guests: Guest[]): Map<string, Guest> {
    if (!guests || !Array.isArray(guests)) return new Map();
    let map = guestsMapCache.get(guests);
    if (!map) {
        map = new Map<string, Guest>();
        for (let i = 0; i < guests.length; i++) {
            const g = guests[i];
            if (g?.id) {
                map.set(g.id, g);
            }
        }
        guestsMapCache.set(guests, map);
    }
    return map;
}
