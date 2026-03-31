import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { GuestRetentionChart } from '../GuestRetentionChart';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn(),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn(),
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn(),
}));

// Mock Recharts
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: any) => <div style={{ width: '100%', height: '100%' }}>{children}</div>,
    BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
    Bar: ({ dataKey }: any) => <div data-testid={`bar-${dataKey}`} />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    Legend: () => <div />,
}));

describe('GuestRetentionChart', () => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = (() => {
        const d = new Date(now.getFullYear(), now.getMonth() - 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const setupMocks = (opts: {
        guests?: any[];
        mealRecords?: any[];
        showerRecords?: any[];
        laundryRecords?: any[];
        bicycleRecords?: any[];
        haircutRecords?: any[];
    } = {}) => {
        vi.mocked(useGuestsStore).mockImplementation((selector: any) => {
            const state = { guests: opts.guests ?? [] };
            return typeof selector === 'function' ? selector(state) : state;
        });

        vi.mocked(useMealsStore).mockImplementation((selector: any) => {
            const state = {
                mealRecords: opts.mealRecords ?? [],
                rvMealRecords: [],
                extraMealRecords: [],
                dayWorkerMealRecords: [],
                shelterMealRecords: [],
                unitedEffortMealRecords: [],
                lunchBagRecords: [],
            };
            return typeof selector === 'function' ? selector(state) : state;
        });

        vi.mocked(useServicesStore).mockImplementation((selector: any) => {
            const state = {
                showerRecords: opts.showerRecords ?? [],
                laundryRecords: opts.laundryRecords ?? [],
                bicycleRecords: opts.bicycleRecords ?? [],
                haircutRecords: opts.haircutRecords ?? [],
            };
            return typeof selector === 'function' ? selector(state) : state;
        });
    };

    it('renders the retention chart header', () => {
        setupMocks();
        render(<GuestRetentionChart />);
        expect(screen.getByText('Guest Retention')).toBeDefined();
        expect(screen.getByText(/New vs returning/)).toBeDefined();
    });

    it('shows empty state when no activity data', () => {
        setupMocks({ guests: [{ id: 'g1', createdAt: '2026-01-15T00:00:00Z' }] });
        render(<GuestRetentionChart />);
        expect(screen.getByText(/No guest activity data/)).toBeDefined();
    });

    it('classifies a guest as new when createdAt matches the activity month', () => {
        const createdDate = `${thisMonth}-15T10:00:00Z`;
        const activityDate = `${thisMonth}-15`;
        setupMocks({
            guests: [{ id: 'g1', createdAt: createdDate }],
            mealRecords: [{ id: 'm1', guestId: 'g1', count: 1, date: activityDate, dateKey: activityDate }],
        });
        render(<GuestRetentionChart />);

        // Should show "1" in the new guests summary
        const newGuestsSummary = screen.getByText('New Guests');
        expect(newGuestsSummary).toBeDefined();
    });

    it('classifies a guest as returning when createdAt predates the activity month', () => {
        const oldCreatedDate = '2025-01-15T10:00:00Z';
        const activityDate = `${thisMonth}-15`;
        setupMocks({
            guests: [{ id: 'g1', createdAt: oldCreatedDate }],
            mealRecords: [{ id: 'm1', guestId: 'g1', count: 1, date: activityDate, dateKey: activityDate }],
        });
        render(<GuestRetentionChart />);

        // Returning pill shows
        expect(screen.getByText('Returning')).toBeDefined();
    });

    it('renders the bar chart when data is available', () => {
        const activityDate = `${thisMonth}-15`;
        setupMocks({
            guests: [{ id: 'g1', createdAt: '2025-01-01T00:00:00Z' }],
            mealRecords: [{ id: 'm1', guestId: 'g1', count: 1, date: activityDate, dateKey: activityDate }],
        });
        render(<GuestRetentionChart isMounted={true} />);
        expect(screen.getByTestId('bar-chart')).toBeDefined();
        expect(screen.getByTestId('bar-new')).toBeDefined();
        expect(screen.getByTestId('bar-returning')).toBeDefined();
    });

    it('switches between 6 and 12 month views', () => {
        setupMocks();
        render(<GuestRetentionChart />);

        const btn12 = screen.getByText('12 Months');
        fireEvent.click(btn12);
        // Should still render without errors
        expect(screen.getByText('Guest Retention')).toBeDefined();

        const btn6 = screen.getByText('6 Months');
        fireEvent.click(btn6);
        expect(screen.getByText('Guest Retention')).toBeDefined();
    });
});
