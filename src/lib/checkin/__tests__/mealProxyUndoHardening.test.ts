import { describe, expect, it, vi } from 'vitest';
import { useCheckInStore } from '@/stores/useCheckInStore';
import { createCheckInRepository } from '@/lib/checkin/repository';
import { executeOptimisticMeal } from '@/lib/checkin/clientCommands';
import { createCommandResponse } from '@/lib/checkin/commands';

const PICKER = '11111111-1111-4111-8111-111111111111';
const GUEST = '22222222-2222-4222-8222-222222222222';
const IDEMPOTENCY = '33333333-3333-4333-8333-333333333333';

describe('meal proxy picker + undo hardening (Critical C4/C5)', () => {
    it('C5: undoing one meal decrements instead of zeroing the count', () => {
        const store = useCheckInStore.getState();
        store.reset();
        store.replaceMealCounts('guest-1', 2, 0);

        useCheckInStore.getState().applyUndo({
            type: 'MEAL_ADDED',
            guestId: 'guest-1',
            recordId: 'meal-1',
            quantity: 1,
        });

        expect(useCheckInStore.getState().todayByGuest['guest-1']).toMatchObject({
            mealCount: 1,
            totalMeals: 1,
        });
    });

    it('C5: undoing an extra still decrements by its quantity', () => {
        const store = useCheckInStore.getState();
        store.reset();
        store.replaceMealCounts('guest-1', 1, 2);

        useCheckInStore.getState().applyUndo({
            type: 'EXTRA_MEALS_ADDED',
            guestId: 'guest-1',
            recordId: 'extra-1',
            quantity: 1,
        });

        expect(useCheckInStore.getState().todayByGuest['guest-1']).toMatchObject({
            mealCount: 1,
            extraMealCount: 1,
            totalMeals: 2,
        });
    });

    it('C4: repository forwards the proxy picker to the meal RPC', async () => {
        const rpc = vi.fn().mockResolvedValue({
            data: { guest_id: GUEST, meal_count: 1, extra_meal_count: 0, record_id: 'meal-1' },
            error: null,
        });
        const repository = createCheckInRepository({ rpc } as never);

        await repository.executeMealCommand({
            type: 'meal.add',
            guestId: GUEST,
            quantity: 1,
            idempotencyKey: IDEMPOTENCY,
            pickedUpByGuestId: PICKER,
        });

        expect(rpc).toHaveBeenCalledWith('execute_checkin_meal_command', expect.objectContaining({
            p_guest_id: GUEST,
            p_picked_up_by_guest_id: PICKER,
        }));
    });

    it('C4: optimistic meal command sends the proxy picker to the API', async () => {
        const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
            guestId: GUEST, mealCount: 1, extraMealCount: 0, totalMeals: 1, recordId: 'meal-1',
        }), { status: 200 }));

        await executeOptimisticMeal({
            guestId: GUEST,
            quantity: 1,
            extra: false,
            pickedUpByGuestId: PICKER,
            optimisticMeal: () => () => {},
            replaceMealCounts: vi.fn(),
            acknowledgeMealRecord: vi.fn(),
            request,
            idempotencyKey: IDEMPOTENCY,
        } as never);

        expect(request).toHaveBeenCalledOnce();
        const [, init] = request.mock.calls[0] as [unknown, RequestInit];
        expect(JSON.parse(init.body as string)).toMatchObject({
            type: 'meal.add',
            guestId: GUEST,
            pickedUpByGuestId: PICKER,
        });
    });

    it('C4: API validator accepts a valid picker UUID', async () => {
        const execute = vi.fn().mockResolvedValue({ ok: true });
        const response = await createCommandResponse({
            session: { user: { role: 'checkin' } },
            command: {
                type: 'meal.add',
                guestId: GUEST,
                quantity: 1,
                idempotencyKey: IDEMPOTENCY,
                pickedUpByGuestId: PICKER,
            },
            execute: execute as never,
        });

        expect(response.status).toBe(200);
        expect(execute).toHaveBeenCalledWith(expect.objectContaining({ pickedUpByGuestId: PICKER }));
    });

    it('C4: API validator rejects a malformed picker id', async () => {
        const execute = vi.fn();
        const response = await createCommandResponse({
            session: { user: { role: 'checkin' } },
            command: {
                type: 'meal.add',
                guestId: GUEST,
                quantity: 1,
                idempotencyKey: IDEMPOTENCY,
                pickedUpByGuestId: 'not-a-uuid',
            },
            execute: execute as never,
        });

        expect(response.status).toBe(422);
        expect(execute).not.toHaveBeenCalled();
    });
});
