import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('shelter guest migration contracts', () => {
    it('enforces shelter guest restriction before ban expiration checks in migration', () => {
        const sql = readFileSync(
            resolve(process.cwd(), 'supabase/migrations/20261014000000_add_shelter_guest_flag.sql'),
            'utf8'
        );
        const shelterCheckIdx = sql.indexOf('if coalesce(shelter_guest, false) and normalized_service in');
        const banCheckIdx = sql.indexOf('if ban_until is null then');

        expect(shelterCheckIdx).toBeGreaterThan(0);
        expect(banCheckIdx).toBeGreaterThan(0);
        expect(shelterCheckIdx).toBeLessThan(banCheckIdx);
    });

    it('enforces shelter guest restriction before ban expiration checks in database/schema.sql', () => {
        const sql = readFileSync(resolve(process.cwd(), 'database/schema.sql'), 'utf8');
        const shelterCheckIdx = sql.indexOf('if coalesce(shelter_guest, false) and normalized_service in');
        const banCheckIdx = sql.indexOf('if ban_until is null then');

        expect(shelterCheckIdx).toBeGreaterThan(0);
        expect(banCheckIdx).toBeGreaterThan(0);
        expect(shelterCheckIdx).toBeLessThan(banCheckIdx);
    });

    it('validates shelter_guest persistence in save_guest_profile RPC migration', () => {
        const sql = readFileSync(
            resolve(process.cwd(), 'supabase/migrations/20261014010000_add_guest_profile_rpc.sql'),
            'utf8'
        );
        expect(sql).toContain("if (p_guest_data ? 'shelter_guest') and not has_shelter_guest then");
        expect(sql).toContain("raise exception 'Column shelter_guest is not available on guests table';");
        expect(sql).toContain("result.shelter_guest is distinct from (p_guest_data->>'shelter_guest')::boolean");
    });

    it('validates shelter_guest persistence in database/schema.sql save_guest_profile', () => {
        const sql = readFileSync(resolve(process.cwd(), 'database/schema.sql'), 'utf8');
        expect(sql).toContain("if (p_guest_data ? 'shelter_guest') and not has_shelter_guest then");
        expect(sql).toContain("raise exception 'Column shelter_guest is not available on guests table';");
        expect(sql).toContain("result.shelter_guest is distinct from (p_guest_data->>'shelter_guest')::boolean");
    });

    it('uses snake_case shelter_guest in database.ts Guest type', () => {
        const content = readFileSync(resolve(process.cwd(), 'src/types/database.ts'), 'utf8');
        expect(content).toContain('shelter_guest?: boolean;');
        expect(content).not.toContain('shelterGuest?: boolean;');
    });
});
