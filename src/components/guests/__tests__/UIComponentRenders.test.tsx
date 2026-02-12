import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { GuestCard } from '../GuestCard';
import LinkedGuestsList from '../LinkedGuestsList';
import { CompactWaiverIndicator } from '../../ui/CompactWaiverIndicator';
import { WaiverBadge } from '../../ui/WaiverBadge';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { role: 'admin' } },
        status: 'authenticated',
    })),
    SessionProvider: ({ children }: any) => <div>{children}</div>,
}));

// Mock stores
vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn((selector) => {
        const state = {
            guests: [],
            warnings: [],
            guestProxies: [],
            getLinkedGuests: vi.fn(() => []),
            linkGuests: vi.fn(async () => ({})),
            unlinkGuests: vi.fn(async () => true),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn((selector) => {
        const state = {
            mealRecords: [],
            extraMealRecords: [],
            addMealRecord: vi.fn(),
            addExtraMealRecord: vi.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn((selector) => {
        const state = {
            showerRecords: [],
            laundryRecords: [],
            bicycleRecords: [],
            haircutRecords: [],
            holidayRecords: [],
            addHaircutRecord: vi.fn(),
            addHolidayRecord: vi.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/stores/useWaiverStore', () => ({
    useWaiverStore: vi.fn(() => ({
        hasActiveWaiver: vi.fn(async () => false), // Changed to false so indicators show up
        guestNeedsWaiverReminder: vi.fn(async () => true),
        dismissWaiver: vi.fn(),
        waiverVersion: 1,
    })),
}));

vi.mock('@/stores/useActionHistoryStore', () => ({
    useActionHistoryStore: vi.fn((selector) => {
        const state = {
            addAction: vi.fn(),
            undoAction: vi.fn(),
            getActionsForGuestToday: vi.fn(() => []),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

// Mock the selectors for LinkedGuestsList
vi.mock('@/stores/selectors/todayStatusSelectors', () => ({
    useTodayMealStatusMap: vi.fn(() => new Map()),
    useTodayActionStatusMap: vi.fn(() => new Map()),
    useTodayServiceStatusMap: vi.fn(() => new Map()),
    useTodayStatusMaps: vi.fn(() => ({
        mealStatus: new Map(),
        serviceStatus: new Map(),
        actionStatus: new Map(),
    })),
    defaultMealStatus: {
        hasMeal: false,
        mealCount: 0,
        extraMealCount: 0,
        totalMeals: 0,
    },
    defaultServiceStatus: {
        hasShower: false,
        hasLaundry: false,
        hasBicycle: false,
        hasHaircut: false,
        hasHoliday: false,
    },
    defaultActionStatus: {},
}));

vi.mock('@/stores/useModalStore', () => ({
    useModalStore: vi.fn((selector) => {
        const state = {
            setShowerPickerGuest: vi.fn(),
            setLaundryPickerGuest: vi.fn(),
            setBicyclePickerGuest: vi.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/stores/useRemindersStore', () => ({
    useRemindersStore: vi.fn((selector) => {
        const state = { reminders: [] };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

const mockGuest = {
    id: 'g1',
    firstName: 'John',
    lastName: 'Doe',
    name: 'John Doe',
    preferredName: 'Johnny',
    birthDate: '1990-01-01',
    housingStatus: 'Unsheltered',
    isBanned: false
};

describe('UI Component Rendering', () => {
    it('GuestCard renders correctly', () => {
        render(<GuestCard guest={mockGuest as any} />);
        // GuestCard renders preferredName || name. 
        // Our guest has both, so it renders "Johnny".
        expect(screen.getByText(/Johnny/i)).toBeDefined();
        // It also renders housingStatus
        expect(screen.getByText(/Unsheltered/i)).toBeDefined();
    });

    it('LinkedGuestsList renders correctly', () => {
        render(<LinkedGuestsList guestId="g1" />);
        expect(screen.getByText(/Link Guest/i)).toBeDefined();
    });

    it('CompactWaiverIndicator renders correctly', async () => {
        render(<CompactWaiverIndicator guestId="g1" serviceType="shower" />);
        // Wait for useEffect to finish and loading to become false
        expect(await screen.findByLabelText(/Services waiver needed/i)).toBeDefined();
    });

    it('WaiverBadge renders correctly', async () => {
        render(<WaiverBadge guestId="g1" serviceType="shower" />);
        expect(await screen.findByText(/Waiver needed/i)).toBeDefined();
    });
});
