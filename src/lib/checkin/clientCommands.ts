import type { CheckInSnapshot } from '@/types/checkin';
import { queueCommand } from './offlineQueue';
import toast from 'react-hot-toast';

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
    pickedUpByGuestId,
    optimisticMeal,
    replaceMealCounts,
    acknowledgeMealRecord,
    request,
    idempotencyKey,
}: {
    guestId: string;
    quantity: number;
    extra: boolean;
    pickedUpByGuestId?: string | null;
    optimisticMeal: (guestId: string, quantity: number, extra: boolean) => () => void;
    replaceMealCounts: (guestId: string, mealCount: number, extraMealCount: number) => void;
    acknowledgeMealRecord: (recordId: string) => void;
    request: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    idempotencyKey: string;
}) {
    const rollback = optimisticMeal(guestId, quantity, extra);
    const payload = {
        type: 'meal.add',
        guestId,
        quantity,
        extra,
        pickedUpByGuestId: pickedUpByGuestId ?? undefined,
        idempotencyKey,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await queueCommand({
            id: idempotencyKey,
            url: '/api/check-in/commands',
            body: payload,
            timestamp: Date.now(),
        });
        toast('Saved offline. Will sync when back online.', { icon: '📡' });
        return {
            id: idempotencyKey,
            guestId,
            count: quantity,
            type: extra ? 'extra' : 'guest',
        };
    }

    try {
        const response = await request('/api/check-in/commands', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
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
        const isNetworkFailure =
            (typeof navigator !== 'undefined' && !navigator.onLine) ||
            error instanceof TypeError ||
            (error instanceof Error && error.message.toLowerCase().includes('failed to fetch'));

        if (isNetworkFailure) {
            await queueCommand({
                id: idempotencyKey,
                url: '/api/check-in/commands',
                body: payload,
                timestamp: Date.now(),
            });
            toast('Saved offline. Will sync when back online.', { icon: '📡' });
            return {
                id: idempotencyKey,
                guestId,
                count: quantity,
                type: extra ? 'extra' : 'guest',
            };
        }

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
