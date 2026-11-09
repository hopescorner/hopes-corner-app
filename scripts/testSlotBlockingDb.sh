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
  local output
  output=$(mktemp)
  for test_file in supabase/tests/partial_shower_blocking.test.sql supabase/tests/slot_blocking_regressions.test.sql; do
    psql -XAt -v ON_ERROR_STOP=1 -f "$test_file" > "$output"
    cat "$output"
    if grep -Eq '^(not ok|# Looks like you failed)' "$output"; then
      rm "$output"
      return 1
    fi
  done
  rm "$output"
}

# Verify both a fresh schema and the deployed migration upgrade path.
run_tests
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261109000000_partial_shower_slot_blocking.sql
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261109010000_stabilize_slot_blocking.sql
run_tests
