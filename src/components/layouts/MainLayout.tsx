'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, BarChart3, UserPlus, HelpCircle, LogOut } from 'lucide-react';
import { getDefaultRoute, getRoleLabel, ROLE_ACCESS, type UserRole } from '@/lib/auth/types';
import { AppVersion } from '@/components/pwa/AppVersion';
import { isHalloweenSeason } from '@/lib/seasonal';
import { useCheckInStore } from '@/stores/useCheckInStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { hydrateLegacyStoresFromSnapshot } from '@/lib/checkin/legacyAdapter';
import type { CheckInSnapshot } from '@/types/checkin';
import dynamic from 'next/dynamic';

const TutorialModal = dynamic(() => import('@/components/modals/TutorialModal').then((module) => module.TutorialModal));
const CheckInPageView = dynamic(() => import('@/components/checkin/CheckInClient'));
const ServicesPageView = dynamic(() => import('@/app/(protected)/services/page'));
const DashboardPageView = dynamic(() => import('@/app/(protected)/dashboard/page'));

interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    href: string;
}

const allNavItems: NavItem[] = [
    { id: 'check-in', label: 'Check In', icon: UserPlus, href: '/check-in' },
    { id: 'services', label: 'Services', icon: ClipboardList, href: '/services' },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, href: '/dashboard' },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [showTutorial, setShowTutorial] = useState(false);
    const firstNavSwitchMarkRef = useRef(false);
    const snapshotPreloadingRef = useRef(false);

    const role = (session?.user?.role as UserRole) || 'checkin';
    const roleLabel = getRoleLabel(role);
    const allowedTabs = ROLE_ACCESS[role];
    const defaultRoute = getDefaultRoute(role);

    const navItems = useMemo(
        () => allNavItems.filter((item) => (allowedTabs as readonly string[]).includes(item.id)),
        [allowedTabs]
    );

    // Halloween special (October only): pumpkin replaces the "o" in "Hope's".
    // Automatically reverts on Nov 1st when isHalloweenSeason() goes false.
    const showHalloweenBrand = useMemo(() => isHalloweenSeason(), []);

    // Get tab matching current pathname
    const pathnameTab = navItems.find((item) => pathname.startsWith(item.href))?.id || navItems[0]?.id;
    const initialTabRef = useRef<string | undefined>(pathnameTab);
    if (!initialTabRef.current && pathnameTab) {
        initialTabRef.current = pathnameTab;
    }
    const initialTab = initialTabRef.current;

    const [selectedTab, setSelectedTab] = useState<string | undefined>(pathnameTab);
    const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(pathnameTab ? [pathnameTab] : []));

    useEffect(() => {
        if (!pathnameTab) return;
        setSelectedTab(pathnameTab);
        setVisitedTabs((prev) => {
            if (prev.has(pathnameTab)) return prev;
            const next = new Set(prev);
            next.add(pathnameTab);
            return next;
        });
    }, [pathnameTab]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onPopState = () => {
            const currentPath = window.location.pathname;
            const matched = navItems.find((item) => currentPath.startsWith(item.href))?.id;
            if (!matched) return;
            setSelectedTab(matched);
            setVisitedTabs((prev) => {
                if (prev.has(matched)) return prev;
                const next = new Set(prev);
                next.add(matched);
                return next;
            });
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, [navItems]);

    const activeTab = navItems.some((item) => item.id === selectedTab) ? selectedTab : pathnameTab;

    const preloadRouteIntent = useCallback((tabId: string) => {
        if (tabId === 'check-in') {
            void import('@/components/checkin/CheckInClient');
            const checkInState = typeof useCheckInStore.getState === 'function' ? useCheckInStore.getState() : null;
            if (checkInState && !checkInState.isReady && !snapshotPreloadingRef.current && typeof fetch === 'function') {
                snapshotPreloadingRef.current = true;
                fetch('/api/check-in/snapshot', { cache: 'no-store' })
                    .then((res) => (res.ok ? (res.json() as Promise<CheckInSnapshot>) : null))
                    .then((snapshot) => {
                        if (snapshot && useCheckInStore.getState?.()?.hydrate?.(snapshot)) {
                            hydrateLegacyStoresFromSnapshot(snapshot);
                        }
                    })
                    .catch(() => {})
                    .finally(() => {
                        snapshotPreloadingRef.current = false;
                    });
            }
            return;
        }
        if (tabId === 'services') {
            void import('@/app/(protected)/services/page');
            void import('@/components/services/OverviewSection');
            void useServicesStore.getState?.()?.ensureLoaded?.();
            void useGuestsStore.getState?.()?.ensureLoaded?.();
            void useMealsStore.getState?.()?.ensureLoaded?.();
            return;
        }
        if (tabId === 'dashboard') {
            void import('@/app/(protected)/dashboard/page');
            void import('@/components/admin/AnalyticsSection');
            void useMealsStore.getState?.()?.ensureLoaded?.();
            void useServicesStore.getState?.()?.ensureLoaded?.();
            void useGuestsStore.getState?.()?.ensureLoaded?.();
        }
    }, []);

    const handleNavClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>, item: NavItem) => {
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        ) {
            return;
        }
        event.preventDefault();
        if (!firstNavSwitchMarkRef.current) {
            firstNavSwitchMarkRef.current = true;
            if (typeof performance !== 'undefined') {
                performance.mark('nav:first-page-switch');
            }
        }
        setVisitedTabs((prev) => {
            if (prev.has(item.id)) return prev;
            const next = new Set(prev);
            next.add(item.id);
            return next;
        });
        setSelectedTab(item.id);
        if (typeof window !== 'undefined' && window.location.pathname !== item.href) {
            window.history.pushState(null, '', item.href);
        }
    }, []);

    const defaultNavItem = navItems.find((item) => item.href === defaultRoute);

    const handleLogout = async () => {
        await signOut({ callbackUrl: '/login' });
    };

    return (
        <div className="min-h-screen bg-emerald-50 flex flex-col">
            {/* Header */}
            <header className="bg-green-950 text-white shadow-lg">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-12 md:h-16">
                        {/* Left Zone: Brand */}
                        <div className="flex items-center gap-3 shrink-0">
                            <Link
                                href={defaultRoute}
                                prefetch={true}
                                onClick={(e) => {
                                    if (defaultNavItem) handleNavClick(e, defaultNavItem);
                                }}
                                className="inline-flex items-center p-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
                            >
                                <img
                                    src="/hope-corner-logo-v2.svg"
                                    alt="Hope's Corner logo"
                                    className="h-8 md:h-10 w-auto"
                                />
                            </Link>
                            <div className="hidden sm:block">
                                <h1
                                    className="text-lg md:text-xl font-bold leading-tight font-heading"
                                    aria-label="Hope's Corner"
                                >
                                    {showHalloweenBrand ? (
                                        <>
                                            H<span aria-hidden="true">🎃</span>
                                            pe&apos;s Corner
                                            <span className="sr-only"> (Halloween)</span>
                                        </>
                                    ) : (
                                        <>Hope&apos;s Corner</>
                                    )}
                                </h1>
                                <p className="text-emerald-100 text-[10px] md:text-xs">
                                    Guest Check-In System
                                </p>
                            </div>
                        </div>

                        {/* Mobile spacer */}
                        <div className="md:hidden flex-1" />

                        {/* Center Zone: Primary Navigation (desktop only) */}
                        <nav className="hidden md:flex flex-1 justify-center">
                            <div className="inline-flex items-center gap-1 bg-emerald-900/50 rounded-xl p-1">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeTab === item.id;
                                    return (
                                        <Link
                                            key={item.id}
                                            href={item.href}
                                            prefetch={true}
                                            data-testid={`nav-tab-${item.id}-desktop`}
                                            onClick={(e) => handleNavClick(e, item)}
                                            onMouseEnter={() => preloadRouteIntent(item.id)}
                                            onFocus={() => preloadRouteIntent(item.id)}
                                            aria-current={isActive ? 'page' : undefined}
                                            className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 ${isActive
                                                ? 'bg-white text-emerald-900 shadow-md'
                                                : 'text-emerald-100 hover:bg-emerald-800/60 hover:text-white'
                                                }`}
                                        >
                                            <Icon size={18} aria-hidden="true" />
                                            <span>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </nav>

                        {/* Right Zone: User Controls (desktop only) */}
                        <div className="hidden md:flex items-center gap-2 shrink-0">
                            <span className="px-2 py-1 rounded-md text-emerald-200/80 text-[11px] font-medium bg-emerald-800/30">
                                {roleLabel}
                            </span>
                            <div className="w-px h-5 bg-emerald-700/50" />
                            <button
                                onClick={() => setShowTutorial(true)}
                                className="p-2 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800/50 transition-colors"
                                aria-label="Help"
                                title="Need help?"
                            >
                                <HelpCircle size={18} />
                            </button>
                            <button
                                onClick={handleLogout}
                                className="px-3 py-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
                            >
                                Logout
                            </button>
                        </div>

                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main
                className="container mx-auto flex-1 px-4 pt-4 pb-[7.5rem] md:pb-8 md:px-6 min-h-[calc(100vh-4rem)]"
            >
                <div className="max-w-7xl mx-auto space-y-4">
                    <div hidden={Boolean(initialTab && activeTab !== initialTab)}>
                        {children}
                    </div>
                    {navItems.map((item) => {
                        if (item.id === initialTab || !visitedTabs.has(item.id)) return null;
                        return (
                            <div key={item.id} hidden={activeTab !== item.id}>
                                {item.id === 'check-in' && <CheckInPageView />}
                                {item.id === 'services' && <ServicesPageView />}
                                {item.id === 'dashboard' && <DashboardPageView />}
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav
                className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-emerald-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
                data-fixed-bottom
                style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 18px)' }}
            >
                <div
                    className={`grid gap-1 px-2 pt-3 ${navItems.length === 1
                        ? 'grid-cols-1'
                        : navItems.length === 2
                            ? 'grid-cols-2'
                            : navItems.length === 3
                                ? 'grid-cols-3'
                                : 'grid-cols-4'
                        }`}
                >
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                prefetch={true}
                                data-testid={`nav-tab-${item.id}-mobile`}
                                onClick={(e) => handleNavClick(e, item)}
                                onMouseEnter={() => preloadRouteIntent(item.id)}
                                onFocus={() => preloadRouteIntent(item.id)}
                                aria-current={isActive ? 'page' : undefined}
                                className={`flex flex-col items-center justify-center rounded-lg border py-2 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${isActive
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow'
                                    : 'border-transparent text-gray-700 hover:border-emerald-200 hover:bg-emerald-50/70'
                                    }`}
                            >
                                <div className={`mb-1 rounded-lg p-2 ${isActive ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                                    <Icon size={18} aria-hidden="true" />
                                </div>
                                <span className="text-[11px] leading-none">{item.label.replace(' Dashboard', '')}</span>
                            </Link>
                        );
                    })}
                </div>
                <div className="px-2 pb-3 space-y-2">
                    <div className="flex justify-center items-center gap-3">
                        <AppVersion />
                        <button
                            onClick={() => setShowTutorial(true)}
                            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                            aria-label="Help"
                        >
                            <HelpCircle size={14} />
                            <span>Need help?</span>
                        </button>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                    >
                        <LogOut size={14} />
                        Logout
                    </button>
                </div>
            </nav>

            {/* Desktop Footer */}
            <footer className="hidden md:block bg-white border-t border-emerald-200 py-6">
                <div className="container mx-auto px-4 text-center space-y-2">
                    <p className="text-emerald-700 text-sm">Hope&apos;s Corner Guest Check-In System</p>
                    <p className="text-emerald-400 text-xs">
                        &copy; {new Date().getFullYear()} - Building community one meal and shower at a time
                    </p>
                    <AppVersion />
                </div>
            </footer>

            <TutorialModal
                isOpen={showTutorial}
                onClose={() => setShowTutorial(false)}
            />
        </div>
    );
}
