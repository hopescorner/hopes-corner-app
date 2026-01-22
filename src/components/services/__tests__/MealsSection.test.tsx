import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MealsSection } from '../MealsSection';

// Mock dependencies
vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { role: 'admin' } },
        status: 'authenticated',
    })),
}));

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn((selector) => {
        const state = {
            mealRecords: [
                { id: 'm1', guestId: 'g1', count: 2, date: '2026-01-08', type: 'guest', proxyId: null },
            ],
            extraMealRecords: [],
            rvMealRecords: [
                { id: 'rv1', type: 'rv_delivery', count: 50, date: '2026-01-08' },
            ],
            shelterMealRecords: [],
            dayWorkerMealRecords: [],
            unitedEffortMealRecords: [],
            lunchBagRecords: [
                { id: 'lb1', type: 'lunch_bag', count: 100, date: '2026-01-08' },
            ],
            selectedDate: '2026-01-08',
            updateMealRecord: vi.fn().mockResolvedValue(true),
            deleteMealRecord: vi.fn().mockResolvedValue(true),
            deleteRvMealRecord: vi.fn().mockResolvedValue(true),
            deleteExtraMealRecord: vi.fn().mockResolvedValue(true),
            addBulkMealRecord: vi.fn().mockResolvedValue({ id: 'm-new' }),
            deleteBulkMealRecord: vi.fn().mockResolvedValue(true),
            updateBulkMealRecord: vi.fn().mockResolvedValue(true),
            checkAndAddAutomaticMeals: vi.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

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

vi.mock('@/lib/utils/date', () => ({
    todayPacificDateString: () => '2026-01-08',
    pacificDateStringFrom: (date: string) => date ? date.slice(0, 10) : null,
    formatTimeInPacific: () => '12:00 PM',
    formatPacificTimeString: (timeStr: string) => timeStr,
}));

describe('MealsSection Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders component without crashing', () => {
            render(<MealsSection />);
            // Use heading to be more specific, or verify container if text is split
            expect(screen.getByRole('heading', { level: 2 })).toBeDefined();
        });

        it('shows date navigation buttons', () => {
            render(<MealsSection />);
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
    });

    describe('Statistics Display', () => {
        it('displays RV meals count', () => {
            render(<MealsSection />);
            expect(screen.getByText('50')).toBeDefined();
        });

        it('displays lunch bag count', () => {
            render(<MealsSection />);
            expect(screen.getByText('100')).toBeDefined();
        });
    });

    describe('Meal Records', () => {
        it('shows guest names in records', () => {
            render(<MealsSection />);
            expect(screen.getByText('Johnny')).toBeDefined();
        });
    });
});
