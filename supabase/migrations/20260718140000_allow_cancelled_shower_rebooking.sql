-- Reuse a guest's cancelled/no-show reservation when they change their mind.
-- The existing one-per-guest-per-day index intentionally prevents a second row.
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
'Atomically books a shower slot, reusing a cancelled/no-show reservation for the same guest and date.';
