import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMealsStore } from '../useMealsStore';
import { useActionHistoryStore } from '../useActionHistoryStore';
import { useSettingsStore } from '../useSettingsStore';

interface Row {
    id: string;
    guest_id: string;
    meal_type: string;
    quantity: number;
    served_on: string;
    picked_up_by_guest_id?: string | null;
    deduplication_key?: string | null;
}

// Fake DB with update support: the snapshot RPC reuses one guest-meal row
// per guest per day, so two taps share a recordId with quantity 2.
const db = vi.hoisted(() => ({ rows: [] as Row[] }));
vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: (table: string) => {
            if (table !== 'meal_attendance') throw new Error(`Unexpected table: ${table}`);
            let operation = 'select';
            let payload: Partial<Row> = {};
            const filters: ((row: Row) => boolean)[] = [];
            let rowLimit = Infinity;
            const execute = () => {
                const matches = db.rows.filter((row) => filters.every((filter) => filter(row))).slice(0, rowLimit);
                if (operation === 'delete') {
                    db.rows = db.rows.filter((row) => !matches.includes(row));
                } else if (operation === 'update') {
                    for (const row of matches) Object.assign(row, payload);
                }
                return { data: matches, error: null };
            };
            const query = {
                select: () => query,
                update: (value: Partial<Row>) => { operation = 'update'; payload = value; return query; },
                delete: () => { operation = 'delete'; return query; },
                eq: (key: keyof Row, value: unknown) => { filters.push((row) => row[key] === value); return query; },
                in: (key: keyof Row, values: unknown[]) => { filters.push((row) => values.includes(row[key])); return query; },
                or: (expression: string) => {
                    const clauses = expression.split(',').map((clause) => clause.split('.eq.'));
                    filters.push((row) => clauses.some(([key, value]) => row[key as keyof Row] === value));
                    return query;
                },
                limit: (value: number) => { rowLimit = value; return query; },
                maybeSingle: async () => { const result = execute(); return { ...result, data: result.data?.[0] ?? null }; },
                single: async () => { const result = execute(); return { ...result, data: result.data?.[0] ?? null }; },
                then: (resolve: (result: ReturnType<typeof execute>) => unknown) => Promise.resolve(execute()).then(resolve),
            };
            return query;
        },
    }),
}));

const date = '2026-09-07';

beforeEach(() => {
    db.rows = [];
    useMealsStore.setState({ mealRecords: [], extraMealRecords: [], lunchBagRecords: [] });
    useActionHistoryStore.getState().clearHistory();
    useSettingsStore.setState({ autoMealAdditionsEnabled: true, hasLoadedSettings: true });
});

describe('shared snapshot record undo (Critical C5)', () => {
    it('two taps sharing one row undo one tap at a time, bag goes with the last', async () => {
        // Two snapshot taps collapsed into one row with quantity 2 + one bag.
        db.rows = [{
            id: 'shared-1', guest_id: 'guest', meal_type: 'guest',
            quantity: 2, served_on: date,
        }, {
            id: 'bag-guest', guest_id: 'guest', meal_type: 'lunch_bag',
            quantity: 1, served_on: date, deduplication_key: `lunch_bag_auto_guest_${date}`,
        }];
        const history = useActionHistoryStore.getState();
        history.addAction('MEAL_ADDED', { recordId: 'shared-1', guestId: 'guest', count: 1 });
        history.addAction('MEAL_ADDED', { recordId: 'shared-1', guestId: 'guest', count: 1 });
        const [second, first] = useActionHistoryStore.getState().actionHistory;

        // Undoing the second tap must leave one meal and keep the bag.
        expect(await useActionHistoryStore.getState().undoAction(second.id)).toBe(true);
        expect(db.rows.find((row) => row.id === 'shared-1')?.quantity).toBe(1);
        expect(db.rows.some((row) => row.meal_type === 'lunch_bag')).toBe(true);

        // Undoing the first tap removes the last meal and retracts the bag.
        expect(await useActionHistoryStore.getState().undoAction(first.id)).toBe(true);
        expect(db.rows).toEqual([]);
    });
});
