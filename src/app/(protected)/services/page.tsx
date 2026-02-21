'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
    ClipboardList,
    BarChart3,
    ShowerHead,
    WashingMachine,
    Bike,
    History,
    Utensils,
    Heart
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { useDonationsStore } from '@/stores/useDonationsStore';
import { useRemindersStore } from '@/stores/useRemindersStore';
import { pacificDateStringFrom } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import { useShallow } from 'zustand/react/shallow';

const TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'timeline', label: 'Timeline', icon: History, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'meals', label: 'Meals', icon: Utensils, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'showers', label: 'Showers', icon: ShowerHead, color: 'text-sky-600', bg: 'bg-sky-50' },
    { id: 'laundry', label: 'Laundry', icon: WashingMachine, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'bicycles', label: 'Bicycles', icon: Bike, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'donations', label: 'Donations', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' },
];

import { useSearchParams, useRouter } from 'next/navigation';

const TabSkeleton = () => <div className="h-80 w-full animate-pulse rounded-2xl bg-gray-100" />;
const OverviewSection = dynamic(() => import('@/components/services/OverviewSection').then((m) => m.OverviewSection), { loading: TabSkeleton });
const ShowersSection = dynamic(() => import('@/components/services/ShowersSection').then((m) => m.ShowersSection), { loading: TabSkeleton });
const LaundrySection = dynamic(() => import('@/components/services/LaundrySection').then((m) => m.LaundrySection), { loading: TabSkeleton });
const BicycleSection = dynamic(() => import('@/components/services/BicycleSection').then((m) => m.BicycleSection), { loading: TabSkeleton });
const TimelineSection = dynamic(() => import('@/components/services/TimelineSection').then((m) => m.TimelineSection), { loading: TabSkeleton });
const MealsSection = dynamic(() => import('@/components/services/MealsSection').then((m) => m.MealsSection), { loading: TabSkeleton });
const DonationsSection = dynamic(() => import('@/components/services/DonationsSection').then((m) => m.DonationsSection), { loading: TabSkeleton });

export default function ServicesPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const prefersReducedMotion = useReducedMotion();
    const firstTabSwitchMarkRef = useRef(false);

    const markPerf = useCallback((name: string) => {
        if (typeof performance === 'undefined') return;
        performance.mark(name);
    }, []);

    // Use URL as source of truth for active tab
    const activeTab = searchParams.get('tab') || 'overview';

    const setActiveTab = (tabId: string) => {
        if (!firstTabSwitchMarkRef.current) {
            firstTabSwitchMarkRef.current = true;
            markPerf('services:first-tab-switch');
        }
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tabId);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const { ensureLoaded: ensureServicesLoaded, showerRecords, laundryRecords, bicycleRecords } = useServicesStore(
        useShallow((s) => ({
            ensureLoaded: s.ensureLoaded,
            showerRecords: s.showerRecords,
            laundryRecords: s.laundryRecords,
            bicycleRecords: s.bicycleRecords,
        }))
    );
    const { ensureLoaded: ensureGuestsLoaded, guests } = useGuestsStore(
        useShallow((s) => ({ ensureLoaded: s.ensureLoaded, guests: s.guests }))
    );
    const { ensureLoaded: ensureMealsLoaded, mealRecords, rvMealRecords, extraMealRecords, unitedEffortMealRecords, dayWorkerMealRecords, shelterMealRecords } = useMealsStore(
        useShallow((s) => ({
            ensureLoaded: s.ensureLoaded,
            mealRecords: s.mealRecords,
            rvMealRecords: s.rvMealRecords,
            extraMealRecords: s.extraMealRecords,
            unitedEffortMealRecords: s.unitedEffortMealRecords,
            dayWorkerMealRecords: s.dayWorkerMealRecords,
            shelterMealRecords: s.shelterMealRecords,
        }))
    );
    const ensureDonationsLoaded = useDonationsStore((s) => s.ensureLoaded);
    const ensureRemindersLoaded = useRemindersStore((s) => s.ensureLoaded);

    useEffect(() => {
        ensureServicesLoaded();
        ensureGuestsLoaded();
        ensureMealsLoaded();
        ensureDonationsLoaded();
        ensureRemindersLoaded();
    }, [ensureServicesLoaded, ensureGuestsLoaded, ensureMealsLoaded, ensureDonationsLoaded, ensureRemindersLoaded]);

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
                if (record.guestId) uniqueGuests.add(record.guestId);
            }
        };
        addMealCount(mealRecords);
        addMealCount(rvMealRecords);
        addMealCount(extraMealRecords);
        addMealCount(unitedEffortMealRecords);
        addMealCount(dayWorkerMealRecords);
        addMealCount(shelterMealRecords);

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
    }, [guests, mealRecords, rvMealRecords, extraMealRecords, unitedEffortMealRecords, dayWorkerMealRecords, shelterMealRecords, showerRecords, laundryRecords, bicycleRecords, today, startOfWeek]);

    const renderContent = () => {
        switch (activeTab) {
            case 'overview': return <OverviewSection metrics={metrics} setActiveTab={setActiveTab} />;
            case 'showers': return <ShowersSection />;
            case 'laundry': return <LaundrySection />;
            case 'bicycles': return <BicycleSection />;
            case 'timeline': return <TimelineSection />;
            case 'meals': return <MealsSection />;
            case 'donations': return <DonationsSection />;
            default: return <OverviewSection metrics={metrics} setActiveTab={setActiveTab} />;
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
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
                <div className="hidden lg:flex p-1.5 bg-gray-100 rounded-2xl gap-1">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-black transition-all",
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
                            onClick={() => setActiveTab(tab.id)}
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
            <motion.div
                key={activeTab}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
            >
                {renderContent()}
            </motion.div>
        </div>
    );
}
