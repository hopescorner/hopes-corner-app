-- Add shelter guest enrollment and keep shower/laundry restricted server-side.

alter table public.guests
  add column if not exists shelter_guest boolean not null default false;

comment on column public.guests.shelter_guest is
  'If true, shower and laundry bookings are disabled because these services are provided at shelter';

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

  all_programs_banned := coalesce(bicycle_ban, false)
    and coalesce(meal_ban, false)
    and coalesce(shower_ban, false)
    and coalesce(laundry_ban, false);

  service_label := CASE WHEN TG_NARGS > 0 THEN TG_ARGV[0] ELSE NULL END;
  normalized_service := lower(trim(coalesce(service_label, '')));

  if shelter_guest and normalized_service in ('shower', 'showers', 'shower booking', 'shower bookings', 'laundry', 'laundry booking', 'laundry bookings') then
    raise exception using
      message = format(
        'Guest %s is enrolled as a shelter guest and cannot book shower or laundry services.',
        coalesce(guest_name, new.guest_id::text)
      ),
      detail = 'Shower and laundry services provided at shelter.',
      hint = 'Remove the shelter guest designation to book these services.';
  end if;

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
      'shelter_guest', coalesce(g.shelter_guest, false),
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
