import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DashboardComparisonSection } from '../DashboardComparisonSection';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn(),
}));

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn(),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn(),
}));

vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    BarChart: ({ children }: any) => <div>{children}</div>,
    Bar: ({ dataKey }: any) => <div data-testid={`bar-${dataKey}`} />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    Legend: () => <div />,
}));

describe('DashboardComparisonSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(useGuestsStore).mockImplementation((selector: any) => {
            const state = {
                guests: [
                    { id: 'g1', createdAt: '2026-04-02T09:00:00.000Z', location: 'Mountain View', age: 'Adult 18-59', gender: 'Male', housingStatus: 'Unhoused' },
                    { id: 'g2', createdAt: '2026-03-02T09:00:00.000Z', location: 'Palo Alto', age: 'Senior 60+', gender: 'Female', housingStatus: 'Housed' },
                ],
            };
            return typeof selector === 'function' ? selector(state) : state;
        });

        vi.mocked(useMealsStore).mockImplementation((selector: any) => {
            const state = {
                mealRecords: [
                    { id: 'm1', guestId: 'g1', pickedUpByGuestId: 'g2', count: 2, date: '2026-04-03', dateKey: '2026-04-03' },
                    { id: 'm2', guestId: 'g2', count: 1, date: '2026-03-03', dateKey: '2026-03-03' },
                ],
                rvMealRecords: [],
                extraMealRecords: [
                    { id: 'e1', guestId: 'g1', count: 3, date: '2026-04-03', dateKey: '2026-04-03' },
                ],
                dayWorkerMealRecords: [],
                shelterMealRecords: [],
                unitedEffortMealRecords: [],
                lunchBagRecords: [],
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
    });

    it('compares two user-selected ranges in cards and chart data', () => {
        render(<DashboardComparisonSection />);

        fireEvent.change(screen.getByLabelText('Range A start'), { target: { value: '2026-04-01' } });
        fireEvent.change(screen.getByLabelText('Range A end'), { target: { value: '2026-04-07' } });
        fireEvent.change(screen.getByLabelText('Range B start'), { target: { value: '2026-03-01' } });
        fireEvent.change(screen.getByLabelText('Range B end'), { target: { value: '2026-03-07' } });

        expect(screen.getByText('Compare Time Frames')).toBeDefined();
        expect(screen.getByTestId('comparison-card-meals')).toHaveTextContent('5');
        expect(screen.getByTestId('comparison-card-meals')).toHaveTextContent('+400%');
        expect(screen.getByTestId('bar-firstValue')).toBeDefined();
        expect(screen.getByTestId('bar-secondValue')).toBeDefined();
    });
});
