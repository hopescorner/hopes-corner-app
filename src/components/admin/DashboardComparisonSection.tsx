'use client';

import { useMemo, useState, useEffect } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    ArrowDown,
    ArrowLeftRight,
    ArrowUp,
    Bike,
    Filter,
    Shirt,
    ShowerHead,
    UserPlus,
    Users,
    Utensils,
    X,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { AGE_GROUPS, GENDERS, HOUSING_STATUSES } from '@/lib/constants/constants';
import { cn } from '@/lib/utils/cn';
import { pacificDateStringFrom, todayPacificDateString } from '@/lib/utils/date';
import {
    compareDashboardRanges,
    DASHBOARD_COMPARISON_METRICS,
    type DashboardComparisonFilters,
    type DashboardComparisonMetricKey,
    type DashboardComparisonRange,
} from '@/lib/utils/dashboardComparison';

const METRIC_ICONS: Record<DashboardComparisonMetricKey, React.ElementType> = {
    newGuests: UserPlus,
    totalGuests: Users,
    proxyPickups: ArrowLeftRight,
    meals: Utensils,
    showers: ShowerHead,
    bicycles: Bike,
    laundry: Shirt,
};

const METRIC_STYLES: Record<DashboardComparisonMetricKey, string> = {
    newGuests: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    totalGuests: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    proxyPickups: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    meals: 'bg-blue-50 text-blue-700 border-blue-100',
    showers: 'bg-sky-50 text-sky-700 border-sky-100',
    bicycles: 'bg-lime-50 text-lime-700 border-lime-100',
    laundry: 'bg-violet-50 text-violet-700 border-violet-100',
};

function getDefaultRanges(): { first: DashboardComparisonRange; second: DashboardComparisonRange } {
    const today = new Date();
    const firstStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const secondStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const secondEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    return {
        first: {
            start: pacificDateStringFrom(firstStart),
            end: todayPacificDateString(),
        },
        second: {
            start: pacificDateStringFrom(secondStart),
            end: pacificDateStringFrom(secondEnd),
        },
    };
}

