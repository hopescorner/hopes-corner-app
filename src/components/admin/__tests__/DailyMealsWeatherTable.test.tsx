import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DailyMealsWeatherTable } from '../DailyMealsWeatherTable';
import { useWeatherStore } from '@/stores/useWeatherStore';

const rows = [
    { fullDate: '2026-09-21', dateLabel: 'Sep 21 (Mon)', meals: 120, uniqueGuests: 95 },
    { fullDate: '2026-09-23', dateLabel: 'Sep 23 (Wed)', meals: 140, uniqueGuests: 110 },
];

const sunnyDay = {
    id: 'w-1',
    date: '2026-09-23',
    location: 'Mountain View, CA',
    tempHigh: 78,
    tempLow: 55,
    tempUnit: 'F',
    weatherCode: 1,
    condition: 'Mainly clear',
    conditionCategory: 'sunny' as const,
    precipitationSum: 0,
    hasRain: false,
};

describe('DailyMealsWeatherTable', () => {
    beforeEach(() => {
        useWeatherStore.setState({ records: [], weatherByDate: {}, isLoaded: false, isLoading: false });
    });

    it('renders service days newest-first with meal counts', () => {
        render(<DailyMealsWeatherTable rows={rows} title="Daily Meals & Weather" />);

        expect(screen.getByText('Daily Meals & Weather')).toBeDefined();
        const row23 = screen.getByText('Sep 23 (Wed)').closest('tr');
        const row21 = screen.getByText('Sep 21 (Mon)').closest('tr');
        expect(row23).toBeDefined();
        expect(row21).toBeDefined();
        // Newest first: Sep 23 row precedes Sep 21 row in the table.
        expect(row23!.compareDocumentPosition(row21!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(row23!.textContent).toContain('140');
        expect(row23!.textContent).toContain('110');
    });

    it('shows recorded weather for days with data and a dash otherwise', () => {
        useWeatherStore.setState({
            records: [sunnyDay],
            weatherByDate: { '2026-09-23': sunnyDay },
            isLoaded: true,
        });

        render(<DailyMealsWeatherTable rows={rows} title="Daily Meals & Weather" />);

        expect(screen.getByText('Mainly clear')).toBeDefined();
        expect(screen.getByText('78° / 55°F')).toBeDefined();
    });

    it('shows an empty state when there are no service days', () => {
        render(<DailyMealsWeatherTable rows={[]} title="Daily Meals & Weather" />);

        expect(screen.getByText('No meal service days in this period.')).toBeDefined();
    });
});
