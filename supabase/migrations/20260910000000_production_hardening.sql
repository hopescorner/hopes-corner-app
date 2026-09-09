-- Production hardening for meal check-in, shower, and laundry (Critical 1-7).
--
-- C1. Blocked slots were UI-advisory only: neither book_shower_slot() nor any
--     laundry write path consulted blocked_slots, so stale stores, backfill
--     forms, or raw SQL could book into a blocked slot. Enforce server-side
--     with BEFORE triggers on both tables plus an explicit check in the
--     shower RPC (deterministic SLOT_BLOCKED error precedence over full-slot).
-- C2. database/schema.sql carried TWO check_laundry_slot_capacity definitions
--     (max 1 over 5 statuses vs max 2 over 3 statuses); the second wins on
--     fresh builds and contradicts the app constant (1). Canonicalize to
--     max 1 over (waiting, washer, dryer, done, picked_up) with the advisory
--     lock from the concurrency-hardening migration.
-- C3. ensure_guest_not_banned() fired on every INSERT/UPDATE with no status
--     exemption, so once a guest was banned their open bookings could never
--     be closed out (done/cancelled raised and rolled back). Closing
--     transitions are now exempt.
-- C4. execute_checkin_meal_command() had no picker parameter: proxy meals on
--     the Check-In page were stored with picked_up_by_guest_id = NULL and the
--     picker never got a lunch bag. Accept p_picked_up_by_guest_id, persist
--     it, and grant the picker a bag under the same dedup-key scheme.
--
-- All statements are idempotent (CREATE OR REPLACE / DROP IF EXISTS) so the
-- migration is safe to replay.

-- ────────────────────────────────────────────────────────────────────────────
-- C2. Canonical onsite laundry slot capacity: 1 guest per slot.
-- ────────────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────────────
-- C1. Blocked-slot enforcement (server-side, all write paths).
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.check_shower_blocked_slot()
returns trigger as $$
begin
  if NEW.scheduled_time is null then
    return NEW;
  end if;
  -- Closing out or voiding a booking must never be blocked: otherwise
  -- End-of-Day cancel on a blocked slot would fail and roll back.
  if NEW.status in ('cancelled', 'no_show', 'waitlisted') then
    return NEW;
  end if;
  if exists (
    select 1 from public.blocked_slots
    where date = NEW.scheduled_for::text
      and service_type = 'shower'
      and slot_time = NEW.scheduled_time
  ) then
    raise exception 'SLOT_BLOCKED: Shower slot % on % is blocked',
      NEW.scheduled_time, NEW.scheduled_for;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_shower_blocked_slot on public.shower_reservations;
create trigger trg_shower_blocked_slot
  before insert or update of status, scheduled_time, scheduled_for
  on public.shower_reservations
  for each row execute function public.check_shower_blocked_slot();

create or replace function public.check_laundry_blocked_slot()
returns trigger as $$
begin
  if NEW.slot_label is null then
    return NEW;
  end if;
  if NEW.status in ('cancelled', 'no_show', 'waitlisted') then
    return NEW;
  end if;
  if exists (
    select 1 from public.blocked_slots
    where date = NEW.scheduled_for::text
      and service_type = 'laundry'
      and slot_time = NEW.slot_label
  ) then
    raise exception 'SLOT_BLOCKED: Laundry slot % on % is blocked',
      NEW.slot_label, NEW.scheduled_for;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_laundry_blocked_slot on public.laundry_bookings;
create trigger trg_laundry_blocked_slot
  before insert or update of status, slot_label, scheduled_for, laundry_type
  on public.laundry_bookings
  for each row execute function public.check_laundry_blocked_slot();

-- Explicit blocked check in the shower RPC so callers get SLOT_BLOCKED
-- (not slot-full) when both apply.
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

    if p_scheduled_time is not null and exists (
        select 1 from public.blocked_slots
        where date = p_scheduled_for::text
          and service_type = 'shower'
          and slot_time = p_scheduled_time
    ) then
        raise exception 'SLOT_BLOCKED: Shower slot % on % is blocked',
            p_scheduled_time, p_scheduled_for;
    end if;

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
    where scheduled_for = p_scheduled_for
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
'Atomically books a shower slot, reusing a cancelled/no-show reservation for the same guest and date. Rejects blocked slots with SLOT_BLOCKED.';

-- ────────────────────────────────────────────────────────────────────────────
-- C3. Ban guard: closing transitions are exempt.
-- ────────────────────────────────────────────────────────────────────────────
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
  closing_status text;
begin
  -- Closing out a booking (cancel / no-show / completion / pickup) must
  -- never be blocked by a ban recorded after the booking was made.
  -- Otherwise a newly-banned guest's rows are stuck open forever because
  -- every status update raises and rolls back (including End-of-Day).
  -- Tables without a status column (e.g. meal_attendance) yield NULL here
  -- and fall through to the normal ban check below.
  if TG_OP = 'UPDATE' then
    closing_status := to_jsonb(NEW)->>'status';
    if closing_status in ('cancelled', 'no_show', 'done', 'picked_up', 'offsite_picked_up', 'returned') then
      return NEW;
    end if;
  end if;

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

