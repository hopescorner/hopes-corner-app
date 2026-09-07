import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMealsStore } from '../useMealsStore';
import { useActionHistoryStore } from '../useActionHistoryStore';
import { useSettingsStore } from '../useSettingsStore';
import { mapMealRow } from '@/lib/utils/mappers';

interface Row {
    id: string;
    guest_id: string;
    meal_type: string;
    quantity: number;
    served_on: string;
    picked_up_by_guest_id?: string | null;
    deduplication_key?: string | null;
}

// Model the external database boundary; meal creation, mapping, and undo use
// the real stores. Returning deleted rows also models snapshot-only check-ins.
const db = vi.hoisted(() => ({ rows: [] as Row[], failDelete: false }));
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
                    if (db.failDelete) return { data: null, error: { message: 'Delete failed' } };
                    db.rows = db.rows.filter((row) => !matches.includes(row));
                } else if (operation === 'insert') {
                    if (payload.deduplication_key && db.rows.some((row) => row.deduplication_key === payload.deduplication_key)) {
                        return { data: null, error: { code: '23505', message: 'Duplicate bag' } };
                    }
                    const row = { id: `row-${db.rows.length}`, meal_type: 'guest', ...payload } as Row;
                    db.rows.push(row);
                    return { data: [row], error: null };
                }
                return { data: matches, error: null };
            };
            const query = {
                select: () => query,
                insert: (value: Partial<Row>) => { operation = 'insert'; payload = value; return query; },
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
const meal = (guest: string, extra = false, picker?: string): Row => ({
    id: `meal-${guest}`, guest_id: guest, meal_type: extra ? 'extra' : 'guest',
    quantity: 1, served_on: date, picked_up_by_guest_id: picker,
});
const bag = (guest: string): Row => ({
    id: `bag-${guest}`, guest_id: guest, meal_type: 'lunch_bag', quantity: 1,
    served_on: date, deduplication_key: `lunch_bag_auto_${guest}_${date}`,
});
const undo = async (row: Row) => {
    useActionHistoryStore.getState().addAction(row.meal_type === 'extra' ? 'EXTRA_MEALS_ADDED' : 'MEAL_ADDED', {
        recordId: row.id, guestId: row.guest_id,
    });
    return useActionHistoryStore.getState().undoAction(useActionHistoryStore.getState().actionHistory[0].id);
};

beforeEach(() => {
    db.rows = [];
    db.failDelete = false;
    useMealsStore.setState({ mealRecords: [], extraMealRecords: [], lunchBagRecords: [] });
    useActionHistoryStore.getState().clearHistory();
    useSettingsStore.setState({ autoMealAdditionsEnabled: true, hasLoadedSettings: true });
});

describe('meal undo with automatic lunch bags', () => {
    it.each([false, true])('retracts a snapshot-only meal and bag (extra: %s)', async (extra) => {
        const row = meal('guest', extra);
        db.rows = [row, bag('guest')];
        expect(await undo(row)).toBe(true);
        expect(db.rows).toEqual([]);
    });

    it('preserves manual bags for the same guest in the database and local totals', async () => {
        const row = meal('guest');
        const manual = { ...bag('guest'), id: 'manual', deduplication_key: null };
        db.rows = [row, bag('guest'), manual];
        useMealsStore.setState({ mealRecords: [mapMealRow(row)], lunchBagRecords: [mapMealRow(bag('guest')), mapMealRow(manual)] });
        expect(await undo(row)).toBe(true);
        expect(db.rows).toEqual([manual]);
        expect(useMealsStore.getState().lunchBagRecords.map((record) => record.id)).toEqual(['manual']);
    });

    it('removes cached automatic bags saved by older app versions without a deduplication key', async () => {
        const row = meal('guest');
        db.rows = [row, bag('guest')];
        useMealsStore.setState({ lunchBagRecords: [{ ...mapMealRow(bag('guest')), deduplicationKey: undefined }] });
        expect(await undo(row)).toBe(true);
        expect(db.rows).toEqual([]);
        expect(useMealsStore.getState().lunchBagRecords).toEqual([]);
    });

    it.each([1, 2])('undoes primary and linked meals added together (%s each) and removes both bags', async (quantity) => {
        const primary = await useMealsStore.getState().addMealRecord('primary', quantity, null, date);
        const linked = await useMealsStore.getState().addMealRecord('linked', quantity, 'primary', date);
        expect(db.rows.filter((row) => row.meal_type === 'lunch_bag').map((row) => row.guest_id).sort()).toEqual(['linked', 'primary']);
        expect(db.rows.filter((row) => row.meal_type === 'guest').map((row) => row.quantity)).toEqual([quantity, quantity]);
        expect(await undo(db.rows.find((row) => row.id === primary.id)!)).toBe(true);
        // The primary is still entitled while their linked pickup remains.
        expect(db.rows.filter((row) => row.meal_type === 'lunch_bag')).toHaveLength(2);
        expect(await undo(db.rows.find((row) => row.id === linked.id)!)).toBe(true);
        expect(db.rows).toEqual([]);
        expect(useMealsStore.getState().lunchBagRecords).toEqual([]);
    });

    it('keeps the primary bag when only the linked meal is undone', async () => {
        const primary = meal('primary');
        const linked = meal('linked', false, 'primary');
        db.rows = [primary, linked, bag('primary'), bag('linked')];
        expect(await undo(linked)).toBe(true);
        expect(db.rows).toEqual([primary, bag('primary')]);
    });

    it('keeps the bag while an extra meal remains and removes it on the last undo', async () => {
        const base = meal('guest');
        const extra = { ...meal('guest', true), id: 'extra' };
        db.rows = [base, extra, bag('guest')];
        expect(await undo(base)).toBe(true);
        expect(db.rows).toEqual([extra, bag('guest')]);
        expect(await undo(extra)).toBe(true);
        expect(db.rows).toEqual([]);
    });

    it('retains the meal, bag, and undo action when the database refuses the meal delete', async () => {
        const row = meal('guest');
        db.rows = [row, bag('guest')];
        useMealsStore.setState({ mealRecords: [mapMealRow(row)] });
        db.failDelete = true;
        const log = vi.spyOn(console, 'error').mockImplementation(() => {});
        try {
            expect(await undo(row)).toBe(false);
            expect(db.rows).toEqual([row, bag('guest')]);
            expect(useMealsStore.getState().mealRecords).toHaveLength(1);
            expect(useActionHistoryStore.getState().actionHistory).toHaveLength(1);
        } finally {
            log.mockRestore();
        }
    });
});
