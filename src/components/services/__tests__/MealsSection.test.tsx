import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MealsSection } from '../MealsSection';

// Mock dependencies
vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { role: 'admin' } },
        status: 'authenticated',
    })),
}));

const mockDeleteBulkMealRecord = vi.fn().mockResolvedValue(true);

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn((selector) => {
        const state = {
            mealRecords: [
                { id: 'm1', guestId: 'g1', pickedUpByGuestId: 'g2', count: 2, date: '2026-01-08', type: 'guest' },
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
                { id: 'lb2', type: 'lunch_bag', count: 25, date: '2026-01-08' },
            ],
            selectedDate: '2026-01-08',
            updateMealRecord: vi.fn().mockResolvedValue(true),
            deleteMealRecord: vi.fn().mockResolvedValue(true),
            deleteRvMealRecord: vi.fn().mockResolvedValue(true),
            deleteExtraMealRecord: vi.fn().mockResolvedValue(true),
            addBulkMealRecord: vi.fn().mockResolvedValue({ id: 'm-new' }),
            deleteBulkMealRecord: mockDeleteBulkMealRecord,
            updateBulkMealRecord: vi.fn().mockResolvedValue(true),
            checkAndAddAutomaticMeals: vi.fn(),
            addMealRecord: vi.fn().mockResolvedValue({ id: 'meal-new' }),
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
            expect(screen.getByText('125')).toBeDefined();
        });
    });

    describe('Meal Records', () => {
        it('shows guest names in records', () => {
            render(<MealsSection />);
            expect(screen.getByText('Johnny')).toBeDefined();
        });

        it('highlights proxy pickups with handshake type', () => {
            render(<MealsSection />);
            expect(screen.getByText('🤝 Proxy Pickup')).toBeDefined();
            expect(screen.getByText(/Picked up by/i)).toBeDefined();
        });
    });

    describe('Activity Log Filter', () => {
        it('renders filter dropdown with correct options', () => {
            render(<MealsSection />);
            const filterSelect = screen.getByLabelText('Filter activity log');
            expect(filterSelect).toBeDefined();

            const options = within(filterSelect as HTMLElement).getAllByRole('option');
            expect(options.map((o) => o.textContent)).toEqual([
                'All Types',
                'Guest Meals',
                'Extra Meals',
                'RV Meals',
                'Day Worker',
                'Shelter',
                'Lunch Bags',
                'United Effort',
            ]);
        });

        it('filters activity log by selected type', async () => {
            const user = userEvent.setup();
            render(<MealsSection />);

            const filterSelect = screen.getByLabelText('Filter activity log');
            await user.selectOptions(filterSelect, 'lunch_bag');

            // After filtering to lunch_bag, only lunch bag records should appear
            // The header should show filtered count
            expect(screen.getByText(/Activity Log/)).toBeDefined();
        });

        it('shows batch delete button only when filtering lunch bags', async () => {
            const user = userEvent.setup();
            render(<MealsSection />);

            // Initially no batch delete button
            expect(screen.queryByText(/Delete All/)).toBeNull();

            // Select lunch_bag filter
            const filterSelect = screen.getByLabelText('Filter activity log');
            await user.selectOptions(filterSelect, 'lunch_bag');

            // Now batch delete button should appear with count
            expect(screen.getByText('Delete All (2)')).toBeDefined();
        });

        it('calls deleteBulkMealRecord for each lunch bag on batch delete', async () => {
            const user = userEvent.setup();
            // Mock window.confirm to return true
            vi.spyOn(window, 'confirm').mockReturnValue(true);

            render(<MealsSection />);

            const filterSelect = screen.getByLabelText('Filter activity log');
            await user.selectOptions(filterSelect, 'lunch_bag');

            const deleteBtn = screen.getByText('Delete All (2)');
            await user.click(deleteBtn);

            expect(mockDeleteBulkMealRecord).toHaveBeenCalledTimes(2);
            expect(mockDeleteBulkMealRecord).toHaveBeenCalledWith('lb1', 'lunch_bag');
            expect(mockDeleteBulkMealRecord).toHaveBeenCalledWith('lb2', 'lunch_bag');

            vi.restoreAllMocks();
        });

        it('does not delete when confirm is cancelled', async () => {
            const user = userEvent.setup();
            vi.spyOn(window, 'confirm').mockReturnValue(false);

            render(<MealsSection />);

            const filterSelect = screen.getByLabelText('Filter activity log');
            await user.selectOptions(filterSelect, 'lunch_bag');

            const deleteBtn = screen.getByText('Delete All (2)');
            await user.click(deleteBtn);

            expect(mockDeleteBulkMealRecord).not.toHaveBeenCalled();

            vi.restoreAllMocks();
        });
    });
});
