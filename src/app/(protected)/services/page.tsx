'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
    ClipboardList,
    BarChart3,
    ShowerHead,
    WashingMachine,
    Scissors,
    Bike,
    History,
    Utensils,
    Heart,
    Gift
} from 'lucide-react';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { useDonationsStore } from '@/stores/useDonationsStore';
import { useRemindersStore } from '@/stores/useRemindersStore';
import { useDailyNotesStore } from '@/stores/useDailyNotesStore';
import { useHolidayStore } from '@/stores/useHolidayStore';
import { pacificDateStringFrom } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import { useShallow } from 'zustand/react/shallow';
import { useSession } from 'next-auth/react';
import type { UserRole } from '@/lib/auth/types';
import { serviceTabDataKeys, type ServiceDataKey } from '@/lib/services/tabLoading';

const ALL_TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'timeline', label: 'Timeline', icon: History, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'meals', label: 'Meals', icon: Utensils, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'showers', label: 'Showers', icon: ShowerHead, color: 'text-sky-600', bg: 'bg-sky-50' },
    { id: 'laundry', label: 'Laundry', icon: WashingMachine, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'haircuts', label: 'Haircuts', icon: Scissors, color: 'text-violet-600', bg: 'bg-violet-50' },
    { id: 'bicycles', label: 'Bicycles', icon: Bike, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'holiday', label: 'Holiday', icon: Gift, color: 'text-pink-600', bg: 'bg-pink-50' },
    { id: 'donations', label: 'Donations', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' },
];

// Bicycle role only sees the bicycles tab
const BICYCLE_TABS = ALL_TABS.filter((tab) => tab.id === 'bicycles');

import { useSearchParams } from 'next/navigation';

const TabSkeleton = () => <div className="h-80 w-full animate-pulse rounded-2xl bg-gray-100" />;
const OverviewSection = dynamic(() => import('@/components/services/OverviewSection').then((m) => m.OverviewSection), { loading: TabSkeleton });
const ShowersSection = dynamic(() => import('@/components/services/ShowersSection').then((m) => m.ShowersSection), { loading: TabSkeleton });
const LaundrySection = dynamic(() => import('@/components/services/LaundrySection').then((m) => m.LaundrySection), { loading: TabSkeleton });
const HaircutsSection = dynamic(() => import('@/components/services/HaircutsSection').then((m) => m.HaircutsSection), { loading: TabSkeleton });
const BicycleSection = dynamic(() => import('@/components/services/BicycleSection').then((m) => m.BicycleSection), { loading: TabSkeleton });
const HolidayProgramSection = dynamic(() => import('@/components/services/HolidayProgramSection').then((m) => m.HolidayProgramSection), { loading: TabSkeleton });
const TimelineSection = dynamic(() => import('@/components/services/TimelineSection').then((m) => m.TimelineSection), { loading: TabSkeleton });
const MealsSection = dynamic(() => import('@/components/services/MealsSection').then((m) => m.MealsSection), { loading: TabSkeleton });
const DonationsSection = dynamic(() => import('@/components/services/DonationsSection').then((m) => m.DonationsSection), { loading: TabSkeleton });

const SERVICE_TAB_MODULE_LOADERS: Record<string, () => Promise<unknown>> = {
    overview: () => import('@/components/services/OverviewSection'),
    timeline: () => import('@/components/services/TimelineSection'),
    meals: () => import('@/components/services/MealsSection'),
    showers: () => import('@/components/services/ShowersSection'),
    laundry: () => import('@/components/services/LaundrySection'),
    haircuts: () => import('@/components/services/HaircutsSection'),
    bicycles: () => import('@/components/services/BicycleSection'),
    holiday: () => import('@/components/services/HolidayProgramSection'),
    donations: () => import('@/components/services/DonationsSection'),
};

const RealtimeSyncProvider = dynamic(
    () => import('@/components/providers/RealtimeSyncProvider').then((module) => module.RealtimeSyncProvider),
    { ssr: false },
);

