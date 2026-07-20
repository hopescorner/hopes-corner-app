import { describe, expect, it, vi } from 'vitest';
import { createCheckInRepository } from '@/lib/checkin/repository';

describe('createCheckInRepository', () => {
    it('loads and normalizes a snapshot through one RPC', async () => {
        const rpc = vi.fn().mockResolvedValue({
            data: { service_date: '2026-07-19', guests: [], today_by_guest: {}, daily_notes: [] },
            error: null,
        });
        const repository = createCheckInRepository({ rpc } as never);

        const result = await repository.getSnapshot('2026-07-19');

        expect(rpc).toHaveBeenCalledWith('get_checkin_snapshot', { p_service_date: '2026-07-19' });
        expect(result.serviceDate).toBe('2026-07-19');
    });

    it('surfaces database failures without returning a partial snapshot', async () => {
        const repository = createCheckInRepository({
            rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'database unavailable' } }),
        } as never);

        await expect(repository.getSnapshot('2026-07-19')).rejects.toThrow('database unavailable');
    });

    it('executes meal commands through the atomic RPC', async () => {
        const rpc = vi.fn().mockResolvedValue({
            data: { guest_id: 'guest-1', meal_count: 2, extra_meal_count: 0, record_id: 'meal-1' },
            error: null,
        });
        const repository = createCheckInRepository({ rpc } as never);

        const result = await repository.executeMealCommand({
            type: 'meal.add',
            guestId: 'guest-1',
            quantity: 2,
            idempotencyKey: 'command-1',
        });

        expect(rpc).toHaveBeenCalledWith('execute_checkin_meal_command', {
            p_guest_id: 'guest-1',
            p_service_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
            p_quantity: 2,
            p_extra: false,
            p_idempotency_key: 'command-1',
        });
        expect(result).toMatchObject({ guestId: 'guest-1', mealCount: 2, totalMeals: 2, recordId: 'meal-1' });
    });

    it('loads detailed guest context only when requested', async () => {
        const rpc = vi.fn().mockResolvedValue({
            data: {
                guest: { id: 'guest-1', first_name: 'Ada', notes: 'private note', bicycle_description: 'blue bike' },
                warnings: [{ id: 'warning-1', guest_id: 'guest-1', message: 'Ask staff' }],
                reminders: [],
                linked_guests: [],
            },
            error: null,
        });
        const repository = createCheckInRepository({ rpc } as never);

        const result = await repository.getGuestContext('guest-1');

        expect(rpc).toHaveBeenCalledWith('get_checkin_guest_context', { p_guest_id: 'guest-1' });
        expect(result.guest).toMatchObject({ id: 'guest-1', firstName: 'Ada', notes: 'private note', bicycleDescription: 'blue bike' });
        expect(result.warnings).toHaveLength(1);
    });
});
