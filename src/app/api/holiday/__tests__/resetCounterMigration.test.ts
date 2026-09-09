import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Regression contract: the ticket-counter reset RPC was once edited in
// place (same migration version) to reference a renamed rate-limits table.
// `supabase db push` never re-applies an already-recorded version, so
// production kept running the stale body and every reset failed. Behavior
// changes to applied functions must ship in a NEW migration file — and the
// newest definition must stay correct. The follow-up failure
// ("DELETE requires a WHERE clause") proved the value of pinning the live
// body, not just the existence of a fix file.
describe('holiday ticket-counter reset redeploy', () => {
    const MIGRATION_DIR = resolve(process.cwd(), 'supabase/migrations');
    const ORIGINAL = '20260902110000_holiday_ticket_counter_reset.sql';

    function stripComments(sql: string) {
        return sql.split('\n').filter((line) => !line.trim().startsWith('--')).join('\n');
    }

    function latestDefinitionFile() {
        const names = readdirSync(MIGRATION_DIR).filter((name) => name.endsWith('.sql')).sort();
        const defining = names.filter((name) =>
            readFileSync(resolve(MIGRATION_DIR, name), 'utf8').includes('function public.reset_holiday_ticket_counter('));
        return defining[defining.length - 1];
    }

    it('ships fixes in new migration versions that sort after the original', () => {
        const names = readdirSync(MIGRATION_DIR);
        expect(names).toContain('20260910000002_fix_holiday_ticket_counter_reset.sql');
        expect(latestDefinitionFile() > ORIGINAL).toBe(true);
    });

    it('newest definition targets the real rate-limits table', () => {
        const code = stripComments(readFileSync(resolve(MIGRATION_DIR, latestDefinitionFile()), 'utf8'));
        expect(code).toContain('function public.reset_holiday_ticket_counter(');
        expect(code).toContain('delete from public.holiday_registration_rate_limits');
        // The phantom pre-rename table must not appear in executable SQL
        // (note: the correct name contains "registration_rate_limits",
        // not this exact string).
        expect(code).not.toContain('public.holiday_rate_limits');
    });

    it('newest definition qualifies the rate-limits wipe with a WHERE clause', () => {
        const code = stripComments(readFileSync(resolve(MIGRATION_DIR, latestDefinitionFile()), 'utf8'));
        const wipe = code.split('\n').find((line) => line.includes('delete from public.holiday_registration_rate_limits'));
        expect(wipe).toBeDefined();
        // Unqualified DELETEs are rejected by the database guard, which broke
        // the reset a second time with "DELETE requires a WHERE clause".
        expect(wipe).toMatch(/where/i);
    });
});
