type MergeSession = { user?: { role?: string } } | null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MERGE_ROLES = new Set(['admin', 'staff', 'checkin']);

type MergeInput = {
    keepGuestId?: unknown;
    duplicateGuestId?: unknown;
};

type DuplicatePairInput = {
    firstGuestId?: unknown;
    secondGuestId?: unknown;
};

function validPair(input: DuplicatePairInput) {
    const firstGuestId = typeof input.firstGuestId === 'string' ? input.firstGuestId : '';
    const secondGuestId = typeof input.secondGuestId === 'string' ? input.secondGuestId : '';
    if (!UUID.test(firstGuestId) || !UUID.test(secondGuestId) || firstGuestId === secondGuestId) return null;
    return { firstGuestId, secondGuestId };
}

export async function createGuestMergeResponse({
    session,
    input,
    merge,
}: {
    session: MergeSession;
    input: MergeInput;
    merge: (keepGuestId: string, duplicateGuestId: string) => Promise<unknown>;
}) {
    if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!MERGE_ROLES.has(session.user.role || '')) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const keepGuestId = typeof input.keepGuestId === 'string' ? input.keepGuestId : '';
    const duplicateGuestId = typeof input.duplicateGuestId === 'string' ? input.duplicateGuestId : '';
    if (!UUID.test(keepGuestId) || !UUID.test(duplicateGuestId) || keepGuestId === duplicateGuestId) {
        return Response.json({ error: 'Choose two different valid guest profiles' }, { status: 422 });
    }

    try {
        return Response.json(await merge(keepGuestId, duplicateGuestId), {
            headers: { 'Cache-Control': 'private, no-store' },
        });
    } catch (error) {
        console.error('[guest merge] failed', error);
        const message = error instanceof Error ? error.message : 'Unable to merge guest profiles';
        return Response.json({ error: message }, { status: 409 });
    }
}

export async function createGuestDuplicateCandidatesResponse({
    session,
    load,
}: {
    session: MergeSession;
    load: () => Promise<unknown>;
}) {
    if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!MERGE_ROLES.has(session.user.role || '')) return Response.json({ error: 'Forbidden' }, { status: 403 });
    try {
        return Response.json(await load(), { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        console.error('[duplicate candidates] load failed', error);
        return Response.json({ error: 'Unable to load duplicate candidates' }, { status: 503 });
    }
}

export async function createGuestDuplicateDismissalResponse({
    session,
    input,
    dismiss,
}: {
    session: MergeSession;
    input: DuplicatePairInput;
    dismiss: (firstGuestId: string, secondGuestId: string) => Promise<unknown>;
}) {
    if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!MERGE_ROLES.has(session.user.role || '')) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const pair = validPair(input);
    if (!pair) return Response.json({ error: 'Choose two different valid guest profiles' }, { status: 422 });
    try {
        await dismiss(pair.firstGuestId, pair.secondGuestId);
        return new Response(null, { status: 204 });
    } catch (error) {
        console.error('[duplicate candidate] dismissal failed', error);
        return Response.json({ error: 'Unable to save duplicate review' }, { status: 503 });
    }
}
