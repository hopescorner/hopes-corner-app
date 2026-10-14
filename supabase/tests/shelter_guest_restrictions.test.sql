begin;
select plan(12);

insert into public.guests (
  id, external_id, first_name, last_name, full_name, preferred_name,
  housing_status, age_group, gender, location, shelter_guest, banned_until, updated_at
) values
  ('11111111-1111-4111-8111-111111111111', 'SHELTER-1', 'Active', 'Shelter', 'Active Shelter', 'Active',
   'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View', true, null, now()),
  ('22222222-2222-4222-8222-222222222222', 'SHELTER-2', 'Expired', 'Ban', 'Expired Ban', 'Expired',
   'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View', true, now() - interval '1 day', now()),
  ('33333333-3333-4333-8333-333333333333', 'SHELTER-3', 'Prior', 'Booking', 'Prior Booking', 'Prior',
   'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View', false, null, now()),
  ('44444444-4444-4444-8444-444444444444', 'SHELTER-4', 'Unenrolled', 'Guest', 'Unenrolled Guest', 'Unenrolled',
   'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View', true, null, now());

-- 1. Shelter guest without active ban rejected for shower
select throws_like(
  $$insert into public.shower_reservations (guest_id, scheduled_for, scheduled_time, status)
    values ('11111111-1111-4111-8111-111111111111', '2026-10-14', '08:00', 'booked')$$,
  '%shelter guest%',
  'database rejects shower booking for shelter guest without an active ban'
);

-- 2. Shelter guest without active ban rejected for laundry
select throws_like(
  $$insert into public.laundry_bookings (guest_id, laundry_type, scheduled_for, status)
    values ('11111111-1111-4111-8111-111111111111', 'onsite', '2026-10-14', 'waiting')$$,
  '%shelter guest%',
  'database rejects laundry booking for shelter guest without an active ban'
);

-- 3. Shelter guest joining shower waitlist rejected
select throws_like(
  $$insert into public.shower_reservations (guest_id, scheduled_for, status)
    values ('11111111-1111-4111-8111-111111111111', '2026-10-14', 'waitlisted')$$,
  '%shelter guest%',
  'database rejects waitlist booking for shelter guest'
);

-- 4. Shelter guest via book_shower_slot RPC rejected
select throws_like(
  $$select * from public.book_shower_slot('11111111-1111-4111-8111-111111111111', '2026-10-14', '08:00')$$,
  '%shelter guest%',
  'book_shower_slot rejects shelter guest booking'
);

-- 5. Shelter guest is still allowed meals
select lives_ok(
  $$insert into public.meal_attendance (guest_id, meal_type, quantity, served_on)
    values ('11111111-1111-4111-8111-111111111111', 'guest', 1, '2026-10-14')$$,
  'shelter guest is allowed meals'
);

-- 6. Shelter guest with expired ban rejected for shower
select throws_like(
  $$insert into public.shower_reservations (guest_id, scheduled_for, scheduled_time, status)
    values ('22222222-2222-4222-8222-222222222222', '2026-10-14', '08:00', 'booked')$$,
  '%shelter guest%',
  'database rejects shower booking for shelter guest with an expired ban'
);

-- 7. Shelter guest with expired ban rejected for laundry
select throws_like(
  $$insert into public.laundry_bookings (guest_id, laundry_type, scheduled_for, status)
    values ('22222222-2222-4222-8222-222222222222', 'onsite', '2026-10-14', 'waiting')$$,
  '%shelter guest%',
  'database rejects laundry booking for shelter guest with an expired ban'
);

-- 8. Prior bookings made before enrollment can be created
insert into public.shower_reservations (id, guest_id, scheduled_for, scheduled_time, status)
values ('55555555-5555-4555-8555-555555555555', '33333333-3333-4333-8333-333333333333', '2026-10-14', '09:00', 'booked');
insert into public.laundry_bookings (id, guest_id, laundry_type, scheduled_for, status)
values ('66666666-6666-4666-8666-666666666666', '33333333-3333-4333-8333-333333333333', 'onsite', '2026-10-14', 'waiting');

-- Enroll guest 3 into shelter program
update public.guests set shelter_guest = true where id = '33333333-3333-4333-8333-333333333333';

-- 9. Existing shower booking can be cancelled after enrollment
select lives_ok(
  $$update public.shower_reservations set status = 'cancelled' where id = '55555555-5555-4555-8555-555555555555'$$,
  'existing shower booking can be cancelled after guest is enrolled in shelter'
);

-- 10. Existing laundry booking can be marked done after enrollment
select lives_ok(
  $$update public.laundry_bookings set status = 'done' where id = '66666666-6666-4666-8666-666666666666'$$,
  'existing laundry booking can be completed after guest is enrolled in shelter'
);

-- Unenroll guest 4
update public.guests set shelter_guest = false where id = '44444444-4444-4444-8444-444444444444';

-- 11. Unenrolled guest can book showers again
select lives_ok(
  $$insert into public.shower_reservations (guest_id, scheduled_for, scheduled_time, status)
    values ('44444444-4444-4444-8444-444444444444', '2026-10-14', '10:00', 'booked')$$,
  'unenrolled guest can book shower again'
);

-- 12. Unenrolled guest can book laundry again
select lives_ok(
  $$insert into public.laundry_bookings (guest_id, laundry_type, scheduled_for, status)
    values ('44444444-4444-4444-8444-444444444444', 'onsite', '2026-10-14', 'waiting')$$,
  'unenrolled guest can book laundry again'
);

select * from finish();
rollback;
