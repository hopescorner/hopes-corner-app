-- Atomic shower booking RPC + trigger hardening
-- Fixes race condition where concurrent staff can double-book the same slot
-- by replacing separate count + insert with a single atomic function.

-- 1. RPC: Atomic book_shower_slot
--    Uses pg_advisory_xact_lock to serialize access per slot.
--    Returns the newly inserted row so the client can map it.
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
    v_max_capacity constant integer := 2;
begin
    -- Serialize all inserts targeting the same date + time
    perform pg_advisory_xact_lock(
        hashtext(p_scheduled_for::text || '_' || coalesce(p_scheduled_time, ''))
    );

    -- Count current occupants (booked + done occupy a slot)
    select count(*) into v_count
    from public.shower_reservations
    where scheduled_for  = p_scheduled_for
      and scheduled_time = p_scheduled_time
      and status in ('booked', 'done');

    if v_count >= v_max_capacity then
        raise exception 'This shower slot is full (%/%). Please choose another time.',
            v_count, v_max_capacity;
    end if;

    return query
    insert into public.shower_reservations
        (guest_id, scheduled_for, scheduled_time, status)
    values
        (p_guest_id, p_scheduled_for, p_scheduled_time, p_status::public.shower_status_enum)
    returning *;
end;
$$;

comment on function public.book_shower_slot(uuid, date, text, text) is
'Atomically checks slot capacity and inserts a shower reservation. '
'Uses an advisory lock to prevent race conditions when multiple staff book simultaneously.';

-- 2. Harden the trigger with an advisory lock (safety net for direct INSERTs)
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

    -- Advisory lock prevents concurrent transactions from reading stale counts
    perform pg_advisory_xact_lock(
        hashtext(NEW.scheduled_for::text || '_' || NEW.scheduled_time)
    );

    select count(*)
    into slot_count
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

-- 3. Fix get_available_shower_slots helper to count 'done' records too
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
    )
    select
        all_slots.time_slot                                                   as slot_time,
        coalesce(booked_slots.booked_count, 0)                                as current_count,
        (max_per_slot - coalesce(booked_slots.booked_count, 0))::integer      as available_spots
    from all_slots
    left join booked_slots on all_slots.time_slot = booked_slots.scheduled_time
    order by all_slots.time_slot;
end;
$$ language plpgsql;
