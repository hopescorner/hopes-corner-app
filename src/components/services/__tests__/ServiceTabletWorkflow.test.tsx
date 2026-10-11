import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { services, guests } = vi.hoisted(() => ({ services: { current: null as any }, guests: { current: null as any } }));
vi.mock('@/stores/useServicesStore', async () => {
    const { create } = await import('zustand');
    services.current = create(() => ({}));
    return { useServicesStore: services.current };
});
vi.mock('@/stores/useGuestsStore', async () => {
    const { create } = await import('zustand');
    guests.current = create(() => ({}));
    return { useGuestsStore: guests.current };
});
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { role: 'staff' } } }) }));
vi.mock('@/components/ui/CompactWaiverIndicator', () => ({ CompactWaiverIndicator: () => null }));
vi.mock('@/components/ui/ReminderIndicator', () => ({ ReminderIndicator: () => null }));
vi.mock('../ServiceDayNote', () => ({ ServiceDayNote: () => null }));
vi.mock('../EndServiceDayPanel', () => ({ EndServiceDayPanel: () => null }));
vi.mock('../../admin/SlotBlockModal', () => ({ SlotBlockModal: () => null }));
vi.mock('../ShowerDetailModal', () => ({ ShowerDetailModal: ({ record }: any) => <div role="dialog">Shower status: {record.status}</div> }));
vi.mock('@/lib/utils/date', async (importOriginal) => ({
    ...await importOriginal<typeof import('@/lib/utils/date')>(),
    todayPacificDateString: () => '2026-10-10',
}));

import { LaundrySection } from '../LaundrySection';
import { ShowersSection } from '../ShowersSection';

const laundry = [
    { id: 'l1', guestId: 'g1', status: 'waiting', date: '2026-10-10', laundryType: 'onsite', bagNumber: '', time: '09:00' },
    { id: 'l2', guestId: 'g2', status: 'washer', date: '2026-10-10', laundryType: 'onsite', bagNumber: 'B42', time: '10:00' },
    { id: 'l3', guestId: 'g3', status: 'returned', date: '2026-10-09', laundryType: 'offsite', bagNumber: 'B43' },
];

beforeEach(() => {
    sessionStorage.clear();
    services.current.setState({
        laundryRecords: laundry,
        showerRecords: [{ id: 's1', guestId: 'g1', status: 'booked', date: '2026-10-10', time: '09:00' }],
        updateLaundryStatus: vi.fn().mockResolvedValue(true),
        updateLaundryBagNumber: vi.fn().mockResolvedValue(undefined),
        deleteLaundryRecord: vi.fn().mockResolvedValue(undefined),
        cancelMultipleLaundry: vi.fn().mockResolvedValue(true),
        cancelMultipleShowers: vi.fn().mockResolvedValue(true),
        addLaundryRecord: vi.fn(), addShowerRecord: vi.fn(), addShowerWaitlist: vi.fn(),
        getLaundryWeeklyUsage: vi.fn(),
    }, true);
    guests.current.setState({ guests: [
        { id: 'g1', name: 'John Doe', preferredName: 'Johnny' },
        { id: 'g2', name: 'Jane Smith' },
        { id: 'g3', name: 'Alice Brown' },
    ] }, true);
});

