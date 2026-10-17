import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Regression contract for issue #75 ("Unable to sign up guests for shower and
// laundry"): the proxy-pickup waiver in ensure_guest_not_banned() used direct
// NEW.picked_up_by_guest_id access. That function is a shared trigger on seven
// tables but only meal_attendance has that column, so every shower/laundry
// (and bicycle/haircut/holiday/items) write failed with
// 42703: record "new" has no field "picked_up_by_guest_id".
// The waiver must use to_jsonb(NEW), which yields NULL for missing keys.

const MIGRATION = '20261017000000_fix_ban_guard_proxy_field.sql';

function readSchema() {
    return readFileSync(resolve(process.cwd(), 'database/schema.sql'), 'utf8');
}

function readMigration() {
    return readFileSync(resolve(process.cwd(), 'supabase/migrations', MIGRATION), 'utf8');
}

describe('ban-guard proxy waiver is safe on tables without picked_up_by_guest_id', () => {
    it('ships a fix migration picked up with the other migrations', () => {
        const names = readdirSync(resolve(process.cwd(), 'supabase/migrations'));
        expect(names).toContain(MIGRATION);
    });

    it('uses to_jsonb(NEW) for the meal-only column in database/schema.sql', () => {
        const sql = readSchema();
        expect(sql).not.toContain('new.picked_up_by_guest_id');
        expect(sql).toContain(`(to_jsonb(NEW)->>'picked_up_by_guest_id') is not null`);
        expect(sql).toContain(
            `(to_jsonb(NEW)->>'picked_up_by_guest_id') is distinct from (to_jsonb(NEW)->>'guest_id')`
        );
    });

    it('uses to_jsonb(NEW) for the meal-only column in the fix migration', () => {
        const sql = readMigration();
        expect(sql).not.toContain('new.picked_up_by_guest_id');
        expect(sql).toContain(`(to_jsonb(NEW)->>'picked_up_by_guest_id') is not null`);
        expect(sql).toContain(
            `(to_jsonb(NEW)->>'picked_up_by_guest_id') is distinct from (to_jsonb(NEW)->>'guest_id')`
        );
    });

    it('preserves the proxy-pickup waiver semantics in the fix migration', () => {
        const sql = readMigration();
        expect(sql).toContain('function public.ensure_guest_not_banned()');
        expect(sql).toContain(`TG_TABLE_NAME = 'meal_attendance'`);
        // Shelter restriction and ban logic must remain intact.
        const shelterCheckIdx = sql.indexOf('if coalesce(shelter_guest, false) and normalized_service in');
        const banCheckIdx = sql.indexOf('if ban_until is null then');
        expect(shelterCheckIdx).toBeGreaterThan(0);
        expect(banCheckIdx).toBeGreaterThan(0);
        expect(shelterCheckIdx).toBeLessThan(banCheckIdx);
        expect(sql).toContain(`'cancelled', 'no_show'`);
    });
});
