import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { PeakTimesHeatmap } from '../PeakTimesHeatmap';
import { useMealsStore } from '@/stores/useMealsStore';

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn(),
}));

describe('PeakTimesHeatmap', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const setupMocks = (opts: {
        mealRecords?: any[];
        extraMealRecords?: any[];
    } = {}) => {
        vi.mocked(useMealsStore).mockImplementation((selector: any) => {
            const state = {
                mealRecords: opts.mealRecords ?? [],
                extraMealRecords: opts.extraMealRecords ?? [],
            };
            return typeof selector === 'function' ? selector(state) : state;
        });
    };

    it('renders the heatmap header', () => {
        setupMocks();
        render(<PeakTimesHeatmap />);
        expect(screen.getByText('Peak Meal Activity')).toBeDefined();
        expect(screen.getByText(/Mon, Wed/)).toBeDefined();
    });

    it('shows empty state when no data', () => {
        setupMocks();
        render(<PeakTimesHeatmap />);
        expect(screen.getByText(/No meal data available/)).toBeDefined();
    });

    it('renders heatmap cells when data is available', () => {
        // Monday at 9:15 AM (day 1) — should land in 9:00 slot
        const mon9am = new Date('2026-03-30T09:15:00');
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
        expect(screen.getByText('Meals served')).toBeDefined();
    });

    it('uses 30-minute slots for 8-10 AM range', () => {
        // Records at 8:10 and 8:40 should land in different slots
        const mon810 = new Date('2026-03-30T08:10:00');
        const mon840 = new Date('2026-03-30T08:40:00');
        setupMocks({
            mealRecords: [
                { id: '1', guestId: 'g1', count: 3, date: '2026-03-30', dateKey: '2026-03-30', createdAt: mon810.toISOString() },
                { id: '2', guestId: 'g2', count: 5, date: '2026-03-30', dateKey: '2026-03-30', createdAt: mon840.toISOString() },
            ],
        });
        render(<PeakTimesHeatmap startDate="2026-03-01" endDate="2026-03-31" />);

        // Column headers for 30-min slots should be shown
        expect(screen.getByText('8:00')).toBeDefined();
        expect(screen.getByText('8:30')).toBeDefined();
        expect(screen.getByText('9:00')).toBeDefined();
        expect(screen.getByText('9:30')).toBeDefined();
        // 8:10 → slot 8:00 with count 3. 8:40 → slot 8:30 with count 5, which is the peak
        expect(screen.getByText(/Peak: Monday 8:30/)).toBeDefined();
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
        expect(screen.getByText(/No meal data available/)).toBeDefined();
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
        expect(screen.getByText(/No meal data available/)).toBeDefined();
    });

    it('sums meal counts (quantities) not just records', () => {
        // One record with count=10 at 8:05 should show 10, not 1
        const mon = new Date('2026-03-30T08:05:00');
        setupMocks({
            mealRecords: [
                { id: '1', guestId: 'g1', count: 10, date: '2026-03-30', dateKey: '2026-03-30', createdAt: mon.toISOString() },
            ],
        });
        render(<PeakTimesHeatmap startDate="2026-03-01" endDate="2026-03-31" />);
        expect(screen.getByText('10')).toBeDefined();
    });
});
