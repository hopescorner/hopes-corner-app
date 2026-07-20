import CheckInClient from '@/components/checkin/CheckInClient';
import { getCheckInRepository } from '@/lib/checkin/server';
import { todayPacificDateString } from '@/lib/utils/date';

export const dynamic = 'force-dynamic';

export default async function CheckInPage() {
    if (process.env.CHECKIN_V2_ENABLED === 'false') return <CheckInClient v2Enabled={false} />;

    let snapshot = null;
    try {
        snapshot = await getCheckInRepository().getSnapshot(todayPacificDateString());
    } catch (error) {
        console.error('[check-in] Server snapshot unavailable; using client fallback', error);
    }
    return <CheckInClient initialSnapshot={snapshot} v2Enabled={snapshot !== null} />;
}
