-- Consolidate a duplicate guest into the one canonical profile in a single
-- transaction. Only the server-side service client may call this function.

create table if not exists public.guest_duplicate_dismissals (
  first_guest_id uuid not null references public.guests(id) on delete cascade,
  second_guest_id uuid not null references public.guests(id) on delete cascade,
  reviewed_at timestamptz not null default now(),
  primary key (first_guest_id, second_guest_id),
  constraint guest_duplicate_dismissals_stable_order check (first_guest_id < second_guest_id)
);

alter table public.guest_duplicate_dismissals enable row level security;

create or replace function public.get_guest_duplicate_candidates()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with normalized as (
  select
    id,
    regexp_replace(lower(trim(first_name)), '[^[:alnum:]]', '', 'g') as first_name_key,
    regexp_replace(lower(trim(last_name)), '[^[:alnum:]]', '', 'g') as last_name_key
  from public.guests
), candidates as (
  select a.id as first_guest_id, b.id as second_guest_id
  from normalized a
  join normalized b
    on a.id < b.id
   and a.first_name_key = b.first_name_key
   and a.last_name_key = b.last_name_key
  left join public.guest_duplicate_dismissals reviewed
    on reviewed.first_guest_id = a.id and reviewed.second_guest_id = b.id
  where a.first_name_key <> ''
    and a.last_name_key <> ''
    and reviewed.first_guest_id is null
)
select coalesce(jsonb_agg(to_jsonb(candidates) order by first_guest_id, second_guest_id), '[]'::jsonb)
from candidates;
$$;

