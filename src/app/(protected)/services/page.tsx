'use client';

import { useEffect, useMemo } from 'react';
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
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { useDonationsStore } from '@/stores/useDonationsStore';
import { OverviewSection } from '@/components/services/OverviewSection';
import { ShowersSection } from '@/components/services/ShowersSection';
import { LaundrySection } from '@/components/services/LaundrySection';
import { BicycleSection } from '@/components/services/BicycleSection';
import { TimelineSection } from '@/components/services/TimelineSection';
import { MealsSection } from '@/components/services/MealsSection';
import { DonationsSection } from '@/components/services/DonationsSection';
import { pacificDateStringFrom } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';

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

export default function ServicesPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Use URL as source of truth for active tab
    const activeTab = searchParams.get('tab') || 'overview';

    const setActiveTab = (tabId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tabId);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const { loadFromSupabase, showerRecords, laundryRecords, bicycleRecords } = useServicesStore();
    const { loadFromSupabase: loadGuests, guests } = useGuestsStore();
    const { loadFromSupabase: loadMeals, mealRecords, rvMealRecords, extraMealRecords, unitedEffortMealRecords } = useMealsStore();
    const { loadFromSupabase: loadDonations } = useDonationsStore();

    useEffect(() => {
        loadFromSupabase();
        loadGuests();
        loadMeals();
        loadDonations();
    }, [loadFromSupabase, loadGuests, loadMeals, loadDonations]);

    const today = pacificDateStringFrom(new Date().toISOString());

    // Get the start of this week (Sunday)
    const getStartOfWeek = () => {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day;
        const sunday = new Date(now.setDate(diff));
        return pacificDateStringFrom(sunday.toISOString());
    };
    const startOfWeek = getStartOfWeek();

    // Compute metrics for the overview
    const metrics = useMemo(() => {
        const mealsToday = (
            mealRecords.filter(r => pacificDateStringFrom(r.date) === today).length +
            rvMealRecords.filter(r => pacificDateStringFrom(r.date) === today).length +
            extraMealRecords.filter(r => pacificDateStringFrom(r.date) === today).length +
            unitedEffortMealRecords.filter(r => pacificDateStringFrom(r.date) === today).length
        );
        
        const uniqueGuestsToday = new Set([
            ...mealRecords.filter(r => pacificDateStringFrom(r.date) === today).map(r => r.guestId),
            ...showerRecords.filter(r => pacificDateStringFrom(r.date) === today).map(r => r.guestId),
            ...laundryRecords.filter(r => pacificDateStringFrom(r.date) === today).map(r => r.guestId),
            ...bicycleRecords.filter(r => pacificDateStringFrom(r.date) === today).map(r => r.guestId),
        ]).size;

        // Bicycle metrics
        const bicyclesPending = bicycleRecords.filter(r => r.status !== 'done').length;
        const bicyclesCompletedThisWeek = bicycleRecords.filter(r => 
            pacificDateStringFrom(r.date) >= startOfWeek && r.status === 'done'
        ).length;

        return {
            totalGuests: guests.length,
            housingStatusSummary: `${guests.filter(g => g.housingStatus === 'Housed').length} housed · ${guests.filter(g => g.housingStatus === 'Unsheltered').length} unsheltered`,
            mealsToday,
            uniqueGuestsToday,
            showersDone: showerRecords.filter(r => pacificDateStringFrom(r.date) === today && r.status === 'done').length,
            showersActive: showerRecords.filter(r => pacificDateStringFrom(r.date) === today && (r.status === 'booked' || r.status === 'awaiting')).length,
            showerWaitlist: showerRecords.filter(r => pacificDateStringFrom(r.date) === today && r.status === 'waitlisted').length,
            laundryTotal: laundryRecords.filter(r => pacificDateStringFrom(r.date) === today).length,
            laundryActive: laundryRecords.filter(r => pacificDateStringFrom(r.date) === today && ['waiting', 'washer', 'dryer'].includes(r.status)).length,
            laundryDone: laundryRecords.filter(r => pacificDateStringFrom(r.date) === today && r.status === 'done').length,
            bicyclesPending,
            bicyclesCompletedThisWeek,
            timelineCount: (
                showerRecords.filter(r => pacificDateStringFrom(r.date) === today).length +
                laundryRecords.filter(r => pacificDateStringFrom(r.date) === today).length
            )
        };
    }, [guests, mealRecords, rvMealRecords, extraMealRecords, unitedEffortMealRecords, showerRecords, laundryRecords, bicycleRecords, today, startOfWeek]);

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
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Management</h1>
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {renderContent()}
            </motion.div>
        </div>
    );
}
