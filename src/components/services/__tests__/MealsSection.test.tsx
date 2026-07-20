import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
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
const mockAddMealRecord = vi.fn().mockResolvedValue({ id: 'meal-new' });
const mockUpdateAutoMealAdditionsEnabled = vi.fn().mockResolvedValue(undefined);
const mockLoadSettings = vi.fn().mockResolvedValue(undefined);
let mockAutoMealAdditionsEnabled = true;
let mockMealsDataIsLoaded = true;
let mockMealRecords: Array<{
    id: string;
    guestId: string;
    pickedUpByGuestId?: string | null;
    count: number;
    date: string;
    type: string;
}> = [
    { id: 'm1', guestId: 'g1', pickedUpByGuestId: 'g2', count: 2, date: '2026-01-08', type: 'guest' },
];
let mockShelterMealRecords: Array<{
    id: string;
    count: number;
    date: string;
    type: string;
}> = [];

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn((selector) => {
        const state = {
            isLoaded: mockMealsDataIsLoaded,
            mealRecords: mockMealRecords,
            extraMealRecords: [],
            rvMealRecords: [
                { id: 'rv1', type: 'rv_delivery', count: 50, date: '2026-01-08' },
            ],
            shelterMealRecords: mockShelterMealRecords,
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
            addMealRecord: mockAddMealRecord,
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

vi.mock('@/stores/useSettingsStore', () => ({
    useSettingsStore: vi.fn((selector) => {
        const state = {
            autoMealAdditionsEnabled: mockAutoMealAdditionsEnabled,
            updateAutoMealAdditionsEnabled: mockUpdateAutoMealAdditionsEnabled,
            loadSettings: mockLoadSettings,
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/lib/utils/date', () => ({
    todayPacificDateString: () => '2026-01-08',
    pacificDateStringFrom: (date: string) => date ? date.slice(0, 10) : null,
    formatTimeInPacific: () => '12:00 PM',
    formatPacificTimeString: (timeStr: string) => timeStr,
    parsePacificDateParts: (dateStr: string) => {
        const d = new Date(dateStr + 'T12:00:00');
        return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), dayOfWeek: d.getDay() };
    },
}));

describe('MealsSection Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAutoMealAdditionsEnabled = true;
        mockMealsDataIsLoaded = true;
        mockMealRecords = [
            { id: 'm1', guestId: 'g1', pickedUpByGuestId: 'g2', count: 2, date: '2026-01-08', type: 'guest' },
        ];
        mockShelterMealRecords = [];
        mockUpdateAutoMealAdditionsEnabled.mockResolvedValue(undefined);
        mockLoadSettings.mockResolvedValue(undefined);
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

        it('renders the meal automation switch', () => {
            render(<MealsSection />);

            expect(screen.getByRole('switch', { name: 'Automatic RV, lunch bag, and day worker additions' })).toBeDefined();
            expect(screen.getByText('Meal Automation')).toBeDefined();
        });
    });

    describe('Meal Automation Toggle', () => {
        it('calls settings store when pausing automatic RV, lunch bag, and day worker additions', async () => {
            const user = userEvent.setup();
            render(<MealsSection />);

            await user.click(screen.getByRole('switch', { name: 'Automatic RV, lunch bag, and day worker additions' }));

            expect(mockUpdateAutoMealAdditionsEnabled).toHaveBeenCalledWith(false);
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

        it('displays only shelter meals from the selected date', () => {
            mockShelterMealRecords = [
                { id: 'shelter-selected', type: 'shelter', count: 7, date: '2026-01-08' },
                { id: 'shelter-other-date', type: 'shelter', count: 382, date: '2026-01-03' },
            ];

            render(<MealsSection />);

            const shelterStat = screen.getByLabelText('Shelter icon').closest('div');
            expect(shelterStat).not.toBeNull();
            expect(within(shelterStat as HTMLElement).getByText('7')).toBeDefined();
            expect(within(shelterStat as HTMLElement).queryByText('389')).toBeNull();
        });

        it('shows professional icons in meal summary cards', () => {
            render(<MealsSection />);

            [
                'Total Meals icon',
                'Guest Meals icon',
                'Proxy Pickups icon',
                'Lunch Bags icon',
                'Proxy Pickers icon',
                'Self Meals icon',
                'Collective Pickups icon',
                'Extra icon',
                'RV icon',
                'Day Worker icon',
                'Shelter icon',
                'United Effort icon',
            ].forEach((label) => {
                expect(screen.getByLabelText(label)).toBeDefined();
            });
        });

        it('shows proxy picker count, self meals and collective pickups', () => {
            mockMealRecords = [
                { id: 'm1', guestId: 'g1', pickedUpByGuestId: 'g2', count: 2, date: '2026-01-08', type: 'guest' },
                { id: 'm2', guestId: 'g2', pickedUpByGuestId: null, count: 3, date: '2026-01-08', type: 'guest' },
            ];

            render(<MealsSection />);

            // 1 picker (g2), 2 collective pickups, 3 self meals, 40% of 5 guest meals
            expect(screen.getByText('1 person picked up 2 meals for others')).toBeDefined();
            expect(screen.getByText('3 meals also collected for themselves · 40% of guest meals.')).toBeDefined();
            expect(screen.getByText('Proxy Pickers')).toBeDefined();
            expect(screen.getByText('Self Meals')).toBeDefined();
            expect(screen.getByText('Collective Pickups')).toBeDefined();
        });

        it('tracks multiple proxy pickers in a single day', () => {
            mockMealRecords = [
                { id: 'm1', guestId: 'g1', pickedUpByGuestId: 'g2', count: 2, date: '2026-01-08', type: 'guest' },
                { id: 'm2', guestId: 'g2', pickedUpByGuestId: 'g1', count: 1, date: '2026-01-08', type: 'guest' },
            ];

            render(<MealsSection />);

            // 2 pickers (g1 and g2), 3 collective pickups, 3 self meals (each picker has self meal as recipient)
            expect(screen.getByText('2 people picked up 3 meals for others')).toBeDefined();
        });

        it('shows "No proxy pickups" empty state when no proxy records exist', () => {
            mockMealRecords = [
                { id: 'm1', guestId: 'g1', pickedUpByGuestId: null, count: 2, date: '2026-01-08', type: 'guest' },
            ];

            render(<MealsSection />);

            expect(screen.getByText('No proxy pickups logged for this date.')).toBeDefined();
        });

        it('shows a loading placeholder instead of the empty state while meals data has not finished loading', () => {
            mockMealsDataIsLoaded = false;
            mockMealRecords = [
                { id: 'm1', guestId: 'g1', pickedUpByGuestId: null, count: 2, date: '2026-01-08', type: 'guest' },
            ];

            render(<MealsSection />);

            expect(screen.getByText('Loading pickup activity…')).toBeDefined();
            expect(screen.queryByText('No proxy pickups logged for this date.')).toBeNull();
        });
    });

    describe('Meal Records', () => {
        it('shows guest names in records', () => {
            render(<MealsSection />);
            expect(screen.getByText('Johnny')).toBeDefined();
        });

        it('highlights proxy pickups with handshake type', () => {
            render(<MealsSection />);
            expect(screen.getByText('Proxy Pickup')).toBeDefined();
            expect(screen.queryByText('\u{1F91D} Proxy Pickup')).toBeNull();
            expect(screen.getByText('Picked up by Jane Smith')).toBeDefined();
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

    describe('Individual Meal Limit Pre-check', () => {
        it('blocks adding a meal for a guest already at the base meal limit without calling the store', async () => {
            // g1 has count: 2 meals on 2026-01-08 (at the MAX_BASE_MEALS_PER_DAY limit)
            const user = userEvent.setup();
            render(<MealsSection />);

            // Open the add panel
            const addBtn = screen.getByText('Add Bulk Meals');
            await user.click(addBtn);

            // Scope to the Individual Meal Entry section
            const individualSection = screen.getByText('Individual Meal Entry').closest('div')!;

            // Select guest g1 (Johnny) who already has 2 meals
            const guestSelect = within(individualSection).getByDisplayValue('Select guest');
            await user.selectOptions(guestSelect, 'g1');

            // Click the add button inside the individual section
            const submitBtn = within(individualSection).getByRole('button', { name: /add/i });
            await user.click(submitBtn);

            // Should show a specific error toast, NOT call the store
            expect(toast.error).toHaveBeenCalledWith(
                'Guest already has 2 base meals today (max 2)'
            );
            expect(mockAddMealRecord).not.toHaveBeenCalled();
        });

        it('allows adding a meal for a guest with 0 meals', async () => {
            // g2 (Jane Smith) has no meal records → count = 0
            const user = userEvent.setup();
            render(<MealsSection />);

            const addBtn = screen.getByText('Add Bulk Meals');
            await user.click(addBtn);

            const individualSection = screen.getByText('Individual Meal Entry').closest('div')!;
            const guestSelect = within(individualSection).getByDisplayValue('Select guest');
            await user.selectOptions(guestSelect, 'g2');

            const submitBtn = within(individualSection).getByRole('button', { name: /add/i });
            await user.click(submitBtn);

            expect(toast.error).not.toHaveBeenCalled();
            expect(mockAddMealRecord).toHaveBeenCalledWith('g2', 1, null, '2026-01-08');
        });

        it('surfaces specific error message when store addMealRecord throws', async () => {
            mockAddMealRecord.mockRejectedValueOnce(new Error('Guest already has 2 base meals today (max 2)'));
            const user = userEvent.setup();
            render(<MealsSection />);

            const addBtn = screen.getByText('Add Bulk Meals');
            await user.click(addBtn);

            const individualSection = screen.getByText('Individual Meal Entry').closest('div')!;
            const guestSelect = within(individualSection).getByDisplayValue('Select guest');
            await user.selectOptions(guestSelect, 'g2');

            const submitBtn = within(individualSection).getByRole('button', { name: /add/i });
            await user.click(submitBtn);

            expect(toast.error).toHaveBeenCalledWith(
                'Guest already has 2 base meals today (max 2)'
            );
        });
    });
});
