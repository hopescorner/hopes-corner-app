#!/usr/bin/env bash
set -euo pipefail

if [[ "${PGDATABASE:-}" != slot_blocking_test ]]; then
  echo 'Concurrency tests require the disposable slot_blocking_test database.' >&2
  exit 1
fi

logs=$(mktemp -d)
cleanup() {
  psql -Xq -v ON_ERROR_STOP=1 <<'SQL'
delete from public.shower_reservations where guest_id::text like 'cccccccc-cccc-4ccc-8ccc-%';
delete from public.laundry_bookings where guest_id::text like 'cccccccc-cccc-4ccc-8ccc-%';
delete from public.blocked_slots where service_type = 'shower' and slot_time = '09:00' and date = '2026-11-17';
delete from public.guests where id::text like 'cccccccc-cccc-4ccc-8ccc-%';
SQL
  rm -r "$logs"
}
trap cleanup EXIT

psql -Xq -v ON_ERROR_STOP=1 <<'SQL'
insert into public.guests (id, external_id, first_name, last_name, full_name, housing_status, age_group, gender, location) values
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'RACE-1', 'Race', 'One', 'Race One', 'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View'),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'RACE-2', 'Race', 'Two', 'Race Two', 'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View'),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'RACE-3', 'Race', 'Three', 'Race Three', 'Unhoused', 'Adult 18-59', 'Unknown', 'Mountain View');
insert into public.shower_reservations (guest_id, scheduled_for, scheduled_time, status)
values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '2026-11-16', '09:00', 'booked');
insert into public.blocked_slots (service_type, slot_time, date, blocked_count)
values ('shower', '09:00', '2026-11-17', 1);
insert into public.laundry_bookings (guest_id, scheduled_for, laundry_type, status)
values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '2026-11-16', 'offsite', 'pending');
SQL

race() {
  local name=$1 expected_error=$2 first=$3 second=$4 count_query=$5 expected_count=$6
  # Keep the winner uncommitted so the other connection must use the DB locks.
  psql -XAt -v ON_ERROR_STOP=1 -c "begin; $first; select pg_sleep(1); commit;" > "$logs/first" 2>&1 &
  local first_pid=$!
  psql -XAt -v ON_ERROR_STOP=1 -c "begin; $second; select pg_sleep(1); commit;" > "$logs/second" 2>&1 &
  local second_pid=$!
  local first_status=0 second_status=0
  wait "$first_pid" || first_status=$?
  wait "$second_pid" || second_status=$?
  if (( (first_status == 0) + (second_status == 0) != 1 )); then
    cat "$logs/first" "$logs/second"
    echo "FAIL: $name must accept exactly one competing booking" >&2
    exit 1
  fi
  local failure_log="$logs/first"
  if (( first_status == 0 )); then failure_log="$logs/second"; fi
  if ! grep -Eq "$expected_error" "$failure_log"; then
    cat "$failure_log"
    echo "FAIL: $name failed for an unexpected reason" >&2
    exit 1
  fi
  local actual_count
  actual_count=$(psql -XAt -v ON_ERROR_STOP=1 -c "$count_query")
  if [[ "$actual_count" != "$expected_count" ]]; then
    echo "FAIL: $name stored $actual_count bookings, expected $expected_count" >&2
    exit 1
  fi
  echo "PASS: $name"
}

race 'last open shower spot' 'full' \
  "select public.book_shower_slot('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', '2026-11-16', '09:00')" \
  "select public.book_shower_slot('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', '2026-11-16', '09:00')" \
  "select count(*) from public.shower_reservations where scheduled_for = '2026-11-16' and scheduled_time = '09:00'" 2
race 'half-blocked shower spot' 'full' \
  "select public.book_shower_slot('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', '2026-11-17', '09:00')" \
  "select public.book_shower_slot('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', '2026-11-17', '09:00')" \
  "select count(*) from public.shower_reservations where scheduled_for = '2026-11-17' and scheduled_time = '09:00'" 1
race 'onsite laundry spot' 'already booked' \
  "insert into public.laundry_bookings (guest_id, scheduled_for, slot_label, laundry_type, status) values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', '2026-11-18', '09:00 - 10:00', 'onsite', 'waiting')" \
  "insert into public.laundry_bookings (guest_id, scheduled_for, slot_label, laundry_type, status) values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', '2026-11-18', '09:00 - 10:00', 'onsite', 'waiting')" \
  "select count(*) from public.laundry_bookings where scheduled_for = '2026-11-18' and slot_label = '09:00 - 10:00'" 1
race 'last weekly laundry allowance' 'LAUNDRY_WEEKLY_LIMIT_REACHED' \
  "insert into public.laundry_bookings (guest_id, scheduled_for, laundry_type, status) values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '2026-11-17', 'offsite', 'pending')" \
  "insert into public.laundry_bookings (guest_id, scheduled_for, laundry_type, status) values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '2026-11-18', 'offsite', 'pending')" \
  "select count(*) from public.laundry_bookings where guest_id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'" 2
