import { parsePacificDateParts } from '@/lib/utils/date';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const GENERATOR_LAUNDRY_STATUSES = new Set(['done', 'picked_up', 'offsite_picked_up']);
const SUMMARY_LAUNDRY_STATUSES = new Set(['done', 'picked_up', 'returned', 'offsite_picked_up', 'attended']);
const SUMMARY_SHOWER_STATUSES = new Set(['done', 'attended']);
const GENERATOR_BICYCLE_STATUSES = new Set(['done', 'in_progress']);

type MaybeArray<T> = ReadonlyArray<T> | null | undefined;

type AgeGroupLabel = 'Adult 18-59' | 'Child 0-17' | 'Senior 60+' | 'Unknown';
type ParticipantAgeBucket = 'adult' | 'child' | 'senior';

interface MealRecordLike {
    guestId?: string | null;
    pickedUpByGuestId?: string | null;
    count?: number | null;
    quantity?: number | null;
    date?: string | null;
    dateKey?: string | null;
}

interface GuestLike {
    id?: string | null;
    guestId?: string | null;
    externalId?: string | null;
    housingStatus?: string | null;
    location?: string | null;
    age?: string | null;
    ageGroup?: string | null;
    age_group?: string | null;
}

interface ShowerRecordLike {
    guestId?: string | null;
    date?: string | null;
    dateKey?: string | null;
    status?: string | null;
}

interface LaundryRecordLike {
    guestId?: string | null;
    date?: string | null;
    dateKey?: string | null;
    status?: string | null;
    laundryType?: string | null;
}

interface BicycleRecordLike {
    guestId?: string | null;
    date?: string | null;
    dateKey?: string | null;
    status?: string | null;
    repairType?: string | null;
    repairTypes?: string[] | null;
}

interface HaircutRecordLike {
    guestId?: string | null;
    date?: string | null;
    dateKey?: string | null;
    serviceDate?: string | null;
}

export interface DashboardReportCacheInput {
    mealRecords?: MaybeArray<MealRecordLike>;
    extraMealRecords?: MaybeArray<MealRecordLike>;
    rvMealRecords?: MaybeArray<MealRecordLike>;
    dayWorkerMealRecords?: MaybeArray<MealRecordLike>;
    shelterMealRecords?: MaybeArray<MealRecordLike>;
    unitedEffortMealRecords?: MaybeArray<MealRecordLike>;
    lunchBagRecords?: MaybeArray<MealRecordLike>;
    showerRecords?: MaybeArray<ShowerRecordLike>;
    laundryRecords?: MaybeArray<LaundryRecordLike>;
    bicycleRecords?: MaybeArray<BicycleRecordLike>;
    haircutRecords?: MaybeArray<HaircutRecordLike>;
    guests?: MaybeArray<GuestLike>;
}

export interface MealTypeFilters {
    guest: boolean;
    extras: boolean;
    rv: boolean;
    dayWorker: boolean;
    shelter: boolean;
    unitedEffort: boolean;
    lunchBags: boolean;
}

export interface ServiceStats {
    totalMeals: number;
    onsiteHotMeals: number;
    bagLunch: number;
    rvMeals: number;
    shelter: number;
    rvSafePark: number;
    dayWorker: number;
    showers: number;
    laundry: number;
    bikeService: number;
    newBicycles: number;
    haircuts: number;
}

export interface DemographicBreakdown {
    label: string;
    count: number;
    percentage: number;
}

export interface MonthlyReportSnapshot {
    month: string;
    year: number;
    monthStats: ServiceStats;
    ytdStats: ServiceStats;
    housingBreakdown: DemographicBreakdown[];
    topLocations: DemographicBreakdown[];
    ageBreakdown: DemographicBreakdown[];
    totalActiveGuests: number;
    generatedAt: string;
}

export interface MealReportRow {
    month: string;
    year: number;
    monthIndex: number;
    guestMeals: number;
    extras: number;
    rvMeals: number;
    dayWorkerMeals: number;
    shelterMeals: number;
    unitedEffortMeals: number;
    lunchBags: number;
    totalMeals: number;
    uniqueGuestsPerServiceDay: number;
    uniqueGuests: number;
    validDaysCount: number;
    isCurrentMonth: boolean;
    ageGroups: Record<AgeGroupLabel, number>;
}

export interface MonthlySummaryRow {
    month: string;
    mondayMeals: number;
    wednesdayMeals: number;
    fridayMeals: number;
    saturdayMeals: number;
    uniqueGuests: number;
    newGuests: number;
    proxyPickups: number;
    onsiteHotMeals: number;
    dayWorkerMeals: number;
    rvWedSat: number;
    rvMonThu: number;
    rvOther: number;
    shelter: number;
    extraMeals: number;
    lunchBags: number;
    totalHotMeals: number;
    totalWithLunchBags: number;
}

export type MonthlySummaryTotals = MonthlySummaryRow;

export interface BicycleSummaryRow {
    month: string;
    newBikes: number;
    services: number;
    total: number;
}

export interface BicycleSummaryTotals {
    newBikes: number;
    services: number;
    total: number;
}

export interface ShowerLaundrySummaryRow {
    month: string;
    programDays: number;
    showerServiceDays: number;
    laundryServiceDays: number;
    showers: number;
    avgShowersPerDay: number;
    participantsAdult: number;
    participantsSenior: number;
    participantsChild: number;
    totalParticipants: number;
    newGuests: number;
    ytdTotalUnduplicatedGuests: number;
    laundryLoads: number;
    onsiteLoads: number;
    offsiteLoads: number;
    avgLaundryLoadsPerDay: number;
    uniqueLaundryGuests: number;
    laundryAdult: number;
    laundrySenior: number;
    laundryChild: number;
    newLaundryGuests: number;
}

