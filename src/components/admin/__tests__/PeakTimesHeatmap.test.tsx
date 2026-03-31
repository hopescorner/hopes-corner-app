import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { PeakTimesHeatmap } from '../PeakTimesHeatmap';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn(),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn(),
}));

describe('PeakTimesHeatmap', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const setupMocks = (opts: {
        mealRecords?: any[];
        showerRecords?: any[];
        laundryRecords?: any[];
    } = {}) => {
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
            };
            return typeof selector === 'function' ? selector(state) : state;
        });
    };

    it('renders the heatmap header', () => {
        setupMocks();
        render(<PeakTimesHeatmap />);
        expect(screen.getByText('Peak Activity Heatmap')).toBeDefined();
        expect(screen.getByText(/Monday, Wednesday/)).toBeDefined();
    });

    it('shows empty state when no data', () => {
        setupMocks();
        render(<PeakTimesHeatmap />);
        expect(screen.getByText(/No timestamped activity data/)).toBeDefined();
    });

    it('renders heatmap cells when data is available', () => {
        // Monday at 9 AM (day 1)
        const mon9am = new Date('2026-03-30T09:00:00'); // March 30, 2026 is a Monday
        setupMocks({
            mealRecords: [
                { id: '1', guestId: 'g1', count: 1, date: '2026-03-30', dateKey: '2026-03-30', createdAt: mon9am.toISOString() },
                { id: '2', guestId: 'g2', count: 1, date: '2026-03-30', dateKey: '2026-03-30', createdAt: mon9am.toISOString() },
            ],
        });
        render(<PeakTimesHeatmap startDate="2026-03-01" endDate="2026-03-31" />);

        // Should show peak badge
        expect(screen.getByText(/Peak:/)).toBeDefined();
        // Should show day labels
        expect(screen.getByText('Monday')).toBeDefined();
        // Should show legend
        expect(screen.getByText('Intensity')).toBeDefined();
    });

    it('filters by date range', () => {
        const mon9am = new Date('2026-03-30T09:00:00');
        setupMocks({
            mealRecords: [
                { id: '1', guestId: 'g1', count: 1, date: '2026-03-30', dateKey: '2026-03-30', createdAt: mon9am.toISOString() },
            ],
        });

        // Dates outside the range: should show empty
        render(<PeakTimesHeatmap startDate="2026-01-01" endDate="2026-01-31" />);
        expect(screen.getByText(/No timestamped activity data/)).toBeDefined();
    });

    it('only counts service days (Mon, Wed, Sat)', () => {
        // Tuesday at 9 AM — should not create a heatmap cell
        const tue9am = new Date('2026-03-31T09:00:00'); // March 31, 2026 is a Tuesday
        setupMocks({
            mealRecords: [
                { id: '1', guestId: 'g1', count: 1, date: '2026-03-31', dateKey: '2026-03-31', createdAt: tue9am.toISOString() },
            ],
        });
        render(<PeakTimesHeatmap startDate="2026-03-01" endDate="2026-03-31" />);
        // Tuesday is not a service day, so should show empty
        expect(screen.getByText(/No timestamped activity data/)).toBeDefined();
    });
});
