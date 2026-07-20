import { describe, expect, it, vi } from 'vitest';
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
        })).rejects.toThrow('MEAL_LIMIT_REACHED');

        expect(rollback).toHaveBeenCalledOnce();
    });
});
