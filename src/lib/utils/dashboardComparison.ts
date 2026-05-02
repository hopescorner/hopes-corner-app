export type DashboardComparisonMetricKey =
    | 'newGuests'
    | 'totalGuests'
    | 'proxyPickups'
    | 'meals'
    | 'showers'
    | 'bicycles'
    | 'laundry';

export interface DashboardComparisonRange {
    start: string;
    end: string;
}

export interface DashboardComparisonFilters {
    location?: string;
    ageGroup?: string;
    gender?: string;
    housingStatus?: string;
}

export interface DashboardComparisonGuest {
    id: string;
    createdAt?: string | null;
    location?: string | null;
    age?: string | null;
    gender?: string | null;
    housingStatus?: string | null;
}

export interface DashboardComparisonMealRecord {
    id?: string;
    guestId?: string | null;
    pickedUpByGuestId?: string | null;
    count?: number | null;
    date?: string | null;
    dateKey?: string | null;
}

export interface DashboardComparisonServiceRecord {
    id?: string;
    guestId?: string | null;
    status?: string | null;
    repairType?: string | null;
    repairTypes?: string[] | null;
    completedRepairs?: string[] | null;
    date?: string | null;
    dateKey?: string | null;
    serviceDate?: string | null;
    service_date?: string | null;
}

export interface DashboardComparisonData {
    guests: DashboardComparisonGuest[];
    mealRecords: DashboardComparisonMealRecord[];
    rvMealRecords: DashboardComparisonMealRecord[];
    extraMealRecords: DashboardComparisonMealRecord[];
    dayWorkerMealRecords: DashboardComparisonMealRecord[];
    shelterMealRecords: DashboardComparisonMealRecord[];
    unitedEffortMealRecords: DashboardComparisonMealRecord[];
    lunchBagRecords: DashboardComparisonMealRecord[];
    showerRecords: DashboardComparisonServiceRecord[];
    laundryRecords: DashboardComparisonServiceRecord[];
    bicycleRecords: DashboardComparisonServiceRecord[];
}

export type DashboardComparisonMetrics = Record<DashboardComparisonMetricKey, number>;

export interface DashboardComparisonRow {
    key: DashboardComparisonMetricKey;
    label: string;
    firstValue: number;
    secondValue: number;
    delta: number;
    percentChange: number | null;
}

export const DASHBOARD_COMPARISON_METRICS: Array<{ key: DashboardComparisonMetricKey; label: string }> = [
    { key: 'newGuests', label: 'New Guests' },
    { key: 'totalGuests', label: 'Total Guests' },
    { key: 'proxyPickups', label: 'Proxy Pickups' },
    { key: 'meals', label: 'Meals' },
    { key: 'showers', label: 'Showers' },
    { key: 'bicycles', label: 'Bicycles' },
    { key: 'laundry', label: 'Laundry' },
];

const COMPLETED_LAUNDRY_STATUSES = new Set(['done', 'picked_up', 'returned', 'offsite_picked_up']);

export function getComparisonDateKey(record: { date?: string | null; dateKey?: string | null; serviceDate?: string | null; service_date?: string | null }) {
    const value = record.dateKey || record.serviceDate || record.service_date || record.date || '';
    return String(value).split('T')[0];
}

function isInRange(dateValue: string | null | undefined, range: DashboardComparisonRange) {
    const dateKey = String(dateValue || '').split('T')[0];
    return Boolean(dateKey) && dateKey >= range.start && dateKey <= range.end;
}

function hasActiveFilters(filters: DashboardComparisonFilters = {}) {
    return Boolean(
        (filters.location && filters.location !== 'all') ||
        (filters.ageGroup && filters.ageGroup !== 'all') ||
        (filters.gender && filters.gender !== 'all') ||
        (filters.housingStatus && filters.housingStatus !== 'all')
    );
}

function guestMatchesFilters(guest: DashboardComparisonGuest, filters: DashboardComparisonFilters = {}) {
    if (filters.location && filters.location !== 'all' && (guest.location || 'Unknown') !== filters.location) return false;
    if (filters.ageGroup && filters.ageGroup !== 'all' && (guest.age || 'Unknown') !== filters.ageGroup) return false;
    if (filters.gender && filters.gender !== 'all' && (guest.gender || 'Unknown') !== filters.gender) return false;
    if (filters.housingStatus && filters.housingStatus !== 'all' && (guest.housingStatus || 'Unknown') !== filters.housingStatus) return false;
    return true;
}

