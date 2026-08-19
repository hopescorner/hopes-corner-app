import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GuestHistoryModal } from '../GuestHistoryModal';

const guest = {
    id: '11111111-1111-4111-8111-111111111111',
    preferredName: 'Johnny',
};

const history = {
    events: [
        {
            id: 'meal-1',
            type: 'meal',
            occurredAt: '2026-08-18T18:30:00.000Z',
            title: 'Meal',
            detail: '2 meals',
        },
        {
            id: 'laundry-1',
            type: 'laundry',
            occurredAt: '2026-07-15T17:00:00.000Z',
            title: 'Laundry',
            detail: 'Onsite · Bag 14',
            status: 'picked up',
        },
        {
            id: 'item-1',
            type: 'item',
            occurredAt: '2025-12-01T17:00:00.000Z',
            title: 'Item received',
            detail: 'Sleeping bag',
        },
    ],
};

describe('GuestHistoryModal', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        vi.setSystemTime(new Date('2026-08-19T12:00:00.000Z'));
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue(history),
        }));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('loads and displays the guest activity in newest-first order', async () => {
        render(<GuestHistoryModal guest={guest} onClose={vi.fn()} />);

        expect(screen.getByText('Loading history…')).toBeDefined();
        expect(await screen.findByText('2 meals')).toBeDefined();
        expect(screen.getByText('Onsite · Bag 14')).toBeDefined();
        expect(screen.getByText('picked up')).toBeDefined();
        expect(fetch).toHaveBeenCalledWith('/api/check-in/guests/11111111-1111-4111-8111-111111111111/history');

        const entries = screen.getAllByRole('listitem');
        expect(entries[0]).toHaveTextContent('Meal');
        expect(entries[1]).toHaveTextContent('Laundry');
    });

    it('shows older activity when staff selects all time', async () => {
        render(<GuestHistoryModal guest={guest} onClose={vi.fn()} />);
        await screen.findByText('2 meals');

        expect(screen.queryByText('Sleeping bag')).toBeNull();
        fireEvent.change(screen.getByRole('combobox', { name: 'History range' }), {
            target: { value: 'all' },
        });

        expect(screen.getByText('Sleeping bag')).toBeDefined();
    });

    it('offers a retry when history cannot be loaded', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            json: vi.fn().mockResolvedValue({ error: 'Unable to load guest history' }),
        } as never);
        render(<GuestHistoryModal guest={guest} onClose={vi.fn()} />);

        expect(await screen.findByText('Unable to load guest history')).toBeDefined();
        expect(screen.getByRole('button', { name: 'Retry' })).toBeDefined();
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    });
});
