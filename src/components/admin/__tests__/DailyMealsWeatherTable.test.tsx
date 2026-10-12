import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DailyMealsWeatherTable } from '../DailyMealsWeatherTable';
import { useWeatherStore } from '@/stores/useWeatherStore';
import { useHeadlinesStore } from '@/stores/useHeadlinesStore';

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

const headlineItems = [
    {
        id: 'h-1',
        date: '2026-09-23',
        rank: 1,
        headline: 'Sharks win in overtime to take the series',
        source: 'Bay Area News Group',
        url: 'https://news.google.com/rss/articles/x',
        publishedAt: null,
    },
    {
        id: 'h-2',
        date: '2026-09-23',
        rank: 2,
        headline: 'ICE surge expected in Bay Area after Central Valley arrests',
        source: 'KQED',
        url: null,
        publishedAt: null,
    },
];

describe('DailyMealsWeatherTable', () => {
    beforeEach(() => {
        useWeatherStore.setState({ records: [], weatherByDate: {}, isLoaded: false, isLoading: false });
        useHeadlinesStore.setState({ records: [], headlineByDate: {}, isLoaded: false, isLoading: false });
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

    it('shows the recorded Bay Area headlines in rank order', () => {
        useHeadlinesStore.setState({
            records: headlineItems,
            headlineByDate: { '2026-09-23': headlineItems },
            isLoaded: true,
        });

        render(<DailyMealsWeatherTable rows={rows} title="Daily Meals & Weather" />);

        expect(screen.getByText('Top 5 Bay Area headlines')).toBeDefined();
        const link = screen.getByText('Sharks win in overtime to take the series');
        expect(link.getAttribute('href')).toBe('https://news.google.com/rss/articles/x');
        // The policy story below the sports result is preserved.
        expect(screen.getByText('ICE surge expected in Bay Area after Central Valley arrests')).toBeDefined();
        expect(screen.getByText('— KQED')).toBeDefined();
    });

    it('lets staff record missing headlines inline', async () => {
        const saved = [
            { ...headlineItems[0], id: 'h-3', date: '2026-09-21' },
            { ...headlineItems[1], id: 'h-4', date: '2026-09-21', rank: 2 },
        ];
        const saveHeadlines = vi.fn(async () => saved);
        useHeadlinesStore.setState({ saveHeadlines } as any);

        render(<DailyMealsWeatherTable rows={rows} title="Daily Meals & Weather" />);

        fireEvent.click(screen.getByLabelText('Record headlines for 2026-09-21'));
        fireEvent.change(screen.getByLabelText('Headline 1 for 2026-09-21'), {
            target: { value: 'Sharks win in overtime to take the series' },
        });
        fireEvent.change(screen.getByLabelText('Headline 1 source for 2026-09-21'), {
            target: { value: 'Bay Area News Group' },
        });
        fireEvent.change(screen.getByLabelText('Headline 2 for 2026-09-21'), {
            target: { value: 'ICE surge expected in Bay Area after Central Valley arrests' },
        });
        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(saveHeadlines).toHaveBeenCalledWith(
                '2026-09-21',
                expect.arrayContaining([
                    expect.objectContaining({ headline: 'Sharks win in overtime to take the series' }),
                    expect.objectContaining({ headline: 'ICE surge expected in Bay Area after Central Valley arrests' }),
                ])
            );
        });
    });
});