function formatPercent(value: number | null, firstValue: number) {
    if (value === null) return firstValue === 0 ? '0%' : 'New';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

function formatDelta(value: number) {
    if (value === 0) return '0';
    return `${value > 0 ? '+' : ''}${value.toLocaleString()}`;
}

export function DashboardComparisonSection() {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        if (process.env.NODE_ENV === 'test') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsMounted(true);
            return;
        }
        const timer = setTimeout(() => {
            setIsMounted(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const defaults = useMemo(() => getDefaultRanges(), []);
    const [firstRange, setFirstRange] = useState(defaults.first);
    const [secondRange, setSecondRange] = useState(defaults.second);
    const [selectedMetrics, setSelectedMetrics] = useState<DashboardComparisonMetricKey[]>(
        DASHBOARD_COMPARISON_METRICS.map((metric) => metric.key),
    );
    const [filters, setFilters] = useState<DashboardComparisonFilters>({
        location: 'all',
        ageGroup: 'all',
        gender: 'all',
        housingStatus: 'all',
    });

    const guests = useGuestsStore((state) => state.guests);
    const meals = useMealsStore(useShallow((state) => ({
        mealRecords: state.mealRecords,
        rvMealRecords: state.rvMealRecords,
        extraMealRecords: state.extraMealRecords,
        dayWorkerMealRecords: state.dayWorkerMealRecords,
        shelterMealRecords: state.shelterMealRecords,
        unitedEffortMealRecords: state.unitedEffortMealRecords,
        lunchBagRecords: state.lunchBagRecords,
        familyMealRecords: state.familyMealRecords,
    })));
    const services = useServicesStore(useShallow((state) => ({
        showerRecords: state.showerRecords,
        laundryRecords: state.laundryRecords,
        bicycleRecords: state.bicycleRecords,
    })));

    const locationOptions = useMemo(() => {
        return Array.from(new Set(guests.map((guest) => guest.location).filter(Boolean))).sort();
    }, [guests]);

    const comparisonData = useMemo(() => ({
        guests,
        ...meals,
        ...services,
    }), [guests, meals, services]);

    const rows = useMemo(() => {
        return compareDashboardRanges(comparisonData, { first: firstRange, second: secondRange }, filters);
    }, [comparisonData, firstRange, secondRange, filters]);

    const visibleRows = rows.filter((row) => selectedMetrics.includes(row.key));
    const hasActiveFilters = Object.values(filters).some((value) => value && value !== 'all');

    const updateFilter = (key: keyof DashboardComparisonFilters, value: string) => {
        setFilters((current) => ({ ...current, [key]: value }));
    };

    const toggleMetric = (key: DashboardComparisonMetricKey) => {
        setSelectedMetrics((current) => {
            if (current.includes(key)) {
                return current.length === 1 ? current : current.filter((item) => item !== key);
            }
            return [...current, key];
        });
    };

    const clearFilters = () => {
        setFilters({ location: 'all', ageGroup: 'all', gender: 'all', housingStatus: 'all' });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h2 className="flex items-center gap-3 text-2xl font-black text-gray-900">
                        <ArrowLeftRight className="text-cyan-600" /> Compare Time Frames
                    </h2>
                    <p className="mt-1 text-sm font-medium text-gray-500">
                        Pick any two periods and compare guest, meal, pickup, and service changes.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm">
                    <p className="mb-3 text-xs font-black uppercase tracking-widest text-cyan-700">Range A</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="comparison-range-a-start" className="text-xs font-bold text-gray-500">Start</label>
                            <input
                                id="comparison-range-a-start"
                                aria-label="Range A start"
                                type="date"
                                value={firstRange.start}
                                max={firstRange.end}
                                onChange={(event) => setFirstRange((current) => ({ ...current, start: event.target.value }))}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="comparison-range-a-end" className="text-xs font-bold text-gray-500">End</label>
                            <input
                                id="comparison-range-a-end"
                                aria-label="Range A end"
                                type="date"
                                value={firstRange.end}
                                min={firstRange.start}
                                onChange={(event) => setFirstRange((current) => ({ ...current, end: event.target.value }))}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                            />
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="mb-3 text-xs font-black uppercase tracking-widest text-gray-500">Range B</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="comparison-range-b-start" className="text-xs font-bold text-gray-500">Start</label>
                            <input
                                id="comparison-range-b-start"
                                aria-label="Range B start"
                                type="date"
                                value={secondRange.start}
                                max={secondRange.end}
                                onChange={(event) => setSecondRange((current) => ({ ...current, start: event.target.value }))}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="comparison-range-b-end" className="text-xs font-bold text-gray-500">End</label>
                            <input
                                id="comparison-range-b-end"
                                aria-label="Range B end"
                                type="date"
                                value={secondRange.end}
                                min={secondRange.start}
                                onChange={(event) => setSecondRange((current) => ({ ...current, end: event.target.value }))}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-gray-400" />
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Area Filters</p>
                    </div>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="flex items-center gap-1 text-xs font-bold text-red-500 hover:underline"
                        >
                            <X size={12} /> Clear
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <select
                        aria-label="Filter by location"
                        value={filters.location}
                        onChange={(event) => updateFilter('location', event.target.value)}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    >
                        <option value="all">All Locations</option>
                        {locationOptions.map((location) => <option key={location} value={location}>{location}</option>)}
                        <option value="Unknown">Unknown</option>
                    </select>
                    <select
                        aria-label="Filter by age group"
                        value={filters.ageGroup}
                        onChange={(event) => updateFilter('ageGroup', event.target.value)}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    >
                        <option value="all">All Age Groups</option>
                        {AGE_GROUPS.map((age) => <option key={age} value={age}>{age}</option>)}
                        <option value="Unknown">Unknown</option>
                    </select>
                    <select
                        aria-label="Filter by gender"
                        value={filters.gender}
                        onChange={(event) => updateFilter('gender', event.target.value)}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    >
                        <option value="all">All Genders</option>
                        {GENDERS.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
                    </select>
                    <select
                        aria-label="Filter by housing status"
                        value={filters.housingStatus}
                        onChange={(event) => updateFilter('housingStatus', event.target.value)}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    >
                        <option value="all">All Housing Statuses</option>
                        {HOUSING_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                        <option value="Unknown">Unknown</option>
                    </select>
                </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="mb-3 text-xs font-black uppercase tracking-widest text-gray-400">Metrics</p>
                <div className="flex flex-wrap gap-2">
                    {DASHBOARD_COMPARISON_METRICS.map((metric) => {
                        const Icon = METRIC_ICONS[metric.key];
                        const selected = selectedMetrics.includes(metric.key);
                        return (
                            <button
                                key={metric.key}
                                type="button"
                                onClick={() => toggleMetric(metric.key)}
                                className={cn(
                                    'flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all',
                                    selected ? METRIC_STYLES[metric.key] : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300',
                                )}
                            >
                                <Icon size={16} aria-hidden="true" />
                                {metric.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleRows.map((row) => {
                    const Icon = METRIC_ICONS[row.key];
                    const deltaPositive = row.delta >= 0;
                    return (
                        <div
                            key={row.key}
                            data-testid={`comparison-card-${row.key}`}
                            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                        >
                            <div className="mb-4 flex items-start justify-between gap-3">
                                <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl border', METRIC_STYLES[row.key])}>
                                    <Icon size={21} aria-hidden="true" />
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">{row.label}</p>
                                    <p className={cn('mt-1 inline-flex items-center gap-1 text-sm font-black', deltaPositive ? 'text-emerald-600' : 'text-red-600')}>
                                        {deltaPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                        {formatPercent(row.percentChange, row.firstValue)}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl bg-cyan-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600">Range A</p>
                                    <p className="mt-1 text-2xl font-black text-gray-900">{row.firstValue.toLocaleString()}</p>
                                </div>
                                <div className="rounded-xl bg-gray-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Range B</p>
                                    <p className="mt-1 text-2xl font-black text-gray-900">{row.secondValue.toLocaleString()}</p>
                                </div>
                            </div>
                            <p className={cn('mt-3 text-sm font-bold', deltaPositive ? 'text-emerald-700' : 'text-red-700')}>
                                {formatDelta(row.delta)} difference
                            </p>
                        </div>
                    );
                })}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-black text-gray-900">Side-by-Side Comparison</h3>
                        <p className="text-sm font-medium text-gray-500">Range A and Range B totals for the selected metrics.</p>
                    </div>
                </div>
                <div className="h-[360px] w-full">
                    {isMounted ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={visibleRows} margin={{ top: 12, right: 16, left: 0, bottom: 42 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                                <XAxis dataKey="label" angle={-30} textAnchor="end" interval={0} height={70} tick={{ fontSize: 11, fontWeight: 700, fill: '#6b7280' }} />
                                <YAxis tick={{ fontSize: 11, fontWeight: 700, fill: '#6b7280' }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="firstValue" name="Range A" fill="#0891b2" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="secondValue" name="Range B" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center bg-gray-50 rounded-xl animate-pulse">
                            <span className="text-gray-400">Loading chart...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
