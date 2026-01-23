'use client';

import { useState, useEffect } from 'react';
import {
    BarChart3,
    Home,
    Download,
    Activity,
    Utensils,
    ClipboardList
} from 'lucide-react';
import { motion } from 'framer-motion';
import { DashboardOverview } from '@/components/admin/DashboardOverview';
import { AnalyticsSection } from '@/components/admin/AnalyticsSection';
import { DataExportSection } from '@/components/admin/DataExportSection';
import { MealReport } from '@/components/admin/reports/MealReport';
import MonthlySummaryReport from '@/components/admin/reports/MonthlySummaryReport';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { cn } from '@/lib/utils/cn';

const DASHBOARD_TABS = [
    { id: 'overview', label: 'Overview', icon: Home, color: 'text-indigo-600' },
    { id: 'analytics', label: 'Analytics', icon: Activity, color: 'text-blue-600' },
    { id: 'meal-report', label: 'Meal Report', icon: Utensils, color: 'text-orange-600' },
    { id: 'monthly-summary', label: 'Summary', icon: ClipboardList, color: 'text-emerald-600' },
    { id: 'export', label: 'Data Export', icon: Download, color: 'text-purple-600' },
];

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState('overview');
    const { loadSettings } = useSettingsStore();
    const { loadFromSupabase: loadMeals } = useMealsStore();
    const { loadFromSupabase: loadServices } = useServicesStore();
    const { loadFromSupabase: loadGuests } = useGuestsStore();

    useEffect(() => {
        loadSettings();
        loadMeals();
        loadServices();
        loadGuests();
    }, [loadSettings, loadMeals, loadServices, loadGuests]);

    const renderContent = () => {
        switch (activeTab) {
            case 'overview': return <DashboardOverview />;
            case 'analytics': return <AnalyticsSection />;
            case 'meal-report': return <MealReport />;
            case 'monthly-summary': return <MonthlySummaryReport />;
            case 'export': return <DataExportSection />;
            default: return <DashboardOverview />;
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <BarChart3 size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Administration Console</span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Mission Intelligence</h1>
                    <p className="text-gray-500 font-medium mt-2 max-w-xl">
                        Strategic oversight for Hope&apos;s Corner. Monitor metrics, analyze community trends, and manage operational targets.
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex p-1.5 bg-gray-100 rounded-2xl gap-1">
                    {DASHBOARD_TABS.map((tab) => {
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

            {/* Main Content Area */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
            >
                {renderContent()}
            </motion.div>
        </div>
    );
}
