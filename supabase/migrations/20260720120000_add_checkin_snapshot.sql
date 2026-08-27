-- Compact, server-consumable snapshot for the tablet check-in route.
create index if not exists guests_updated_at_id_idx
  on public.guests (updated_at desc, id);

create or replace function public.get_checkin_snapshot(
  p_service_date date default (now() at time zone 'America/Los_Angeles')::date
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with all_visits as (
  select guest_id, served_on as visit_date from public.meal_attendance where guest_id is not null
  union all
  select guest_id, scheduled_for from public.shower_reservations where guest_id is not null
  union all
  select guest_id, scheduled_for from public.laundry_bookings where guest_id is not null
  union all
  select guest_id, (requested_at at time zone 'America/Los_Angeles')::date from public.bicycle_repairs where guest_id is not null
  union all
  select guest_id, coalesce(service_date, (served_at at time zone 'America/Los_Angeles')::date) from public.haircut_visits where guest_id is not null
  union all
  select guest_id, coalesce(visit_date, (served_at at time zone 'America/Los_Angeles')::date) from public.holiday_visits where guest_id is not null
),
visit_summary as (
  select guest_id, max(visit_date) as last_visit_date
  from all_visits
  group by guest_id
),
recent_meals as (
  select guest_id
  from public.meal_attendance
  where guest_id is not null
    and served_on between p_service_date - 6 and p_service_date
  group by guest_id
),
warning_counts as (
  select guest_id, count(*)::integer as warning_count
  from public.guest_warnings
  where active = true
  group by guest_id
),
proxy_counts as (
  select guest_id, count(distinct proxy_id)::integer as linked_guest_count
  from public.guest_proxies
  group by guest_id
),
reminder_counts as (
  select guest_id, count(*)::integer as reminder_count
  from public.guest_reminders
  where dismissed_at is null
  group by guest_id
),
guest_directory as (
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', g.id,
      'external_id', g.external_id,
      'first_name', g.first_name,
      'last_name', g.last_name,
      'full_name', g.full_name,
      'preferred_name', g.preferred_name,
      'housing_status', g.housing_status,
      'age_group', g.age_group,
      'gender', g.gender,
      'location', g.location,
      'banned_at', g.banned_at,
      'banned_until', g.banned_until,
      'ban_reason', g.ban_reason,
      'banned_from_meals', coalesce(g.banned_from_meals, false),
      'banned_from_shower', coalesce(g.banned_from_shower, false),
      'banned_from_laundry', coalesce(g.banned_from_laundry, false),
      'banned_from_bicycle', coalesce(g.banned_from_bicycle, false),
      'created_at', g.created_at,
      'updated_at', g.updated_at,
      'warning_count', coalesce(w.warning_count, 0),
      'linked_guest_count', coalesce(p.linked_guest_count, 0),
      'reminder_count', coalesce(r.reminder_count, 0),
      'last_visit_date', v.last_visit_date,
      'recent_meal', rm.guest_id is not null
    ) order by g.updated_at desc, g.id
  ), '[]'::jsonb) as guests,
  concat(coalesce(max(g.updated_at)::text, 'epoch'), ':', count(*)::text) as directory_version
  from public.guests g
  left join visit_summary v on v.guest_id = g.id
  left join recent_meals rm on rm.guest_id = g.id
  left join warning_counts w on w.guest_id = g.id
  left join proxy_counts p on p.guest_id = g.id
  left join reminder_counts r on r.guest_id = g.id
),
today_guest_ids as (
  select guest_id from public.meal_attendance where served_on = p_service_date and guest_id is not null
  union
  select guest_id from public.shower_reservations where scheduled_for = p_service_date and guest_id is not null
  union
  select guest_id from public.laundry_bookings where scheduled_for = p_service_date and guest_id is not null
  union
  select guest_id from public.bicycle_repairs where (requested_at at time zone 'America/Los_Angeles')::date = p_service_date and guest_id is not null
  union
  select guest_id from public.haircut_visits where coalesce(service_date, (served_at at time zone 'America/Los_Angeles')::date) = p_service_date and guest_id is not null
  union
  select guest_id from public.holiday_visits where coalesce(visit_date, (served_at at time zone 'America/Los_Angeles')::date) = p_service_date and guest_id is not null
),
today_status as (
  select coalesce(jsonb_object_agg(ids.guest_id::text, jsonb_build_object(
    'meal_count', coalesce((select sum(m.quantity) from public.meal_attendance m where m.guest_id = ids.guest_id and m.served_on = p_service_date and m.meal_type = 'guest'), 0),
    'extra_meal_count', coalesce((select sum(m.quantity) from public.meal_attendance m where m.guest_id = ids.guest_id and m.served_on = p_service_date and m.meal_type = 'extra'), 0),
    'shower', (select jsonb_build_object('id', s.id, 'time', s.scheduled_time, 'status', s.status) from public.shower_reservations s where s.guest_id = ids.guest_id and s.scheduled_for = p_service_date and s.status not in ('cancelled', 'no_show') order by s.updated_at desc limit 1),
    'laundry', (select jsonb_build_object('id', l.id, 'time', l.slot_label, 'status', l.status) from public.laundry_bookings l where l.guest_id = ids.guest_id and l.scheduled_for = p_service_date and l.status not in ('cancelled', 'no_show') order by l.updated_at desc limit 1),
    'bicycle', (select jsonb_build_object('id', b.id, 'status', b.status) from public.bicycle_repairs b where b.guest_id = ids.guest_id and (b.requested_at at time zone 'America/Los_Angeles')::date = p_service_date order by b.updated_at desc limit 1),
    'haircut', (select jsonb_build_object('id', h.id, 'time', h.slot_time::text, 'status', 'done') from public.haircut_visits h where h.guest_id = ids.guest_id and coalesce(h.service_date, (h.served_at at time zone 'America/Los_Angeles')::date) = p_service_date order by h.created_at desc limit 1),
    'holiday', (select jsonb_build_object('id', hv.id, 'status', 'done') from public.holiday_visits hv where hv.guest_id = ids.guest_id and coalesce(hv.visit_date, (hv.served_at at time zone 'America/Los_Angeles')::date) = p_service_date order by hv.created_at desc limit 1)
  )), '{}'::jsonb) as today_by_guest
  from today_guest_ids ids
),
notes as (
  select coalesce(jsonb_agg(to_jsonb(d) order by d.note_date desc, d.service_type), '[]'::jsonb) as daily_notes
  from public.daily_notes d
  where d.note_date <= p_service_date
    and coalesce(d.note_end_date, d.note_date) >= p_service_date
)
select jsonb_build_object(
  'generated_at', clock_timestamp(),
  'directory_version', guest_directory.directory_version,
  'service_date', p_service_date,
  'guests', guest_directory.guests,
  'today_by_guest', today_status.today_by_guest,
  'daily_notes', notes.daily_notes
)
from guest_directory cross join today_status cross join notes;
$$;

