import CheckInClient from '@/components/checkin/CheckInClient';
import { getCheckInRepository } from '@/lib/checkin/server';
import { todayPacificDateString } from '@/lib/utils/date';
import { fetchMountainViewWeather } from '@/lib/weather/mountainView';

export const dynamic = 'force-dynamic';

export default async function CheckInPage() {
    const weatherPromise = fetchMountainViewWeather();

    if (process.env.CHECKIN_V2_ENABLED === 'false') {
        return <CheckInClient v2Enabled={false} initialWeather={await weatherPromise} />;
    }

    const [snapshot, weather] = await Promise.all([
        getCheckInRepository()
            .getSnapshot(todayPacificDateString())
            .catch((error) => {
                console.error('[check-in] Server snapshot unavailable; using client fallback', error);
                return null;
            }),
        weatherPromise,
    ]);

    return <CheckInClient initialSnapshot={snapshot} initialWeather={weather} v2Enabled={snapshot !== null} />;
}
