-- Fix shower and laundry booking failures caused by ensure_guest_not_banned()
-- querying g.shelter_guest when the column may not yet exist in production.
--
-- Root cause: migration 20261014000000 added shelter_guest to guests and
-- updated ensure_guest_not_banned() to SELECT g.shelter_guest in the same
-- transaction. If the column was never created (e.g. partial failure, lock
-- timeout, or ordering issue between environments), the trigger body
-- references a column that does not exist.  Every subsequent INSERT/UPDATE on
-- shower_reservations or laundry_bookings then raises PostgreSQL error 42703
-- (undefined_column), which the app surfaces as the generic
-- "Unable to book shower slot. Please try again." message.
--
-- Fix: guarantee shelter_guest exists. Once the column is present the trigger
-- function (unchanged in logic) works correctly.  Re-create it here so that
-- environments which previously failed to apply it get the correct body.

-- Step 1: ensure the column is present (no-op if already applied).
alter table public.guests
  add column if not exists shelter_guest boolean not null default false;

-- Step 2: re-create the trigger function.  This is identical in logic to the
-- version in migration 20261015000000 but is re-applied here to guarantee
-- every environment has the correct, up-to-date body regardless of which
-- earlier migrations succeeded or partially failed.
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
  -- custody is recorded via picked_up_by_guest_id, so the recipient's ban
  -- does not apply to proxy meal pickups.
  if TG_TABLE_NAME = 'meal_attendance'
     and TG_OP in ('INSERT', 'UPDATE')
     and new.picked_up_by_guest_id is not null
     and new.picked_up_by_guest_id is distinct from new.guest_id then
    return new;
  end if;

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

  -- Haircut/holiday/items have no per-program flags, so a ban covering all
  -- four flagged programs must behave like a blanket ban for them.
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
