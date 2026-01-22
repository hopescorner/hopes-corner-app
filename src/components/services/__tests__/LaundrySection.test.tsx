import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { LaundrySection } from '../LaundrySection';

// Mock dependencies
vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { role: 'admin' } },
        status: 'authenticated',
    })),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn(() => ({
        laundryRecords: [
            { id: 'l1', guestId: 'g1', status: 'waiting', time: '09:00-09:30', bagNumber: '1', date: '2026-01-08', laundryType: 'onsite', createdAt: '2026-01-08T09:00:00Z' },
            { id: 'l2', guestId: 'g2', status: 'washer', time: '10:00-10:30', bagNumber: '2', date: '2026-01-08', laundryType: 'onsite', createdAt: '2026-01-08T10:00:00Z' },
        ],
        updateLaundryRecord: vi.fn().mockResolvedValue(true),
        cancelMultipleLaundry: vi.fn().mockResolvedValue(true),
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
    pacificDateStringFrom: (date: string) => date ? date.slice(0, 10) : null,
    formatTimeInPacific: () => '12:00 PM',
    formatPacificTimeString: (timeStr: string) => timeStr,
}));

vi.mock('../EndServiceDayPanel', () => ({
    EndServiceDayPanel: ({ showLaundry, isAdmin }: any) => (
        showLaundry && isAdmin ? <div data-testid="end-service-panel">End Service Panel</div> : null
    ),
}));

vi.mock('../admin/SlotBlockModal', () => ({
    SlotBlockModal: () => null,
}));

describe('LaundrySection Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders component without crashing', () => {
            render(<LaundrySection />);
            const container = document.querySelector('.space-y-8');
            expect(container).not.toBeNull();
        });

        it('shows guest names in cards', () => {
            render(<LaundrySection />);
            expect(screen.getByText('Johnny')).toBeDefined();
            expect(screen.getByText('Jane Smith')).toBeDefined();
        });
    });

    describe('View Toggle', () => {
        it('shows view toggle buttons', () => {
            render(<LaundrySection />);
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
    });

    describe('Waiver Indicators', () => {
        it('shows waiver indicators', () => {
            render(<LaundrySection />);
            const indicators = screen.getAllByTestId('waiver-indicator');
            expect(indicators.length).toBeGreaterThan(0);
        });
    });

    describe('End Service Day Panel', () => {
        it('shows end service day panel for admin', () => {
            render(<LaundrySection />);
            expect(screen.getByTestId('end-service-panel')).toBeDefined();
        });
    });
});
