import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import CompactLaundryList from '../CompactLaundryList';

// Mock dependencies
vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn(() => ({
        laundryRecords: [
            { id: 'l1', guestId: 'g1', time: '09:00-09:30', status: 'waiting', laundryType: 'onsite', date: '2026-01-08', createdAt: '2026-01-08T09:00:00Z' },
            { id: 'l2', guestId: 'g2', time: '10:00-10:30', status: 'washer', laundryType: 'onsite', date: '2026-01-08', createdAt: '2026-01-08T10:00:00Z' },
        ],
    })),
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn(() => ({
        guests: [
            { id: 'g1', name: 'John Doe', preferredName: 'Johnny' },
            { id: 'g2', name: 'Jane Smith', preferredName: '' },
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
    });

    describe('Status Badges', () => {
        it('shows waiting status', () => {
            render(<CompactLaundryList />);
            expect(screen.getByText('Waiting')).toBeDefined();
        });

        it('shows washer status', () => {
            render(<CompactLaundryList />);
            expect(screen.getByText('Washer')).toBeDefined();
        });
    });

    describe('View Date', () => {
        it('handles viewDate prop', () => {
            render(<CompactLaundryList viewDate="2026-01-08" />);
            // Component should render
        });
    });
});
