-- Run this once on a fresh database to create the correct schema with triggers, functions, views, and helpers.

-- 1. Extensions & helper updated-at trigger
create extension if not exists "pgcrypto";

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = greatest(now(), coalesce(new.updated_at, now()));
  return new;
end;
$$ language plpgsql;

create or replace function public.ensure_guest_not_banned()
returns trigger as $$
declare
  ban_until timestamptz;
  ban_reason text;
  guest_name text;
  bicycle_ban boolean;
  meal_ban boolean;
  shower_ban boolean;
  laundry_ban boolean;
  has_program_specific boolean;
  normalized_service text;
  formatted_until text;
  service_label text;
begin
  if new.guest_id is null then
    return new;
  end if;

  select g.banned_until, g.ban_reason, g.full_name,
         g.banned_from_bicycle, g.banned_from_meals,
         g.banned_from_shower, g.banned_from_laundry
    into ban_until, ban_reason, guest_name,
         bicycle_ban, meal_ban, shower_ban, laundry_ban
  from public.guests g
  where g.id = new.guest_id;

  if ban_until is null then
    return new;
  end if;

  if ban_until <= now() then
    return new;
  end if;

  formatted_until := to_char(ban_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI"Z"');

  has_program_specific := coalesce(bicycle_ban, false)
    or coalesce(meal_ban, false)
    or coalesce(shower_ban, false)
    or coalesce(laundry_ban, false);

  service_label := CASE WHEN TG_NARGS > 0 THEN TG_ARGV[0] ELSE NULL END;
  normalized_service := lower(trim(coalesce(service_label, '')));

  if has_program_specific then
    if normalized_service in ('meals', 'meal service', 'meal') then
      if meal_ban then
        raise exception using
          message = format(
            'Guest %s is banned from meals until %s',
            coalesce(guest_name, new.guest_id::text),
            formatted_until
          ),
          detail = coalesce(ban_reason, ''),
          hint = 'Update the guest''s ban settings or wait until it expires.';
      end if;
      return new;
    elsif normalized_service in ('shower', 'showers', 'shower booking', 'shower bookings') then
      if shower_ban then
        raise exception using
          message = format(
            'Guest %s is banned from showers until %s',
            coalesce(guest_name, new.guest_id::text),
            formatted_until
          ),
          detail = coalesce(ban_reason, ''),
          hint = 'Update the guest''s ban settings or wait until it expires.';
      end if;
      return new;
    elsif normalized_service in ('laundry', 'laundry booking', 'laundry bookings') then
      if laundry_ban then
        raise exception using
          message = format(
            'Guest %s is banned from laundry until %s',
            coalesce(guest_name, new.guest_id::text),
            formatted_until
          ),
          detail = coalesce(ban_reason, ''),
          hint = 'Update the guest''s ban settings or wait until it expires.';
      end if;
      return new;
    elsif normalized_service in ('bicycle repairs', 'bicycle repair', 'bicycle') then
      if bicycle_ban then
        raise exception using
          message = format(
            'Guest %s is banned from bicycle repairs until %s',
            coalesce(guest_name, new.guest_id::text),
            formatted_until
          ),
          detail = coalesce(ban_reason, ''),
          hint = 'Update the guest''s ban settings or wait until it expires.';
      end if;
      return new;
    else
      return new;
    end if;
  end if;

  raise exception using
    message = format(
      'Guest %s is banned from services until %s',
      coalesce(guest_name, new.guest_id::text),
      formatted_until
    ),
    detail = coalesce(ban_reason, ''),
    hint = 'Update the guest''s ban settings or wait until it expires.';
end;
$$ language plpgsql;

-- 2. Enumerations mirroring app constants (idempotent creation)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_enum') THEN
    CREATE TYPE public.gender_enum AS enum ('Male','Female','Unknown','Non-binary');
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'age_group_enum') THEN
    CREATE TYPE public.age_group_enum AS enum ('Adult 18-59','Senior 60+','Child 0-17');
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'housing_status_enum') THEN
    CREATE TYPE public.housing_status_enum AS enum ('Unhoused','Housed','Temp. shelter','RV or vehicle');
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'laundry_status_enum') THEN
    CREATE TYPE public.laundry_status_enum AS enum (
      'waiting','washer','dryer','done','picked_up','pending','transported','returned','offsite_picked_up','cancelled','no_show','waitlisted'
    );
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bicycle_repair_status_enum') THEN
    CREATE TYPE public.bicycle_repair_status_enum AS enum ('pending','in_progress','done');
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'donation_type_enum') THEN
    CREATE TYPE public.donation_type_enum AS enum ('Protein','Carbs','Vegetables','Fruit','Veggie Protein','Deli Foods','Pastries','School Lunch');
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meal_type_enum') THEN
    CREATE TYPE public.meal_type_enum AS enum (
      'guest',
      'extra',
      'rv',
      'shelter',
      'united_effort',
      'day_worker',
      'lunch_bag'
    );
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shower_status_enum') THEN
    CREATE TYPE public.shower_status_enum as enum ('booked','waitlisted','done','cancelled','no_show');
  END IF;
END$$;

-- 3. Core reference tables
create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null,           -- matches Firestore guestId or legacy ID (e.g. "GABC123" or "M80926591")
  first_name text not null,
  last_name text not null,
  full_name text not null,
  preferred_name text,
  housing_status public.housing_status_enum not null default 'Unhoused',
  age_group public.age_group_enum not null,
  gender public.gender_enum not null,
  location text not null default 'Mountain View',
  notes text,
  bicycle_description text,
  ban_reason text,
  banned_at timestamptz,
  banned_until timestamptz,
  -- Program-specific ban columns (from migration 010)
  banned_from_bicycle boolean default false,
  banned_from_meals boolean default false,
  banned_from_shower boolean default false,
  banned_from_laundry boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guests_ban_window_valid check (
    banned_until is null
    or banned_at is null
    or banned_until > banned_at
  )
);

comment on column public.guests.banned_from_bicycle is 'If true, guest is banned from bicycle repair services when banned_until is in the future';
comment on column public.guests.banned_from_meals is 'If true, guest is banned from meal services when banned_until is in the future';
comment on column public.guests.banned_from_shower is 'If true, guest is banned from shower services when banned_until is in the future';
comment on column public.guests.banned_from_laundry is 'If true, guest is banned from laundry services when banned_until is in the future';

drop trigger if exists trg_guests_updated_at on public.guests;
create trigger trg_guests_updated_at
before update on public.guests
for each row execute function public.touch_updated_at();

