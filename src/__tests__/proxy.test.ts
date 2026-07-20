import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock next/server first so middleware uses the stubbed NextResponse
vi.mock('next/server', () => {
    const redirect = (url: URL) => ({ type: 'redirect', url: url.toString() });
    const next = () => ({ type: 'next' });
    return {
        NextResponse: { redirect, next },
    };
});

const mocks = vi.hoisted(() => ({
    updateSession: vi.fn(async () => ({ type: 'next' })),
    auth: vi.fn(),
    canAccessRoute: vi.fn(),
    getDefaultRoute: vi.fn(),
}));

vi.mock('@/lib/supabase/middleware', () => ({
    updateSession: mocks.updateSession,
}));

vi.mock('@/lib/auth/config', () => ({
    auth: mocks.auth,
}));

vi.mock('@/lib/auth/types', () => ({
    canAccessRoute: mocks.canAccessRoute,
    getDefaultRoute: mocks.getDefaultRoute,
}));

// Import after mocks
import { proxy } from '@/proxy';

const buildRequest = (pathname: string, origin = 'https://example.org') => ({
    nextUrl: new URL(pathname, origin),
    url: `${origin}${pathname}`,
});

describe('proxy', () => {
    beforeEach(() => {
        mocks.updateSession.mockResolvedValue({ type: 'next' });
        mocks.auth.mockReset();
        mocks.canAccessRoute.mockReset();
        mocks.getDefaultRoute.mockReset();
    });

    it('returns early for public routes', async () => {
        const req = buildRequest('/login');
        const res = await proxy(req as any);
        expect(res).toEqual({ type: 'next' });
        expect(mocks.updateSession).not.toHaveBeenCalled();
    });

    it('returns early for api routes so handlers can enforce auth themselves', async () => {
        const req = buildRequest('/api/feedback/github-issue');
        const res = await proxy(req as any);
        expect(res).toEqual({ type: 'next' });
        expect(mocks.auth).not.toHaveBeenCalled();
        expect(mocks.canAccessRoute).not.toHaveBeenCalled();
    });

    it('redirects to login when no session on protected route', async () => {
        mocks.auth.mockResolvedValue(null);
        const req = buildRequest('/protected');
        const res = await proxy(req as any);
        expect(res.type).toBe('redirect');
        expect(res.url).toContain('/login');
        expect(res.url).toContain('callbackUrl=%2Fprotected');
    });

    it('redirects to default route when role cannot access path', async () => {
        mocks.auth.mockResolvedValue({ user: { role: 'checkin' } });
        mocks.canAccessRoute.mockReturnValue(false);
        mocks.getDefaultRoute.mockReturnValue('/dashboard');
        const req = buildRequest('/restricted');
        const res = await proxy(req as any);
        expect(mocks.canAccessRoute).toHaveBeenCalledWith('checkin', '/restricted');
        expect(res.url).toContain('/dashboard');
    });

    it('redirects root to role default route', async () => {
        mocks.auth.mockResolvedValue({ user: { role: 'admin' } });
        mocks.canAccessRoute.mockReturnValue(true);
        mocks.getDefaultRoute.mockReturnValue('/dashboard');
        const res = await proxy(buildRequest('/') as any);
        expect(res.url).toContain('/dashboard');
    });

    it('returns next response when authorized and non-root', async () => {
        mocks.auth.mockResolvedValue({ user: { role: 'admin' } });
        mocks.canAccessRoute.mockReturnValue(true);
        const res = await proxy(buildRequest('/services') as any);
        expect(res).toEqual({ type: 'next' });
    });
});
