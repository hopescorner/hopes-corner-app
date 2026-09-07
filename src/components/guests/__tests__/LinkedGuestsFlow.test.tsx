import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { LinkedGuestsStory } from '../../__ct__/LinkedGuestsStory';
import { useMealsStore } from '@/stores/useMealsStore';

vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { role: 'checkin' } } }) }));

describe('Linked guest pickup flow', () => {
    it.each([1, 2])('offers a clearly named group action for %s meal each before expanding the card', async (quantity) => {
        render(<LinkedGuestsStory />);
        const pickup = screen.getByRole('region', { name: 'Linked guest meals for Alex Rivera' });
        expect(within(pickup).getByText('Sam Lee, Morgan Williams')).toBeVisible();
        expect(within(pickup).getByText('Alex Rivera + 2 linked guests')).toBeVisible();
        fireEvent.click(within(pickup).getByRole('button', { name: `${quantity} meal${quantity === 1 ? '' : 's'} each` }));
        await waitFor(() => expect(useMealsStore.getState().mealRecords.map((row) => [row.guestId, row.count])).toEqual([
            ['primary', quantity], ['buddy-1', quantity], ['buddy-2', quantity],
        ]));
        expect(within(pickup).getByText('All linked guests served')).toBeVisible();
    });

    it('only serves remaining linked guests after the primary has eaten', async () => {
        render(<LinkedGuestsStory served />);
        const pickup = screen.getByRole('region', { name: 'Linked guest meals for Alex Rivera' });
        expect(within(pickup).getByText('2 linked guests still need meals')).toBeVisible();
        fireEvent.click(within(pickup).getByRole('button', { name: '2 meals each' }));
        await waitFor(() => expect(useMealsStore.getState().mealRecords.map((row) => [row.guestId, row.count])).toEqual([
            ['primary', 1], ['buddy-1', 2], ['buddy-2', 2],
        ]));
    });

    it('opens individual linked meals directly and keeps unlink controls in management mode', async () => {
        render(<LinkedGuestsStory />);
        fireEvent.click(screen.getByRole('button', { name: 'View linked guests' }));
        const mealButton = await screen.findByRole('button', { name: '1 meal for Sam Lee' });
        expect(screen.queryByRole('button', { name: 'Unlink Sam Lee' })).not.toBeInTheDocument();
        fireEvent.click(mealButton);
        await waitFor(() => expect(screen.getByRole('button', { name: 'Undo meal for Sam Lee' })).toBeVisible());
        fireEvent.click(screen.getByRole('button', { name: 'Undo meal for Sam Lee' }));
        await waitFor(() => expect(useMealsStore.getState().mealRecords).toEqual([]));
        fireEvent.click(screen.getByRole('button', { name: 'Manage links' }));
        expect(screen.getByRole('button', { name: 'Unlink Sam Lee' })).toBeVisible();
    });
});
