'use client';

import React, { useMemo, useCallback, useState } from 'react';
import {
    Bike,
    Download,
    Info,
    Lightbulb,
    ShowerHead,
} from 'lucide-react';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { pacificDateStringFrom } from '@/lib/utils/date';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

interface MealColumnDefinition {
    key: string;
    label: string;
    description: string | null;
    align: 'left' | 'right';
    headerBg: string;
    cellBg: string;
    totalCellBg: string;
    bodyClass?: string;
    totalBodyClass?: string;
    isNumeric: boolean;
}

const MEAL_COLUMN_DEFINITIONS: MealColumnDefinition[] = [
    {
        key: 'month',
        label: 'Month',
        description: null,
        align: 'left',
        headerBg: 'bg-gray-50',
        cellBg: 'bg-white',
        totalCellBg: 'bg-gray-100',
        bodyClass: 'font-medium text-gray-900',
        totalBodyClass: 'font-bold text-gray-900',
        isNumeric: false,
    },
    {
        key: 'mondayMeals',
        label: 'Monday',
        description: 'Hot guest meals served during the Monday dining service.',
        align: 'right',
        headerBg: 'bg-gray-100',
        cellBg: 'bg-gray-50',
        totalCellBg: 'bg-gray-100',
        isNumeric: true,
    },
    {
        key: 'wednesdayMeals',
        label: 'Wednesday',
        description: 'Hot guest meals served during the Wednesday meal service.',
        align: 'right',
        headerBg: 'bg-gray-100',
        cellBg: 'bg-gray-50',
        totalCellBg: 'bg-gray-100',
        isNumeric: true,
    },
    {
        key: 'saturdayMeals',
        label: 'Saturday',
        description: 'Saturday hot meals for in-person buffet service.',
        align: 'right',
        headerBg: 'bg-gray-100',
        cellBg: 'bg-gray-50',
        totalCellBg: 'bg-gray-100',
        isNumeric: true,
    },
    {
        key: 'fridayMeals',
        label: 'Friday',
        description: 'Friday coffee and breakfast meals served to guests.',
        align: 'right',
        headerBg: 'bg-blue-50',
        cellBg: 'bg-blue-50/50',
        totalCellBg: 'bg-blue-50',
        isNumeric: true,
    },
    {
        key: 'uniqueGuests',
        label: 'Unique Guests',
        description: 'Number of unique guests who received meals this month.',
        align: 'right',
        headerBg: 'bg-emerald-50',
        cellBg: 'bg-emerald-50/50',
        totalCellBg: 'bg-emerald-50',
        isNumeric: true,
    },
    {
        key: 'newGuests',
        label: 'New Guests',
        description: 'Number of guests who received their first meal ever this month.',
        align: 'right',
        headerBg: 'bg-sky-50',
        cellBg: 'bg-sky-50/50',
        totalCellBg: 'bg-sky-50',
        isNumeric: true,
    },
    {
        key: 'proxyPickups',
        label: 'Proxy Pickups',
        description: 'Meals picked up by a different guest on behalf of the intended guest.',
        align: 'right',
        headerBg: 'bg-amber-50',
        cellBg: 'bg-amber-50/50',
        totalCellBg: 'bg-amber-50',
        isNumeric: true,
    },
    {
        key: 'onsiteHotMeals',
        label: 'Onsite Hot Meals',
        description: 'Guest meals served onsite (Mon/Wed/Fri/Sat) plus extra meals.',
        align: 'right',
        headerBg: 'bg-white',
        cellBg: 'bg-white',
        totalCellBg: 'bg-gray-50',
        totalBodyClass: 'font-bold text-gray-900',
        isNumeric: true,
    },
    {
        key: 'dayWorkerMeals',
        label: 'Day Worker',
        description: 'Meals prepared for the Day Worker Center.',
        align: 'right',
        headerBg: 'bg-orange-50',
        cellBg: 'bg-orange-50/30',
        totalCellBg: 'bg-orange-50',
        isNumeric: true,
    },
    {
        key: 'rvWedSat',
        label: 'RV Wed+Sat',
        description: 'Meals delivered to RV community on Wed/Sat.',
        align: 'right',
        headerBg: 'bg-orange-50',
        cellBg: 'bg-orange-50/30',
        totalCellBg: 'bg-orange-50',
        isNumeric: true,
    },
    {
        key: 'rvMonThu',
        label: 'RV Mon+Thu',
        description: 'Meals delivered to RV community on Mon/Thu.',
        align: 'right',
        headerBg: 'bg-orange-50',
        cellBg: 'bg-orange-50/30',
        totalCellBg: 'bg-orange-50',
        isNumeric: true,
    },
    {
        key: 'extraMeals',
        label: 'Extra Meals',
        description: 'Additional hot meals plated beyond scheduled count (volunteers, seconds).',
        align: 'right',
        headerBg: 'bg-purple-50',
        cellBg: 'bg-purple-50/30',
        totalCellBg: 'bg-purple-50',
        isNumeric: true,
    },
    {
        key: 'lunchBags',
        label: 'Lunch Bags',
        description: 'Take-away lunch bags distributed.',
        align: 'right',
        headerBg: 'bg-purple-50',
        cellBg: 'bg-purple-50/30',
        totalCellBg: 'bg-purple-50',
        isNumeric: true,
    },
    {
        key: 'totalHotMeals',
        label: 'TOTAL HOT MEALS',
        description: 'All hot meals served across all programs.',
        align: 'right',
        headerBg: 'bg-gray-100',
        cellBg: 'bg-white',
        totalCellBg: 'bg-gray-200',
        bodyClass: 'font-bold text-gray-900',
        totalBodyClass: 'font-black text-gray-900',
        isNumeric: true,
    },
    {
        key: 'totalWithLunchBags',
        label: 'Total w/ Lunch Bags',
        description: 'TOTAL HOT MEALS plus lunch bags.',
        align: 'right',
        headerBg: 'bg-gray-100',
        cellBg: 'bg-white',
        totalCellBg: 'bg-gray-200',
        bodyClass: 'font-bold text-gray-900',
        totalBodyClass: 'font-black text-gray-900',
        isNumeric: true,
    },
];

