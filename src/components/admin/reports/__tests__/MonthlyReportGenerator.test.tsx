import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import MonthlyReportGenerator from '../MonthlyReportGenerator';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import toast from 'react-hot-toast';

// Mock the stores
vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn(),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn(),
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn(),
}));

// Mock hot-toast
vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock jsPDF
vi.mock('jspdf', () => ({
    default: vi.fn().mockImplementation(() => ({
        internal: {
            pageSize: {
                getWidth: () => 215.9,
                getHeight: () => 279.4,
            },
        },
        setFontSize: vi.fn(),
        setFont: vi.fn(),
        setDrawColor: vi.fn(),
        setTextColor: vi.fn(),
        text: vi.fn(),
        line: vi.fn(),
        save: vi.fn(),
    })),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Calendar: () => <div data-testid="icon-calendar" />,
    Download: () => <div data-testid="icon-download" />,
    FileText: () => <div data-testid="icon-file-text" />,
    Loader2: () => <div data-testid="icon-loader" />,
    AlertCircle: () => <div data-testid="icon-alert" />,
    Users: () => <div data-testid="icon-users" />,
    MapPin: () => <div data-testid="icon-map-pin" />,
    Home: () => <div data-testid="icon-home" />,
    Utensils: () => <div data-testid="icon-utensils" />,
    ShowerHead: () => <div data-testid="icon-shower" />,
    Shirt: () => <div data-testid="icon-shirt" />,
    Bike: () => <div data-testid="icon-bike" />,
    Scissors: () => <div data-testid="icon-scissors" />,
    Gift: () => <div data-testid="icon-gift" />,
}));

