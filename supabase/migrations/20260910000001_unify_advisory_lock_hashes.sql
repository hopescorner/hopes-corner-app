-- Unify advisory-lock hashes to 64-bit (hashtextextended).
--
-- Shower slot locks used 32-bit hashtext() while every laundry lock uses
-- 64-bit hashtextextended(..., 0). A 32-bit space collides far more often
-- under front-desk parallelism, and a collision serializes unrelated slots
-- (or, worse, fails to serialize the same slot against a 64-bit holder).
-- All shower participants (RPC + capacity trigger) move together in this
-- migration so mutual exclusion is never split across key spaces.
-- database/schema.sql carries the same change for fresh builds; older
-- migrations are left untouched as applied history.

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
        hashtextextended(p_scheduled_for::text || '_' || coalesce(p_scheduled_time, ''), 0)
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
        hashtextextended(NEW.scheduled_for::text || '_' || NEW.scheduled_time, 0)
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
