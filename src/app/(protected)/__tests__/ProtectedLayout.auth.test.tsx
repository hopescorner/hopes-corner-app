import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ProtectedLayout from '../layout';

const mockAuth = vi.fn();
const mockRedirect = vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
});

vi.mock('@/lib/auth/config', () => ({ auth: () => mockAuth() }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => mockRedirect(path) }));
vi.mock('@/components/layouts/MainLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));
vi.mock('@/components/providers/NextAuthProvider', () => ({
    default: ({ children, session }: { children: React.ReactNode; session: unknown }) => (
        <div data-testid="session-provider" data-has-session={String(Boolean(session))}>{children}</div>
    ),
}));

describe('ProtectedLayout - server authentication', () => {
    beforeEach(() => vi.clearAllMocks());

    it('redirects before rendering when no server session exists', async () => {
        mockAuth.mockResolvedValue(null);

        await expect(ProtectedLayout({ children: <div>Private</div> })).rejects.toThrow('NEXT_REDIRECT');
        expect(mockRedirect).toHaveBeenCalledWith('/login');
    });

    it('passes the server session to the client provider without a loading state', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'checkin' } });
        const result = await ProtectedLayout({ children: <div data-testid="private">Private</div> });

        render(result);

        expect(screen.getByTestId('session-provider').getAttribute('data-has-session')).toBe('true');
        expect(screen.getByTestId('main-layout')).toBeDefined();
        expect(screen.getByTestId('private')).toBeDefined();
        expect(screen.queryByText('Loading...')).toBeNull();
    });
});
