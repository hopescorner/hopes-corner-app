#!/usr/bin/env bash
set -euo pipefail

# Run only against a fresh, disposable database, never the linked Supabase project.
if [[ "${PGDATABASE:-}" != "slot_blocking_test" ]]; then
  echo 'Set PGDATABASE=slot_blocking_test on a disposable Postgres instance.' >&2
  exit 1
fi

cd "$(dirname "$0")/.."
psql -v ON_ERROR_STOP=1 <<'SQL'
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql as $$select null::uuid$$;
create publication supabase_realtime;
create extension pgtap;
SQL
psql -v ON_ERROR_STOP=1 -f database/schema.sql

run_tests() {
  local phase=$1
  local output
  output=$(mktemp)
  for test_file in supabase/tests/*.test.sql; do
    # These RPCs are installed by the migration chain, outside the core schema.
    if [[ "$phase" == schema && ( "$test_file" == */checkin_snapshot.test.sql || "$test_file" == */merge_duplicate_guests.test.sql ) ]]; then continue; fi
    psql -XAt -v ON_ERROR_STOP=1 -f "$test_file" > "$output"
    cat "$output"
    if grep -Eq '^(not ok|# Looks like you )' "$output" || ! awk '
      /^1\.\.[0-9]+$/ { planned = substr($0, 4) }
      /^(not )?ok [0-9]+/ { actual++ }
      END { exit (!planned || planned != actual) }
    ' "$output"; then
      echo "FAIL: $test_file did not complete its pgTAP plan" >&2
      rm "$output"
      return 1
    fi
  done
  rm "$output"
}

# Verify both a fresh schema and the deployed migration upgrade path.
run_tests schema
bash scripts/testServiceConcurrency.sh
# Replay from the initial Check-In migration, which installs the remaining RPCs.
# Earlier table changes are already represented in the core schema.
for migration in supabase/migrations/*.sql; do
  if [[ "${migration##*/}" < "20260720120000" ]]; then continue; fi
  psql -v ON_ERROR_STOP=1 -f "$migration"
done
run_tests migrated
bash scripts/testServiceConcurrency.sh
