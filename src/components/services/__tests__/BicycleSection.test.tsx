import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BicycleSection } from '../BicycleSection';

// Mock dependencies
vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { role: 'admin' } },
        status: 'authenticated',
    })),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn((selector) => {
        const state = {
            bicycleRecords: [
                { id: 'b1', guestId: 'g1', status: 'pending', repairType: 'flat_tire', date: '2026-01-08', createdAt: '2026-01-08T10:00:00Z' },
                { id: 'b2', guestId: 'g2', status: 'in_progress', repairType: 'brakes', date: '2026-01-08', createdAt: '2026-01-08T11:00:00Z' },
            ],
            updateBicycleRecord: vi.fn().mockResolvedValue(true),
            deleteBicycleRecord: vi.fn().mockResolvedValue(true),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn((selector) => {
        const state = {
            guests: [
                { id: 'g1', name: 'John Doe', preferredName: 'Johnny', bicycleDescription: 'Red mountain bike' },
                { id: 'g2', name: 'Jane Smith', preferredName: '', bicycleDescription: null },
            ],
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
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

describe('BicycleSection Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders component without crashing', () => {
            render(<BicycleSection />);
            expect(screen.getByText('Bicycle Repairs')).toBeDefined();
        });

        it('shows status columns', () => {
            render(<BicycleSection />);
            expect(screen.getByText('Pending')).toBeDefined();
            expect(screen.getByText('In Progress')).toBeDefined();
            expect(screen.getByText('Done')).toBeDefined();
        });

        it('shows guest names in cards', () => {
            render(<BicycleSection />);
            expect(screen.getByText('Johnny')).toBeDefined();
            expect(screen.getByText('Jane Smith')).toBeDefined();
        });

        it('shows bicycle description when available', () => {
            render(<BicycleSection />);
            expect(screen.getByText('Red mountain bike')).toBeDefined();
        });
    });

    describe('Drag and Drop', () => {
        it('renders kanban cards as draggable', () => {
            render(<BicycleSection />);
            const draggableCards = document.querySelectorAll('[draggable="true"]');
            expect(draggableCards.length).toBeGreaterThan(0);
        });

        it('cards have cursor-move class in kanban view', () => {
            render(<BicycleSection />);
            const moveCards = document.querySelectorAll('.cursor-move');
            expect(moveCards.length).toBeGreaterThan(0);
        });

        it('columns accept drag-over events', () => {
            render(<BicycleSection />);
            // Columns should exist for each status
            const columns = document.querySelectorAll('.rounded-2xl.border-2.min-h-\\[450px\\]');
            expect(columns.length).toBe(3); // pending, in_progress, done
        });
    });

    describe('View Toggle', () => {
        it('shows view toggle buttons', () => {
            render(<BicycleSection />);
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
    });

    describe('Waiver Indicators', () => {
        it('shows waiver indicators on cards', () => {
            render(<BicycleSection />);
            const indicators = screen.getAllByTestId('waiver-indicator');
            expect(indicators.length).toBeGreaterThan(0);
        });
    });
});
