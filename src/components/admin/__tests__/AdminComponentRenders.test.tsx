import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AnalyticsSection } from '../AnalyticsSection';
import { DashboardOverview } from '../DashboardOverview';
import { DataExportSection } from '../DataExportSection';
import { SlotBlockManager } from '../SlotBlockManager';
import { SlotBlockModal } from '../SlotBlockModal';

// Mock stores
vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn((selector) => {
        const state = {
            showerRecords: [],
            laundryRecords: [],
            bicycleRecords: [],
            haircutRecords: [],
            holidayRecords: [],
            fetchTodaysRecords: vi.fn(),
            loadFromSupabase: vi.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn((selector) => {
        const state = {
            mealRecords: [],
            rvMealRecords: [],
            extraMealRecords: [],
            unitedEffortMealRecords: [],
            dayWorkerMealRecords: [],
            shelterMealRecords: [],
            lunchBagRecords: [],
            holidayRecords: [],
            haircutRecords: [],
            loadFromSupabase: vi.fn(),
            checkAndAddAutomaticMeals: vi.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn((selector) => {
        const state = {
            guests: [],
            warnings: [],
            guestProxies: [],
            searchGuests: vi.fn(),
            loadFromSupabase: vi.fn(),
            loadGuestWarningsFromSupabase: vi.fn(),
            loadGuestProxiesFromSupabase: vi.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
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

vi.mock('@/stores/useSettingsStore', () => ({
    useSettingsStore: vi.fn(() => ({
        loadSettings: vi.fn(),
        targets: {
            dailyMeals: 100,
            monthlyMeals: 2000,
            monthlyShowers: 500,
            monthlyLaundry: 200,
            monthlyBicycles: 50,
            yearlyMeals: 25000,
            yearlyShowers: 6000,
            yearlyLaundry: 2400,
            yearlyBicycles: 600,
        },
    })),
}));

vi.mock('@/stores/useBlockedSlotsStore', () => ({
    useBlockedSlotsStore: vi.fn(() => ({
        fetchBlockedSlots: vi.fn(() => Promise.resolve()),
        blockSlot: vi.fn(),
        unblockSlot: vi.fn(),
        isSlotBlocked: vi.fn(() => false),
    })),
}));

// Mock Recharts to avoid issues in JSDOM
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    BarChart: () => <div />,
    Bar: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    Legend: () => <div />,
    PieChart: () => <div />,
    Pie: () => <div />,
    Cell: () => <div />,
    AreaChart: () => <div />,
    Area: () => <div />,
}));

describe('Admin Component Rendering', () => {
    it('AnalyticsSection renders correctly', () => {
        render(<AnalyticsSection />);
        expect(screen.getByText(/Unique Guests Served/i)).toBeDefined();
    });

    it('DashboardOverview renders correctly', () => {
        render(<DashboardOverview />);
        expect(screen.getByText(/This Month's Trajectory/i)).toBeDefined();
    });

    it('DataExportSection renders correctly', () => {
        render(<DataExportSection />);
        expect(screen.getByText(/Data Export Center/i)).toBeDefined();
    });

    it('SlotBlockManager renders correctly', () => {
        render(<SlotBlockManager serviceType="shower" />);
        expect(screen.getByText(/Manage Shower Slots/i)).toBeDefined();
    });

    it('SlotBlockModal renders correctly', () => {
        render(<SlotBlockModal isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} />);
        expect(screen.getByText(/Block Time Slot/i)).toBeDefined();
    });
});
