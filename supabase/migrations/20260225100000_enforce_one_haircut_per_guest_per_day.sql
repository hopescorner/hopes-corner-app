-- Enforce at most one haircut visit per guest per day.
-- Uses service_date when present, otherwise falls back to the date portion of served_at in Pacific time.

create unique index if not exists haircut_visits_one_per_guest_per_day
  on public.haircut_visits (
    guest_id,
    coalesce(service_date, (served_at at time zone 'America/Los_Angeles')::date)
  );
