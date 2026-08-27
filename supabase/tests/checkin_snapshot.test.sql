begin;
select plan(15);

insert into public.guests (
  id, external_id, first_name, last_name, full_name, preferred_name,
  housing_status, age_group, gender, location, updated_at
) values
  ('11111111-1111-4111-8111-111111111111', 'CHECKIN-1', 'Ada', 'Lovelace', 'Ada Lovelace', 'Ada',
   'Unhoused', 'Adult 18-59', 'Female', 'Mountain View', '2026-07-19T17:00:00Z'),
  ('22222222-2222-4222-8222-222222222222', 'CHECKIN-2', 'Grace', 'Hopper', 'Grace Hopper', 'Grace',
   'Housed', 'Senior 60+', 'Female', 'Sunnyvale', '2026-07-19T16:00:00Z'),
  ('44444444-4444-4444-8444-444444444444', 'CHECKIN-3', 'Banned', 'Guest', 'Banned Guest', '',
   'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View', '2026-07-19T15:00:00Z');
update public.guests set
  banned_at = '2026-07-18T00:00:00Z',
  banned_until = '2026-07-21T00:00:00Z',
  banned_from_meals = true,
  ban_reason = 'SQL contract test'
where id = '44444444-4444-4444-8444-444444444444';

insert into public.meal_attendance (guest_id, meal_type, quantity, served_on)
values
  ('11111111-1111-4111-8111-111111111111', 'guest', 1, '2024-01-02'),
  ('11111111-1111-4111-8111-111111111111', 'guest', 1, '2026-07-19');
insert into public.shower_reservations (guest_id, scheduled_for, scheduled_time, status)
values ('11111111-1111-4111-8111-111111111111', '2025-08-10', '08:00', 'done');
insert into public.guest_warnings (guest_id, message, active)
values ('11111111-1111-4111-8111-111111111111', 'Test warning', true);
insert into public.guest_reminders (guest_id, message)
values ('11111111-1111-4111-8111-111111111111', 'Test reminder');
insert into public.guest_proxies (guest_id, proxy_id)
values ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222');

create temporary table checkin_snapshot_result as
select public.get_checkin_snapshot('2026-07-19') as payload;

select is((select payload->>'service_date' from checkin_snapshot_result), '2026-07-19', 'uses the supplied Pacific service date');
select is((select jsonb_array_length(payload->'guests') from checkin_snapshot_result), 3, 'returns the compact guest directory');
select is((select payload#>>'{today_by_guest,11111111-1111-4111-8111-111111111111,meal_count}' from checkin_snapshot_result), '1', 'returns only today meal totals');
select is((
  select jsonb_path_query_first(payload->'guests', '$[*] ? (@.id == "11111111-1111-4111-8111-111111111111")')->>'last_visit_date'
  from checkin_snapshot_result
), '2026-07-19', 'computes an all-time last visit on the server');
select is((
  select jsonb_path_query_first(payload->'guests', '$[*] ? (@.id == "11111111-1111-4111-8111-111111111111")')->>'warning_count'
  from checkin_snapshot_result
), '1', 'includes active warning counts');
select is((
  select jsonb_path_query_first(payload->'guests', '$[*] ? (@.id == "11111111-1111-4111-8111-111111111111")')->>'reminder_count'
  from checkin_snapshot_result
), '1', 'includes active reminder counts');
select is((
  select jsonb_path_query_first(payload->'guests', '$[*] ? (@.id == "11111111-1111-4111-8111-111111111111")')->>'recent_meal'
  from checkin_snapshot_result
), 'true', 'computes recent-meal status at the service-date boundary');
select is((
  select jsonb_path_query_first(payload->'guests', '$[*] ? (@.id == "44444444-4444-4444-8444-444444444444")')->>'banned_from_meals'
  from checkin_snapshot_result
), 'true', 'preserves service-specific ban state');

select lives_ok(
  $$select public.execute_checkin_meal_command(
    '22222222-2222-4222-8222-222222222222', '2026-07-19', 1, false,
    '33333333-3333-4333-8333-333333333333'
  )$$,
  'accepts an atomic meal command'
);
select lives_ok(
  $$select public.execute_checkin_meal_command(
    '22222222-2222-4222-8222-222222222222', '2026-07-19', 1, false,
    '33333333-3333-4333-8333-333333333333'
  )$$,
  'returns the canonical receipt for a duplicate command'
);
select is((
  select count(*)::integer
  from public.meal_attendance
  where guest_id = '22222222-2222-4222-8222-222222222222' and served_on = '2026-07-19'
), 1, 'an idempotency key creates exactly one authoritative record');
select is((
  select count(*)::integer
  from public.meal_attendance
  where meal_type = 'lunch_bag' and served_on = '2026-07-19'
    and guest_id = '22222222-2222-4222-8222-222222222222'
), 1, 'auto-adds exactly one guest-attributed lunch bag per person even across duplicate commands');
select lives_ok(
  $$select public.execute_checkin_meal_command(
    '22222222-2222-4222-8222-222222222222', '2026-07-19', 1, false,
    '66666666-6666-4666-8666-666666666666'
  )$$,
  'accepts a second meal command for the same guest'
);
select is((
  select count(*)::integer
  from public.meal_attendance
  where meal_type = 'lunch_bag' and served_on = '2026-07-19'
), 1, 'a second meal for the same person does not add another lunch bag');
select throws_like(
  $$select public.execute_checkin_meal_command(
    '44444444-4444-4444-8444-444444444444', '2026-07-19', 1, false,
    '55555555-5555-4555-8555-555555555555'
  )$$,
  '%banned from meals%',
  'database ban enforcement remains authoritative'
);

select * from finish();
rollback;
