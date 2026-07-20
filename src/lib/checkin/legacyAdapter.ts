import type { CheckInServiceRecord, CheckInSnapshot, CheckInTodayStatus } from '@/types/checkin';
import type { MealStatusMap } from '@/stores/selectors/todayStatusSelectors';
import type { MealRecord } from '@/stores/useMealsStore';
import type { useServicesStore } from '@/stores/useServicesStore';
import { MAX_EXTRA_MEALS_PER_DAY, MAX_TOTAL_MEALS_PER_DAY } from '@/lib/constants/constants';

const dateTimestamp = (date: string) => `${date}T12:00:00.000Z`;

export function snapshotToMealStatusMap(
    todayByGuest: Record<string, CheckInTodayStatus>,
    serviceDate: string,
): MealStatusMap {
    const timestamp = dateTimestamp(serviceDate);
    return new Map(Object.entries(todayByGuest).map(([guestId, status]) => [guestId, {
        hasMeal: status.mealCount > 0,
        mealRecord: status.mealCount > 0 ? {
            id: `snapshot-meal-${guestId}`,
            guestId,
            count: status.mealCount,
            type: 'guest',
            date: timestamp,
            dateKey: serviceDate,
            servedOn: serviceDate,
        } as MealRecord : undefined,
        mealCount: status.mealCount,
        extraMealCount: status.extraMealCount,
        totalMeals: status.totalMeals,
        hasReachedMealLimit: status.totalMeals >= MAX_TOTAL_MEALS_PER_DAY,
        hasReachedExtraMealLimit: status.extraMealCount >= MAX_EXTRA_MEALS_PER_DAY,
    }]));
}

export function snapshotToLegacyState(snapshot: CheckInSnapshot) {
    type ServicesState = ReturnType<typeof useServicesStore.getState>;
    const mealRecords: MealRecord[] = [];
    const extraMealRecords: MealRecord[] = [];
    const showerRecords: ServicesState['showerRecords'] = [];
    const laundryRecords: ServicesState['laundryRecords'] = [];
    const bicycleRecords: ServicesState['bicycleRecords'] = [];
    const haircutRecords: ServicesState['haircutRecords'] = [];
    const holidayRecords: ServicesState['holidayRecords'] = [];
    const timestamp = dateTimestamp(snapshot.serviceDate);

    const serviceRecord = (guestId: string, record: CheckInServiceRecord) => ({
        id: record.id,
        guestId,
        time: record.time ?? null,
        status: record.status === 'booked' ? 'awaiting' : (record.status || 'done'),
        date: timestamp,
        dateKey: snapshot.serviceDate,
        scheduledFor: snapshot.serviceDate,
    });

    for (const [guestId, status] of Object.entries(snapshot.todayByGuest)) {
        if (status.mealCount > 0) {
            mealRecords.push({
                id: `snapshot-meal-${guestId}`,
                guestId,
                count: status.mealCount,
                type: 'guest',
                date: timestamp,
                dateKey: snapshot.serviceDate,
                servedOn: snapshot.serviceDate,
            } as MealRecord);
        }
        if (status.extraMealCount > 0) {
            extraMealRecords.push({
                id: `snapshot-extra-${guestId}`,
                guestId,
                count: status.extraMealCount,
                type: 'extra',
                date: timestamp,
                dateKey: snapshot.serviceDate,
                servedOn: snapshot.serviceDate,
            } as MealRecord);
        }
        if (status.shower) showerRecords.push(serviceRecord(guestId, status.shower) as unknown as ServicesState['showerRecords'][number]);
        if (status.laundry) laundryRecords.push(serviceRecord(guestId, status.laundry) as unknown as ServicesState['laundryRecords'][number]);
        if (status.bicycle) bicycleRecords.push(serviceRecord(guestId, status.bicycle) as unknown as ServicesState['bicycleRecords'][number]);
        if (status.haircut) haircutRecords.push({ ...serviceRecord(guestId, status.haircut), serviceDate: snapshot.serviceDate } as unknown as ServicesState['haircutRecords'][number]);
        if (status.holiday) holidayRecords.push(serviceRecord(guestId, status.holiday) as unknown as ServicesState['holidayRecords'][number]);
    }

    return {
        meals: { mealRecords, extraMealRecords },
        services: { showerRecords, laundryRecords, bicycleRecords, haircutRecords, holidayRecords },
    };
}
