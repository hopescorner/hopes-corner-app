import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import CompactLaundryList from '../CompactLaundryList';

const mockUpdateLaundryStatus = vi.fn().mockResolvedValue(true);
const mockUpdateLaundryBagNumber = vi.fn().mockResolvedValue(true);

// Mock dependencies
vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: Object.assign(
        vi.fn(() => ({
            laundryRecords: [
                { id: 'l1', guestId: 'g1', time: '09:00-09:30', status: 'waiting', laundryType: 'onsite', date: '2026-01-08', createdAt: '2026-01-08T09:00:00Z' },
                { id: 'l2', guestId: 'g2', time: '10:00-10:30', status: 'washer', laundryType: 'onsite', date: '2026-01-08', createdAt: '2026-01-08T10:00:00Z' },
            ],
            updateLaundryStatus: mockUpdateLaundryStatus,
            updateLaundryBagNumber: mockUpdateLaundryBagNumber,
        })),
        {
            getState: vi.fn(() => ({
                laundryRecords: [
                    { id: 'l1', guestId: 'g1', time: '09:00-09:30', status: 'waiting', laundryType: 'onsite', date: '2026-01-08', createdAt: '2026-01-08T09:00:00Z' },
                    { id: 'l2', guestId: 'g2', time: '10:00-10:30', status: 'washer', laundryType: 'onsite', date: '2026-01-08', createdAt: '2026-01-08T10:00:00Z' },
                ],
                updateLaundryStatus: mockUpdateLaundryStatus,
                updateLaundryBagNumber: mockUpdateLaundryBagNumber,
            })),
        },
    ),
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn(() => ({
        guests: [
            { id: 'g1', name: 'John Doe', preferredName: 'Johnny', housingStatus: 'Unhoused' },
            { id: 'g2', name: 'Jane Smith', preferredName: '', housingStatus: 'Housed' },
        ],
    })),
}));

vi.mock('@/components/ui/CompactWaiverIndicator', () => ({
    CompactWaiverIndicator: () => <span data-testid="waiver-indicator">Waiver</span>,
}));