-- 3a. Guest Warnings (from migrations)
create table if not exists public.guest_warnings (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete cascade,
  message text not null,
  severity smallint not null default 1, -- 1:low, 2:medium, 3:high
  issued_by text, -- optional: staff id or name
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guest_warnings_guest_id_idx on public.guest_warnings (guest_id);
create index if not exists guest_warnings_created_at_idx on public.guest_warnings (created_at desc);

drop trigger if exists trg_guest_warnings_updated_at on public.guest_warnings;
create trigger trg_guest_warnings_updated_at
before update on public.guest_warnings
for each row execute function public.touch_updated_at();

-- RLS for guest_warnings table
alter table public.guest_warnings enable row level security;

drop policy if exists "Authenticated users can view guest warnings" on public.guest_warnings;
create policy "Authenticated users can view guest warnings"
  on public.guest_warnings for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage guest warnings" on public.guest_warnings;
create policy "Authenticated users can manage guest warnings"
  on public.guest_warnings for all
  to authenticated, anon
  using (true)
  with check (true);

-- 3a-2. Guest Reminders (staff reminders that must be dismissed)
create table if not exists public.guest_reminders (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id) on delete cascade,
  message text not null,
  -- Services this reminder applies to: 'shower', 'laundry', 'bicycle', or 'all'
  applies_to text[] not null default '{all}',
  created_by text, -- optional: staff id or name who created the reminder
  dismissed_at timestamptz, -- null means active, set when dismissed
  dismissed_by text, -- optional: staff who dismissed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.guest_reminders is 'Reminders for guests that staff must acknowledge before providing services';
comment on column public.guest_reminders.applies_to is 'Array of services: shower, laundry, bicycle, or all. Reminder shows on these service cards.';
comment on column public.guest_reminders.dismissed_at is 'When set, the reminder is considered dismissed and will not show on service cards.';

create index if not exists guest_reminders_guest_id_idx on public.guest_reminders (guest_id);
create index if not exists guest_reminders_active_idx on public.guest_reminders (guest_id) where dismissed_at is null;
create index if not exists guest_reminders_created_at_idx on public.guest_reminders (created_at desc);

drop trigger if exists trg_guest_reminders_updated_at on public.guest_reminders;
create trigger trg_guest_reminders_updated_at
before update on public.guest_reminders
for each row execute function public.touch_updated_at();

-- RLS for guest_reminders table
alter table public.guest_reminders enable row level security;

drop policy if exists "Authenticated users can view guest reminders" on public.guest_reminders;
create policy "Authenticated users can view guest reminders"
  on public.guest_reminders for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage guest reminders" on public.guest_reminders;
create policy "Authenticated users can manage guest reminders"
  on public.guest_reminders for all
  to authenticated, anon
  using (true)
  with check (true);

-- 3b. Guest Proxies (from migrations)
create table if not exists public.guest_proxies (
    id uuid primary key default gen_random_uuid(),
    guest_id uuid not null references public.guests(id) on delete cascade,
    proxy_id uuid not null references public.guests(id) on delete cascade,
    created_at timestamptz not null default now(),
    
    constraint guest_proxies_no_self_link check (guest_id <> proxy_id),
    constraint guest_proxies_unique_link unique (guest_id, proxy_id)
);

create index if not exists guest_proxies_guest_id_idx on public.guest_proxies (guest_id);
create index if not exists guest_proxies_proxy_id_idx on public.guest_proxies (proxy_id);

alter table public.guest_proxies enable row level security;

drop policy if exists "Authenticated users can view guest proxies" on public.guest_proxies;
create policy "Authenticated users can view guest proxies"
    on public.guest_proxies for select
    to authenticated, anon
    using (true);

drop policy if exists "Authenticated users can manage guest proxies" on public.guest_proxies;
create policy "Authenticated users can manage guest proxies"
    on public.guest_proxies for all
    to authenticated, anon
    using (true)
    with check (true);

-- Function to maintain symmetry (A->B implies B->A)
create or replace function public.maintain_guest_proxy_symmetry()
returns trigger as $$
begin
    if (TG_OP = 'INSERT') then
        insert into public.guest_proxies (guest_id, proxy_id)
        values (new.proxy_id, new.guest_id)
        on conflict (guest_id, proxy_id) do nothing;
    elsif (TG_OP = 'DELETE') then
        delete from public.guest_proxies
        where guest_id = old.proxy_id and proxy_id = old.guest_id;
    end if;
    return null;
end;
$$ language plpgsql;

drop trigger if exists trg_maintain_guest_proxy_symmetry on public.guest_proxies;
create trigger trg_maintain_guest_proxy_symmetry
after insert or delete on public.guest_proxies
for each row execute function public.maintain_guest_proxy_symmetry();

-- Function to check limit of 3 proxies
create or replace function public.check_guest_proxy_limit()
returns trigger as $$
begin
    if (select count(*) from public.guest_proxies where guest_id = new.guest_id) >= 3 then
        raise exception 'A guest can have at most 3 linked accounts.';
    end if;
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_check_guest_proxy_limit on public.guest_proxies;
create trigger trg_check_guest_proxy_limit
before insert on public.guest_proxies
for each row execute function public.check_guest_proxy_limit();

-- 3c. Guest Families (Family Meal Program)
create table if not exists public.guest_families (
  id uuid primary key default gen_random_uuid(),
  primary_guest_id uuid not null references public.guests(id) on delete cascade,
  enrolled_in_family_meal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_families_primary_guest_unique unique (primary_guest_id)
);

create table if not exists public.guest_family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.guest_families(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint guest_family_members_unique_family_guest unique (family_id, guest_id),
  constraint guest_family_members_unique_guest unique (guest_id)
);

create table if not exists public.family_meal_distributions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.guest_families(id) on delete cascade,
  meals_per_member smallint not null check (meals_per_member > 0),
  member_count_snapshot smallint not null check (member_count_snapshot > 0),
  total_meals integer generated always as (meals_per_member * member_count_snapshot) stored,
  served_on date not null,
  recorded_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_meal_distributions_family_day_unique unique (family_id, served_on)
);

drop trigger if exists trg_guest_families_updated_at on public.guest_families;
create trigger trg_guest_families_updated_at
before update on public.guest_families
for each row execute function public.touch_updated_at();

drop trigger if exists trg_family_meal_distributions_updated_at on public.family_meal_distributions;
create trigger trg_family_meal_distributions_updated_at
before update on public.family_meal_distributions
for each row execute function public.touch_updated_at();

create index if not exists guest_families_primary_guest_id_idx
  on public.guest_families (primary_guest_id);

create index if not exists guest_families_enrolled_idx
  on public.guest_families (created_at desc)
  where enrolled_in_family_meal = true;

create index if not exists guest_family_members_family_id_idx
  on public.guest_family_members (family_id);

create index if not exists guest_family_members_guest_id_idx
  on public.guest_family_members (guest_id);

create index if not exists family_meal_distributions_family_id_idx
  on public.family_meal_distributions (family_id);

create index if not exists family_meal_distributions_served_on_idx
  on public.family_meal_distributions (served_on desc);

alter table public.guest_families enable row level security;
alter table public.guest_family_members enable row level security;
alter table public.family_meal_distributions enable row level security;

drop policy if exists "Authenticated users can view guest families" on public.guest_families;
create policy "Authenticated users can view guest families"
  on public.guest_families for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage guest families" on public.guest_families;
create policy "Authenticated users can manage guest families"
  on public.guest_families for all
  to authenticated, anon
  using (true)
  with check (true);

drop policy if exists "Authenticated users can view guest family members" on public.guest_family_members;
create policy "Authenticated users can view guest family members"
  on public.guest_family_members for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage guest family members" on public.guest_family_members;
create policy "Authenticated users can manage guest family members"
  on public.guest_family_members for all
  to authenticated, anon
  using (true)
  with check (true);

drop policy if exists "Authenticated users can view family meal distributions" on public.family_meal_distributions;
create policy "Authenticated users can view family meal distributions"
  on public.family_meal_distributions for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage family meal distributions" on public.family_meal_distributions;
create policy "Authenticated users can manage family meal distributions"
  on public.family_meal_distributions for all
  to authenticated, anon
  using (true)
  with check (true);

create index if not exists guests_banned_until_idx
  on public.guests (banned_until)
  where banned_until is not null;

-- Index for program-specific bans
create index if not exists guests_program_bans_idx on public.guests (banned_until)
  where banned_from_bicycle = true or banned_from_meals = true or banned_from_shower = true or banned_from_laundry = true;

-- Performance indexes for large guest tables (100k+ records)
create index if not exists guests_created_at_idx
  on public.guests (created_at desc);

create index if not exists guests_full_name_idx
  on public.guests (full_name);

create index if not exists guests_external_id_idx
  on public.guests (external_id);

-- RLS for guests table
alter table public.guests enable row level security;

drop policy if exists "Authenticated users can view guests" on public.guests;
create policy "Authenticated users can view guests"
  on public.guests for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage guests" on public.guests;
create policy "Authenticated users can manage guests"
  on public.guests for all
  to authenticated, anon
  using (true)
  with check (true);

-- 4. Program attendance & services
create table if not exists public.meal_attendance (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete set null,
  picked_up_by_guest_id uuid references public.guests(id) on delete set null,  -- Tracks who physically picked up the meal (linked/proxy guest)
  meal_type public.meal_type_enum not null default 'guest',
  quantity smallint not null check (quantity > 0),
  served_on date not null,
  deduplication_key text unique default null,
  recorded_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_meal_attendance_updated_at on public.meal_attendance;
create trigger trg_meal_attendance_updated_at
before update on public.meal_attendance
for each row execute function public.touch_updated_at();

drop trigger if exists trg_meal_attendance_ban_guard on public.meal_attendance;
create trigger trg_meal_attendance_ban_guard
before insert or update on public.meal_attendance
for each row execute function public.ensure_guest_not_banned('meals');

-- Enforce one primary meal per guest per day
create unique index if not exists meal_attendance_guest_unique
  on public.meal_attendance (guest_id, served_on)
  where meal_type = 'guest';

-- Enforce daily meal limits (2 base, 2 extra, 4 total per guest per day) in
-- the database, serialized per guest+day with the same advisory-lock key the
-- check-in RPC uses, so parallel devices cannot exceed the limits.
create or replace function public.enforce_daily_meal_limits()
returns trigger
language plpgsql
as $$
declare
  base_count integer;
  extra_count integer;
begin
  if new.guest_id is null or new.meal_type not in ('guest', 'extra') then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.guest_id::text || ':' || new.served_on::text, 0));

  select
    coalesce(sum(quantity) filter (where meal_type = 'guest'), 0)::integer,
    coalesce(sum(quantity) filter (where meal_type = 'extra'), 0)::integer
  into base_count, extra_count
  from public.meal_attendance
  where guest_id = new.guest_id
    and served_on = new.served_on
    and id is distinct from new.id;

  if new.meal_type = 'guest' and base_count + new.quantity > 2 then
    raise exception 'MEAL_LIMIT_REACHED';
  end if;
  if new.meal_type = 'extra' and extra_count + new.quantity > 2 then
    raise exception 'MEAL_LIMIT_REACHED';
  end if;
  if base_count + extra_count + new.quantity > 4 then
    raise exception 'MEAL_LIMIT_REACHED';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_meal_attendance_daily_limits on public.meal_attendance;
create trigger trg_meal_attendance_daily_limits
  before insert or update of quantity, guest_id, served_on, meal_type
  on public.meal_attendance
  for each row execute function public.enforce_daily_meal_limits();

-- Performance indexes for meal attendance queries
create index if not exists meal_attendance_served_on_idx
  on public.meal_attendance (served_on desc);

create index if not exists meal_attendance_guest_id_idx
  on public.meal_attendance (guest_id);

create index if not exists meal_attendance_created_at_idx
  on public.meal_attendance (created_at desc);

create index if not exists meal_attendance_picked_up_by_idx
  on public.meal_attendance (picked_up_by_guest_id)
  where picked_up_by_guest_id is not null;

-- RLS for meal_attendance table
alter table public.meal_attendance enable row level security;

drop policy if exists "Authenticated users can view meal attendance" on public.meal_attendance;
create policy "Authenticated users can view meal attendance"
  on public.meal_attendance for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage meal attendance" on public.meal_attendance;
