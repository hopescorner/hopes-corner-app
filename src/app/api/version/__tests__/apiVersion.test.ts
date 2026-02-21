import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/utils/appVersion', () => ({
    APP_VERSION: '0.5.1',
}));

describe('GET /api/version', () => {
    it('returns current APP_VERSION as JSON', async () => {
        const { GET } = await import('@/app/api/version/route');
        const response = GET();
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({ version: '0.5.1' });
    });

    it('sets no-cache headers', async () => {
        const { GET } = await import('@/app/api/version/route');
        const response = GET();

        expect(response.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate');
        expect(response.headers.get('Pragma')).toBe('no-cache');
    });
});
