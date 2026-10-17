-- Fix ensure_guest_not_banned() proxy-pickup waiver blocking ALL non-meal writes.
--
-- The 20261015000000 migration added a proxy-pickup early return that reads
-- NEW.picked_up_by_guest_id directly. This function is a shared BEFORE trigger
-- on meal_attendance, shower_reservations, laundry_bookings, bicycle_repairs,
-- haircut_visits, holiday_visits, and items_distributed -- but only
-- meal_attendance has a picked_up_by_guest_id column. Every INSERT/UPDATE on
-- any other table therefore fails with:
--
--   42703: record "new" has no field "picked_up_by_guest_id"
--
-- which the app surfaces as "Unable to book shower slot. Please try again."
-- (and the laundry equivalent), blocking all shower/laundry/bicycle/haircut/
-- holiday/items writes while meals keep working.
--
-- Fix: read the meal-only column via to_jsonb(NEW), which is safe on every
-- table (missing key yields NULL instead of raising). Semantics are unchanged:
-- proxy pickups (picked_up_by_guest_id distinct from guest_id) on
-- meal_attendance still bypass the recipient's ban; everything else falls
-- through to the normal shelter/ban checks below.
--
-- Idempotent (CREATE OR REPLACE) and data-preserving: only the trigger
-- function body changes, no rows are touched.

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
  shelter_guest boolean;
  has_program_specific boolean;
  all_programs_banned boolean;
  normalized_service text;
  formatted_until text;
  service_label text;
  closing_status text;
begin
  -- A buddy (proxy picker) may pick up meals for a linked guest even when
  -- that linked guest is banned from meals or from all services. Row-level
  -- custody is recorded via picked_up_by_guest_id, so the recipient's ban does
  -- not apply to proxy meal pickups.
  -- NOTE: to_jsonb(NEW) access is required here because this is a shared
  -- trigger function and only meal_attendance has a picked_up_by_guest_id
  -- column. Direct NEW.picked_up_by_guest_id access raises 42703 on every
  -- other table and blocks all of its writes.
  if TG_TABLE_NAME = 'meal_attendance'
     and TG_OP in ('INSERT', 'UPDATE')
     and (to_jsonb(NEW)->>'picked_up_by_guest_id') is not null
     and (to_jsonb(NEW)->>'picked_up_by_guest_id') is distinct from (to_jsonb(NEW)->>'guest_id') then
    return new;
  end if;
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
         g.banned_from_shower, g.banned_from_laundry, g.shelter_guest
    into ban_until, ban_reason, guest_name,
         bicycle_ban, meal_ban, shower_ban, laundry_ban, shelter_guest
  from public.guests g
  where g.id = new.guest_id;

  service_label := CASE WHEN TG_NARGS > 0 THEN TG_ARGV[0] ELSE NULL END;
  normalized_service := lower(trim(coalesce(service_label, '')));

  if coalesce(shelter_guest, false) and normalized_service in ('shower', 'showers', 'shower booking', 'shower bookings', 'laundry', 'laundry booking', 'laundry bookings') then
    raise exception using
      message = format(
        'Guest %s is enrolled as a shelter guest and cannot book shower or laundry services.',
        coalesce(guest_name, new.guest_id::text)
      ),
      detail = 'Shower and laundry services provided at shelter.',
      hint = 'Remove the shelter guest designation to book these services.';
  end if;

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

  all_programs_banned := coalesce(bicycle_ban, false)
    and coalesce(meal_ban, false)
    and coalesce(shower_ban, false)
    and coalesce(laundry_ban, false);

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
      if all_programs_banned then
        raise exception using
          message = format(
            'Guest %s is banned from services until %s',
            coalesce(guest_name, new.guest_id::text),
            formatted_until
          ),
          detail = coalesce(ban_reason, ''),
          hint = 'Update the guest''s ban settings or wait until it expires.';
      end if;
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
