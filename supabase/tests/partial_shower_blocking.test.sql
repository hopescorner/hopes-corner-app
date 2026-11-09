begin;
select plan(6);

insert into public.guests (
  id, external_id, first_name, last_name, full_name, preferred_name,
  housing_status, age_group, gender, location, updated_at
) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'PARTIAL-1', 'Partial', 'One', 'Partial One', 'Partial', 'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View', now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'PARTIAL-2', 'Partial', 'Two', 'Partial Two', 'Partial', 'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View', now());

-- One bathroom down for the whole day: 1 of 2 spots blocked at 09:00.
insert into public.blocked_slots (service_type, slot_time, date, blocked_count) values ('shower', '09:00', '2026-10-13', 1);

select lives_ok(
  $$select * from public.book_shower_slot('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', '2026-10-13', '09:00')$$,
  'first booking fits in the single remaining spot of a half-blocked slot'
);

select throws_like(
  $$select * from public.book_shower_slot('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', '2026-10-13', '09:00')$$,
  '%slot is full%',
  'second booking into a half-blocked slot is rejected as full (not SLOT_BLOCKED)'
);

-- Fully blocked time still uses the SLOT_BLOCKED sentinel.
insert into public.blocked_slots (service_type, slot_time, date, blocked_count) values ('shower', '10:00', '2026-10-13', 2);
select throws_like(
  $$select * from public.book_shower_slot('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', '2026-10-13', '10:00')$$,
  '%SLOT_BLOCKED%',
  'fully blocked slot rejects with SLOT_BLOCKED'
);

-- Legacy row (blocked_count NULL) still means fully blocked.
insert into public.blocked_slots (service_type, slot_time, date) values ('shower', '11:00', '2026-10-13');
select throws_like(
  $$select * from public.book_shower_slot('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', '2026-10-13', '11:00')$$,
  '%SLOT_BLOCKED%',
  'legacy NULL blocked_count row rejects with SLOT_BLOCKED'
);

select is(
  (select count(*)::integer from public.shower_reservations where guest_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4' and scheduled_for = '2026-10-13'),
  1,
  'first guest keeps their half-blocked booking'
);

select is(
  (select count(*)::integer from public.shower_reservations where guest_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5' and scheduled_for = '2026-10-13'),
  0,
  'second guest has no booking after rejections'
);

select * from finish();
rollback;
