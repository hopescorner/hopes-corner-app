type MaybeArray<T> = ReadonlyArray<T> | null | undefined;

interface MealRecordLike {
    date?: string | null;
    dateKey?: string | null;
    count?: number | null;
}

interface ServiceRecordLike {
    date?: string | null;
    dateKey?: string | null;
    status?: string | null;
}

interface DashboardOverviewMetricValues {
    meals: number;
    showers: number;
    laundry: number;
    bicycles: number;
}

export interface DashboardOverviewMetricsInput {
    mealRecords?: MaybeArray<MealRecordLike>;
    rvMealRecords?: MaybeArray<MealRecordLike>;
    extraMealRecords?: MaybeArray<MealRecordLike>;
    unitedEffortMealRecords?: MaybeArray<MealRecordLike>;
    showerRecords?: MaybeArray<ServiceRecordLike>;
    laundryRecords?: MaybeArray<ServiceRecordLike>;
    bicycleRecords?: MaybeArray<ServiceRecordLike>;
}

export interface DashboardOverviewMetrics {
    month: DashboardOverviewMetricValues;
    year: DashboardOverviewMetricValues;
}

const EMPTY_LIST: readonly [] = [];
const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

const emptyMetricValues = (): DashboardOverviewMetricValues => ({
    meals: 0,
    showers: 0,
    laundry: 0,
    bicycles: 0,
});

const getYearMonth = (dateValue: string | null | undefined) => {
    if (!dateValue) return null;

    const text = String(dateValue);
    const match = ISO_DATE_PREFIX.exec(text);
    if (match) {
        return { year: Number(match[1]), month: Number(match[2]) - 1 };
    }

    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return null;
    return { year: date.getFullYear(), month: date.getMonth() };
};

const getCount = (record: MealRecordLike) => {
    const value = Number(record.count || 0);
    return Number.isFinite(value) ? value : 0;
};

export function calculateDashboardOverviewMetrics(
    input: DashboardOverviewMetricsInput,
    referenceDate = new Date(),
): DashboardOverviewMetrics {
    const targetYear = referenceDate.getFullYear();
    const targetMonth = referenceDate.getMonth();
    const month = emptyMetricValues();
    const year = emptyMetricValues();

    const addMealRecords = (records: MaybeArray<MealRecordLike>) => {
        for (const record of records ?? EMPTY_LIST) {
            const parts = getYearMonth(record.dateKey || record.date);
            if (!parts || parts.year !== targetYear) continue;

            const count = getCount(record);
            year.meals += count;
            if (parts.month === targetMonth) {
                month.meals += count;
            }
        }
    };

    addMealRecords(input.mealRecords);
    addMealRecords(input.rvMealRecords);
    addMealRecords(input.extraMealRecords);
    addMealRecords(input.unitedEffortMealRecords);

    const addCompletedServiceRecords = (
        records: MaybeArray<ServiceRecordLike>,
        key: Exclude<keyof DashboardOverviewMetricValues, 'meals'>,
    ) => {
        for (const record of records ?? EMPTY_LIST) {
            if ((record.status || '').toLowerCase() !== 'done') continue;

            const parts = getYearMonth(record.dateKey || record.date);
            if (!parts || parts.year !== targetYear) continue;

            year[key] += 1;
            if (parts.month === targetMonth) {
                month[key] += 1;
            }
        }
    };

    addCompletedServiceRecords(input.showerRecords, 'showers');
    addCompletedServiceRecords(input.laundryRecords, 'laundry');
    addCompletedServiceRecords(input.bicycleRecords, 'bicycles');

    return { month, year };
}