export type ShowerLaundrySummaryTotals = ShowerLaundrySummaryRow;

export interface MonthlySummaryDatasets {
    monthlyData: {
        months: MonthlySummaryRow[];
        totals: MonthlySummaryTotals;
    };
    bicycleSummary: {
        months: BicycleSummaryRow[];
        totals: BicycleSummaryTotals;
    };
    showerLaundrySummary: {
        months: ShowerLaundrySummaryRow[];
        totals: ShowerLaundrySummaryTotals;
    };
}

type MonthPointer = { year: number; month: number };

type DashboardReportRefs = {
    mealRecords: ReadonlyArray<MealRecordLike>;
    extraMealRecords: ReadonlyArray<MealRecordLike>;
    rvMealRecords: ReadonlyArray<MealRecordLike>;
    dayWorkerMealRecords: ReadonlyArray<MealRecordLike>;
    shelterMealRecords: ReadonlyArray<MealRecordLike>;
    unitedEffortMealRecords: ReadonlyArray<MealRecordLike>;
    lunchBagRecords: ReadonlyArray<MealRecordLike>;
    showerRecords: ReadonlyArray<ShowerRecordLike>;
    laundryRecords: ReadonlyArray<LaundryRecordLike>;
    bicycleRecords: ReadonlyArray<BicycleRecordLike>;
    haircutRecords: ReadonlyArray<HaircutRecordLike>;
    guests: ReadonlyArray<GuestLike>;
};

type MonthAggregate = {
    guestMealsByDay: number[];
    guestMealGuestIdsByDay: Set<string>[];
    guestMealGuestIds: Set<string>;
    extraMealsByDay: number[];
    extraMealGuestIdsByDay: Set<string>[];
    extraMealsTotal: number;
    rvMealsByDay: number[];
    rvMealsTotal: number;
    rvGuestIds: Set<string>;
    dayWorkerMealsTotal: number;
    dayWorkerGuestIds: Set<string>;
    shelterMealsTotal: number;
    shelterGuestIds: Set<string>;
    unitedEffortMealsTotal: number;
    unitedEffortGuestIds: Set<string>;
    lunchBagMealsTotal: number;
    lunchBagGuestIds: Set<string>;
    allMealGuestIds: Set<string>;
    proxyPickups: number;
    showersDoneGenerator: number;
    showersSummaryCount: number;
    showerGuestIds: Set<string>;
    showerServiceDates: Set<string>;
    laundryDoneGenerator: number;
    laundrySummaryLoads: number;
    laundryGuestIds: Set<string>;
    laundryServiceDates: Set<string>;
    onsiteLaundryLoads: number;
    offsiteLaundryLoads: number;
    bicycleServiceRecords: number;
    newBicycleRecords: number;
    bicycleServiceItems: number;
    newBicycleItems: number;
    haircuts: number;
};

export interface DashboardReportCache {
    refs: DashboardReportRefs;
    monthAggregates: Map<string, MonthAggregate>;
    guestLookup: Map<string, GuestLike>;
    firstMealMonthByGuest: Map<string, MonthPointer>;
    firstServiceMonthByGuest: Map<string, MonthPointer>;
    firstLaundryMonthByGuest: Map<string, MonthPointer>;
}

const EMPTY_LIST: readonly [] = [];

let cachedReportCache: DashboardReportCache | null = null;

const normalizeInput = (input: DashboardReportCacheInput): DashboardReportRefs => ({
    mealRecords: input.mealRecords ?? EMPTY_LIST,
    extraMealRecords: input.extraMealRecords ?? EMPTY_LIST,
    rvMealRecords: input.rvMealRecords ?? EMPTY_LIST,
    dayWorkerMealRecords: input.dayWorkerMealRecords ?? EMPTY_LIST,
    shelterMealRecords: input.shelterMealRecords ?? EMPTY_LIST,
    unitedEffortMealRecords: input.unitedEffortMealRecords ?? EMPTY_LIST,
    lunchBagRecords: input.lunchBagRecords ?? EMPTY_LIST,
    showerRecords: input.showerRecords ?? EMPTY_LIST,
    laundryRecords: input.laundryRecords ?? EMPTY_LIST,
    bicycleRecords: input.bicycleRecords ?? EMPTY_LIST,
    haircutRecords: input.haircutRecords ?? EMPTY_LIST,
    guests: input.guests ?? EMPTY_LIST,
});

const hasSameRefs = (left: DashboardReportRefs, right: DashboardReportRefs) => {
    return left.mealRecords === right.mealRecords
        && left.extraMealRecords === right.extraMealRecords
        && left.rvMealRecords === right.rvMealRecords
        && left.dayWorkerMealRecords === right.dayWorkerMealRecords
        && left.shelterMealRecords === right.shelterMealRecords
        && left.unitedEffortMealRecords === right.unitedEffortMealRecords
        && left.lunchBagRecords === right.lunchBagRecords
        && left.showerRecords === right.showerRecords
        && left.laundryRecords === right.laundryRecords
        && left.bicycleRecords === right.bicycleRecords
        && left.haircutRecords === right.haircutRecords
        && left.guests === right.guests;
};

const createDayCounts = () => Array.from({ length: 7 }, () => 0);
const createDayGuestSets = () => Array.from({ length: 7 }, () => new Set<string>());

