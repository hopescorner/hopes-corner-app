begin;
select plan(9);

insert into public.guests (
  id, external_id, first_name, last_name, full_name, preferred_name,
  housing_status, age_group, gender, location
) values
  ('11111111-1111-4111-8111-111111111111', 'MERGE-KEEP', 'Jordan', 'Lee', 'Jordan Lee', '',
   'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View'),
  ('22222222-2222-4222-8222-222222222222', 'MERGE-DELETE', 'Jordan', 'Lee', 'Jordan Lee', '',
   'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View');

insert into public.meal_attendance (guest_id, meal_type, quantity, served_on)
values
  ('11111111-1111-4111-8111-111111111111', 'guest', 1, '2026-08-17'),
  ('22222222-2222-4222-8222-222222222222', 'guest', 1, '2026-08-17'),
  ('22222222-2222-4222-8222-222222222222', 'extra', 1, '2026-08-18');
insert into public.guest_warnings (guest_id, message)
values ('22222222-2222-4222-8222-222222222222', 'Transfer me');
insert into public.service_waivers (guest_id, service_type)
values
  ('11111111-1111-4111-8111-111111111111', 'shower'),
  ('22222222-2222-4222-8222-222222222222', 'shower');

select is(jsonb_array_length(public.get_guest_duplicate_candidates()), 1, 'finds an unresolved normalized-name candidate pair');
select lives_ok(
  $$select public.dismiss_guest_duplicate_candidate(
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222'
  )$$,
  'can durably mark a candidate as two different people'
);
select is(jsonb_array_length(public.get_guest_duplicate_candidates()), 0, 'does not show a reviewed false positive again');

select lives_ok(
  $$select public.merge_duplicate_guests(
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222'
  )$$,
  'merges duplicate profiles atomically even when unique records overlap'
);
select is((select count(*)::integer from public.guests where id = '22222222-2222-4222-8222-222222222222'), 0, 'deletes the duplicate profile');
select is((select count(*)::integer from public.guest_warnings where guest_id = '11111111-1111-4111-8111-111111111111'), 1, 'transfers non-conflicting history');
select is((select count(*)::integer from public.meal_attendance where guest_id = '11111111-1111-4111-8111-111111111111' and served_on = '2026-08-17' and meal_type = 'guest'), 1, 'collapses a same-day primary meal collision');
select is((select count(*)::integer from public.meal_attendance where guest_id = '11111111-1111-4111-8111-111111111111' and served_on = '2026-08-18' and meal_type = 'extra'), 1, 'moves a distinct meal record');
select is((select count(*)::integer from public.service_waivers where guest_id = '11111111-1111-4111-8111-111111111111' and service_type = 'shower' and dismissed_at is null), 1, 'collapses an active waiver collision');

select * from finish();
rollback;