create policy "Authenticated users can manage meal attendance"
  on public.meal_attendance for all
  to authenticated, anon
  using (true)
  with check (true);

create table if not exists public.shower_reservations (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete cascade,
  scheduled_for date not null,
  scheduled_time text,  -- "07:30" etc; keep as text to match UI
  status public.shower_status_enum not null default 'booked',
  waitlist_position smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  note text
);

alter table public.shower_reservations replica identity full;

drop trigger if exists trg_shower_reservations_updated_at on public.shower_reservations;
create trigger trg_shower_reservations_updated_at
before update on public.shower_reservations
for each row execute function public.touch_updated_at();

drop trigger if exists trg_shower_reservations_ban_guard on public.shower_reservations;
create trigger trg_shower_reservations_ban_guard
before insert or update on public.shower_reservations
for each row execute function public.ensure_guest_not_banned('shower');

create unique index if not exists shower_one_per_day
  on public.shower_reservations (guest_id, scheduled_for);

-- Helps enforce max 2 per slot; also enforced by trg_shower_slot_capacity trigger
create index if not exists shower_slot_idx
  on public.shower_reservations (scheduled_for, scheduled_time);

-- Trigger: enforce max 2 guests per shower time slot
create or replace function public.check_shower_slot_capacity()
returns trigger as $$
declare
  slot_count integer;
  max_per_slot constant integer := 2;
begin
  if NEW.status not in ('booked', 'done') then
    return NEW;
  end if;
  if NEW.scheduled_time is null then
    return NEW;
  end if;

  select count(*) into slot_count
    from public.shower_reservations
   where scheduled_for  = NEW.scheduled_for
     and scheduled_time = NEW.scheduled_time
     and status in ('booked', 'done')
     and id != NEW.id;

  if slot_count >= max_per_slot then
    raise exception 'Shower slot % on % is full (%/% taken)',
      NEW.scheduled_time, NEW.scheduled_for, slot_count, max_per_slot;
  end if;

  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_shower_slot_capacity on public.shower_reservations;
create trigger trg_shower_slot_capacity
  before insert or update on public.shower_reservations
  for each row execute function public.check_shower_slot_capacity();

-- Performance indexes for shower_reservations (from migration 004)
create index if not exists shower_scheduled_for_idx
  on public.shower_reservations (scheduled_for desc);

create index if not exists shower_created_at_idx
  on public.shower_reservations (created_at desc);

create index if not exists shower_guest_id_idx
  on public.shower_reservations (guest_id);

-- RLS for shower_reservations table
alter table public.shower_reservations enable row level security;

drop policy if exists "Authenticated users can view shower reservations" on public.shower_reservations;
create policy "Authenticated users can view shower reservations"
  on public.shower_reservations for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage shower reservations" on public.shower_reservations;
create policy "Authenticated users can manage shower reservations"
  on public.shower_reservations for all
  to authenticated, anon
  using (true)
  with check (true);

create table if not exists public.laundry_bookings (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete cascade,
  scheduled_for date not null,
  slot_label text,
  laundry_type text not null check (laundry_type in ('onsite','offsite')),
  bag_number text,
  status public.laundry_status_enum not null default 'waiting',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  note text
);

alter table public.laundry_bookings replica identity full;

drop trigger if exists trg_laundry_bookings_updated_at on public.laundry_bookings;
create trigger trg_laundry_bookings_updated_at
before update on public.laundry_bookings
for each row execute function public.touch_updated_at();

drop trigger if exists trg_laundry_bookings_ban_guard on public.laundry_bookings;
create trigger trg_laundry_bookings_ban_guard
before insert or update on public.laundry_bookings
for each row execute function public.ensure_guest_not_banned('laundry');

create unique index if not exists laundry_one_per_day
  on public.laundry_bookings (guest_id, scheduled_for);

-- Trigger: enforce max 1 guest per onsite laundry time slot
create or replace function public.check_laundry_slot_capacity()
returns trigger as $$
declare
  slot_count integer;
  max_per_slot constant integer := 1;
begin
  if NEW.laundry_type != 'onsite' then
    return NEW;
  end if;
  if NEW.slot_label is null then
    return NEW;
  end if;
  if NEW.status not in ('waiting', 'washer', 'dryer', 'done', 'picked_up') then
    return NEW;
  end if;

  -- Serialize per (date, slot) so parallel devices can't both see the slot
  -- empty under READ COMMITTED and double-book it.
  perform pg_advisory_xact_lock(hashtextextended('laundry_slot:' || NEW.scheduled_for::text || ':' || NEW.slot_label, 0));

  select count(*) into slot_count
    from public.laundry_bookings
   where scheduled_for = NEW.scheduled_for
     and slot_label    = NEW.slot_label
     and laundry_type  = 'onsite'
     and status in ('waiting', 'washer', 'dryer', 'done', 'picked_up')
     and id != NEW.id;

  if slot_count >= max_per_slot then
    raise exception 'Laundry slot % on % is already booked',
      NEW.slot_label, NEW.scheduled_for;
  end if;

  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_laundry_slot_capacity on public.laundry_bookings;
create trigger trg_laundry_slot_capacity
  before insert or update on public.laundry_bookings
  for each row execute function public.check_laundry_slot_capacity();

-- Enforce the weekly laundry allowance (2 loads per guest per Monday-start
-- week) in the database. Only new counting entries are checked, so status
-- progression on existing bookings is never blocked.
create or replace function public.enforce_weekly_laundry_limit()
returns trigger
language plpgsql
as $$
declare
  week_start date;
  week_count integer;
  max_per_week constant integer := 2;
begin
  if new.guest_id is null or new.scheduled_for is null then
    return new;
  end if;
  if new.status in ('cancelled', 'no_show', 'waitlisted') then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and old.guest_id = new.guest_id
     and old.scheduled_for = new.scheduled_for
     and old.status not in ('cancelled', 'no_show', 'waitlisted') then
    return new;
  end if;

  week_start := date_trunc('week', new.scheduled_for)::date;

  perform pg_advisory_xact_lock(hashtextextended('laundry_week:' || new.guest_id::text || ':' || week_start::text, 0));

  select count(*) into week_count
  from public.laundry_bookings
  where guest_id = new.guest_id
    and scheduled_for >= week_start
    and scheduled_for < week_start + 7
    and status not in ('cancelled', 'no_show', 'waitlisted')
    and id is distinct from new.id;

  if week_count >= max_per_week then
    raise exception 'LAUNDRY_WEEKLY_LIMIT_REACHED';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_laundry_weekly_limit on public.laundry_bookings;
create trigger trg_laundry_weekly_limit
  before insert or update of status, guest_id, scheduled_for
  on public.laundry_bookings
  for each row execute function public.enforce_weekly_laundry_limit();

-- Performance indexes for laundry_bookings (from migration 004)
create index if not exists laundry_scheduled_for_idx
  on public.laundry_bookings (scheduled_for desc);

create index if not exists laundry_created_at_idx
  on public.laundry_bookings (created_at desc);

create index if not exists laundry_guest_id_idx
  on public.laundry_bookings (guest_id);

-- RLS for laundry_bookings table
alter table public.laundry_bookings enable row level security;

drop policy if exists "Authenticated users can view laundry bookings" on public.laundry_bookings;
create policy "Authenticated users can view laundry bookings"
  on public.laundry_bookings for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage laundry bookings" on public.laundry_bookings;
create policy "Authenticated users can manage laundry bookings"
  on public.laundry_bookings for all
  to authenticated, anon
  using (true)
  with check (true);

create table if not exists public.blocked_slots (
  id uuid default gen_random_uuid() primary key,
  service_type text not null, -- 'shower' or 'laundry'
  slot_time text not null, -- e.g. '09:00', '10:30 - 12:00'
  date text not null, -- YYYY-MM-DD
  created_at timestamptz default now() not null,
  blocked_by uuid -- references auth.users(id) -- Optional: who blocked it
);

create index if not exists idx_blocked_slots_lookup 
  on public.blocked_slots(date, service_type);

alter table public.blocked_slots enable row level security;

drop policy if exists "Enable read access for authenticated users" on public.blocked_slots;
create policy "Enable read access for authenticated users"
  on public.blocked_slots for select
  to authenticated, anon
  using (true);

drop policy if exists "Enable insert access for authenticated users" on public.blocked_slots;
create policy "Enable insert access for authenticated users"
  on public.blocked_slots for insert
  to authenticated, anon
  with check (true);

drop policy if exists "Enable delete access for authenticated users" on public.blocked_slots;
create policy "Enable delete access for authenticated users"
  on public.blocked_slots for delete
  to authenticated, anon
  using (true);

create table if not exists public.bicycle_repairs (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete set null,
  requested_at timestamptz not null default now(),
  repair_type text,
  repair_types text[] not null,
  completed_repairs text[] not null default array[]::text[],
  notes text,
  status public.bicycle_repair_status_enum not null default 'pending',
  priority integer not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint bicycle_repairs_requires_repair_types check (cardinality(repair_types) > 0)
);

drop trigger if exists trg_bicycle_repairs_updated_at on public.bicycle_repairs;
create trigger trg_bicycle_repairs_updated_at
before update on public.bicycle_repairs
for each row execute function public.touch_updated_at();

drop trigger if exists trg_bicycle_repairs_ban_guard on public.bicycle_repairs;
create trigger trg_bicycle_repairs_ban_guard
before insert or update on public.bicycle_repairs
for each row execute function public.ensure_guest_not_banned('bicycle repairs');

