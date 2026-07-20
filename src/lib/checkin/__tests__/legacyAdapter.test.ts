import { describe, expect, it } from 'vitest';
import { snapshotToLegacyState, snapshotToMealStatusMap } from '@/lib/checkin/legacyAdapter';
import type { CheckInSnapshot } from '@/types/checkin';

describe('snapshotToLegacyState', () => {
    it('creates only today-sized legacy records for existing card behavior', () => {
        const snapshot = {
            generatedAt: '2026-07-19T18:00:00.000Z',
            directoryVersion: 'v1',
            serviceDate: '2026-07-19',
            guests: [{ id: 'guest-1' }],
            todayByGuest: {
                'guest-1': {
                    mealCount: 2,
                    extraMealCount: 1,
                    totalMeals: 3,
                    shower: { id: 'shower-1', time: '08:00', status: 'booked' },
                    laundry: null,
                    bicycle: null,
                    haircut: null,
                    holiday: null,
                },
            },
            dailyNotes: [],
        } as CheckInSnapshot;

        const result = snapshotToLegacyState(snapshot);

        expect(result.meals.mealRecords).toHaveLength(1);
        expect(result.meals.mealRecords[0]).toMatchObject({ guestId: 'guest-1', count: 2, dateKey: '2026-07-19' });
        expect(result.meals.extraMealRecords).toHaveLength(1);
        expect(result.services.showerRecords).toEqual([
            expect.objectContaining({ id: 'shower-1', guestId: 'guest-1', time: '08:00', dateKey: '2026-07-19' }),
        ]);
    });
});

describe('snapshotToMealStatusMap', () => {
    it('reflects optimistic snapshot counts without rebuilding legacy record arrays', () => {
        const result = snapshotToMealStatusMap({
            'guest-1': {
                mealCount: 2,
                extraMealCount: 2,
                totalMeals: 4,
                shower: null,
                laundry: null,
                bicycle: null,
                haircut: null,
                holiday: null,
            },
        }, '2026-07-19');

        expect(result.get('guest-1')).toMatchObject({
            hasMeal: true,
            mealCount: 2,
            extraMealCount: 2,
            totalMeals: 4,
            hasReachedMealLimit: true,
            hasReachedExtraMealLimit: true,
        });
    });
});
