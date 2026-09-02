import { describe, it, expect, vi } from 'vitest';

// Unmock the setup mocks to test the actual factory logic
vi.unmock('@/lib/supabase/client');
vi.unmock('@/lib/supabase/server');

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
    createBrowserClient: vi.fn(() => ({ type: 'browser-client' })),
    createServerClient: vi.fn(() => ({ type: 'server-client', auth: { getUser: vi.fn() } })),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
    cookies: vi.fn(() => Promise.resolve({
        get: vi.fn(),
        set: vi.fn(),
    })),
}));

// Mock next/server
vi.mock('next/server', () => ({
    NextResponse: {
        next: vi.fn(() => ({
            headers: {},
            cookies: { set: vi.fn() }
        })),
    },
}));

import { createClient as createBrowserClient } from '../client';
import { createClient as createServerClient } from '../server';
import { updateSession } from '../middleware';

describe('Supabase Lib', () => {
    it('creates a browser client correctly', () => {
        const client1 = createBrowserClient();
        const client2 = createBrowserClient();
        expect(client1).toEqual({ type: 'browser-client' });
        expect(client1).toBe(client2);
    });

    it('creates a server client correctly', async () => {
        const client = await createServerClient();
        expect(client).toEqual({ type: 'server-client', auth: expect.any(Object) });
    });

    it('updates session in middleware', async () => {
        const mockRequest = {
            headers: new Headers(),
            cookies: { get: vi.fn(), set: vi.fn() }
        };
        const response = await updateSession(mockRequest as any);
        expect(response).toBeDefined();
    });
});
