import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { GuestCard } from '../GuestCard';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useMealsStore } from '@/stores/useMealsStore';

vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { role: 'checkin' } },
        status: 'authenticated',
    })),
}));

const mockAddMealRecord = vi.fn().mockResolvedValue({ id: 'meal-primary' });
const mockAddAction = vi.fn();

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: (selector: any) => {
        const state = {
            mealRecords: [],
            extraMealRecords: [],
            addMealRecord: mockAddMealRecord,
            addExtraMealRecord: vi.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    },
}));

const primaryGuest = {
    id: 'guest-primary',
    firstName: 'John',
    lastName: 'Doe',
    name: 'John Doe',
    housingStatus: 'Unsheltered',
    age: 'Adult (25-59)',
    gender: 'Male',
    location: 'Mountain View',
    isBanned: false,
    bannedFromMeals: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    warningCount: 0,
    linkedGuestCount: 1,
    reminderCount: 0,
};

const buddyGuest = {
    id: 'guest-buddy',
    firstName: 'Jane',
    lastName: 'Smith',
    name: 'Jane Smith',
    preferredName: 'Jane',
    housingStatus: 'Unsheltered',
    age: 'Adult (25-59)',
    gender: 'Female',
    location: 'Mountain View',
    isBanned: false,
    bannedFromMeals: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    warningCount: 0,
    linkedGuestCount: 1,
    reminderCount: 0,
};

describe('GuestCard Linked Guests Meals', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useGuestsStore.setState({
            guests: [primaryGuest, buddyGuest],
            guestProxies: [
                {
                    id: 'proxy-1',
                    guestId: 'guest-primary',
                    proxyId: 'guest-buddy',
                    relationship: 'friend',
                    canPickupMeals: true,
                    canPickupServices: false,
                    isActive: true,
                    createdAt: '2026-01-01T00:00:00.000Z',
                },
            ],
            warnings: [],
        });
    });

    it('renders clearly named group meal actions when guest has linked buddies and no meals today', () => {
        render(
            <GuestCard
                guest={primaryGuest}
                linkedGuestsCount={1}
            />
        );

        expect(screen.getByRole('button', { name: '1 meal each' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '2 meals each' })).toBeInTheDocument();
    });

    it.each([1, 2])('checks in primary and linked buddy when %s meal each is clicked', async (quantity) => {
        render(
            <GuestCard
                guest={primaryGuest}
                linkedGuestsCount={1}
                addAction={mockAddAction}
            />
        );

        const allButton = screen.getByRole('button', { name: `${quantity} meal${quantity === 1 ? '' : 's'} each` });
        fireEvent.click(allButton);

        await waitFor(() => {
            expect(mockAddMealRecord).toHaveBeenCalledWith('guest-primary', quantity);
            expect(mockAddMealRecord).toHaveBeenCalledWith('guest-buddy', quantity, 'guest-primary', undefined);
        });
    });

    it('loads guest context first if proxies are not yet loaded when a group meal action is clicked', async () => {
        // Initially empty proxies in store (like fresh snapshot load)
        useGuestsStore.setState({
            guests: [primaryGuest],
            guestProxies: [],
        });

        const mockLoadContext = vi.fn().mockImplementation(async () => {
            useGuestsStore.setState({
                guests: [primaryGuest, buddyGuest],
                guestProxies: [
                    {
                        id: 'proxy-1',
                        guestId: 'guest-primary',
                        proxyId: 'guest-buddy',
                        relationship: 'friend',
                        canPickupMeals: true,
                        canPickupServices: false,
                        isActive: true,
                        createdAt: '2026-01-01T00:00:00.000Z',
                    },
                ],
            });
        });

        render(
            <GuestCard
                guest={primaryGuest}
                linkedGuestsCount={1}
                loadGuestContext={mockLoadContext}
                addAction={mockAddAction}
            />
        );

        const allButton = screen.getByRole('button', { name: '1 meal each' });
        fireEvent.click(allButton);

        await waitFor(() => {
            expect(mockLoadContext).toHaveBeenCalled();
            expect(mockAddMealRecord).toHaveBeenCalledWith('guest-primary', 1);
            expect(mockAddMealRecord).toHaveBeenCalledWith('guest-buddy', 1, 'guest-primary', undefined);
        });
    });

    it('displays buddy served status badge and action chip when both primary and buddy are served', () => {
        const mealStatusMap = new Map([
            [
                'guest-primary',
                {
                    hasMeal: true,
                    mealCount: 1,
                    extraMealCount: 0,
                    totalMeals: 1,
                    hasReachedMealLimit: false,
                    hasReachedExtraMealLimit: false,
                },
            ],
            [
                'guest-buddy',
                {
                    hasMeal: true,
                    mealCount: 1,
                    extraMealCount: 0,
                    totalMeals: 1,
                    hasReachedMealLimit: false,
                    hasReachedExtraMealLimit: false,
                },
            ],
        ]);

        render(
            <GuestCard
                guest={primaryGuest}
                linkedGuestsCount={1}
                mealStatusMap={mealStatusMap}
            />
        );

        // Header badge shows buddy served
        expect(screen.getByText('1/1 served')).toBeInTheDocument();
        expect(screen.getByText('All linked guests served')).toBeInTheDocument();
    });

    it('displays + Buddy ×1 button when primary is served but linked buddy is not yet served', async () => {
        const mealStatusMap = new Map([
            [
                'guest-primary',
                {
                    hasMeal: true,
                    mealCount: 1,
                    extraMealCount: 0,
                    totalMeals: 1,
                    hasReachedMealLimit: false,
                    hasReachedExtraMealLimit: false,
                },
            ],
            [
                'guest-buddy',
                {
                    hasMeal: false,
                    mealCount: 0,
                    extraMealCount: 0,
                    totalMeals: 0,
                    hasReachedMealLimit: false,
                    hasReachedExtraMealLimit: false,
                },
            ],
        ]);

        render(
            <GuestCard
                guest={primaryGuest}
                linkedGuestsCount={1}
                mealStatusMap={mealStatusMap}
                addAction={mockAddAction}
            />
        );

        expect(screen.getByText('1 linked guest still need meals')).toBeInTheDocument();

        const addBuddyBtn = screen.getByRole('button', { name: '1 meal each' });
        expect(addBuddyBtn).toBeInTheDocument();

        // Clicking the group action logs the meal for the unserved buddy.
        fireEvent.click(addBuddyBtn);

        await waitFor(() => {
            expect(mockAddMealRecord).toHaveBeenCalledWith('guest-buddy', 1, 'guest-primary', undefined);
        });
    });

    it('accurately counts linked guests on load when guestProxies contains symmetric database entries', () => {
        useGuestsStore.setState({
            guests: [primaryGuest, buddyGuest],
            guestProxies: [
                {
                    id: 'proxy-1',
                    guestId: 'guest-primary',
                    proxyId: 'guest-buddy',
                    relationship: 'friend',
                    canPickupMeals: true,
                    canPickupServices: false,
                    isActive: true,
                    createdAt: '2026-01-01T00:00:00.000Z',
                },
                {
                    id: 'proxy-2',
                    guestId: 'guest-buddy',
                    proxyId: 'guest-primary',
                    relationship: 'friend',
                    canPickupMeals: true,
                    canPickupServices: false,
                    isActive: true,
                    createdAt: '2026-01-01T00:00:00.000Z',
                },
            ],
            warnings: [],
        });

        render(<GuestCard guest={primaryGuest} />);

        expect(screen.getByText('0 of 1 served')).toBeInTheDocument();
        expect(screen.getByText('John Doe + 1 linked guest')).toBeInTheDocument();
    });
});