-- Performance indexes for bicycle_repairs (from migration 004)
create index if not exists bicycle_requested_at_idx
  on public.bicycle_repairs (requested_at desc);

create index if not exists bicycle_guest_id_idx
  on public.bicycle_repairs (guest_id);

create index if not exists bicycle_status_idx
  on public.bicycle_repairs (status);

-- RLS for bicycle_repairs table
alter table public.bicycle_repairs enable row level security;

drop policy if exists "Authenticated users can view bicycle repairs" on public.bicycle_repairs;
create policy "Authenticated users can view bicycle repairs"
  on public.bicycle_repairs for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage bicycle repairs" on public.bicycle_repairs;
create policy "Authenticated users can manage bicycle repairs"
  on public.bicycle_repairs for all
  to authenticated, anon
  using (true)
  with check (true);

create table if not exists public.holiday_visits (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete cascade,
  served_at timestamptz not null default now(),
  visit_date date,
  created_at timestamptz not null default now()
);

drop trigger if exists trg_holiday_visits_ban_guard on public.holiday_visits;
create trigger trg_holiday_visits_ban_guard
before insert or update on public.holiday_visits
for each row execute function public.ensure_guest_not_banned('holiday');

-- One holiday visit per guest per day
create unique index if not exists holiday_visits_one_per_guest_per_day
  on public.holiday_visits (guest_id, visit_date)
  where visit_date is not null;

-- Performance indexes for holiday_visits (from migration 004)
create index if not exists holiday_served_at_idx
  on public.holiday_visits (served_at desc);

create index if not exists holiday_created_at_idx
  on public.holiday_visits (created_at desc);

create index if not exists holiday_guest_id_idx
  on public.holiday_visits (guest_id);

-- RLS for holiday_visits table
alter table public.holiday_visits enable row level security;

drop policy if exists "Authenticated users can view holiday visits" on public.holiday_visits;
create policy "Authenticated users can view holiday visits"
  on public.holiday_visits for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage holiday visits" on public.holiday_visits;
create policy "Authenticated users can manage holiday visits"
  on public.holiday_visits for all
  to authenticated, anon
  using (true)
  with check (true);

create table if not exists public.haircut_visits (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete cascade,
  served_at timestamptz not null default now(),
  service_date date,
  slot_time time,
  stylist_name text,
  created_at timestamptz not null default now()
);

drop trigger if exists trg_haircut_visits_ban_guard on public.haircut_visits;
create trigger trg_haircut_visits_ban_guard
before insert or update on public.haircut_visits
for each row execute function public.ensure_guest_not_banned('haircut');

-- Performance indexes for haircut_visits (from migration 004)
create index if not exists haircut_served_at_idx
  on public.haircut_visits (served_at desc);

create index if not exists haircut_created_at_idx
  on public.haircut_visits (created_at desc);

create index if not exists haircut_guest_id_idx
  on public.haircut_visits (guest_id);

create unique index if not exists haircut_visits_schedule_unique
  on public.haircut_visits (service_date, slot_time, stylist_name)
  where service_date is not null
    and slot_time is not null
    and stylist_name is not null;

-- Enforce at most one haircut visit per guest per day
create unique index if not exists haircut_visits_one_per_guest_per_day
  on public.haircut_visits (
    guest_id,
    coalesce(service_date, (served_at at time zone 'America/Los_Angeles')::date)
  );

-- RLS for haircut_visits table
alter table public.haircut_visits enable row level security;

drop policy if exists "Authenticated users can view haircut visits" on public.haircut_visits;
create policy "Authenticated users can view haircut visits"
  on public.haircut_visits for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage haircut visits" on public.haircut_visits;
create policy "Authenticated users can manage haircut visits"
  on public.haircut_visits for all
  to authenticated, anon
  using (true)
  with check (true);

create table if not exists public.items_distributed (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete cascade,
  item_key text not null,          -- 'tshirt','sleeping_bag','backpack','tent','flip_flops','jacket', etc.
  distributed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.items_distributed is 'Track distribution of items (t-shirt, sleeping_bag, backpack, tent, flip_flops, jacket, etc). 
Jacket has special 15-day validity - guests can receive another jacket 15+ days after distribution.
Other items use app logic for frequency limits.';

comment on column public.items_distributed.item_key is 'Item type: tshirt, sleeping_bag, backpack, tent, flip_flops, jacket, etc. 
Jacket items become available again after 15 days (distributed_at + 15 days).';

drop trigger if exists trg_items_distributed_ban_guard on public.items_distributed;
create trigger trg_items_distributed_ban_guard
before insert or update on public.items_distributed
for each row execute function public.ensure_guest_not_banned('items');

create index if not exists items_distributed_lookup
  on public.items_distributed (guest_id, item_key, distributed_at desc);

-- Jacket-specific index for faster lookups (from migration 007_add_jacket_tracking)
create index if not exists items_distributed_jacket_lookup
  on public.items_distributed (guest_id, item_key, distributed_at desc)
  where item_key = 'jacket';

-- RLS for items_distributed table
alter table public.items_distributed enable row level security;

drop policy if exists "Authenticated users can view items distributed" on public.items_distributed;
create policy "Authenticated users can view items distributed"
  on public.items_distributed for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage items distributed" on public.items_distributed;
create policy "Authenticated users can manage items distributed"
  on public.items_distributed for all
  to authenticated, anon
  using (true)
  with check (true);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  donation_type public.donation_type_enum not null,
  item_name text not null,
  trays numeric(6,2) not null default 0,
  weight_lbs numeric(6,2) not null default 0,
  servings numeric(8,2) default 0,
  temperature text,
  donor text not null,
  donated_at timestamptz not null default now(),
  date_key date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_donations_updated_at on public.donations;
create trigger trg_donations_updated_at
before update on public.donations
for each row execute function public.touch_updated_at();

-- Function to compute date_key from donated_at timestamp in Pacific timezone
-- Only sets date_key if not already provided (client can send it explicitly)
create or replace function public.set_donation_date_key()
returns trigger as $$
begin
  -- Only compute if date_key is not already set
  if new.date_key is null then
    new.date_key := (new.donated_at at time zone 'America/Los_Angeles')::date;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_donations_set_date_key on public.donations;
create trigger trg_donations_set_date_key
before insert or update on public.donations
for each row execute function public.set_donation_date_key();

create index if not exists donations_date_key_idx
  on public.donations (date_key desc);

-- RLS for donations table
alter table public.donations enable row level security;

drop policy if exists "Authenticated users can view donations" on public.donations;
create policy "Authenticated users can view donations"
  on public.donations for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage donations" on public.donations;
create policy "Authenticated users can manage donations"
  on public.donations for all
  to authenticated, anon
  using (true)
  with check (true);

-- 5. Settings store (single row replacing Firestore doc appSettings/global)
create table if not exists public.app_settings (
  id text primary key default 'global',
  site_name text not null default 'Hope''s Corner',
  max_onsite_laundry_slots smallint not null default 5,
  enable_offsite_laundry boolean not null default true,
  auto_meal_additions_enabled boolean not null default true,
  ui_density text not null default 'comfortable',
  show_charts boolean not null default true,
  default_report_days smallint not null default 7,
  donation_autofill boolean not null default true,
  default_donation_type public.donation_type_enum not null default 'Protein',
  targets jsonb not null default jsonb_build_object(
    'monthlyMeals', 1500,
    'yearlyMeals', 18000,
    'monthlyShowers', 300,
    'yearlyShowers', 3600,
    'monthlyLaundry', 200,
    'yearlyLaundry', 2400,
    'monthlyBicycles', 50,
    'yearlyBicycles', 600,
    'monthlyHaircuts', 100,
    'yearlyHaircuts', 1200,
    'monthlyHolidays', 80,
    'yearlyHolidays', 960
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS for app_settings table
alter table public.app_settings enable row level security;

drop policy if exists "Authenticated users can view app settings" on public.app_settings;
create policy "Authenticated users can view app settings"
  on public.app_settings for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage app settings" on public.app_settings;
create policy "Authenticated users can manage app settings"
  on public.app_settings for all
  to authenticated, anon
  using (true)
  with check (true);

drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at
before update on public.app_settings
for each row execute function public.touch_updated_at();

-- Seed the single settings row (safe upsert)
insert into public.app_settings (id) values ('global')
on conflict (id) do nothing;

-- 6. Optional sync metadata table (handy if you persist SupabaseSync state)
create table if not exists public.sync_state (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  last_synced_at timestamptz not null default now(),
  last_error text,
  payload jsonb,
  constraint sync_state_unique_table unique (table_name)
);

-- RLS for sync_state table
alter table public.sync_state enable row level security;

drop policy if exists "Authenticated users can view sync state" on public.sync_state;
create policy "Authenticated users can view sync state"
  on public.sync_state for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage sync state" on public.sync_state;
create policy "Authenticated users can manage sync state"
  on public.sync_state for all
  to authenticated, anon
  using (true)
  with check (true);

-- 7. Service waivers (from migrations)
-- Track if a guest has an active waiver for shower, laundry, or bicycle
create table if not exists public.service_waivers (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id) on delete cascade,
  service_type text not null check (service_type in ('shower', 'laundry', 'bicycle')),
  signed_at timestamptz not null default now(),
  dismissed_at timestamptz,
  dismissed_by_user_id uuid,
  dismissed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.service_waivers is 'Tracks service waivers for shower, laundry, and bicycle programs. Each waiver is valid for one calendar year.';

drop trigger if exists trg_service_waivers_updated_at on public.service_waivers;
create trigger trg_service_waivers_updated_at
before update on public.service_waivers
for each row execute function public.touch_updated_at();

-- Indexes to speed up waiver queries
create index if not exists service_waivers_guest_idx
  on public.service_waivers (guest_id);

create index if not exists service_waivers_service_type_idx
  on public.service_waivers (service_type);

-- Enforce a single active waiver (no dismissed_at) per guest, per service
create unique index if not exists service_waivers_unique_active_idx
  on public.service_waivers (guest_id, service_type)
  where dismissed_at is null;

-- View for guests needing waivers (yearly logic applied below)
drop view if exists public.guests_needing_waivers cascade;
create or replace view public.guests_needing_waivers as
select distinct g.id,
  g.external_id,
  g.full_name,
  g.preferred_name,
  'shower' as service_type
from public.guests g
where 
  exists (
    select 1 from public.shower_reservations sr
    where sr.guest_id = g.id 
      and sr.scheduled_for >= date_trunc('year', now())::date
  ) 
  and (
    not exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = g.id 
        and sw.service_type = 'shower'
    )
    or
    exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = g.id
        and sw.service_type = 'shower'
        and sw.dismissed_at < date_trunc('year', now())::date
    )
  )
union all
select distinct g.id,
  g.external_id,
  g.full_name,
  g.preferred_name,
  'laundry' as service_type
from public.guests g
where 
  exists (
    select 1 from public.laundry_bookings lb
    where lb.guest_id = g.id
      and lb.scheduled_for >= date_trunc('year', now())::date
  )
  and (
    not exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = g.id 
        and sw.service_type = 'laundry'
    )
    or
    exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = g.id
        and sw.service_type = 'laundry'
        and sw.dismissed_at < date_trunc('year', now())::date
    )
  )
