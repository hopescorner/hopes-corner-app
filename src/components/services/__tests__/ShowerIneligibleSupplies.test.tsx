import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ShowerIneligibleSupplies } from '../ShowerIneligibleSupplies';
import { useItemsStore } from '@/stores/useItemsStore';

describe('ShowerIneligibleSupplies', () => {
    beforeEach(() => {
        useItemsStore.setState({
            distributedItems: [],
            isLoading: false,
            error: null,
        });
    });

    it('renders nothing when guest is eligible for everything', () => {
        const { container } = render(<ShowerIneligibleSupplies guestId="g1" />);
        expect(container.firstChild).toBeNull();
    });

    it('shows gray icon with red slash for a supply on cooldown', () => {
        const recent = new Date();
        recent.setDate(recent.getDate() - 5);
        useItemsStore.setState({
            distributedItems: [
                { id: 'i1', guestId: 'g1', itemKey: 'jacket', distributedAt: recent.toISOString(), createdAt: recent.toISOString() },
            ],
        });

        render(<ShowerIneligibleSupplies guestId="g1" />);

        const badge = screen.getByTestId('ineligible-supply-jacket');
        expect(badge).toBeDefined();
        // Accessible label carries days remaining so staff know when it unlocks
        expect(badge.getAttribute('aria-label')).toMatch(/Jacket unavailable/i);
        expect(badge.getAttribute('aria-label')).toMatch(/10d left/);
        // Gray icon + red strike line
        expect(badge.querySelector('.text-gray-400')).not.toBeNull();
        expect(badge.querySelector('.bg-red-500')).not.toBeNull();
    });

    it('shows multiple ineligible supplies and hides eligible ones', () => {
        const recent = new Date();
        const fiveDaysAgo = new Date(recent);
        fiveDaysAgo.setDate(recent.getDate() - 5);
        const twoDaysAgo = new Date(recent);
        twoDaysAgo.setDate(recent.getDate() - 2);
        useItemsStore.setState({
            distributedItems: [
                { id: 'i1', guestId: 'g1', itemKey: 'jacket', distributedAt: fiveDaysAgo.toISOString(), createdAt: fiveDaysAgo.toISOString() },
                { id: 'i2', guestId: 'g1', itemKey: 'sleeping_bag', distributedAt: twoDaysAgo.toISOString(), createdAt: twoDaysAgo.toISOString() },
            ],
        });

        render(<ShowerIneligibleSupplies guestId="g1" />);

        expect(screen.getByTestId('ineligible-supply-jacket')).toBeDefined();
        expect(screen.getByTestId('ineligible-supply-sleeping_bag')).toBeDefined();
        // Eligible supplies are not shown
        expect(screen.queryByTestId('ineligible-supply-tshirt')).toBeNull();
        expect(screen.queryByTestId('ineligible-supply-tent')).toBeNull();
    });

    it('isolates guests: only the requested guest badges show', () => {
        const recent = new Date();
        recent.setDate(recent.getDate() - 5);
        useItemsStore.setState({
            distributedItems: [
                { id: 'i1', guestId: 'other', itemKey: 'jacket', distributedAt: recent.toISOString(), createdAt: recent.toISOString() },
            ],
        });

        const { container } = render(<ShowerIneligibleSupplies guestId="g1" />);
        expect(container.firstChild).toBeNull();
    });
});
