import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const getSnapshot = vi.fn();

vi.mock('@/lib/checkin/server', () => ({
    getCheckInRepository: () => ({ getSnapshot }),
}));
vi.mock('@/lib/utils/date', () => ({ todayPacificDateString: () => '2026-07-19' }));
vi.mock('@/components/checkin/CheckInClient', () => ({
    default: ({ initialSnapshot }: { initialSnapshot?: { directoryVersion: string } }) => (
        <div>{initialSnapshot?.directoryVersion ?? 'legacy fallback'}</div>
    ),
}));

import CheckInPage from '../page';

describe('check-in server page', () => {
    it('starts the snapshot query during server rendering', async () => {
        getSnapshot.mockResolvedValue({ directoryVersion: 'directory-v2' });

        render(await CheckInPage());

        expect(getSnapshot).toHaveBeenCalledWith('2026-07-19');
        expect(screen.getByText('directory-v2')).toBeDefined();
    });

    it('keeps the legacy loader as a rollout fallback', async () => {
        getSnapshot.mockRejectedValueOnce(new Error('RPC unavailable'));

        render(await CheckInPage());

        expect(screen.getByText('legacy fallback')).toBeDefined();
    });
});
