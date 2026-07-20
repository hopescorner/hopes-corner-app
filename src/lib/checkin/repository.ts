import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeCheckInGuestContext, normalizeCheckInSnapshot } from '@/lib/checkin/snapshot';
import { todayPacificDateString } from '@/lib/utils/date';
import type { CheckInCommand } from '@/types/checkin';

export function createCheckInRepository(client: Pick<SupabaseClient, 'rpc'>) {
    return {
        async getSnapshot(serviceDate: string) {
            const { data, error } = await client.rpc('get_checkin_snapshot', {
                p_service_date: serviceDate,
            });

            if (error) throw new Error(error.message || 'Unable to load check-in snapshot');
            return normalizeCheckInSnapshot(data);
        },
        async getGuestContext(guestId: string) {
            const { data, error } = await client.rpc('get_checkin_guest_context', {
                p_guest_id: guestId,
            });
            if (error) throw new Error(error.message || 'Unable to load guest details');
            return normalizeCheckInGuestContext(data);
        },
        async executeMealCommand(command: Extract<CheckInCommand, { type: 'meal.add' }>, serviceDate = todayPacificDateString()) {
            const { data, error } = await client.rpc('execute_checkin_meal_command', {
                p_guest_id: command.guestId,
                p_service_date: serviceDate,
                p_quantity: command.quantity,
                p_extra: command.extra === true,
                p_idempotency_key: command.idempotencyKey,
            });
            if (error) throw new Error(error.message || 'Unable to record meal');
            const row = data && typeof data === 'object' ? data as Record<string, unknown> : {};
            const mealCount = Number(row.meal_count || 0);
            const extraMealCount = Number(row.extra_meal_count || 0);
            return {
                guestId: String(row.guest_id || command.guestId),
                mealCount,
                extraMealCount,
                totalMeals: mealCount + extraMealCount,
                recordId: row.record_id ? String(row.record_id) : undefined,
                idempotent: row.idempotent === true,
            };
        },
    };
}
