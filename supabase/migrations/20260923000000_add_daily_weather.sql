-- Daily weather tracking for Mountain View to correlate with guest attendance
create table if not exists public.daily_weather (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  location text not null default 'Mountain View, CA',
  temp_high numeric(5, 1) not null,
  temp_low numeric(5, 1) not null,
  temp_unit text not null default 'F',
  weather_code integer,
  condition text not null,
  condition_category text not null check (condition_category in ('sunny', 'cloudy', 'rain', 'fog', 'snow', 'other')),
  precipitation_sum numeric(5, 2) not null default 0.0,
  has_rain boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_weather_unique_date_loc unique (date, location)
);

comment on table public.daily_weather is 'Stores daily weather observations and forecasts for Mountain View to correlate weather patterns with guest attendance.';

drop trigger if exists trg_daily_weather_updated_at on public.daily_weather;
create trigger trg_daily_weather_updated_at
before update on public.daily_weather
for each row execute function public.touch_updated_at();

create index if not exists daily_weather_date_idx on public.daily_weather (date desc);
create index if not exists daily_weather_condition_category_idx on public.daily_weather (condition_category, date desc);

alter table public.daily_weather enable row level security;

drop policy if exists "Anyone can view daily weather" on public.daily_weather;
create policy "Anyone can view daily weather"
  on public.daily_weather for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage daily weather" on public.daily_weather;
create policy "Authenticated users can manage daily weather"
  on public.daily_weather for all
  to authenticated, anon
  using (true)
  with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'daily_weather'
  ) then
    alter publication supabase_realtime add table public.daily_weather;
  end if;
end $$;
