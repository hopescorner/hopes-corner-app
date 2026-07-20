import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    subscribeToTable,
    subscribeToTables,
    unsubscribeFromAll,
    getActiveSubscriptionCount,
    hasActiveSubscription,
} from '../realtime';

// Mock the Supabase client
const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
};

const mockRemoveChannel = vi.fn();
const mockCreateChannel = vi.fn(() => mockChannel);

vi.mock('../client', () => ({
    createClient: vi.fn(() => ({
        channel: mockCreateChannel,
        removeChannel: mockRemoveChannel,
    })),
}));

describe('Supabase Realtime Utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear all subscriptions before each test
        unsubscribeFromAll();
    });

    afterEach(() => {
        unsubscribeFromAll();
    });

    describe('subscribeToTable', () => {
        it('creates a subscription to a table', () => {
            const onChange = vi.fn();
            subscribeToTable({
                table: 'shower_reservations',
                onChange,
            });

            expect(mockChannel.on).toHaveBeenCalled();
            expect(mockChannel.subscribe).toHaveBeenCalled();
        });

        it('returns an unsubscribe function', () => {
            const unsub = subscribeToTable({
                table: 'shower_reservations',
                onChange: vi.fn(),
            });

            expect(typeof unsub).toBe('function');
        });

        it('reuses existing channel for same table', () => {
            const onChange1 = vi.fn();
            const onChange2 = vi.fn();

            subscribeToTable({ table: 'shower_reservations', onChange: onChange1 });
            const callCount1 = mockChannel.subscribe.mock.calls.length;

            subscribeToTable({ table: 'shower_reservations', onChange: onChange2 });
            const callCount2 = mockChannel.subscribe.mock.calls.length;

            // Should not create a new subscription for the same table
            expect(callCount2).toBe(callCount1);
        });

        it('creates separate channels for different tables', () => {
            subscribeToTable({ table: 'shower_reservations', onChange: vi.fn() });
            subscribeToTable({ table: 'laundry_bookings', onChange: vi.fn() });

            expect(getActiveSubscriptionCount()).toBe(2);
        });

        it('calls onChange callback with correct payload structure', () => {
            // Capture the callback passed to .on()
            let capturedCallback: any;
            mockChannel.on.mockImplementation((_event: string, _config: any, callback: any) => {
                capturedCallback = callback;
                return mockChannel;
            });

            const onChange = vi.fn();
            subscribeToTable({ table: 'shower_reservations', onChange });

            // Simulate a change event
            const mockPayload = {
                eventType: 'INSERT',
                new: { id: '123', guest_id: 'g1' },
                old: null,
            };
            capturedCallback(mockPayload);

            expect(onChange).toHaveBeenCalledWith(mockPayload);
        });

        it('calls specific event handlers', () => {
            let capturedCallback: any;
            mockChannel.on.mockImplementation((_event: string, _config: any, callback: any) => {
                capturedCallback = callback;
                return mockChannel;
            });

            const onInsert = vi.fn();
            const onUpdate = vi.fn();
            const onDelete = vi.fn();

            subscribeToTable({
                table: 'shower_reservations',
                onInsert,
                onUpdate,
                onDelete,
            });

            // Test INSERT
            capturedCallback({ eventType: 'INSERT', new: { id: '1' } });
            expect(onInsert).toHaveBeenCalled();
            expect(onUpdate).not.toHaveBeenCalled();
            expect(onDelete).not.toHaveBeenCalled();

            vi.clearAllMocks();

            // Test UPDATE
            capturedCallback({ eventType: 'UPDATE', new: { id: '1' }, old: { id: '1' } });
            expect(onUpdate).toHaveBeenCalled();
            expect(onInsert).not.toHaveBeenCalled();

            vi.clearAllMocks();

            // Test DELETE
            capturedCallback({ eventType: 'DELETE', old: { id: '1' } });
            expect(onDelete).toHaveBeenCalled();
            expect(onInsert).not.toHaveBeenCalled();
        });
    });

    describe('subscribeToTables', () => {
        it('registers many table handlers on one websocket channel', () => {
            subscribeToTables([
                { table: 'shower_reservations', onChange: vi.fn() },
                { table: 'laundry_bookings', onChange: vi.fn() },
                { table: 'meal_attendance', onChange: vi.fn() },
            ]);

            expect(mockCreateChannel).toHaveBeenCalledTimes(1);
            expect(mockChannel.on).toHaveBeenCalledTimes(3);
            expect(mockChannel.subscribe).toHaveBeenCalledTimes(1);
            expect(getActiveSubscriptionCount()).toBe(1);
        });
    });

    describe('unsubscribeFromAll', () => {
        it('removes all active subscriptions', () => {
            subscribeToTable({ table: 'shower_reservations', onChange: vi.fn() });
            subscribeToTable({ table: 'laundry_bookings', onChange: vi.fn() });
            subscribeToTable({ table: 'meal_attendance', onChange: vi.fn() });

            expect(getActiveSubscriptionCount()).toBe(3);

            unsubscribeFromAll();

            expect(getActiveSubscriptionCount()).toBe(0);
            expect(mockRemoveChannel).toHaveBeenCalledTimes(3);
        });
    });

    describe('getActiveSubscriptionCount', () => {
        it('returns 0 when no subscriptions', () => {
            expect(getActiveSubscriptionCount()).toBe(0);
        });

        it('returns correct count after subscribing', () => {
            subscribeToTable({ table: 'shower_reservations', onChange: vi.fn() });
            expect(getActiveSubscriptionCount()).toBe(1);

            subscribeToTable({ table: 'laundry_bookings', onChange: vi.fn() });
            expect(getActiveSubscriptionCount()).toBe(2);
        });
    });

    describe('hasActiveSubscription', () => {
        it('returns false when no subscriptions', () => {
            expect(hasActiveSubscription('shower_reservations')).toBe(false);
        });

        it('returns true when table has subscription', () => {
            subscribeToTable({ table: 'shower_reservations', onChange: vi.fn() });
            expect(hasActiveSubscription('shower_reservations')).toBe(true);
        });

        it('returns false for unsubscribed table', () => {
            subscribeToTable({ table: 'shower_reservations', onChange: vi.fn() });
            expect(hasActiveSubscription('laundry_bookings')).toBe(false);
        });
    });

    describe('unsubscribe function', () => {
        it('removes specific subscription when called', () => {
            const unsub = subscribeToTable({ table: 'shower_reservations', onChange: vi.fn() });
            subscribeToTable({ table: 'laundry_bookings', onChange: vi.fn() });

            expect(getActiveSubscriptionCount()).toBe(2);

            unsub();

            expect(getActiveSubscriptionCount()).toBe(1);
            expect(hasActiveSubscription('shower_reservations')).toBe(false);
            expect(hasActiveSubscription('laundry_bookings')).toBe(true);
        });
    });
});

describe('Realtime Table Configurations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        unsubscribeFromAll();
    });

    afterEach(() => {
        unsubscribeFromAll();
    });

    it('supports all critical tables', () => {
        const tables = [
            'shower_reservations',
            'laundry_bookings',
            'meal_attendance',
            'bicycle_repairs',
            'guests',
            'guest_warnings',
            'guest_proxies',
        ] as const;

        tables.forEach((table) => {
            subscribeToTable({ table, onChange: vi.fn() });
        });

        expect(getActiveSubscriptionCount()).toBe(tables.length);
    });

    it('can filter subscriptions', () => {
        subscribeToTable({
            table: 'shower_reservations',
            filter: 'scheduled_for=eq.2026-01-22',
            onChange: vi.fn(),
        });

        expect(mockChannel.on).toHaveBeenCalledWith(
            'postgres_changes',
            expect.objectContaining({
                filter: 'scheduled_for=eq.2026-01-22',
            }),
            expect.any(Function)
        );
    });
});
