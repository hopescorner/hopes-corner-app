import { describe, expect, it, vi } from 'vitest';
import {
    createGuestDuplicateCandidatesResponse,
    createGuestDuplicateDismissalResponse,
    createGuestMergeResponse,
} from '@/lib/checkin/guestMerge';

const KEEP_ID = '11111111-1111-4111-8111-111111111111';
const DUPLICATE_ID = '22222222-2222-4222-8222-222222222222';

describe('createGuestMergeResponse', () => {
    it('rejects roles that cannot consolidate guest identities', async () => {
        const merge = vi.fn();
        const response = await createGuestMergeResponse({
            session: { user: { role: 'bicycle' } },
            input: { keepGuestId: KEEP_ID, duplicateGuestId: DUPLICATE_ID },
            merge,
        });

        expect(response.status).toBe(403);
        expect(merge).not.toHaveBeenCalled();
    });

    it('rejects deleting the same profile that was selected to survive', async () => {
        const merge = vi.fn();
        const response = await createGuestMergeResponse({
            session: { user: { role: 'checkin' } },
            input: { keepGuestId: KEEP_ID, duplicateGuestId: KEEP_ID },
            merge,
        });

        expect(response.status).toBe(422);
        expect(merge).not.toHaveBeenCalled();
    });

    it('merges an explicitly selected duplicate for an authorized check-in user', async () => {
        const merge = vi.fn().mockResolvedValue({
            keptGuestId: KEEP_ID,
            deletedGuestId: DUPLICATE_ID,
            transferredRecords: 12,
        });
        const response = await createGuestMergeResponse({
            session: { user: { role: 'checkin' } },
            input: { keepGuestId: KEEP_ID, duplicateGuestId: DUPLICATE_ID },
            merge,
        });

        expect(response.status).toBe(200);
        expect(merge).toHaveBeenCalledWith(KEEP_ID, DUPLICATE_ID);
        await expect(response.json()).resolves.toEqual({
            keptGuestId: KEEP_ID,
            deletedGuestId: DUPLICATE_ID,
            transferredRecords: 12,
        });
    });
});

describe('duplicate candidate review responses', () => {
    it('returns unresolved candidates to an authorized user', async () => {
        const response = await createGuestDuplicateCandidatesResponse({
            session: { user: { role: 'staff' } },
            load: vi.fn().mockResolvedValue([{ firstGuestId: KEEP_ID, secondGuestId: DUPLICATE_ID }]),
        });

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual([{ firstGuestId: KEEP_ID, secondGuestId: DUPLICATE_ID }]);
    });

    it('durably dismisses a reviewed pair without merging either profile', async () => {
        const dismiss = vi.fn().mockResolvedValue(undefined);
        const response = await createGuestDuplicateDismissalResponse({
            session: { user: { role: 'checkin' } },
            input: { firstGuestId: KEEP_ID, secondGuestId: DUPLICATE_ID },
            dismiss,
        });

        expect(response.status).toBe(204);
        expect(dismiss).toHaveBeenCalledWith(KEEP_ID, DUPLICATE_ID);
    });
});
