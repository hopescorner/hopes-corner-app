'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
    BarChart3,
    TrendingUp,
    Utensils,
    ShowerHead,
    WashingMachine,
    Bike,
    Sparkles
} from 'lucide-react';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

interface MetricCardProps {
    title: string;
    icon: React.ElementType;
    value: number;
    target: number;
    color: 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'indigo';
}

function MetricCard({ title, icon: Icon, value, target, color }: MetricCardProps) {
    const progress = target > 0 ? Math.min((value / target) * 100, 100) : 0;

    const colors = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100 ring-blue-500',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100 ring-emerald-500',
        purple: 'text-purple-600 bg-purple-50 border-purple-100 ring-purple-500',
        amber: 'text-amber-600 bg-amber-50 border-amber-100 ring-amber-500',
        rose: 'text-rose-600 bg-rose-50 border-rose-100 ring-rose-500',
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100 ring-indigo-500',
    }[color];

    const barColor = {
        blue: 'bg-blue-500',
        emerald: 'bg-emerald-500',
        purple: 'bg-purple-500',
        amber: 'bg-amber-500',
        rose: 'bg-rose-500',
        indigo: 'bg-indigo-500',
    }[color];

    return (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-2xl", colors.split(' ')[1])}>
                    <Icon size={24} className={colors.split(' ')[0]} />
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{title}</p>
                    <p className="text-2xl font-black text-gray-900 tracking-tight">{value.toLocaleString()}</p>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <span>Target: {target.toLocaleString()}</span>
                    <span className={colors.split(' ')[0]}>{progress.toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={cn("h-full rounded-full shadow-sm", barColor)}
                    />
                </div>
            </div>
        </div>
    );
}

