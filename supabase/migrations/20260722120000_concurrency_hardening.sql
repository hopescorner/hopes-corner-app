-- Multi-device concurrency hardening. Several invariants were enforced only
-- against client-side (possibly stale) store state, so two staff devices
-- acting in parallel could violate them. This migration makes the database
-- authoritative for each one.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. One guest-meal row per guest per service day.
--    database/schema.sql declares meal_attendance_guest_unique, but the index
--    was never shipped as a migration, so incrementally-migrated databases may
--    lack it. Merge any duplicate rows (summing quantities into the earliest
--    row) before creating it.
-- ────────────────────────────────────────────────────────────────────────────
update public.meal_attendance m
set quantity = agg.total_qty
from (
  select
    (array_agg(id order by created_at, id))[1] as keeper_id,
    sum(quantity) as total_qty
  from public.meal_attendance
  where meal_type = 'guest' and guest_id is not null
  group by guest_id, served_on
  having count(*) > 1
) agg
where m.id = agg.keeper_id;

delete from public.meal_attendance m
using (
  select unnest((array_agg(id order by created_at, id))[2:]) as dup_id
  from public.meal_attendance
  where meal_type = 'guest' and guest_id is not null
  group by guest_id, served_on
  having count(*) > 1
) d
where m.id = d.dup_id;

create unique index if not exists meal_attendance_guest_unique
  on public.meal_attendance (guest_id, served_on)
  where meal_type = 'guest';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Daily meal limits (2 base, 2 extra, 4 total per guest per day) enforced
--    in the database. The check-in RPC already enforces these under an
--    advisory lock, but the Services-page client path checked only local
--    state. The trigger uses the same lock key as the RPC so the two paths
--    serialize against each other (advisory xact locks are reentrant, so the
--    RPC taking the lock first is fine).
-- ────────────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────────────
-- 3. One holiday visit per guest per day. holiday_visits had no uniqueness at
--    all, so double-taps or parallel devices created unlimited duplicates.
--    Remove existing duplicates (keeping the earliest), then enforce.
-- ────────────────────────────────────────────────────────────────────────────
delete from public.holiday_visits h
using (
  select unnest((array_agg(id order by created_at, id))[2:]) as dup_id
  from public.holiday_visits
  where guest_id is not null and visit_date is not null
  group by guest_id, visit_date
  having count(*) > 1
) d
where h.id = d.dup_id;

create unique index if not exists holiday_visits_one_per_guest_per_day
  on public.holiday_visits (guest_id, visit_date)
  where visit_date is not null;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Onsite laundry slot capacity: the BEFORE trigger counted rows under
--    READ COMMITTED with no lock, so two parallel inserts could both see the
--    slot empty and both book it. Serialize per (date, slot) with an advisory
--    lock, mirroring the shower capacity trigger.
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

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Weekly laundry limit (2 loads per guest per Monday-start Pacific week)
--    was enforced only by a client-side count. Enforce it in the database.
--    Only NEW counting entries are checked (insert, or a transition from a
--    voided status into a counting one), so normal status progression on
--    existing bookings is never blocked, even in historically over-quota weeks.
-- ────────────────────────────────────────────────────────────────────────────
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
  -- Voided statuses never count toward the weekly allowance.
  if new.status in ('cancelled', 'no_show', 'waitlisted') then
    return new;
  end if;
  -- Status progression on an already-counting booking adds no new load.
  if tg_op = 'UPDATE'
     and old.guest_id = new.guest_id
     and old.scheduled_for = new.scheduled_for
     and old.status not in ('cancelled', 'no_show', 'waitlisted') then
    return new;
  end if;

  -- ISO weeks start on Monday, matching weekStartPacificDateString.
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