union all
select distinct g.id,
  g.external_id,
  g.full_name,
  g.preferred_name,
  'bicycle' as service_type
from public.guests g
where 
  exists (
    select 1 from public.bicycle_repairs br
    where br.guest_id = g.id
      and br.requested_at >= date_trunc('year', now())
  )
  and (
    not exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = g.id 
        and sw.service_type = 'bicycle'
    )
    or
    exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = g.id
        and sw.service_type = 'bicycle'
        and sw.dismissed_at < date_trunc('year', now())::date
    )
  );

-- Helper functions for waivers
-- has_active_waiver: checks if a guest has an acknowledged waiver for THIS calendar year
-- When staff confirms a waiver is signed, dismiss_waiver() sets dismissed_at = now()
-- So an "active" waiver is one where dismissed_at IS NOT NULL (was acknowledged) AND dismissed_at >= year_start
create or replace function public.has_active_waiver(
  p_guest_id uuid,
  p_service_type text
) returns boolean as $$
declare
  v_year_start timestamptz;
begin
  v_year_start := date_trunc('year', now());
  -- A waiver is "active" if it was dismissed (acknowledged) this year
  return exists (
    select 1
    from public.service_waivers sw
    where sw.guest_id = p_guest_id
      and sw.service_type = p_service_type
      and sw.dismissed_at is not null
      and sw.dismissed_at >= v_year_start
  );
end;
$$ language plpgsql stable;

-- Drop existing function first (may have different return type from migrations)
drop function if exists public.dismiss_waiver(uuid, text, text);
create or replace function public.dismiss_waiver(
  p_guest_id uuid,
  p_service_type text,
  p_dismissed_reason text default 'signed_by_staff'
) returns void as $$
begin
  insert into public.service_waivers (
    guest_id,
    service_type,
    signed_at,
    dismissed_at,
    dismissed_reason
  ) values (
    p_guest_id,
    p_service_type,
    now(),
    now(),
    p_dismissed_reason
  )
  on conflict (guest_id, service_type) where dismissed_at is null
  do update set
    dismissed_at = now(),
    dismissed_reason = p_dismissed_reason;
end;
$$ language plpgsql;

-- Check if a guest needs a waiver reminder for a service
-- Uses scheduled_for date (when service is scheduled) rather than created_at
create or replace function public.guest_needs_waiver_reminder(
  p_guest_id uuid,
  p_service_type text
) returns boolean as $$
declare
  v_year_start date;
begin
  v_year_start := date_trunc('year', now())::date;
  
  -- Check for bicycle service type
  if p_service_type = 'bicycle' then
    -- Check if guest has any bicycle repair this year
    if not exists (
      select 1 from public.bicycle_repairs br
      where br.guest_id = p_guest_id
        and br.requested_at >= v_year_start
    ) then
      return false;
    end if;
    
    -- Check for existing waiver this year
    if exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = p_guest_id
        and sw.service_type = 'bicycle'
        and sw.dismissed_at >= v_year_start
    ) then
      return false;
    end if;
    
    return true;
  end if;
  
  -- Original logic for shower
  if p_service_type = 'shower' then
    if not exists (
      select 1 from public.shower_reservations sr
      where sr.guest_id = p_guest_id
        and sr.scheduled_for >= v_year_start
    ) then
      return false;
    end if;
    
    if exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = p_guest_id
        and sw.service_type = 'shower'
        and sw.dismissed_at >= v_year_start
    ) then
      return false;
    end if;
    
    return true;
  end if;
  
  -- Original logic for laundry
  if p_service_type = 'laundry' then
    if not exists (
      select 1 from public.laundry_bookings lb
      where lb.guest_id = p_guest_id
        and lb.scheduled_for >= v_year_start
    ) then
      return false;
    end if;
    
    if exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = p_guest_id
        and sw.service_type = 'laundry'
        and sw.dismissed_at >= v_year_start
    ) then
      return false;
    end if;
    
    return true;
  end if;
  
  return false;
end;
$$ language plpgsql stable;

create or replace function public.reset_waivers_for_new_year()
returns table (reset_count integer) as $$
declare
  v_reset_count integer;
begin
  delete from public.service_waivers
  where dismissed_at is not null
    and dismissed_at < date_trunc('year', now())::date;
  get diagnostics v_reset_count = row_count;
  return query select v_reset_count;
end;
$$ language plpgsql;

-- RLS policies for service_waivers
alter table public.service_waivers enable row level security;

-- Allow authenticated and anon users to read waivers (anon needed for Firebase proxy)
drop policy if exists "Authenticated users can view waivers" on public.service_waivers;
create policy "Authenticated users can view waivers"
  on public.service_waivers for select
  to authenticated, anon
  using (true);

-- Allow authenticated and anon users to manage waivers
drop policy if exists "Authenticated users can manage waivers" on public.service_waivers;
create policy "Authenticated users can manage waivers"
  on public.service_waivers for all
  to authenticated, anon
  using (true)
  with check (true);

-- 8. Blocked slots cleanup function (from migration 009)
-- Function to clean up old blocked slots (older than 7 days)
create or replace function public.cleanup_old_blocked_slots()
returns integer as $$
declare
  deleted_count integer;
begin
  delete from public.blocked_slots
  where date::date < current_date - interval '7 days';
  
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$ language plpgsql;

comment on function public.cleanup_old_blocked_slots() is 'Removes blocked slots older than 7 days';

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'checkin' check (role in ('checkin', 'staff', 'admin', 'board', 'bicycle')),
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS for profiles table
alter table public.profiles enable row level security;

-- Users can view all profiles (needed for app functionality)
drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can only update their own profile
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Only allow insert for the user's own profile (typically via trigger on auth.users)
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

-- ============================================
-- 9. SLOT CAPACITY CONSTRAINTS
-- Prevents race conditions when multiple staff book the same slot simultaneously
-- ============================================

-- ATOMIC SHOWER BOOKING RPC
-- Serializes access per slot via advisory lock, checks capacity, inserts.
create or replace function public.book_shower_slot(
    p_guest_id uuid,
    p_scheduled_for date,
    p_scheduled_time text,
    p_status text default 'booked'
)
returns setof public.shower_reservations
language plpgsql
as $$
declare
    v_count integer;
    v_existing_id uuid;
    v_existing_status public.shower_status_enum;
    v_max_capacity constant integer := 2;
begin
    perform pg_advisory_xact_lock(
        hashtext(p_scheduled_for::text || '_' || coalesce(p_scheduled_time, ''))
    );

    select id, status
    into v_existing_id, v_existing_status
    from public.shower_reservations
    where guest_id = p_guest_id
      and scheduled_for = p_scheduled_for
    for update;

    if v_existing_id is not null and v_existing_status not in ('cancelled', 'no_show') then
        raise exception 'This guest already has a shower reservation for this date.';
    end if;

    select count(*) into v_count
    from public.shower_reservations
    where scheduled_for  = p_scheduled_for
      and scheduled_time = p_scheduled_time
      and status in ('booked', 'done')
      and (v_existing_id is null or id <> v_existing_id);

    if v_count >= v_max_capacity then
        raise exception 'This shower slot is full (%/%). Please choose another time.',
            v_count, v_max_capacity;
    end if;

    if v_existing_id is not null then
        return query
        update public.shower_reservations
        set scheduled_time = p_scheduled_time,
            status = p_status::public.shower_status_enum
        where id = v_existing_id
        returning *;
    else
        return query
        insert into public.shower_reservations
            (guest_id, scheduled_for, scheduled_time, status)
        values
            (p_guest_id, p_scheduled_for, p_scheduled_time, p_status::public.shower_status_enum)
        returning *;
    end if;
