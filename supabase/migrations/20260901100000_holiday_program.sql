-- Holiday Toy & Gift Distribution Program
-- Creates registrations and children tables, strict RLS, durable rate limiting, and atomic registration RPCs

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
      raise exception 'Child age must be between 0 and 18' using errcode = '22023';
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