const createMonthAggregate = (): MonthAggregate => ({
    guestMealsByDay: createDayCounts(),
    guestMealGuestIdsByDay: createDayGuestSets(),
    guestMealGuestIds: new Set<string>(),
    extraMealsByDay: createDayCounts(),
    extraMealGuestIdsByDay: createDayGuestSets(),
    extraMealsTotal: 0,
    rvMealsByDay: createDayCounts(),
    rvMealsTotal: 0,
    rvGuestIds: new Set<string>(),
    dayWorkerMealsTotal: 0,
    dayWorkerGuestIds: new Set<string>(),
    shelterMealsTotal: 0,
    shelterGuestIds: new Set<string>(),
    unitedEffortMealsTotal: 0,
    unitedEffortGuestIds: new Set<string>(),
    lunchBagMealsTotal: 0,
    lunchBagGuestIds: new Set<string>(),
    allMealGuestIds: new Set<string>(),
    proxyPickups: 0,
    showersDoneGenerator: 0,
    showersSummaryCount: 0,
    showerGuestIds: new Set<string>(),
    showerServiceDates: new Set<string>(),
    laundryDoneGenerator: 0,
    laundrySummaryLoads: 0,
    laundryGuestIds: new Set<string>(),
    laundryServiceDates: new Set<string>(),
    onsiteLaundryLoads: 0,
    offsiteLaundryLoads: 0,
    bicycleServiceRecords: 0,
    newBicycleRecords: 0,
    bicycleServiceItems: 0,
    newBicycleItems: 0,
    haircuts: 0,
});

