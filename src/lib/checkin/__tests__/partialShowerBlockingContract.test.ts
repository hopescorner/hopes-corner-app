import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATION = '20261109000000_partial_shower_slot_blocking.sql';

function readMigration() {
    return readFileSync(resolve(process.cwd(), 'supabase/migrations', MIGRATION), 'utf8');
}

describe('partial shower slot blocking migration', () => {
    it('exists and is picked up with the other migrations', () => {
        expect(existsSync(resolve(process.cwd(), 'supabase/migrations', MIGRATION))).toBe(true);
        const names = readdirSync(resolve(process.cwd(), 'supabase/migrations'));
        expect(names).toContain(MIGRATION);
    });

    it('adds blocked_count and a unique slot index', () => {
        const sql = readMigration();
        expect(sql).toContain('blocked_count');
        expect(sql).toContain('uq_blocked_slots_slot');
        expect(sql).toContain('for update');
    });

    it('treats NULL blocked_count as fully blocked in book_shower_slot', () => {
        const sql = readMigration();
        expect(sql).toContain('function public.book_shower_slot(');
        expect(sql).toContain('blocked_count is null then 2');
        expect(sql).toContain('v_effective_capacity');
        expect(sql).toContain('SLOT_BLOCKED');
    });

    it('capacity trigger enforces effective (not fixed 2) capacity', () => {
        const sql = readMigration();
        expect(sql).toContain('function public.check_shower_slot_capacity()');
        expect(sql).toContain('effective_capacity');
    });

    it('blocked trigger only rejects fully blocked times', () => {
        const sql = readMigration();
        expect(sql).toContain('function public.check_shower_blocked_slot()');
        expect(sql).toContain('blocked_count is null or blocked_count >= 2');
    });

    it('schema.sql carries the same partial-capacity enforcement', () => {
        const schema = readFileSync(resolve(process.cwd(), 'database/schema.sql'), 'utf8');
        expect(schema).toContain('blocked_count integer');
        expect(schema).toContain('uq_blocked_slots_slot');
        expect(schema).toContain('v_effective_capacity');
    });
});
