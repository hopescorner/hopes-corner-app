-- Load a guest's complete activity timeline only when staff requests it.
-- The function is service-role only because history contains private notes.
create or replace function public.get_guest_history(p_guest_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with history_events as (
  select
    g.id,
    'profile'::text as event_type,
    g.created_at as occurred_at,
    'Profile created'::text as title,
    null::text as detail,
    null::text as status
  from public.guests g
  where g.id = p_guest_id

  union all

  select
    g.id,
    'ban'::text,
    g.banned_at,
    'Ban applied'::text,
    nullif(g.ban_reason, ''),
    case when g.banned_until > now() then 'active' else 'expired' end
  from public.guests g
  where g.id = p_guest_id and g.banned_at is not null

  union all

  select
    m.id,
    'meal'::text,
    m.served_on::timestamp at time zone 'America/Los_Angeles',
    case
      when m.picked_up_by_guest_id = p_guest_id and m.guest_id is distinct from p_guest_id then 'Proxy pickup'
      when m.meal_type = 'extra' then 'Extra meal'
      when m.meal_type = 'lunch_bag' then 'Lunch bag'
      else 'Meal'
    end,
    case
      when m.picked_up_by_guest_id = p_guest_id and m.guest_id is distinct from p_guest_id
        then 'Pickup for ' || coalesce(receiver.preferred_name, receiver.full_name, 'linked guest')
      else m.quantity::text || case when m.quantity = 1 then ' meal' else ' meals' end
    end,
    replace(m.meal_type::text, '_', ' ')
  from public.meal_attendance m
  left join public.guests receiver on receiver.id = m.guest_id
  where m.guest_id = p_guest_id or m.picked_up_by_guest_id = p_guest_id

  union all

  select s.id, 'shower', s.scheduled_for::timestamp at time zone 'America/Los_Angeles', 'Shower',
    nullif('Time ' || coalesce(s.scheduled_time, ''), 'Time '), replace(s.status::text, '_', ' ')
  from public.shower_reservations s where s.guest_id = p_guest_id

  union all

  select l.id, 'laundry', l.scheduled_for::timestamp at time zone 'America/Los_Angeles', 'Laundry',
    concat_ws(' · ', initcap(l.laundry_type), nullif('Bag ' || coalesce(l.bag_number, ''), 'Bag ')),
    replace(l.status::text, '_', ' ')
  from public.laundry_bookings l where l.guest_id = p_guest_id

  union all

  select b.id, 'bicycle', b.requested_at, 'Bicycle repair',
    coalesce(nullif(array_to_string(b.repair_types, ', '), ''), b.repair_type, b.notes),
    replace(b.status::text, '_', ' ')
  from public.bicycle_repairs b where b.guest_id = p_guest_id

  union all

  select h.id, 'haircut', coalesce(h.service_date::timestamp at time zone 'America/Los_Angeles', h.served_at), 'Haircut',
    case when h.stylist_name is not null then 'Stylist: ' || h.stylist_name else null end, null
  from public.haircut_visits h where h.guest_id = p_guest_id

  union all

  select v.id, 'holiday', v.served_at, 'Holiday visit', null, null
  from public.holiday_visits v where v.guest_id = p_guest_id

  union all

  select i.id, 'item', i.distributed_at, 'Item received', initcap(replace(i.item_key, '_', ' ')), null
  from public.items_distributed i where i.guest_id = p_guest_id

  union all

  select w.id, 'warning', w.created_at, 'Warning', w.message,
    case when w.active then 'active' else 'inactive' end
  from public.guest_warnings w where w.guest_id = p_guest_id

  union all

  select r.id, 'reminder', r.created_at, 'Reminder', r.message,
    case when r.dismissed_at is null then 'active' else 'dismissed' end
  from public.guest_reminders r where r.guest_id = p_guest_id

  union all

  select waiver.id, 'waiver', waiver.signed_at, 'Service waiver', initcap(waiver.service_type),
    case when waiver.dismissed_at is null then 'signed' else 'dismissed' end
  from public.service_waivers waiver where waiver.guest_id = p_guest_id
)
select jsonb_build_object(
  'events', coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'event_type', event_type,
        'occurred_at', occurred_at,
        'title', title,
        'detail', detail,
        'status', status
      ) order by occurred_at desc, event_type, id
    ),
    '[]'::jsonb
  )
)
from history_events;
$$;

revoke all on function public.get_guest_history(uuid) from public, anon, authenticated;
grant execute on function public.get_guest_history(uuid) to service_role;
