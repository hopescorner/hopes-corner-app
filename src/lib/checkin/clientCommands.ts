import type { CheckInSnapshot } from '@/types/checkin';

interface MealCommandResult {
    guestId: string;
    mealCount: number;
    extraMealCount: number;
    totalMeals: number;
    recordId?: string;
}

export async function executeOptimisticMeal({
    guestId,
    quantity,
    extra,
    optimisticMeal,
    replaceMealCounts,
    acknowledgeMealRecord,
    request,
    idempotencyKey,
}: {
    guestId: string;
    quantity: number;
    extra: boolean;
    optimisticMeal: (guestId: string, quantity: number, extra: boolean) => () => void;
    replaceMealCounts: (guestId: string, mealCount: number, extraMealCount: number) => void;
    acknowledgeMealRecord: (recordId: string) => void;
    request: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    idempotencyKey: string;
}) {
    const rollback = optimisticMeal(guestId, quantity, extra);
    try {
        const response = await request('/api/check-in/commands', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'meal.add',
                guestId,
                quantity,
                extra,
                idempotencyKey,
            }),
        });
        const body = await response.json() as MealCommandResult & { error?: string };
        if (!response.ok) throw new Error(body.error || 'Unable to record meal');
        replaceMealCounts(guestId, body.mealCount, body.extraMealCount);
        if (body.recordId) acknowledgeMealRecord(body.recordId);
        return {
            id: body.recordId || idempotencyKey,
            guestId,
            count: extra ? body.extraMealCount : body.mealCount,
            type: extra ? 'extra' : 'guest',
        };
    } catch (error) {
        rollback();
        if (error instanceof Error && error.message.includes('MEAL_LIMIT_REACHED')) {
            // Another device may already have recorded the meal. Refresh after
            // rollback so we do not leave the stale, actionable counts on screen.
            // Never retry the write: the daily limit must remain enforced.
            try {
                const response = await request('/api/check-in/reconcile', { cache: 'no-store' });
                if (response.ok) {
                    const snapshot = await response.json() as CheckInSnapshot;
                    const status = snapshot.todayByGuest[guestId];
                    replaceMealCounts(guestId, status?.mealCount ?? 0, status?.extraMealCount ?? 0);
                }
            } catch {
                // Keep the original save error if the recovery request fails.
            }
            throw new Error('This guest has reached the daily meal limit.');
        }
        throw error;
    }
}
