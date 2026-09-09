import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Regression contract: the ticket-counter reset RPC was once edited in
// place (same migration version) to reference a renamed rate-limits table.
// `supabase db push` never re-applies an already-recorded version, so
// production kept running the stale body against a nonexistent table and
// every reset failed. Behavior changes to applied functions must ship in a
// NEW migration file — this test pins that the fix did.
describe('holiday ticket-counter reset redeploy', () => {
    const MIGRATION = '20260910000002_fix_holiday_ticket_counter_reset.sql';

    function readMigration() {
        return readFileSync(resolve(process.cwd(), 'supabase/migrations', MIGRATION), 'utf8');
    }

    it('ships the fix in a new migration version that sorts after the original', () => {
        const names = readdirSync(resolve(process.cwd(), 'supabase/migrations'));
        expect(names).toContain(MIGRATION);
        expect(MIGRATION > '20260902110000_holiday_ticket_counter_reset.sql').toBe(true);
    });

    it('redefines the reset RPC against the real rate-limits table', () => {
        const sql = readMigration();
        expect(sql).toContain('function public.reset_holiday_ticket_counter(');
        expect(sql).toContain('delete from public.holiday_registration_rate_limits');
        // The phantom pre-rename table must not appear in executable SQL
        // (note: the correct name contains "registration_rate_limits",
        // not this exact string). Strip comments so the explanatory header
        // above cannot trip this assertion.
        const code = sql.split('\n').filter((line) => !line.trim().startsWith('--')).join('\n');
        expect(code).not.toContain('public.holiday_rate_limits');
    });
});
