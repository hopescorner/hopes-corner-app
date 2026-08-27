import { describe, expect, it, vi } from 'vitest';
import { createCommandResponse } from '@/lib/checkin/commands';

describe('createCommandResponse', () => {
    const validCommand = {
        type: 'meal.add' as const,
        guestId: '5ee5df7b-8c46-4e05-b9c3-a4451f747dee',
        quantity: 1,
        idempotencyKey: '74cffaf7-a9d6-46e0-8f3d-c1549d860f40',
    };

    it('rejects malformed commands before executing them', async () => {
        const execute = vi.fn();
        const response = await createCommandResponse({
            session: { user: { role: 'checkin' } },
            command: { ...validCommand, quantity: 9 },
            execute,
        });

        expect(response.status).toBe(422);
        expect(execute).not.toHaveBeenCalled();
    });

    it('executes a valid command and returns the canonical patch', async () => {
        const execute = vi.fn().mockResolvedValue({ guestId: validCommand.guestId, mealCount: 1 });
        const response = await createCommandResponse({
            session: { user: { role: 'staff' } },
            command: validCommand,
            execute,
        });

        expect(response.status).toBe(200);
        expect(execute).toHaveBeenCalledWith(validCommand);
        await expect(response.json()).resolves.toMatchObject({ mealCount: 1 });
    });

    it('maps database conflicts to HTTP 409', async () => {
        const response = await createCommandResponse({
            session: { user: { role: 'checkin' } },
            command: validCommand,
            execute: vi.fn().mockRejectedValue(new Error('MEAL_LIMIT_REACHED')),
        });

        expect(response.status).toBe(409);
    });
});
