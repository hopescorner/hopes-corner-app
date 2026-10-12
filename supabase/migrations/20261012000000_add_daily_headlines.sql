-- Daily Bay Area headlines tracking to correlate major news with guest attendance.
-- Up to 5 rows per Pacific calendar date (the top Bay Area stories of the day,
-- ranked 1-5 in feed order), so a big sports result at rank 1 doesn't hide a
-- policy story (e.g. ICE activity, SNAP benefit changes) further down.
-- Source is Google News RSS ("San Francisco Bay Area news"); headlines are
-- captured automatically on service days with manual correction supported.
-- Only the headline text, outlet name, and link are stored (no article bodies).
create table if not exists public.daily_headlines (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  rank smallint not null check (rank between 1 and 5),
  headline text not null,
  source text not null default 'Bay Area News',
  url text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_headlines_unique_date_rank unique (date, rank)
);

comment on table public.daily_headlines is 'Stores the top Bay Area news headlines per day (ranks 1-5) to correlate major news events with guest attendance.';

drop trigger if exists trg_daily_headlines_updated_at on public.daily_headlines;
create trigger trg_daily_headlines_updated_at
before update on public.daily_headlines
for each row execute function public.touch_updated_at();

create index if not exists daily_headlines_date_idx on public.daily_headlines (date desc);

alter table public.daily_headlines enable row level security;

drop policy if exists "Anyone can view daily headlines" on public.daily_headlines;
create policy "Anyone can view daily headlines"
  on public.daily_headlines for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage daily headlines" on public.daily_headlines;
create policy "Authenticated users can manage daily headlines"
  on public.daily_headlines for all
  to authenticated, anon
  using (true)
  with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'daily_headlines'
  ) then
    alter publication supabase_realtime add table public.daily_headlines;
  end if;
end $$;
