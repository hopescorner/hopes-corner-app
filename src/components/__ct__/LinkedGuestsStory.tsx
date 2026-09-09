import { useLayoutEffect } from 'react';
import { GuestCard } from '../guests/GuestCard';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { useActionHistoryStore } from '@/stores/useActionHistoryStore';
import { useCheckInStore } from '@/stores/useCheckInStore';
import { todayPacificDateString } from '@/lib/utils/date';

const defaultGuests = [
    { id: 'primary', firstName: 'Alex', lastName: 'Rivera' },
    { id: 'buddy-1', firstName: 'Sam', lastName: 'Lee' },
    { id: 'buddy-2', firstName: 'Morgan', lastName: 'Williams' },
    { id: 'candidate', firstName: 'Taylor', lastName: 'Green' },
].map((guest) => ({ ...guest, name: `${guest.firstName} ${guest.lastName}`, housingStatus: 'Unsheltered', location: 'Mountain View', gender: 'Unknown', age: 'Adult (18-59)', createdAt: '2025-01-01T12:00:00Z', isBanned: false }));

export function setupLinkedGuestsStore(served = false) {
    const date = todayPacificDateString();
    useGuestsStore.setState({
        guests: defaultGuests,
        warnings: [],
        guestProxies: [
            { id: 'link-1', guestId: 'primary', proxyId: 'buddy-1' },
            { id: 'link-2', guestId: 'primary', proxyId: 'buddy-2' },
        ],
    } as any);
    useCheckInStore.setState({ isReady: false });
    useActionHistoryStore.getState().clearHistory();
    useMealsStore.setState({
        mealRecords: served ? [{ id: 'meal-primary', guestId: 'primary', count: 1, date: `${date}T12:00:00Z`, dateKey: date }] : [],
        extraMealRecords: [],
        lunchBagRecords: [],
        addMealRecord: async (guestId, count = 1, pickedUpByGuestId) => {
            const record = { id: `meal-${guestId}`, guestId, count, pickedUpByGuestId, date: `${date}T12:00:00Z`, dateKey: date };
            useMealsStore.setState((state) => ({ mealRecords: [...state.mealRecords, record] }));
            return record;
        },
        deleteMealRecord: async (id) => {
            useMealsStore.setState((state) => ({ mealRecords: state.mealRecords.filter((row) => row.id !== id) }));
        },
        decrementMealRecord: async (id, quantity) => {
            const row = useMealsStore.getState().mealRecords.find((record) => record.id === id);
            if (!row || (row.count || 1) <= quantity) return false;
            useMealsStore.setState((state) => ({
                mealRecords: state.mealRecords.map((record) =>
                    record.id === id ? { ...record, count: record.count - quantity } : record),
            }));
            return true;
        },
    });
    if (served) useActionHistoryStore.getState().addAction('MEAL_ADDED', { recordId: 'meal-primary', guestId: 'primary' });
}

export function LinkedGuestsStory({ served = false }: { served?: boolean }) {
    useLayoutEffect(() => {
        setupLinkedGuestsStore(served);
    }, [served]);
    const primary = useGuestsStore((state) => state.guests.find((guest) => guest.id === 'primary')) ?? defaultGuests[0];
    return <GuestCard guest={primary} linkedGuestsCount={2} />;
}
