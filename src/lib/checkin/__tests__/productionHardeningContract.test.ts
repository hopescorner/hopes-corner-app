import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATION = '20260910000000_production_hardening.sql';

function readMigration() {
    return readFileSync(resolve(process.cwd(), 'supabase/migrations', MIGRATION), 'utf8');
}

describe('production hardening migration (Critical 1-7)', () => {
    it('exists and is picked up with the other migrations', () => {
        const names = readdirSync(resolve(process.cwd(), 'supabase/migrations'));
        expect(names).toContain(MIGRATION);
    });

    it('canonicalizes laundry slot capacity to 1 guest per slot (C2)', () => {
        const sql = readMigration();
        expect(sql).toContain('function public.check_laundry_slot_capacity()');
        expect(sql).toContain('max_per_slot constant integer := 1');
        // The occupying set must match the app constant (waiting, washer, dryer, done, picked_up)
        expect(sql).toContain(`'waiting', 'washer', 'dryer', 'done', 'picked_up'`);
        expect(sql).toContain(`hashtextextended('laundry_slot:'`);
    });

    it('enforces blocked slots server-side for showers and laundry (C1)', () => {
        const sql = readMigration();
        // Shower RPC rejects blocked slots with a machine-readable sentinel
        expect(sql).toContain('SLOT_BLOCKED');
        expect(sql).toContain('blocked_slots');
        // Laundry gets a dedicated trigger so direct inserts cannot bypass blocks
        expect(sql).toContain('function public.check_laundry_blocked_slot()');
        expect(sql).toContain('trg_laundry_blocked_slot');
        expect(sql).toContain('function public.check_shower_blocked_slot()');
        expect(sql).toContain('trg_shower_blocked_slot');
    });

    it('exempts terminal status transitions from the ban guard (C3)', () => {
        const sql = readMigration();
        expect(sql).toContain('function public.ensure_guest_not_banned()');
        expect(sql).toContain(`'cancelled', 'no_show'`);
    });

    it('records the proxy picker and grants the picker a lunch bag (C4)', () => {
        const sql = readMigration();
        expect(sql).toContain('function public.execute_checkin_meal_command(');
        expect(sql).toContain('p_picked_up_by_guest_id');
        expect(sql).toContain('picked_up_by_guest_id');
    });
});
