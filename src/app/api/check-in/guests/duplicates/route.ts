import { auth } from '@/lib/auth/config';
import { createGuestDuplicateCandidatesResponse } from '@/lib/checkin/guestMerge';
import { getCheckInRepository } from '@/lib/checkin/server';

export async function GET() {
    const session = await auth();
    return createGuestDuplicateCandidatesResponse({
        session,
        load: () => getCheckInRepository().getDuplicateCandidates(),
    });
}
