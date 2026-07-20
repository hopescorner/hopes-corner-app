import { describe, expect, it, vi } from 'vitest';
import { createGuestContextResponse, createSnapshotResponse } from '@/lib/checkin/api';

describe('createSnapshotResponse', () => {
    it('rejects unauthenticated requests', async () => {
        const response = await createSnapshotResponse({
            session: null,
            serviceDate: '2026-07-19',
            loadSnapshot: vi.fn(),
        });

        expect(response.status).toBe(401);
    });

    it('rejects malformed service dates without querying the database', async () => {
        const loadSnapshot = vi.fn();
        const response = await createSnapshotResponse({
            session: { user: { role: 'checkin' } },
            serviceDate: '07/19/2026',
            loadSnapshot,
        });

        expect(response.status).toBe(422);
        expect(loadSnapshot).not.toHaveBeenCalled();
    });

    it('returns an authenticated no-store snapshot response', async () => {
        const response = await createSnapshotResponse({
            session: { user: { role: 'staff' } },
            serviceDate: '2026-07-19',
            loadSnapshot: vi.fn().mockResolvedValue({ directoryVersion: 'v1' }),
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('cache-control')).toBe('private, no-store');
        await expect(response.json()).resolves.toEqual({ directoryVersion: 'v1' });
    });
});

describe('createGuestContextResponse', () => {
    it('validates the guest UUID before loading private details', async () => {
        const loadContext = vi.fn();
        const response = await createGuestContextResponse({
            session: { user: { role: 'checkin' } },
            guestId: 'not-a-uuid',
            loadContext,
        });

        expect(response.status).toBe(422);
        expect(loadContext).not.toHaveBeenCalled();
    });

    it('returns private details only to an authenticated check-in role', async () => {
        const response = await createGuestContextResponse({
            session: { user: { role: 'staff' } },
            guestId: '11111111-1111-4111-8111-111111111111',
            loadContext: vi.fn().mockResolvedValue({ guest: { id: 'guest-1' } }),
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('cache-control')).toBe('private, no-store');
    });
});
