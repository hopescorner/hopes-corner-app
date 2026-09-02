'use client';

import React, { useState, useEffect, useMemo, useId } from 'react';
import {
    Gift,
    Clock,
    Search,
    Download,
    Users,
    CheckCircle2,
    MapPin,
    Phone,
    Home,
    DollarSign,
    RotateCcw,
    Sparkles,
    Calendar,
    X,
    Filter,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';
import {
    useHolidayStore,
    selectHolidayMetrics,
    selectSlotCounts,
    selectFilteredHolidayRegistrations,
} from '@/stores/useHolidayStore';
import { HolidayRegistration } from '@/types/holiday';
import { HOLIDAY_TIME_SLOTS, MAX_PARENTS_PER_HOLIDAY_SLOT } from '@/lib/holiday/constants';
import toast from 'react-hot-toast';

const CITY_COLORS = [
    '#10B981', // Emerald
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#6B7280', // Gray
];

const HOUSING_LABELS: Record<string, string> = {
    house_apartment: 'House / Apartment',
    vehicle_rv_camper: 'Vehicle / RV / Camper',
    temp_shelter_motel: 'Temporary Shelter / Motel',
    outside: 'Outside / Unhoused',
};

const INCOME_LABELS: Record<string, string> = {
    '0_40k': '$0 – $40,000',
    '41_65k': '$41,000 – $65,000',
    '66_90k': '$66,000 – $90,000',
    'over_90k': 'Over $90,000',
};

export function HolidayReport() {
    const searchInputId = useId();
    const {
        registrations,
        isLoading,
        isLoaded,
        ensureLoaded,
        loadFromSupabase,
        selectedSlotFilter,
        searchQuery,
        statusFilter,
        setSelectedSlotFilter,
        setSearchQuery,
        setStatusFilter,
    } = useHolidayStore();

    useEffect(() => {
        void ensureLoaded();
    }, [ensureLoaded]);

    const metrics = useMemo(() => selectHolidayMetrics(registrations), [registrations]);
    const slotCounts = useMemo(() => selectSlotCounts(registrations), [registrations]);
    const filteredRegistrations = useMemo(
        () =>
            selectFilteredHolidayRegistrations(
                registrations,
                searchQuery,
                selectedSlotFilter,
                statusFilter
            ),
        [registrations, searchQuery, selectedSlotFilter, statusFilter]
    );

    // Age Groups Chart Data
    const ageGroupData = useMemo(() => {
        return [
            { group: 'Infants (0-1)', count: metrics.infantsCount, fill: '#10B981' },
            { group: 'Toddlers (1-4)', count: metrics.toddlersCount, fill: '#059669' },
            { group: 'Children (5-12)', count: metrics.childrenCount, fill: '#3B82F6' },
            { group: 'Teen 13', count: metrics.teen13Count, fill: '#6366F1' },
            { group: 'Teen 14', count: metrics.teen14Count, fill: '#8B5CF6' },
            { group: 'Teen 15', count: metrics.teen15Count, fill: '#A855F7' },
            { group: 'Teens 16-17', count: metrics.teen16To18Count, fill: '#EC4899' },
        ];
    }, [metrics]);

    // City Breakdown Data
    const cityData = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const reg of registrations) {
            if (reg.status === 'cancelled') continue;
            const city = reg.city?.trim() || 'Other';
            counts[city] = (counts[city] || 0) + 1;
        }
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [registrations]);

    // Housing Status Breakdown
    const housingData = useMemo(() => {
        const counts: Record<string, number> = {
            house_apartment: 0,
            vehicle_rv_camper: 0,
            temp_shelter_motel: 0,
            outside: 0,
        };
        for (const reg of registrations) {
            if (reg.status === 'cancelled') continue;
            const key = reg.housingStatus || 'house_apartment';
            counts[key] = (counts[key] || 0) + 1;
        }
        return counts;
    }, [registrations]);

    // Income Range Breakdown
    const incomeData = useMemo(() => {
        const counts: Record<string, number> = {
            '0_40k': 0,
            '41_65k': 0,
            '66_90k': 0,
            'over_90k': 0,
        };
        for (const reg of registrations) {
            if (reg.status === 'cancelled') continue;
            const key = reg.incomeRange || '0_40k';
            counts[key] = (counts[key] || 0) + 1;
        }
        return counts;
    }, [registrations]);

    const checkInRate = useMemo(() => {
        if (metrics.totalRegistrations === 0) return 0;
        return Math.round((metrics.checkedInCount / metrics.totalRegistrations) * 100);
    }, [metrics]);

    const handleExportCSV = () => {
        if (registrations.length === 0) {
            toast.error('No registration records available to export');
            return;
        }

        const headers = [
            'Ticket Number',
            'Parent / Guardian Name',
            'Phone',
            'City of Residence',
            'Housing Status',
            'Annual Family Income',
            'Time Slot',
            'Infants (0-1)',
            'Toddlers (1-4)',
            'Children (5-12)',
            'Teen 13',
            'Teen 14',
            'Teen 15',
            'Teens 16-17',
            'Total Children',
            'Grocery Cards',
            'Teen Gift Cards',
            'Status',
            'Checked-In Date & Time',
            'Checked-In Staff',
            'Notes',
        ];

        const rows = registrations.map((r) => {
            const children = r.children || [];
            let infants = 0;
            let toddlers = 0;
            let childCount = 0;
            let t13 = 0;
            let t14 = 0;
            let t15 = 0;
            let t16_18 = 0;

            for (const c of children) {
                switch (c.ageGroup) {
                    case 'infant': infants++; break;
                    case 'toddler': toddlers++; break;
                    case 'child': childCount++; break;
                    case 'teen_13': t13++; break;
                    case 'teen_14': t14++; break;
                    case 'teen_15': t15++; break;
                    case 'teen_16_17': t16_18++; break;
                }
            }

            return [
                r.ticketNumber,
                `"${(r.parentName || '').replace(/"/g, '""')}"`,
                `"${r.phone || ''}"`,
                `"${r.city || ''}"`,
                `"${HOUSING_LABELS[r.housingStatus] || r.housingStatus || ''}"`,
                `"${INCOME_LABELS[r.incomeRange] || r.incomeRange || ''}"`,
                `"${r.timeSlot || ''}"`,
                infants,
                toddlers,
                childCount,
                t13,
                t14,
                t15,
                t16_18,
                children.length,
                r.groceryCards || 0,
                r.teenCards || 0,
                r.status,
                r.checkedInAt ? new Date(r.checkedInAt).toLocaleString() : '',
                `"${(r.checkedInBy || '').replace(/"/g, '""')}"`,
                `"${(r.notes || '').replace(/"/g, '""')}"`,
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute(
            'download',
            `hopes_corner_holiday_toy_distribution_report_${new Date().toISOString().slice(0, 10)}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Holiday distribution report CSV exported');
    };

    return (
        <div data-testid="holiday-report-section" className="space-y-8">
            {/* Header Hub */}
            <div className="bg-gradient-to-r from-pink-900 via-purple-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 bg-pink-500/20 text-pink-300 border border-pink-400/30 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        <Gift className="w-3.5 h-3.5" />
                        <span>Annual Holiday Toy &amp; Gift Distribution</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Holiday Program Executive Report</h2>
                    <p className="text-pink-200 text-xs sm:text-sm max-w-2xl leading-relaxed">
                        Comprehensive community distribution metrics, child age demographics, geographical breakdown, and family check-in attendance.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
                    >
                        <Download className="w-4 h-4 text-pink-600" />
                        <span>Export CSV Report</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => void loadFromSupabase()}
                        className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs sm:text-sm font-semibold px-3.5 py-2.5 rounded-xl transition-all"
                        title="Refresh data"
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {/* Core Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Registered Families
                    </span>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                        {metrics.totalRegistrations}
                    </div>
                    <span className="text-xs text-emerald-600 font-semibold">
                        {metrics.checkedInCount} Checked In ({metrics.pendingCount} Pending)
                    </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Total Children (0-17)
                    </span>
                    <div className="text-2xl font-black text-purple-900 mt-1">
                        {metrics.totalChildrenCount}
                    </div>
                    <span className="text-xs text-purple-600 font-semibold">
                        {metrics.teen14PlusCount} Teens (14–17)
                    </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Grocery Cards
                    </span>
                    <div className="text-2xl font-black text-emerald-900 mt-1">
                        {metrics.groceryCardsCount}
                    </div>
                    <span className="text-xs text-emerald-700 font-semibold">1 per Registered Family</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Teen Gift Cards
                    </span>
                    <div className="text-2xl font-black text-amber-900 mt-1">
                        {metrics.teenCardsCount}
                    </div>
                    <span className="text-xs text-amber-700 font-semibold">For Teens Ages 14–17</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Attendance Rate
                    </span>
                    <div className="text-2xl font-black text-blue-900 mt-1">
                        {checkInRate}%
                    </div>
                    <span className="text-xs text-blue-700 font-semibold">Check-in Fulfillment</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Slot Capacity
                    </span>
                    <div className="text-2xl font-black text-indigo-900 mt-1">
                        {metrics.totalRegistrations} / {HOLIDAY_TIME_SLOTS.length * MAX_PARENTS_PER_HOLIDAY_SLOT}
                    </div>
                    <span className="text-xs text-indigo-700 font-semibold">Across 15 Time Windows</span>
                </div>
            </div>

            {/* Charts & Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Age Group Breakdown */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Child Age Group Demographics</h3>
                        <p className="text-xs text-slate-500">Distribution of registered dependent children by gift tier</p>
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ageGroupData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis
                                    dataKey="group"
                                    tick={{ fontSize: 10, fill: '#64748B' }}
                                    interval={0}
                                    angle={-20}
                                    textAnchor="end"
                                />
                                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                                <Tooltip
                                    formatter={(value: any) => [`${value} Children`, 'Count']}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}
                                />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* City of Residence Breakdown */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Geographical Distribution</h3>
                        <p className="text-xs text-slate-500">Participating families by Bay Area city of residence</p>
                    </div>

                    {cityData.length === 0 ? (
                        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                            No geographic data available
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 h-64">
                            <div className="h-full w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={cityData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={45}
                                            outerRadius={75}
                                            paddingAngle={3}
                                        >
                                            {cityData.map((_, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={CITY_COLORS[index % CITY_COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: any) => [`${value} Families`, 'Registered']}
                                            contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="space-y-1.5 overflow-y-auto max-h-56 pr-2 text-xs">
                                {cityData.map((c, i) => (
                                    <div key={c.name} className="flex items-center justify-between py-1 border-b border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{ backgroundColor: CITY_COLORS[i % CITY_COLORS.length] }}
                                            />
                                            <span className="font-medium text-slate-700">{c.name}</span>
                                        </div>
                                        <span className="font-bold text-slate-900">{c.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Housing Status Breakdown */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Housing Status Overview</h3>
                        <p className="text-xs text-slate-500">Living situations of registered families</p>
                    </div>

                    <div className="space-y-3 pt-2">
                        {Object.entries(housingData).map(([key, count]) => {
                            const pct = metrics.totalRegistrations > 0
                                ? Math.round((count / metrics.totalRegistrations) * 100)
                                : 0;
                            return (
                                <div key={key} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-700">
                                            {HOUSING_LABELS[key] || key}
                                        </span>
                                        <span className="text-slate-500 font-bold">
                                            {count} ({pct}%)
                                        </span>
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Income Range Breakdown */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Annual Family Income Levels</h3>
                        <p className="text-xs text-slate-500">Self-reported annual family income brackets</p>
                    </div>

                    <div className="space-y-3 pt-2">
                        {Object.entries(incomeData).map(([key, count]) => {
                            const pct = metrics.totalRegistrations > 0
                                ? Math.round((count / metrics.totalRegistrations) * 100)
                                : 0;
                            return (
                                <div key={key} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-700">
                                            {INCOME_LABELS[key] || key}
                                        </span>
                                        <span className="text-slate-500 font-bold">
                                            {count} ({pct}%)
                                        </span>
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className="h-full bg-purple-600 rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Time Slot Fulfillment */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Arrival Time Slot Capacities</h3>
                        <p className="text-xs text-slate-500">Booked capacity across 20-minute distribution windows</p>
                    </div>
                    {selectedSlotFilter && (
                        <button
                            type="button"
                            onClick={() => setSelectedSlotFilter(null)}
                            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                        >
                            Clear Slot Filter
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                    {HOLIDAY_TIME_SLOTS.map((s) => {
                        const count = slotCounts[s.id] || 0;
                        const isSelected = selectedSlotFilter === s.id;
                        const isFull = count >= MAX_PARENTS_PER_HOLIDAY_SLOT;

                        return (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => setSelectedSlotFilter(isSelected ? null : s.id)}
                                className={`p-3 rounded-xl border text-left transition-all ${isSelected
                                    ? 'border-emerald-600 bg-emerald-50/80 shadow-xs'
                                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                                    }`}
                            >
                                <div className="flex items-center justify-between text-xs mb-1.5">
                                    <span className="font-bold text-slate-800">{s.label}</span>
                                    <span
                                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${isFull
                                            ? 'bg-rose-100 text-rose-800'
                                            : 'bg-emerald-100 text-emerald-800'
                                            }`}
                                    >
                                        {count}/{MAX_PARENTS_PER_HOLIDAY_SLOT}
                                    </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${isFull ? 'bg-rose-500' : 'bg-emerald-600'}`}
                                        style={{ width: `${Math.min(100, (count / MAX_PARENTS_PER_HOLIDAY_SLOT) * 100)}%` }}
                                    />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Registered Families Roster Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Family Distribution Roster</h3>
                        <p className="text-xs text-slate-500">Detailed list of registered participants and status</p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-72">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <label htmlFor={searchInputId} className="sr-only">
                                Search roster by parent, ticket, child, or city
                            </label>
                            <input
                                id={searchInputId}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by ticket #, parent, child, city..."
                                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                            {(['all', 'registered', 'checked_in'] as const).map((st) => (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => setStatusFilter(st)}
                                    className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${statusFilter === st
                                        ? 'bg-white text-slate-900 shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                >
                                    {st === 'all' ? 'All' : st === 'registered' ? 'Waiting' : 'Checked In'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="py-3 px-4">Ticket</th>
                                <th className="py-3 px-4">Parent / Guardian</th>
                                <th className="py-3 px-4">Contact &amp; City</th>
                                <th className="py-3 px-4">Time Slot</th>
                                <th className="py-3 px-4">Registered Children</th>
                                <th className="py-3 px-4 text-center">Cards</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Check-In Info</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading && !isLoaded ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                                        Loading holiday distribution records...
                                    </td>
                                </tr>
                            ) : filteredRegistrations.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                                        No registration records match your filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredRegistrations.map((reg) => {
                                    const isCheckedIn = reg.status === 'checked_in';
                                    const children = reg.children || [];

                                    return (
                                        <tr
                                            key={reg.id}
                                            className={`hover:bg-slate-50/80 transition-colors ${isCheckedIn ? 'bg-emerald-50/20' : ''}`}
                                        >
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                                    #{reg.ticketNumber}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                                                {reg.parentName}
                                            </td>
                                            <td className="py-3 px-4 text-xs whitespace-nowrap">
                                                <div className="text-slate-800">{reg.city}</div>
                                                <div className="text-slate-400 text-[11px]">{reg.phone}</div>
                                            </td>
                                            <td className="py-3 px-4 text-xs font-semibold text-slate-700 whitespace-nowrap">
                                                {reg.timeSlot}
                                            </td>
                                            <td className="py-3 px-4 text-xs">
                                                <div className="flex flex-wrap gap-1 max-w-xs">
                                                    {children.map((c, i) => (
                                                        <span
                                                            key={c.id || i}
                                                            className="inline-flex items-center gap-1 bg-purple-50 text-purple-900 border border-purple-200 px-1.5 py-0.5 rounded text-[11px] font-medium"
                                                        >
                                                            <span>{c.name}</span>
                                                            <span className="text-purple-600 font-bold">({c.age}y)</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-center whitespace-nowrap text-xs">
                                                <span className="inline-block bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">
                                                    {reg.groceryCards} Grocery
                                                </span>
                                                {reg.teenCards > 0 && (
                                                    <span className="inline-block bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[11px] ml-1">
                                                        {reg.teenCards} Teen
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                {isCheckedIn ? (
                                                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-0.5 rounded-full">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                        Checked In
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 font-semibold text-xs px-2.5 py-0.5 rounded-full">
                                                        Registered
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                                                {reg.checkedInAt ? (
                                                    <div>
                                                        <div>{new Date(reg.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                        <div className="text-[10px] text-slate-400">by {reg.checkedInBy || 'Staff'}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 italic">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