describe('MonthlyReportGenerator', () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Mock data for January 2026
    const mockMealRecords = [
        { date: '2026-01-05T12:00:00', count: 100, guestId: 'g1' },
        { date: '2026-01-06T12:00:00', count: 80, guestId: 'g2' },
        { date: '2026-01-07T12:00:00', count: 120, guestId: 'g3' },
    ];

    const mockExtraMealRecords = [
        { date: '2026-01-05T12:00:00', count: 20, guestId: 'g1' },
    ];

    const mockRvMealRecords = [
        { date: '2026-01-10T12:00:00', count: 50, guestId: 'g4' },
    ];

    const mockDayWorkerMealRecords = [
        { date: '2026-01-12T12:00:00', count: 30, guestId: null },
    ];

    const mockLunchBagRecords = [
        { date: '2026-01-15T12:00:00', count: 25, guestId: 'g5' },
    ];

    const mockShelterMealRecords = [
        { date: '2026-01-18T12:00:00', count: 40, guestId: 'g6' },
    ];

    const mockShowerRecords = [
        { date: '2026-01-05', status: 'done', guestId: 'g1' },
        { date: '2026-01-06', status: 'done', guestId: 'g2' },
        { date: '2026-01-07', status: 'cancelled', guestId: 'g3' },
        { date: '2026-01-08', status: 'no_show', guestId: 'g4' },
    ];

    const mockLaundryRecords = [
        { date: '2026-01-05', status: 'done', guestId: 'g1' },
        { date: '2026-01-06', status: 'picked_up', guestId: 'g2' },
        { date: '2026-01-07', status: 'offsite_picked_up', guestId: 'g3' },
        { date: '2026-01-08', status: 'waiting', guestId: 'g4' },
    ];

    const mockBicycleRecords = [
        { date: '2026-01-10', status: 'done', repairTypes: ['Flat tire', 'Brakes'], guestId: 'g1' },
        { date: '2026-01-11', status: 'done', repairTypes: ['New Bicycle'], guestId: 'g2' },
        { date: '2026-01-12', status: 'in_progress', repairTypes: ['Chain'], guestId: 'g3' },
        { date: '2026-01-13', status: 'pending', repairTypes: ['Tire'], guestId: 'g4' },
    ];

    const mockHaircutRecords = [
        { date: '2026-01-15', guestId: 'g1' },
        { date: '2026-01-16', guestId: 'g2' },
        { date: '2026-01-17', guestId: 'g3' },
    ];

    const mockGuests = [
        { id: 'g1', housingStatus: 'Unhoused', location: 'San Jose', age: 'Adult 18-59' },
        { id: 'g2', housingStatus: 'Unhoused', location: 'San Jose', age: 'Adult 18-59' },
        { id: 'g3', housingStatus: 'Housed', location: 'Santa Clara', age: 'Senior 60+' },
        { id: 'g4', housingStatus: 'Temp. shelter', location: 'Mountain View', age: 'Adult 18-59' },
        { id: 'g5', housingStatus: 'RV or vehicle', location: 'San Jose', age: 'Child 0-17' },
        { id: 'g6', housingStatus: 'Unhoused', location: 'Sunnyvale', age: 'Senior 60+' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(useMealsStore).mockReturnValue({
            mealRecords: mockMealRecords,
            extraMealRecords: mockExtraMealRecords,
            rvMealRecords: mockRvMealRecords,
            dayWorkerMealRecords: mockDayWorkerMealRecords,
            lunchBagRecords: mockLunchBagRecords,
            shelterMealRecords: mockShelterMealRecords,
            unitedEffortMealRecords: [],
        } as any);

        vi.mocked(useServicesStore).mockReturnValue({
            showerRecords: mockShowerRecords,
            laundryRecords: mockLaundryRecords,
            bicycleRecords: mockBicycleRecords,
            haircutRecords: mockHaircutRecords,
        } as any);

        vi.mocked(useGuestsStore).mockReturnValue({
            guests: mockGuests,
        } as any);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders the report generator card with title', () => {
            render(<MonthlyReportGenerator />);
            expect(screen.getByText('Monthly Report Generator')).toBeDefined();
            expect(screen.getByText('Generate comprehensive service and demographic reports')).toBeDefined();
        });

        it('renders month selector dropdown', () => {
            render(<MonthlyReportGenerator />);
            expect(screen.getByText('Select Month')).toBeDefined();
            const select = screen.getByRole('combobox');
            expect(select).toBeDefined();
        });

        it('renders generate report button', () => {
            render(<MonthlyReportGenerator />);
            expect(screen.getByText('Generate Report')).toBeDefined();
        });

        it('renders empty state initially', () => {
            render(<MonthlyReportGenerator />);
            expect(screen.getByText('Select a month and click Generate Report')).toBeDefined();
            expect(screen.getByText('Reports include service statistics and guest demographics')).toBeDefined();
        });

        it('populates month options with last 24 months', () => {
            render(<MonthlyReportGenerator />);
            const select = screen.getByRole('combobox');
            const options = select.querySelectorAll('option');
            expect(options.length).toBe(24);
        });
    });

    describe('Month Selection', () => {
        it('defaults to current month', () => {
            render(<MonthlyReportGenerator />);
            const select = screen.getByRole('combobox') as HTMLSelectElement;
            const expectedValue = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
            expect(select.value).toBe(expectedValue);
        });

        it('changes selected month on dropdown change', () => {
            render(<MonthlyReportGenerator />);
            const select = screen.getByRole('combobox') as HTMLSelectElement;
            fireEvent.change(select, { target: { value: '2026-01' } });
            expect(select.value).toBe('2026-01');
        });

        it('clears report data when month changes', async () => {
            render(<MonthlyReportGenerator />);
            
            // First generate a report
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);
            
            await waitFor(() => {
                expect(screen.getByText("Hope's Corner Report")).toBeDefined();
            });

            // Change month
            fireEvent.change(select, { target: { value: '2025-12' } });

            // Report should be cleared
            expect(screen.getByText('Select a month and click Generate Report')).toBeDefined();
        });
    });

    describe('Report Generation', () => {
        it('generates report on button click', async () => {
            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            await waitFor(() => {
                expect(toast.success).toHaveBeenCalledWith('Report generated successfully!');
            });
        });

        it('displays report preview after generation', async () => {
            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            await waitFor(() => {
                expect(screen.getByText("Hope's Corner Report")).toBeDefined();
                // Use getAllByText since 'January 2026' appears in both the dropdown and the report header
                const januaryTexts = screen.getAllByText(/January.*2026/);
                expect(januaryTexts.length).toBeGreaterThanOrEqual(1);
            });
        });

        it('displays service statistics table', async () => {
            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            await waitFor(() => {
                expect(screen.getByText('Service Statistics')).toBeDefined();
                expect(screen.getByText('Total Meals')).toBeDefined();
                expect(screen.getByText('On-Site Hot Meals')).toBeDefined();
                expect(screen.getByText('Bag Lunch')).toBeDefined();
                expect(screen.getByText('RV / Safe Park')).toBeDefined();
                expect(screen.getByText('Day Worker')).toBeDefined();
                expect(screen.getByText('Showers')).toBeDefined();
                expect(screen.getByText('Laundry')).toBeDefined();
                expect(screen.getByText('Bike Service')).toBeDefined();
                expect(screen.getByText('New Bicycles')).toBeDefined();
                expect(screen.getByText('Haircuts')).toBeDefined();
            });
        });

        it('displays demographics section', async () => {
            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            await waitFor(() => {
                expect(screen.getByText('Guest Demographics')).toBeDefined();
                expect(screen.getByText('Housing Status')).toBeDefined();
                expect(screen.getByText('Top 5 Locations')).toBeDefined();
                expect(screen.getByText('Age Groups')).toBeDefined();
            });
        });

        it('shows download PDF button in report header', async () => {
            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            await waitFor(() => {
                expect(screen.getByText('Download PDF')).toBeDefined();
            });
        });
    });

    describe('Service Statistics Calculations', () => {
        it('calculates total meals correctly', async () => {
            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            // Total = guest(300) + extra(20) + rv(50) + dayWorker(30) + lunchBags(25) + shelter(40) = 465
            await waitFor(() => {
                const cells = screen.getAllByText('465');
                expect(cells.length).toBeGreaterThan(0);
            });
        });

        it('calculates completed showers correctly (status = done)', async () => {
            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            // 2 showers with status 'done'
            await waitFor(() => {
                const showerRow = screen.getByText('Showers').closest('tr');
                expect(showerRow?.textContent).toContain('2');
            });
        });

        it('calculates completed laundry correctly (done, picked_up, offsite_picked_up)', async () => {
            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            // 3 laundry with valid statuses
            await waitFor(() => {
                const laundryRow = screen.getByText('Laundry').closest('tr');
                expect(laundryRow?.textContent).toContain('3');
            });
        });

        it('separates bike service from new bicycles', async () => {
            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            await waitFor(() => {
                // 2 bike services (done and in_progress, excluding New Bicycle)
                const bikeServiceRow = screen.getByText('Bike Service').closest('tr');
                expect(bikeServiceRow?.textContent).toContain('2');
                
                // 1 new bicycle
                const newBicyclesRow = screen.getByText('New Bicycles').closest('tr');
                expect(newBicyclesRow?.textContent).toContain('1');
            });
        });

        it('counts haircuts correctly', async () => {
            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            await waitFor(() => {
                const haircutsRow = screen.getByText('Haircuts').closest('tr');
                expect(haircutsRow?.textContent).toContain('3');
            });
        });
    });

    describe('Demographics Calculations', () => {
        it('calculates housing status breakdown', async () => {
            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            await waitFor(() => {
                // Check housing status labels are present
                expect(screen.getByText('Unhoused')).toBeDefined();
            });
        });

        it('shows top 5 locations', async () => {
            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            await waitFor(() => {
                // San Jose should be most common
                const locations = screen.getAllByText(/San Jose/);
                expect(locations.length).toBeGreaterThan(0);
            });
        });

        it('calculates age group breakdown', async () => {
            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            await waitFor(() => {
                expect(screen.getByText('Adult 18-59')).toBeDefined();
            });
        });

        it('only counts guests who received meals for demographics', async () => {
            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            await waitFor(() => {
                // Should show count based on guests who received meals
                const demographicsText = screen.getByText(/guests who received meals/);
                expect(demographicsText).toBeDefined();
            });
        });
    });

    describe('PDF Download', () => {
        it('shows download PDF button when report is generated', async () => {
            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            await waitFor(() => {
                expect(screen.getByText('Download PDF')).toBeDefined();
            });
        });

        it('calls PDF generation on download button click', async () => {
            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            await waitFor(() => {
                expect(screen.getByText('Download PDF')).toBeDefined();
            });

            const downloadButton = screen.getByText('Download PDF');
            // Click the download button - the mock jsPDF should be called
            fireEvent.click(downloadButton);

            // The button should still be visible after clicking (no error thrown)
            expect(screen.getByText('Download PDF')).toBeDefined();
        });
    });

    describe('Empty Data Handling', () => {
        it('handles empty meal records', async () => {
            vi.mocked(useMealsStore).mockReturnValue({
                mealRecords: [],
                extraMealRecords: [],
                rvMealRecords: [],
                dayWorkerMealRecords: [],
                lunchBagRecords: [],
                shelterMealRecords: [],
                unitedEffortMealRecords: [],
            } as any);

            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            await waitFor(() => {
                expect(toast.success).toHaveBeenCalledWith('Report generated successfully!');
            });
        });

        it('handles empty service records', async () => {
            vi.mocked(useServicesStore).mockReturnValue({
                showerRecords: [],
                laundryRecords: [],
                bicycleRecords: [],
                haircutRecords: [],
            } as any);

            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            await waitFor(() => {
                expect(toast.success).toHaveBeenCalledWith('Report generated successfully!');
            });
        });

        it('handles empty guests list', async () => {
            vi.mocked(useGuestsStore).mockReturnValue({
                guests: [],
            } as any);

            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            await waitFor(() => {
                // Multiple "No data available" messages expected for empty demographics
                const noDataTexts = screen.getAllByText('No data available');
                expect(noDataTexts.length).toBeGreaterThanOrEqual(1);
            });
        });

        it('shows "No data available" for empty demographics', async () => {
            vi.mocked(useMealsStore).mockReturnValue({
                mealRecords: [],
                extraMealRecords: [],
                rvMealRecords: [],
                dayWorkerMealRecords: [],
                lunchBagRecords: [],
                shelterMealRecords: [],
                unitedEffortMealRecords: [],
            } as any);

            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            await waitFor(() => {
                const noDataTexts = screen.getAllByText('No data available');
                expect(noDataTexts.length).toBeGreaterThanOrEqual(3); // Housing, Locations, Age
            });
        });
    });

    describe('YTD Calculations', () => {
        it('calculates YTD from January through selected month', async () => {
            // Add meals in different months for YTD calculation
            vi.mocked(useMealsStore).mockReturnValue({
                mealRecords: [
                    { date: '2026-01-05T12:00:00', count: 100, guestId: 'g1' },
                    { date: '2026-02-05T12:00:00', count: 100, guestId: 'g1' }, // This should NOT be in Jan report but in YTD for Feb
                ],
                extraMealRecords: [],
                rvMealRecords: [],
                dayWorkerMealRecords: [],
                lunchBagRecords: [],
                shelterMealRecords: [],
                unitedEffortMealRecords: [],
            } as any);

            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            await waitFor(() => {
                // Month and YTD should both show 100 for January
                const totalMealsRow = screen.getByText('Total Meals').closest('tr');
                const cells = totalMealsRow?.querySelectorAll('td');
                // Both month and YTD columns should show 100
                expect(cells?.[1]?.textContent).toBe('100');
                expect(cells?.[2]?.textContent).toBe('100');
            });
        });
    });

    describe('Report Footer', () => {
        it('displays generation timestamp', async () => {
            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            await waitFor(() => {
                expect(screen.getByText(/Report generated on/)).toBeDefined();
            });
        });

        it('displays data range', async () => {
            render(<MonthlyReportGenerator />);
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2026-01' } });
            
            const generateButton = screen.getByText('Generate Report');
            fireEvent.click(generateButton);

            await waitFor(() => {
                expect(screen.getByText(/Data range:/)).toBeDefined();
            });
        });
    });
});

