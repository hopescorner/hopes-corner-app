begin;
select plan(15);

insert into public.guests (
  id, external_id, first_name, last_name, full_name, preferred_name,
  housing_status, age_group, gender, location, updated_at
) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'BLOCK-REG-1', 'Block', 'One', 'Block One', 'Block', 'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'BLOCK-REG-2', 'Block', 'Two', 'Block Two', 'Block', 'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'BLOCK-REG-3', 'Block', 'Three', 'Block Three', 'Block', 'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View', now());

-- Seed pre-release reservations so lifecycle tests also run against the broken trigger.
alter table public.shower_reservations disable trigger trg_shower_slot_capacity;
insert into public.shower_reservations (guest_id, scheduled_for, scheduled_time, status) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '2026-11-09', '09:00', 'booked'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '2026-11-09', '09:00', 'booked');
alter table public.shower_reservations enable trigger trg_shower_slot_capacity;
insert into public.laundry_bookings (guest_id, scheduled_for, slot_label, laundry_type, status) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '2026-11-09', '07:30 - 08:30', 'onsite', 'waiting');
insert into public.blocked_slots (service_type, slot_time, date, blocked_count) values
  ('shower', '09:00', '2026-11-09', 1),
  ('laundry', '07:30 - 08:30', '2026-11-09', 1);

select lives_ok($$select * from public.get_available_shower_slots('2026-11-09')$$,
  'availability query runs without ambiguous output names');
select lives_ok($$update public.shower_reservations set status = 'done' where guest_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' and scheduled_for = '2026-11-09'$$,
  'existing shower can finish after one spot is blocked');
update public.blocked_slots set blocked_count = 2 where service_type = 'shower' and date = '2026-11-09';
select lives_ok($$update public.shower_reservations set status = 'done' where guest_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2' and scheduled_for = '2026-11-09'$$,
  'existing shower can finish after the whole time is blocked');
select throws_like($$select * from public.book_shower_slot('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', '2026-11-09', '09:00')$$, '%SLOT_BLOCKED%',
  'full block still rejects new shower bookings');
select lives_ok($$update public.laundry_bookings set status = 'washer' where guest_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' and scheduled_for = '2026-11-09'$$,
  'existing laundry can enter washer after its slot is blocked');
select lives_ok($$update public.laundry_bookings set bag_number = 'B12' where guest_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' and scheduled_for = '2026-11-09'$$,
  'existing laundry bag number stays editable');
select lives_ok($$update public.laundry_bookings set status = 'picked_up' where guest_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' and scheduled_for = '2026-11-09'$$,
  'existing laundry can be picked up after blocking');
select throws_like($$insert into public.laundry_bookings (guest_id, scheduled_for, slot_label, laundry_type, status) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '2026-11-09', '07:30 - 08:30', 'onsite', 'waiting')$$, '%SLOT_BLOCKED%',
  'full block still rejects new laundry bookings');
select lives_ok($$update public.laundry_bookings set status = 'cancelled' where guest_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' and scheduled_for = '2026-11-09'$$,
  'existing laundry can be cancelled after blocking');
select throws_like($$update public.laundry_bookings set status = 'waiting' where guest_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' and scheduled_for = '2026-11-09'$$, '%SLOT_BLOCKED%',
  'cancelled laundry cannot be reactivated into a blocked slot');
select lives_ok($$insert into public.laundry_bookings (guest_id, scheduled_for, slot_label, laundry_type, status) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '2026-11-09', '07:30 - 08:30', 'offsite', 'pending')$$,
  'onsite blocking does not prevent offsite laundry');
select throws_like($$update public.shower_reservations set guest_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3' where guest_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' and scheduled_for = '2026-11-09'$$, '%SLOT_BLOCKED%',
  'transferring a booking cannot bypass a full block');
select is((select available_spots from public.get_available_shower_slots('2026-11-09') where slot_time = '09:00'), 0,
  'over-capacity blocked time has no free spots');
select is((select min(slot_time) from public.get_available_shower_slots('2026-11-14')), '08:30',
  'Saturday availability starts at 08:30');
select is((select max(slot_time) from public.get_available_shower_slots('2026-11-14')), '13:30',
  'Saturday availability includes the last 13:30 slot');

select * from finish();
rollback;
