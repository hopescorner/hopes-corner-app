import type { CheckInCommand } from '@/types/checkin';

type CommandSession = { user?: { role?: string } } | null;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COMMAND_ROLES = new Set(['admin', 'staff', 'checkin', 'bicycle']);

function isMealAddCommand(value: unknown): value is Extract<CheckInCommand, { type: 'meal.add' }> {
    if (!value || typeof value !== 'object') return false;
    const command = value as Record<string, unknown>;
    return command.type === 'meal.add'
        && typeof command.guestId === 'string'
        && UUID.test(command.guestId)
        && typeof command.idempotencyKey === 'string'
        && UUID.test(command.idempotencyKey)
        && Number.isInteger(command.quantity)
        && Number(command.quantity) >= 1
        && Number(command.quantity) <= 2
        && (command.extra === undefined || typeof command.extra === 'boolean');
}

export async function createCommandResponse({
    session,
    command,
    execute,
}: {
    session: CommandSession;
    command: unknown;
    execute: (command: Extract<CheckInCommand, { type: 'meal.add' }>) => Promise<unknown>;
}) {
    if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!COMMAND_ROLES.has(session.user.role || '')) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (!isMealAddCommand(command)) {
        return Response.json({ error: 'Invalid check-in command' }, { status: 422 });
    }

    try {
        return Response.json(await execute(command), {
            headers: { 'Cache-Control': 'private, no-store' },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to save check-in command';
        const isConflict = /MEAL_LIMIT_REACHED|duplicate|already/i.test(message);
        return Response.json({ error: message }, { status: isConflict ? 409 : 503 });
    }
}
