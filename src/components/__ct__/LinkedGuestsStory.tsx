import { useLayoutEffect, useState } from 'react';
import { GuestCard } from '../guests/GuestCard';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { useActionHistoryStore } from '@/stores/useActionHistoryStore';
import { useCheckInStore } from '@/stores/useCheckInStore';
import { todayPacificDateString } from '@/lib/utils/date';

export function LinkedGuestsStory({ served = false }: { served?: boolean }) {
    const [ready, setReady] = useState(false);
    useLayoutEffect(() => {
        const date = todayPacificDateString();
        const guests = [
            { id: 'primary', firstName: 'Alex', lastName: 'Rivera' },
            { id: 'buddy-1', firstName: 'Sam', lastName: 'Lee' },
            { id: 'buddy-2', firstName: 'Morgan', lastName: 'Williams' },
            { id: 'candidate', firstName: 'Taylor', lastName: 'Green' },
        ].map((guest) => ({ ...guest, name: `${guest.firstName} ${guest.lastName}`, housingStatus: 'Unsheltered', location: 'Mountain View', gender: 'Unknown', age: 'Adult (18-59)', createdAt: '2025-01-01T12:00:00Z', isBanned: false }));
        useGuestsStore.setState({ guests, warnings: [], guestProxies: [
            { id: 'link-1', guestId: 'primary', proxyId: 'buddy-1' },
            { id: 'link-2', guestId: 'primary', proxyId: 'buddy-2' },
        ] } as any);
        useCheckInStore.setState({ isReady: false });
        useActionHistoryStore.getState().clearHistory();
        useMealsStore.setState({
            mealRecords: served ? [{ id: 'meal-primary', guestId: 'primary', count: 1, date: `${date}T12:00:00Z`, dateKey: date }] : [],
            extraMealRecords: [], lunchBagRecords: [],
            addMealRecord: async (guestId, count = 1, pickedUpByGuestId) => {
                const record = { id: `meal-${guestId}`, guestId, count, pickedUpByGuestId, date: `${date}T12:00:00Z`, dateKey: date };
                useMealsStore.setState((state) => ({ mealRecords: [...state.mealRecords, record] }));
                return record;
            },
            deleteMealRecord: async (id) => { useMealsStore.setState((state) => ({ mealRecords: state.mealRecords.filter((row) => row.id !== id) })); },
        });
        if (served) useActionHistoryStore.getState().addAction('MEAL_ADDED', { recordId: 'meal-primary', guestId: 'primary' });
        queueMicrotask(() => setReady(true));
    }, [served]);
    const primary = useGuestsStore((state) => state.guests.find((guest) => guest.id === 'primary'));
    return ready && primary ? <GuestCard guest={primary} linkedGuestsCount={2} /> : null;
}
