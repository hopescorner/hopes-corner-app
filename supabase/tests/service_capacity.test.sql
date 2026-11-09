begin;
select plan(10);

insert into public.guests (id, external_id, first_name, last_name, full_name, housing_status, age_group, gender, location) values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'CAPACITY-1', 'Capacity', 'One', 'Capacity One', 'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd2', 'CAPACITY-2', 'Capacity', 'Two', 'Capacity Two', 'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd3', 'CAPACITY-3', 'Capacity', 'Three', 'Capacity Three', 'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View');

select lives_ok($$insert into public.shower_reservations (guest_id, scheduled_for, scheduled_time, status) values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', '2026-11-09', '09:00', 'booked'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd2', '2026-11-09', '09:00', 'done')$$,
  'direct writes admit two guests at an open shower time');
select throws_like($$insert into public.shower_reservations (guest_id, scheduled_for, scheduled_time, status) values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd3', '2026-11-09', '09:00', 'booked')$$, '%full%',
  'direct writes cannot bypass shower capacity');
select lives_ok($$update public.shower_reservations set status = 'cancelled'
  where guest_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1' and scheduled_for = '2026-11-09'$$,
  'cancelling frees an occupied spot');
select lives_ok($$insert into public.shower_reservations (guest_id, scheduled_for, scheduled_time, status) values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd3', '2026-11-09', '09:00', 'booked')$$,
  'a new guest can take the cancelled spot');

insert into public.blocked_slots (service_type, slot_time, date, blocked_count)
values ('shower', '09:00', '2026-11-10', 1);
select lives_ok($$insert into public.shower_reservations (guest_id, scheduled_for, scheduled_time, status) values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', '2026-11-10', '09:00', 'done')$$,
  'a completed shower consumes the remaining half-blocked spot');
select throws_like($$insert into public.shower_reservations (guest_id, scheduled_for, scheduled_time, status) values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd2', '2026-11-10', '09:00', 'booked')$$, '%full%',
  'direct writes cannot bypass half-blocked capacity');
select lives_ok($$insert into public.shower_reservations (guest_id, scheduled_for, scheduled_time, status) values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd2', '2026-11-10', '09:00', 'waitlisted')$$,
  'a waitlisted guest does not consume a shower spot');
select throws_like($$update public.shower_reservations set status = 'booked'
  where guest_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2' and scheduled_for = '2026-11-10'$$, '%full%',
  'direct waitlist promotion enforces remaining capacity');
select lives_ok($$update public.shower_reservations set status = 'cancelled'
  where guest_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1' and scheduled_for = '2026-11-10'$$,
  'a half-blocked reservation can be cancelled');
select lives_ok($$update public.shower_reservations set status = 'booked'
  where guest_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2' and scheduled_for = '2026-11-10'$$,
  'waitlist promotion succeeds once the spot is free');

select * from finish();
rollback;
