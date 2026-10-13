import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { MealReport } from '../MealReport';
import { useMealsStore } from '@/stores/useMealsStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import * as csvUtils from '@/lib/utils/csv';
import toast from 'react-hot-toast';

// Mock the stores
vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn(),
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn(),
}));

// Mock CSV export
vi.mock('@/lib/utils/csv', () => ({
    exportToCSV: vi.fn(),
}));

// Mock hot-toast
vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock weather/headlines stores (Daily Meals & Weather table joins them by date)
vi.mock('@/stores/useWeatherStore', () => ({
    useWeatherStore: vi.fn((selector: any) => {
        const state = {
            weatherByDate: {},
            ensureLoaded: vi.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/stores/useHeadlinesStore', () => ({
    useHeadlinesStore: vi.fn((selector: any) => {
        const state = {
            headlineByDate: {},
            ensureLoaded: vi.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

// Mock Recharts to avoid issues in test environment
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: any) => <div style={{ width: '100%', height: '100%' }}>{children}</div>,
    ComposedChart: ({ children }: any) => <div>{children}</div>,
    Bar: () => <div />,
    Line: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    Legend: () => <div />,
    PieChart: ({ children }: any) => <div>{children}</div>,
    Pie: () => <div />,
    Cell: () => <div />,
}));

describe('MealReport', () => {
    const currentYear = new Date().getFullYear();
    const mockMeals = [
        { date: `${currentYear}-01-05`, count: 100, guestId: 'g1' },
    ];

    const mockGuests = [
        { id: 'g1', age: 'Adult 18-59' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useMealsStore).mockReturnValue({
            mealRecords: mockMeals,
            rvMealRecords: [],
            shelterMealRecords: [],
            unitedEffortMealRecords: [],
            extraMealRecords: [],
            dayWorkerMealRecords: [],
            lunchBagRecords: [],
        } as any);

        vi.mocked(useGuestsStore).mockReturnValue({
            guests: mockGuests,
        } as any);

        vi.useFakeTimers();
    });

    it('renders report headers and navigation', () => {
        render(<MealReport />);
        expect(screen.getByText('Meal Services Report')).toBeDefined();
    });

    it('handles month navigation', () => {
        const { container } = render(<MealReport />);
        const prevIcon = container.querySelector('.lucide-chevron-left');
        const prevButton = prevIcon?.parentElement;
        if (prevButton) fireEvent.click(prevButton);
        // Should update selected month (logic hit)
    });

    it('toggles meal types filters', () => {
        render(<MealReport />);
        const guestFilter = screen.getByText('Guest meals');
        fireEvent.click(guestFilter);
    });

    it('toggles service days', () => {
        render(<MealReport />);
        const monButton = screen.getByText('Mon');
        fireEvent.click(monButton); // Deselect Monday
    });

    it('handles CSV export', () => {
        render(<MealReport />);
        const exportButton = screen.getByText('Export CSV');
        fireEvent.click(exportButton);
        expect(csvUtils.exportToCSV).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Meal report exported successfully!');
    });

    it('handles "Current Month" button', () => {
        const { container } = render(<MealReport />);
        const prevIcon = container.querySelector('.lucide-chevron-left');
        const prevButton = prevIcon?.parentElement;
        if (prevButton) fireEvent.click(prevButton);

        const currentButton = screen.queryByText('Current');
        if (currentButton) {
            fireEvent.click(currentButton);
        }
    });

    it('clears and selects all meal types', () => {
        render(<MealReport />);
        const clearButton = screen.getByText(/clear/i);
        fireEvent.click(clearButton);

        const allButton = screen.getByText(/all/i);
        fireEvent.click(allButton);
    });

    it('renders monthly and YTD cumulative meal summary cards', () => {
        render(<MealReport />);
        expect(screen.getByText(/Year-to-Date \(YTD\) Cumulative/i)).toBeDefined();
        expect(screen.getByText('YTD Meals (Excl. Lunch Bags)')).toBeDefined();
        expect(screen.getByText('YTD Total Meals')).toBeDefined();
    });

    it('excludes lunch bags from the Daily Meals & Weather table', () => {
        // Service days filter defaults to Mon/Wed/Fri/Sat (1,3,5,6); place the
        // guest meal on such a weekday in the currently selected month.
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        let day = 1;
        while (![1, 3, 5, 6].includes(new Date(year, month, day).getDay())) day++;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        vi.mocked(useMealsStore).mockReturnValue({
            mealRecords: [{ date: dateStr, count: 10, guestId: 'g1' }],
            rvMealRecords: [],
            shelterMealRecords: [],
            unitedEffortMealRecords: [],
            extraMealRecords: [],
            dayWorkerMealRecords: [],
            lunchBagRecords: [{ date: dateStr, count: 5, guestId: 'g1' }],
        } as any);

        render(<MealReport />);
        const heading = screen.getByText('Daily Meals & Weather');
        const card = heading.closest('div');
        const rows = card?.querySelectorAll('tbody tr') ?? [];
        expect(rows.length).toBe(1);
        // 10 guest meals; the 5 lunch bags are excluded (would read 15 otherwise)
        expect(rows[0].querySelectorAll('td')[2].textContent).toBe('10');
    });
});
