import { describe, expect, it, vi } from 'vitest';
import { useCheckInStore } from '@/stores/useCheckInStore';
import { executeOptimisticMeal } from '@/lib/checkin/clientCommands';

describe('executeOptimisticMeal', () => {
    it('updates immediately and replaces with the canonical server counts', async () => {
        const rollback = vi.fn();
        const optimisticMeal = vi.fn(() => rollback);
        const replaceMealCounts = vi.fn();
        const acknowledgeMealRecord = vi.fn();
        const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
            guestId: 'guest-1', mealCount: 2, extraMealCount: 1, totalMeals: 3, recordId: 'meal-1',
        }), { status: 200 }));

        const promise = executeOptimisticMeal({
            guestId: 'guest-1', quantity: 1, extra: false,
            optimisticMeal, replaceMealCounts, acknowledgeMealRecord, request,
            idempotencyKey: 'command-1',
        });

        expect(optimisticMeal).toHaveBeenCalledWith('guest-1', 1, false);
        await expect(promise).resolves.toMatchObject({ id: 'meal-1', count: 2 });
        expect(replaceMealCounts).toHaveBeenCalledWith('guest-1', 2, 1);
        expect(acknowledgeMealRecord).toHaveBeenCalledWith('meal-1');
        expect(rollback).not.toHaveBeenCalled();
    });

    it('rolls back when the server rejects the command', async () => {
        const rollback = vi.fn();

        await expect(executeOptimisticMeal({
            guestId: 'guest-1', quantity: 1, extra: false,
            optimisticMeal: vi.fn(() => rollback),
            replaceMealCounts: vi.fn(),
            acknowledgeMealRecord: vi.fn(),
            request: vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'MEAL_LIMIT_REACHED' }), { status: 409 })),
            idempotencyKey: 'command-1',
        })).rejects.toThrow(/daily meal limit/i);

        expect(rollback).toHaveBeenCalledOnce();
    });
    it('replaces stale counts after a meal-limit conflict without retrying the write', async () => {
        useCheckInStore.getState().reset();
        const store = useCheckInStore.getState();
        const request = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'MEAL_LIMIT_REACHED' }), { status: 409 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                todayByGuest: { 'guest-1': { mealCount: 2, extraMealCount: 1 } },
            }), { status: 200 }));
        await expect(executeOptimisticMeal({
            guestId: 'guest-1', quantity: 2, extra: false,
            optimisticMeal: store.optimisticMeal, replaceMealCounts: store.replaceMealCounts,
            acknowledgeMealRecord: store.acknowledgeMealRecord, request, idempotencyKey: 'command-1',
        })).rejects.toThrow(/meal.*limit/i);
        expect(useCheckInStore.getState().todayByGuest['guest-1']).toMatchObject({
            mealCount: 2, extraMealCount: 1, totalMeals: 3,
        });
        expect(request).toHaveBeenCalledTimes(2);
        expect(request).toHaveBeenLastCalledWith('/api/check-in/reconcile', { cache: 'no-store' });
    });

    it.each(['offline', 'http', 'invalid-json'])('keeps the meal-limit error and rolls back when recovery fails: %s', async (failure) => {
        useCheckInStore.getState().reset();
        const store = useCheckInStore.getState();
        store.replaceMealCounts('guest-1', 1, 0);
        const request = vi.fn().mockResolvedValueOnce(
            new Response(JSON.stringify({ error: 'MEAL_LIMIT_REACHED' }), { status: 409 }),
        );
        if (failure === 'offline') request.mockRejectedValueOnce(new Error('Network unavailable'));
        else if (failure === 'http') request.mockResolvedValueOnce(new Response(null, { status: 503 }));
        else request.mockResolvedValueOnce(new Response('invalid json', { status: 200 }));
        await expect(executeOptimisticMeal({
            guestId: 'guest-1', quantity: 2, extra: false,
            optimisticMeal: store.optimisticMeal, replaceMealCounts: store.replaceMealCounts,
            acknowledgeMealRecord: store.acknowledgeMealRecord, request, idempotencyKey: 'command-1',
        })).rejects.toThrow(/daily meal limit/i);
        expect(useCheckInStore.getState().todayByGuest['guest-1']).toMatchObject({ mealCount: 1, totalMeals: 1 });
        expect(request).toHaveBeenCalledTimes(2);
    });

    it('does not fetch meal counts for an authentication error', async () => {
        const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
        const rollback = vi.fn();
        await expect(executeOptimisticMeal({
            guestId: 'guest-1', quantity: 1, extra: false,
            optimisticMeal: () => rollback, replaceMealCounts: vi.fn(),
            acknowledgeMealRecord: vi.fn(), request, idempotencyKey: 'command-1',
        })).rejects.toThrow('Unauthorized');
        expect(rollback).toHaveBeenCalledOnce();
        expect(request).toHaveBeenCalledTimes(1);
    });

});
