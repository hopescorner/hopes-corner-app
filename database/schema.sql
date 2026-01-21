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
      'waiting','washer','dryer','done','picked_up','pending','transported','returned','offsite_picked_up'
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
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'la_plaza_category_enum') THEN
    CREATE TYPE public.la_plaza_category_enum AS enum (
      'Bakery', 'Beverages', 'Dairy', 'Meat', 'Mix', 'Nonfood', 'Prepared/Perishable', 'Produce'
    );
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

-- Helps enforce max 2 per slot via app logic (query count per slot); add a check trigger later if you prefer
create index if not exists shower_slot_idx
  on public.shower_reservations (scheduled_for, scheduled_time);

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
  created_at timestamptz not null default now()
);

drop trigger if exists trg_holiday_visits_ban_guard on public.holiday_visits;
create trigger trg_holiday_visits_ban_guard
before insert or update on public.holiday_visits
for each row execute function public.ensure_guest_not_banned('holiday');

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

-- 6. La Plaza Market donation records (separate table for partner donations)
create table if not exists public.la_plaza_donations (
  id uuid primary key default gen_random_uuid(),
  category public.la_plaza_category_enum not null,
  weight_lbs numeric(8,3) not null,
  notes text,
  received_at timestamptz not null default now(),
  date_key date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_la_plaza_donations_updated_at on public.la_plaza_donations;
create trigger trg_la_plaza_donations_updated_at
before update on public.la_plaza_donations
for each row execute function public.touch_updated_at();

-- Function to compute date_key from received_at timestamp in Pacific timezone
-- Only sets date_key if not already provided (client can send it explicitly)
create or replace function public.set_la_plaza_donation_date_key()
returns trigger as $$
begin
  -- Only compute if date_key is not already set
  if new.date_key is null then
    new.date_key := (new.received_at at time zone 'America/Los_Angeles')::date;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_la_plaza_donations_set_date_key on public.la_plaza_donations;
create trigger trg_la_plaza_donations_set_date_key
before insert or update on public.la_plaza_donations
for each row execute function public.set_la_plaza_donation_date_key();

create index if not exists la_plaza_donations_date_key_idx
  on public.la_plaza_donations (date_key desc);

create index if not exists la_plaza_donations_received_at_idx
  on public.la_plaza_donations (received_at desc);

-- RLS for la_plaza_donations table
alter table public.la_plaza_donations enable row level security;

drop policy if exists "Authenticated users can view la plaza donations" on public.la_plaza_donations;
create policy "Authenticated users can view la plaza donations"
  on public.la_plaza_donations for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage la plaza donations" on public.la_plaza_donations;
create policy "Authenticated users can manage la plaza donations"
  on public.la_plaza_donations for all
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
  role text not null default 'checkin' check (role in ('checkin', 'staff', 'admin', 'board')),
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
