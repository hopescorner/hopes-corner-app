'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    Legend
} from 'recharts';
import {
    Activity,
    Users,
    TrendingUp,
    BarChart3,
    Utensils,
    ShowerHead,
    WashingMachine,
    Bike,
    Scissors,
    Gift,
    Calendar,
    ArrowUp,
    ArrowDown,
    StickyNote,
    Filter,
    X,
    Check,
    MapPin,
    Home,
    UserCheck
} from 'lucide-react';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useDailyNotesStore, DailyNote } from '@/stores/useDailyNotesStore';
import { useModalStore } from '@/stores/useModalStore';
import { cn } from '@/lib/utils/cn';
import { useShallow } from 'zustand/react/shallow';
import {
    HOUSING_STATUSES,
    AGE_GROUPS,
    GENDERS,
} from '@/lib/constants/constants';

// Time range presets
const TIME_PRESETS = [
    { id: 'today', label: 'Today', days: 0 },
    { id: 'last7', label: 'Last 7 Days', days: 7 },
    { id: 'last14', label: 'Last 14 Days', days: 14 },
    { id: 'last30', label: 'Last 30 Days', days: 30 },
    { id: 'thisMonth', label: 'This Month', days: -1 },
    { id: 'last90', label: 'Last 90 Days', days: 90 },
    { id: 'custom', label: 'Custom', days: -2 },
];

// Program definitions
const PROGRAMS = [
    { id: 'meals', label: 'Meals', icon: Utensils, color: 'blue', bgColor: 'bg-blue-50', textColor: 'text-blue-600', borderColor: 'border-blue-200' },
    { id: 'showers', label: 'Showers', icon: ShowerHead, color: 'sky', bgColor: 'bg-sky-50', textColor: 'text-sky-600', borderColor: 'border-sky-200' },
    { id: 'laundry', label: 'Laundry', icon: WashingMachine, color: 'purple', bgColor: 'bg-purple-50', textColor: 'text-purple-600', borderColor: 'border-purple-200' },
    { id: 'bicycles', label: 'Bicycles', icon: Bike, color: 'emerald', bgColor: 'bg-emerald-50', textColor: 'text-emerald-600', borderColor: 'border-emerald-200' },
    { id: 'haircuts', label: 'Haircuts', icon: Scissors, color: 'amber', bgColor: 'bg-amber-50', textColor: 'text-amber-600', borderColor: 'border-amber-200' },
    { id: 'holidays', label: 'Holidays', icon: Gift, color: 'pink', bgColor: 'bg-pink-50', textColor: 'text-pink-600', borderColor: 'border-pink-200' },
];

// Views
const VIEWS = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
    { id: 'demographics', label: 'Demographics', icon: Users },
];

// Meal type options for demographics filtering
const DEMO_MEAL_TYPE_OPTIONS = [
    { key: 'guest', label: 'Guest Meals', color: '#3B82F6' },
    { key: 'extras', label: 'Extra Meals', color: '#F97316' },
    { key: 'rv', label: 'RV Meals', color: '#A855F7' },
    { key: 'dayWorker', label: 'Day Worker', color: '#22C55E' },
    { key: 'shelter', label: 'Shelter', color: '#EC4899' },
    { key: 'unitedEffort', label: 'United Effort', color: '#6366F1' },
    { key: 'lunchBags', label: 'Lunch Bags', color: '#EAB308' },
] as const;

type DemoMealTypeKey = typeof DEMO_MEAL_TYPE_OPTIONS[number]['key'];

const DEMO_MEAL_TYPE_DEFAULTS: Record<DemoMealTypeKey, boolean> = {
    guest: true, extras: true, rv: true, dayWorker: true,
    shelter: true, unitedEffort: true, lunchBags: true,
};