const monthKeyFor = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}`;

const dateKeyFor = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const getRecordCount = (record: { count?: number | null; quantity?: number | null }) => {
    const value = Number(record.count ?? record.quantity ?? 0);
    return Number.isFinite(value) ? value : 0;
};

const normalizeGuestId = (guestId: string | null | undefined) => {
    if (!guestId) return null;
    return String(guestId);
};

const isEarlierMonth = (left: MonthPointer, right: MonthPointer) => {
    return left.year < right.year || (left.year === right.year && left.month < right.month);
};

const rememberFirstMonth = (map: Map<string, MonthPointer>, guestId: string | null, year: number, month: number) => {
    if (!guestId) return;
    const next = { year, month };
    const existing = map.get(guestId);
    if (!existing || isEarlierMonth(next, existing)) {
        map.set(guestId, next);
    }
};

const getDateParts = (...values: Array<string | null | undefined>) => {
    for (const value of values) {
        if (!value) continue;
        const parts = parsePacificDateParts(value);
        if (parts) return parts;
    }
    return null;
};

const getOrCreateMonthAggregate = (aggregates: Map<string, MonthAggregate>, year: number, month: number) => {
    const key = monthKeyFor(year, month);
    const existing = aggregates.get(key);
    if (existing) return existing;
    const created = createMonthAggregate();
    aggregates.set(key, created);
    return created;
};

const addGuestId = (set: Set<string>, guestId: string | null) => {
    if (guestId) set.add(guestId);
};

const getGuestAgeLabel = (guest: GuestLike | undefined): AgeGroupLabel => {
    const rawAge = (guest?.age ?? guest?.ageGroup ?? guest?.age_group ?? '').toString().toLowerCase();
    if (rawAge.includes('child') || rawAge.includes('0-17')) return 'Child 0-17';
    if (rawAge.includes('senior') || rawAge.includes('60')) return 'Senior 60+';
    if (rawAge.includes('adult')) return 'Adult 18-59';
    return 'Unknown';
};

const getDemographicAgeLabel = (guest: GuestLike | undefined): Exclude<AgeGroupLabel, 'Unknown'> => {
    const rawAge = (guest?.age ?? guest?.ageGroup ?? guest?.age_group ?? '').toString().toLowerCase();
    if (rawAge.includes('child') || rawAge.includes('0-17')) return 'Child 0-17';
    if (rawAge.includes('senior') || rawAge.includes('60')) return 'Senior 60+';
    return 'Adult 18-59';
};

const getParticipantAgeBucket = (guest: GuestLike | undefined): ParticipantAgeBucket => {
    const rawAge = (guest?.age ?? guest?.ageGroup ?? guest?.age_group ?? '').toString().toLowerCase();
    if (rawAge.includes('child') || rawAge.includes('0-17')) return 'child';
    if (rawAge.includes('senior') || rawAge.includes('60')) return 'senior';
    return 'adult';
};

const addSetToSet = (target: Set<string>, source: Set<string>) => {
    source.forEach((value) => target.add(value));
};

const sumDays = (values: number[], days: number[]) => days.reduce((sum, day) => sum + (values[day] ?? 0), 0);

const addDaysToGuestSet = (target: Set<string>, values: Set<string>[], days: number[]) => {
    days.forEach((day) => {
        addSetToSet(target, values[day] ?? new Set<string>());
    });
};

const buildServiceStats = (cache: DashboardReportCache, year: number, endMonth: number, startMonth = endMonth): ServiceStats => {
    const totals: ServiceStats = {
        totalMeals: 0,
        onsiteHotMeals: 0,
        bagLunch: 0,
        rvMeals: 0,
        shelter: 0,
        rvSafePark: 0,
        dayWorker: 0,
        showers: 0,
        laundry: 0,
        bikeService: 0,
        newBicycles: 0,
        haircuts: 0,
    };

    for (let month = startMonth; month <= endMonth; month++) {
        const aggregate = cache.monthAggregates.get(monthKeyFor(year, month));
        if (!aggregate) continue;

        const onsiteHotMeals = aggregate.guestMealsByDay.reduce((sum, count) => sum + count, 0) + aggregate.extraMealsTotal;
        const rvSafePark = aggregate.rvMealsTotal + aggregate.shelterMealsTotal;

        totals.onsiteHotMeals += onsiteHotMeals;
        totals.bagLunch += aggregate.lunchBagMealsTotal;
        totals.rvMeals += aggregate.rvMealsTotal;
        totals.shelter += aggregate.shelterMealsTotal;
        totals.rvSafePark += rvSafePark;
        totals.dayWorker += aggregate.dayWorkerMealsTotal;
        totals.showers += aggregate.showersDoneGenerator;
        totals.laundry += aggregate.laundryDoneGenerator;
        totals.bikeService += aggregate.bicycleServiceRecords;
        totals.newBicycles += aggregate.newBicycleRecords;
        totals.haircuts += aggregate.haircuts;
        totals.totalMeals += onsiteHotMeals
            + aggregate.rvMealsTotal
            + aggregate.dayWorkerMealsTotal
            + aggregate.lunchBagMealsTotal
            + aggregate.shelterMealsTotal
            + aggregate.unitedEffortMealsTotal;
    }

    return totals;
};

const buildGuestLookup = (guests: ReadonlyArray<GuestLike>) => {
    const guestLookup = new Map<string, GuestLike>();
    guests.forEach((guest) => {
        [guest.id, guest.guestId, guest.externalId]
            .filter(Boolean)
            .forEach((id) => guestLookup.set(String(id), guest));
    });
    return guestLookup;
};

const buildDashboardReportCache = (refs: DashboardReportRefs): DashboardReportCache => {
    const monthAggregates = new Map<string, MonthAggregate>();
    const firstMealMonthByGuest = new Map<string, MonthPointer>();
    const firstServiceMonthByGuest = new Map<string, MonthPointer>();
    const firstLaundryMonthByGuest = new Map<string, MonthPointer>();
    const guestLookup = buildGuestLookup(refs.guests);

    const processMealRecords = (records: ReadonlyArray<MealRecordLike>, type: keyof MealTypeFilters | 'guest') => {
        records.forEach((record) => {
            const parts = getDateParts(record.dateKey, record.date);
            if (!parts) return;

            const aggregate = getOrCreateMonthAggregate(monthAggregates, parts.year, parts.month);
            const guestId = normalizeGuestId(record.guestId);
            const count = getRecordCount(record);

            if (guestId) {
                aggregate.allMealGuestIds.add(guestId);
                rememberFirstMonth(firstMealMonthByGuest, guestId, parts.year, parts.month);
            }

            if (type === 'guest') {
                aggregate.guestMealsByDay[parts.dayOfWeek] += count;
                addGuestId(aggregate.guestMealGuestIds, guestId);
                if (guestId) {
                    aggregate.guestMealGuestIdsByDay[parts.dayOfWeek].add(guestId);
                }
                if (record.pickedUpByGuestId && record.pickedUpByGuestId !== record.guestId) {
                    aggregate.proxyPickups += count || 1;
                }
                return;
            }

            if (type === 'extras') {
                aggregate.extraMealsTotal += count;
                aggregate.extraMealsByDay[parts.dayOfWeek] += count;
                if (guestId) {
                    aggregate.extraMealGuestIdsByDay[parts.dayOfWeek].add(guestId);
                }
                return;
            }

            if (type === 'rv') {
                aggregate.rvMealsTotal += count;
                aggregate.rvMealsByDay[parts.dayOfWeek] += count;
                addGuestId(aggregate.rvGuestIds, guestId);
                return;
            }

            if (type === 'dayWorker') {
                aggregate.dayWorkerMealsTotal += count;
                addGuestId(aggregate.dayWorkerGuestIds, guestId);
                return;
            }

            if (type === 'shelter') {
                aggregate.shelterMealsTotal += count;
                addGuestId(aggregate.shelterGuestIds, guestId);
                return;
            }

            if (type === 'unitedEffort') {
                aggregate.unitedEffortMealsTotal += count;
                addGuestId(aggregate.unitedEffortGuestIds, guestId);
                return;
            }

            aggregate.lunchBagMealsTotal += count;
            addGuestId(aggregate.lunchBagGuestIds, guestId);
        });
    };

    processMealRecords(refs.mealRecords, 'guest');
    processMealRecords(refs.extraMealRecords, 'extras');
    processMealRecords(refs.rvMealRecords, 'rv');
    processMealRecords(refs.dayWorkerMealRecords, 'dayWorker');
    processMealRecords(refs.shelterMealRecords, 'shelter');
    processMealRecords(refs.unitedEffortMealRecords, 'unitedEffort');
    processMealRecords(refs.lunchBagRecords, 'lunchBags');

    refs.showerRecords.forEach((record) => {
        const parts = getDateParts(record.dateKey, record.date);
        if (!parts) return;

        const aggregate = getOrCreateMonthAggregate(monthAggregates, parts.year, parts.month);
        const guestId = normalizeGuestId(record.guestId);
        const status = (record.status ?? '').toString().toLowerCase();
        const serviceDate = dateKeyFor(parts.year, parts.month, parts.day);

        if (status === 'done') {
            aggregate.showersDoneGenerator += 1;
        }

        if (SUMMARY_SHOWER_STATUSES.has(status)) {
            aggregate.showersSummaryCount += 1;
            addGuestId(aggregate.showerGuestIds, guestId);
            aggregate.showerServiceDates.add(serviceDate);
            rememberFirstMonth(firstServiceMonthByGuest, guestId, parts.year, parts.month);
        }
    });

    refs.laundryRecords.forEach((record) => {
        const parts = getDateParts(record.dateKey, record.date);
        if (!parts) return;

        const aggregate = getOrCreateMonthAggregate(monthAggregates, parts.year, parts.month);
        const guestId = normalizeGuestId(record.guestId);
        const status = (record.status ?? '').toString().toLowerCase();
        const serviceDate = dateKeyFor(parts.year, parts.month, parts.day);

        if (GENERATOR_LAUNDRY_STATUSES.has(status)) {
            aggregate.laundryDoneGenerator += 1;
        }

        if (SUMMARY_LAUNDRY_STATUSES.has(status)) {
            aggregate.laundrySummaryLoads += 1;
            addGuestId(aggregate.laundryGuestIds, guestId);
            aggregate.laundryServiceDates.add(serviceDate);

            if (record.laundryType === 'onsite') aggregate.onsiteLaundryLoads += 1;
            if (record.laundryType === 'offsite') aggregate.offsiteLaundryLoads += 1;

            rememberFirstMonth(firstServiceMonthByGuest, guestId, parts.year, parts.month);
            rememberFirstMonth(firstLaundryMonthByGuest, guestId, parts.year, parts.month);
        }
    });

    refs.bicycleRecords.forEach((record) => {
        const parts = getDateParts(record.dateKey, record.date);
        if (!parts) return;

        const aggregate = getOrCreateMonthAggregate(monthAggregates, parts.year, parts.month);
        const status = (record.status ?? '').toString().toLowerCase();
        const repairTypes = record.repairTypes?.length
            ? record.repairTypes
            : record.repairType
                ? [record.repairType]
                : [];
        const hasNewBicycle = repairTypes.some((type) => type.toLowerCase().includes('new bicycle') || type.toLowerCase().includes('new bike'));

        if (GENERATOR_BICYCLE_STATUSES.has(status)) {
            if (hasNewBicycle) {
                aggregate.newBicycleRecords += 1;
            } else {
                aggregate.bicycleServiceRecords += 1;
            }
        }

        if (status === 'done') {
            if (repairTypes.length === 0) {
                aggregate.bicycleServiceItems += 1;
                return;
            }

            repairTypes.forEach((type) => {
                if (type.toLowerCase().includes('new bicycle') || type.toLowerCase().includes('new bike')) {
                    aggregate.newBicycleItems += 1;
                } else {
                    aggregate.bicycleServiceItems += 1;
                }
            });
        }
    });

    refs.haircutRecords.forEach((record) => {
        const parts = getDateParts(record.serviceDate, record.dateKey, record.date);
        if (!parts) return;
        const aggregate = getOrCreateMonthAggregate(monthAggregates, parts.year, parts.month);
        aggregate.haircuts += 1;
    });

    return {
        refs,
        monthAggregates,
        guestLookup,
        firstMealMonthByGuest,
        firstServiceMonthByGuest,
        firstLaundryMonthByGuest,
    };
};

export const warmDashboardReportCache = (input: DashboardReportCacheInput): DashboardReportCache => {
    const refs = normalizeInput(input);
    if (cachedReportCache && hasSameRefs(cachedReportCache.refs, refs)) {
        return cachedReportCache;
    }

    cachedReportCache = buildDashboardReportCache(refs);
    return cachedReportCache;
};

export const getMealReportData = (
    input: DashboardReportCacheInput,
    options: {
        selectedYear: number;
        selectedMonth: number;
        comparisonMonths: number;
        selectedDays: number[];
        mealTypeFilters: MealTypeFilters;
    }
): MealReportRow[] => {
    const cache = warmDashboardReportCache(input);
    const { selectedYear, selectedMonth, comparisonMonths, selectedDays, mealTypeFilters } = options;
    const results: MealReportRow[] = [];
    const now = new Date();

    for (let monthOffset = 0; monthOffset <= comparisonMonths; monthOffset++) {
        const targetDate = new Date(selectedYear, selectedMonth - monthOffset);
        const targetYear = targetDate.getFullYear();
        const targetMonth = targetDate.getMonth();
        const monthLabel = `${MONTH_NAMES[targetMonth]} ${targetYear}`;
        const aggregate = cache.monthAggregates.get(monthKeyFor(targetYear, targetMonth));
        const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const isSelectedMonth = monthOffset === 0;
        const lastCountableDay = isSelectedMonth
            ? Math.min(daysInMonth, now.getDate())
            : daysInMonth;

        let validDaysCount = 0;
        for (let day = 1; day <= lastCountableDay; day++) {
            const date = new Date(targetYear, targetMonth, day);
            if (selectedDays.includes(date.getDay())) {
                validDaysCount += 1;
            }
        }

        const uniqueGuestIds = new Set<string>();

        if (aggregate) {
            if (mealTypeFilters.guest) {
                addDaysToGuestSet(uniqueGuestIds, aggregate.guestMealGuestIdsByDay, selectedDays);
            }
            if (mealTypeFilters.extras) {
                addDaysToGuestSet(uniqueGuestIds, aggregate.extraMealGuestIdsByDay, selectedDays);
            }
            if (mealTypeFilters.rv) {
                addSetToSet(uniqueGuestIds, aggregate.rvGuestIds);
            }
            if (mealTypeFilters.dayWorker) {
                addSetToSet(uniqueGuestIds, aggregate.dayWorkerGuestIds);
            }
            if (mealTypeFilters.shelter) {
                addSetToSet(uniqueGuestIds, aggregate.shelterGuestIds);
            }
            if (mealTypeFilters.unitedEffort) {
                addSetToSet(uniqueGuestIds, aggregate.unitedEffortGuestIds);
            }
            if (mealTypeFilters.lunchBags) {
                addSetToSet(uniqueGuestIds, aggregate.lunchBagGuestIds);
            }
        }

        const ageGroups: Record<AgeGroupLabel, number> = {
            'Adult 18-59': 0,
            'Child 0-17': 0,
            'Senior 60+': 0,
            Unknown: 0,
        };

        uniqueGuestIds.forEach((guestId) => {
            const label = getGuestAgeLabel(cache.guestLookup.get(guestId));
            ageGroups[label] += 1;
        });

        const guestMeals = aggregate && mealTypeFilters.guest ? sumDays(aggregate.guestMealsByDay, selectedDays) : 0;
        const extras = aggregate && mealTypeFilters.extras ? sumDays(aggregate.extraMealsByDay, selectedDays) : 0;
        const rvMeals = aggregate && mealTypeFilters.rv ? aggregate.rvMealsTotal : 0;
        const dayWorkerMeals = aggregate && mealTypeFilters.dayWorker ? aggregate.dayWorkerMealsTotal : 0;
        const shelterMeals = aggregate && mealTypeFilters.shelter ? aggregate.shelterMealsTotal : 0;
        const unitedEffortMeals = aggregate && mealTypeFilters.unitedEffort ? aggregate.unitedEffortMealsTotal : 0;
        const lunchBags = aggregate && mealTypeFilters.lunchBags ? aggregate.lunchBagMealsTotal : 0;
        const totalMeals = guestMeals + extras + rvMeals + dayWorkerMeals + shelterMeals + unitedEffortMeals + lunchBags;

        results.push({
            month: monthLabel,
            year: targetYear,
            monthIndex: targetMonth,
            guestMeals,
            extras,
            rvMeals,
            dayWorkerMeals,
            shelterMeals,
            unitedEffortMeals,
            lunchBags,
            totalMeals,
            uniqueGuestsPerServiceDay: validDaysCount ? uniqueGuestIds.size / validDaysCount : uniqueGuestIds.size,
            uniqueGuests: uniqueGuestIds.size,
            validDaysCount,
            isCurrentMonth: monthOffset === 0,
            ageGroups,
        });
    }

    return results.reverse();
};

export const getMonthlyReportData = (
    input: DashboardReportCacheInput,
    year: number,
    month: number,
): MonthlyReportSnapshot => {
    const cache = warmDashboardReportCache(input);
    const monthStats = buildServiceStats(cache, year, month);
    const ytdStats = buildServiceStats(cache, year, month, 0);
    const aggregate = cache.monthAggregates.get(monthKeyFor(year, month));
    const activeGuestIds = aggregate ? Array.from(aggregate.allMealGuestIds) : [];
    const activeGuests = activeGuestIds
        .map((guestId) => cache.guestLookup.get(guestId))
        .filter((guest): guest is GuestLike => Boolean(guest));
    const total = activeGuests.length;

    if (total === 0) {
        return {
            month: MONTH_NAMES[month],
            year,
            monthStats,
            ytdStats,
            housingBreakdown: [],
            topLocations: [],
            ageBreakdown: [],
            totalActiveGuests: activeGuestIds.length,
            generatedAt: new Date().toISOString(),
        };
    }

    const housingCounts: Record<string, number> = {
        Unhoused: 0,
        Housed: 0,
        'Temp. shelter': 0,
        'RV or vehicle': 0,
    };
    const locationCounts: Record<string, number> = {};
    const ageCounts: Record<Exclude<AgeGroupLabel, 'Unknown'>, number> = {
        'Adult 18-59': 0,
        'Child 0-17': 0,
        'Senior 60+': 0,
    };

    activeGuests.forEach((guest) => {
        const housing = (guest?.housingStatus ?? 'Unhoused').toString();
        if (housing in housingCounts) {
            housingCounts[housing] += 1;
        } else {
            housingCounts.Unhoused += 1;
        }

        const location = (guest?.location ?? 'Unknown').toString();
        locationCounts[location] = (locationCounts[location] ?? 0) + 1;

        const ageLabel = getDemographicAgeLabel(guest);
        ageCounts[ageLabel] += 1;
    });

    const toBreakdown = (counts: Record<string, number>) => {
        return Object.entries(counts)
            .filter(([, count]) => count > 0)
            .map(([label, count]) => ({
                label,
                count,
                percentage: (count / total) * 100,
            }))
            .sort((left, right) => right.count - left.count);
    };

    return {
        month: MONTH_NAMES[month],
        year,
        monthStats,
        ytdStats,
        housingBreakdown: toBreakdown(housingCounts),
        topLocations: toBreakdown(locationCounts).slice(0, 5),
        ageBreakdown: toBreakdown(ageCounts),
        totalActiveGuests: activeGuestIds.length,
        generatedAt: new Date().toISOString(),
    };
};

export const getMonthlySummaryDatasets = (
    input: DashboardReportCacheInput,
    selectedYear: number,
    currentYear: number,
    currentMonth: number,
): MonthlySummaryDatasets => {
    const cache = warmDashboardReportCache(input);
    const effectiveLastMonth = selectedYear === currentYear ? currentMonth : 11;

    const monthlyRows: MonthlySummaryRow[] = [];
    const ytdUniqueGuestIds = new Set<string>();

    for (let month = 0; month <= effectiveLastMonth; month++) {
        const aggregate = cache.monthAggregates.get(monthKeyFor(selectedYear, month));
        const mondayMeals = aggregate?.guestMealsByDay[1] ?? 0;
        const wednesdayMeals = aggregate?.guestMealsByDay[3] ?? 0;
        const fridayMeals = aggregate?.guestMealsByDay[5] ?? 0;
        const saturdayMeals = aggregate?.guestMealsByDay[6] ?? 0;
        const extraMeals = aggregate?.extraMealsTotal ?? 0;
        const rvWedSat = aggregate ? sumDays(aggregate.rvMealsByDay, [3, 6]) : 0;
        const rvMonThu = aggregate ? sumDays(aggregate.rvMealsByDay, [1, 4]) : 0;
        const rvAllDays = aggregate?.rvMealsTotal ?? 0;
        const rvOther = rvAllDays - rvWedSat - rvMonThu;
        const lunchBags = aggregate?.lunchBagMealsTotal ?? 0;
        const shelter = aggregate?.shelterMealsTotal ?? 0;
        const unitedEffort = aggregate?.unitedEffortMealsTotal ?? 0;
        const dayWorkerMeals = aggregate?.dayWorkerMealsTotal ?? 0;
        const onsiteHotMeals = mondayMeals + wednesdayMeals + fridayMeals + saturdayMeals + (aggregate ? sumDays(aggregate.extraMealsByDay, [1, 3, 5, 6]) : 0);
        const totalHotMeals = mondayMeals + wednesdayMeals + fridayMeals + saturdayMeals + dayWorkerMeals + extraMeals + rvWedSat + rvMonThu + rvOther + shelter + unitedEffort;
        const uniqueGuests = aggregate?.guestMealGuestIds.size ?? 0;

        let newGuests = 0;
        aggregate?.guestMealGuestIds.forEach((guestId) => {
            ytdUniqueGuestIds.add(guestId);
            const firstMeal = cache.firstMealMonthByGuest.get(guestId);
            if (firstMeal && firstMeal.year === selectedYear && firstMeal.month === month) {
                newGuests += 1;
            }
        });

        monthlyRows.push({
            month: MONTH_NAMES[month],
            mondayMeals,
            wednesdayMeals,
            fridayMeals,
            saturdayMeals,
            uniqueGuests,
            newGuests,
            proxyPickups: aggregate?.proxyPickups ?? 0,
            onsiteHotMeals,
            dayWorkerMeals,
            rvWedSat,
            rvMonThu,
            rvOther,
            shelter,
            extraMeals,
            lunchBags,
            totalHotMeals,
            totalWithLunchBags: totalHotMeals + lunchBags,
        });
    }

    const monthlyTotals: MonthlySummaryTotals = {
        month: 'Year to Date',
        mondayMeals: monthlyRows.reduce((sum, row) => sum + row.mondayMeals, 0),
        wednesdayMeals: monthlyRows.reduce((sum, row) => sum + row.wednesdayMeals, 0),
        fridayMeals: monthlyRows.reduce((sum, row) => sum + row.fridayMeals, 0),
        saturdayMeals: monthlyRows.reduce((sum, row) => sum + row.saturdayMeals, 0),
        uniqueGuests: ytdUniqueGuestIds.size,
        newGuests: monthlyRows.reduce((sum, row) => sum + row.newGuests, 0),
        proxyPickups: monthlyRows.reduce((sum, row) => sum + row.proxyPickups, 0),
        onsiteHotMeals: monthlyRows.reduce((sum, row) => sum + row.onsiteHotMeals, 0),
        dayWorkerMeals: monthlyRows.reduce((sum, row) => sum + row.dayWorkerMeals, 0),
        rvWedSat: monthlyRows.reduce((sum, row) => sum + row.rvWedSat, 0),
        rvMonThu: monthlyRows.reduce((sum, row) => sum + row.rvMonThu, 0),
        rvOther: monthlyRows.reduce((sum, row) => sum + row.rvOther, 0),
        shelter: monthlyRows.reduce((sum, row) => sum + row.shelter, 0),
        extraMeals: monthlyRows.reduce((sum, row) => sum + row.extraMeals, 0),
        lunchBags: monthlyRows.reduce((sum, row) => sum + row.lunchBags, 0),
        totalHotMeals: monthlyRows.reduce((sum, row) => sum + row.totalHotMeals, 0),
        totalWithLunchBags: monthlyRows.reduce((sum, row) => sum + row.totalWithLunchBags, 0),
    };

    const bicycleRows: BicycleSummaryRow[] = [];
    for (let month = 0; month <= effectiveLastMonth; month++) {
        const aggregate = cache.monthAggregates.get(monthKeyFor(selectedYear, month));
        bicycleRows.push({
            month: MONTH_NAMES[month],
            newBikes: aggregate?.newBicycleItems ?? 0,
            services: aggregate?.bicycleServiceItems ?? 0,
            total: (aggregate?.newBicycleItems ?? 0) + (aggregate?.bicycleServiceItems ?? 0),
        });
    }

    const bicycleTotals: BicycleSummaryTotals = bicycleRows.reduce(
        (totals, row) => ({
            newBikes: totals.newBikes + row.newBikes,
            services: totals.services + row.services,
            total: totals.total + row.total,
        }),
        { newBikes: 0, services: 0, total: 0 },
    );

    const ytdGuestSet = new Set<string>();
    const ytdLaundrySet = new Set<string>();
    const ytdParticipantAgeSets = {
        adult: new Set<string>(),
        senior: new Set<string>(),
        child: new Set<string>(),
    };
    const ytdLaundryAgeSets = {
        adult: new Set<string>(),
        senior: new Set<string>(),
        child: new Set<string>(),
    };
    let runningNewGuests = 0;
    let runningNewLaundryGuests = 0;
    const totalsAccumulator = {
        programDays: 0,
        showerServiceDays: 0,
        laundryServiceDays: 0,
        showers: 0,
        laundryLoads: 0,
        onsiteLoads: 0,
        offsiteLoads: 0,
    };

    const showerLaundryRows: ShowerLaundrySummaryRow[] = [];
    for (let month = 0; month <= effectiveLastMonth; month++) {
        const aggregate = cache.monthAggregates.get(monthKeyFor(selectedYear, month));
        const monthGuestSet = new Set<string>();
        if (aggregate) {
            addSetToSet(monthGuestSet, aggregate.showerGuestIds);
            addSetToSet(monthGuestSet, aggregate.laundryGuestIds);
        }

        const participantsCounts = { adult: 0, senior: 0, child: 0 };
        monthGuestSet.forEach((guestId) => {
            const bucket = getParticipantAgeBucket(cache.guestLookup.get(guestId));
            participantsCounts[bucket] += 1;
        });

        const laundryCounts = { adult: 0, senior: 0, child: 0 };
        aggregate?.laundryGuestIds.forEach((guestId) => {
            const bucket = getParticipantAgeBucket(cache.guestLookup.get(guestId));
            laundryCounts[bucket] += 1;
        });

        let newGuests = 0;
        monthGuestSet.forEach((guestId) => {
            const firstService = cache.firstServiceMonthByGuest.get(guestId);
            if (firstService && firstService.year === selectedYear && firstService.month === month) {
                newGuests += 1;
            }
        });

        let newLaundryGuests = 0;
        aggregate?.laundryGuestIds.forEach((guestId) => {
            const firstLaundry = cache.firstLaundryMonthByGuest.get(guestId);
            if (firstLaundry && firstLaundry.year === selectedYear && firstLaundry.month === month) {
                newLaundryGuests += 1;
            }
        });

        monthGuestSet.forEach((guestId) => {
            ytdGuestSet.add(guestId);
            ytdParticipantAgeSets[getParticipantAgeBucket(cache.guestLookup.get(guestId))].add(guestId);
        });
        aggregate?.laundryGuestIds.forEach((guestId) => {
            ytdLaundrySet.add(guestId);
            ytdLaundryAgeSets[getParticipantAgeBucket(cache.guestLookup.get(guestId))].add(guestId);
        });

        runningNewGuests += newGuests;
        runningNewLaundryGuests += newLaundryGuests;

        const programDays = new Set<string>();
        aggregate?.showerServiceDates.forEach((day) => programDays.add(day));
        aggregate?.laundryServiceDates.forEach((day) => programDays.add(day));

        const showerServiceDays = aggregate?.showerServiceDates.size ?? 0;
        const laundryServiceDays = aggregate?.laundryServiceDates.size ?? 0;
        const showers = aggregate?.showersSummaryCount ?? 0;
        const laundryLoads = aggregate?.laundrySummaryLoads ?? 0;
        const onsiteLoads = aggregate?.onsiteLaundryLoads ?? 0;
        const offsiteLoads = aggregate?.offsiteLaundryLoads ?? 0;

        totalsAccumulator.programDays += programDays.size;
        totalsAccumulator.showerServiceDays += showerServiceDays;
        totalsAccumulator.laundryServiceDays += laundryServiceDays;
        totalsAccumulator.showers += showers;
        totalsAccumulator.laundryLoads += laundryLoads;
        totalsAccumulator.onsiteLoads += onsiteLoads;
        totalsAccumulator.offsiteLoads += offsiteLoads;

        showerLaundryRows.push({
            month: MONTH_NAMES[month],
            programDays: programDays.size,
            showerServiceDays,
            laundryServiceDays,
            showers,
            avgShowersPerDay: showerServiceDays > 0 ? showers / showerServiceDays : 0,
            participantsAdult: participantsCounts.adult,
            participantsSenior: participantsCounts.senior,
            participantsChild: participantsCounts.child,
            totalParticipants: participantsCounts.adult + participantsCounts.senior + participantsCounts.child,
            newGuests,
            ytdTotalUnduplicatedGuests: ytdGuestSet.size,
            laundryLoads,
            onsiteLoads,
            offsiteLoads,
            avgLaundryLoadsPerDay: laundryServiceDays > 0 ? laundryLoads / laundryServiceDays : 0,
            uniqueLaundryGuests: aggregate?.laundryGuestIds.size ?? 0,
            laundryAdult: laundryCounts.adult,
            laundrySenior: laundryCounts.senior,
            laundryChild: laundryCounts.child,
            newLaundryGuests,
        });
    }

    const showerLaundryTotals: ShowerLaundrySummaryTotals = {
        month: 'Year to Date',
        programDays: totalsAccumulator.programDays,
        showerServiceDays: totalsAccumulator.showerServiceDays,
        laundryServiceDays: totalsAccumulator.laundryServiceDays,
        showers: totalsAccumulator.showers,
        avgShowersPerDay: totalsAccumulator.showerServiceDays > 0 ? totalsAccumulator.showers / totalsAccumulator.showerServiceDays : 0,
        participantsAdult: ytdParticipantAgeSets.adult.size,
        participantsSenior: ytdParticipantAgeSets.senior.size,
        participantsChild: ytdParticipantAgeSets.child.size,
        totalParticipants: ytdParticipantAgeSets.adult.size + ytdParticipantAgeSets.senior.size + ytdParticipantAgeSets.child.size,
        newGuests: runningNewGuests,
        ytdTotalUnduplicatedGuests: ytdGuestSet.size,
        laundryLoads: totalsAccumulator.laundryLoads,
        onsiteLoads: totalsAccumulator.onsiteLoads,
        offsiteLoads: totalsAccumulator.offsiteLoads,
        avgLaundryLoadsPerDay: totalsAccumulator.laundryServiceDays > 0 ? totalsAccumulator.laundryLoads / totalsAccumulator.laundryServiceDays : 0,
        uniqueLaundryGuests: ytdLaundrySet.size,
        laundryAdult: ytdLaundryAgeSets.adult.size,
        laundrySenior: ytdLaundryAgeSets.senior.size,
        laundryChild: ytdLaundryAgeSets.child.size,
        newLaundryGuests: runningNewLaundryGuests,
    };

    return {
        monthlyData: {
            months: monthlyRows,
            totals: monthlyTotals,
        },
        bicycleSummary: {
            months: bicycleRows,
            totals: bicycleTotals,
        },
        showerLaundrySummary: {
            months: showerLaundryRows,
            totals: showerLaundryTotals,
        },
    };
};