import { auth } from '@/lib/auth/config';
import { createSnapshotResponse } from '@/lib/checkin/api';
import { getCheckInRepository } from '@/lib/checkin/server';
import { todayPacificDateString } from '@/lib/utils/date';

export async function GET(request: Request) {
    const sessionPromise = auth();
    const url = new URL(request.url);
    const serviceDate = url.searchParams.get('date') || todayPacificDateString();
    const session = await sessionPromise;

    return createSnapshotResponse({
        session,
        serviceDate,
        loadSnapshot: (date) => getCheckInRepository().getSnapshot(date),
    });
}
