import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import LinkedGuestsList from '../LinkedGuestsList';
import { hydrateLegacyStoresFromSnapshot } from '@/lib/checkin/legacyAdapter';
import { normalizeCheckInSnapshot } from '@/lib/checkin/snapshot';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useCheckInStore } from '@/stores/useCheckInStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useActionHistoryStore } from '@/stores/useActionHistoryStore';

vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { role: 'staff' } } }) }));

beforeEach(() => {
    useGuestsStore.setState({ guests: [], guestProxies: [], warnings: [] });
    useCheckInStore.getState().reset();
    useMealsStore.setState({ mealRecords: [], extraMealRecords: [], isLoaded: false });
    useServicesStore.setState({ isLoaded: false });
    useActionHistoryStore.setState({ actionHistory: [] });
});
afterEach(cleanup);

it.each([false, true])('keeps buddies visible after a primary meal and repeated reconciliation (reverse link: %s)', (reverse) => {
    const snapshot = normalizeCheckInSnapshot({
        generated_at: '2026-09-05T18:00:00Z', directory_version: 'v1', service_date: '2026-09-05',
        guests: [{ id: 'primary', preferred_name: 'Primary' }, { id: 'buddy', preferred_name: 'Buddy' }],
        today_by_guest: {}, daily_notes: [],
    });
    hydrateLegacyStoresFromSnapshot(snapshot);
    useCheckInStore.getState().hydrate(snapshot);
    useGuestsStore.setState({ guestProxies: [{
        id: 'link-1', guestId: reverse ? 'buddy' : 'primary', proxyId: reverse ? 'primary' : 'buddy', createdAt: snapshot.generatedAt,
    }] });
    const view = render(<LinkedGuestsList guestId="primary" />);
    expect(screen.getByText('Buddy')).toBeInTheDocument();

    act(() => {
        useCheckInStore.getState().optimisticMeal('primary', 1, false);
        const updated = { ...snapshot, todayByGuest: useCheckInStore.getState().todayByGuest };
        hydrateLegacyStoresFromSnapshot(updated);
        hydrateLegacyStoresFromSnapshot(updated);
    });
    expect(screen.getByText('Buddy')).toBeInTheDocument();
    expect(screen.getByTitle('1 Meal')).toBeEnabled();
    expect(useGuestsStore.getState().getLinkedGuests('primary').map((guest) => guest.id)).toEqual(['buddy']);

    view.unmount();
    render(<LinkedGuestsList guestId="primary" />);
    expect(screen.getByText('Buddy')).toBeInTheDocument();
});
