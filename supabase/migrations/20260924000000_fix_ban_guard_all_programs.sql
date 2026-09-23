-- Fix ensure_guest_not_banned() for unflagged services (haircut, holiday, items).
--
-- Before: any program-specific ban (e.g. showers only) fell through to
-- `else return new` for unflagged services, which was correct, but a ban
-- covering all four flagged programs ALSO fell through and allowed
-- haircut/holiday. The UI created "blanket" bans by setting all four flags,
-- so a blanket ban did not block haircut/holiday server-side.
--
-- After: single-program bans still allow haircut/holiday/items, but when all
-- four flags are set the guard raises like a blanket ban. This matches the
-- UI, which blocks haircut/holiday only when isAllProgramsBanned is true.

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
  all_programs_banned boolean;
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

  -- Haircut/holiday/items have no per-program flags, so a ban covering all
  -- four flagged programs must behave like a blanket ban for them.
  all_programs_banned := coalesce(bicycle_ban, false)
    and coalesce(meal_ban, false)
    and coalesce(shower_ban, false)
    and coalesce(laundry_ban, false);

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
      -- Services without per-program flags (haircut, holiday, items, ...):
      -- allow single-program bans, block only when all four are banned.
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
