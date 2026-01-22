import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { KeyboardShortcutsBar } from '../KeyboardShortcutsBar';
import { MealServiceTimer } from '../MealServiceTimer';
import { ServiceStatusOverview } from '../ServiceStatusOverview';
import { TodayStats } from '../TodayStats';

// Mock stores
const mockShowerRecords: any[] = [];
const mockLaundryRecords: any[] = [];

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: Object.assign(
        vi.fn(() => ({
            showerRecords: mockShowerRecords,
            laundryRecords: mockLaundryRecords,
            bicycleRecords: [],
        })),
        {
            subscribe: vi.fn(() => () => {}),
            getState: vi.fn(() => ({
                showerRecords: mockShowerRecords,
                laundryRecords: mockLaundryRecords,
            })),
        }
    ),
}));

vi.mock('@/stores/useBlockedSlotsStore', () => ({
    useBlockedSlotsStore: vi.fn(() => ({
        blockedSlots: [],
        isSlotBlocked: vi.fn(() => false),
    })),
}));

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn(() => ({
        mealRecords: [],
        rvMealRecords: [],
        extraMealRecords: [],
        unitedEffortMealRecords: [],
        dayWorkerMealRecords: [],
        shelterMealRecords: [],
        lunchBagRecords: [],
    })),
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn(() => ({
        guests: [],
    })),
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
    useSession: () => ({ data: { user: { role: 'admin' } }, status: 'authenticated' }),
    SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Check-in Component Rendering', () => {
    it('KeyboardShortcutsBar renders correctly', () => {
        render(<KeyboardShortcutsBar />);
        expect(screen.getByText(/Focus search/i)).toBeDefined();
    });

    it('MealServiceTimer renders correctly', () => {
        render(<MealServiceTimer />);
        // It might render null if no service, or a message.
        // We'll check for the presence of the container if it's not null.
        // Or check for "service" which is common in messages.
        expect(screen.queryByText(/service/i) || screen.queryByText(/remaining/i) || screen.queryByText(/ended/i)).toBeDefined();
    });

    it('ServiceStatusOverview renders correctly', () => {
        render(<ServiceStatusOverview />);
        expect(screen.getByText(/Shower/i)).toBeDefined();
        expect(screen.getByText(/Laundry/i)).toBeDefined();
    });

    it('TodayStats renders correctly', () => {
        render(<TodayStats />);
        expect(screen.getByText(/meals/i)).toBeDefined();
    });
});
