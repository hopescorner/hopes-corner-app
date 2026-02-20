'use client';

import React, { useState, useMemo, useRef, useCallback } from "react";
import {
    Download,
    Utensils,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    PieChart as PieChartIcon,
    TrendingUp,
    Users,
    Check,
    X
} from "lucide-react";
import {
    ComposedChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Line,
    PieChart,
    Pie,
    Cell
} from "recharts";
import toast from "react-hot-toast";
import { useMealsStore } from "@/stores/useMealsStore";
import { useGuestsStore } from "@/stores/useGuestsStore";
import { todayPacificDateString } from "@/lib/utils/date";
import { exportToCSV } from "@/lib/utils/csv";
import { cn } from "@/lib/utils/cn";

const DAYS_OF_WEEK = [
    { value: 0, label: "Sunday", short: "Sun" },
    { value: 1, label: "Monday", short: "Mon" },
    { value: 3, label: "Wednesday", short: "Wed" },
    { value: 5, label: "Friday", short: "Fri" },
    { value: 6, label: "Saturday", short: "Sat" },
];

const MEAL_TYPE_OPTIONS = [
    { key: "guest", label: "Guest meals", description: "Registered guests served on-site.", color: "#3B82F6" },
    { key: "extras", label: "Extra meals", description: "Extra meals after service.", color: "#F97316" },
    { key: "rv", label: "RV meals", description: "Meals delivered to RV communities.", color: "#A855F7" },
    { key: "dayWorker", label: "Day Worker", description: "Partner deliveries for day workers.", color: "#22C55E" },
    { key: "shelter", label: "Shelter", description: "Support sent to shelter guests.", color: "#EC4899" },
    { key: "unitedEffort", label: "United Effort", description: "Meals shared with United Effort.", color: "#6366F1" },
    { key: "lunchBags", label: "Lunch Bags", description: "Bagged lunches distributed.", color: "#EAB308" },
] as const;

type MealTypeKey = typeof MEAL_TYPE_OPTIONS[number]['key'];

const MEAL_TYPE_DEFAULTS: Record<MealTypeKey, boolean> = {
    guest: true, extras: true, rv: true, dayWorker: true,
    shelter: true, unitedEffort: true, lunchBags: true,
};

const AGE_GROUP_COLORS = {
    "Adult 18-59": "#3B82F6",
    "Child 0-17": "#10B981",
    "Senior 60+": "#F59E0B",
    "Unknown": "#9CA3AF"
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; dataKey: string }>; label?: string }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-4 border border-gray-200 shadow-xl rounded-xl z-50 text-sm">
                <p className="font-bold text-gray-800 mb-2">{label}</p>
                {payload.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-gray-600">{entry.name}:</span>
                        <span className="font-semibold">{entry.value}</span>
                    </div>
                ))}
                <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between">
                    <span className="text-gray-500 font-medium">Total:</span>
                    <span className="font-bold text-gray-900">
                        {payload.reduce((sum: number, entry) =>
                            entry.dataKey === 'uniqueGuests' ? sum : sum + entry.value
                            , 0)}
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

