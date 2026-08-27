begin;
select plan(9);

insert into public.guests (
  id, external_id, first_name, last_name, full_name, preferred_name,
  housing_status, age_group, gender, location, updated_at
) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'HARDEN-1', 'Test', 'Guest', 'Test Guest', 'Test',
   'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View', now());

-- ── Daily meal limits enforced by trigger ──────────────────────────────────
select lives_ok(
  $$insert into public.meal_attendance (guest_id, meal_type, quantity, served_on)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'guest', 2, '2026-07-21')$$,
  'allows up to 2 base meals per day'
);
select throws_like(
  $$insert into public.meal_attendance (guest_id, meal_type, quantity, served_on)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'guest', 1, '2026-07-21')$$,
  '%MEAL_LIMIT_REACHED%',
  'blocks a third base meal in the database'
);
select lives_ok(
  $$insert into public.meal_attendance (guest_id, meal_type, quantity, served_on)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'extra', 2, '2026-07-21')$$,
  'allows up to 2 extra meals per day'
);
select throws_like(
  $$insert into public.meal_attendance (guest_id, meal_type, quantity, served_on)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'extra', 1, '2026-07-21')$$,
  '%MEAL_LIMIT_REACHED%',
  'blocks a third extra meal in the database'
);
select throws_like(
  $$update public.meal_attendance
    set quantity = 3
    where guest_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and served_on = '2026-07-21' and meal_type = 'guest'$$,
  '%MEAL_LIMIT_REACHED%',
  'blocks editing a guest meal above the daily limit'
);

-- ── One holiday visit per guest per day ────────────────────────────────────
select lives_ok(
  $$insert into public.holiday_visits (guest_id, visit_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-07-21')$$,
  'records a holiday visit'
);
select throws_like(
  $$insert into public.holiday_visits (guest_id, visit_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-07-21')$$,
  '%duplicate key%',
  'blocks a duplicate holiday visit for the same guest and day'
);

-- ── Weekly laundry limit enforced by trigger ───────────────────────────────
-- 2026-07-20 (Mon) and 2026-07-21 (Tue) are in the same Monday-start week.
insert into public.laundry_bookings (guest_id, laundry_type, scheduled_for, status)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'offsite', '2026-07-20', 'pending'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'offsite', '2026-07-21', 'pending');

select throws_like(
  $$insert into public.laundry_bookings (guest_id, laundry_type, scheduled_for, status)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'offsite', '2026-07-22', 'pending')$$,
  '%LAUNDRY_WEEKLY_LIMIT_REACHED%',
  'blocks a third laundry load in the same week'
);
select lives_ok(
  $$update public.laundry_bookings
    set status = 'transported'
    where guest_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and scheduled_for = '2026-07-20'$$,
  'status progression on an existing booking is not blocked by the weekly limit'
);

select * from finish();
rollback;
