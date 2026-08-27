import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ProtectedLayout from '../(protected)/layout';
import BaseLayout from '../layout';

// Mock next/font/google
vi.mock('next/font/google', () => ({
    Inter: () => ({ variable: 'inter' }),
    Outfit: () => ({ variable: 'outfit' }),
}));

// Mock next/navigation
const mockRedirect = vi.fn(() => { throw new Error('NEXT_REDIRECT'); });
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
    redirect: (path: string) => mockRedirect(path),
}));

const mockAuth = vi.fn();
vi.mock('@/lib/auth/config', () => ({ auth: () => mockAuth() }));
vi.mock('next-auth/react', () => ({
    useSession: () => ({ data: { user: { role: 'admin' } }, status: 'authenticated' }),
    signOut: vi.fn(),
}));

vi.mock('@/components/providers/NextAuthProvider', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock components used in layouts
vi.mock('@/components/layouts/MainLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));

describe('Layout Smoke Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('BaseLayout renders children correctly', () => {
        render(
            <BaseLayout>
                <div data-testid="child">Content</div>
            </BaseLayout>
        );
        expect(screen.getByTestId('child')).toBeDefined();
    });

    it('Protected layout renders with authenticated session', async () => {
        mockAuth.mockResolvedValue({ user: { role: 'admin', name: 'Admin', email: 'admin@test.com' } });

        render(await ProtectedLayout({ children: <div data-testid="protected-content">Protected</div> }));

        expect(screen.getByTestId('main-layout')).toBeDefined();
        expect(screen.getByTestId('protected-content')).toBeDefined();
    });

    it('Protected layout has no client-only authentication loading screen', async () => {
        mockAuth.mockResolvedValue({ user: { role: 'admin' } });

        render(await ProtectedLayout({ children: <div>Protected</div> }));

        expect(screen.queryByText('Loading...')).toBeNull();
    });

    it('Protected layout redirects when not authenticated', async () => {
        mockAuth.mockResolvedValue(null);

        await expect(ProtectedLayout({ children: <div>Protected</div> })).rejects.toThrow('NEXT_REDIRECT');
        expect(mockRedirect).toHaveBeenCalledWith('/login');
    });
});