function countBicycleServices(record: DashboardComparisonServiceRecord) {
    const repairTypes = record.repairTypes || [];
    if (repairTypes.length > 0) return repairTypes.length;
    if (record.repairType) return 1;
    if ((record.completedRepairs || []).length > 0) return record.completedRepairs?.length || 1;
    return 1;
}

function emptyMetrics(): DashboardComparisonMetrics {
    return {
        newGuests: 0,
        totalGuests: 0,
        proxyPickups: 0,
        meals: 0,
        showers: 0,
        bicycles: 0,
        laundry: 0,
    };
}

export function calculateDashboardComparisonMetrics(
    data: DashboardComparisonData,
    range: DashboardComparisonRange,
    filters: DashboardComparisonFilters = {},
): DashboardComparisonMetrics {
    const metrics = emptyMetrics();
    const filtering = hasActiveFilters(filters);
    const matchingGuestIds = new Set(
        data.guests.filter((guest) => guestMatchesFilters(guest, filters)).map((guest) => guest.id),
    );
    const activeGuestIds = new Set<string>();

    const isGuestIncluded = (guestId?: string | null) => {
        if (!filtering) return true;
        return Boolean(guestId && matchingGuestIds.has(guestId));
    };

    const addActiveGuest = (guestId?: string | null) => {
        if (guestId && isGuestIncluded(guestId)) activeGuestIds.add(guestId);
    };

    metrics.newGuests = data.guests.filter((guest) => {
        return isInRange(guest.createdAt, range) && guestMatchesFilters(guest, filters);
    }).length;

    const mealGroups = [
        data.mealRecords,
        data.rvMealRecords,
        data.extraMealRecords,
        data.dayWorkerMealRecords,
        data.shelterMealRecords,
        data.unitedEffortMealRecords,
        data.lunchBagRecords,
    ];

    for (const group of mealGroups) {
        for (const record of group) {
            if (!isInRange(getComparisonDateKey(record), range) || !isGuestIncluded(record.guestId)) continue;
            metrics.meals += Number(record.count) || 0;
            addActiveGuest(record.guestId);
        }
    }

    for (const record of data.mealRecords) {
        if (!isInRange(getComparisonDateKey(record), range) || !isGuestIncluded(record.guestId)) continue;
        if (record.pickedUpByGuestId && record.pickedUpByGuestId !== record.guestId) {
            metrics.proxyPickups += Number(record.count) || 0;
        }
    }

    for (const record of data.showerRecords) {
        if (!isInRange(getComparisonDateKey(record), range) || record.status !== 'done' || !isGuestIncluded(record.guestId)) continue;
        metrics.showers += 1;
        addActiveGuest(record.guestId);
    }

    for (const record of data.laundryRecords) {
        if (!isInRange(getComparisonDateKey(record), range) || !COMPLETED_LAUNDRY_STATUSES.has(String(record.status)) || !isGuestIncluded(record.guestId)) continue;
        metrics.laundry += 1;
        addActiveGuest(record.guestId);
    }

    for (const record of data.bicycleRecords) {
        if (!isInRange(getComparisonDateKey(record), range) || record.status !== 'done' || !isGuestIncluded(record.guestId)) continue;
        metrics.bicycles += countBicycleServices(record);
        addActiveGuest(record.guestId);
    }

    metrics.totalGuests = activeGuestIds.size;
    return metrics;
}

export function calculatePercentChange(firstValue: number, secondValue: number) {
    if (secondValue === 0) return null;
    return Number((((firstValue - secondValue) / secondValue) * 100).toFixed(1));
}

export function compareDashboardRanges(
    data: DashboardComparisonData,
    ranges: { first: DashboardComparisonRange; second: DashboardComparisonRange },
    filters: DashboardComparisonFilters = {},
): DashboardComparisonRow[] {
    const firstMetrics = calculateDashboardComparisonMetrics(data, ranges.first, filters);
    const secondMetrics = calculateDashboardComparisonMetrics(data, ranges.second, filters);

    return DASHBOARD_COMPARISON_METRICS.map((metric) => {
        const firstValue = firstMetrics[metric.key];
        const secondValue = secondMetrics[metric.key];
        return {
            key: metric.key,
            label: metric.label,
            firstValue,
            secondValue,
            delta: firstValue - secondValue,
            percentChange: calculatePercentChange(firstValue, secondValue),
        };
    });
}
