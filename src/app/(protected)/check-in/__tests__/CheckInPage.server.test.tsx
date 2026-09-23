import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const getSnapshot = vi.fn();

vi.mock('@/lib/checkin/server', () => ({
    getCheckInRepository: () => ({ getSnapshot }),
}));
vi.mock('@/lib/weather/mountainView', () => ({
    fetchMountainViewWeather: vi.fn(async () => null),
    saveDailyWeather: vi.fn(async () => null),
}));
// persistCheckInDayWeather creates a cookie-aware server client, which has
// no request scope in unit tests.
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(async () => ({ __testServerClient: true })),
}));
vi.mock('@/lib/utils/date', () => ({ todayPacificDateString: () => '2026-07-19' }));
vi.mock('@/components/checkin/CheckInClient', () => ({
    default: ({ initialSnapshot }: { initialSnapshot?: { directoryVersion: string } }) => (
        <div>{initialSnapshot?.directoryVersion ?? 'legacy fallback'}</div>
    ),
}));

import CheckInPage from '../page';

describe('check-in server page', () => {
    it('starts the snapshot query during server rendering', async () => {
        getSnapshot.mockResolvedValue({ directoryVersion: 'directory-v2' });

        render(await CheckInPage());

        expect(getSnapshot).toHaveBeenCalledWith('2026-07-19');
        expect(screen.getByText('directory-v2')).toBeDefined();
    });

    it('keeps the legacy loader as a rollout fallback', async () => {
        getSnapshot.mockRejectedValueOnce(new Error('RPC unavailable'));

        render(await CheckInPage());

        expect(screen.getByText('legacy fallback')).toBeDefined();
    });

    it('persists daily weather when the server fetch returns full daily data', async () => {
        const mountainView = await import('@/lib/weather/mountainView');
        vi.mocked(mountainView.fetchMountainViewWeather).mockResolvedValueOnce({
            location: 'Mountain View, CA',
            temperatureF: 68,
            weatherCode: 1,
            date: '2026-07-19',
            tempHigh: 75,
            tempLow: 55,
            condition: 'Mainly clear',
            conditionCategory: 'sunny',
            precipitationSum: 0,
            hasRain: false,
        });
        getSnapshot.mockResolvedValue({ directoryVersion: 'directory-v2' });

        render(await CheckInPage());

        expect(mountainView.saveDailyWeather).toHaveBeenCalledWith(
            expect.objectContaining({ date: '2026-07-19', tempHigh: 75, tempLow: 55 }),
            expect.anything()
        );
    });

    it('skips the weather write when there is no daily data', async () => {
        const mountainView = await import('@/lib/weather/mountainView');
        vi.mocked(mountainView.saveDailyWeather).mockClear();
        getSnapshot.mockResolvedValue({ directoryVersion: 'directory-v2' });

        render(await CheckInPage());

        expect(mountainView.saveDailyWeather).not.toHaveBeenCalled();
    });
});

afterEach(() => {
    vi.clearAllMocks();
});