export function AnalyticsSection() {
    const {
        mealRecords,
        rvMealRecords,
        extraMealRecords,
        holidayRecords,
        haircutRecords,
        dayWorkerMealRecords,
        shelterMealRecords,
        unitedEffortMealRecords,
        lunchBagRecords,
    } = useMealsStore(
        useShallow((s) => ({
            mealRecords: s.mealRecords,
            rvMealRecords: s.rvMealRecords,
            extraMealRecords: s.extraMealRecords,
            holidayRecords: s.holidayRecords,
            haircutRecords: s.haircutRecords,
            dayWorkerMealRecords: s.dayWorkerMealRecords,
            shelterMealRecords: s.shelterMealRecords,
            unitedEffortMealRecords: s.unitedEffortMealRecords,
            lunchBagRecords: s.lunchBagRecords,
        }))
    );

    const { showerRecords, laundryRecords, bicycleRecords } = useServicesStore(
        useShallow((s) => ({
            showerRecords: s.showerRecords,
            laundryRecords: s.laundryRecords,
            bicycleRecords: s.bicycleRecords,
        }))
    );

    const guests = useGuestsStore((s) => s.guests);

    const { notes, getNotesForDateRange, loadFromSupabase: loadDailyNotes } = useDailyNotesStore(
        useShallow((s) => ({
            notes: s.notes,
            getNotesForDateRange: s.getNotesForDateRange,
            loadFromSupabase: s.loadFromSupabase,
        }))
    );

    const openNoteModal = useModalStore((s) => s.openNoteModal);

    const [isMounted, setIsMounted] = useState(false);
    const [activeView, setActiveView] = useState('overview');
    const [selectedPreset, setSelectedPreset] = useState('thisMonth');
    const [selectedPrograms, setSelectedPrograms] = useState(['meals', 'showers', 'laundry', 'bicycles', 'haircuts', 'holidays']);
    const [showComparison, setShowComparison] = useState(true);

    // Demographic filter state
    const [filterLocation, setFilterLocation] = useState<string>('all');
    const [filterAgeGroup, setFilterAgeGroup] = useState<string>('all');
    const [filterGender, setFilterGender] = useState<string>('all');
    const [filterHousing, setFilterHousing] = useState<string>('all');
    const [demoMealTypeFilters, setDemoMealTypeFilters] = useState(DEMO_MEAL_TYPE_DEFAULTS);

    // Custom date range state
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const [customStartDate, setCustomStartDate] = useState(firstOfMonth.toISOString().split('T')[0]);
    const [customEndDate, setCustomEndDate] = useState(today.toISOString().split('T')[0]);

    useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);

    // Load daily notes on mount
    useEffect(() => {
        loadDailyNotes();
    }, [loadDailyNotes]);

    // Calculate date range based on preset or custom dates
    const dateRange = useMemo(() => {
        const todayDate = new Date();
        const preset = TIME_PRESETS.find(p => p.id === selectedPreset);
        let startDate: Date;
        let endDate: Date = todayDate;

        if (preset?.id === 'custom') {
            // Use custom dates
            startDate = new Date(customStartDate);
            endDate = new Date(customEndDate);
        } else if (preset?.id === 'thisMonth') {
            startDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
        } else if (preset?.id === 'today') {
            startDate = new Date(todayDate);
        } else {
            startDate = new Date(todayDate);
            startDate.setDate(startDate.getDate() - (preset?.days || 30));
        }

        return {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
            days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        };
    }, [selectedPreset, customStartDate, customEndDate]);

    // Helper to check if date is in range
    const isInRange = useCallback((dateStr: string, start: string, end: string) => {
        if (!dateStr) return false;
        const d = dateStr.split('T')[0];
        return d >= start && d <= end;
    }, []);

    /** Count total individual repair services in a bicycle record (matches monthly summary logic). */
    const countBicycleServices = useCallback((record: any): number => {
        const types: string[] = record.repairTypes || (record.repairType ? [record.repairType] : []);
        return types.length || 1; // at least 1 service per visit
    }, []);

    const dateKeyOf = useCallback((record: any) => {
        return record?.dateKey || (typeof record?.date === 'string' ? record.date.split('T')[0] : '');
    }, []);

    const dailyCountMaps = useMemo(() => {
        const mealsByDay = new Map<string, number>();
        const showersDoneByDay = new Map<string, number>();
        const laundryDoneByDay = new Map<string, number>();
        const haircutsByDay = new Map<string, number>();
        const bicyclesDoneByDay = new Map<string, number>();

        const addToMap = (map: Map<string, number>, day: string, delta: number) => {
            if (!day) return;
            map.set(day, (map.get(day) || 0) + delta);
        };

        for (const r of [
            ...mealRecords,
            ...rvMealRecords,
            ...extraMealRecords,
            ...dayWorkerMealRecords,
            ...shelterMealRecords,
            ...unitedEffortMealRecords,
            ...lunchBagRecords,
        ]) {
            addToMap(mealsByDay, dateKeyOf(r), Number(r.count) || 0);
        }
        for (const r of showerRecords) {
            if (r.status === 'done') addToMap(showersDoneByDay, dateKeyOf(r), 1);
        }
        for (const r of laundryRecords) {
            if (['done', 'picked_up', 'returned', 'offsite_picked_up'].includes(r.status)) {
                addToMap(laundryDoneByDay, dateKeyOf(r), 1);
            }
        }
        for (const r of haircutRecords || []) {
            addToMap(haircutsByDay, dateKeyOf(r), 1);
        }
        for (const r of bicycleRecords) {
            if (r.status === 'done') addToMap(bicyclesDoneByDay, dateKeyOf(r), countBicycleServices(r));
        }

        return { mealsByDay, showersDoneByDay, laundryDoneByDay, bicyclesDoneByDay, haircutsByDay };
    }, [mealRecords, rvMealRecords, extraMealRecords, dayWorkerMealRecords, shelterMealRecords, unitedEffortMealRecords, lunchBagRecords, showerRecords, laundryRecords, bicycleRecords, haircutRecords, dateKeyOf, countBicycleServices]);

    // Calculate metrics for the selected range
    const metrics = useMemo(() => {
        const { start, end } = dateRange;
        const isRecordInRange = (record: { date?: string; dateKey?: string }) => isInRange(dateKeyOf(record), start, end);

        const meals = [
            ...mealRecords,
            ...rvMealRecords,
            ...extraMealRecords,
            ...dayWorkerMealRecords,
            ...shelterMealRecords,
            ...unitedEffortMealRecords,
            ...lunchBagRecords,
        ]
            .filter(isRecordInRange)
            .reduce((sum, r) => sum + (r.count || 0), 0);

        const showers = showerRecords
            .filter(r => isRecordInRange(r) && r.status === 'done')
            .length;

        const laundry = laundryRecords
            .filter(r => isRecordInRange(r) && ['done', 'picked_up', 'returned', 'offsite_picked_up'].includes(r.status))
            .length;

        const doneBicycles = bicycleRecords
            .filter(r => isRecordInRange(r) && r.status === 'done');
        const bicycles = doneBicycles.length;
        const bicycleServices = doneBicycles.reduce((sum, r) => sum + countBicycleServices(r), 0);

        const haircuts = (haircutRecords || [])
            .filter((r: { date: string; dateKey?: string }) => isRecordInRange(r))
            .length;

        const holidays = (holidayRecords || [])
            .filter((r: { date: string; dateKey?: string }) => isRecordInRange(r))
            .length;

        // Get unique guest IDs from all services
        const guestIds = new Set<string>();
        [
            ...mealRecords,
            ...rvMealRecords,
            ...extraMealRecords,
            ...dayWorkerMealRecords,
            ...shelterMealRecords,
            ...unitedEffortMealRecords,
            ...lunchBagRecords,
        ]
            .filter(isRecordInRange)
            .forEach(r => r.guestId && guestIds.add(r.guestId));
        showerRecords.filter(r => isRecordInRange(r) && r.status === 'done')
            .forEach(r => guestIds.add(r.guestId));
        laundryRecords.filter(r => isRecordInRange(r))
            .forEach(r => guestIds.add(r.guestId));
        bicycleRecords.filter(r => isRecordInRange(r) && r.status === 'done')
            .forEach(r => r.guestId && guestIds.add(r.guestId));

        return { meals, showers, laundry, bicycles, bicycleServices, haircuts, holidays, uniqueGuests: guestIds.size };
    }, [dateRange, mealRecords, rvMealRecords, extraMealRecords, dayWorkerMealRecords, shelterMealRecords, unitedEffortMealRecords, lunchBagRecords, showerRecords, laundryRecords, bicycleRecords, haircutRecords, holidayRecords, isInRange, dateKeyOf, countBicycleServices]);

    // Calculate comparison metrics (previous period)
    const prevPeriod = useMemo(() => {
        const { start, days } = dateRange;
        const prevEnd = new Date(start + 'T12:00:00');
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - days + 1);
        return {
            start: prevStart.toISOString().split('T')[0],
            end: prevEnd.toISOString().split('T')[0],
        };
    }, [dateRange]);

    const comparison = useMemo(() => {
        if (!showComparison) return null;

        const { start: pStart, end: pEnd } = prevPeriod;
        const isRecordInPreviousRange = (record: { date?: string; dateKey?: string }) => isInRange(dateKeyOf(record), pStart, pEnd);

        const prevMeals = [
            ...mealRecords,
            ...rvMealRecords,
            ...extraMealRecords,
            ...dayWorkerMealRecords,
            ...shelterMealRecords,
            ...unitedEffortMealRecords,
            ...lunchBagRecords,
        ]
            .filter(isRecordInPreviousRange)
            .reduce((sum, r) => sum + (r.count || 0), 0);

        const prevShowers = showerRecords
            .filter(r => isRecordInPreviousRange(r) && r.status === 'done').length;

        const prevLaundry = laundryRecords
            .filter(r => isRecordInPreviousRange(r) && ['done', 'picked_up', 'returned', 'offsite_picked_up'].includes(r.status)).length;

        const prevDoneBicycles = bicycleRecords
            .filter(r => isRecordInPreviousRange(r) && r.status === 'done');
        const prevBicycles = prevDoneBicycles.length;
        const prevBicycleServices = prevDoneBicycles.reduce((sum, r) => sum + countBicycleServices(r), 0);

        return {
            meals: metrics.meals - prevMeals,
            showers: metrics.showers - prevShowers,
            laundry: metrics.laundry - prevLaundry,
            bicycles: metrics.bicycles - prevBicycles,
            bicycleServices: metrics.bicycleServices - prevBicycleServices,
        };
    }, [dateRange, showComparison, metrics, prevPeriod, mealRecords, rvMealRecords, extraMealRecords, dayWorkerMealRecords, shelterMealRecords, unitedEffortMealRecords, lunchBagRecords, showerRecords, laundryRecords, bicycleRecords, isInRange, dateKeyOf]);

    // Daily breakdown for trends
    const dailyData = useMemo(() => {
        const days: { date: string, fullDate: string, meals: number, showers: number, laundry: number, bicycles: number, haircuts: number, hasNote: boolean }[] = [];
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        const noteDates = new Set(
            (notes || [])
                .filter((n) => n.noteDate >= dateRange.start && n.noteDate <= dateRange.end)
                .map((n) => n.noteDate)
        );

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];

            const dayMeals = dailyCountMaps.mealsByDay.get(dateStr) || 0;
            const dayShowers = dailyCountMaps.showersDoneByDay.get(dateStr) || 0;
            const dayLaundry = dailyCountMaps.laundryDoneByDay.get(dateStr) || 0;
            const dayBicycles = dailyCountMaps.bicyclesDoneByDay.get(dateStr) || 0;
            const dayHaircuts = dailyCountMaps.haircutsByDay.get(dateStr) || 0;

            days.push({
                date: `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${d.toLocaleDateString('en-US', { weekday: 'short' })})`,
                fullDate: dateStr,
                meals: dayMeals,
                showers: dayShowers,
                laundry: dayLaundry,
                bicycles: dayBicycles,
                haircuts: dayHaircuts,
                hasNote: noteDates.has(dateStr)
            });
        }
        return days;
    }, [dateRange, notes, dailyCountMaps]);

    // Notes summary for the selected date range
    const notesInRange = useMemo(() => {
        return getNotesForDateRange(dateRange.start, dateRange.end);
    }, [dateRange.start, dateRange.end, getNotesForDateRange]);

    // Demographics
    const demographics = useMemo(() => {
        const activeGuestIds = new Set<string>();

        // Collect guest IDs based on selected programs and meal type filters
        const addMealGuestIds = (records: Array<{ date?: string; dateKey?: string; guestId?: string }> = []) => {
            records
                .filter((r) => isInRange(dateKeyOf(r), dateRange.start, dateRange.end))
                .forEach((r) => r.guestId && activeGuestIds.add(r.guestId));
        };

        // Include meal guests only when Meals program is selected
        if (selectedPrograms.includes('meals')) {
            if (demoMealTypeFilters.guest) addMealGuestIds(mealRecords);
            if (demoMealTypeFilters.rv) addMealGuestIds(rvMealRecords);
            if (demoMealTypeFilters.extras) addMealGuestIds(extraMealRecords);
            if (demoMealTypeFilters.dayWorker) addMealGuestIds(dayWorkerMealRecords);
            if (demoMealTypeFilters.shelter) addMealGuestIds(shelterMealRecords);
            if (demoMealTypeFilters.unitedEffort) addMealGuestIds(unitedEffortMealRecords);
            if (demoMealTypeFilters.lunchBags) addMealGuestIds(lunchBagRecords);
        }

        // Include service guests based on their respective program selections
        if (selectedPrograms.includes('showers')) {
            showerRecords.filter(r => isInRange(r.date, dateRange.start, dateRange.end) && r.status === 'done')
                .forEach(r => activeGuestIds.add(r.guestId));
        }
        if (selectedPrograms.includes('laundry')) {
            laundryRecords.filter(r => isInRange(r.date, dateRange.start, dateRange.end))
                .forEach(r => activeGuestIds.add(r.guestId));
        }
        if (selectedPrograms.includes('bicycles')) {
            bicycleRecords.filter(r => isInRange(dateKeyOf(r), dateRange.start, dateRange.end) && r.status !== 'cancelled')
                .forEach(r => r.guestId && activeGuestIds.add(r.guestId));
        }
        if (selectedPrograms.includes('haircuts')) {
            (haircutRecords || []).filter((r: { date: string; dateKey?: string; guestId?: string }) => isInRange(dateKeyOf(r), dateRange.start, dateRange.end))
                .forEach((r: { guestId?: string }) => r.guestId && activeGuestIds.add(r.guestId));
        }
        if (selectedPrograms.includes('holidays')) {
            (holidayRecords || []).filter((r: { date: string; dateKey?: string; guestId?: string }) => isInRange(dateKeyOf(r), dateRange.start, dateRange.end))
                .forEach((r: { guestId?: string }) => r.guestId && activeGuestIds.add(r.guestId));
        }

        // Apply demographic filters to active guests
        const activeGuests = guests.filter(g => {
            if (!activeGuestIds.has(g.id)) return false;
            if (filterLocation !== 'all' && (g.location || 'Unknown') !== filterLocation) return false;
            if (filterAgeGroup !== 'all' && (g.age || 'Unknown') !== filterAgeGroup) return false;
            if (filterGender !== 'all' && (g.gender || 'Unknown') !== filterGender) return false;
            if (filterHousing !== 'all' && (g.housingStatus || 'Unknown') !== filterHousing) return false;
            return true;
        });

        const housingCounts: Record<string, number> = {};
        const ageCounts: Record<string, number> = {};
        const genderCounts: Record<string, number> = {};
        const locationCounts: Record<string, number> = {};

        activeGuests.forEach(g => {
            const housing = g.housingStatus || 'Unknown';
            const age = g.age || 'Unknown';
            const gender = g.gender || 'Unknown';
            const location = g.location || 'Unknown';

            housingCounts[housing] = (housingCounts[housing] || 0) + 1;
            ageCounts[age] = (ageCounts[age] || 0) + 1;
            genderCounts[gender] = (genderCounts[gender] || 0) + 1;
            locationCounts[location] = (locationCounts[location] || 0) + 1;
        });

        return {
            housingCounts,
            ageCounts,
            genderCounts,
            locationCounts,
            total: activeGuests.length
        };
    }, [dateRange, mealRecords, rvMealRecords, extraMealRecords, dayWorkerMealRecords, shelterMealRecords,
        unitedEffortMealRecords, lunchBagRecords, showerRecords, laundryRecords, bicycleRecords,
        haircutRecords, holidayRecords, guests, isInRange, dateKeyOf, selectedPrograms,
        demoMealTypeFilters, filterLocation, filterAgeGroup, filterGender, filterHousing]);

    // Unique locations from all guests for the filter dropdown
    const locationOptions = useMemo(() => {
        const locs = new Set<string>();
        guests.forEach(g => {
            if (g.location) locs.add(g.location);
        });
        return Array.from(locs).sort();
    }, [guests]);

    const toggleProgram = (id: string) => {
        setSelectedPrograms(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const toggleDemoMealType = useCallback((key: DemoMealTypeKey) => {
        setDemoMealTypeFilters(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const selectAllDemoMealTypes = useCallback(() => {
        setDemoMealTypeFilters(DEMO_MEAL_TYPE_DEFAULTS);
    }, []);

    const clearDemoMealTypes = useCallback(() => {
        setDemoMealTypeFilters(Object.fromEntries(
            DEMO_MEAL_TYPE_OPTIONS.map(o => [o.key, false])
        ) as Record<DemoMealTypeKey, boolean>);
    }, []);

    const clearDemographicFilters = useCallback(() => {
        setFilterLocation('all');
        setFilterAgeGroup('all');
        setFilterGender('all');
        setFilterHousing('all');
    }, []);

    const hasActiveDemoFilters = filterLocation !== 'all' || filterAgeGroup !== 'all' || filterGender !== 'all' || filterHousing !== 'all';
    const hasActiveMealTypeFilters = Object.values(demoMealTypeFilters).some(v => !v);

    const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

    // Render Overview
    const renderOverview = () => (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {selectedPrograms.includes('meals') && (
                    <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                        <div className="flex items-center gap-2 text-blue-600 mb-2">
                            <Utensils size={18} />
                            <span className="font-bold text-xs uppercase tracking-wider">Meals</span>
                        </div>
                        <p className="text-3xl font-black text-blue-900">{metrics.meals.toLocaleString()}</p>
                        {comparison && (
                            <div className={cn("flex items-center gap-1 mt-2 text-xs font-bold", comparison.meals >= 0 ? "text-emerald-600" : "text-red-600")}>
                                {comparison.meals >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                {Math.abs(comparison.meals)} vs prev
                            </div>
                        )}
                    </div>
                )}

                {selectedPrograms.includes('showers') && (
                    <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100">
                        <div className="flex items-center gap-2 text-sky-600 mb-2">
                            <ShowerHead size={18} />
                            <span className="font-bold text-xs uppercase tracking-wider">Showers</span>
                        </div>
                        <p className="text-3xl font-black text-sky-900">{metrics.showers.toLocaleString()}</p>
                        {comparison && (
                            <div className={cn("flex items-center gap-1 mt-2 text-xs font-bold", comparison.showers >= 0 ? "text-emerald-600" : "text-red-600")}>
                                {comparison.showers >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                {Math.abs(comparison.showers)} vs prev
                            </div>
                        )}
                    </div>
                )}

                {selectedPrograms.includes('laundry') && (
                    <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
                        <div className="flex items-center gap-2 text-purple-600 mb-2">
                            <WashingMachine size={18} />
                            <span className="font-bold text-xs uppercase tracking-wider">Laundry</span>
                        </div>
                        <p className="text-3xl font-black text-purple-900">{metrics.laundry.toLocaleString()}</p>
                        {comparison && (
                            <div className={cn("flex items-center gap-1 mt-2 text-xs font-bold", comparison.laundry >= 0 ? "text-emerald-600" : "text-red-600")}>
                                {comparison.laundry >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                {Math.abs(comparison.laundry)} vs prev
                            </div>
                        )}
                    </div>
                )}

                {selectedPrograms.includes('bicycles') && (
                    <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                        <div className="flex items-center gap-2 text-emerald-600 mb-2">
                            <Bike size={18} />
                            <span className="font-bold text-xs uppercase tracking-wider">Bicycles</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-3xl font-black text-emerald-900">{metrics.bicycleServices.toLocaleString()}</p>
                            <span className="text-xs font-bold text-emerald-600/70">services</span>
                        </div>
                        <p className="text-xs text-emerald-700/60 font-medium mt-0.5">{metrics.bicycles.toLocaleString()} {metrics.bicycles === 1 ? 'visit' : 'visits'}</p>
                        {comparison && (
                            <div className={cn("flex items-center gap-1 mt-2 text-xs font-bold", comparison.bicycleServices >= 0 ? "text-emerald-600" : "text-red-600")}>
                                {comparison.bicycleServices >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                {Math.abs(comparison.bicycleServices)} vs prev
                            </div>
                        )}
                    </div>
                )}

                {selectedPrograms.includes('haircuts') && (
                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                        <div className="flex items-center gap-2 text-amber-600 mb-2">
                            <Scissors size={18} />
                            <span className="font-bold text-xs uppercase tracking-wider">Haircuts</span>
                        </div>
                        <p className="text-3xl font-black text-amber-900">{metrics.haircuts.toLocaleString()}</p>
                    </div>
                )}

                {selectedPrograms.includes('holidays') && (
                    <div className="bg-pink-50 rounded-2xl p-4 border border-pink-100">
                        <div className="flex items-center gap-2 text-pink-600 mb-2">
                            <Gift size={18} />
                            <span className="font-bold text-xs uppercase tracking-wider">Holidays</span>
                        </div>
                        <p className="text-3xl font-black text-pink-900">{metrics.holidays.toLocaleString()}</p>
                    </div>
                )}
            </div>

            {/* Unique Guests Card */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3">
                    <Users size={24} />
                    <div>
                        <p className="text-indigo-100 text-sm font-bold uppercase tracking-wider">Unique Guests Served</p>
                        <p className="text-4xl font-black">{metrics.uniqueGuests.toLocaleString()}</p>
                    </div>
                </div>
                <p className="text-indigo-200 text-sm mt-2">
                    {dateRange.days} day{dateRange.days !== 1 ? 's' : ''} from {new Date(dateRange.start).toLocaleDateString()} to {new Date(dateRange.end).toLocaleDateString()}
                </p>
            </div>

            {/* Daily Notes Summary */}
            {notesInRange.length > 0 && (
                <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
                    <div className="flex items-center gap-3 mb-4">
                        <StickyNote size={20} className="text-amber-600" />
                        <h3 className="text-sm font-black text-amber-800 uppercase tracking-wider">
                            Operational Notes ({notesInRange.length})
                        </h3>
                    </div>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                        {notesInRange.map((note: DailyNote) => (
                            <button
                                key={note.id}
                                onClick={() => openNoteModal(note.noteDate, note.serviceType)}
                                className="w-full text-left p-3 bg-white rounded-xl border border-amber-100 hover:border-amber-300 transition-colors"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-amber-600">
                                        {new Date(note.noteDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className={cn(
                                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                                        note.serviceType === 'meals' && "bg-orange-100 text-orange-700",
                                        note.serviceType === 'showers' && "bg-sky-100 text-sky-700",
                                        note.serviceType === 'laundry' && "bg-violet-100 text-violet-700",
                                        note.serviceType === 'general' && "bg-gray-100 text-gray-700"
                                    )}>
                                        {note.serviceType}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-700 line-clamp-2">{note.noteText}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    // Custom tooltip for trends chart that shows notes
    const CustomChartTooltip = ({ active, payload, label }: {
        active?: boolean;
        payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
        label?: string;
    }) => {
        if (!active || !payload || payload.length === 0) return null;

        // Find the full date from the payload
        const dataPoint = dailyData.find(d => d.date === label);
        const fullDate = dataPoint?.fullDate;
        const dayNotes = fullDate ? getNotesForDateRange(fullDate, fullDate) : [];

        return (
            <div className="bg-white p-4 border border-gray-200 shadow-xl rounded-xl z-50 text-sm min-w-[180px]">
                <p className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                    {label}
                    {dataPoint?.hasNote && <StickyNote size={12} className="text-amber-500" />}
                </p>
                {payload.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-gray-600 capitalize">{entry.name}:</span>
                        <span className="font-semibold">{entry.value}</span>
                    </div>
                ))}
                {dayNotes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">📝 Notes</p>
                        {dayNotes.map((note: DailyNote) => (
                            <div key={note.id} className="text-xs text-gray-600 mb-1">
                                <span className="font-medium text-gray-700 capitalize">{note.serviceType}:</span>{' '}
                                <span className="line-clamp-2">{note.noteText}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Render Trends
    const renderTrends = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <TrendingUp size={16} /> Service Trends
                    {dailyData.some(d => d.hasNote) && (
                        <span className="text-amber-500 flex items-center gap-1 text-[10px] font-bold bg-amber-50 px-2 py-0.5 rounded-full">
                            <StickyNote size={10} />
                            {dailyData.filter(d => d.hasNote).length} days with notes
                        </span>
                    )}
                </h3>
                <div className="h-[300px] md:h-[400px] w-full">
                    {isMounted && dailyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyData}>
                                <defs>
                                    <linearGradient id="colorMeals" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorShowers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorLaundry" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorBicycles" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorHaircuts" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#9ca3af' }} interval="preserveStartEnd" angle={-45} textAnchor="end" height={60} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#9ca3af' }} />
                                <Tooltip content={<CustomChartTooltip />} />
                                <Legend />
                                {selectedPrograms.includes('meals') && (
                                    <Area type="monotone" dataKey="meals" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorMeals)" />
                                )}
                                {selectedPrograms.includes('showers') && (
                                    <Area type="monotone" dataKey="showers" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorShowers)" />
                                )}
                                {selectedPrograms.includes('laundry') && (
                                    <Area type="monotone" dataKey="laundry" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorLaundry)" />
                                )}
                                {selectedPrograms.includes('bicycles') && (
                                    <Area type="monotone" dataKey="bicycles" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorBicycles)" />
                                )}
                                {selectedPrograms.includes('haircuts') && (
                                    <Area type="monotone" dataKey="haircuts" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorHaircuts)" />
                                )}
                            </AreaChart>
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

    // Render Demographics
    const renderDemographics = () => (
        <div className="space-y-6">
            {/* Meal Type Filters — only visible when Meals program is selected */}
            {selectedPrograms.includes('meals') && <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Utensils size={16} className="text-gray-400" />
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Meal Types</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={selectAllDemoMealTypes} className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium">
                            <Check size={12} /> All
                        </button>
                        <button onClick={clearDemoMealTypes} className="text-xs text-gray-400 hover:underline flex items-center gap-1 font-medium">
                            <X size={12} /> Clear
                        </button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {DEMO_MEAL_TYPE_OPTIONS.map(type => {
                        const isSelected = demoMealTypeFilters[type.key];
                        return (
                            <button
                                key={type.key}
                                onClick={() => toggleDemoMealType(type.key)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                    isSelected
                                        ? "text-white border-transparent"
                                        : "bg-white text-gray-400 border-gray-200"
                                )}
                                style={isSelected ? { backgroundColor: type.color } : {}}
                            >
                                {type.label}
                            </button>
                        );
                    })}
                </div>
            </div>}

            {/* Demographic Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-gray-400" />
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Demographic Filters</p>
                    </div>
                    {hasActiveDemoFilters && (
                        <button
                            onClick={clearDemographicFilters}
                            className="text-xs text-red-500 hover:underline flex items-center gap-1 font-medium"
                        >
                            <X size={12} /> Clear Filters
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Location Filter */}
                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            <MapPin size={12} /> Location
                        </label>
                        <select
                            value={filterLocation}
                            onChange={e => setFilterLocation(e.target.value)}
                            className={cn(
                                "w-full px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
                                filterLocation !== 'all'
                                    ? "border-blue-300 bg-blue-50 text-blue-700"
                                    : "border-gray-200 bg-white text-gray-700"
                            )}
                        >
                            <option value="all">All Locations</option>
                            {locationOptions.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                            <option value="Unknown">Unknown</option>
                        </select>
                    </div>

                    {/* Age Group Filter */}
                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            <Users size={12} /> Age Group
                        </label>
                        <select
                            value={filterAgeGroup}
                            onChange={e => setFilterAgeGroup(e.target.value)}
                            className={cn(
                                "w-full px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
                                filterAgeGroup !== 'all'
                                    ? "border-blue-300 bg-blue-50 text-blue-700"
                                    : "border-gray-200 bg-white text-gray-700"
                            )}
                        >
                            <option value="all">All Age Groups</option>
                            {AGE_GROUPS.map(ag => (
                                <option key={ag} value={ag}>{ag}</option>
                            ))}
                            <option value="Unknown">Unknown</option>
                        </select>
                    </div>

                    {/* Gender Filter */}
                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            <UserCheck size={12} /> Gender
                        </label>
                        <select
                            value={filterGender}
                            onChange={e => setFilterGender(e.target.value)}
                            className={cn(
                                "w-full px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
                                filterGender !== 'all'
                                    ? "border-blue-300 bg-blue-50 text-blue-700"
                                    : "border-gray-200 bg-white text-gray-700"
                            )}
                        >
                            <option value="all">All Genders</option>
                            {GENDERS.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>

                    {/* Housing Status Filter */}
                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            <Home size={12} /> Housing Status
                        </label>
                        <select
                            value={filterHousing}
                            onChange={e => setFilterHousing(e.target.value)}
                            className={cn(
                                "w-full px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
                                filterHousing !== 'all'
                                    ? "border-blue-300 bg-blue-50 text-blue-700"
                                    : "border-gray-200 bg-white text-gray-700"
                            )}
                        >
                            <option value="all">All Statuses</option>
                            {HOUSING_STATUSES.map(hs => (
                                <option key={hs} value={hs}>{hs}</option>
                            ))}
                            <option value="Unknown">Unknown</option>
                        </select>
                    </div>
                </div>
                {(hasActiveDemoFilters || hasActiveMealTypeFilters) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {filterLocation !== 'all' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                                <MapPin size={10} /> {filterLocation}
                                <button onClick={() => setFilterLocation('all')} className="ml-0.5 hover:text-blue-900"><X size={10} /></button>
                            </span>
                        )}
                        {filterAgeGroup !== 'all' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                                <Users size={10} /> {filterAgeGroup}
                                <button onClick={() => setFilterAgeGroup('all')} className="ml-0.5 hover:text-blue-900"><X size={10} /></button>
                            </span>
                        )}
                        {filterGender !== 'all' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                                <UserCheck size={10} /> {filterGender}
                                <button onClick={() => setFilterGender('all')} className="ml-0.5 hover:text-blue-900"><X size={10} /></button>
                            </span>
                        )}
                        {filterHousing !== 'all' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                                <Home size={10} /> {filterHousing}
                                <button onClick={() => setFilterHousing('all')} className="ml-0.5 hover:text-blue-900"><X size={10} /></button>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Demographics Results */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <Users size={20} className="text-indigo-600" />
                    <h3 className="text-lg font-black text-gray-900">Guest Demographics</h3>
                    <span className="px-3 py-1 text-sm font-bold bg-indigo-100 text-indigo-700 rounded-full">
                        {demographics.total} active guests
                    </span>
                </div>

                {demographics.total === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Users size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="font-medium">No guests found for the selected filters.</p>
                        <p className="text-sm mt-1">Try expanding the date range or adjusting filters.</p>
                        {hasActiveDemoFilters && (
                            <button
                                onClick={clearDemographicFilters}
                                className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            >
                                Clear Demographic Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { title: 'Housing Status', data: demographics.housingCounts },
                            { title: 'Age Groups', data: demographics.ageCounts },
                            { title: 'Gender', data: demographics.genderCounts },
                            { title: 'Location', data: demographics.locationCounts },
                        ].map(({ title, data }) => {
                            const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
                            const total = entries.reduce((sum, [, count]) => sum + count, 0);
                            return (
                                <div key={title} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <h4 className="font-black text-gray-900 mb-4 text-sm uppercase tracking-wider">{title}</h4>
                                    <div className="space-y-2">
                                        {entries.slice(0, 5).map(([label, count], idx) => (
                                            <div key={label} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                                    <span className="text-sm text-gray-700">{label}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-gray-900">{count}</span>
                                                    <span className="text-xs text-gray-500">({total > 0 ? ((count / total) * 100).toFixed(0) : 0}%)</span>
                                                </div>
                                            </div>
                                        ))}
                                        {entries.length > 5 && (
                                            <p className="text-xs text-gray-400 pt-1">+{entries.length - 5} more</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                        <Activity className="text-blue-600" /> Analytics & Reports
                    </h2>
                    <p className="text-sm text-gray-500 font-medium mt-1">Comprehensive insights and time-based visualizations</p>
                </div>
            </div>

            {/* Time Range Selector */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    {TIME_PRESETS.map(preset => (
                        <button
                            key={preset.id}
                            onClick={() => setSelectedPreset(preset.id)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                selectedPreset === preset.id
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                {/* Custom Date Range Inputs */}
                {selectedPreset === 'custom' && (
                    <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-600">From:</label>
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                max={customEndDate}
                                className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-600">To:</label>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                min={customStartDate}
                                max={new Date().toISOString().split('T')[0]}
                                className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <span className="text-sm text-gray-500">
                            ({dateRange.days} day{dateRange.days !== 1 ? 's' : ''} selected)
                        </span>
                    </div>
                )}

                {/* Compare to previous period toggle */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                            type="checkbox"
                            checked={showComparison}
                            onChange={(e) => setShowComparison(e.target.checked)}
                            className="rounded"
                        />
                        Compare to previous period
                    </label>
                    {showComparison && (
                        <span className="text-xs text-gray-400">
                            {new Date(prevPeriod.start + 'T12:00:00').toLocaleDateString()} — {new Date(prevPeriod.end + 'T12:00:00').toLocaleDateString()}
                        </span>
                    )}
                </div>
            </div>

            {/* Program Selector */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Select Programs</p>
                <div className="flex flex-wrap gap-2">
                    {PROGRAMS.map(program => {
                        const Icon = program.icon;
                        const isSelected = selectedPrograms.includes(program.id);
                        return (
                            <button
                                key={program.id}
                                onClick={() => toggleProgram(program.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border-2",
                                    isSelected
                                        ? `${program.bgColor} ${program.textColor} ${program.borderColor}`
                                        : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                                )}
                            >
                                <Icon size={16} />
                                {program.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* View Tabs */}
            <div className="bg-white rounded-2xl border border-gray-100 p-2 shadow-sm">
                <nav className="flex gap-1">
                    {VIEWS.map(view => {
                        const Icon = view.icon;
                        return (
                            <button
                                key={view.id}
                                onClick={() => setActiveView(view.id)}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all",
                                    activeView === view.id
                                        ? "bg-blue-100 text-blue-700"
                                        : "text-gray-500 hover:bg-gray-100"
                                )}
                            >
                                <Icon size={16} />
                                {view.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Content */}
            <div>
                {activeView === 'overview' && renderOverview()}
                {activeView === 'trends' && renderTrends()}
                {activeView === 'demographics' && renderDemographics()}
            </div>
        </div>
    );
}
