-- Add scheduling fields to haircut_visits so haircuts can be assigned by slot and stylist.

alter table public.haircut_visits
  add column if not exists slot_time time,
  add column if not exists stylist_name text;

-- Ensure each stylist can have at most one guest per timeslot per day.
create unique index if not exists haircut_visits_schedule_unique
  on public.haircut_visits (service_date, slot_time, stylist_name)
  where service_date is not null
    and slot_time is not null
    and stylist_name is not null;