revoke all on function public.get_checkin_snapshot(date) from public, anon, authenticated;
grant execute on function public.get_checkin_snapshot(date) to service_role;

create or replace function public.get_checkin_guest_context(p_guest_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
select jsonb_build_object(
  'guest', to_jsonb(g),
  'warnings', coalesce((
    select jsonb_agg(to_jsonb(w) order by w.created_at desc)
    from public.guest_warnings w
    where w.guest_id = g.id and w.active = true
  ), '[]'::jsonb),
  'reminders', coalesce((
    select jsonb_agg(to_jsonb(r) order by r.created_at desc)
    from public.guest_reminders r
    where r.guest_id = g.id and r.dismissed_at is null
  ), '[]'::jsonb),
  'linked_guests', coalesce((
    select jsonb_agg(to_jsonb(linked) order by linked.full_name)
    from (
      select distinct on (linked_guest.id) linked_guest.*
      from public.guest_proxies p
      join public.guests linked_guest
        on linked_guest.id = case when p.guest_id = g.id then p.proxy_id else p.guest_id end
      where p.guest_id = g.id or p.proxy_id = g.id
      order by linked_guest.id
    ) linked
  ), '[]'::jsonb)
)
from public.guests g
where g.id = p_guest_id;
$$;

revoke all on function public.get_checkin_guest_context(uuid) from public, anon, authenticated;
grant execute on function public.get_checkin_guest_context(uuid) to service_role;

-- Keep the weekly limit authoritative for direct clients and command endpoints.
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

drop trigger if exists trg_laundry_weekly_limit on public.laundry_bookings;
create trigger trg_laundry_weekly_limit
before insert or update of guest_id, scheduled_for, status on public.laundry_bookings
for each row execute function public.check_laundry_weekly_limit();

create table if not exists public.checkin_command_receipts (
  idempotency_key text primary key,
  command_type text not null,
  response jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists checkin_command_receipts_created_at_idx
  on public.checkin_command_receipts (created_at desc);

alter table public.checkin_command_receipts enable row level security;

create or replace function public.execute_checkin_meal_command(
  p_guest_id uuid,
  p_service_date date,
  p_quantity smallint,
  p_extra boolean,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_response jsonb;
  base_count integer;
  extra_count integer;
  target_record_id uuid;
  result jsonb;
begin
  if p_quantity < 1 or p_quantity > 2 or length(trim(p_idempotency_key)) = 0 then
    raise exception 'INVALID_MEAL_COMMAND';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_guest_id::text || ':' || p_service_date::text, 0));

  select response into existing_response
  from public.checkin_command_receipts
  where idempotency_key = p_idempotency_key;
  if existing_response is not null then
    return existing_response || jsonb_build_object('idempotent', true);
  end if;

  select
    coalesce(sum(quantity) filter (where meal_type = 'guest'), 0)::integer,
    coalesce(sum(quantity) filter (where meal_type = 'extra'), 0)::integer
  into base_count, extra_count
  from public.meal_attendance
  where guest_id = p_guest_id and served_on = p_service_date;

  if (p_extra and (extra_count + p_quantity > 2 or base_count + extra_count + p_quantity > 4))
     or (not p_extra and (base_count + p_quantity > 2 or base_count + extra_count + p_quantity > 4)) then
    raise exception 'MEAL_LIMIT_REACHED';
  end if;

  if p_extra then
    insert into public.meal_attendance (guest_id, meal_type, quantity, served_on, recorded_at, deduplication_key)
    values (p_guest_id, 'extra', p_quantity, p_service_date, now(), p_idempotency_key)
    returning id into target_record_id;
    extra_count := extra_count + p_quantity;
  else
    select id into target_record_id
    from public.meal_attendance
    where guest_id = p_guest_id and served_on = p_service_date and meal_type = 'guest'
    limit 1;

    if target_record_id is null then
      insert into public.meal_attendance (guest_id, meal_type, quantity, served_on, recorded_at)
      values (p_guest_id, 'guest', p_quantity, p_service_date, now())
      returning id into target_record_id;
    else
      update public.meal_attendance
      set quantity = quantity + p_quantity, recorded_at = now()
      where id = target_record_id;
    end if;
    base_count := base_count + p_quantity;
  end if;

  result := jsonb_build_object(
    'guest_id', p_guest_id,
    'record_id', target_record_id,
    'meal_count', base_count,
    'extra_meal_count', extra_count,
    'idempotent', false
  );

  insert into public.checkin_command_receipts (idempotency_key, command_type, response)
  values (p_idempotency_key, case when p_extra then 'meal.extra' else 'meal.add' end, result);

  return result;
end;
$$;

revoke all on function public.execute_checkin_meal_command(uuid, date, smallint, boolean, text) from public, anon, authenticated;
grant execute on function public.execute_checkin_meal_command(uuid, date, smallint, boolean, text) to service_role;
