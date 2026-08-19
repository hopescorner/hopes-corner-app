import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('check-in snapshot migration', () => {
    it('defines one protected guest history RPC with every supported activity source', () => {
        const sql = readFileSync(
            resolve(process.cwd(), 'supabase/migrations/20260819120000_add_guest_history.sql'),
            'utf8',
        );

        expect(sql).toContain('function public.get_guest_history');
        for (const source of [
            'meal_attendance',
            'shower_reservations',
            'laundry_bookings',
            'bicycle_repairs',
            'haircut_visits',
            'holiday_visits',
            'items_distributed',
            'guest_warnings',
            'guest_reminders',
            'service_waivers',
        ]) {
            expect(sql).toContain(`public.${source}`);
        }
        expect(sql).toContain("'ban'::text");
        expect(sql).toContain('g.banned_at');
        expect(sql).toContain("m.served_on::timestamp at time zone 'America/Los_Angeles'");
        expect(sql).toContain('grant execute on function public.get_guest_history(uuid) to service_role');
    });

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
