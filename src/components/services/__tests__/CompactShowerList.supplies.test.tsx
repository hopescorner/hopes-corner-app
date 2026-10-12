import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import CompactShowerList from '../CompactShowerList';
import { useItemsStore } from '@/stores/useItemsStore';

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn((selector) => {
        const state = {
            guests: [
                { id: 'g1', name: 'John Doe', preferredName: 'Johnny', housingStatus: 'Unhoused' },
            ],
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn((selector) => {
        const state = {
            updateShowerStatus: vi.fn().mockResolvedValue(true),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/components/ui/CompactWaiverIndicator', () => ({
    CompactWaiverIndicator: () => <span data-testid="waiver-indicator">Waiver</span>,
}));

vi.mock('@/lib/utils/serviceSlots', () => ({
    formatSlotLabel: (slot: string) => `Slot ${slot}`,
}));

vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn() },
}));

describe('CompactShowerList supply eligibility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useItemsStore.setState({ distributedItems: [], isLoading: false, error: null });
    });

    it('shows ineligible supply icons beside the guest name without opening the amenities panel', async () => {
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        useItemsStore.setState({
            distributedItems: [
                { id: 'i1', guestId: 'g1', itemKey: 'jacket', distributedAt: fiveDaysAgo.toISOString(), createdAt: fiveDaysAgo.toISOString() },
            ],
        });

        render(<CompactShowerList records={[{ id: 'r1', guestId: 'g1', time: '09:00', status: 'booked' }]} />);

        expect(screen.getByText('Johnny')).toBeDefined();
        await waitFor(() => {
            expect(screen.getByTestId('ineligible-supply-jacket')).toBeDefined();
        });
    });

    it('shows nothing when the guest is eligible for all supplies', () => {
        render(<CompactShowerList records={[{ id: 'r1', guestId: 'g1', time: '09:00', status: 'booked' }]} />);
        expect(screen.getByText('Johnny')).toBeDefined();
        expect(screen.queryByTestId('ineligible-supply-jacket')).toBeNull();
    });

    it('bulk-loads item history for every visible guest in one call', async () => {
        const original = useItemsStore.getState().fetchItemsForGuests;
        const fetchSpy = vi.fn().mockResolvedValue(undefined);
        useItemsStore.setState({ fetchItemsForGuests: fetchSpy } as any);

        try {
            const { unmount } = render(
                <CompactShowerList
                    records={[
                        { id: 'r1', guestId: 'g1', time: '09:00', status: 'booked' },
                        { id: 'r2', guestId: 'g1', time: '10:00', status: 'booked' },
                    ]}
                />
            );

            await waitFor(() => {
                expect(fetchSpy).toHaveBeenCalledWith(['g1']);
            });
            unmount();
        } finally {
            useItemsStore.setState({ fetchItemsForGuests: original } as any);
        }
    });
});