-- ────────────────────────────────────────────────────────────────────────────
-- C4. Meal command: record the proxy picker and grant the picker a bag.
-- ────────────────────────────────────────────────────────────────────────────
drop function if exists public.execute_checkin_meal_command(uuid, date, smallint, boolean, text);

create or replace function public.execute_checkin_meal_command(
  p_guest_id uuid,
  p_service_date date,
  p_quantity smallint,
  p_extra boolean,
  p_idempotency_key text,
  p_picked_up_by_guest_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_response jsonb;
  base_count integer;
  extra_count integer;
  target_record_id uuid;
  auto_additions_enabled boolean;
  result jsonb;
begin
  if p_quantity < 1 or p_quantity > 2 or length(trim(p_idempotency_key)) = 0 then
    raise exception 'INVALID_MEAL_COMMAND';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_guest_id::text || ':' || p_service_date::text, 0));

  select response into existing_response
  from public.checkin_command_receipts
  where idempotency_key = p_idempotency_key;
  if existing_response is not null then
    return existing_response || jsonb_build_object('idempotent', true);
  end if;

  select
    coalesce(sum(quantity) filter (where meal_type = 'guest'), 0)::integer,
    coalesce(sum(quantity) filter (where meal_type = 'extra'), 0)::integer
  into base_count, extra_count
  from public.meal_attendance
  where guest_id = p_guest_id and served_on = p_service_date;

  if (p_extra and (extra_count + p_quantity > 2 or base_count + extra_count + p_quantity > 4))
     or (not p_extra and (base_count + p_quantity > 2 or base_count + extra_count + p_quantity > 4)) then
    raise exception 'MEAL_LIMIT_REACHED';
  end if;

  if p_extra then
    insert into public.meal_attendance (guest_id, meal_type, quantity, served_on, recorded_at, deduplication_key, picked_up_by_guest_id)
    values (p_guest_id, 'extra', p_quantity, p_service_date, now(), p_idempotency_key, p_picked_up_by_guest_id)
    returning id into target_record_id;
    extra_count := extra_count + p_quantity;
  else
    select id into target_record_id
    from public.meal_attendance
    where guest_id = p_guest_id and served_on = p_service_date and meal_type = 'guest'
    limit 1;

    if target_record_id is null then
      insert into public.meal_attendance (guest_id, meal_type, quantity, served_on, recorded_at, picked_up_by_guest_id)
      values (p_guest_id, 'guest', p_quantity, p_service_date, now(), p_picked_up_by_guest_id)
      returning id into target_record_id;
    else
      update public.meal_attendance
      set quantity = quantity + p_quantity,
          recorded_at = now(),
          picked_up_by_guest_id = coalesce(picked_up_by_guest_id, p_picked_up_by_guest_id)
      where id = target_record_id;
    end if;
    base_count := base_count + p_quantity;
  end if;

  -- One lunch bag per person per service day. Attempted on every meal command
  -- (base or extra) rather than only on the first guest-meal insert; the unique
  -- deduplication_key guarantees at most one bag per guest per day. Fridays are
  -- excluded, matching the client-side rule. The proxy picker earns their own
  -- bag under the same key scheme, so collecting for a buddy never costs the
  -- picker their bag and never grants a second one.
  if extract(dow from p_service_date) <> 5 then
    select auto_meal_additions_enabled into auto_additions_enabled
    from public.app_settings
    where id = 'global';

    if coalesce(auto_additions_enabled, true) then
      insert into public.meal_attendance (guest_id, meal_type, quantity, served_on, recorded_at, notes, deduplication_key)
      values (
        p_guest_id, 'lunch_bag', 1, p_service_date, now(), 'Auto-added with meal',
        'lunch_bag_auto_' || p_guest_id || '_' || p_service_date
      )
      on conflict (deduplication_key) do nothing;

      if p_picked_up_by_guest_id is not null and p_picked_up_by_guest_id <> p_guest_id then
        insert into public.meal_attendance (guest_id, meal_type, quantity, served_on, recorded_at, notes, deduplication_key)
        values (
          p_picked_up_by_guest_id, 'lunch_bag', 1, p_service_date, now(), 'Auto-added for proxy pickup',
          'lunch_bag_auto_' || p_picked_up_by_guest_id || '_' || p_service_date
        )
        on conflict (deduplication_key) do nothing;
      end if;
    end if;
  end if;

  result := jsonb_build_object(
    'guest_id', p_guest_id,
    'record_id', target_record_id,
    'meal_count', base_count,
    'extra_meal_count', extra_count,
    'idempotent', false
  );

  insert into public.checkin_command_receipts (idempotency_key, command_type, response)
  values (p_idempotency_key, case when p_extra then 'meal.extra' else 'meal.add' end, result);

  return result;
end;
$$;

revoke all on function public.execute_checkin_meal_command(uuid, date, smallint, boolean, text, uuid) from public, anon, authenticated;
grant execute on function public.execute_checkin_meal_command(uuid, date, smallint, boolean, text, uuid) to service_role;
