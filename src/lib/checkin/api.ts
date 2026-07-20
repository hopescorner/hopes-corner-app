type SnapshotSession = { user?: { role?: string } } | null;

const SERVICE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHECK_IN_ROLES = new Set(['admin', 'staff', 'checkin', 'bicycle']);

export async function createSnapshotResponse({
    session,
    serviceDate,
    loadSnapshot,
}: {
    session: SnapshotSession;
    serviceDate: string;
    loadSnapshot: (date: string) => Promise<unknown>;
}) {
    if (!session?.user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!CHECK_IN_ROLES.has(session.user.role || '')) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!SERVICE_DATE.test(serviceDate)) {
        return Response.json({ error: 'serviceDate must use YYYY-MM-DD' }, { status: 422 });
    }

    try {
        const snapshot = await loadSnapshot(serviceDate);
        return Response.json(snapshot, {
            headers: { 'Cache-Control': 'private, no-store' },
        });
    } catch (error) {
        console.error('[check-in snapshot] load failed', error);
        return Response.json({ error: 'Unable to load check-in data' }, { status: 503 });
    }
}

export async function createGuestContextResponse({
    session,
    guestId,
    loadContext,
}: {
    session: SnapshotSession;
    guestId: string;
    loadContext: (guestId: string) => Promise<unknown>;
}) {
    if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!CHECK_IN_ROLES.has(session.user.role || '')) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (!UUID.test(guestId)) return Response.json({ error: 'Invalid guest id' }, { status: 422 });
    try {
        return Response.json(await loadContext(guestId), {
            headers: { 'Cache-Control': 'private, no-store' },
        });
    } catch (error) {
        console.error('[check-in context] load failed', error);
        return Response.json({ error: 'Unable to load guest details' }, { status: 503 });
    }
}
