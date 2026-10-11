begin;
select plan(9);

insert into public.guests (
  id, external_id, first_name, last_name, full_name, preferred_name,
  housing_status, age_group, gender, location, updated_at
) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'SLOT-ASSIGN-1', 'Test', 'One', 'Test One', 'Test', 'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View', now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'SLOT-ASSIGN-2', 'Test', 'Two', 'Test Two', 'Test', 'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View', now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'SLOT-ASSIGN-3', 'Test', 'Three', 'Test Three', 'Test', 'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View', now());

insert into public.shower_reservations (id, guest_id, scheduled_for, scheduled_time, status) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '2026-10-12', null, 'waitlisted'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '2026-10-12', '08:00', 'booked'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '2026-10-12', '08:00', 'booked');

select throws_like(
  $$select * from public.book_shower_slot('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '2026-10-12', '08:00')$$,
  '%slot is full%', 'waitlist promotion respects capacity'
);
select is((select status::text from public.shower_reservations where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'), 'waitlisted', 'failed assignment leaves the guest waitlisted');
insert into public.blocked_slots (service_type, slot_time, date) values ('shower', '10:00', '2026-10-12');
select throws_like(
  $$select * from public.book_shower_slot('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '2026-10-12', '10:00')$$,
  '%SLOT_BLOCKED%', 'waitlist promotion rejects blocked slots'
);
select is((select status::text from public.shower_reservations where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'), 'waitlisted', 'blocked assignment leaves the reservation unchanged');
select lives_ok(
  $$select * from public.book_shower_slot('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '2026-10-12', '09:00')$$,
  'assigns an available slot to a waitlisted guest'
);
select is((select count(*)::integer from public.shower_reservations where guest_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' and scheduled_for = '2026-10-12'), 1, 'promotion reuses the reservation');
select is((select status::text from public.shower_reservations where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'), 'booked', 'existing reservation becomes booked');
select is((select scheduled_time from public.shower_reservations where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'), '09:00', 'existing reservation gets the requested time');
select throws_like(
  $$select * from public.book_shower_slot('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '2026-10-12', '11:00')$$,
  '%already has a shower reservation%', 'a booked reservation cannot be assigned again'
);

select * from finish();
rollback;