vi.mock('@/lib/utils/date', () => ({
    todayPacificDateString: () => '2026-01-08',
    pacificDateStringFrom: (date: string) => '2026-01-08',
    formatTimeInPacific: () => '12:00 PM',
    formatPacificTimeString: (timeStr: string) => timeStr,
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('CompactLaundryList Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders component container', () => {
            render(<CompactLaundryList />);
            const container = document.querySelector('.bg-white');
            expect(container).not.toBeNull();
        });

        it('shows waiver indicators', () => {
            render(<CompactLaundryList />);
            const indicators = screen.getAllByTestId('waiver-indicator');
            expect(indicators.length).toBeGreaterThan(0);
        });

        it('shows housing status for visible laundry guests', () => {
            render(<CompactLaundryList />);

            expect(screen.getByText('Unhoused')).toBeDefined();
            expect(screen.getByText('Housed')).toBeDefined();
        });
    });

    describe('Status Actions', () => {
        it('shows advance button for active laundry', () => {
            render(<CompactLaundryList />);
            // Waiting → Washer advance button
            const advanceButtons = screen.getAllByLabelText(/Advance to/);
            expect(advanceButtons.length).toBeGreaterThan(0);
        });

        it('shows status dropdown for active laundry', () => {
            render(<CompactLaundryList />);
            const statusDropdowns = screen.getAllByLabelText('Change laundry status');
            expect(statusDropdowns.length).toBeGreaterThan(0);
        });

        it('calls updateLaundryStatus when advance button is clicked', async () => {

            render(<CompactLaundryList />);
            // Click the first advance button (waiting → washer)
            const advanceButtons = screen.getAllByLabelText(/Advance to/);
            fireEvent.click(advanceButtons[0]);
            fireEvent.change(screen.getByLabelText('Bag number'), { target: { value: '101' } });
            fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));

            await waitFor(() => {
                expect(mockUpdateLaundryStatus).toHaveBeenCalled();
            });
            vi.restoreAllMocks();
        });

        it('calls updateLaundryStatus when status dropdown is changed', async () => {

            render(<CompactLaundryList />);
            const statusDropdowns = screen.getAllByLabelText('Change laundry status');
            fireEvent.change(statusDropdowns[0], { target: { value: 'dryer' } });
            fireEvent.change(screen.getByLabelText('Bag number'), { target: { value: '102' } });
            fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));

            await waitFor(() => {
                expect(mockUpdateLaundryStatus).toHaveBeenCalled();
            });
            vi.restoreAllMocks();
        });

        it('hides action controls when readOnly is true', () => {
            render(<CompactLaundryList readOnly />);
            expect(screen.queryByLabelText(/Advance to/)).toBeNull();
            expect(screen.queryByLabelText('Change laundry status')).toBeNull();
        });

        it('shows LaundryStatusBadge instead of controls when readOnly', () => {
            render(<CompactLaundryList readOnly />);
            // Should show the text badges instead of controls
            expect(screen.getByText('Waiting')).toBeDefined();
            expect(screen.getByText('Washer')).toBeDefined();
        });
    });

    describe('Fresh bag-number reads', () => {
        it('skips the bag prompt when the store already has a bag (stale row prop)', async () => {
            const { useServicesStore } = await import('@/stores/useServicesStore');
            // getState() returns the FRESH record with a bag number, while the
            // rendered row was built before the bag was saved.
            (useServicesStore as any).getState.mockReturnValue({
                laundryRecords: [
                    { id: 'l1', guestId: 'g1', status: 'waiting', laundryType: 'onsite', bagNumber: 'B99' },
                ],
            });
            const promptSpy = vi.spyOn(window, 'prompt');
            render(<CompactLaundryList />);
            fireEvent.click(screen.getAllByLabelText(/Advance to/)[0]);

            await waitFor(() => {
                expect(mockUpdateLaundryStatus).toHaveBeenCalledWith('l1', 'washer');
            });
            expect(promptSpy).not.toHaveBeenCalled();
            promptSpy.mockRestore();
        });
    });

    describe('List-view bag-number editing', () => {
        it('shows an Add button when a load has no bag number', () => {
            render(<CompactLaundryList />);
            const addButtons = screen.getAllByLabelText(/Add bag number for/);
            expect(addButtons.length).toBeGreaterThan(0);
            expect(screen.getAllByText('No Bag #').length).toBeGreaterThan(0);
        });

        it('saves a bag number from the list row', async () => {
            render(<CompactLaundryList />);
            fireEvent.click(screen.getAllByLabelText(/Add bag number for/)[0]);
            const input = screen.getByLabelText(/Bag number for/);
            fireEvent.change(input, { target: { value: 'B12' } });
            fireEvent.click(screen.getByLabelText(/Save bag number for/));

            await waitFor(() => {
                expect(mockUpdateLaundryBagNumber).toHaveBeenCalledWith('l1', 'B12');
            });
        });

        it('seeds the editor from the freshest store value, not a stale row prop', async () => {
            const { useServicesStore } = await import('@/stores/useServicesStore');
            (useServicesStore as any).getState.mockReturnValue({
                laundryRecords: [
                    { id: 'l1', guestId: 'g1', status: 'waiting', laundryType: 'onsite', bagNumber: 'B99' },
                    { id: 'l2', guestId: 'g2', status: 'washer', laundryType: 'onsite', bagNumber: undefined },
                ],
            });
            render(<CompactLaundryList />);
            fireEvent.click(screen.getAllByLabelText(/Add bag number for/)[0]);
            expect((screen.getByLabelText(/Bag number for/) as HTMLInputElement).value).toBe('B99');
        });

        it('shows an Edit button and saved bag when a load already has one', async () => {
            const { useServicesStore } = await import('@/stores/useServicesStore');
            const bagged = [
                { id: 'l1', guestId: 'g1', time: '09:00-09:30', status: 'waiting', laundryType: 'onsite', date: '2026-01-08', createdAt: '2026-01-08T09:00:00Z', bagNumber: 'B7' },
                { id: 'l2', guestId: 'g2', time: '10:00-10:30', status: 'washer', laundryType: 'onsite', date: '2026-01-08', createdAt: '2026-01-08T10:00:00Z', bagNumber: undefined },
            ];
            (useServicesStore as any).mockReturnValue({
                laundryRecords: bagged,
                updateLaundryStatus: mockUpdateLaundryStatus,
                updateLaundryBagNumber: mockUpdateLaundryBagNumber,
            });
            (useServicesStore as any).getState.mockReturnValue({
                laundryRecords: bagged,
                updateLaundryStatus: mockUpdateLaundryStatus,
                updateLaundryBagNumber: mockUpdateLaundryBagNumber,
            });
            render(<CompactLaundryList />);
            expect(screen.getByText('Bag #B7')).toBeDefined();
            expect(screen.getByLabelText('Edit bag number for Johnny')).toBeDefined();
        });

        it('hides Add/Edit controls when readOnly', () => {
            render(<CompactLaundryList readOnly />);
            expect(screen.queryByLabelText(/Add bag number for/)).toBeNull();
            expect(screen.queryByLabelText(/Edit bag number for/)).toBeNull();
        });

        it('does not trigger row click when editing a bag number', () => {
            const onGuestClick = vi.fn();
            render(<CompactLaundryList onGuestClick={onGuestClick} />);
            fireEvent.click(screen.getAllByLabelText(/Add bag number for/)[0]);
            expect(onGuestClick).not.toHaveBeenCalled();
        });
    });

    describe('View Date', () => {        it('handles viewDate prop', () => {
            render(<CompactLaundryList viewDate="2026-01-08" />);
            // Component should render
        });

        it('excludes past records from today view (legacy section handles those)', async () => {
            // Override the date mock so the record dates differ from today
            const dateMod = await import('@/lib/utils/date');
            const origPacific = dateMod.pacificDateStringFrom;
            // Make record dates resolve to yesterday
            vi.spyOn(dateMod, 'pacificDateStringFrom').mockImplementation(() => '2026-01-07');

            render(<CompactLaundryList />);
            // With all records from yesterday, the list should show the empty state
            expect(screen.getByText(/No laundry bookings/i)).toBeDefined();

            // Restore
            vi.mocked(dateMod.pacificDateStringFrom).mockImplementation(origPacific);
        });
    });
});