describe('iPad service workflows', () => {
    it('shows returned off-site loads from previous days until picked up', () => {
        render(<LaundrySection />);
        const carryover = screen.getByTestId('legacy-laundry-section');
        expect(within(carryover).getByText('Alice Brown')).toBeVisible();
        expect(within(carryover).getByRole('button', { name: 'Mark Picked Up' })).toBeEnabled();
    });

    it('shows the selected historical date in laundry list view', () => {
        render(<LaundrySection />);
        fireEvent.click(screen.getByRole('button', { name: 'Previous day' }));
        fireEvent.click(screen.getByTitle('List View'));
        expect(screen.getByText('Alice Brown')).toBeVisible();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('searches laundry by bag number without changing records', () => {
        render(<LaundrySection />);
        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'B42' } });
        expect(screen.getByText('Jane Smith')).toBeVisible();
        expect(screen.queryByText('Johnny')).not.toBeInTheDocument();
    });

    it('searches showers by legal name as well as preferred name', () => {
        render(<ShowersSection />);
        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'John Doe' } });
        expect(screen.getByText('Johnny')).toBeVisible();
        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'absent' } });
        expect(screen.queryByText('Johnny')).not.toBeInTheDocument();
    });

    it('advances a board card without expanding or dragging it', async () => {
        render(<LaundrySection />);
        fireEvent.click(screen.getByRole('button', { name: 'Move to dryer' }));
        await waitFor(() => expect(services.current.getState().updateLaundryStatus).toHaveBeenCalledWith('l2', 'dryer'));
    });

    it('requests a bag in a dialog and saves it before advancing', async () => {
        render(<LaundrySection />);
        fireEvent.click(screen.getByRole('button', { name: 'Start washer' }));
        const dialog = screen.getByRole('dialog', { name: 'Bag number required' });
        expect(within(dialog).getByText('Johnny')).toBeVisible();
        fireEvent.change(within(dialog).getByLabelText('Bag number'), { target: { value: '  B99  ' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Save and continue' }));
        await waitFor(() => expect(services.current.getState().updateLaundryStatus).toHaveBeenCalledWith('l1', 'washer'));
        expect(services.current.getState().updateLaundryBagNumber).toHaveBeenCalledWith('l1', 'B99');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('leaves the status unchanged when bag entry is cancelled', () => {
        render(<LaundrySection />);
        fireEvent.click(screen.getByRole('button', { name: 'Start washer' }));
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
        expect(services.current.getState().updateLaundryStatus).not.toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it.each(['exception', 'false result'])('does not advance when the bag save fails with %s and allows retry', async (failure) => {
        const saveBag = services.current.getState().updateLaundryBagNumber;
        if (failure === 'exception') saveBag.mockRejectedValueOnce(new Error('Network unavailable'));
        else saveBag.mockResolvedValueOnce(false);
        render(<LaundrySection />);
        fireEvent.click(screen.getByRole('button', { name: 'Start washer' }));
        const dialog = screen.getByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText('Bag number'), { target: { value: 'B99' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Save and continue' }));
        expect(await within(dialog).findByRole('alert')).toHaveTextContent(failure === 'exception' ? 'Network unavailable' : 'Failed to save bag number');
        expect(services.current.getState().updateLaundryStatus).not.toHaveBeenCalled();
        fireEvent.click(within(dialog).getByRole('button', { name: 'Save and continue' }));
        await waitFor(() => expect(services.current.getState().updateLaundryStatus).toHaveBeenCalledWith('l1', 'washer'));
    });

    it('preserves the shower search and filter after switching away and back', () => {
        const first = render(<ShowersSection />);
        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Johnny' } });
        fireEvent.click(screen.getAllByRole('button', { name: /completed/i })[0]);
        first.unmount();
        render(<ShowersSection />);
        expect(screen.getByRole('searchbox')).toHaveValue('Johnny');
        expect(screen.queryByText('Johnny')).not.toBeInTheDocument();
    });

    it('updates open shower details when another device changes the record', () => {
        render(<ShowersSection />);
        fireEvent.click(screen.getByText('Johnny'));
        expect(screen.getByRole('dialog')).toHaveTextContent('booked');
        act(() => services.current.setState({ showerRecords: [{ ...services.current.getState().showerRecords[0], status: 'done' }] }));
        expect(screen.getByRole('dialog')).toHaveTextContent('done');
    });
});

it('opens slot assignment for a waitlisted shower guest', () => {
    services.current.setState({ showerRecords: [{ id: 's2', guestId: 'g1', status: 'waitlisted', date: '2026-10-10', time: null }] });
    render(<ShowersSection />);
    fireEvent.click(screen.getAllByRole('button', { name: /waitlist/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Assign slot' }));
    expect(screen.getByRole('dialog', { name: 'Assign shower slot' })).toBeVisible();
    expect(within(screen.getByRole('dialog')).getByText('Johnny')).toBeVisible();
});
