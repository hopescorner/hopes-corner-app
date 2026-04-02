import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import ProtectedLayout from '../layout';

// Mock next/navigation
const mockReplace = vi.fn();
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush, replace: mockReplace }),
    usePathname: () => '/check-in',
    useSearchParams: () => new URLSearchParams(),
}));

// Mock NextAuth
const mockUseSession = vi.fn();
vi.mock('next-auth/react', () => ({
    useSession: () => mockUseSession(),
    signOut: vi.fn(),
}));

// Mock MainLayout
vi.mock('@/components/layouts/MainLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="main-layout">{children}</div>
    ),
}));

describe('ProtectedLayout - Client-Side Auth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Authentication States', () => {
        it('shows loading spinner when session is loading', () => {
            mockUseSession.mockReturnValue({
                data: null,
                status: 'loading'
            });

            render(
                <ProtectedLayout>
                    <div data-testid="protected-content">Protected Content</div>
                </ProtectedLayout>
            );

            expect(screen.getByText('Loading...')).toBeDefined();
            expect(screen.queryByTestId('protected-content')).toBeNull();
        });

        it('redirects to login when user is not authenticated', () => {
            mockUseSession.mockReturnValue({
                data: null,
                status: 'unauthenticated'
            });

            render(
                <ProtectedLayout>
                    <div data-testid="protected-content">Protected Content</div>
                </ProtectedLayout>
            );

            expect(mockReplace).toHaveBeenCalledWith('/login');
            expect(screen.queryByTestId('protected-content')).toBeNull();
        });

        it('renders protected content when user is authenticated', async () => {
            mockUseSession.mockReturnValue({
                data: {
                    user: {
                        id: 'user-123',
                        email: 'admin@test.com',
                        name: 'Admin User',
                        role: 'admin'
                    }
                },
                status: 'authenticated'
            });

            render(
                <ProtectedLayout>
                    <div data-testid="protected-content">Protected Content</div>
                </ProtectedLayout>
            );

            await waitFor(() => {
                expect(screen.getByTestId('main-layout')).toBeDefined();
                expect(screen.getByTestId('protected-content')).toBeDefined();
            });
        });
    });

    describe('Role-Based Access', () => {
        it('renders for checkin role', async () => {
            mockUseSession.mockReturnValue({
                data: {
                    user: {
                        id: 'user-123',
                        email: 'checkin@test.com',
                        name: 'Check-in User',
                        role: 'checkin'
                    }
                },
                status: 'authenticated'
            });

            render(
                <ProtectedLayout>
                    <div data-testid="protected-content">Check-in Page</div>
                </ProtectedLayout>
            );

            await waitFor(() => {
                expect(screen.getByTestId('protected-content')).toBeDefined();
            });
        });

        it('renders for staff role', async () => {
            mockUseSession.mockReturnValue({
                data: {
                    user: {
                        id: 'user-456',
                        email: 'staff@test.com',
                        name: 'Staff User',
                        role: 'staff'
                    }
                },
                status: 'authenticated'
            });

            render(
                <ProtectedLayout>
                    <div data-testid="protected-content">Staff Page</div>
                </ProtectedLayout>
            );

            await waitFor(() => {
                expect(screen.getByTestId('protected-content')).toBeDefined();
            });
        });

        it('renders for admin role', async () => {
            mockUseSession.mockReturnValue({
                data: {
                    user: {
                        id: 'user-789',
                        email: 'admin@test.com',
                        name: 'Admin User',
                        role: 'admin'
                    }
                },
                status: 'authenticated'
            });

            render(
                <ProtectedLayout>
                    <div data-testid="protected-content">Admin Dashboard</div>
                </ProtectedLayout>
            );

            await waitFor(() => {
                expect(screen.getByTestId('protected-content')).toBeDefined();
            });
        });

        it('renders for bicycle role', async () => {
            mockUseSession.mockReturnValue({
                data: {
                    user: {
                        id: 'user-101',
                        email: 'bicycle@hopes-corner.org',
                        name: 'Bicycle User',
                        role: 'bicycle'
                    }
                },
                status: 'authenticated'
            });

            render(
                <ProtectedLayout>
                    <div data-testid="protected-content">Bicycle Services</div>
                </ProtectedLayout>
            );

            await waitFor(() => {
                expect(screen.getByTestId('protected-content')).toBeDefined();
            });
        });
    });

    describe('Session Transitions', () => {
        it('transitions from loading to authenticated', async () => {
            const { rerender } = render(
                <ProtectedLayout>
                    <div data-testid="protected-content">Protected Content</div>
                </ProtectedLayout>
            );

            // Start with loading state
            mockUseSession.mockReturnValue({
                data: null,
                status: 'loading'
            });
            rerender(
                <ProtectedLayout>
                    <div data-testid="protected-content">Protected Content</div>
                </ProtectedLayout>
            );
            expect(screen.getByText('Loading...')).toBeDefined();

            // Transition to authenticated
            mockUseSession.mockReturnValue({
                data: {
                    user: {
                        id: 'user-123',
                        email: 'user@test.com',
                        name: 'User',
                        role: 'checkin'
                    }
                },
                status: 'authenticated'
            });
            rerender(
                <ProtectedLayout>
                    <div data-testid="protected-content">Protected Content</div>
                </ProtectedLayout>
            );

            await waitFor(() => {
                expect(screen.getByTestId('protected-content')).toBeDefined();
            });
        });

        it('handles session expiry by redirecting', () => {
            const { rerender } = render(
                <ProtectedLayout>
                    <div data-testid="protected-content">Protected Content</div>
                </ProtectedLayout>
            );

            // Start with authenticated state
            mockUseSession.mockReturnValue({
                data: {
                    user: {
                        id: 'user-123',
                        email: 'user@test.com',
                        name: 'User',
                        role: 'admin'
                    }
                },
                status: 'authenticated'
            });
            rerender(
                <ProtectedLayout>
                    <div data-testid="protected-content">Protected Content</div>
                </ProtectedLayout>
            );

            // Session expires
            mockUseSession.mockReturnValue({
                data: null,
                status: 'unauthenticated'
            });
            rerender(
                <ProtectedLayout>
                    <div data-testid="protected-content">Protected Content</div>
                </ProtectedLayout>
            );

            expect(mockReplace).toHaveBeenCalledWith('/login');
        });
    });

    describe('Edge Cases', () => {
        it('handles null session data gracefully', () => {
            mockUseSession.mockReturnValue({
                data: null,
                status: 'unauthenticated'
            });

            render(
                <ProtectedLayout>
                    <div data-testid="protected-content">Protected Content</div>
                </ProtectedLayout>
            );

            expect(mockReplace).toHaveBeenCalledWith('/login');
        });
    });
});
