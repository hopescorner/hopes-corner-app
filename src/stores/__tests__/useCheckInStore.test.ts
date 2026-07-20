import { beforeEach, describe, expect, it } from 'vitest';
import { useCheckInStore } from '@/stores/useCheckInStore';
import type { CheckInSnapshot } from '@/types/checkin';

const snapshot: CheckInSnapshot = {
    generatedAt: '2026-07-19T18:00:00.000Z',
    directoryVersion: 'v1',
    serviceDate: '2026-07-19',
    guests: [{
        id: 'guest-1',
        guestId: 'HC-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        name: 'Ada Lovelace',
        preferredName: 'Ada',
        housingStatus: 'Unhoused',
        age: 'Adult',
        gender: 'Female',
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
        updatedAt: '2026-07-19T17:59:00.000Z',
        warningCount: 0,
        linkedGuestCount: 0,
        reminderCount: 0,
        lastVisitDate: '2026-07-18',
        recentMeal: true,
    }],
    todayByGuest: {},
    dailyNotes: [],
};

describe('useCheckInStore', () => {
    beforeEach(() => useCheckInStore.getState().reset());

    it('hydrates a snapshot without browser persistence middleware', () => {
        useCheckInStore.getState().hydrate(snapshot);

        const state = useCheckInStore.getState();
        expect(state.isReady).toBe(true);
        expect(state.directoryVersion).toBe('v1');
        expect(state.guestsById['guest-1'].firstName).toBe('Ada');
        expect('persist' in useCheckInStore).toBe(false);
    });

    it('applies and rolls back an optimistic meal command', () => {
        useCheckInStore.getState().hydrate(snapshot);

        const rollback = useCheckInStore.getState().optimisticMeal('guest-1', 2, false);
        expect(useCheckInStore.getState().todayByGuest['guest-1']).toMatchObject({
            mealCount: 2,
            totalMeals: 2,
        });

        rollback();
        expect(useCheckInStore.getState().todayByGuest['guest-1']).toBeUndefined();
    });

    it('ignores an older snapshot received after a newer reconciliation', () => {
        useCheckInStore.getState().hydrate(snapshot);
        useCheckInStore.getState().hydrate({
            ...snapshot,
            generatedAt: '2026-07-19T18:01:00.000Z',
            directoryVersion: 'v2',
        });
        useCheckInStore.getState().hydrate(snapshot);

        expect(useCheckInStore.getState().directoryVersion).toBe('v2');
    });

    it('builds search once per directory version and reuses it for every query', () => {
        useCheckInStore.getState().hydrate(snapshot);
        const firstIndex = useCheckInStore.getState().searchIndex;

        expect(useCheckInStore.getState().searchGuests('love').map((guest) => guest.id)).toEqual(['guest-1']);
        expect(useCheckInStore.getState().searchGuests('ada').map((guest) => guest.id)).toEqual(['guest-1']);
        expect(useCheckInStore.getState().searchIndex).toBe(firstIndex);

        useCheckInStore.getState().hydrate({ ...snapshot, generatedAt: '2026-07-19T18:01:00.000Z' });
        expect(useCheckInStore.getState().searchIndex).toBe(firstIndex);
    });

    it('ignores out-of-order realtime meal events and consumes acknowledged command echoes', () => {
        useCheckInStore.getState().hydrate(snapshot);
        const state = useCheckInStore.getState();

        state.applyRealtimeMealRecord({
            id: 'meal-remote', guestId: 'guest-1', extra: false, quantity: 2,
            eventType: 'UPDATE', version: '2026-07-19T18:02:00.000Z',
        });
        state.applyRealtimeMealRecord({
            id: 'meal-remote', guestId: 'guest-1', extra: false, quantity: 1,
            eventType: 'UPDATE', version: '2026-07-19T18:01:00.000Z',
        });
        expect(useCheckInStore.getState().todayByGuest['guest-1'].mealCount).toBe(2);

        state.acknowledgeMealRecord('meal-own');
        state.applyRealtimeMealRecord({
            id: 'meal-own', guestId: 'guest-1', extra: true, quantity: 1,
            eventType: 'INSERT', version: '2026-07-19T18:03:00.000Z',
        });
        expect(useCheckInStore.getState().todayByGuest['guest-1'].extraMealCount).toBe(0);
    });

    it('patches a service by guest id and ignores an older tablet event', () => {
        useCheckInStore.getState().hydrate(snapshot);
        const state = useCheckInStore.getState();
        state.applyRealtimeServiceRecord({
            id: 'shower-1', guestId: 'guest-1', service: 'shower',
            record: { id: 'shower-1', time: '09:00', status: 'done' },
            version: '2026-07-19T18:02:00.000Z',
        });
        state.applyRealtimeServiceRecord({
            id: 'shower-1', guestId: 'guest-1', service: 'shower',
            record: { id: 'shower-1', time: '09:00', status: 'booked' },
            version: '2026-07-19T18:01:00.000Z',
        });

        expect(useCheckInStore.getState().todayByGuest['guest-1'].shower?.status).toBe('done');
    });
});