export const MealReport = () => {
    const {
        mealRecords, rvMealRecords, shelterMealRecords, unitedEffortMealRecords,
        extraMealRecords, dayWorkerMealRecords, lunchBagRecords
    } = useMealsStore();
    const { guests } = useGuestsStore();
    const chartRef = useRef<HTMLDivElement>(null);

    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5, 6]);
    const [comparisonMonths, setComparisonMonths] = useState(6);
    const [mealTypeFilters, setMealTypeFilters] = useState(MEAL_TYPE_DEFAULTS);
    const [isMounted, setIsMounted] = useState(false);

    React.useEffect(() => { setIsMounted(true); }, []);

    const toggleMealType = useCallback((key: MealTypeKey) => {
        setMealTypeFilters((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const selectAllMealTypes = useCallback(() => {
        setMealTypeFilters(MEAL_TYPE_DEFAULTS);
    }, []);

    const clearMealTypes = useCallback(() => {
        setMealTypeFilters(Object.fromEntries(
            MEAL_TYPE_OPTIONS.map(o => [o.key, false])
        ) as Record<MealTypeKey, boolean>);
    }, []);

    const months = useMemo(() => [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ], []);

    const toggleDay = (dayValue: number) => {
        setSelectedDays((prev) =>
            prev.includes(dayValue)
                ? prev.filter((d) => d !== dayValue)
                : [...prev, dayValue].sort((a, b) => a - b)
        );
    };

    const shiftMonth = (offset: number) => {
        const newDate = new Date(selectedYear, selectedMonth + offset);
        setSelectedYear(newDate.getFullYear());
        setSelectedMonth(newDate.getMonth());
    };

    const goToCurrentMonth = () => {
        setSelectedYear(currentDate.getFullYear());
        setSelectedMonth(currentDate.getMonth());
    };

    const isCurrentMonth = selectedYear === currentDate.getFullYear() && selectedMonth === currentDate.getMonth();

    const getDateFromRecord = (record: { date: string }) => {
        if (!record.date) return null;
        return new Date(record.date);
    };

    const getDayOfWeek = (date: Date) => date.getDay();

    const isDateInMonth = (date: Date, year: number, month: number) => {
        return date.getFullYear() === year && date.getMonth() === month;
    };

    // Core Calculation
    const calculateMealData = useMemo(() => {
        const results = [];
        const monthNames = months;

        for (let monthOffset = 0; monthOffset <= comparisonMonths; monthOffset++) {
            const targetDate = new Date(selectedYear, selectedMonth - monthOffset);
            const targetYear = targetDate.getFullYear();
            const targetMonth = targetDate.getMonth();
            const monthLabel = `${monthNames[targetMonth]} ${targetYear}`;

            const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
            let validDaysCount = 0;

            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(targetYear, targetMonth, day);
                const dayOfWeek = getDayOfWeek(date);
                if (selectedDays.includes(dayOfWeek)) validDaysCount++;
            }

            const filterRecordsByDayAndMonth = (records: any[]) => {
                return records.filter((record) => {
                    const date = getDateFromRecord(record);
                    if (!date) return false;
                    const dayOfWeek = getDayOfWeek(date);
                    return isDateInMonth(date, targetYear, targetMonth) && selectedDays.includes(dayOfWeek);
                });
            };

            const sumCounts = (records: any[]) =>
                records.reduce((sum, r) => sum + (r.count || r.quantity || 0), 0);

            const monthMeals = mealTypeFilters.guest ? filterRecordsByDayAndMonth(mealRecords) : [];
            const monthExtraMeals = mealTypeFilters.extras ? filterRecordsByDayAndMonth(extraMealRecords) : [];
            const monthRvMeals = mealTypeFilters.rv ? filterRecordsByDayAndMonth(rvMealRecords) : [];
            const monthDayWorkerMeals = mealTypeFilters.dayWorker ? filterRecordsByDayAndMonth(dayWorkerMealRecords) : [];
            const monthShelterMeals = mealTypeFilters.shelter ? filterRecordsByDayAndMonth(shelterMealRecords) : [];
            const monthUnitedEffortMeals = mealTypeFilters.unitedEffort ? filterRecordsByDayAndMonth(unitedEffortMealRecords) : [];
            const monthLunchBags = mealTypeFilters.lunchBags ? filterRecordsByDayAndMonth(lunchBagRecords) : [];

            const guestMealsCount = sumCounts(monthMeals);
            const extraMealsCount = sumCounts(monthExtraMeals);
            const rvMealsCount = sumCounts(monthRvMeals);
            const dayWorkerMealsCount = sumCounts(monthDayWorkerMeals);
            const shelterMealsCount = sumCounts(monthShelterMeals);
            const unitedEffortMealsCount = sumCounts(monthUnitedEffortMeals);
            const lunchBagsCount = sumCounts(monthLunchBags);

            const allRecords = [
                ...monthMeals, ...monthRvMeals, ...monthShelterMeals, ...monthUnitedEffortMeals,
                ...monthExtraMeals, ...monthDayWorkerMeals, ...monthLunchBags,
            ];

            const uniqueGuestIds = new Set(allRecords.map((r) => r.guestId).filter(Boolean));

            // Age Groups
            const ageGroups: Record<string, number> = {
                "Adult 18-59": 0, "Child 0-17": 0, "Senior 60+": 0, Unknown: 0,
            };

            uniqueGuestIds.forEach((guestId) => {
                const guest = guests.find(
                    (g) => String(g.id) === String(guestId) || g.guestId === guestId
                );
                const age = guest?.age || (guest as any)?.ageGroup || (guest as any)?.age_group;

                if (age) {
                    if (age.includes('Adult')) ageGroups["Adult 18-59"]++;
                    else if (age.includes('Child')) ageGroups["Child 0-17"]++;
                    else if (age.includes('Senior')) ageGroups["Senior 60+"]++;
                    else ageGroups.Unknown++;
                } else {
                    ageGroups.Unknown++;
                }
            });

            const totalMealsServed =
                guestMealsCount + extraMealsCount + rvMealsCount + dayWorkerMealsCount +
                shelterMealsCount + unitedEffortMealsCount + lunchBagsCount;

            const uniqueGuestsPerServiceDay = validDaysCount ? uniqueGuestIds.size / validDaysCount : uniqueGuestIds.size;

            results.push({
                month: monthLabel, year: targetYear, monthIndex: targetMonth,
                guestMeals: guestMealsCount, extras: extraMealsCount, rvMeals: rvMealsCount,
                dayWorkerMeals: dayWorkerMealsCount, shelterMeals: shelterMealsCount,
                unitedEffortMeals: unitedEffortMealsCount, lunchBags: lunchBagsCount,
                totalMeals: totalMealsServed, uniqueGuestsPerServiceDay,
                uniqueGuests: uniqueGuestIds.size, validDaysCount, isCurrentMonth: monthOffset === 0,
                ageGroups,
            });
        }

        return results.reverse();
    }, [selectedYear, selectedMonth, selectedDays, comparisonMonths, mealRecords, rvMealRecords,
        shelterMealRecords, unitedEffortMealRecords, extraMealRecords, dayWorkerMealRecords,
        lunchBagRecords, mealTypeFilters, months, guests]);

    const currentMonthData = useMemo(() => {
        if (!calculateMealData.length) return null;
        return calculateMealData[calculateMealData.length - 1];
    }, [calculateMealData]);

    // Pie chart data for meal type breakdown
    const mealTypePieData = useMemo(() => {
        if (!currentMonthData) return [];
        return [
            { name: "Guest", value: currentMonthData.guestMeals, color: "#3B82F6" },
            { name: "Extras", value: currentMonthData.extras, color: "#F97316" },
            { name: "RV", value: currentMonthData.rvMeals, color: "#A855F7" },
            { name: "Day Worker", value: currentMonthData.dayWorkerMeals, color: "#22C55E" },
            { name: "Shelter", value: currentMonthData.shelterMeals, color: "#EC4899" },
            { name: "United Effort", value: currentMonthData.unitedEffortMeals, color: "#6366F1" },
            { name: "Lunch Bags", value: currentMonthData.lunchBags, color: "#EAB308" },
        ].filter(item => item.value > 0);
    }, [currentMonthData]);

    // Pie chart data for age breakdown
    const ageGroupPieData = useMemo(() => {
        if (!currentMonthData) return [];
        const { ageGroups } = currentMonthData;
        return [
            { name: "Adult 18-59", value: ageGroups["Adult 18-59"], color: AGE_GROUP_COLORS["Adult 18-59"] },
            { name: "Child 0-17", value: ageGroups["Child 0-17"], color: AGE_GROUP_COLORS["Child 0-17"] },
            { name: "Senior 60+", value: ageGroups["Senior 60+"], color: AGE_GROUP_COLORS["Senior 60+"] },
            { name: "Unknown", value: ageGroups.Unknown, color: AGE_GROUP_COLORS["Unknown"] },
        ].filter(item => item.value > 0);
    }, [currentMonthData]);

    const exportCSV = () => {
        if (!calculateMealData.length) {
            toast.error("No data to export");
            return;
        }

        const dataToExport = calculateMealData.map(m => ({
            Month: m.month,
            "Total Meals": m.totalMeals,
            "Guest Meals": m.guestMeals,
            "Extras": m.extras,
            "RV Meals": m.rvMeals,
            "Day Worker": m.dayWorkerMeals,
            "Shelter": m.shelterMeals,
            "United Effort": m.unitedEffortMeals,
            "Lunch Bags": m.lunchBags,
            "Unique Guests": m.uniqueGuests,
            "Avg Guests/Day": m.uniqueGuestsPerServiceDay.toFixed(1),
            "Adults": m.ageGroups["Adult 18-59"],
            "Children": m.ageGroups["Child 0-17"],
            "Seniors": m.ageGroups["Senior 60+"],
        }));

        exportToCSV(dataToExport, `meal-report-${selectedYear}-${months[selectedMonth]}.csv`);
        toast.success("Meal report exported successfully!");
    };

    return (
        <div className="space-y-6">
            {/* Header / Controls */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
                            <Utensils size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Meal Services Report</h2>
                            <p className="text-gray-500">Analyze meal distribution trends and volume</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Go to Current Month button */}
                        {!isCurrentMonth && (
                            <button
                                onClick={goToCurrentMonth}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            >
                                <RotateCcw size={16} />
                                Current
                            </button>
                        )}
                        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                            <button
                                onClick={() => shiftMonth(-1)}
                                className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span className="min-w-[140px] text-center font-bold text-gray-900">
                                {months[selectedMonth]} {selectedYear}
                            </span>
                            <button
                                onClick={() => shiftMonth(1)}
                                className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600"
                                disabled={isCurrentMonth}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex flex-col lg:flex-row gap-8">
                    {/* Days Filter */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">
                            Service Days
                        </label>
                        <div className="flex gap-2">
                            {DAYS_OF_WEEK.map((day) => {
                                const isSelected = selectedDays.includes(day.value);
                                return (
                                    <button
                                        key={day.value}
                                        onClick={() => toggleDay(day.value)}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-bold border transition-all",
                                            isSelected
                                                ? "bg-gray-900 text-white border-gray-900"
                                                : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                                        )}
                                    >
                                        {day.short}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Comparison Months Slider */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">
                            Compare ({comparisonMonths + 1} months)
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="11"
                            value={comparisonMonths}
                            onChange={(e) => setComparisonMonths(parseInt(e.target.value))}
                            className="w-40 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                    </div>

                    {/* Meal Types Filter */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Categories
                            </label>
                            <div className="flex gap-2">
                                <button onClick={selectAllMealTypes} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                    <Check size={12} /> All
                                </button>
                                <button onClick={clearMealTypes} className="text-xs text-gray-400 hover:underline flex items-center gap-1">
                                    <X size={12} /> Clear
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {MEAL_TYPE_OPTIONS.map((type) => {
                                const isSelected = mealTypeFilters[type.key];
                                return (
                                    <button
                                        key={type.key}
                                        onClick={() => toggleMealType(type.key)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                            isSelected
                                                ? "text-white border-transparent"
                                                : "bg-white text-gray-400 border-gray-100"
                                        )}
                                        style={isSelected ? { backgroundColor: type.color } : {}}
                                    >
                                        {type.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Trend Chart */}
            <div ref={chartRef} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                        <TrendingUp size={20} className="text-blue-600" />
                        {comparisonMonths + 1} Month Trend
                    </h3>
                    <button
                        onClick={exportCSV}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                    >
                        <Download size={16} />
                        Export CSV
                    </button>
                </div>

                <div className="h-[400px] w-full">
                    {isMounted ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={calculateMealData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar dataKey="guestMeals" name="Guest Meals" stackId="a" fill="#3B82F6" radius={[0, 0, 4, 4]} />
                                <Bar dataKey="extras" name="Extras" stackId="a" fill="#F97316" />
                                <Bar dataKey="rvMeals" name="RV Meals" stackId="a" fill="#A855F7" />
                                <Bar dataKey="dayWorkerMeals" name="Day Worker" stackId="a" fill="#22C55E" />
                                <Bar dataKey="shelterMeals" name="Shelter" stackId="a" fill="#EC4899" />
                                <Bar dataKey="unitedEffortMeals" name="United Effort" stackId="a" fill="#6366F1" />
                                <Bar dataKey="lunchBags" name="Lunch Bags" stackId="a" fill="#EAB308" radius={[4, 4, 0, 0]} />
                                <Line type="monotone" dataKey="uniqueGuests" name="Unique Guests" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center bg-gray-50 rounded-xl animate-pulse">
                            <span className="text-gray-400">Loading chart...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Pie Charts Section */}
            {currentMonthData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Meal Type Breakdown */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <h3 className="font-bold text-lg text-gray-900 mb-6 flex items-center gap-2">
                            <PieChartIcon size={20} className="text-purple-600" />
                            Meal Type Breakdown — {currentMonthData.month}
                        </h3>
                        <div className="flex items-center gap-6">
                            <div className="h-[200px] w-[200px]">
                                {isMounted && mealTypePieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={mealTypePieData} innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                                                {mealTypePieData.map((entry, idx) => (
                                                    <Cell key={`cell-${idx}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-gray-50 rounded-full">
                                        <span className="text-gray-400 text-sm">No data</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 space-y-2">
                                {mealTypePieData.map((item) => (
                                    <div key={item.name} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className="text-sm text-gray-700">{item.name}</span>
                                        </div>
                                        <span className="font-bold text-gray-900">{item.value.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Age Group Breakdown */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <h3 className="font-bold text-lg text-gray-900 mb-6 flex items-center gap-2">
                            <Users size={20} className="text-emerald-600" />
                            Guest Age Groups — {currentMonthData.month}
                        </h3>
                        <div className="flex items-center gap-6">
                            <div className="h-[200px] w-[200px]">
                                {isMounted && ageGroupPieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={ageGroupPieData} innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                                                {ageGroupPieData.map((entry, idx) => (
                                                    <Cell key={`cell-${idx}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-gray-50 rounded-full">
                                        <span className="text-gray-400 text-sm">No data</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 space-y-2">
                                {ageGroupPieData.map((item) => (
                                    <div key={item.name} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className="text-sm text-gray-700">{item.name}</span>
                                        </div>
                                        <span className="font-bold text-gray-900">{item.value.toLocaleString()}</span>
                                    </div>
                                ))}
                                <div className="pt-2 border-t border-gray-200 mt-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Total Unique Guests:</span>
                                        <span className="font-bold text-gray-900">{currentMonthData.uniqueGuests}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            {currentMonthData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                        <p className="text-blue-600 font-medium text-sm mb-1">Total Meals Served</p>
                        <p className="text-4xl font-black text-blue-900">{currentMonthData.totalMeals.toLocaleString()}</p>
                        <p className="text-blue-600/80 text-xs mt-2">{currentMonthData.month}</p>
                    </div>
                    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                        <p className="text-emerald-600 font-medium text-sm mb-1">Unique Guests</p>
                        <p className="text-4xl font-black text-emerald-900">{currentMonthData.uniqueGuests.toLocaleString()}</p>
                        <p className="text-emerald-600/80 text-xs mt-2">~{currentMonthData.uniqueGuestsPerServiceDay.toFixed(0)} per day</p>
                    </div>
                    <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                        <p className="text-purple-600 font-medium text-sm mb-1">RV & Outreach</p>
                        <p className="text-4xl font-black text-purple-900">
                            {(currentMonthData.rvMeals + currentMonthData.shelterMeals + currentMonthData.dayWorkerMeals).toLocaleString()}
                        </p>
                        <p className="text-purple-600/80 text-xs mt-2">Off-site meals</p>
                    </div>
                    <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
                        <p className="text-orange-600 font-medium text-sm mb-1">Extras & Lunch Bags</p>
                        <p className="text-4xl font-black text-orange-900">
                            {(currentMonthData.extras + currentMonthData.lunchBags).toLocaleString()}
                        </p>
                        <p className="text-orange-600/80 text-xs mt-2">Supplemental</p>
                    </div>
                </div>
            )}
        </div>
    );
};