const MEAL_TABLE_GROUPS = [
    {
        key: 'onsite',
        title: 'Onsite Operations',
        headerClass: 'bg-blue-50 text-blue-900',
        columns: ['mondayMeals', 'wednesdayMeals', 'fridayMeals', 'saturdayMeals', 'uniqueGuests', 'newGuests', 'proxyPickups', 'onsiteHotMeals']
    },
    {
        key: 'outreach',
        title: 'Outreach & Partners',
        headerClass: 'bg-orange-50 text-orange-900',
        columns: ['dayWorkerMeals', 'rvWedSat', 'rvMonThu']
    },
    {
        key: 'production',
        title: 'Production Extras',
        headerClass: 'bg-purple-50 text-purple-900',
        columns: ['extraMeals', 'lunchBags']
    },
    {
        key: 'totals',
        title: 'Grand Totals',
        headerClass: 'bg-gray-100 text-gray-900',
        columns: ['totalHotMeals', 'totalWithLunchBags']
    }
];

const formatNumber = (value: number | string | undefined) => {
    if (value == null) return '0';
    const num = Number(value);
    return isNaN(num) ? String(value) : num.toLocaleString();
};

const ColumnTooltip = ({ label, description }: { label: string, description: string }) => (
    <div className="group relative inline-flex items-center text-gray-400 hover:text-gray-600 cursor-help">
        <Info size={14} />
        <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-200
            absolute z-[99999] w-64 p-3 bg-gray-900 text-white text-xs rounded-lg 
            top-full left-1/2 -translate-x-1/2 mt-2"
            style={{
                filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))',
            }}>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
            <p className="font-bold mb-1">{label}</p>
            <p className="font-normal text-gray-300 leading-relaxed">{description}</p>
        </div>
    </div>
);