end;
$$;

comment on function public.book_shower_slot(uuid, date, text, text) is
'Atomically books a shower slot, reusing a cancelled/no-show reservation for the same guest and date.';

-- SHOWER SLOT CAPACITY CONSTRAINT (safety-net trigger)
-- Limits to 2 guests per slot, uses advisory lock for concurrency safety
create or replace function public.check_shower_slot_capacity()
returns trigger as $$
declare
    slot_count integer;
    max_per_slot constant integer := 2;
begin
    if NEW.status not in ('booked', 'done') then
        return NEW;
    end if;

    if NEW.scheduled_time is null then
        return NEW;
    end if;

    perform pg_advisory_xact_lock(
        hashtext(NEW.scheduled_for::text || '_' || NEW.scheduled_time)
    );

    select count(*) into slot_count
    from public.shower_reservations
    where scheduled_for  = NEW.scheduled_for
      and scheduled_time = NEW.scheduled_time
      and status in ('booked', 'done')
      and id != NEW.id;

    if slot_count >= max_per_slot then
        raise exception 'Shower slot % on % is full (%/% taken)',
            NEW.scheduled_time, NEW.scheduled_for, slot_count, max_per_slot;
    end if;

    return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_shower_slot_capacity on public.shower_reservations;
create trigger trg_shower_slot_capacity
before insert or update on public.shower_reservations
for each row execute function public.check_shower_slot_capacity();

comment on function public.check_shower_slot_capacity() is 
'Trigger function to enforce max 2 guests per shower time slot. Uses advisory lock to prevent race conditions.';

-- LAUNDRY SLOT CAPACITY CONSTRAINT  
-- Limits to 2 guests per slot for onsite laundry
create or replace function public.check_laundry_slot_capacity()
returns trigger as $$
declare
    slot_count integer;
    max_capacity integer := 2; -- Configure max guests per laundry slot
begin
    -- Only check for onsite laundry with a slot
    if new.laundry_type = 'onsite' and new.slot_label is not null then
        -- Only check active statuses
        if new.status in ('waiting', 'washer', 'dryer') then
            -- Count existing active bookings for this slot
            select count(*) into slot_count
            from public.laundry_bookings
            where scheduled_for = new.scheduled_for
              and slot_label = new.slot_label
              and laundry_type = 'onsite'
              and status in ('waiting', 'washer', 'dryer')
              and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);
            
            if slot_count >= max_capacity then
                raise exception 'Laundry slot % on % is at full capacity (% of % slots taken)', 
                    new.slot_label, new.scheduled_for, slot_count, max_capacity
                    using errcode = 'P0001';
            end if;
        end if;
    end if;
    
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_laundry_slot_capacity on public.laundry_bookings;
create trigger trg_laundry_slot_capacity
before insert or update on public.laundry_bookings
for each row execute function public.check_laundry_slot_capacity();

comment on function public.check_laundry_slot_capacity() is 
'Trigger function to enforce max 2 guests per laundry time slot for onsite laundry. Prevents race conditions when multiple staff book simultaneously.';

-- HELPER FUNCTION: Get available shower slots
-- Returns slots that have capacity available
create or replace function public.get_available_shower_slots(
    check_date date,
    max_per_slot integer default 2
)
returns table (
    slot_time text,
    current_count bigint,
    available_spots integer
) as $$
begin
    return query
    with all_slots as (
        -- Generate common time slots (7:30 AM to 12:00 PM in 30-min increments)
        select unnest(array[
            '07:30', '08:00', '08:30', '09:00', '09:30', 
            '10:00', '10:30', '11:00', '11:30', '12:00'
        ]) as time_slot
    ),
    booked_slots as (
        select 
            sr.scheduled_time,
            count(*) as booked_count
        from public.shower_reservations sr
        where sr.scheduled_for = check_date
          and sr.status in ('booked', 'done')
          and sr.scheduled_time is not null
        group by sr.scheduled_time
    )
    select 
        all_slots.time_slot as slot_time,
        coalesce(booked_slots.booked_count, 0) as current_count,
        (max_per_slot - coalesce(booked_slots.booked_count, 0))::integer as available_spots
    from all_slots
    left join booked_slots on all_slots.time_slot = booked_slots.scheduled_time
    order by all_slots.time_slot;
end;
$$ language plpgsql;

-- HELPER FUNCTION: Get available laundry slots
-- Returns slots that have capacity available
create or replace function public.get_available_laundry_slots(
    check_date date,
    max_per_slot integer default 2
)
returns table (
    slot_label text,
    current_count bigint,
    available_spots integer
) as $$
begin
    return query
    with all_slots as (
        -- Generate common time slots
        select unnest(array[
            '07:30', '08:00', '08:30', '09:00', '09:30', 
            '10:00', '10:30', '11:00'
        ]) as time_slot
    ),
    booked_slots as (
        select 
            lb.slot_label as slot,
            count(*) as booked_count
        from public.laundry_bookings lb
        where lb.scheduled_for = check_date
          and lb.laundry_type = 'onsite'
          and lb.status in ('waiting', 'washer', 'dryer')
          and lb.slot_label is not null
        group by lb.slot_label
    )
    select 
        all_slots.time_slot as slot_label,
        coalesce(booked_slots.booked_count, 0) as current_count,
        (max_per_slot - coalesce(booked_slots.booked_count, 0))::integer as available_spots
    from all_slots
    left join booked_slots on all_slots.time_slot = booked_slots.slot
    order by all_slots.time_slot;
end;
$$ language plpgsql;

-- ============================================
-- 9b. DAILY NOTES (for operational context in analytics)
-- Stores per-day-per-service notes explaining data anomalies
-- ============================================

create table if not exists public.daily_notes (
  id uuid primary key default gen_random_uuid(),
  note_date date not null,
  note_end_date date,
  service_type text not null check (service_type in ('meals', 'showers', 'laundry', 'general')),
  note_text text not null,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint daily_notes_unique_per_day unique (note_date, service_type),
  constraint daily_notes_end_date_check check (note_end_date is null or note_end_date >= note_date)
);

comment on table public.daily_notes is 'Stores daily operational notes for meals, showers, laundry, and general services to explain data anomalies in reports.';

drop trigger if exists trg_daily_notes_updated_at on public.daily_notes;
create trigger trg_daily_notes_updated_at
before update on public.daily_notes
for each row execute function public.touch_updated_at();

-- Performance indexes
create index if not exists daily_notes_date_idx on public.daily_notes (note_date desc);
create index if not exists daily_notes_service_date_idx on public.daily_notes (service_type, note_date desc);

-- RLS policies
alter table public.daily_notes enable row level security;

drop policy if exists "Authenticated users can view daily notes" on public.daily_notes;
create policy "Authenticated users can view daily notes"
  on public.daily_notes for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage daily notes" on public.daily_notes;
create policy "Authenticated users can manage daily notes"
  on public.daily_notes for all
  to authenticated, anon
  using (true)
  with check (true);

-- ============================================
-- 10. ENABLE REALTIME FOR TABLES
-- Required for Supabase Realtime subscriptions (cross-device sync)
-- Note: If tables are already in the publication, these will error safely
-- ============================================

-- Enable realtime for critical tables
do $$
begin
  -- Add tables to realtime publication if not already added
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'shower_reservations'
  ) then
    alter publication supabase_realtime add table public.shower_reservations;
  end if;
  
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'laundry_bookings'
  ) then
    alter publication supabase_realtime add table public.laundry_bookings;
  end if;
  
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'meal_attendance'
  ) then
    alter publication supabase_realtime add table public.meal_attendance;
  end if;
  
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'bicycle_repairs'
  ) then
    alter publication supabase_realtime add table public.bicycle_repairs;
  end if;
  
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'guests'
  ) then
    alter publication supabase_realtime add table public.guests;
  end if;
  
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'guest_warnings'
  ) then
    alter publication supabase_realtime add table public.guest_warnings;
  end if;
  
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'guest_reminders'
  ) then
    alter publication supabase_realtime add table public.guest_reminders;
  end if;
  
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'daily_notes'
  ) then
    alter publication supabase_realtime add table public.daily_notes;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'blocked_slots'
  ) then
    alter publication supabase_realtime add table public.blocked_slots;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'guest_proxies'
  ) then
    alter publication supabase_realtime add table public.guest_proxies;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'donations'
  ) then
    alter publication supabase_realtime add table public.donations;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'guest_families'
  ) then
    alter publication supabase_realtime add table public.guest_families;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'guest_family_members'
  ) then
    alter publication supabase_realtime add table public.guest_family_members;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'family_meal_distributions'
  ) then
    alter publication supabase_realtime add table public.family_meal_distributions;
  end if;

end $$;