export function DashboardOverview() {
    const { targets, updateTargets } = useSettingsStore();
    const { mealRecords, rvMealRecords, extraMealRecords, unitedEffortMealRecords } = useMealsStore();
    const { showerRecords, laundryRecords, bicycleRecords } = useServicesStore();

    const [isEditing, setIsEditing] = useState(false);
    const [editedTargets, setEditedTargets] = useState(targets);
    const prefersReducedMotion = useReducedMotion();

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const isThisMonth = useCallback((d: string) => {
        const date = new Date(d);
        return date.getMonth() === month && date.getFullYear() === year;
    }, [month, year]);

    const isThisYear = useCallback((d: string) => {
        const date = new Date(d);
        return date.getFullYear() === year;
    }, [year]);

    const monthMetrics = useMemo(() => ({
        meals: [
            ...mealRecords.filter(r => isThisMonth(r.date)),
            ...rvMealRecords.filter(r => isThisMonth(r.date)),
            ...extraMealRecords.filter(r => isThisMonth(r.date)),
            ...unitedEffortMealRecords.filter(r => isThisMonth(r.date))
        ].reduce((sum, r) => sum + (r.count || 0), 0),
        showers: showerRecords.filter(r => isThisMonth(r.date) && r.status === 'done').length,
        laundry: laundryRecords.filter(r => isThisMonth(r.date) && r.status === 'done').length,
        bicycles: bicycleRecords.filter(r => isThisMonth(r.date) && r.status === 'done').length,
    }), [mealRecords, rvMealRecords, extraMealRecords, unitedEffortMealRecords, showerRecords, laundryRecords, bicycleRecords, isThisMonth]);

    const yearMetrics = useMemo(() => ({
        meals: [
            ...mealRecords.filter(r => isThisYear(r.date)),
            ...rvMealRecords.filter(r => isThisYear(r.date)),
            ...extraMealRecords.filter(r => isThisYear(r.date)),
            ...unitedEffortMealRecords.filter(r => isThisYear(r.date))
        ].reduce((sum, r) => sum + (r.count || 0), 0),
        showers: showerRecords.filter(r => isThisYear(r.date) && r.status === 'done').length,
        laundry: laundryRecords.filter(r => isThisYear(r.date) && r.status === 'done').length,
        bicycles: bicycleRecords.filter(r => isThisYear(r.date) && r.status === 'done').length,
    }), [mealRecords, rvMealRecords, extraMealRecords, unitedEffortMealRecords, showerRecords, laundryRecords, bicycleRecords, isThisYear]);

    const handleSave = async () => {
        await updateTargets(editedTargets);
        setIsEditing(false);
        toast.success('Targets updated successfully');
    };

    return (
        <div className="space-y-12">
            {/* Hero Stats */}
            <div className="relative bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2.5rem] p-10 text-white shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

                <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 mb-6">
                            <Sparkles size={16} className="text-blue-200" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">Live Insights Dashboard</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4">Operations <br /> Performance</h1>
                        <p className="text-lg font-medium text-blue-100/80 leading-relaxed">
                            Real-time monitoring of community impact. Tracking our journey towards serving thousands of individuals in our community.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => { setEditedTargets(targets); setIsEditing(!isEditing); }}
                            className="px-8 py-4 bg-white text-blue-700 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            {isEditing ? 'Cancel Edit' : 'Adjust Targets'}
                        </button>
                    </div>
                </div>
            </div>

            {isEditing && (
                <motion.div
                    initial={prefersReducedMotion ? false : { opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl border-2 border-dashed border-blue-200 p-8 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Impact Targets</h3>
                        <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest">Save Changes</button>
                    </div>
                    
                    {/* Monthly Targets */}
                    <div className="mb-8">
                        <h4 className="text-sm font-black text-gray-600 uppercase tracking-widest mb-4">Monthly Targets</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {(['monthlyMeals', 'monthlyShowers', 'monthlyLaundry', 'monthlyBicycles'] as const).map(key => (
                                <div key={key} className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{key.replace('monthly', '')}</label>
                                    <input
                                        type="number"
                                        value={editedTargets[key]}
                                        onChange={e => setEditedTargets({ ...editedTargets, [key]: Number(e.target.value) })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Yearly Targets */}
                    <div>
                        <h4 className="text-sm font-black text-gray-600 uppercase tracking-widest mb-4">Yearly Targets</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {(['yearlyMeals', 'yearlyShowers', 'yearlyLaundry', 'yearlyBicycles'] as const).map(key => (
                                <div key={key} className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{key.replace('yearly', '')}</label>
                                    <input
                                        type="number"
                                        value={editedTargets[key]}
                                        onChange={e => setEditedTargets({ ...editedTargets, [key]: Number(e.target.value) })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Monthly Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <TrendingUp size={20} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">This Month&apos;s Trajectory</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard title="Meals Served" icon={Utensils} value={monthMetrics.meals} target={targets.monthlyMeals} color="emerald" />
                    <MetricCard title="Showers Completed" icon={ShowerHead} value={monthMetrics.showers} target={targets.monthlyShowers} color="blue" />
                    <MetricCard title="Laundry Loads" icon={WashingMachine} value={monthMetrics.laundry} target={targets.monthlyLaundry} color="purple" />
                    <MetricCard title="Bicycle Repairs" icon={Bike} value={monthMetrics.bicycles} target={targets.monthlyBicycles} color="amber" />
                </div>
            </div>

            {/* Yearly Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                        <BarChart3 size={20} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Year-to-Date Impact</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard title="Total Meals" icon={Utensils} value={yearMetrics.meals} target={targets.yearlyMeals} color="emerald" />
                    <MetricCard title="Total Showers" icon={ShowerHead} value={yearMetrics.showers} target={targets.yearlyShowers} color="blue" />
                    <MetricCard title="Total Laundry" icon={WashingMachine} value={yearMetrics.laundry} target={targets.yearlyLaundry} color="purple" />
                    <MetricCard title="Total Bicycles" icon={Bike} value={yearMetrics.bicycles} target={targets.yearlyBicycles} color="amber" />
                </div>
            </div>
        </div>
    );
}
