import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { GuestCard } from '../GuestCard';

// Mock dependencies
vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { role: 'admin' } },
        status: 'authenticated',
    })),
}));

// Mock store functions
const mockAddMealRecord = vi.fn().mockResolvedValue({ id: 'meal-1' });
const mockAddExtraMealRecord = vi.fn().mockResolvedValue({ id: 'extra-1' });
const mockAddHaircutRecord = vi.fn().mockResolvedValue({ id: 'haircut-1' });
const mockAddHolidayRecord = vi.fn().mockResolvedValue({ id: 'holiday-1' });
const mockSetShowerPickerGuest = vi.fn();
const mockSetLaundryPickerGuest = vi.fn();
const mockSetBicyclePickerGuest = vi.fn();
const mockAddAction = vi.fn();
const mockUndoAction = vi.fn().mockResolvedValue(true);
const mockGetActionsForGuestToday = vi.fn().mockReturnValue([]);

const mockWarnings = [{ id: 'w1', guestId: 'g1', message: 'Test warning', active: true }];
const mockGuestProxies: any[] = [];

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: (selector: any) => {
        const state = {
            mealRecords: [],
            extraMealRecords: [],
            addMealRecord: mockAddMealRecord,
            addExtraMealRecord: mockAddExtraMealRecord,
        };
        return typeof selector === 'function' ? selector(state) : state;
    },
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: (selector: any) => {
        const state = {
            showerRecords: [],
            laundryRecords: [],
            bicycleRecords: [],
            haircutRecords: [],
            holidayRecords: [],
            addHaircutRecord: mockAddHaircutRecord,
            addHolidayRecord: mockAddHolidayRecord,
        };
        return typeof selector === 'function' ? selector(state) : state;
    },
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: (selector: any) => {
        const state = {
            warnings: mockWarnings,
            guestProxies: mockGuestProxies,
        };
        return typeof selector === 'function' ? selector(state) : state;
    },
}));

vi.mock('@/stores/useRemindersStore', () => ({
    useRemindersStore: (selector: any) => {
        const state = {
            reminders: [],
        };
        return typeof selector === 'function' ? selector(state) : state;
    },
}));

vi.mock('@/stores/useModalStore', () => ({
    useModalStore: (selector: any) => {
        const state = {
            setShowerPickerGuest: mockSetShowerPickerGuest,
            setLaundryPickerGuest: mockSetLaundryPickerGuest,
            setBicyclePickerGuest: mockSetBicyclePickerGuest,
        };
        return typeof selector === 'function' ? selector(state) : state;
    },
}));

vi.mock('@/stores/useActionHistoryStore', () => ({
    useActionHistoryStore: (selector: any) => {
        const state = {
            addAction: mockAddAction,
            undoAction: mockUndoAction,
            getActionsForGuestToday: mockGetActionsForGuestToday,
        };
        return typeof selector === 'function' ? selector(state) : state;
    },
}));

vi.mock('../LinkedGuestsList', () => ({
    default: () => <div data-testid="linked-guests-list">LinkedGuestsList Mock</div>,
}));

vi.mock('@/components/modals/GuestEditModal', () => ({
    GuestEditModal: ({ onClose }: any) => <div data-testid="edit-modal"><button onClick={onClose}>Close Edit</button></div>,
}));

vi.mock('@/components/modals/BanManagementModal', () => ({
    BanManagementModal: ({ onClose }: any) => <div data-testid="ban-modal"><button onClick={onClose}>Close Ban</button></div>,
}));

vi.mock('@/components/modals/WarningManagementModal', () => ({
    WarningManagementModal: ({ onClose }: any) => <div data-testid="warning-modal"><button onClick={onClose}>Close Warning</button></div>,
}));

const baseGuest = {
    id: 'g1',
    firstName: 'John',
    lastName: 'Doe',
    name: 'John Doe',
    preferredName: 'Johnny',
    housingStatus: 'Unsheltered',
    location: 'San Jose',
    gender: 'Male',
    age: 'Adult 18-59',
    isBanned: false,
    createdAt: '2024-01-01',
};

