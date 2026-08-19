import { auth } from '@/lib/auth/config';
import { createGuestHistoryResponse } from '@/lib/checkin/api';
import { getCheckInRepository } from '@/lib/checkin/server';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const [{ id }, session] = await Promise.all([params, auth()]);
    return createGuestHistoryResponse({
        session,
        guestId: id,
        loadHistory: (guestId) => getCheckInRepository().getGuestHistory(guestId),
    });
}
