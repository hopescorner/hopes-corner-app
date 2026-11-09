-- Partial shower-slot blocking: block one of two spots at a time.
--
-- Previously blocked_slots was all-or-nothing per (service_type, slot_time,
-- date): a row meant every spot at that time was blocked. When one of the
-- two bathrooms goes down for the rest of the day, staff want to keep one
-- spot per time open instead of closing the whole time.
--
-- This migration adds blocked_count (how many spots are blocked at a time):
--   NULL       legacy fully-blocked row (existing data — no backfill needed)
--   1 of 2     shower half-block (1 spot left) — the "one bathroom down" case
--   2 of 2     shower fully blocked (same as NULL)
--   1 of 1     laundry fully blocked (laundry capacity is 1)
--
-- Effective capacity is max - blocked_count. Booking enforcement
-- (book_shower_slot + triggers) becomes capacity-aware: a fully blocked
-- time (effective 0) still raises SLOT_BLOCKED; a half-blocked time allows
-- bookings until its single remaining spot is taken, then raises the usual
-- slot-full error. Existing bookings are never cancelled by a block — a
-- time that already has 2 bookings stays at 2 and simply takes no new ones.
--
-- The app writes blocked_count explicitly from now on; NULL keeps meaning
-- "full" so old clients and old rows stay safe. A unique index on
-- (service_type, slot_time, date) makes "one row per time" a database
-- invariant (the app already treats 23505 as success).

alter table public.blocked_slots
  add column if not exists blocked_count integer
    check (blocked_count is null or blocked_count between 1 and 2);

-- One row per (service, date, time). Deduplicate first so the unique index
-- creation cannot fail on legacy duplicates.
delete from public.blocked_slots a using public.blocked_slots b
 where a.ctid > b.ctid
   and a.service_type = b.service_type
   and a.slot_time = b.slot_time
   and a.date = b.date;

create unique index if not exists uq_blocked_slots_slot
  on public.blocked_slots (service_type, slot_time, date);

-- Partial blocking needs UPDATE (adjust 2 ↔ 1 spots); the table previously
-- had select/insert/delete policies only.
drop policy if exists "Enable update access for authenticated users" on public.blocked_slots;
create policy "Enable update access for authenticated users"
  on public.blocked_slots for update
  to authenticated, anon
  using (true)
  with check (true);

-- ── book_shower_slot: capacity-aware (supersedes 20261011 version) ──
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
    v_blocked_count integer;
    v_effective_capacity integer;
begin
    perform pg_advisory_xact_lock(
        hashtextextended(p_scheduled_for::text || '_' || coalesce(p_scheduled_time, ''), 0)
    );

    if p_scheduled_time is not null then
        select (case when blocked_count is null then 2 else blocked_count end)
          into v_blocked_count
          from public.blocked_slots
         where date = p_scheduled_for::text
           and service_type = 'shower'
           and slot_time = p_scheduled_time
         limit 1;
        v_effective_capacity := greatest(0, v_max_capacity - coalesce(v_blocked_count, 0));
        if v_effective_capacity = 0 then
            raise exception 'SLOT_BLOCKED: Shower slot % on % is blocked',
                p_scheduled_time, p_scheduled_for;
        end if;
    else
        v_effective_capacity := v_max_capacity;
    end if;

    select id, status
    into v_existing_id, v_existing_status
    from public.shower_reservations
    where guest_id = p_guest_id
      and scheduled_for = p_scheduled_for
    for update;

    if v_existing_id is not null and v_existing_status not in ('cancelled', 'no_show', 'waitlisted') then
        raise exception 'This guest already has a shower reservation for this date.';
    end if;

    select count(*) into v_count
    from public.shower_reservations
    where scheduled_for = p_scheduled_for
      and scheduled_time = p_scheduled_time
      and status in ('booked', 'done')
      and (v_existing_id is null or id <> v_existing_id);

    if v_count >= v_effective_capacity then
        raise exception 'This shower slot is full (%/%). Please choose another time.',
            v_count, v_effective_capacity;
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
'Atomically books a shower slot, reusing a waitlisted or cancelled/no-show reservation for the same guest and date. Fully blocked times raise SLOT_BLOCKED; half-blocked times enforce their single remaining spot with the slot-full error.';

-- ── Shower capacity trigger: effective capacity, not fixed 2 ──
create or replace function public.check_shower_slot_capacity()
returns trigger as $$
declare
    slot_count integer;
    blocked_count integer;
    max_per_slot constant integer := 2;
    effective_capacity integer;
begin
    if NEW.status not in ('booked', 'done') then
        return NEW;
    end if;

    if NEW.scheduled_time is null then
        return NEW;
    end if;

    perform pg_advisory_xact_lock(
        hashtextextended(NEW.scheduled_for::text || '_' || NEW.scheduled_time, 0)
    );

    select (case when blocked_count is null then 2 else blocked_count end)
      into blocked_count
      from public.blocked_slots
     where date = NEW.scheduled_for::text
       and service_type = 'shower'
       and slot_time = NEW.scheduled_time
     limit 1;

    effective_capacity := greatest(0, max_per_slot - coalesce(blocked_count, 0));

    select count(*) into slot_count
    from public.shower_reservations
    where scheduled_for  = NEW.scheduled_for
      and scheduled_time = NEW.scheduled_time
      and status in ('booked', 'done')
      and id != NEW.id;

    if slot_count >= effective_capacity then
        raise exception 'Shower slot % on % is full (%/% taken)',
            NEW.scheduled_time, NEW.scheduled_for, slot_count, effective_capacity;
    end if;

    return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_shower_slot_capacity on public.shower_reservations;
create trigger trg_shower_slot_capacity
before insert or update on public.shower_reservations
for each row execute function public.check_shower_slot_capacity();

-- ── Shower blocked trigger: only fully blocked times raise SLOT_BLOCKED ──
-- Half-blocked times (blocked_count = 1) are admitted here; the capacity
-- trigger above enforces the single remaining spot.
create or replace function public.check_shower_blocked_slot()
returns trigger as $$
begin
  if NEW.scheduled_time is null then
    return NEW;
  end if;
  if NEW.status in ('cancelled', 'no_show', 'waitlisted') then
    return NEW;
  end if;
  if exists (
    select 1 from public.blocked_slots
    where date = NEW.scheduled_for::text
      and service_type = 'shower'
      and slot_time = NEW.scheduled_time
      and (blocked_count is null or blocked_count >= 2)
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

-- ── Available-slots helper: subtract blocked spots ──
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
    ),
    blocked as (
        select
            slot_time as time_slot,
            (case when blocked_count is null then 2 else blocked_count end) as blocked_count
        from public.blocked_slots
        where date = check_date::text
          and service_type = 'shower'
    )
    select
        all_slots.time_slot as slot_time,
        coalesce(booked_slots.booked_count, 0) as current_count,
        greatest(0, (max_per_slot - coalesce(booked_slots.booked_count, 0) - coalesce(blocked.blocked_count, 0)))::integer as available_spots
    from all_slots
    left join booked_slots on all_slots.time_slot = booked_slots.scheduled_time
    left join blocked on all_slots.time_slot = blocked.time_slot
    order by all_slots.time_slot;
end;
$$ language plpgsql;
