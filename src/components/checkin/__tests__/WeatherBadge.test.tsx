import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { getWeatherCondition, WeatherBadge } from '@/components/checkin/WeatherBadge';

describe('getWeatherCondition', () => {
    it('maps WMO codes to labels', () => {
        expect(getWeatherCondition(0).label).toBe('Clear');
        expect(getWeatherCondition(2).label).toBe('Partly cloudy');
        expect(getWeatherCondition(45).label).toBe('Fog');
        expect(getWeatherCondition(61).label).toBe('Rain');
        expect(getWeatherCondition(71).label).toBe('Snow');
        expect(getWeatherCondition(95).label).toBe('Thunderstorm');
        expect(getWeatherCondition(null).label).toBe('Weather');
    });
});

describe('WeatherBadge', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('renders the temperature in Fahrenheit with an icon and condition', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
            location: 'Mountain View, CA',
            temperatureF: 68.6,
            weatherCode: 1,
        }), { status: 200 })));

        render(<WeatherBadge />);

        expect(await screen.findByText('69°F')).toBeDefined();
        expect(screen.getByText('Mainly clear')).toBeDefined();
        expect(screen.getByTestId('weather-badge').getAttribute('title')).toBe('Mainly clear in Mountain View, CA');
    });

    it('renders nothing when the weather is unavailable', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('unavailable', { status: 502 })));

        const { container } = render(<WeatherBadge />);

        await waitFor(() => {
            expect(container.querySelector('[data-testid="weather-badge"]')).toBeNull();
        });
    });
});
