-- Blocks restrict new occupancy; staff can still finish existing bookings.
create or replace function public.check_shower_slot_capacity()
returns trigger as $$
declare
    v_slot_count integer;
    v_blocked_count integer;
    v_effective_capacity integer;
begin
    if NEW.status not in ('booked', 'done') or NEW.scheduled_time is null then
        return NEW;
    end if;

    if TG_OP = 'UPDATE' then
        if OLD.status in ('booked', 'done')
           and NEW.guest_id is not distinct from OLD.guest_id
           and NEW.scheduled_for is not distinct from OLD.scheduled_for
           and NEW.scheduled_time is not distinct from OLD.scheduled_time then
            return NEW;
        end if;
    end if;

    perform pg_advisory_xact_lock(
        hashtextextended(NEW.scheduled_for::text || '_' || NEW.scheduled_time, 0)
    );

    select coalesce(bs.blocked_count, 2) into v_blocked_count
      from public.blocked_slots bs
     where bs.date = NEW.scheduled_for::text
       and bs.service_type = 'shower'
       and bs.slot_time = NEW.scheduled_time;
    v_effective_capacity := greatest(0, 2 - coalesce(v_blocked_count, 0));

    select count(*) into v_slot_count
      from public.shower_reservations sr
     where sr.scheduled_for = NEW.scheduled_for
       and sr.scheduled_time = NEW.scheduled_time
       and sr.status in ('booked', 'done')
       and sr.id <> NEW.id;
    if v_slot_count >= v_effective_capacity then
        raise exception 'Shower slot % on % is full (%/% taken)',
            NEW.scheduled_time, NEW.scheduled_for, v_slot_count, v_effective_capacity;
    end if;
    return NEW;
end;
$$ language plpgsql;

create or replace function public.check_shower_blocked_slot()
returns trigger as $$
begin
    if NEW.scheduled_time is null or NEW.status in ('cancelled', 'no_show', 'waitlisted') then
        return NEW;
    end if;
    if TG_OP = 'UPDATE' then
        if OLD.status in ('booked', 'done')
           and NEW.guest_id is not distinct from OLD.guest_id
           and NEW.scheduled_for is not distinct from OLD.scheduled_for
           and NEW.scheduled_time is not distinct from OLD.scheduled_time then
            return NEW;
        end if;
    end if;
    if exists (
        select 1 from public.blocked_slots bs
         where bs.date = NEW.scheduled_for::text
           and bs.service_type = 'shower'
           and bs.slot_time = NEW.scheduled_time
           and coalesce(bs.blocked_count, 2) >= 2
    ) then
        raise exception 'SLOT_BLOCKED: Shower slot % on % is blocked', NEW.scheduled_time, NEW.scheduled_for;
    end if;
    return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_shower_blocked_slot on public.shower_reservations;
create trigger trg_shower_blocked_slot
before insert or update of status, scheduled_time, scheduled_for, guest_id
on public.shower_reservations
for each row execute function public.check_shower_blocked_slot();

create or replace function public.check_laundry_blocked_slot()
returns trigger as $$
begin
    if NEW.laundry_type <> 'onsite' or NEW.slot_label is null
       or NEW.status in ('cancelled', 'no_show', 'waitlisted') then
        return NEW;
    end if;
    if TG_OP = 'UPDATE' then
        if OLD.status in ('waiting', 'washer', 'dryer', 'done', 'picked_up')
           and NEW.guest_id is not distinct from OLD.guest_id
           and NEW.scheduled_for is not distinct from OLD.scheduled_for
           and NEW.slot_label is not distinct from OLD.slot_label
           and NEW.laundry_type is not distinct from OLD.laundry_type then
            return NEW;
        end if;
    end if;
    if exists (
        select 1 from public.blocked_slots bs
         where bs.date = NEW.scheduled_for::text
           and bs.service_type = 'laundry'
           and bs.slot_time = NEW.slot_label
    ) then
        raise exception 'SLOT_BLOCKED: Laundry slot % on % is blocked', NEW.slot_label, NEW.scheduled_for;
    end if;
    return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_laundry_blocked_slot on public.laundry_bookings;
create trigger trg_laundry_blocked_slot
before insert or update of status, slot_label, scheduled_for, laundry_type, guest_id
on public.laundry_bookings
for each row execute function public.check_laundry_blocked_slot();

create or replace function public.get_available_shower_slots(
    check_date date,
    max_per_slot integer default 2
)
returns table (slot_time text, current_count bigint, available_spots integer)
language sql
as $$
    with all_slots as (
        select to_char(t.slot, 'HH24:MI') as time_slot
          from generate_series(
            check_date + case when extract(isodow from check_date) = 6 then time '08:30' else time '07:30' end,
            check_date + case when extract(isodow from check_date) = 6 then time '13:30' else time '12:00' end,
            interval '30 minutes'
          ) as t(slot)
    ), booked as (
        select sr.scheduled_time, count(*) as booked_count
          from public.shower_reservations sr
         where sr.scheduled_for = check_date and sr.status in ('booked', 'done')
         group by sr.scheduled_time
    )
    select s.time_slot, coalesce(b.booked_count, 0),
           greatest(0, max_per_slot - coalesce(b.booked_count, 0)
             - case when bs.id is null then 0 else coalesce(bs.blocked_count, max_per_slot) end)::integer
      from all_slots s
      left join booked b on b.scheduled_time = s.time_slot
      left join public.blocked_slots bs on bs.service_type = 'shower'
          and bs.date = check_date::text and bs.slot_time = s.time_slot
     order by s.time_slot;
$$;
