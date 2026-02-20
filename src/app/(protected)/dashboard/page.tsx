'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
    BarChart3,
    Download,
    Activity,
    Utensils,
    ClipboardList,
    FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { cn } from '@/lib/utils/cn';
import { useCallback, useRef } from 'react';

const TabSkeleton = () => <div className="h-80 w-full animate-pulse rounded-2xl bg-gray-100" />;
const AnalyticsSection = dynamic(() => import('@/components/admin/AnalyticsSection').then((m) => m.AnalyticsSection), { loading: TabSkeleton });
const DataExportSection = dynamic(() => import('@/components/admin/DataExportSection').then((m) => m.DataExportSection), { loading: TabSkeleton });
const MealReport = dynamic(() => import('@/components/admin/reports/MealReport').then((m) => m.MealReport), { loading: TabSkeleton });
const MonthlySummaryReport = dynamic(() => import('@/components/admin/reports/MonthlySummaryReport'), { loading: TabSkeleton });
const MonthlyReportGenerator = dynamic(() => import('@/components/admin/reports/MonthlyReportGenerator'), { loading: TabSkeleton });

const DASHBOARD_TABS = [
    { id: 'analytics', label: 'Analytics', icon: Activity, color: 'text-blue-600' },
    { id: 'monthly-report', label: 'Monthly Report', icon: FileText, color: 'text-purple-600' },
    { id: 'meal-report', label: 'Meal Report', icon: Utensils, color: 'text-orange-600' },
    { id: 'monthly-summary', label: 'Summary', icon: ClipboardList, color: 'text-emerald-600' },
    { id: 'export', label: 'Data Export', icon: Download, color: 'text-gray-600' },
];

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState('analytics');
    const firstTabSwitchMarkRef = useRef(false);
    const prefersReducedMotion = useReducedMotion();
    const markPerf = useCallback((name: string) => {
        if (typeof performance === 'undefined') return;
        performance.mark(name);
    }, []);
    const { loadSettings } = useSettingsStore();
    const ensureMealsLoaded = useMealsStore((s) => s.ensureLoaded);
    const ensureServicesLoaded = useServicesStore((s) => s.ensureLoaded);
    const ensureGuestsLoaded = useGuestsStore((s) => s.ensureLoaded);

    useEffect(() => {
        loadSettings();
        // Reports require full history; override operational default window.
        ensureMealsLoaded({ force: true, since: '1970-01-01T00:00:00.000Z' });
        ensureServicesLoaded({ force: true, since: '1970-01-01T00:00:00.000Z' });
        ensureGuestsLoaded();
    }, [loadSettings, ensureMealsLoaded, ensureServicesLoaded, ensureGuestsLoaded]);

    const handleTabChange = (tabId: string) => {
        if (!firstTabSwitchMarkRef.current) {
            firstTabSwitchMarkRef.current = true;
            markPerf('dashboard:first-tab-switch');
        }
        setActiveTab(tabId);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'analytics': return <AnalyticsSection />;
            case 'monthly-report': return <MonthlyReportGenerator />;
            case 'meal-report': return <MealReport />;
            case 'monthly-summary': return <MonthlySummaryReport />;
            case 'export': return <DataExportSection />;
            default: return <AnalyticsSection />;
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
                    <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">Mission Intelligence</h1>
                    <p className="text-gray-500 font-medium mt-2 max-w-xl">
                        Strategic oversight for Hope&apos;s Corner. Monitor metrics, analyze community trends, and manage operational targets.
                    </p>
                </div>

                {/* Desktop Tab Switcher */}
                <div className="hidden lg:flex p-1.5 bg-gray-100 rounded-2xl gap-1">
                    {DASHBOARD_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
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
            <div className="lg:hidden flex overflow-x-auto gap-2 pb-2 scrollbar-hide -mx-4 px-4">
                {DASHBOARD_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={cn(
                                "flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all border",
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
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: [0.19, 1, 0.22, 1] }}
            >
                {renderContent()}
            </motion.div>
        </div>
    );
}