export default function ServicesPage() {
    const searchParams = useSearchParams();
    const firstTabSwitchMarkRef = useRef(false);
    const { data: session } = useSession();
    const role = (session?.user?.role as UserRole) || 'checkin';
    const isBicycleRole = role === 'bicycle';
    const TABS = isBicycleRole ? BICYCLE_TABS : ALL_TABS;
    const defaultTab = isBicycleRole ? 'bicycles' : 'overview';

    const markPerf = useCallback((name: string) => {
        if (typeof performance === 'undefined') return;
        performance.mark(name);
    }, []);

    const urlTab = searchParams.get('tab');
    const resolvedUrlTab = urlTab && TABS.some((t) => t.id === urlTab) ? urlTab : defaultTab;
    const [selectedTab, setSelectedTab] = useState(resolvedUrlTab);
    const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([resolvedUrlTab]));

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onPopState = () => {
            const nextTab = new URLSearchParams(window.location.search).get('tab');
            if (!nextTab || !TABS.some((t) => t.id === nextTab)) return;
            setSelectedTab(nextTab);
            setVisitedTabs((prev) => {
                if (prev.has(nextTab)) return prev;
                const next = new Set(prev);
                next.add(nextTab);
                return next;
            });
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, [TABS]);

    // Ensure the tab is valid for the current role
    const activeTab = TABS.some((t) => t.id === selectedTab) ? selectedTab : defaultTab;

    const setActiveTab = useCallback((tabId: string) => {
        if (!firstTabSwitchMarkRef.current) {
            firstTabSwitchMarkRef.current = true;
            markPerf('services:first-tab-switch');
        }
        setVisitedTabs((prev) => {
            if (prev.has(tabId)) return prev;
            const next = new Set(prev);
            next.add(tabId);
            return next;
        });
        setSelectedTab(tabId);
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            params.set('tab', tabId);
            window.history.pushState(null, '', `${window.location.pathname}?${params.toString()}`);
        }
    }, [markPerf]);

    const { ensureLoaded: ensureServicesLoaded, loadFromSupabase: reloadServices, showerRecords, laundryRecords, bicycleRecords } = useServicesStore(
        useShallow((s) => ({
            ensureLoaded: s.ensureLoaded,
            loadFromSupabase: s.loadFromSupabase,
            showerRecords: s.showerRecords,
            laundryRecords: s.laundryRecords,
            bicycleRecords: s.bicycleRecords,
        }))
    );
    const { ensureLoaded: ensureGuestsLoaded, guests } = useGuestsStore(
        useShallow((s) => ({ ensureLoaded: s.ensureLoaded, guests: s.guests }))
    );
    const { ensureLoaded: ensureMealsLoaded, mealRecords, rvMealRecords, extraMealRecords, unitedEffortMealRecords, dayWorkerMealRecords, shelterMealRecords, familyMealRecords } = useMealsStore(
        useShallow((s) => ({
            ensureLoaded: s.ensureLoaded,
            mealRecords: s.mealRecords,
            rvMealRecords: s.rvMealRecords,
            extraMealRecords: s.extraMealRecords,
            unitedEffortMealRecords: s.unitedEffortMealRecords,
            dayWorkerMealRecords: s.dayWorkerMealRecords,
            shelterMealRecords: s.shelterMealRecords,
            familyMealRecords: s.familyMealRecords || [],
        }))
    );
    const ensureDonationsLoaded = useDonationsStore((s) => s.ensureLoaded);
    const ensureRemindersLoaded = useRemindersStore((s) => s.ensureLoaded);
    const ensureDailyNotesLoaded = useDailyNotesStore((s) => s.ensureLoaded);
    const ensureHolidayLoaded = useHolidayStore((s) => s.ensureLoaded);

    const loadTabData = useCallback((tab: string) => {
        const loaders: Record<ServiceDataKey, () => Promise<void>> = {
            services: ensureServicesLoaded,
            guests: ensureGuestsLoaded,
            meals: ensureMealsLoaded,
            donations: ensureDonationsLoaded,
            reminders: ensureRemindersLoaded,
            dailyNotes: ensureDailyNotesLoaded,
            holiday: ensureHolidayLoaded,
        };
        return Promise.all(serviceTabDataKeys(tab).map((key) => loaders[key]()));
    }, [ensureServicesLoaded, ensureGuestsLoaded, ensureMealsLoaded, ensureDonationsLoaded, ensureRemindersLoaded, ensureDailyNotesLoaded, ensureHolidayLoaded]);

    const preloadTabIntent = useCallback((tab: string) => {
        void SERVICE_TAB_MODULE_LOADERS[tab]?.();
        void loadTabData(tab);
    }, [loadTabData]);

    useEffect(() => {
        void loadTabData(activeTab);
    }, [activeTab, loadTabData]);

    useEffect(() => {
        const reconcile = () => void reloadServices();
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') reconcile();
        };
        window.addEventListener('online', reconcile);
        document.addEventListener('visibilitychange', onVisibilityChange);
        const interval = window.setInterval(() => {
            if (document.visibilityState === 'visible') reconcile();
        }, 120_000);
        return () => {
            window.clearInterval(interval);
            window.removeEventListener('online', reconcile);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [reloadServices]);

    const today = useMemo(() => pacificDateStringFrom(new Date().toISOString()), []);

    // Get the start of this week (Sunday)
    const startOfWeek = useMemo(() => {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day;
        const sunday = new Date(now);
        sunday.setDate(diff);
        return pacificDateStringFrom(sunday.toISOString());
    }, []);

    const metrics = useMemo(() => {
        const dateKeyOf = (r: any) => r?.dateKey || pacificDateStringFrom(r.date);
        const uniqueGuests = new Set<string>();
        const laundryCompletedStatuses = new Set(['done', 'picked_up', 'returned', 'offsite_picked_up']);
        const laundryActiveStatuses = new Set(['waiting', 'washer', 'dryer']);

        let mealsToday = 0;
        const addMealCount = (records: any[]) => {
            for (const record of records) {
                if (dateKeyOf(record) !== today) continue;
                mealsToday += record.count || 0;
                if (record.primaryGuestId || record.guestId) uniqueGuests.add(record.primaryGuestId || record.guestId);
            }
        };
        addMealCount(mealRecords);
        addMealCount(rvMealRecords);
        addMealCount(extraMealRecords);
        addMealCount(unitedEffortMealRecords);
        addMealCount(dayWorkerMealRecords);
        addMealCount(shelterMealRecords);
        addMealCount(familyMealRecords);

        let showersDone = 0;
        let showersActive = 0;
        let showerWaitlist = 0;
        let timelineShowers = 0;
        for (const record of showerRecords) {
            const dateKey = dateKeyOf(record);
            if (dateKey !== today) continue;
            timelineShowers += 1;
            if (record.guestId) uniqueGuests.add(record.guestId);
            if (record.status === 'done') showersDone += 1;
            else if (record.status === 'waitlisted') showerWaitlist += 1;
            else if (record.status === 'booked' || record.status === 'awaiting') showersActive += 1;
        }

        let laundryTotal = 0;
        let laundryActive = 0;
        let laundryDone = 0;
        let timelineLaundry = 0;
        for (const record of laundryRecords) {
            if (dateKeyOf(record) !== today) continue;
            timelineLaundry += 1;
            if (record.guestId) uniqueGuests.add(record.guestId);
            if (laundryCompletedStatuses.has(record.status)) laundryTotal += 1;
            if (laundryActiveStatuses.has(record.status)) laundryActive += 1;
            if (record.status === 'done') laundryDone += 1;
        }

        let bicyclesPending = 0;
        let bicyclesCompletedThisWeek = 0;
        for (const record of bicycleRecords) {
            const dateKey = dateKeyOf(record);
            if (dateKey === today && record.guestId) uniqueGuests.add(record.guestId);
            if (dateKey === today && record.status === 'pending') bicyclesPending += 1;
            if (dateKey >= startOfWeek && record.status === 'done') bicyclesCompletedThisWeek += 1;
        }

        let housed = 0;
        let unsheltered = 0;
        for (const guest of guests) {
            if (guest.housingStatus === 'Housed') housed += 1;
            if (guest.housingStatus === 'Unsheltered') unsheltered += 1;
        }

        return {
            totalGuests: guests.length,
            housingStatusSummary: `${housed} housed · ${unsheltered} unsheltered`,
            mealsToday,
            uniqueGuestsToday: uniqueGuests.size,
            showersDone,
            showersActive,
            showerWaitlist,
            laundryTotal,
            laundryActive,
            laundryDone,
            bicyclesPending,
            bicyclesCompletedThisWeek,
            timelineCount: timelineShowers + timelineLaundry,
        };
    }, [guests, mealRecords, rvMealRecords, extraMealRecords, unitedEffortMealRecords, dayWorkerMealRecords, shelterMealRecords, familyMealRecords, showerRecords, laundryRecords, bicycleRecords, today, startOfWeek]);

    const renderContent = () => (
        <>
            {!isBicycleRole && visitedTabs.has('overview') && (
                <div hidden={activeTab !== 'overview'}>
                    <OverviewSection metrics={metrics} setActiveTab={setActiveTab} />
                </div>
            )}
            {visitedTabs.has('timeline') && (
                <div hidden={activeTab !== 'timeline'}>
                    <TimelineSection />
                </div>
            )}
            {visitedTabs.has('meals') && (
                <div hidden={activeTab !== 'meals'}>
                    <MealsSection />
                </div>
            )}
            {visitedTabs.has('showers') && (
                <div hidden={activeTab !== 'showers'}>
                    <ShowersSection />
                </div>
            )}
            {visitedTabs.has('laundry') && (
                <div hidden={activeTab !== 'laundry'}>
                    <LaundrySection />
                </div>
            )}
            {visitedTabs.has('haircuts') && (
                <div hidden={activeTab !== 'haircuts'}>
                    <HaircutsSection />
                </div>
            )}
            {(isBicycleRole || visitedTabs.has('bicycles')) && (
                <div hidden={activeTab !== 'bicycles'}>
                    <BicycleSection />
                </div>
            )}
            {visitedTabs.has('holiday') && (
                <div hidden={activeTab !== 'holiday'}>
                    <HolidayProgramSection />
                </div>
            )}
            {visitedTabs.has('donations') && (
                <div hidden={activeTab !== 'donations'}>
                    <DonationsSection />
                </div>
            )}
        </>
    );

    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <RealtimeSyncProvider />
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 min-w-0">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                            <ClipboardList size={20} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-emerald-600">Service Center</span>
                    </div>
                    <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">Management</h1>
                    <p className="text-gray-500 font-medium mt-2 max-w-xl">
                        Coordinate and monitor all daily services including showers, laundry, and bicycle repairs from a centralized hub.
                    </p>
                </div>

                {/* Desktop Tab Switcher */}
                <div className="hidden lg:flex flex-wrap p-1.5 bg-gray-100 rounded-2xl gap-1 max-w-full min-w-0">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                data-testid={`services-tab-${tab.id}-desktop`}
                                onClick={() => setActiveTab(tab.id)}
                                onMouseEnter={() => preloadTabIntent(tab.id)}
                                onFocus={() => preloadTabIntent(tab.id)}
                                className={cn(
                                    "flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-black whitespace-nowrap transition-all",
                                    isActive
                                        ? "bg-white shadow-xl shadow-gray-200/50 scale-105"
                                        : "text-gray-400 hover:text-gray-600 hover:bg-white/50"
                                )}
                            >
                                <Icon size={18} className={isActive ? tab.color : "text-gray-300"} />
                                <span className={isActive ? "text-gray-900" : "text-gray-400"}>
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Mobile/Tablet Tab Switcher */}
            <div className="lg:hidden flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            data-testid={`services-tab-${tab.id}-mobile`}
                            onClick={() => setActiveTab(tab.id)}
                            onMouseEnter={() => preloadTabIntent(tab.id)}
                            onFocus={() => preloadTabIntent(tab.id)}
                            className={cn(
                                "flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all border",
                                isActive
                                    ? "bg-gray-900 text-white border-gray-900 shadow-lg"
                                    : "bg-white text-gray-500 border-gray-100"
                            )}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Main Content Area */}
            <div className="animate-in fade-in slide-in-from-bottom-1 duration-200 motion-reduce:animate-none">
                {renderContent()}
            </div>
        </div>
    );
}