-- 19. Holiday Toy Distribution Program
create table if not exists public.holiday_registrations (
  id uuid primary key default gen_random_uuid(),
  ticket_number serial unique not null,
  event_year integer not null default 2026,
  parent_name text not null check (char_length(parent_name) <= 200),
  phone text not null check (char_length(phone) <= 50),
  city text not null default 'Mountain View' check (char_length(city) <= 100),
  housing_status text not null default 'house_apartment',
  income_range text not null default '0_40k',
  time_slot text not null,
  language text not null default 'en',
  status text not null default 'registered',
  grocery_cards integer not null default 1 check (grocery_cards between 0 and 100),
  teen_cards integer not null default 0 check (teen_cards between 0 and 100),
  notes text check (char_length(notes) <= 2000),
  checked_in_at timestamptz,
  checked_in_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists holiday_registrations_ticket_idx on public.holiday_registrations (ticket_number);
create index if not exists holiday_registrations_slot_idx on public.holiday_registrations (event_year, time_slot);
create index if not exists holiday_registrations_phone_idx on public.holiday_registrations (phone);
create index if not exists holiday_registrations_status_idx on public.holiday_registrations (status);

drop trigger if exists trg_holiday_registrations_updated_at on public.holiday_registrations;
create trigger trg_holiday_registrations_updated_at
before update on public.holiday_registrations
for each row execute function public.touch_updated_at();

create table if not exists public.holiday_children (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.holiday_registrations(id) on delete cascade,
  name text not null check (char_length(name) <= 200),
  birthdate date,
  age integer not null check (age >= 0 and age <= 18),
  school text check (char_length(school) <= 200),
  gender text check (char_length(gender) <= 50),
  age_group text not null,
  created_at timestamptz not null default now()
);

create index if not exists holiday_children_reg_idx on public.holiday_children (registration_id);
create index if not exists holiday_children_age_group_idx on public.holiday_children (age_group);

-- Strict RLS: only service-role server routes can access family and child PII.
alter table public.holiday_registrations enable row level security;
alter table public.holiday_children enable row level security;
alter table public.holiday_registrations force row level security;
alter table public.holiday_children force row level security;

drop policy if exists "Authenticated users can view holiday registrations" on public.holiday_registrations;
drop policy if exists "Authenticated users can manage holiday registrations" on public.holiday_registrations;
drop policy if exists "Authenticated users can view holiday children" on public.holiday_children;
drop policy if exists "Authenticated users can manage holiday children" on public.holiday_children;

revoke all on table public.holiday_registrations, public.holiday_children from public, anon, authenticated;
grant select, insert, update, delete on table public.holiday_registrations, public.holiday_children to service_role;
grant usage, select on sequence public.holiday_registrations_ticket_number_seq to service_role;

-- Shared fixed-window limiter used by the public server route. Client IPs are HMAC-hashed before storage.
create table if not exists public.holiday_registration_rate_limits (
  client_hash text primary key check (client_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0)
);

alter table public.holiday_registration_rate_limits enable row level security;
alter table public.holiday_registration_rate_limits force row level security;
revoke all on table public.holiday_registration_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.holiday_registration_rate_limits to service_role;

create or replace function public.consume_holiday_registration_attempt(p_client_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt_count integer;
begin
  if p_client_hash is null or p_client_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid client hash' using errcode = '22023';
  end if;

  insert into public.holiday_registration_rate_limits (client_hash, window_started_at, attempt_count)
  values (p_client_hash, clock_timestamp(), 1)
  on conflict (client_hash) do update
  set
    attempt_count = case
      when public.holiday_registration_rate_limits.window_started_at <= clock_timestamp() - interval '5 minutes' then 1
      else public.holiday_registration_rate_limits.attempt_count + 1
    end,
    window_started_at = case
      when public.holiday_registration_rate_limits.window_started_at <= clock_timestamp() - interval '5 minutes'
        then clock_timestamp()
      else public.holiday_registration_rate_limits.window_started_at
    end
  returning attempt_count into v_attempt_count;

  return v_attempt_count <= 10;
end;
$$;

revoke all on function public.consume_holiday_registration_attempt(text) from public, anon, authenticated;
grant execute on function public.consume_holiday_registration_attempt(text) to service_role;

-- Public read-only slot capacities RPC (prevents exposing raw rows to anon)
create or replace function public.get_holiday_slot_capacities(
  p_event_year integer default 2026
)
returns table (
  time_slot text,
  booked_count bigint
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    time_slot,
    count(*)::bigint as booked_count
  from public.holiday_registrations
  where event_year = coalesce(p_event_year, 2026)
    and status != 'cancelled'
  group by time_slot;
$$;

revoke all on function public.get_holiday_slot_capacities(integer) from public, anon, authenticated;
grant execute on function public.get_holiday_slot_capacities(integer) to service_role;

-- Atomic transactional registration RPC: auto-assigns next open slot, locks capacity, and creates parent + children
create or replace function public.register_holiday_family(
  p_parent_name text,
  p_phone text,
  p_city text,
  p_housing_status text default 'house_apartment',
  p_income_range text default '0_40k',
  p_time_slot text default null,
  p_language text default 'en',
  p_children jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_event_year constant integer := 2026;
  c_max_per_slot constant integer := 16;
  v_assigned_slot text := trim(coalesce(p_time_slot, ''));
  v_slot_count integer;
  v_slots text[] := array[
    '09:00 AM - 09:20 AM',
    '09:20 AM - 09:40 AM',
    '09:40 AM - 10:00 AM',
    '10:00 AM - 10:20 AM',
    '10:20 AM - 10:40 AM',
    '10:40 AM - 11:00 AM',
    '11:00 AM - 11:20 AM',
    '11:20 AM - 11:40 AM',
    '11:40 AM - 12:00 PM',
    '12:00 PM - 12:20 PM',
    '12:20 PM - 12:40 PM',
    '12:40 PM - 01:00 PM',
    '01:00 PM - 01:20 PM',
    '01:20 PM - 01:40 PM',
    '01:40 PM - 02:00 PM'
  ];
  v_slot_item text;
  v_grocery_cards integer := 0;
  v_teen_cards integer := 0;
  v_child jsonb;
  v_child_age integer;
  v_child_name text;
  v_child_group text;
  v_reg_id uuid;
  v_ticket_number integer;
  v_created_at timestamptz;
  v_updated_at timestamptz;
  v_inserted_children jsonb := '[]'::jsonb;
  v_child_record record;
begin
  if p_parent_name is null or trim(p_parent_name) = '' then
    raise exception 'Parent/Guardian name is required' using errcode = '22023';
  end if;
  if p_phone is null or trim(p_phone) = '' then
    raise exception 'Phone number is required' using errcode = '22023';
  end if;
  if p_city is null or trim(p_city) = '' then
    raise exception 'City is required' using errcode = '22023';
  end if;
  if jsonb_array_length(p_children) = 0 then
    raise exception 'At least one child is required' using errcode = '22023';
  end if;
  if jsonb_array_length(p_children) > 20 then
    raise exception 'No more than 20 children may be registered' using errcode = '22023';
  end if;
  if char_length(p_parent_name) > 200 or char_length(p_phone) > 50 or char_length(p_city) > 100 then
    raise exception 'Registration field is too long' using errcode = '22023';
  end if;

  -- Validate slot against allowed slots if specified
  if v_assigned_slot != '' and not (v_assigned_slot = any(v_slots)) then
    raise exception 'INVALID_TIME_SLOT' using errcode = '22023';
  end if;

  -- Transaction-level advisory lock prevents concurrent overbooking
  perform pg_advisory_xact_lock(hashtext('holiday_registration_' || c_event_year::text));

  -- Auto-assign next chronological slot with capacity < c_max_per_slot if slot omitted
  if v_assigned_slot = '' then
    foreach v_slot_item in array v_slots loop
      select count(*)
      into v_slot_count
      from public.holiday_registrations
      where event_year = c_event_year
        and time_slot = v_slot_item
        and status != 'cancelled';

      if v_slot_count < c_max_per_slot then
        v_assigned_slot := v_slot_item;
        exit;
      end if;
    end loop;

    if v_assigned_slot = '' then
      raise exception 'ALL_SLOTS_FULL' using errcode = 'P0001';
    end if;
  else
    -- Verify requested slot capacity
    select count(*)
    into v_slot_count
    from public.holiday_registrations
    where event_year = c_event_year
      and time_slot = v_assigned_slot
      and status != 'cancelled';

    if v_slot_count >= c_max_per_slot then
      raise exception 'SLOT_FULL' using errcode = 'P0001';
    end if;
  end if;

  -- Card entitlement logic
  if jsonb_array_length(p_children) > 0 then
    v_grocery_cards := 1;
  end if;

  for v_child in select * from jsonb_array_elements(p_children) loop
    v_child_age := (v_child->>'age')::integer;
    if v_child_age >= 14 and v_child_age <= 18 then
      v_teen_cards := v_teen_cards + 1;
    end if;
  end loop;

  -- Insert registration record
  insert into public.holiday_registrations (
    event_year,
    parent_name,
    phone,
    city,
    housing_status,
    income_range,
    time_slot,
    language,
    status,
    grocery_cards,
    teen_cards
  ) values (
    c_event_year,
    trim(p_parent_name),
    trim(p_phone),
    trim(p_city),
    coalesce(nullif(trim(p_housing_status), ''), 'house_apartment'),
    coalesce(nullif(trim(p_income_range), ''), '0_40k'),
    v_assigned_slot,
    coalesce(nullif(trim(p_language), ''), 'en'),
    'registered',
    v_grocery_cards,
    v_teen_cards
  )
  returning id, ticket_number, created_at, updated_at
  into v_reg_id, v_ticket_number, v_created_at, v_updated_at;

  -- Insert children atomically
  for v_child in select * from jsonb_array_elements(p_children) loop
    v_child_name := trim(v_child->>'name');
    v_child_age := (v_child->>'age')::integer;

    if v_child_name is null or v_child_name = '' then
      raise exception 'Child name is required' using errcode = '22023';
    end if;
    if v_child_age is null or v_child_age < 0 or v_child_age > 18 then
      raise exception 'Child age must be 18 or younger' using errcode = '22023';
    end if;

    if v_child_age <= 1 then v_child_group := 'infant';
    elsif v_child_age <= 4 then v_child_group := 'toddler';
    elsif v_child_age <= 12 then v_child_group := 'child';
    elsif v_child_age = 13 then v_child_group := 'teen_13';
    elsif v_child_age = 14 then v_child_group := 'teen_14';
    elsif v_child_age = 15 then v_child_group := 'teen_15';
    else v_child_group := 'teen_16_18';
    end if;

    insert into public.holiday_children (
      registration_id,
      name,
      birthdate,
      age,
      school,
      gender,
      age_group
    ) values (
      v_reg_id,
      v_child_name,
      case when nullif(v_child->>'birthdate', '') is not null then (v_child->>'birthdate')::date else null end,
      v_child_age,
      nullif(trim(v_child->>'school'), ''),
      nullif(trim(v_child->>'gender'), ''),
      v_child_group
    )
    returning id, name, birthdate, age, school, gender, age_group, created_at
    into v_child_record;

    v_inserted_children := v_inserted_children || jsonb_build_object(
      'id', v_child_record.id,
      'registrationId', v_reg_id,
      'name', v_child_record.name,
      'birthdate', v_child_record.birthdate,
      'age', v_child_record.age,
      'school', v_child_record.school,
      'gender', v_child_record.gender,
      'ageGroup', v_child_record.age_group,
      'createdAt', v_child_record.created_at
    );
  end loop;

  return jsonb_build_object(
    'id', v_reg_id,
    'ticketNumber', v_ticket_number,
    'eventYear', c_event_year,
    'parentName', trim(p_parent_name),
    'phone', trim(p_phone),
    'city', trim(p_city),
    'housingStatus', coalesce(nullif(trim(p_housing_status), ''), 'house_apartment'),
    'incomeRange', coalesce(nullif(trim(p_income_range), ''), '0_40k'),
    'timeSlot', v_assigned_slot,
    'language', coalesce(nullif(trim(p_language), ''), 'en'),
    'status', 'registered',
    'groceryCards', v_grocery_cards,
    'teenCards', v_teen_cards,
    'children', v_inserted_children,
    'createdAt', v_created_at,
    'updatedAt', v_updated_at
  );
end;
$$;

revoke all on function public.register_holiday_family(text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.register_holiday_family(text, text, text, text, text, text, text, jsonb) to service_role;

create or replace function public.reset_holiday_ticket_counter(
  p_clear_registrations boolean default true,
  p_target_number integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_event_year constant integer := 2026;
  v_seq_name text;
  v_deleted_count integer := 0;
  v_target integer := greatest(1, coalesce(p_target_number, 1));
begin
  if p_clear_registrations then
    with deleted as (
      delete from public.holiday_registrations
      where event_year = c_event_year
      returning id
    )
    select count(*) into v_deleted_count from deleted;

    delete from public.holiday_registration_rate_limits;
  end if;

  v_seq_name := pg_get_serial_sequence('public.holiday_registrations', 'ticket_number');

  if v_seq_name is not null then
    perform setval(v_seq_name, v_target, false);
  end if;

  return jsonb_build_object(
    'success', true,
    'deletedRegistrations', v_deleted_count,
    'nextTicketNumber', v_target
  );
end;
$$;

revoke all on function public.reset_holiday_ticket_counter(boolean, integer) from public, anon, authenticated;
grant execute on function public.reset_holiday_ticket_counter(boolean, integer) to service_role;

-- Staff family edit RPC: update parent info and replace children for a
-- registration that has not checked in yet. Ticket number, time slot, and
-- check-in state are never changed. Card entitlements are recalculated.
create or replace function public.update_holiday_family(
  p_registration_id uuid,
  p_parent_name text,
  p_phone text,
  p_city text,
  p_housing_status text default 'house_apartment',
  p_income_range text default '0_40k',
  p_language text default 'en',
  p_children jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reg record;
  v_grocery_cards integer := 0;
  v_teen_cards integer := 0;
  v_child jsonb;
  v_child_age integer;
  v_child_name text;
  v_child_group text;
  v_inserted_children jsonb := '[]'::jsonb;
  v_child_record record;
  v_updated_at timestamptz;
begin
  if p_registration_id is null then
    raise exception 'REGISTRATION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_parent_name is null or trim(p_parent_name) = '' then
    raise exception 'Parent/Guardian name is required' using errcode = '22023';
  end if;
  if p_phone is null or trim(p_phone) = '' then
    raise exception 'Phone number is required' using errcode = '22023';
  end if;
  if p_city is null or trim(p_city) = '' then
    raise exception 'City is required' using errcode = '22023';
  end if;
  if p_children is null or jsonb_array_length(p_children) = 0 then
    raise exception 'At least one child is required' using errcode = '22023';
  end if;
  if jsonb_array_length(p_children) > 20 then
    raise exception 'No more than 20 children may be registered' using errcode = '22023';
  end if;
  if char_length(p_parent_name) > 200 or char_length(p_phone) > 50 or char_length(p_city) > 100 then
    raise exception 'Registration field is too long' using errcode = '22023';
  end if;

  select *
  into v_reg
  from public.holiday_registrations
  where id = p_registration_id
  for update;

  if not found then
    raise exception 'REGISTRATION_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_reg.status != 'registered' then
    raise exception 'ALREADY_CHECKED_IN' using errcode = 'P0001';
  end if;

  -- Card entitlement logic (same as registration)
  if jsonb_array_length(p_children) > 0 then
    v_grocery_cards := 1;
  end if;

  for v_child in select * from jsonb_array_elements(p_children) loop
    v_child_age := (v_child->>'age')::integer;
    if v_child_age >= 14 and v_child_age <= 18 then
      v_teen_cards := v_teen_cards + 1;
    end if;
  end loop;

  update public.holiday_registrations
  set
    parent_name = trim(p_parent_name),
    phone = trim(p_phone),
    city = trim(p_city),
    housing_status = coalesce(nullif(trim(p_housing_status), ''), 'house_apartment'),
    income_range = coalesce(nullif(trim(p_income_range), ''), '0_40k'),
    language = coalesce(nullif(trim(p_language), ''), 'en'),
    grocery_cards = v_grocery_cards,
    teen_cards = v_teen_cards,
    updated_at = now()
  where id = p_registration_id
  returning updated_at
  into v_updated_at;

  delete from public.holiday_children
  where registration_id = p_registration_id;

  for v_child in select * from jsonb_array_elements(p_children) loop
    v_child_name := trim(v_child->>'name');
    v_child_age := (v_child->>'age')::integer;

    if v_child_name is null or v_child_name = '' then
      raise exception 'Child name is required' using errcode = '22023';
    end if;
    if v_child_age is null or v_child_age < 0 or v_child_age > 18 then
      raise exception 'Child age must be 18 or younger' using errcode = '22023';
    end if;

    if v_child_age <= 1 then v_child_group := 'infant';
    elsif v_child_age <= 4 then v_child_group := 'toddler';
    elsif v_child_age <= 12 then v_child_group := 'child';
    elsif v_child_age = 13 then v_child_group := 'teen_13';
    elsif v_child_age = 14 then v_child_group := 'teen_14';
    elsif v_child_age = 15 then v_child_group := 'teen_15';
    else v_child_group := 'teen_16_18';
    end if;

    insert into public.holiday_children (
      registration_id,
      name,
      birthdate,
      age,
      school,
      gender,
      age_group
    ) values (
      p_registration_id,
      v_child_name,
      case when nullif(v_child->>'birthdate', '') is not null then (v_child->>'birthdate')::date else null end,
      v_child_age,
      nullif(trim(v_child->>'school'), ''),
      nullif(trim(v_child->>'gender'), ''),
      v_child_group
    )
    returning id, name, birthdate, age, school, gender, age_group, created_at
    into v_child_record;

    v_inserted_children := v_inserted_children || jsonb_build_object(
      'id', v_child_record.id,
      'registrationId', p_registration_id,
      'name', v_child_record.name,
      'birthdate', v_child_record.birthdate,
      'age', v_child_record.age,
      'school', v_child_record.school,
      'gender', v_child_record.gender,
      'ageGroup', v_child_record.age_group,
      'createdAt', v_child_record.created_at
    );
  end loop;

  return jsonb_build_object(
    'id', p_registration_id,
    'ticketNumber', v_reg.ticket_number,
    'eventYear', v_reg.event_year,
    'parentName', trim(p_parent_name),
    'phone', trim(p_phone),
    'city', trim(p_city),
    'housingStatus', coalesce(nullif(trim(p_housing_status), ''), 'house_apartment'),
    'incomeRange', coalesce(nullif(trim(p_income_range), ''), '0_40k'),
    'timeSlot', v_reg.time_slot,
    'language', coalesce(nullif(trim(p_language), ''), 'en'),
    'status', 'registered',
    'groceryCards', v_grocery_cards,
    'teenCards', v_teen_cards,
    'notes', v_reg.notes,
    'children', v_inserted_children,
    'createdAt', v_reg.created_at,
    'updatedAt', v_updated_at
  );
end;
$$;

revoke all on function public.update_holiday_family(uuid, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.update_holiday_family(uuid, text, text, text, text, text, text, jsonb) to service_role;
