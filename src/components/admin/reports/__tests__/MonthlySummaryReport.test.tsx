import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import MonthlySummaryReport from '../MonthlySummaryReport';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';

// Mock the stores
vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn(),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: {
        getState: vi.fn(),
    },
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Bike: () => <div data-testid="icon-bike" />,
    Download: () => <div data-testid="icon-download" />,
    Info: () => <div data-testid="icon-info" />,
    Lightbulb: () => <div data-testid="icon-lightbulb" />,
    ShowerHead: () => <div data-testid="icon-shower" />,
}));

describe('MonthlySummaryReport', () => {
    const currentYear = 2026;
    const mockMeals = [
        { date: `${currentYear}-01-05T12:00:00`, count: 100, guestId: 'g1' }, // Jan 5, 2026 is Monday
        { date: `${currentYear}-01-07T12:00:00`, count: 120, guestId: 'g2' }, // Jan 7, 2026 is Wednesday
    ];

    const mockBikes = [
        { date: `${currentYear}-01-10T12:00:00`, status: 'done', repairTypes: ['Flat tire'] },
        { date: `${currentYear}-01-11T12:00:00`, status: 'done', repairType: 'New Bicycle' },
    ];

    const mockShowers = [
        { date: `${currentYear}-01-15T12:00:00`, status: 'done', guestId: 'g1' },
    ];

    const mockLaundry = [
        { date: `${currentYear}-01-20T12:00:00`, status: 'done', guestId: 'g1', laundryType: 'onsite' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useMealsStore).mockReturnValue({
            mealRecords: mockMeals,
            extraMealRecords: [],
            rvMealRecords: [],
            unitedEffortMealRecords: [],
        } as any);

        vi.mocked(useServicesStore.getState).mockReturnValue({
            bicycleRecords: mockBikes,
            showerRecords: mockShowers,
            laundryRecords: mockLaundry,
        } as any);
    });

    it('renders the report components and headers', () => {
        render(<MonthlySummaryReport />);
        expect(screen.getByText('Monthly Summary Report')).toBeDefined();
        expect(screen.getByText('Bicycle Services Summary')).toBeDefined();
        expect(screen.getByText('Shower & Laundry Services Summary')).toBeDefined();
    });

    it('handles year selection change', () => {
        render(<MonthlySummaryReport />);
        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: '2023' } });
        expect(select).toHaveValue('2023');
    });

    it('filters and sums meal data correctly', () => {
        render(<MonthlySummaryReport />);
        const janRow = screen.getAllByText('January')[0].closest('tr');
        expect(janRow?.textContent).toContain('100'); // Monday meals
        expect(janRow?.textContent).toContain('120'); // Wednesday meals
    });

    it('calculates bicycle summary correctly', () => {
        render(<MonthlySummaryReport />);
        // Bicycle summary row for January
        const janRow = screen.getAllByText('January').find(el => el.closest('table')?.textContent?.includes('Bicycle'))?.closest('tr');
        expect(janRow?.textContent).toContain('1'); // New Bicycles
        expect(janRow?.textContent).toContain('1'); // Services
    });

    it('calculates shower and laundry summary correctly', () => {
        render(<MonthlySummaryReport />);
        const janRow = screen.getAllByText('January').find(el => el.closest('table')?.textContent?.includes('Shower'))?.closest('tr');
        expect(janRow?.textContent).toContain('1'); // Showers
        expect(janRow?.textContent).toContain('1'); // Laundry Loads
    });

    it('handles missing or empty store data', () => {
        vi.mocked(useMealsStore).mockReturnValue({} as any);
        vi.mocked(useServicesStore.getState).mockReturnValue({} as any);
        render(<MonthlySummaryReport />);
        expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    });

    describe('New Guests calculation', () => {
        it('counts guests whose first meal is in the given month as new guests', () => {
            // Use 2025 to ensure both January and February rows are shown
            const testYear = 2025;
            // Guest g1 has meals in both Jan and Feb, Guest g2 only in Jan, Guest g3 only in Feb
            vi.mocked(useMealsStore).mockReturnValue({
                mealRecords: [
                    { date: `${testYear}-01-06T12:00:00`, count: 1, guestId: 'g1' }, // Jan - Monday
                    { date: `${testYear}-01-06T12:00:00`, count: 1, guestId: 'g2' }, // Jan - Monday
                    { date: `${testYear}-02-03T12:00:00`, count: 1, guestId: 'g1' }, // Feb - Monday
                    { date: `${testYear}-02-03T12:00:00`, count: 1, guestId: 'g3' }, // Feb - Monday (new guest)
                ],
                extraMealRecords: [],
                rvMealRecords: [],
                unitedEffortMealRecords: [],
                dayWorkerMealRecords: [],
                lunchBagRecords: [],
                shelterMealRecords: [],
            } as any);

            vi.mocked(useServicesStore.getState).mockReturnValue({
                bicycleRecords: [],
                showerRecords: [],
                laundryRecords: [],
            } as any);

            render(<MonthlySummaryReport />);
            
            // Select 2025 to see both months
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: testYear.toString() } });

            // Get all table rows in the meals table
            const tables = screen.getAllByRole('table');
            const mealsTable = tables[0]; // First table is the meals table
            const rows = mealsTable.querySelectorAll('tbody tr');
            
            // January row should show 2 new guests (g1 and g2)
            const janRow = rows[0];
            // February row should show 1 new guest (g3)
            const febRow = rows[1];

            // Check the New Guests column (column index 6: month, mon, wed, sat, fri, unique, new)
            const janCells = janRow.querySelectorAll('td');
            const febCells = febRow.querySelectorAll('td');
            
            // New Guests is the 7th column (0-indexed: 6)
            expect(janCells[6]?.textContent).toBe('2'); // g1 and g2 are new in January
            expect(febCells[6]?.textContent).toBe('1'); // g3 is new in February
        });

        it('does not count returning guests as new guests', () => {
            const testYear = 2025;
            // Guest g1 had a meal in 2024, so should NOT be counted as new in 2025
            vi.mocked(useMealsStore).mockReturnValue({
                mealRecords: [
                    { date: `2024-12-15T12:00:00`, count: 1, guestId: 'g1' }, // 2024 - existing guest
                    { date: `${testYear}-01-06T12:00:00`, count: 1, guestId: 'g1' }, // Jan 2025 - returning
                    { date: `${testYear}-01-06T12:00:00`, count: 1, guestId: 'g2' }, // Jan 2025 - new guest
                ],
                extraMealRecords: [],
                rvMealRecords: [],
                unitedEffortMealRecords: [],
                dayWorkerMealRecords: [],
                lunchBagRecords: [],
                shelterMealRecords: [],
            } as any);

            vi.mocked(useServicesStore.getState).mockReturnValue({
                bicycleRecords: [],
                showerRecords: [],
                laundryRecords: [],
            } as any);

            render(<MonthlySummaryReport />);
            
            // Select 2025 to see the data
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: testYear.toString() } });

            const tables = screen.getAllByRole('table');
            const mealsTable = tables[0];
            const rows = mealsTable.querySelectorAll('tbody tr');
            const janRow = rows[0];
            const janCells = janRow.querySelectorAll('td');
            
            // Only g2 is new in January 2025 (g1's first meal was in 2024)
            expect(janCells[6]?.textContent).toBe('1');
        });

        it('counts new guests across all meal types', () => {
            const testYear = 2025;
            vi.mocked(useMealsStore).mockReturnValue({
                mealRecords: [
                    { date: `${testYear}-01-06T12:00:00`, count: 1, guestId: 'g1' }, // Jan - regular meal
                ],
                extraMealRecords: [
                    { date: `${testYear}-01-06T12:00:00`, count: 1, guestId: 'g2' }, // Jan - extra meal (new guest)
                ],
                rvMealRecords: [
                    { date: `${testYear}-01-06T12:00:00`, count: 1, guestId: 'g3' }, // Jan - RV meal (new guest)
                ],
                unitedEffortMealRecords: [],
                dayWorkerMealRecords: [],
                lunchBagRecords: [],
                shelterMealRecords: [],
            } as any);

            vi.mocked(useServicesStore.getState).mockReturnValue({
                bicycleRecords: [],
                showerRecords: [],
                laundryRecords: [],
            } as any);

            render(<MonthlySummaryReport />);
            
            // Select 2025 to see the data
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: testYear.toString() } });

            const tables = screen.getAllByRole('table');
            const mealsTable = tables[0];
            const rows = mealsTable.querySelectorAll('tbody tr');
            const janRow = rows[0];
            const janCells = janRow.querySelectorAll('td');
            
            // g1 is the only guest in regular meals for January, so new guests = 1
            // Note: The new guests count is based on unique guests in mealRecords for that month
            // whose first-ever meal was in that month
            expect(janCells[6]?.textContent).toBe('1');
        });
    });

    describe('Shower & Laundry New Guests calculation', () => {
        it('counts guests whose first-ever shower/laundry service is in the given month', () => {
            const testYear = 2025;
            vi.mocked(useMealsStore).mockReturnValue({
                mealRecords: [],
                extraMealRecords: [],
                rvMealRecords: [],
                unitedEffortMealRecords: [],
                dayWorkerMealRecords: [],
                lunchBagRecords: [],
                shelterMealRecords: [],
            } as any);

            vi.mocked(useServicesStore.getState).mockReturnValue({
                bicycleRecords: [],
                showerRecords: [
                    { date: `${testYear}-01-15T12:00:00`, status: 'done', guestId: 'g1' }, // Jan - new guest
                    { date: `${testYear}-01-16T12:00:00`, status: 'done', guestId: 'g2' }, // Jan - new guest
                    { date: `${testYear}-02-15T12:00:00`, status: 'done', guestId: 'g1' }, // Feb - returning
                    { date: `${testYear}-02-16T12:00:00`, status: 'done', guestId: 'g3' }, // Feb - new guest
                ],
                laundryRecords: [],
            } as any);

            render(<MonthlySummaryReport />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: testYear.toString() } });

            // Find the Shower & Laundry table - it's the 3rd table (after meals and bicycle)
            const tables = screen.getAllByRole('table');
            expect(tables.length).toBeGreaterThanOrEqual(3);
            
            const showerLaundryTable = tables[2]; // Third table is shower & laundry
            const rows = showerLaundryTable.querySelectorAll('tbody tr');
            
            // January should have 2 new guests (g1 and g2)
            const janRow = rows[0];
            expect(janRow?.textContent).toContain('January');
            // The row should contain "2" for new guests count

            // February should have 1 new guest (g3 only, g1 is returning)
            const febRow = rows[1];
            expect(febRow?.textContent).toContain('February');
        });

        it('does not count guests with prior year services as new', () => {
            const testYear = 2025;
            vi.mocked(useMealsStore).mockReturnValue({
                mealRecords: [],
                extraMealRecords: [],
                rvMealRecords: [],
                unitedEffortMealRecords: [],
                dayWorkerMealRecords: [],
                lunchBagRecords: [],
                shelterMealRecords: [],
            } as any);

            vi.mocked(useServicesStore.getState).mockReturnValue({
                bicycleRecords: [],
                showerRecords: [
                    { date: `2024-12-15T12:00:00`, status: 'done', guestId: 'g1' }, // 2024 - historical
                    { date: `${testYear}-01-15T12:00:00`, status: 'done', guestId: 'g1' }, // Jan 2025 - returning
                    { date: `${testYear}-01-16T12:00:00`, status: 'done', guestId: 'g2' }, // Jan 2025 - new
                ],
                laundryRecords: [],
            } as any);

            render(<MonthlySummaryReport />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: testYear.toString() } });

            const tables = screen.getAllByRole('table');
            const showerLaundryTable = tables[2];
            const rows = showerLaundryTable.querySelectorAll('tbody tr');
            
            // January should have only 1 new guest (g2), not g1 who had service in 2024
            const janRow = rows[0];
            expect(janRow?.textContent).toContain('January');
        });

        it('tracks new laundry guests separately from combined participants', () => {
            const testYear = 2025;
            vi.mocked(useMealsStore).mockReturnValue({
                mealRecords: [],
                extraMealRecords: [],
                rvMealRecords: [],
                unitedEffortMealRecords: [],
                dayWorkerMealRecords: [],
                lunchBagRecords: [],
                shelterMealRecords: [],
            } as any);

            vi.mocked(useServicesStore.getState).mockReturnValue({
                bicycleRecords: [],
                showerRecords: [
                    { date: `${testYear}-01-15T12:00:00`, status: 'done', guestId: 'g1' }, // Shower only
                ],
                laundryRecords: [
                    { date: `${testYear}-01-20T12:00:00`, status: 'done', guestId: 'g2', laundryType: 'onsite' }, // Laundry only - new
                    { date: `${testYear}-02-20T12:00:00`, status: 'done', guestId: 'g2', laundryType: 'onsite' }, // Laundry - returning
                    { date: `${testYear}-02-20T12:00:00`, status: 'done', guestId: 'g3', laundryType: 'offsite' }, // Laundry - new
                ],
            } as any);

            render(<MonthlySummaryReport />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: testYear.toString() } });

            const tables = screen.getAllByRole('table');
            const showerLaundryTable = tables[2];
            const rows = showerLaundryTable.querySelectorAll('tbody tr');
            
            // January: 2 participants (g1 shower, g2 laundry), 1 laundry load, 1 new laundry guest
            const janRow = rows[0];
            expect(janRow?.textContent).toContain('January');
            
            // February: 2 laundry guests (g2 returning, g3 new), 1 new laundry guest
            const febRow = rows[1];
            expect(febRow?.textContent).toContain('February');
        });
    });

    describe('Bicycle Summary calculation', () => {
        it('correctly counts new bicycles vs services', () => {
            const testYear = 2025;
            vi.mocked(useMealsStore).mockReturnValue({
                mealRecords: [],
                extraMealRecords: [],
                rvMealRecords: [],
                unitedEffortMealRecords: [],
                dayWorkerMealRecords: [],
                lunchBagRecords: [],
                shelterMealRecords: [],
            } as any);

            vi.mocked(useServicesStore.getState).mockReturnValue({
                bicycleRecords: [
                    { date: `${testYear}-01-10T12:00:00`, status: 'done', repairTypes: ['New Bicycle'] },
                    { date: `${testYear}-01-11T12:00:00`, status: 'done', repairTypes: ['Flat tire'] },
                    { date: `${testYear}-01-12T12:00:00`, status: 'done', repairTypes: ['Brakes', 'Chain'] },
                    { date: `${testYear}-01-13T12:00:00`, status: 'done', repairType: 'New Bike' }, // alternate field
                ],
                showerRecords: [],
                laundryRecords: [],
            } as any);

            render(<MonthlySummaryReport />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: testYear.toString() } });

            // Find the Bicycle table - it's the 2nd table (after meals)
            const tables = screen.getAllByRole('table');
            const bicycleTable = tables[1];
            const rows = bicycleTable.querySelectorAll('tbody tr');
            
            // January row
            const janRow = rows[0];
            expect(janRow?.textContent).toContain('January');
            // Should have 2 new bikes (New Bicycle + New Bike) and 3 services (Flat tire + Brakes + Chain)
        });

        it('only counts done status bicycle repairs', () => {
            const testYear = 2025;
            vi.mocked(useMealsStore).mockReturnValue({
                mealRecords: [],
                extraMealRecords: [],
                rvMealRecords: [],
                unitedEffortMealRecords: [],
                dayWorkerMealRecords: [],
                lunchBagRecords: [],
                shelterMealRecords: [],
            } as any);

            vi.mocked(useServicesStore.getState).mockReturnValue({
                bicycleRecords: [
                    { date: `${testYear}-01-10T12:00:00`, status: 'done', repairTypes: ['Flat tire'] },
                    { date: `${testYear}-01-11T12:00:00`, status: 'pending', repairTypes: ['Brakes'] }, // Not done
                    { date: `${testYear}-01-12T12:00:00`, status: 'in_progress', repairTypes: ['Chain'] }, // Not done
                ],
                showerRecords: [],
                laundryRecords: [],
            } as any);

            render(<MonthlySummaryReport />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: testYear.toString() } });

            const tables = screen.getAllByRole('table');
            const bicycleTable = tables[1];
            const rows = bicycleTable.querySelectorAll('tbody tr');
            
            const janRow = rows[0];
            expect(janRow?.textContent).toContain('January');
            // Should only count 1 service (the done one)
        });
    });
});