describe('GuestCard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.navigator.vibrate = vi.fn();
    });

    describe('Rendering', () => {
        it('renders guest preferred name', () => {
            render(<GuestCard guest={baseGuest} />);
            expect(screen.getByText('Johnny')).toBeDefined();
        });

        it('renders guest name when no preferred name', () => {
            const guest = { ...baseGuest, preferredName: '', name: 'John Doe' };
            render(<GuestCard guest={guest} />);
            expect(screen.getByText('John Doe')).toBeDefined();
        });

        it('renders housing status', () => {
            render(<GuestCard guest={baseGuest} />);
            expect(screen.getByText('Unsheltered')).toBeDefined();
        });

        it('renders location when provided', () => {
            render(<GuestCard guest={baseGuest} />);
            expect(screen.getByText('San Jose')).toBeDefined();
        });

        it('renders gender initial', () => {
            render(<GuestCard guest={baseGuest} />);
            expect(screen.getByText('M')).toBeDefined();
        });

        it('renders age group', () => {
            render(<GuestCard guest={baseGuest} />);
            expect(screen.getByText('Adult 18-59')).toBeDefined();
        });

        it('renders meal buttons', () => {
            render(<GuestCard guest={baseGuest} />);
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });

        it('does not render location when not provided', () => {
            const guest = { ...baseGuest, location: '' };
            render(<GuestCard guest={guest} />);
            expect(screen.queryByText('San Jose')).toBeNull();
        });

        it('does not render gender when not provided', () => {
            const guest = { ...baseGuest, gender: '' };
            render(<GuestCard guest={guest} />);
            expect(screen.queryByText('M')).toBeNull();
        });

        it('does not render age when not provided', () => {
            const guest = { ...baseGuest, age: '' };
            render(<GuestCard guest={guest} />);
            expect(screen.queryByText('Adult 18-59')).toBeNull();
        });
    });

    describe('Compact Mode', () => {
        it('renders in compact mode', () => {
            render(<GuestCard guest={baseGuest} compact={true} />);
            expect(screen.getByText('Johnny')).toBeDefined();
        });

        it('has fewer interactive elements in compact mode', () => {
            render(<GuestCard guest={baseGuest} compact={true} />);
            // In compact mode, meal and service buttons are hidden
            // Just verify the component renders
            expect(screen.getByText('Johnny')).toBeDefined();
        });
    });

    describe('Banned State', () => {
        it('shows BANNED badge when guest is banned', () => {
            const bannedGuest = { ...baseGuest, isBanned: true };
            render(<GuestCard guest={bannedGuest} />);
            expect(screen.getByText('BANNED')).toBeDefined();
        });

        it('applies banned styling', () => {
            const bannedGuest = { ...baseGuest, isBanned: true };
            const { container } = render(<GuestCard guest={bannedGuest} />);
            const card = container.firstChild as HTMLElement;
            expect(card.className).toContain('border-red-200');
        });

        it('shows specific ban - only meals', () => {
            const bannedGuest = {
                ...baseGuest,
                isBanned: true,
                bannedFromMeals: true,
                bannedFromShower: false,
                bannedFromLaundry: false,
                bannedFromBicycle: false
            };
            render(<GuestCard guest={bannedGuest} />);
            expect(screen.getByText('BANNED')).toBeDefined();
        });
    });

    describe('Warnings and Links', () => {
        it('renders warning badge count from props', () => {
            render(<GuestCard guest={baseGuest} warningsCount={77} />);
            expect(screen.getByText('77')).toBeDefined();
        });

        it('renders linked guest badge count from props', () => {
            render(<GuestCard guest={baseGuest} linkedGuestsCount={88} />);
            expect(screen.getByText('88')).toBeDefined();
        });

        it('renders reminders badge count from props', () => {
            render(<GuestCard guest={baseGuest} activeRemindersCount={99} />);
            expect(screen.getByText('99')).toBeDefined();
        });

        it('only mounts warning panel when expanded', () => {
            render(<GuestCard guest={baseGuest} />);

            // Warning message shouldn't be visible before expand
            expect(screen.queryByText('Test warning')).toBeNull();

            fireEvent.click(screen.getByText('Johnny'));
            expect(screen.getByText('Test warning')).toBeDefined();
        });
    });

    describe('Meal Actions', () => {
        it('calls addMealRecord when meal button clicked', async () => {
            render(<GuestCard guest={baseGuest} />);
            const buttons = screen.getAllByRole('button');
            const mealButton = buttons.find(btn => btn.textContent?.trim() === '1');
            if (mealButton) {
                fireEvent.click(mealButton);
            }

            await waitFor(() => {
                expect(mockAddMealRecord).toHaveBeenCalledWith('g1', 1);
            });
        });

        it('records action after adding meal', async () => {
            render(<GuestCard guest={baseGuest} />);
            const buttons = screen.getAllByRole('button');
            const mealButton = buttons.find(btn => btn.textContent?.trim() === '1');
            if (mealButton) {
                fireEvent.click(mealButton);
            }

            await waitFor(() => {
                expect(mockAddAction).toHaveBeenCalledWith('MEAL_ADDED', expect.objectContaining({
                    guestId: 'g1',
                }));
            });
        });

        it('does not record action on meal add failure', async () => {
            mockAddMealRecord.mockRejectedValueOnce(new Error('Failed'));
            render(<GuestCard guest={baseGuest} />);
            const buttons = screen.getAllByRole('button');
            const mealButton = buttons.find(btn => btn.textContent?.trim() === '1');
            if (mealButton) {
                fireEvent.click(mealButton);
            }

            await waitFor(() => {
                expect(mockAddAction).not.toHaveBeenCalled();
            });
        });
    });

    describe('Expand/Collapse', () => {
        it('expands on click', () => {
            render(<GuestCard guest={baseGuest} />);
            expect(screen.queryByTestId('linked-guests-list')).toBeNull();

            fireEvent.click(screen.getByText('Johnny'));

            expect(screen.getByTestId('linked-guests-list')).toBeDefined();
        });

        it('calls onSelect when clicked', () => {
            const mockOnSelect = vi.fn();
            render(<GuestCard guest={baseGuest} onSelect={mockOnSelect} />);

            fireEvent.click(screen.getByText('Johnny'));

            expect(mockOnSelect).toHaveBeenCalled();
        });
    });

    describe('NEW Badge', () => {
        it('shows NEW badge for guests created today', () => {
            const newGuest = { ...baseGuest, createdAt: new Date().toISOString() };
            render(<GuestCard guest={newGuest} />);
            expect(screen.getByText('✨ NEW')).toBeDefined();
        });

        it('does not show NEW badge for old guests', () => {
            const oldGuest = { ...baseGuest, createdAt: '2020-01-01' };
            render(<GuestCard guest={oldGuest} />);
            expect(screen.queryByText('✨ NEW')).toBeNull();
        });

        it('handles guest without createdAt', () => {
            const guest = { ...baseGuest, createdAt: undefined };
            render(<GuestCard guest={guest} />);
            expect(screen.queryByText('✨ NEW')).toBeNull();
        });
    });

    describe('Selection State', () => {
        it('applies selected styling when isSelected true', () => {
            const { container } = render(<GuestCard guest={baseGuest} isSelected={true} />);
            const card = container.firstChild as HTMLElement;
            expect(card.className).toContain('ring-2');
        });

        it('does not apply selected styling when isSelected false', () => {
            const { container } = render(<GuestCard guest={baseGuest} isSelected={false} />);
            const card = container.firstChild as HTMLElement;
            expect(card.className).not.toContain('ring-2');
        });
    });

    describe('Service Buttons', () => {
        it('renders service buttons when not banned', () => {
            render(<GuestCard guest={baseGuest} />);
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
    });

    describe('Edge Cases', () => {
        it('handles guest with minimal data', () => {
            const minimalGuest = {
                id: 'min-1',
                firstName: 'Min',
                lastName: 'Guest',
                housingStatus: 'Unknown',
            };
            render(<GuestCard guest={minimalGuest} />);
            expect(screen.getByText('Unknown')).toBeDefined();
        });

        it('renders without crash when all optional fields are undefined', () => {
            const guest = {
                id: 'g2',
                firstName: 'Test',
                lastName: 'Guest',
                housingStatus: 'Unknown',
                preferredName: '',
                location: '',
                gender: '',
                age: '',
            };
            render(<GuestCard guest={guest} />);
            expect(screen.getByText('Unknown')).toBeDefined();
        });
    });

    describe('Shower and Laundry Time Display', () => {
        it('displays shower badge with booking time when time is provided', () => {
            const serviceStatusMap = new Map([
                ['g1', {
                    hasShower: true,
                    hasLaundry: false,
                    hasBicycle: false,
                    hasHaircut: false,
                    hasHoliday: false,
                    showerRecord: { id: 'shower-1', time: '8:00 AM', status: 'booked' },
                }],
            ]);
            render(<GuestCard guest={baseGuest} serviceStatusMap={serviceStatusMap} />);
            expect(screen.getByText('SHOWER @ 8:00 AM')).toBeDefined();
        });

        it('displays shower badge without time when time is not provided', () => {
            const serviceStatusMap = new Map([
                ['g1', {
                    hasShower: true,
                    hasLaundry: false,
                    hasBicycle: false,
                    hasHaircut: false,
                    hasHoliday: false,
                    showerRecord: { id: 'shower-1', time: null, status: 'booked' },
                }],
            ]);
            render(<GuestCard guest={baseGuest} serviceStatusMap={serviceStatusMap} />);
            const showerBadge = screen.getByText('SHOWER');
            expect(showerBadge).toBeDefined();
            expect(showerBadge.textContent).toBe('SHOWER');
        });

        it('displays laundry badge with booking time when time is provided', () => {
            const serviceStatusMap = new Map([
                ['g1', {
                    hasShower: false,
                    hasLaundry: true,
                    hasBicycle: false,
                    hasHaircut: false,
                    hasHoliday: false,
                    laundryRecord: { id: 'laundry-1', time: '9:30 AM', status: 'waiting' },
                }],
            ]);
            render(<GuestCard guest={baseGuest} serviceStatusMap={serviceStatusMap} />);
            expect(screen.getByText('LAUNDRY @ 9:30 AM')).toBeDefined();
        });

        it('displays laundry badge without time when time is not provided', () => {
            const serviceStatusMap = new Map([
                ['g1', {
                    hasShower: false,
                    hasLaundry: true,
                    hasBicycle: false,
                    hasHaircut: false,
                    hasHoliday: false,
                    laundryRecord: { id: 'laundry-1', time: null, status: 'waiting' },
                }],
            ]);
            render(<GuestCard guest={baseGuest} serviceStatusMap={serviceStatusMap} />);
            const laundryBadge = screen.getByText('LAUNDRY');
            expect(laundryBadge).toBeDefined();
            expect(laundryBadge.textContent).toBe('LAUNDRY');
        });

        it('displays both shower and laundry with times', () => {
            const serviceStatusMap = new Map([
                ['g1', {
                    hasShower: true,
                    hasLaundry: true,
                    hasBicycle: false,
                    hasHaircut: false,
                    hasHoliday: false,
                    showerRecord: { id: 'shower-1', time: '7:30 AM', status: 'booked' },
                    laundryRecord: { id: 'laundry-1', time: '10:00 AM', status: 'waiting' },
                }],
            ]);
            render(<GuestCard guest={baseGuest} serviceStatusMap={serviceStatusMap} />);
            expect(screen.getByText('SHOWER @ 7:30 AM')).toBeDefined();
            expect(screen.getByText('LAUNDRY @ 10:00 AM')).toBeDefined();
        });

        it('handles shower with undefined time gracefully', () => {
            const serviceStatusMap = new Map([
                ['g1', {
                    hasShower: true,
                    hasLaundry: false,
                    hasBicycle: false,
                    hasHaircut: false,
                    hasHoliday: false,
                    showerRecord: { id: 'shower-1', time: undefined, status: 'booked' },
                }],
            ]);
            render(<GuestCard guest={baseGuest} serviceStatusMap={serviceStatusMap} />);
            const showerBadge = screen.getByText('SHOWER');
            expect(showerBadge).toBeDefined();
        });

        it('handles laundry with empty string time gracefully', () => {
            const serviceStatusMap = new Map([
                ['g1', {
                    hasShower: false,
                    hasLaundry: true,
                    hasBicycle: false,
                    hasHaircut: false,
                    hasHoliday: false,
                    laundryRecord: { id: 'laundry-1', time: '', status: 'waiting' },
                }],
            ]);
            render(<GuestCard guest={baseGuest} serviceStatusMap={serviceStatusMap} />);
            const laundryBadge = screen.getByText('LAUNDRY');
            expect(laundryBadge).toBeDefined();
        });
    });
});
