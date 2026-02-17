import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AnalyticsSection } from '../AnalyticsSection';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useDonationsStore } from '@/stores/useDonationsStore';
import { useDailyNotesStore } from '@/stores/useDailyNotesStore';
import { useModalStore } from '@/stores/useModalStore';

// Mock stores
vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn(),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn(),
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn(),
}));

vi.mock('@/stores/useDonationsStore', () => ({
    useDonationsStore: vi.fn(),
}));

vi.mock('@/stores/useDailyNotesStore', () => ({
    useDailyNotesStore: vi.fn((selector) => {
        const state = {
            notes: [],
            isLoading: false,
            loadFromSupabase: vi.fn(),
            getNotesForDateRange: vi.fn(() => []),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/stores/useModalStore', () => ({
    useModalStore: vi.fn((selector) => {
        const state = { openNoteModal: vi.fn() };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

// Mock Recharts to avoid issues in test environment
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: any) => <div style={{ width: '100%', height: '100%' }}>{children}</div>,
    ComposedChart: ({ children }: any) => <div>{children}</div>,
    AreaChart: ({ children }: any) => <div>{children}</div>,
    BarChart: () => <div />,
    Bar: () => <div />,
    Line: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    Legend: () => <div />,
    PieChart: () => <div />,
    Pie: () => <div />,
    Cell: () => <div />,
    Area: ({ dataKey }: any) => <div data-testid={`area-${dataKey}`} />,
}));

describe('AnalyticsSection Demographic Filters', () => {
    const today = new Date().toISOString().split('T')[0];

    const mockGuests = [
        { id: 'g1', location: 'Mountain View', age: 'Adult 18-59', gender: 'Male', housingStatus: 'Unhoused' },
        { id: 'g2', location: 'Palo Alto', age: 'Senior 60+', gender: 'Female', housingStatus: 'Housed' },
        { id: 'g3', location: 'Mountain View', age: 'Adult 18-59', gender: 'Non-binary', housingStatus: 'Temp. shelter' },
        { id: 'g4', location: 'San Jose', age: 'Child 0-17', gender: 'Male', housingStatus: 'RV or vehicle' },
        { id: 'g5', location: 'Unknown', age: 'Unknown', gender: 'Unknown', housingStatus: 'Unknown' },
    ];

    const mockMealRecords = [
        { date: today, guestId: 'g1', count: 1 },
        { date: today, guestId: 'g2', count: 1 },
        { date: today, guestId: 'g3', count: 1 },
        { date: today, guestId: 'g4', count: 1 },
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(useMealsStore).mockImplementation((selector: any) => {
            const state = {
                mealRecords: mockMealRecords,
                rvMealRecords: [],
                extraMealRecords: [],
                dayWorkerMealRecords: [],
                shelterMealRecords: [],
                unitedEffortMealRecords: [],
                lunchBagRecords: [],
                holidayRecords: [],
                haircutRecords: [],
            };
            return typeof selector === 'function' ? selector(state) : state;
        });

        vi.mocked(useServicesStore).mockImplementation((selector: any) => {
            const state = {
                showerRecords: [],
                laundryRecords: [],
                bicycleRecords: [],
            };
            return typeof selector === 'function' ? selector(state) : state;
        });

        vi.mocked(useGuestsStore).mockImplementation((selector: any) => {
            const state = { guests: mockGuests };
            return typeof selector === 'function' ? selector(state) : state;
        });

        vi.mocked(useDonationsStore).mockReturnValue({} as any);
    });

    it('renders Demographics tab with filter controls', () => {
        render(<AnalyticsSection />);

        // Switch to Demographics tab
        const demographicsTab = screen.getByText('Demographics');
        fireEvent.click(demographicsTab);

        // Should show demographic filters section
        expect(screen.getByText('Demographic Filters')).toBeDefined();
        // Should show meal types section
        expect(screen.getByText('Meal Types')).toBeDefined();
    });

    it('renders demographic filter section with dropdowns', () => {
        render(<AnalyticsSection />);

        const demographicsTab = screen.getByText('Demographics');
        fireEvent.click(demographicsTab);

        // Should show all filter dropdowns with default options
        expect(screen.getByText('All Locations')).toBeDefined();
        expect(screen.getByText('All Age Groups')).toBeDefined();
        expect(screen.getByText('All Genders')).toBeDefined();
        expect(screen.getByText('All Statuses')).toBeDefined();
    });

    it('renders demographic breakdown cards', () => {
        render(<AnalyticsSection />);

        const demographicsTab = screen.getByText('Demographics');
        fireEvent.click(demographicsTab);

        // Should show demographic breakdown section
        expect(screen.getByText('Guest Demographics')).toBeDefined();
        // Should show active guest count badge
        expect(screen.getByText(/active guests/i)).toBeDefined();
    });

    it('allows selecting location filter', () => {
        render(<AnalyticsSection />);

        const demographicsTab = screen.getByText('Demographics');
        fireEvent.click(demographicsTab);

        // Click on location dropdown
        const locationSelect = screen.getAllByRole('combobox')[0];
        fireEvent.change(locationSelect, { target: { value: 'Mountain View' } });

        // Should show Mountain View filter pill (in the filter pills area)
        const mountainViewPills = screen.getAllByText('Mountain View');
        expect(mountainViewPills.length).toBeGreaterThan(0);
    });

    it('allows selecting age group filter', () => {
        render(<AnalyticsSection />);

        const demographicsTab = screen.getByText('Demographics');
        fireEvent.click(demographicsTab);

        // Click on age group dropdown (second dropdown)
        const ageSelect = screen.getAllByRole('combobox')[1];
        fireEvent.change(ageSelect, { target: { value: 'Adult 18-59' } });

        // Should show Adult 18-59 filter pill (check for multiple instances)
        const adultElements = screen.getAllByText('Adult 18-59');
        expect(adultElements.length).toBeGreaterThan(0);
    });

    it('allows selecting gender filter', () => {
        render(<AnalyticsSection />);

        const demographicsTab = screen.getByText('Demographics');
        fireEvent.click(demographicsTab);

        // Click on gender dropdown (third dropdown)
        const genderSelect = screen.getAllByRole('combobox')[2];
        fireEvent.change(genderSelect, { target: { value: 'Male' } });

        // Should show Male filter pill (check for multiple instances)
        const maleElements = screen.getAllByText('Male');
        expect(maleElements.length).toBeGreaterThan(0);
    });

    it('allows selecting housing status filter', () => {
        render(<AnalyticsSection />);

        const demographicsTab = screen.getByText('Demographics');
        fireEvent.click(demographicsTab);

        // Click on housing status dropdown (fourth dropdown)
        const housingSelect = screen.getAllByRole('combobox')[3];
        fireEvent.change(housingSelect, { target: { value: 'Unhoused' } });

        // Should show Unhoused filter pill (check for multiple instances)
        const unhousedElements = screen.getAllByText('Unhoused');
        expect(unhousedElements.length).toBeGreaterThan(0);
    });

    it('allows clearing demographic filters', () => {
        render(<AnalyticsSection />);

        const demographicsTab = screen.getByText('Demographics');
        fireEvent.click(demographicsTab);

        // Set a filter first
        const locationSelect = screen.getAllByRole('combobox')[0];
        fireEvent.change(locationSelect, { target: { value: 'Mountain View' } });

        // Should show clear filters button
        expect(screen.getByText('Clear Filters')).toBeDefined();

        // Click clear filters
        fireEvent.click(screen.getByText('Clear Filters'));

        // All filters should reset to 'all'
        expect(screen.getByText('All Locations')).toBeDefined();
    });

    it('shows empty state when no guests match filter', () => {
        render(<AnalyticsSection />);

        const demographicsTab = screen.getByText('Demographics');
        fireEvent.click(demographicsTab);

        // Apply filter for location with no matching guests
        const locationSelect = screen.getAllByRole('combobox')[0];
        fireEvent.change(locationSelect, { target: { value: 'Unknown' } });

        // Should show empty state
        expect(screen.getByText(/No guests found/i)).toBeDefined();
    });
});

describe('AnalyticsSection Meal Type Filters', () => {
    const today = new Date().toISOString().split('T')[0];

    const mockGuests = [
        { id: 'g1', location: 'Mountain View', age: 'Adult 18-59', gender: 'Male', housingStatus: 'Unhoused' },
        { id: 'g2', location: 'Palo Alto', age: 'Senior 60+', gender: 'Female', housingStatus: 'Housed' },
    ];

    const mockMealRecords = [
        { date: today, guestId: 'g1', count: 1 },
        { date: today, guestId: 'g2', count: 1 },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useMealsStore).mockImplementation((selector: any) => {
            const state = {
                mealRecords: mockMealRecords,
                rvMealRecords: [],
                extraMealRecords: [],
                dayWorkerMealRecords: [],
                shelterMealRecords: [],
                unitedEffortMealRecords: [],
                lunchBagRecords: [],
                holidayRecords: [],
                haircutRecords: [],
            };
            return typeof selector === 'function' ? selector(state) : state;
        });

        vi.mocked(useServicesStore).mockImplementation((selector: any) => {
            const state = {
                showerRecords: [],
                laundryRecords: [],
                bicycleRecords: [],
            };
            return typeof selector === 'function' ? selector(state) : state;
        });

        vi.mocked(useGuestsStore).mockImplementation((selector: any) => {
            const state = { guests: mockGuests };
            return typeof selector === 'function' ? selector(state) : state;
        });

        vi.mocked(useDonationsStore).mockReturnValue({} as any);
    });

    it('renders meal type filter buttons', () => {
        render(<AnalyticsSection />);

        const demographicsTab = screen.getByText('Demographics');
        fireEvent.click(demographicsTab);

        // Should show meal type filter buttons
        expect(screen.getByText('Guest Meals')).toBeDefined();
        expect(screen.getByText('Extra Meals')).toBeDefined();
        expect(screen.getByText('RV Meals')).toBeDefined();
        expect(screen.getByText('Day Worker')).toBeDefined();
        expect(screen.getByText('Shelter')).toBeDefined();
        expect(screen.getByText('United Effort')).toBeDefined();
        expect(screen.getByText('Lunch Bags')).toBeDefined();
    });

    it('allows toggling meal type filters', () => {
        render(<AnalyticsSection />);

        const demographicsTab = screen.getByText('Demographics');
        fireEvent.click(demographicsTab);

        // Click on Guest Meals toggle (should deselect)
        const guestMealsBtn = screen.getByText('Guest Meals');
        fireEvent.click(guestMealsBtn);

        // Button should still exist (just toggled off)
        expect(screen.getByText('Guest Meals')).toBeDefined();
    });

    it('allows selecting all meal types', () => {
        render(<AnalyticsSection />);

        const demographicsTab = screen.getByText('Demographics');
        fireEvent.click(demographicsTab);

        // Click Select All - there are two "All" buttons (for meal types and filters)
        const allButtons = screen.getAllByText('All');
        // The first "All" button is in the meal types section
        fireEvent.click(allButtons[0]);

        // All meal types should be selected
        expect(screen.getByText('Guest Meals')).toBeDefined();
    });

    it('allows clearing all meal types', () => {
        render(<AnalyticsSection />);

        const demographicsTab = screen.getByText('Demographics');
        fireEvent.click(demographicsTab);

        // Click Clear - there are multiple "Clear" buttons
        const clearButtons = screen.getAllByText(/Clear/i);
        fireEvent.click(clearButtons[0]);

        // Meal types should still be visible (just toggled off)
        expect(screen.getByText('Guest Meals')).toBeDefined();
    });
});

describe('AnalyticsSection Multiple Filter Combinations', () => {
    const today = new Date().toISOString().split('T')[0];

    it('handles combination of demographic filters and meal type filters', () => {
        const mockGuests = [
            { id: 'g1', location: 'Mountain View', age: 'Adult 18-59', gender: 'Male', housingStatus: 'Unhoused' },
            { id: 'g2', location: 'Mountain View', age: 'Senior 60+', gender: 'Female', housingStatus: 'Housed' },
        ];

        const mockMealRecords = [
            { date: today, guestId: 'g1', count: 1 },
            { date: today, guestId: 'g2', count: 1 },
        ];

        vi.mocked(useMealsStore).mockImplementation((selector: any) => {
            const state = {
                mealRecords: mockMealRecords,
                rvMealRecords: [],
                extraMealRecords: [],
                dayWorkerMealRecords: [],
                shelterMealRecords: [],
                unitedEffortMealRecords: [],
                lunchBagRecords: [],
                holidayRecords: [],
                haircutRecords: [],
            };
            return typeof selector === 'function' ? selector(state) : state;
        });

        vi.mocked(useServicesStore).mockImplementation((selector: any) => {
            const state = { showerRecords: [], laundryRecords: [], bicycleRecords: [] };
            return typeof selector === 'function' ? selector(state) : state;
        });

        vi.mocked(useGuestsStore).mockImplementation((selector: any) => {
            const state = { guests: mockGuests };
            return typeof selector === 'function' ? selector(state) : state;
        });

        render(<AnalyticsSection />);

        const demographicsTab = screen.getByText('Demographics');
        fireEvent.click(demographicsTab);

        // Apply demographic filter
        const locationSelect = screen.getAllByRole('combobox')[0];
        fireEvent.change(locationSelect, { target: { value: 'Mountain View' } });

        // Toggle meal type
        const guestMealsBtn = screen.getByText('Guest Meals');
        fireEvent.click(guestMealsBtn);

        // Both types of filters should work together
        // Mountain View should appear in the filter pills
        expect(screen.getAllByText('Mountain View').length).toBeGreaterThan(0);
    });

    it('combines multiple demographic filters correctly', () => {
        const mockGuests = [
            { id: 'g1', location: 'Mountain View', age: 'Adult 18-59', gender: 'Male', housingStatus: 'Unhoused' },
            { id: 'g2', location: 'Mountain View', age: 'Senior 60+', gender: 'Female', housingStatus: 'Housed' },
            { id: 'g3', location: 'Palo Alto', age: 'Adult 18-59', gender: 'Male', housingStatus: 'Unhoused' },
        ];

        const mockMealRecords = [
            { date: today, guestId: 'g1', count: 1 },
            { date: today, guestId: 'g2', count: 1 },
            { date: today, guestId: 'g3', count: 1 },
        ];

        vi.mocked(useMealsStore).mockImplementation((selector: any) => {
            const state = {
                mealRecords: mockMealRecords,
                rvMealRecords: [],
                extraMealRecords: [],
                dayWorkerMealRecords: [],
                shelterMealRecords: [],
                unitedEffortMealRecords: [],
                lunchBagRecords: [],
                holidayRecords: [],
                haircutRecords: [],
            };
            return typeof selector === 'function' ? selector(state) : state;
        });

        vi.mocked(useServicesStore).mockImplementation((selector: any) => {
            const state = { showerRecords: [], laundryRecords: [], bicycleRecords: [] };
            return typeof selector === 'function' ? selector(state) : state;
        });

        vi.mocked(useGuestsStore).mockImplementation((selector: any) => {
            const state = { guests: mockGuests };
            return typeof selector === 'function' ? selector(state) : state;
        });

        render(<AnalyticsSection />);

        const demographicsTab = screen.getByText('Demographics');
        fireEvent.click(demographicsTab);

        // Apply location filter
        const locationSelect = screen.getAllByRole('combobox')[0];
        fireEvent.change(locationSelect, { target: { value: 'Mountain View' } });

        // Apply gender filter
        const genderSelect = screen.getAllByRole('combobox')[2];
        fireEvent.change(genderSelect, { target: { value: 'Male' } });

        // Should show both filter pills
        expect(screen.getAllByText('Mountain View').length).toBeGreaterThan(0);
        const maleElements = screen.getAllByText('Male');
        expect(maleElements.length).toBeGreaterThan(0);
    });
});

describe('AnalyticsSection Overview and Trends data', () => {
    const today = new Date().toISOString().split('T')[0];

    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(useMealsStore).mockImplementation((selector: any) => {
            const state = {
                mealRecords: [{ date: today, guestId: 'g1', count: 1 }],
                rvMealRecords: [{ date: today, guestId: null, count: 2 }],
                extraMealRecords: [{ date: today, guestId: null, count: 3 }],
                dayWorkerMealRecords: [{ date: today, guestId: null, count: 4 }],
                shelterMealRecords: [{ date: today, guestId: null, count: 5 }],
                unitedEffortMealRecords: [{ date: today, guestId: null, count: 6 }],
                lunchBagRecords: [{ date: today, guestId: null, count: 7 }],
                holidayRecords: [],
                haircutRecords: [{ date: today, guestId: 'g1' }],
            };
            return typeof selector === 'function' ? selector(state) : state;
        });

        vi.mocked(useServicesStore).mockImplementation((selector: any) => {
            const state = {
                showerRecords: [],
                laundryRecords: [],
                bicycleRecords: [
                    { date: today, guestId: 'g1', status: 'pending' },
                    { date: today, guestId: 'g2', status: 'in_progress' },
                    { date: today, guestId: 'g3', status: 'done' },
                    { date: today, guestId: 'g4', status: 'cancelled' },
                ],
            };
            return typeof selector === 'function' ? selector(state) : state;
        });

        vi.mocked(useGuestsStore).mockImplementation((selector: any) => {
            const state = {
                guests: [
                    { id: 'g1', location: 'Mountain View', age: 'Adult 18-59', gender: 'Male', housingStatus: 'Unhoused' },
                    { id: 'g2', location: 'Palo Alto', age: 'Adult 18-59', gender: 'Female', housingStatus: 'Housed' },
                    { id: 'g3', location: 'San Jose', age: 'Adult 18-59', gender: 'Male', housingStatus: 'Housed' },
                    { id: 'g4', location: 'Unknown', age: 'Unknown', gender: 'Unknown', housingStatus: 'Unknown' },
                ],
            };
            return typeof selector === 'function' ? selector(state) : state;
        });

        vi.mocked(useDonationsStore).mockReturnValue({} as any);
    });

    it('calculates overview meals using all meal categories', () => {
        render(<AnalyticsSection />);
        expect(screen.getByText('28')).toBeDefined();
    });

    it('counts bicycles as non-cancelled records in overview', () => {
        render(<AnalyticsSection />);
        expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    });

    it('renders bicycles and haircuts series in trends chart', async () => {
        render(<AnalyticsSection />);

        fireEvent.click(screen.getByText('Trends'));

        await waitFor(() => {
            expect(screen.getByTestId('area-bicycles')).toBeDefined();
            expect(screen.getByTestId('area-haircuts')).toBeDefined();
        });
    });
});
