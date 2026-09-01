import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateClient = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
    createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

vi.mock('server-only', () => ({}));

describe('getHolidayServiceClient', () => {
    const originalSecretKey = process.env.SUPABASE_SECRET_KEY;
    const originalPublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    beforeEach(() => {
        vi.resetModules();
        mockCreateClient.mockReset();
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'publishable-key';
        delete process.env.SUPABASE_SECRET_KEY;
    });

    afterEach(() => {
        if (originalSecretKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
        else process.env.SUPABASE_SECRET_KEY = originalSecretKey;
        if (originalPublishableKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
        else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = originalPublishableKey;
        if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    });

    it('fails closed when the server secret key is missing', async () => {
        const { getHolidayServiceClient } = await import('../server');

        expect(() => getHolidayServiceClient()).toThrow(/SUPABASE_SECRET_KEY/);
        expect(mockCreateClient).not.toHaveBeenCalled();
    });
});
