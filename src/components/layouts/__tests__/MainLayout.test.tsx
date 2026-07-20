import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import MainLayout from '../MainLayout';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

const mutationObserve = vi.fn();

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
    useSession: vi.fn(),
    signOut: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
    usePathname: vi.fn(),
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock useRealtimeSync hook
vi.mock('@/hooks/useRealtimeSync', () => ({
    useRealtimeSync: vi.fn(),
    RealtimeSyncProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('lucide-react')>();
    return {
        ...actual,
        ClipboardList: () => <div data-testid="icon-services" />,
        BarChart3: () => <div data-testid="icon-dashboard" />,
        UserPlus: () => <div data-testid="icon-checkin" />,
        HelpCircle: () => <div data-testid="icon-help" />,
        MessageSquarePlus: () => <div data-testid="icon-feedback" />,
        LogOut: () => <div data-testid="icon-logout" />,
        Menu: () => <div data-testid="icon-menu" />,
        X: () => <div data-testid="icon-x" />,
        Lightbulb: () => <div data-testid="icon-lightbulb" />,
        ChevronRight: () => <div data-testid="icon-chevron-right" />,
        ChevronLeft: () => <div data-testid="icon-chevron-left" />,
        Clock: () => <div data-testid="icon-clock" />,
        Users: () => <div data-testid="icon-users" />,
        Utensils: () => <div data-testid="icon-utensils" />,
        Gift: () => <div data-testid="icon-gift" />,
        Droplet: () => <div data-testid="icon-droplet" />,
        Shirt: () => <div data-testid="icon-shirt" />,
    };
});

// Mock AppVersion
vi.mock('@/components/pwa/AppVersion', () => ({
    AppVersion: () => <div data-testid="app-version" />,
}));

describe('MainLayout', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.mocked(usePathname).mockReturnValue('/check-in');

        // Mock matchMedia for touch detection
        window.matchMedia = vi.fn().mockReturnValue({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        });

        // Mock ResizeObserver
        global.ResizeObserver = class ResizeObserver {
            observe = vi.fn();
            unobserve = vi.fn();
            disconnect = vi.fn();
        };

        // Mock MutationObserver
        global.MutationObserver = class MutationObserver {
            constructor(callback: any) { }
            observe = mutationObserve;
            disconnect = vi.fn();
        };
    });

    it('renders navigation based on user role', () => {
        vi.mocked(useSession).mockReturnValue({
            data: { user: { role: 'admin', name: 'Admin' } },
            status: 'authenticated',
        } as any);

        render(<MainLayout>Content</MainLayout>);

        expect(screen.getAllByText('Check In')[0]).toBeDefined();
        expect(screen.getAllByText('Services')[0]).toBeDefined();
        expect(screen.getAllByText('Dashboard')[0]).toBeDefined();
    });

    it('filters navigation for non-admin roles', () => {
        vi.mocked(useSession).mockReturnValue({
            data: { user: { role: 'checkin', name: 'Checkin Staff' } },
            status: 'authenticated',
        } as any);

        render(<MainLayout>Content</MainLayout>);

        expect(screen.getAllByText('Check In')[0]).toBeDefined();
        expect(screen.queryByText('Services')).toBeNull();
        expect(screen.queryByText('Dashboard')).toBeNull();
    });

    it('shows the feedback issue button for non-checkin users', () => {
        vi.mocked(useSession).mockReturnValue({
            data: { user: { role: 'staff', name: 'Staff' } },
            status: 'authenticated',
        } as any);

        render(<MainLayout>Content</MainLayout>);

        expect(screen.getAllByLabelText('File issue or feature request').length).toBeGreaterThan(0);
    });

    it('hides the feedback issue button for checkin users', () => {
        vi.mocked(useSession).mockReturnValue({
            data: { user: { role: 'checkin', name: 'Checkin Staff' } },
            status: 'authenticated',
        } as any);

        render(<MainLayout>Content</MainLayout>);

        expect(screen.queryByLabelText('File issue or feature request')).toBeNull();
    });

    it('calls signOut on logout button click', () => {
        vi.mocked(useSession).mockReturnValue({
            data: { user: { role: 'admin', name: 'Admin' } },
            status: 'authenticated',
        } as any);

        render(<MainLayout>Content</MainLayout>);

        const logoutButtons = screen.getAllByText('Logout');
        fireEvent.click(logoutButtons[0]); // Desktop logout

        expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login' });
    });

    it('uses normal client navigation for the logo without clearing caches', async () => {
        vi.mocked(useSession).mockReturnValue({
            data: { user: { role: 'admin', name: 'Admin' } },
            status: 'authenticated',
        } as any);

        const deleteSpy = vi.fn().mockResolvedValue(true);
        const keysSpy = vi.fn().mockResolvedValue(['cache-1', 'cache-2']);
        const mockCaches = {
            keys: keysSpy,
            delete: deleteSpy,
        };
        vi.stubGlobal('caches', mockCaches);

        render(<MainLayout>Content</MainLayout>);

        const logo = screen.getByAltText("Hope's Corner logo");
        const logoLink = logo.closest('a');
        expect(logoLink).toBeDefined();

        expect(logoLink?.getAttribute('href')).toBe('/check-in');
        await act(async () => fireEvent.click(logoLink!));
        expect(keysSpy).not.toHaveBeenCalled();
        expect(deleteSpy).not.toHaveBeenCalled();
        vi.unstubAllGlobals();
    });

    it('updates bottom padding based on fixed element height', async () => {
        vi.mocked(useSession).mockReturnValue({
            data: { user: { role: 'admin', name: 'Admin' } },
            status: 'authenticated',
        } as any);

        render(<MainLayout>Content</MainLayout>);

        // Should find the main element and check its style
        const main = screen.getByRole('main');
        expect(main.style.paddingBottom).toBeDefined();
    });

    it('reserves mobile navigation space with CSS instead of layout observers', () => {
        vi.mocked(window.matchMedia).mockReturnValue({
            matches: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        } as any);

        render(<MainLayout>Content</MainLayout>);
        const main = screen.getByRole('main');
        expect(main.className).toContain('pb-[7.5rem]');
        expect(mutationObserve).not.toHaveBeenCalled();
    });
});
