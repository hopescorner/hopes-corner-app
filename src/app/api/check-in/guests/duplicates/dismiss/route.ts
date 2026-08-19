import { auth } from '@/lib/auth/config';
import { createGuestDuplicateDismissalResponse } from '@/lib/checkin/guestMerge';
import { getCheckInRepository } from '@/lib/checkin/server';

export async function POST(request: Request) {
    const sessionPromise = auth();
    let input: unknown;
    try {
        input = await request.json();
    } catch {
        return Response.json({ error: 'Request body must be JSON' }, { status: 422 });
    }
    const session = await sessionPromise;
    return createGuestDuplicateDismissalResponse({
        session,
        input: input && typeof input === 'object' ? input : {},
        dismiss: (firstGuestId, secondGuestId) => getCheckInRepository().dismissDuplicateCandidate(firstGuestId, secondGuestId),
    });
}