export default function MonthlySummaryReport() {
    const {
        mealRecords,
        extraMealRecords,
        rvMealRecords,
        unitedEffortMealRecords,
        dayWorkerMealRecords,
        lunchBagRecords,
        shelterMealRecords
    } = useMealsStore();

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const availableYears = useMemo(() => {
        const years = [];
        for (let y = currentYear; y >= 2023; y--) years.push(y);
        return years;
    }, [currentYear]);

    const upcomingMonthsLabel = useMemo(() => {
        const firstUpcomingMonthIndex =
            selectedYear < currentYear
                ? 12
                : selectedYear > currentYear
                    ? 0
                    : currentMonth + 1;

        const upcomingMonths = MONTH_NAMES.slice(firstUpcomingMonthIndex);
        if (upcomingMonths.length === 0) return '';
        return upcomingMonths.join(', ');
    }, [selectedYear, currentYear, currentMonth]);

    const getDayOfWeek = useCallback((dateStr: string) => {
        if (!dateStr) return null;
        // Parse "YYYY-MM-DD" in Pacific time correctly
        // We can just use new Date(dateStr) if it's ISO YYYY-MM-DD, 
        // but `pacificDateStringFrom` returns YYYY-MM-DD.
        // `new Date("2023-01-01")` is UTC usually. 
        // Ideally we split and create date.
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return date.getDay();
    }, []);

    const filterRecords = useCallback((records: any[], year: number, month: number, days?: number[]) => {
        return (records || []).filter(r => {
            if (!r.date) return false;
            // r.date is ISO timestamp usually in Supabase, let's convert to date object
            const d = new Date(r.date);
            // This relies on the browser's timezone unless we handle timezone carefully.
            // The old app used `new Date(record.date)` directly.
            if (d.getFullYear() !== year || d.getMonth() !== month) return false;

            if (days) {
                // We need to double check if typical ISO string works for getDay() matches local
                // If the app is used in Pacific time, this is "okay". 
                // Better to rely on the stored date string if it's strictly YYYY-MM-DD
                return days.includes(d.getDay());
            }
            return true;
        });
    }, []);

    const sumQuantities = (records: any[]) => records.reduce((sum, r) => sum + (r.count || 0), 0);

    // Pre-compute each guest's first meal date across ALL meal records for accurate "new guests" calculation
    const guestFirstMealMonth = useMemo(() => {
        const firstMealMap = new Map<string, { year: number; month: number }>();
        const allMealRecords = [
            ...(mealRecords || []),
            ...(extraMealRecords || []),
            ...(rvMealRecords || []),
            ...(unitedEffortMealRecords || []),
            ...(dayWorkerMealRecords || []),
            ...(lunchBagRecords || []),
            ...(shelterMealRecords || []),
        ];

        allMealRecords.forEach((record: any) => {
            if (!record?.guestId || !record?.date) return;
            const d = new Date(record.date);
            const year = d.getFullYear();
            const month = d.getMonth();

            const existing = firstMealMap.get(record.guestId);
            if (!existing || year < existing.year || (year === existing.year && month < existing.month)) {
                firstMealMap.set(record.guestId, { year, month });
            }
        });

        return firstMealMap;
    }, [mealRecords, extraMealRecords, rvMealRecords, unitedEffortMealRecords, dayWorkerMealRecords, lunchBagRecords, shelterMealRecords]);

    const monthlyData = useMemo(() => {
        const months = [];
        const effectiveLastMonth = selectedYear === currentYear ? currentMonth : 11;

        for (let month = 0; month <= effectiveLastMonth; month++) {
            const monthName = MONTH_NAMES[month];

            // Filter sets
            const mealsInMonth = filterRecords(mealRecords, selectedYear, month);
            const extraInMonth = filterRecords(extraMealRecords, selectedYear, month);

            const mondayMeals = sumQuantities(filterRecords(mealRecords, selectedYear, month, [1]));
            const wednesdayMeals = sumQuantities(filterRecords(mealRecords, selectedYear, month, [3]));
            const fridayMeals = sumQuantities(filterRecords(mealRecords, selectedYear, month, [5]));
            const saturdayMeals = sumQuantities(filterRecords(mealRecords, selectedYear, month, [6]));

            const dayWorker = sumQuantities(filterRecords(dayWorkerMealRecords, selectedYear, month));
            const extra = sumQuantities(extraInMonth);

            const rvWedSat = sumQuantities(filterRecords(rvMealRecords, selectedYear, month, [3, 6]));
            const rvMonThu = sumQuantities(filterRecords(rvMealRecords, selectedYear, month, [1, 4]));

            const lunchBags = sumQuantities(filterRecords(lunchBagRecords, selectedYear, month));
            const shelter = sumQuantities(filterRecords(shelterMealRecords, selectedYear, month));
            const unitedEffort = sumQuantities(filterRecords(unitedEffortMealRecords, selectedYear, month));

            // Proxy pickups: Count meals where pickedUpByGuestId is present and different from guestId
            const proxyPickups = mealsInMonth.reduce((sum, r) => {
                if (r.pickedUpByGuestId && r.pickedUpByGuestId !== r.guestId) {
                    return sum + (r.count || 1);
                }
                return sum;
            }, 0);

            const totalHotMeals = mondayMeals + wednesdayMeals + saturdayMeals + fridayMeals +
                dayWorker + extra + rvWedSat + rvMonThu + shelter + unitedEffort;

            const totalWithLunchBags = totalHotMeals + lunchBags;

            const onsiteHotMeals = mondayMeals + wednesdayMeals + saturdayMeals + fridayMeals +
                sumQuantities(filterRecords(extraMealRecords, selectedYear, month, [1, 3, 5, 6]));

            // Unique Guests
            const uniqueGuestIds = new Set(mealsInMonth.map(r => r.guestId).filter(Boolean));
            const uniqueGuests = uniqueGuestIds.size;

            // New Guests: Count guests whose first-ever meal was in this month/year
            let newGuests = 0;
            uniqueGuestIds.forEach((guestId) => {
                const firstMeal = guestFirstMealMonth.get(guestId);
                if (firstMeal && firstMeal.year === selectedYear && firstMeal.month === month) {
                    newGuests++;
                }
            });

            months.push({
                month: monthName,
                mondayMeals, wednesdayMeals, fridayMeals, saturdayMeals,
                uniqueGuests, newGuests, proxyPickups,
                onsiteHotMeals,
                dayWorkerMeals: dayWorker,
                rvWedSat, rvMonThu,
                extraMeals: extra,
                lunchBags,
                totalHotMeals,
                totalWithLunchBags
            });
        }

        // Compute YTD unique guests across all months using a global Set
        const ytdUniqueGuestIds = new Set<string>();
        for (let month = 0; month <= effectiveLastMonth; month++) {
            const mealsInMonth = filterRecords(mealRecords, selectedYear, month);
            mealsInMonth.forEach((r: any) => { if (r.guestId) ytdUniqueGuestIds.add(r.guestId); });
        }

        // Totals row
        const totals = {
            month: 'Year to Date',
            mondayMeals: months.reduce((s, m) => s + m.mondayMeals, 0),
            wednesdayMeals: months.reduce((s, m) => s + m.wednesdayMeals, 0),
            fridayMeals: months.reduce((s, m) => s + m.fridayMeals, 0),
            saturdayMeals: months.reduce((s, m) => s + m.saturdayMeals, 0),
            uniqueGuests: ytdUniqueGuestIds.size,
            newGuests: months.reduce((s, m) => s + m.newGuests, 0),
            proxyPickups: months.reduce((s, m) => s + m.proxyPickups, 0),
            onsiteHotMeals: months.reduce((s, m) => s + m.onsiteHotMeals, 0),
            dayWorkerMeals: months.reduce((s, m) => s + m.dayWorkerMeals, 0),
            rvWedSat: months.reduce((s, m) => s + m.rvWedSat, 0),
            rvMonThu: months.reduce((s, m) => s + m.rvMonThu, 0),
            extraMeals: months.reduce((s, m) => s + m.extraMeals, 0),
            lunchBags: months.reduce((s, m) => s + m.lunchBags, 0),
            totalHotMeals: months.reduce((s, m) => s + m.totalHotMeals, 0),
            totalWithLunchBags: months.reduce((s, m) => s + m.totalWithLunchBags, 0),
        };

        return { months, totals };
    }, [mealRecords, extraMealRecords, rvMealRecords, unitedEffortMealRecords, dayWorkerMealRecords, lunchBagRecords, shelterMealRecords, selectedYear, currentYear, currentMonth, guestFirstMealMonth, filterRecords]);

    // ============== BICYCLE SUMMARY DATA ==============
    const bicycleSummary = useMemo(() => {
        const { showerRecords, laundryRecords, bicycleRecords } = useServicesStore.getState();

        const months = MONTH_NAMES.map((monthName, monthIndex) => {
            const recordsForMonth = (bicycleRecords || []).filter((record: any) => {
                if (!record?.date) return false;
                const date = new Date(record.date);
                return (
                    date.getFullYear() === selectedYear &&
                    date.getMonth() === monthIndex &&
                    record.status === 'done'
                );
            });

            let newBikes = 0;
            let services = 0;

            recordsForMonth.forEach((record: any) => {
                const types = record.repairTypes || (record.repairType ? [record.repairType] : []);
                if (types.length === 0) {
                    services++;
                    return;
                }
                types.forEach((type: string) => {
                    if (type.toLowerCase().includes('new bicycle') || type.toLowerCase().includes('new bike')) {
                        newBikes++;
                    } else {
                        services++;
                    }
                });
            });

            return {
                month: monthName,
                newBikes,
                services,
                total: newBikes + services,
            };
        });

        // Only include months up to current month for YTD
        const ytdMonths = selectedYear === currentYear
            ? months.slice(0, currentMonth + 1)
            : months;

        const totals = ytdMonths.reduce(
            (acc, row) => ({
                newBikes: acc.newBikes + row.newBikes,
                services: acc.services + row.services,
                total: acc.total + row.total,
            }),
            { newBikes: 0, services: 0, total: 0 }
        );

        return { months: ytdMonths, totals };
    }, [selectedYear, currentYear, currentMonth]);

    // ============== SHOWER & LAUNDRY SUMMARY DATA ==============
    // Pre-compute each guest's first-ever shower/laundry service date across ALL records
    const guestFirstShowerLaundry = useMemo(() => {
        const { showerRecords, laundryRecords } = useServicesStore.getState();
        const completedLaundryStatuses = new Set(['done', 'picked_up', 'returned', 'offsite_picked_up', 'attended']);
        
        const firstServiceMap = new Map<string, { year: number; month: number }>();
        const firstLaundryMap = new Map<string, { year: number; month: number }>();
        
        // Process all shower records (all years)
        (showerRecords || []).forEach((r: any) => {
            if (!r?.guestId || !r?.date) return;
            if (r.status !== 'done' && r.status !== 'attended') return;
            
            const d = new Date(r.date);
            const year = d.getFullYear();
            const month = d.getMonth();
            const guestId = String(r.guestId);
            
            const existing = firstServiceMap.get(guestId);
            if (!existing || year < existing.year || (year === existing.year && month < existing.month)) {
                firstServiceMap.set(guestId, { year, month });
            }
        });
        
        // Process all laundry records (all years)
        (laundryRecords || []).forEach((r: any) => {
            if (!r?.guestId || !r?.date) return;
            const status = (r.status || '').toString().toLowerCase();
            if (!completedLaundryStatuses.has(status)) return;
            
            const d = new Date(r.date);
            const year = d.getFullYear();
            const month = d.getMonth();
            const guestId = String(r.guestId);
            
            // Track first service (shower OR laundry combined)
            const existingService = firstServiceMap.get(guestId);
            if (!existingService || year < existingService.year || (year === existingService.year && month < existingService.month)) {
                firstServiceMap.set(guestId, { year, month });
            }
            
            // Track first laundry specifically
            const existingLaundry = firstLaundryMap.get(guestId);
            if (!existingLaundry || year < existingLaundry.year || (year === existingLaundry.year && month < existingLaundry.month)) {
                firstLaundryMap.set(guestId, { year, month });
            }
        });
        
        return { firstServiceMap, firstLaundryMap };
    }, []);

    const showerLaundrySummary = useMemo(() => {
        const { showerRecords, laundryRecords } = useServicesStore.getState();
        const { guests } = useGuestsStore.getState();
        const { firstServiceMap, firstLaundryMap } = guestFirstShowerLaundry;

        // Build guest lookup map for age categorization
        const guestMap = new Map<string, any>();
        (guests || []).forEach((guest: any) => {
            if (!guest) return;
            const ids = [guest.id, guest.guestId, guest.externalId].filter(Boolean);
            ids.forEach((id) => guestMap.set(String(id), guest));
        });

        const categorizeAge = (guestId: string | null | undefined): 'adult' | 'senior' | 'child' => {
            if (!guestId) return 'adult';
            const guest = guestMap.get(String(guestId));
            const rawAge = (guest?.age ?? guest?.ageGroup ?? guest?.age_group ?? '').toString().toLowerCase();
            if (rawAge.includes('senior') || rawAge.includes('60')) return 'senior';
            if (rawAge.includes('child') || rawAge.includes('0-17')) return 'child';
            return 'adult';
        };

        const completedLaundryStatuses = new Set(['done', 'picked_up', 'returned', 'offsite_picked_up', 'attended']);

        // Filter all shower records for the selected year
        const completedShowerRecords = (showerRecords || []).filter((r: any) => {
            if (!r?.date) return false;
            const date = new Date(r.date);
            return date.getFullYear() === selectedYear && (r.status === 'done' || r.status === 'attended');
        }).map((r: any) => ({
            ...r,
            guestId: r.guestId ? String(r.guestId) : null,
            dateObj: new Date(r.date),
            monthIndex: new Date(r.date).getMonth(),
        }));

        // Filter all laundry records for the selected year
        const completedLaundryRecords = (laundryRecords || []).filter((r: any) => {
            if (!r?.date) return false;
            const date = new Date(r.date);
            const status = (r.status || '').toString().toLowerCase();
            return date.getFullYear() === selectedYear && completedLaundryStatuses.has(status);
        }).map((r: any) => ({
            ...r,
            guestId: r.guestId ? String(r.guestId) : null,
            dateObj: new Date(r.date),
            monthIndex: new Date(r.date).getMonth(),
        }));

        // Accumulator for YTD totals
        const ytdGuestSet = new Set<string>();
        const ytdLaundrySet = new Set<string>();
        const ytdParticipantAgeSets = { adult: new Set<string>(), senior: new Set<string>(), child: new Set<string>() };
        const ytdLaundryAgeSets = { adult: new Set<string>(), senior: new Set<string>(), child: new Set<string>() };
        let runningNewGuests = 0;
        let runningNewLaundryGuests = 0;
        const totalsAccumulator = {
            programDays: 0,
            showersProvided: 0,
            laundryLoadsProcessed: 0,
            onsiteLaundryLoads: 0,
            offsiteLaundryLoads: 0,
            showerServiceDays: 0,
            laundryServiceDays: 0,
        };

        const months = MONTH_NAMES.map((monthName, monthIndex) => {
            const showersForMonth = completedShowerRecords.filter((r: any) => r.monthIndex === monthIndex);
            const laundryForMonth = completedLaundryRecords.filter((r: any) => r.monthIndex === monthIndex);
            const combinedForMonth = [...showersForMonth, ...laundryForMonth];

            // Calculate service days
            const programDaysSet = new Set(combinedForMonth.map((r: any) => r.dateObj.toISOString().slice(0, 10)));
            const showerServiceDaysSet = new Set(showersForMonth.map((r: any) => r.dateObj.toISOString().slice(0, 10)));
            const laundryServiceDaysSet = new Set(laundryForMonth.map((r: any) => r.dateObj.toISOString().slice(0, 10)));
            const showerServiceDays = showerServiceDaysSet.size;
            const laundryServiceDays = laundryServiceDaysSet.size;

            // Unique guests for the month
            const monthGuestSet = new Set<string>();
            combinedForMonth.forEach((r: any) => { if (r.guestId) monthGuestSet.add(r.guestId); });

            // Age breakdown for participants (shower + laundry combined)
            const participantsCounts = { adult: 0, senior: 0, child: 0 };
            monthGuestSet.forEach((guestId) => {
                const bucket = categorizeAge(guestId);
                participantsCounts[bucket] += 1;
            });

            // Unique laundry guests
            const laundryGuestSet = new Set<string>();
            laundryForMonth.forEach((r: any) => { if (r.guestId) laundryGuestSet.add(r.guestId); });
            const laundryCounts = { adult: 0, senior: 0, child: 0 };
            laundryGuestSet.forEach((guestId) => {
                const bucket = categorizeAge(guestId);
                laundryCounts[bucket] += 1;
            });

            // Onsite vs offsite laundry
            const onsiteLaundryLoads = laundryForMonth.filter((r: any) => r.laundryType === 'onsite').length;
            const offsiteLaundryLoads = laundryForMonth.filter((r: any) => r.laundryType === 'offsite').length;

            const isYearToDate = selectedYear !== currentYear || monthIndex <= currentMonth;
            
            // New guests: count those whose first-ever service was in this month/year
            const newGuestsThisMonth = [...monthGuestSet].filter((guestId) => {
                const first = firstServiceMap.get(guestId);
                return first && first.year === selectedYear && first.month === monthIndex;
            }).length;
            
            // New laundry guests: count those whose first-ever laundry was in this month/year
            const newLaundryGuestsThisMonth = [...laundryGuestSet].filter((guestId) => {
                const first = firstLaundryMap.get(guestId);
                return first && first.year === selectedYear && first.month === monthIndex;
            }).length;

            if (isYearToDate) {
                monthGuestSet.forEach((guestId) => {
                    ytdGuestSet.add(guestId);
                    const bucket = categorizeAge(guestId);
                    ytdParticipantAgeSets[bucket].add(guestId);
                });
                laundryGuestSet.forEach((guestId) => {
                    ytdLaundrySet.add(guestId);
                    const bucket = categorizeAge(guestId);
                    ytdLaundryAgeSets[bucket].add(guestId);
                });
                runningNewGuests += newGuestsThisMonth;
                runningNewLaundryGuests += newLaundryGuestsThisMonth;
                totalsAccumulator.programDays += programDaysSet.size;
                totalsAccumulator.showersProvided += showersForMonth.length;
                totalsAccumulator.laundryLoadsProcessed += laundryForMonth.length;
                totalsAccumulator.onsiteLaundryLoads += onsiteLaundryLoads;
                totalsAccumulator.offsiteLaundryLoads += offsiteLaundryLoads;
                totalsAccumulator.showerServiceDays += showerServiceDays;
                totalsAccumulator.laundryServiceDays += laundryServiceDays;
            }

            const avgShowersPerDay = showerServiceDays > 0 ? showersForMonth.length / showerServiceDays : 0;
            const avgLaundryLoadsPerDay = laundryServiceDays > 0 ? laundryForMonth.length / laundryServiceDays : 0;

            return {
                month: monthName,
                programDays: programDaysSet.size,
                showerServiceDays,
                laundryServiceDays,
                showers: showersForMonth.length,
                avgShowersPerDay,
                participantsAdult: participantsCounts.adult,
                participantsSenior: participantsCounts.senior,
                participantsChild: participantsCounts.child,
                totalParticipants: participantsCounts.adult + participantsCounts.senior + participantsCounts.child,
                newGuests: newGuestsThisMonth,
                ytdTotalUnduplicatedGuests: ytdGuestSet.size,
                laundryLoads: laundryForMonth.length,
                onsiteLoads: onsiteLaundryLoads,
                offsiteLoads: offsiteLaundryLoads,
                avgLaundryLoadsPerDay,
                uniqueLaundryGuests: laundryGuestSet.size,
                laundryAdult: laundryCounts.adult,
                laundrySenior: laundryCounts.senior,
                laundryChild: laundryCounts.child,
                newLaundryGuests: newLaundryGuestsThisMonth,
                isYearToDate,
            };
        });

        // Only include months up to current month for YTD
        const ytdMonths = selectedYear === currentYear
            ? months.slice(0, currentMonth + 1)
            : months;

        const totals = {
            month: 'Year to Date',
            programDays: totalsAccumulator.programDays,
            showerServiceDays: totalsAccumulator.showerServiceDays,
            laundryServiceDays: totalsAccumulator.laundryServiceDays,
            showers: totalsAccumulator.showersProvided,
            avgShowersPerDay: totalsAccumulator.showerServiceDays > 0 ? totalsAccumulator.showersProvided / totalsAccumulator.showerServiceDays : 0,
            participantsAdult: ytdParticipantAgeSets.adult.size,
            participantsSenior: ytdParticipantAgeSets.senior.size,
            participantsChild: ytdParticipantAgeSets.child.size,
            totalParticipants: ytdParticipantAgeSets.adult.size + ytdParticipantAgeSets.senior.size + ytdParticipantAgeSets.child.size,
            newGuests: runningNewGuests,
            ytdTotalUnduplicatedGuests: ytdGuestSet.size,
            laundryLoads: totalsAccumulator.laundryLoadsProcessed,
            onsiteLoads: totalsAccumulator.onsiteLaundryLoads,
            offsiteLoads: totalsAccumulator.offsiteLaundryLoads,
            avgLaundryLoadsPerDay: totalsAccumulator.laundryServiceDays > 0 ? totalsAccumulator.laundryLoadsProcessed / totalsAccumulator.laundryServiceDays : 0,
            uniqueLaundryGuests: ytdLaundrySet.size,
            laundryAdult: ytdLaundryAgeSets.adult.size,
            laundrySenior: ytdLaundryAgeSets.senior.size,
            laundryChild: ytdLaundryAgeSets.child.size,
            newLaundryGuests: runningNewLaundryGuests,
        };

        return { months: ytdMonths, totals };
    }, [selectedYear, currentYear, currentMonth]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900">Monthly Summary Report</h2>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="text-sm font-medium bg-gray-50 border-gray-200 rounded-md py-1 px-2"
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Insights Cards (Simplified) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <Lightbulb size={16} className="text-amber-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">YTD Hot Meals</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(monthlyData.totals.totalHotMeals)}</p>
                    <p className="text-xs text-gray-500 mt-1">Total meals served this year</p>
                </div>
                {/* Additional cards can be added here */}
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto overflow-y-visible">
                <table className="min-w-full text-sm">
                    <thead>
                        {/* Group Headers */}
                        <tr>
                            <th className="bg-white p-2 border-b border-gray-200 sticky left-0 z-10" />
                            {MEAL_TABLE_GROUPS.map(group => (
                                <th
                                    key={group.key}
                                    colSpan={group.columns.length}
                                    className={`p-2 text-center text-xs font-bold uppercase tracking-wider border-b border-l border-gray-200 ${group.headerClass}`}
                                >
                                    <div className="flex flex-col">
                                        <span>{group.title}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                        {/* Column Headers */}
                        <tr>
                            {MEAL_COLUMN_DEFINITIONS.map((col, idx) => (
                                <th
                                    key={col.key}
                                    className={`p-3 text-xs font-bold uppercase tracking-wider border-b border-gray-200 
                                        ${col.headerBg} ${col.align === 'right' ? 'text-right' : 'text-left'}
                                        ${idx === 0 ? 'sticky left-0 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : 'border-l'}
                                    `}
                                >
                                    <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                                        {col.label}
                                        {col.description && <ColumnTooltip label={col.label} description={col.description} />}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {monthlyData.months.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                                {MEAL_COLUMN_DEFINITIONS.map((col, colIdx) => (
                                    <td
                                        key={col.key}
                                        className={`p-3 whitespace-nowrap border-gray-100
                                            ${col.cellBg} ${col.align === 'right' ? 'text-right' : 'text-left'}
                                            ${col.bodyClass || ''}
                                            ${colIdx === 0 ? 'sticky left-0 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : 'border-l'}
                                        `}
                                    >
                                        {col.isNumeric ? formatNumber(row[col.key as keyof typeof row]) : row[col.key as keyof typeof row]}
                                    </td>
                                ))}
                            </tr>
                        ))}

                        {/* Totals Row */}
                        <tr className="bg-gray-100 border-t-2 border-gray-200">
                            {MEAL_COLUMN_DEFINITIONS.map((col, colIdx) => (
                                <td
                                    key={col.key}
                                    className={`p-3 whitespace-nowrap font-bold border-gray-200
                                        ${col.totalCellBg} ${col.align === 'right' ? 'text-right' : 'text-left'}
                                        ${col.totalBodyClass || col.bodyClass || ''}
                                        ${colIdx === 0 ? 'sticky left-0 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : 'border-l'}
                                    `}
                                >
                                    {col.isNumeric ? formatNumber(monthlyData.totals[col.key as keyof typeof monthlyData.totals]) : 'Year to Date'}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ============== BICYCLE SERVICES SECTION ============== */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Bike size={20} className="text-amber-600" />
                        <span>Bicycle Services Summary</span>
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-amber-50">
                                <th className="p-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Month</th>
                                <th className="p-3 text-right text-xs font-bold uppercase tracking-wider text-gray-700">New Bicycles</th>
                                <th className="p-3 text-right text-xs font-bold uppercase tracking-wider text-gray-700">Services</th>
                                <th className="p-3 text-right text-xs font-bold uppercase tracking-wider text-gray-700 bg-amber-100">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {bicycleSummary.months.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50">
                                    <td className="p-3 font-medium text-gray-900">{row.month}</td>
                                    <td className="p-3 text-right">{formatNumber(row.newBikes)}</td>
                                    <td className="p-3 text-right">{formatNumber(row.services)}</td>
                                    <td className="p-3 text-right font-bold bg-amber-50">{formatNumber(row.total)}</td>
                                </tr>
                            ))}
                            <tr className="bg-gray-100 border-t-2 border-gray-200">
                                <td className="p-3 font-bold text-gray-900">Year to Date</td>
                                <td className="p-3 text-right font-bold">{formatNumber(bicycleSummary.totals.newBikes)}</td>
                                <td className="p-3 text-right font-bold">{formatNumber(bicycleSummary.totals.services)}</td>
                                <td className="p-3 text-right font-black bg-amber-100">{formatNumber(bicycleSummary.totals.total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ============== SHOWER & LAUNDRY SECTION ============== */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex flex-col items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <ShowerHead size={20} className="text-sky-600" />
                        <span>Shower & Laundry Services Summary</span>
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Participant trends and laundry loads from January through YTD {selectedYear}</p>
                    <button
                        onClick={() => {
                            // Generate CSV content
                            const headers = ['Month', 'Program Days', 'Showers', 'Avg/Day', 'New Guests', 'Participants', 'Adult', 'Senior', 'Child', 'Loads', 'On-site', 'Off-site', 'Avg/Day', 'Unique Users', 'Adult', 'Senior', 'Child', 'New Laundry Guests'];
                            const rows = showerLaundrySummary.months.map(row => [
                                row.month,
                                row.programDays,
                                row.showers,
                                row.avgShowersPerDay.toFixed(1),
                                row.newGuests,
                                row.totalParticipants,
                                row.participantsAdult,
                                row.participantsSenior,
                                row.participantsChild,
                                row.laundryLoads,
                                row.onsiteLoads,
                                row.offsiteLoads,
                                row.avgLaundryLoadsPerDay.toFixed(1),
                                row.uniqueLaundryGuests,
                                row.laundryAdult,
                                row.laundrySenior,
                                row.laundryChild,
                                row.newLaundryGuests
                            ]);
                            const totalsRow = [
                                'Year to Date',
                                showerLaundrySummary.totals.programDays,
                                showerLaundrySummary.totals.showers,
                                showerLaundrySummary.totals.avgShowersPerDay.toFixed(1),
                                showerLaundrySummary.totals.newGuests,
                                showerLaundrySummary.totals.totalParticipants,
                                showerLaundrySummary.totals.participantsAdult,
                                showerLaundrySummary.totals.participantsSenior,
                                showerLaundrySummary.totals.participantsChild,
                                showerLaundrySummary.totals.laundryLoads,
                                showerLaundrySummary.totals.onsiteLoads,
                                showerLaundrySummary.totals.offsiteLoads,
                                showerLaundrySummary.totals.avgLaundryLoadsPerDay.toFixed(1),
                                showerLaundrySummary.totals.uniqueLaundryGuests,
                                showerLaundrySummary.totals.laundryAdult,
                                showerLaundrySummary.totals.laundrySenior,
                                showerLaundrySummary.totals.laundryChild,
                                showerLaundrySummary.totals.newLaundryGuests
                            ];
                            const csvContent = [headers.join(','), ...rows.map(r => r.join(',')), totalsRow.join(',')].join('\n');
                            const blob = new Blob([csvContent], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `shower-laundry-summary-${selectedYear}.csv`;
                            a.click();
                            URL.revokeObjectURL(url);
                        }}
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
                    >
                        <Download size={16} />
                        Export Shower & Laundry CSV
                    </button>
                </div>

                <div className="overflow-x-auto overflow-y-visible">
                    <table className="min-w-full text-sm">
                        <thead style={{ overflow: 'visible' }}>
                            {/* Group Headers */}
                            <tr className="bg-gray-50">
                                <th className="p-2 border-b border-gray-200 sticky left-0 z-10 bg-gray-50" />
                                <th colSpan={5} className="p-2 text-center text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-50 border-b border-gray-200">Shower Program</th>
                                <th colSpan={6} className="p-2 text-center text-xs font-bold uppercase tracking-wider text-red-700 bg-red-50 border-b border-gray-200">Laundry Services</th>
                            </tr>
                            {/* Column Headers */}
                            <tr className="bg-sky-50/50">
                                <th className="p-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700 sticky left-0 z-10 bg-white border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Month</th>
                                {/* Shower Program columns */}
                                <th className="p-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-sky-50">Program Days</th>
                                <th className="p-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-sky-50">Showers</th>
                                <th className="p-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-sky-50">Avg / Day</th>
                                <th className="p-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-sky-50">New Guests</th>
                                <th className="p-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-emerald-50">Participants</th>
                                {/* Laundry Services columns */}
                                <th className="p-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-red-50">Loads</th>
                                <th className="p-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-red-50">On-site</th>
                                <th className="p-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-red-50">Off-site</th>
                                <th className="p-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-red-50">Avg / Day</th>
                                <th className="p-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-purple-50">Unique Users</th>
                                <th className="p-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-red-50">New Laundry Guests</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {showerLaundrySummary.months.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50">
                                    <td className="p-3 font-medium text-gray-900 sticky left-0 z-10 bg-white border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{row.month}</td>
                                    {/* Shower Program columns */}
                                    <td className="p-2 text-right text-xs bg-sky-50/30">{formatNumber(row.programDays)}</td>
                                    <td className="p-2 text-right text-xs font-medium bg-sky-50/50">{formatNumber(row.showers)}</td>
                                    <td className="p-2 text-right text-xs bg-sky-50/30">{row.avgShowersPerDay.toFixed(1)}</td>
                                    <td className="p-2 text-right text-xs bg-sky-50/30">{formatNumber(row.newGuests)}</td>
                                    {/* Participants cell with breakdown */}
                                    <td className="p-2 text-center bg-emerald-50/30">
                                        <div className="font-bold text-sm text-gray-900">{formatNumber(row.totalParticipants)}</div>
                                        <div className="text-[10px] text-gray-500 leading-tight mt-0.5">
                                            <div>Adult · {formatNumber(row.participantsAdult)}</div>
                                            <div>Senior · {formatNumber(row.participantsSenior)}</div>
                                            <div>Child · {formatNumber(row.participantsChild)}</div>
                                        </div>
                                    </td>
                                    {/* Laundry Services columns */}
                                    <td className="p-2 text-right text-xs font-medium bg-red-50/50">{formatNumber(row.laundryLoads)}</td>
                                    <td className="p-2 text-right text-xs bg-red-50/30">{formatNumber(row.onsiteLoads)}</td>
                                    <td className="p-2 text-right text-xs bg-red-50/30">{formatNumber(row.offsiteLoads)}</td>
                                    <td className="p-2 text-right text-xs bg-red-50/30">{row.avgLaundryLoadsPerDay.toFixed(1)}</td>
                                    {/* Unique Users cell with breakdown */}
                                    <td className="p-2 text-center bg-purple-50/30">
                                        <div className="font-bold text-sm text-gray-900">{formatNumber(row.uniqueLaundryGuests)}</div>
                                        <div className="text-[10px] text-gray-500 leading-tight mt-0.5">
                                            <div>Adult · {formatNumber(row.laundryAdult)}</div>
                                            <div>Senior · {formatNumber(row.laundrySenior)}</div>
                                            <div>Child · {formatNumber(row.laundryChild)}</div>
                                        </div>
                                    </td>
                                    <td className="p-2 text-right text-xs bg-red-50/30">{formatNumber(row.newLaundryGuests)}</td>
                                </tr>
                            ))}
                            <tr className="bg-gray-100 border-t-2 border-gray-200 font-bold">
                                <td className="p-3 text-gray-900 sticky left-0 z-10 bg-gray-100 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Year to Date</td>
                                {/* Shower Program totals */}
                                <td className="p-2 text-right text-xs bg-sky-100">{formatNumber(showerLaundrySummary.totals.programDays)}</td>
                                <td className="p-2 text-right text-xs font-black bg-sky-100">{formatNumber(showerLaundrySummary.totals.showers)}</td>
                                <td className="p-2 text-right text-xs bg-sky-100">{showerLaundrySummary.totals.avgShowersPerDay.toFixed(1)}</td>
                                <td className="p-2 text-right text-xs bg-sky-100">{formatNumber(showerLaundrySummary.totals.newGuests)}</td>
                                {/* Participants totals with breakdown */}
                                <td className="p-2 text-center bg-emerald-100">
                                    <div className="font-black text-sm text-gray-900">{formatNumber(showerLaundrySummary.totals.totalParticipants)}</div>
                                    <div className="text-[10px] text-gray-600 leading-tight mt-0.5">
                                        <div>Adult · {formatNumber(showerLaundrySummary.totals.participantsAdult)}</div>
                                        <div>Senior · {formatNumber(showerLaundrySummary.totals.participantsSenior)}</div>
                                        <div>Child · {formatNumber(showerLaundrySummary.totals.participantsChild)}</div>
                                    </div>
                                </td>
                                {/* Laundry totals */}
                                <td className="p-2 text-right text-xs font-black bg-red-100">{formatNumber(showerLaundrySummary.totals.laundryLoads)}</td>
                                <td className="p-2 text-right text-xs bg-red-100">{formatNumber(showerLaundrySummary.totals.onsiteLoads)}</td>
                                <td className="p-2 text-right text-xs bg-red-100">{formatNumber(showerLaundrySummary.totals.offsiteLoads)}</td>
                                <td className="p-2 text-right text-xs bg-red-100">{showerLaundrySummary.totals.avgLaundryLoadsPerDay.toFixed(1)}</td>
                                {/* Unique Users totals with breakdown */}
                                <td className="p-2 text-center bg-purple-100">
                                    <div className="font-black text-sm text-gray-900">{formatNumber(showerLaundrySummary.totals.uniqueLaundryGuests)}</div>
                                    <div className="text-[10px] text-gray-600 leading-tight mt-0.5">
                                        <div>Adult · {formatNumber(showerLaundrySummary.totals.laundryAdult)}</div>
                                        <div>Senior · {formatNumber(showerLaundrySummary.totals.laundrySenior)}</div>
                                        <div>Child · {formatNumber(showerLaundrySummary.totals.laundryChild)}</div>
                                    </div>
                                </td>
                                <td className="p-2 text-right text-xs bg-red-100">{formatNumber(showerLaundrySummary.totals.newLaundryGuests)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                {upcomingMonthsLabel && (
                    <p className="text-xs text-gray-400 mt-4 text-center italic">
                        Upcoming months ({upcomingMonthsLabel}) will populate as data is recorded.
                    </p>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <div className="text-2xl font-black text-emerald-900">{formatNumber(monthlyData.totals.totalHotMeals)}</div>
                    <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">YTD Hot Meals</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <div className="text-2xl font-black text-amber-900">{formatNumber(bicycleSummary.totals.total)}</div>
                    <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">YTD Bicycle Services</div>
                </div>
                <div className="bg-sky-50 p-4 rounded-xl border border-sky-100">
                    <div className="text-2xl font-black text-sky-900">{formatNumber(showerLaundrySummary.totals.showers)}</div>
                    <div className="text-xs font-bold text-sky-600 uppercase tracking-wider">YTD Showers</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <div className="text-2xl font-black text-purple-900">{formatNumber(showerLaundrySummary.totals.laundryLoads)}</div>
                    <div className="text-xs font-bold text-purple-600 uppercase tracking-wider">YTD Laundry Loads</div>
                </div>
            </div>
        </div>
    );
}
