import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import CompactShowerList from '../CompactShowerList';

// Mock dependencies
vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn((selector) => {
        const state = {
            guests: [
                { id: 'g1', name: 'John Doe', preferredName: 'Johnny' },
                { id: 'g2', name: 'Jane Smith', preferredName: '' },
            ],
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

const mockUpdateShowerStatus = vi.fn().mockResolvedValue(true);
const mockDeleteShowerRecord = vi.fn().mockResolvedValue(true);

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn((selector) => {
        const state = {
            updateShowerStatus: mockUpdateShowerStatus,
            deleteShowerRecord: mockDeleteShowerRecord,
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
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('CompactShowerList Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Empty State', () => {
        it('renders empty state when no records', () => {
            render(<CompactShowerList records={[]} />);
            expect(screen.getByText('No showers in this list')).toBeDefined();
        });

        it('shows user icon in empty state', () => {
            const { container } = render(<CompactShowerList records={[]} />);
            const svg = container.querySelector('svg');
            expect(svg).not.toBeNull();
        });
    });

    describe('Rendering Records', () => {
        const mockRecords = [
            { id: 'r1', guestId: 'g1', time: '09:00', status: 'booked' },
            { id: 'r2', guestId: 'g2', time: '10:00', status: 'done' },
        ];

        it('renders list of records', () => {
            render(<CompactShowerList records={mockRecords} />);
            expect(screen.getByText('Johnny')).toBeDefined();
            expect(screen.getByText('Jane Smith')).toBeDefined();
        });

        it('shows time slot for each record', () => {
            render(<CompactShowerList records={mockRecords} />);
            expect(screen.getByText('Slot 09:00')).toBeDefined();
            expect(screen.getByText('Slot 10:00')).toBeDefined();
        });

        it('shows status badge for each record', () => {
            render(<CompactShowerList records={mockRecords} />);
            expect(screen.getByText('booked')).toBeDefined();
            expect(screen.getByText('done')).toBeDefined();
        });

        it('shows waiver indicator for each record', () => {
            render(<CompactShowerList records={mockRecords} />);
            const waiverIndicators = screen.getAllByTestId('waiver-indicator');
            expect(waiverIndicators.length).toBe(2);
        });
    });

    describe('Guest Click Handler', () => {
        const mockRecords = [
            { id: 'r1', guestId: 'g1', time: '09:00', status: 'booked' },
        ];

        it('calls onGuestClick when record clicked', () => {
            const mockOnGuestClick = vi.fn();
            render(<CompactShowerList records={mockRecords} onGuestClick={mockOnGuestClick} />);

            fireEvent.click(screen.getByText('Johnny'));

            expect(mockOnGuestClick).toHaveBeenCalledWith('g1', 'r1');
        });

        it('has cursor-pointer when onGuestClick provided', () => {
            const mockOnGuestClick = vi.fn();
            const { container } = render(
                <CompactShowerList records={mockRecords} onGuestClick={mockOnGuestClick} />
            );

            const row = container.querySelector('.cursor-pointer');
            expect(row).not.toBeNull();
        });

        it('does not have cursor-pointer when no onGuestClick', () => {
            const { container } = render(<CompactShowerList records={mockRecords} />);

            const row = container.querySelector('.cursor-pointer');
            expect(row).toBeNull();
        });
    });

    describe('Status Styling', () => {
        it('applies emerald styling for done status', () => {
            const records = [{ id: 'r1', guestId: 'g1', time: '09:00', status: 'done' }];
            const { container } = render(<CompactShowerList records={records} />);

            const badge = container.querySelector('.bg-emerald-100');
            expect(badge).not.toBeNull();
        });

        it('applies sky styling for booked status', () => {
            const records = [{ id: 'r1', guestId: 'g1', time: '09:00', status: 'booked' }];
            const { container } = render(<CompactShowerList records={records} />);

            const badge = container.querySelector('.bg-sky-100');
            expect(badge).not.toBeNull();
        });

        it('applies amber styling for waitlisted status', () => {
            const records = [{ id: 'r1', guestId: 'g1', time: null, status: 'waitlisted' }];
            render(<CompactShowerList records={records} />);

            expect(screen.getByText('Waitlisted')).toBeDefined();
        });
    });

    describe('Unknown Guest', () => {
        it('shows "Unknown Guest" for missing guest', () => {
            const records = [{ id: 'r1', guestId: 'unknown-id', time: '09:00', status: 'booked' }];
            render(<CompactShowerList records={records} />);

            expect(screen.getByText('Unknown Guest')).toBeDefined();
        });
    });

    describe('Record Without Time', () => {
        it('handles record without time slot', () => {
            const records = [{ id: 'r1', guestId: 'g1', time: null, status: 'booked' }];
            render(<CompactShowerList records={records} />);

            expect(screen.getByText('Johnny')).toBeDefined();
            expect(screen.queryByText(/Slot/)).toBeNull();
        });
    });

    describe('Waitlisted Status Display', () => {
        it('shows clock icon for waitlisted records without queue position', () => {
            const records = [{ id: 'r1', guestId: 'g1', time: null, status: 'waitlisted' }];
            render(<CompactShowerList records={records} />);

            // Without waitlistQueueMap, shows generic "Waitlisted" label
            expect(screen.getByText('Waitlisted')).toBeDefined();
        });

        it('shows queue position number when waitlistQueueMap is provided', () => {
            const records = [
                { id: 'r1', guestId: 'g1', time: null, status: 'waitlisted' },
                { id: 'r2', guestId: 'g2', time: null, status: 'waitlisted' },
            ];
            const waitlistQueueMap = new Map([['r1', 1], ['r2', 2]]);
            render(<CompactShowerList records={records} waitlistQueueMap={waitlistQueueMap} />);

            expect(screen.getByText('#1')).toBeDefined();
            expect(screen.getByText('#2')).toBeDefined();
            expect(screen.getByText('Queue #1')).toBeDefined();
            expect(screen.getByText('Queue #2')).toBeDefined();
        });

        it('shows "Waitlisted" when record is not in waitlistQueueMap', () => {
            const records = [{ id: 'r1', guestId: 'g1', time: null, status: 'waitlisted' }];
            const waitlistQueueMap = new Map<string, number>();
            render(<CompactShowerList records={records} waitlistQueueMap={waitlistQueueMap} />);

            expect(screen.getByText('Waitlisted')).toBeDefined();
        });
    });

    describe('Time Display', () => {
        it('shows hour number for records with time', () => {
            const records = [{ id: 'r1', guestId: 'g1', time: '09:30', status: 'booked' }];
            const { container } = render(<CompactShowerList records={records} />);

            // Should show "09" from the time
            expect(screen.getByText('09')).toBeDefined();
        });
    });

    describe('Status Actions in List View', () => {
        it('shows Done button for active (booked) showers', () => {
            const records = [{ id: 'r1', guestId: 'g1', time: '09:00', status: 'booked' }];
            render(<CompactShowerList records={records} />);

            expect(screen.getByLabelText('Complete shower')).toBeDefined();
            expect(screen.getByLabelText('Cancel shower')).toBeDefined();
        });

        it('shows Reopen button for done showers', () => {
            const records = [{ id: 'r1', guestId: 'g1', time: '09:00', status: 'done' }];
            render(<CompactShowerList records={records} />);

            expect(screen.getByLabelText('Reopen shower')).toBeDefined();
        });

        it('shows Rebook button for cancelled showers', () => {
            const records = [{ id: 'r1', guestId: 'g1', time: '09:00', status: 'cancelled' }];
            render(<CompactShowerList records={records} />);

            expect(screen.getByLabelText('Rebook shower')).toBeDefined();
        });

        it('shows Rebook button for no_show showers', () => {
            const records = [{ id: 'r1', guestId: 'g1', time: '09:00', status: 'no_show' }];
            render(<CompactShowerList records={records} />);

            expect(screen.getByLabelText('Rebook shower')).toBeDefined();
        });

        it('calls updateShowerStatus when Done button is clicked', async () => {
            const records = [{ id: 'r1', guestId: 'g1', time: '09:00', status: 'booked' }];
            render(<CompactShowerList records={records} />);

            fireEvent.click(screen.getByLabelText('Complete shower'));

            await waitFor(() => {
                expect(mockUpdateShowerStatus).toHaveBeenCalledWith('r1', 'done');
            });
        });

        it('calls updateShowerStatus when Reopen button is clicked', async () => {
            const records = [{ id: 'r1', guestId: 'g1', time: '09:00', status: 'done' }];
            render(<CompactShowerList records={records} />);

            fireEvent.click(screen.getByLabelText('Reopen shower'));

            await waitFor(() => {
                expect(mockUpdateShowerStatus).toHaveBeenCalledWith('r1', 'booked');
            });
        });

        it('calls updateShowerStatus with cancelled when Cancel button is clicked and confirmed', async () => {
            vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
            const records = [{ id: 'r1', guestId: 'g1', time: '09:00', status: 'booked' }];
            render(<CompactShowerList records={records} />);

            fireEvent.click(screen.getByLabelText('Cancel shower'));

            await waitFor(() => {
                expect(mockUpdateShowerStatus).toHaveBeenCalledWith('r1', 'cancelled');
            });
        });

        it('does not call updateShowerStatus when Cancel is declined', async () => {
            vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
            const records = [{ id: 'r1', guestId: 'g1', time: '09:00', status: 'booked' }];
            render(<CompactShowerList records={records} />);

            fireEvent.click(screen.getByLabelText('Cancel shower'));

            expect(mockUpdateShowerStatus).not.toHaveBeenCalledWith('r1', 'cancelled');
        });

        it('hides action buttons when readOnly is true', () => {
            const records = [{ id: 'r1', guestId: 'g1', time: '09:00', status: 'booked' }];
            render(<CompactShowerList records={records} readOnly />);

            expect(screen.queryByLabelText('Complete shower')).toBeNull();
            expect(screen.queryByLabelText('Cancel shower')).toBeNull();
        });

        it('hides Reopen button when readOnly is true', () => {
            const records = [{ id: 'r1', guestId: 'g1', time: '09:00', status: 'done' }];
            render(<CompactShowerList records={records} readOnly />);

            expect(screen.queryByLabelText('Reopen shower')).toBeNull();
        });

        it('does not trigger onGuestClick when action button is clicked', async () => {
            const mockOnGuestClick = vi.fn();
            const records = [{ id: 'r1', guestId: 'g1', time: '09:00', status: 'booked' }];
            render(<CompactShowerList records={records} onGuestClick={mockOnGuestClick} />);

            fireEvent.click(screen.getByLabelText('Complete shower'));

            // The action button should stopPropagation, not triggering the guest click
            await waitFor(() => {
                expect(mockUpdateShowerStatus).toHaveBeenCalled();
            });
            // onGuestClick should not have been called (button stops propagation)
            expect(mockOnGuestClick).not.toHaveBeenCalled();
        });
    });
});
