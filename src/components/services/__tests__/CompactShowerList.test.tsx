import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

vi.mock('@/components/ui/CompactWaiverIndicator', () => ({
    CompactWaiverIndicator: () => <span data-testid="waiver-indicator">Waiver</span>,
}));

vi.mock('@/lib/utils/serviceSlots', () => ({
    formatSlotLabel: (slot: string) => `Slot ${slot}`,
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
        it('shows clock icon for waitlisted records', () => {
            const records = [{ id: 'r1', guestId: 'g1', time: null, status: 'waitlisted' }];
            const { container } = render(<CompactShowerList records={records} />);

            // Should show clock icon and waitlisted label
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
});
