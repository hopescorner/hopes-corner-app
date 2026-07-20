import { beforeEach, describe, expect, it } from 'vitest';
import { useCheckInStore } from '@/stores/useCheckInStore';
import type { CheckInGuestSummary, CheckInSnapshot } from '@/types/checkin';

const createGuests = (count: number): CheckInGuestSummary[] => Array.from({ length: count }, (_, index) => ({
    id: `guest-${index}`,
    guestId: `HC-${index}`,
    firstName: index === count - 1 ? 'Needle' : `Guest${index}`,
    lastName: index === count - 1 ? 'Target' : `Person${index}`,
    name: index === count - 1 ? 'Needle Target' : `Guest${index} Person${index}`,
    preferredName: '',
    housingStatus: 'Unhoused',
    age: 'Adult',
    gender: 'Unknown',
    location: 'Mountain View',
    bannedAt: null,
    bannedUntil: null,
    banReason: '',
    isBanned: false,
    bannedFromMeals: false,
    bannedFromShower: false,
    bannedFromLaundry: false,
    bannedFromBicycle: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-07-19T00:00:00.000Z',
    warningCount: 0,
    linkedGuestCount: 0,
    reminderCount: 0,
    lastVisitDate: null,
    recentMeal: false,
}));

describe('check-in search performance', () => {
    beforeEach(() => useCheckInStore.getState().reset());

    it.each([2_824, 10_000])('returns indexed results under 50ms for %i guests', (count) => {
        useCheckInStore.getState().hydrate({
            generatedAt: '2026-07-19T18:00:00.000Z',
            directoryVersion: `v-${count}`,
            serviceDate: '2026-07-19',
            guests: createGuests(count),
            todayByGuest: {},
            dailyNotes: [],
        } satisfies CheckInSnapshot);

        const startedAt = performance.now();
        const results = useCheckInStore.getState().searchGuests('needle tar');
        const elapsed = performance.now() - startedAt;

        expect(results[0]?.name).toBe('Needle Target');
        expect(elapsed).toBeLessThan(50);
    });
});
