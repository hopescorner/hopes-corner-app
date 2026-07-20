import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('check-in snapshot migration', () => {
    it('defines the snapshot RPC and the guest directory index', () => {
        const sql = readFileSync(
            resolve(process.cwd(), 'supabase/migrations/20260720120000_add_checkin_snapshot.sql'),
            'utf8',
        );

        expect(sql).toContain('function public.get_checkin_snapshot');
        expect(sql).toContain('guests_updated_at_id_idx');
        expect(sql).toContain('today_by_guest');
        expect(sql).toContain('last_visit_date');
    });

    it('defines an idempotent atomic meal command', () => {
        const sql = readFileSync(
            resolve(process.cwd(), 'supabase/migrations/20260720120000_add_checkin_snapshot.sql'),
            'utf8',
        );

        expect(sql).toContain('checkin_command_receipts');
        expect(sql).toContain('function public.execute_checkin_meal_command');
        expect(sql).toContain('pg_advisory_xact_lock');
        expect(sql).toContain('MEAL_LIMIT_REACHED');
    });

    it('enforces the weekly laundry limit in PostgreSQL for every client', () => {
        const sql = readFileSync(
            resolve(process.cwd(), 'supabase/migrations/20260720120000_add_checkin_snapshot.sql'),
            'utf8',
        );

        expect(sql).toContain('function public.check_laundry_weekly_limit');
        expect(sql).toContain('pg_advisory_xact_lock');
        expect(sql).toContain('WEEKLY_LAUNDRY_LIMIT_REACHED');
    });
});
