import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWaiverStore, clearWaiverStoreCache } from '../useWaiverStore';

// Mock Supabase client
const mockRpc = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        rpc: mockRpc,
    }),
}));

describe('useWaiverStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearWaiverStoreCache();
        mockRpc.mockImplementation((fn: string, args: any) => {
            if (fn === 'guest_needs_waiver_reminder') {
                return Promise.resolve({ data: args.p_guest_id === 'needs-remind', error: null });
            }
            if (fn === 'has_active_waiver') {
                return Promise.resolve({ data: args.p_guest_id === 'has-waiver', error: null });
            }
            if (fn === 'dismiss_waiver') {
                return Promise.resolve({ data: true, error: null });
            }
            return Promise.resolve({ data: null, error: null });
        });
    });

    it('initializes with default version', () => {
        const state = useWaiverStore.getState();
        expect(state.waiverVersion).toBe(0);
    });

    describe('guestNeedsWaiverReminder', () => {
        it('returns true when guest needs reminder', async () => {
            const { guestNeedsWaiverReminder } = useWaiverStore.getState();
            const needs = await guestNeedsWaiverReminder('needs-remind', 'shower');
            expect(needs).toBe(true);
        });

        it('returns false when guest does not need reminder', async () => {
            const { guestNeedsWaiverReminder } = useWaiverStore.getState();
            const noNeeds = await guestNeedsWaiverReminder('safe-guest', 'shower');
            expect(noNeeds).toBe(false);
        });

        it('returns false when guestId is empty', async () => {
            const { guestNeedsWaiverReminder } = useWaiverStore.getState();
            const result = await guestNeedsWaiverReminder('', 'shower');
            expect(result).toBe(false);
            expect(mockRpc).not.toHaveBeenCalled();
        });

        it('returns false when serviceType is empty', async () => {
            const { guestNeedsWaiverReminder } = useWaiverStore.getState();
            const result = await guestNeedsWaiverReminder('guest-1', '' as any);
            expect(result).toBe(false);
            expect(mockRpc).not.toHaveBeenCalled();
        });

        it('returns false on RPC error', async () => {
            mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC failed' } });

            const { guestNeedsWaiverReminder } = useWaiverStore.getState();
            const result = await guestNeedsWaiverReminder('guest-1', 'shower');
            expect(result).toBe(false);
        });

        it('returns false on exception', async () => {
            mockRpc.mockRejectedValueOnce(new Error('Network error'));

            const { guestNeedsWaiverReminder } = useWaiverStore.getState();
            const result = await guestNeedsWaiverReminder('guest-1', 'shower');
            expect(result).toBe(false);
        });
    });

    describe('hasActiveWaiver', () => {
        it('returns true when guest has active waiver', async () => {
            const { hasActiveWaiver } = useWaiverStore.getState();
            const has = await hasActiveWaiver('has-waiver', 'bicycle');
            expect(has).toBe(true);
        });

        it('returns false when guest does not have active waiver', async () => {
            const { hasActiveWaiver } = useWaiverStore.getState();
            const notHas = await hasActiveWaiver('no-waiver', 'bicycle');
            expect(notHas).toBe(false);
        });

        it('returns false when guestId is empty', async () => {
            const { hasActiveWaiver } = useWaiverStore.getState();
            const result = await hasActiveWaiver('', 'shower');
            expect(result).toBe(false);
            expect(mockRpc).not.toHaveBeenCalled();
        });

        it('returns false when serviceType is empty', async () => {
            const { hasActiveWaiver } = useWaiverStore.getState();
            const result = await hasActiveWaiver('guest-1', '' as any);
            expect(result).toBe(false);
            expect(mockRpc).not.toHaveBeenCalled();
        });

        it('returns false on RPC error', async () => {
            mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC failed' } });

            const { hasActiveWaiver } = useWaiverStore.getState();
            const result = await hasActiveWaiver('guest-1', 'laundry');
            expect(result).toBe(false);
        });

        it('returns false on exception', async () => {
            mockRpc.mockRejectedValueOnce(new Error('Network error'));

            const { hasActiveWaiver } = useWaiverStore.getState();
            const result = await hasActiveWaiver('guest-1', 'bicycle');
            expect(result).toBe(false);
        });
    });

    describe('dismissWaiver', () => {
        it('dismisses waiver and increments version', async () => {
            const { dismissWaiver, waiverVersion } = useWaiverStore.getState();
            const initialVersion = waiverVersion;

            const success = await dismissWaiver('g1', 'shower', 'test-reason');
            expect(success).toBe(true);
            expect(useWaiverStore.getState().waiverVersion).toBe(initialVersion + 1);
        });

        it('dismisses waiver with default reason', async () => {
            const { dismissWaiver } = useWaiverStore.getState();
            const success = await dismissWaiver('g1', 'shower');
            expect(success).toBe(true);
            expect(mockRpc).toHaveBeenCalledWith('dismiss_waiver', {
                p_guest_id: 'g1',
                p_service_type: 'shower',
                p_dismissed_reason: 'signed_by_staff',
            });
        });

        it('returns false when guestId is empty', async () => {
            const { dismissWaiver } = useWaiverStore.getState();
            const result = await dismissWaiver('', 'shower');
            expect(result).toBe(false);
            expect(mockRpc).not.toHaveBeenCalled();
        });

        it('returns false when serviceType is empty', async () => {
            const { dismissWaiver } = useWaiverStore.getState();
            const result = await dismissWaiver('guest-1', '' as any);
            expect(result).toBe(false);
            expect(mockRpc).not.toHaveBeenCalled();
        });

        it('returns false on RPC error', async () => {
            mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC failed' } });

            const { dismissWaiver } = useWaiverStore.getState();
            const result = await dismissWaiver('guest-1', 'laundry');
            expect(result).toBe(false);
        });

        it('returns false on exception', async () => {
            mockRpc.mockRejectedValueOnce(new Error('Network error'));

            const { dismissWaiver } = useWaiverStore.getState();
            const result = await dismissWaiver('guest-1', 'bicycle');
            expect(result).toBe(false);
        });
    });

    describe('incrementWaiverVersion', () => {
        it('increments waiver version manually', () => {
            const { incrementWaiverVersion, waiverVersion } = useWaiverStore.getState();
            const initialVersion = waiverVersion;
            incrementWaiverVersion();
            expect(useWaiverStore.getState().waiverVersion).toBe(initialVersion + 1);
        });

        it('increments multiple times', () => {
            const initialVersion = useWaiverStore.getState().waiverVersion;
            useWaiverStore.getState().incrementWaiverVersion();
            useWaiverStore.getState().incrementWaiverVersion();
            useWaiverStore.getState().incrementWaiverVersion();
            expect(useWaiverStore.getState().waiverVersion).toBe(initialVersion + 3);
        });
    });

    describe('caching behavior', () => {
        it('caches guestNeedsWaiverReminder to avoid repeated RPC calls', async () => {
            const { guestNeedsWaiverReminder } = useWaiverStore.getState();
            const first = await guestNeedsWaiverReminder('needs-remind', 'shower');
            expect(first).toBe(true);
            expect(mockRpc).toHaveBeenCalledTimes(1);

            const second = await guestNeedsWaiverReminder('needs-remind', 'shower');
            expect(second).toBe(true);
            expect(mockRpc).toHaveBeenCalledTimes(1); // No new network call
        });

        it('caches hasActiveWaiver to avoid repeated RPC calls', async () => {
            const { hasActiveWaiver } = useWaiverStore.getState();
            const first = await hasActiveWaiver('has-waiver', 'bicycle');
            expect(first).toBe(true);
            expect(mockRpc).toHaveBeenCalledTimes(1);

            const second = await hasActiveWaiver('has-waiver', 'bicycle');
            expect(second).toBe(true);
            expect(mockRpc).toHaveBeenCalledTimes(1); // No new network call
        });

        it('invalidates cache when waiver is dismissed', async () => {
            const { guestNeedsWaiverReminder, dismissWaiver } = useWaiverStore.getState();
            await guestNeedsWaiverReminder('needs-remind', 'shower');
            expect(mockRpc).toHaveBeenCalledTimes(1);

            await dismissWaiver('needs-remind', 'shower');

            // Cache was cleared for this key on dismiss
            const after = await guestNeedsWaiverReminder('needs-remind', 'shower');
            expect(mockRpc).toHaveBeenCalledTimes(3); // 1 initial + 1 dismiss + 1 refetch
        });
    });
});
