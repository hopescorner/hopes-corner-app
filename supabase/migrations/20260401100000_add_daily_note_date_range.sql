-- Migration: Add date range support to daily_notes
-- Adds an optional end date so a note can span multiple days

alter table public.daily_notes
  add column if not exists note_end_date date;

alter table public.daily_notes
  add constraint daily_notes_end_date_check
  check (note_end_date is null or note_end_date >= note_date);

create index if not exists daily_notes_end_date_idx
  on public.daily_notes (note_end_date)
  where note_end_date is not null;