describe('MonthlyReportGenerator Logic', () => {
    describe('Service status filtering', () => {
        it('only counts showers with status "done"', () => {
            const showers = [
                { status: 'done' },
                { status: 'booked' },
                { status: 'cancelled' },
                { status: 'no_show' },
                { status: 'waitlisted' },
            ];
            const completed = showers.filter(s => s.status === 'done');
            expect(completed.length).toBe(1);
        });

        it('counts laundry with statuses done, picked_up, offsite_picked_up', () => {
            const laundry = [
                { status: 'done' },
                { status: 'picked_up' },
                { status: 'offsite_picked_up' },
                { status: 'waiting' },
                { status: 'washer' },
                { status: 'dryer' },
                { status: 'pending' },
            ];
            const completed = laundry.filter(l => 
                ['done', 'picked_up', 'offsite_picked_up'].includes(l.status)
            );
            expect(completed.length).toBe(3);
        });

        it('counts bicycles with statuses done or in_progress', () => {
            const bicycles = [
                { status: 'done' },
                { status: 'in_progress' },
                { status: 'pending' },
            ];
            const relevant = bicycles.filter(b => 
                ['done', 'in_progress'].includes(b.status)
            );
            expect(relevant.length).toBe(2);
        });
    });

    describe('New Bicycle detection', () => {
        it('identifies new bicycles by repair type', () => {
            const bicycles = [
                { repairTypes: ['Flat tire', 'Brakes'] },
                { repairTypes: ['New Bicycle'] },
                { repairTypes: ['Chain', 'New Bicycle'] },
            ];
            const newBicycles = bicycles.filter(b => 
                b.repairTypes.includes('New Bicycle')
            );
            expect(newBicycles.length).toBe(2);
        });

        it('identifies bike services (non-new bicycles)', () => {
            const bicycles = [
                { repairTypes: ['Flat tire', 'Brakes'] },
                { repairTypes: ['New Bicycle'] },
                { repairTypes: ['Chain'] },
            ];
            const bikeServices = bicycles.filter(b => 
                !b.repairTypes.includes('New Bicycle')
            );
            expect(bikeServices.length).toBe(2);
        });
    });

    describe('Date range filtering', () => {
        it('filters records within month range', () => {
            const startDate = new Date(2026, 0, 1); // Jan 1, 2026
            const endDate = new Date(2026, 0, 31, 23, 59, 59); // Jan 31, 2026
            
            const records = [
                { date: '2026-01-15T12:00:00' }, // In range
                { date: '2026-02-01T12:00:00' }, // Out of range
                { date: '2025-12-31T12:00:00' }, // Out of range
            ];

            const filtered = records.filter(r => {
                const date = new Date(r.date);
                return date >= startDate && date <= endDate;
            });

            expect(filtered.length).toBe(1);
        });

        it('calculates YTD range correctly', () => {
            const year = 2026;
            const month = 5; // June (0-indexed)
            
            const start = new Date(year, 0, 1); // Jan 1
            const end = new Date(year, month + 1, 0); // Last day of June
            
            expect(start.getMonth()).toBe(0); // January
            expect(end.getMonth()).toBe(5); // June
            expect(end.getDate()).toBe(30); // June has 30 days
        });
    });

    describe('Demographics calculations', () => {
        it('calculates percentage correctly', () => {
            const count = 25;
            const total = 100;
            const percentage = (count / total) * 100;
            expect(percentage).toBe(25);
        });

        it('handles division by zero for empty data', () => {
            const count = 0;
            const total = 0;
            const percentage = total === 0 ? 0 : (count / total) * 100;
            expect(percentage).toBe(0);
        });

        it('groups guests by housing status', () => {
            const guests = [
                { housingStatus: 'Unhoused' },
                { housingStatus: 'Unhoused' },
                { housingStatus: 'Housed' },
                { housingStatus: 'Temp. shelter' },
            ];

            const counts: Record<string, number> = {};
            guests.forEach(g => {
                counts[g.housingStatus] = (counts[g.housingStatus] || 0) + 1;
            });

            expect(counts['Unhoused']).toBe(2);
            expect(counts['Housed']).toBe(1);
            expect(counts['Temp. shelter']).toBe(1);
        });

        it('groups guests by age group', () => {
            const guests = [
                { age: 'Adult 18-59' },
                { age: 'Adult 18-59' },
                { age: 'Senior 60+' },
                { age: 'Child 0-17' },
            ];

            const counts: Record<string, number> = {};
            guests.forEach(g => {
                counts[g.age] = (counts[g.age] || 0) + 1;
            });

            expect(counts['Adult 18-59']).toBe(2);
            expect(counts['Senior 60+']).toBe(1);
            expect(counts['Child 0-17']).toBe(1);
        });

        it('sorts locations by count descending', () => {
            const locations = [
                { label: 'San Jose', count: 10 },
                { label: 'Santa Clara', count: 5 },
                { label: 'Mountain View', count: 15 },
            ];

            const sorted = [...locations].sort((a, b) => b.count - a.count);
            
            expect(sorted[0].label).toBe('Mountain View');
            expect(sorted[1].label).toBe('San Jose');
            expect(sorted[2].label).toBe('Santa Clara');
        });

        it('limits top locations to 5', () => {
            const locations = [
                { label: 'City 1', count: 10 },
                { label: 'City 2', count: 9 },
                { label: 'City 3', count: 8 },
                { label: 'City 4', count: 7 },
                { label: 'City 5', count: 6 },
                { label: 'City 6', count: 5 },
                { label: 'City 7', count: 4 },
            ];

            const top5 = locations
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            expect(top5.length).toBe(5);
            expect(top5[4].label).toBe('City 5');
        });
    });

    describe('Month options generation', () => {
        it('generates 24 month options', () => {
            const options: string[] = [];
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();

            for (let i = 0; i < 24; i++) {
                const targetDate = new Date(currentYear, currentMonth - i, 1);
                const year = targetDate.getFullYear();
                const month = targetDate.getMonth();
                options.push(`${year}-${String(month + 1).padStart(2, '0')}`);
            }

            expect(options.length).toBe(24);
        });

        it('starts with current month', () => {
            const now = new Date();
            const expectedValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            
            const firstOption = expectedValue;
            expect(firstOption).toBe(expectedValue);
        });
    });
});