create or replace function public.dismiss_guest_duplicate_candidate(
  p_first_guest_id uuid,
  p_second_guest_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_first_guest_id is null
     or p_second_guest_id is null
     or p_first_guest_id = p_second_guest_id then
    raise exception 'DUPLICATE_REVIEW_REQUIRES_TWO_DIFFERENT_GUESTS';
  end if;
  insert into public.guest_duplicate_dismissals (first_guest_id, second_guest_id)
  values (least(p_first_guest_id, p_second_guest_id), greatest(p_first_guest_id, p_second_guest_id))
  on conflict (first_guest_id, second_guest_id)
  do update set reviewed_at = now();
end;
$$;

revoke all on function public.get_guest_duplicate_candidates() from public, anon, authenticated;
grant execute on function public.get_guest_duplicate_candidates() to service_role;
revoke all on function public.dismiss_guest_duplicate_candidate(uuid, uuid) from public, anon, authenticated;
grant execute on function public.dismiss_guest_duplicate_candidate(uuid, uuid) to service_role;

-- A guest merge changes guest_id on historical laundry rows. That operation
-- must not reinterpret old history through today's weekly allowance.
create or replace function public.check_laundry_weekly_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  week_start date;
  week_end date;
  weekly_count integer;
begin
  if current_setting('app.merge_duplicate_guests', true) = 'on' then
    return new;
  end if;
  if new.guest_id is null or new.status in ('cancelled', 'no_show', 'waitlisted') then
    return new;
  end if;

  week_start := date_trunc('week', new.scheduled_for::timestamp)::date;
  week_end := week_start + 7;
  perform pg_advisory_xact_lock(hashtextextended(new.guest_id::text || ':laundry:' || week_start::text, 0));

  select count(*)::integer into weekly_count
  from public.laundry_bookings l
  where l.guest_id = new.guest_id
    and l.scheduled_for >= week_start
    and l.scheduled_for < week_end
    and l.status not in ('cancelled', 'no_show', 'waitlisted')
    and l.id is distinct from new.id;

  if weekly_count >= 2 then
    raise exception 'WEEKLY_LAUNDRY_LIMIT_REACHED';
  end if;
  return new;
end;
$$;

create or replace function public.merge_duplicate_guests(
  p_keep_guest_id uuid,
  p_duplicate_guest_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_guest_count integer;
  v_records integer;
  v_linked_ids uuid[];
  v_linked_id uuid;
  v_keep_banned_until timestamptz;
begin
  if p_keep_guest_id is null
     or p_duplicate_guest_id is null
     or p_keep_guest_id = p_duplicate_guest_id then
    raise exception 'MERGE_REQUIRES_TWO_DIFFERENT_GUESTS';
  end if;

  -- Serialize this pair and lock both profiles in stable order. Concurrent
  -- check-ins may finish first, but none can land between transfer and delete.
  perform pg_advisory_xact_lock(hashtextextended(
    'guest_merge:' || least(p_keep_guest_id, p_duplicate_guest_id)::text || ':' ||
    greatest(p_keep_guest_id, p_duplicate_guest_id)::text,
    0
  ));
  perform id
  from public.guests
  where id in (p_keep_guest_id, p_duplicate_guest_id)
  order by id
  for update;

  select count(*)::integer into v_guest_count
  from public.guests
  where id in (p_keep_guest_id, p_duplicate_guest_id);
  if v_guest_count <> 2 then
    raise exception 'MERGE_GUEST_NOT_FOUND';
  end if;

  select banned_until into v_keep_banned_until
  from public.guests
  where id = p_keep_guest_id;

  select
    (select count(*) from public.meal_attendance where guest_id = p_duplicate_guest_id or picked_up_by_guest_id = p_duplicate_guest_id) +
    (select count(*) from public.shower_reservations where guest_id = p_duplicate_guest_id) +
    (select count(*) from public.laundry_bookings where guest_id = p_duplicate_guest_id) +
    (select count(*) from public.bicycle_repairs where guest_id = p_duplicate_guest_id) +
    (select count(*) from public.haircut_visits where guest_id = p_duplicate_guest_id) +
    (select count(*) from public.holiday_visits where guest_id = p_duplicate_guest_id) +
    (select count(*) from public.items_distributed where guest_id = p_duplicate_guest_id) +
    (select count(*) from public.guest_reminders where guest_id = p_duplicate_guest_id) +
    (select count(*) from public.guest_warnings where guest_id = p_duplicate_guest_id) +
    (select count(*) from public.guest_proxies where guest_id = p_duplicate_guest_id) +
    (select count(*) from public.service_waivers where guest_id = p_duplicate_guest_id)
  into v_records;

  -- Preserve linked guests without producing self-links or silently exceeding
  -- the established maximum of three links per person.
  select coalesce(array_agg(distinct linked_id), '{}'::uuid[]) into v_linked_ids
  from (
    select case when guest_id in (p_keep_guest_id, p_duplicate_guest_id) then proxy_id else guest_id end as linked_id
    from public.guest_proxies
    where guest_id in (p_keep_guest_id, p_duplicate_guest_id)
       or proxy_id in (p_keep_guest_id, p_duplicate_guest_id)
  ) links
  where linked_id not in (p_keep_guest_id, p_duplicate_guest_id);

  if cardinality(v_linked_ids) > 3 then
    raise exception 'MERGE_PROXY_LIMIT_EXCEEDED';
  end if;

  -- The same person can have records on both profiles for a one-per-day
  -- service. Those overlaps are duplicate history, so keep the canonical row
  -- and remove only the colliding duplicate row before transfer.
  delete from public.meal_attendance duplicate_meal
  where duplicate_meal.guest_id = p_duplicate_guest_id
    and duplicate_meal.meal_type = 'guest'
    and exists (
      select 1 from public.meal_attendance kept_meal
      where kept_meal.guest_id = p_keep_guest_id
        and kept_meal.meal_type = 'guest'
        and kept_meal.served_on = duplicate_meal.served_on
    );

  delete from public.meal_attendance duplicate_extra
  where duplicate_extra.guest_id = p_duplicate_guest_id
    and duplicate_extra.meal_type = 'extra'
    and exists (
      select 1 from public.meal_attendance kept_extra
      where kept_extra.guest_id = p_keep_guest_id
        and kept_extra.meal_type = 'extra'
        and kept_extra.served_on = duplicate_extra.served_on
    );

  -- Auto lunch bags are keyed by person and day. Collapse an overlap, then
  -- rewrite a moved row to the canonical key required by undo/retraction.
  delete from public.meal_attendance duplicate_bag
  where duplicate_bag.guest_id = p_duplicate_guest_id
    and duplicate_bag.meal_type = 'lunch_bag'
    and duplicate_bag.deduplication_key = 'lunch_bag_auto_' || p_duplicate_guest_id::text || '_' || duplicate_bag.served_on::text
    and exists (
      select 1 from public.meal_attendance kept_bag
      where kept_bag.deduplication_key = 'lunch_bag_auto_' || p_keep_guest_id::text || '_' || duplicate_bag.served_on::text
    );

  update public.meal_attendance
  set deduplication_key = 'lunch_bag_auto_' || p_keep_guest_id::text || '_' || served_on::text
  where guest_id = p_duplicate_guest_id
    and meal_type = 'lunch_bag'
    and deduplication_key = 'lunch_bag_auto_' || p_duplicate_guest_id::text || '_' || served_on::text;

  delete from public.shower_reservations duplicate_row
  where duplicate_row.guest_id = p_duplicate_guest_id
    and exists (
      select 1 from public.shower_reservations kept_row
      where kept_row.guest_id = p_keep_guest_id
        and kept_row.scheduled_for = duplicate_row.scheduled_for
    );
  delete from public.laundry_bookings duplicate_row
  where duplicate_row.guest_id = p_duplicate_guest_id
    and exists (
      select 1 from public.laundry_bookings kept_row
      where kept_row.guest_id = p_keep_guest_id
        and kept_row.scheduled_for = duplicate_row.scheduled_for
    );
  delete from public.holiday_visits duplicate_row
  where duplicate_row.guest_id = p_duplicate_guest_id
    and duplicate_row.visit_date is not null
    and exists (
      select 1 from public.holiday_visits kept_row
      where kept_row.guest_id = p_keep_guest_id
        and kept_row.visit_date = duplicate_row.visit_date
    );
  delete from public.haircut_visits duplicate_row
  where duplicate_row.guest_id = p_duplicate_guest_id
    and exists (
      select 1 from public.haircut_visits kept_row
      where kept_row.guest_id = p_keep_guest_id
        and coalesce(kept_row.service_date, (kept_row.served_at at time zone 'America/Los_Angeles')::date) =
            coalesce(duplicate_row.service_date, (duplicate_row.served_at at time zone 'America/Los_Angeles')::date)
    );
  delete from public.service_waivers duplicate_row
  where duplicate_row.guest_id = p_duplicate_guest_id
    and duplicate_row.dismissed_at is null
    and exists (
      select 1 from public.service_waivers kept_row
      where kept_row.guest_id = p_keep_guest_id
        and kept_row.service_type = duplicate_row.service_type
        and kept_row.dismissed_at is null
    );

  perform set_config('app.merge_duplicate_guests', 'on', true);

  -- Historical reassignment is not a new service. Temporarily suppress the
  -- canonical guest's active-until value so service ban triggers do not treat
  -- these UPDATEs as new service delivery; restore it before returning.
  update public.guests set banned_until = null where id = p_keep_guest_id and banned_until is not null;

  update public.meal_attendance set guest_id = p_keep_guest_id where guest_id = p_duplicate_guest_id;
  update public.meal_attendance set picked_up_by_guest_id = p_keep_guest_id where picked_up_by_guest_id = p_duplicate_guest_id;
  update public.shower_reservations set guest_id = p_keep_guest_id where guest_id = p_duplicate_guest_id;
  update public.laundry_bookings set guest_id = p_keep_guest_id where guest_id = p_duplicate_guest_id;
  update public.bicycle_repairs set guest_id = p_keep_guest_id where guest_id = p_duplicate_guest_id;
  update public.haircut_visits set guest_id = p_keep_guest_id where guest_id = p_duplicate_guest_id;
  update public.holiday_visits set guest_id = p_keep_guest_id where guest_id = p_duplicate_guest_id;
  update public.items_distributed set guest_id = p_keep_guest_id where guest_id = p_duplicate_guest_id;
  update public.guest_reminders set guest_id = p_keep_guest_id where guest_id = p_duplicate_guest_id;
  update public.guest_warnings set guest_id = p_keep_guest_id where guest_id = p_duplicate_guest_id;
  update public.service_waivers set guest_id = p_keep_guest_id where guest_id = p_duplicate_guest_id;

  delete from public.guest_proxies
  where guest_id = p_duplicate_guest_id or proxy_id = p_duplicate_guest_id;
  foreach v_linked_id in array v_linked_ids loop
    if not exists (
      select 1 from public.guest_proxies
      where guest_id = p_keep_guest_id and proxy_id = v_linked_id
    ) then
      insert into public.guest_proxies (guest_id, proxy_id)
      values (p_keep_guest_id, v_linked_id);
    end if;
  end loop;

  delete from public.guests where id = p_duplicate_guest_id;
  update public.guests set banned_until = v_keep_banned_until where id = p_keep_guest_id;

  return jsonb_build_object(
    'kept_guest_id', p_keep_guest_id,
    'deleted_guest_id', p_duplicate_guest_id,
    'transferred_records', v_records
  );
end;
$$;

revoke all on function public.merge_duplicate_guests(uuid, uuid) from public, anon, authenticated;
grant execute on function public.merge_duplicate_guests(uuid, uuid) to service_role;

comment on function public.merge_duplicate_guests(uuid, uuid) is
'Atomically consolidates a duplicate guest profile into one canonical guest. Service-role only.';
