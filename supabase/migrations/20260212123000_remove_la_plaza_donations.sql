-- Remove legacy La Plaza donations schema artifacts
-- Safe/idempotent: uses IF EXISTS and CASCADE where appropriate.

-- Drop policies first (safe even if RLS/table state differs)
drop policy if exists "Authenticated users can view la plaza donations" on public.la_plaza_donations;
drop policy if exists "Authenticated users can manage la plaza donations" on public.la_plaza_donations;

-- Drop triggers on the table
drop trigger if exists trg_la_plaza_donations_updated_at on public.la_plaza_donations;
drop trigger if exists trg_la_plaza_donations_set_date_key on public.la_plaza_donations;

-- Drop supporting indexes
drop index if exists public.la_plaza_donations_date_key_idx;
drop index if exists public.la_plaza_donations_received_at_idx;

-- Drop table
DROP TABLE IF EXISTS public.la_plaza_donations;

-- Drop helper trigger function
drop function if exists public.set_la_plaza_donation_date_key();

-- Drop enum type after dependent objects are gone
drop type if exists public.la_plaza_category_enum;
