import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';

/**
 * Integration tests for the Services page data loading.
 *
 * Unlike the smoke tests, these use the REAL zustand stores and only mock
 * Supabase at the client edge. This covers the wiring between the page's
 * tab-loading effect and the stores — the seam where a v0.6.0 regression
 * built the list of loaders but never invoked them, leaving the whole
 * Service Center empty (see CHANGELOG 0.6.6).
 */

// Mock next/dynamic so heavy tab sections render as placeholders; the
// data-loading effect under test lives on the page component itself.
vi.mock('next/dynamic', () => ({
    default: (_loader: unknown, options?: { loading?: React.ComponentType }) => {
        const MockDynamicComponent = () => {
            const Loading = options?.loading;
            return Loading ? <Loading /> : null;
        };
        return MockDynamicComponent;
    },
}));

const searchParamsRef = { current: new URLSearchParams() };
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    usePathname: () => '/services',
    useSearchParams: () => searchParamsRef.current,
}));

vi.mock('next-auth/react', () => ({
    useSession: () => ({ data: { user: { role: 'admin', name: 'Staff' } }, status: 'authenticated' }),
    SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Universal chainable query builder: every filter/modifier returns itself and
// awaiting it resolves with the rows registered for its table.
const tableRows: Record<string, any[]> = {};
const queriedTables: string[] = [];

const makeBuilder = (table: string) => {
    const result = { data: tableRows[table] ?? [], error: null, count: (tableRows[table] ?? []).length };
    const builder: any = {
        then: (resolve: (value: typeof result) => unknown, reject?: (reason?: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject),
    };
    for (const method of [
        'select', 'order', 'range', 'limit', 'single', 'maybeSingle',
        'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is', 'not', 'or', 'ilike', 'like',
        'insert', 'update', 'delete', 'upsert', 'overlaps', 'contains', 'textSearch',
    ]) {
        builder[method] = vi.fn(() => builder);
    }
    return builder;
};

vi.mock('@/lib/supabase/client', () => ({
    createClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
            queriedTables.push(table);
            return makeBuilder(table);
        }),
        rpc: vi.fn(() => makeBuilder('__rpc__')),
        channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
        removeChannel: vi.fn(),
        auth: { getSession: vi.fn(async () => ({ data: { session: null }, error: null })) },
    })),
}));

import ServicesPage from '../services/page';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { useRemindersStore } from '@/stores/useRemindersStore';
import { todayPacificDateString } from '@/lib/utils/date';

const originalLoaders = {
    services: useServicesStore.getState().ensureLoaded,
    guests: useGuestsStore.getState().ensureLoaded,
    meals: useMealsStore.getState().ensureLoaded,
    reminders: useRemindersStore.getState().ensureLoaded,
};

beforeEach(() => {
    queriedTables.length = 0;
    for (const key of Object.keys(tableRows)) delete tableRows[key];
    searchParamsRef.current = new URLSearchParams();
    useServicesStore.setState({
        isLoaded: false,
        isLoading: false,
        showerRecords: [],
        laundryRecords: [],
        bicycleRecords: [],
    } as any);
});

afterEach(() => {
    useServicesStore.setState({ ensureLoaded: originalLoaders.services } as any);
    useGuestsStore.setState({ ensureLoaded: originalLoaders.guests } as any);
    useMealsStore.setState({ ensureLoaded: originalLoaders.meals } as any);
    useRemindersStore.setState({ ensureLoaded: originalLoaders.reminders } as any);
});

describe('ServicesPage data loading (integration, real stores)', () => {
    it('loads laundry bookings from Supabase into the store when the page mounts', async () => {
        const today = todayPacificDateString();
        tableRows['laundry_bookings'] = [
            {
                id: 'laundry-1',
                guest_id: 'guest-1',
                scheduled_for: today,
                slot_label: '08:30 - 09:45',
                laundry_type: 'onsite',
                bag_number: '11',
                status: 'waiting',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        ];

        render(<ServicesPage />);

        // The page must fetch on its own — without any other page having
        // populated the stores first.
        await waitFor(() => {
            expect(queriedTables).toContain('laundry_bookings');
            const { laundryRecords } = useServicesStore.getState();
            expect(laundryRecords).toHaveLength(1);
            expect((laundryRecords[0] as any).bagNumber).toBe('11');
        });
    });

    it('invokes the loaders for every dataset the overview tab needs', async () => {
        const spies = {
            services: vi.fn(async () => {}),
            guests: vi.fn(async () => {}),
            meals: vi.fn(async () => {}),
        };
        useServicesStore.setState({ ensureLoaded: spies.services } as any);
        useGuestsStore.setState({ ensureLoaded: spies.guests } as any);
        useMealsStore.setState({ ensureLoaded: spies.meals } as any);

        render(<ServicesPage />);

        await waitFor(() => {
            expect(spies.services).toHaveBeenCalled();
            expect(spies.guests).toHaveBeenCalled();
            expect(spies.meals).toHaveBeenCalled();
        });
    });

    it('invokes the loaders for the laundry tab', async () => {
        searchParamsRef.current = new URLSearchParams('tab=laundry');
        const spies = {
            services: vi.fn(async () => {}),
            guests: vi.fn(async () => {}),
            reminders: vi.fn(async () => {}),
        };
        useServicesStore.setState({ ensureLoaded: spies.services } as any);
        useGuestsStore.setState({ ensureLoaded: spies.guests } as any);
        useRemindersStore.setState({ ensureLoaded: spies.reminders } as any);

        render(<ServicesPage />);

        await waitFor(() => {
            expect(spies.services).toHaveBeenCalled();
            expect(spies.guests).toHaveBeenCalled();
            expect(spies.reminders).toHaveBeenCalled();
        });
    });
});
