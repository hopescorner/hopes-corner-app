import { auth } from '@/lib/auth/config';
import { createGuestContextResponse } from '@/lib/checkin/api';
import { getCheckInRepository } from '@/lib/checkin/server';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const [{ id }, session] = await Promise.all([params, auth()]);
    return createGuestContextResponse({
        session,
        guestId: id,
        loadContext: (guestId) => getCheckInRepository().getGuestContext(guestId),
    });
}
