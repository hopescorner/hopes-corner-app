import { auth } from '@/lib/auth/config';
import { createCommandResponse } from '@/lib/checkin/commands';
import { getCheckInRepository } from '@/lib/checkin/server';

export async function POST(request: Request) {
    const sessionPromise = auth();
    let command: unknown;
    try {
        command = await request.json();
    } catch {
        return Response.json({ error: 'Request body must be JSON' }, { status: 422 });
    }
    const session = await sessionPromise;
    return createCommandResponse({
        session,
        command,
        execute: (validCommand) => getCheckInRepository().executeMealCommand(validCommand),
    });
}
