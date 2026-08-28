-- Family meal program: separate household enrollment and aggregate meal logs.

create table if not exists public.guest_families (
  id uuid primary key default gen_random_uuid(),
  primary_guest_id uuid not null references public.guests(id) on delete cascade,
  enrolled_in_family_meal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_families_primary_guest_unique unique (primary_guest_id)
);

create table if not exists public.guest_family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.guest_families(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint guest_family_members_unique_family_guest unique (family_id, guest_id),
  constraint guest_family_members_unique_guest unique (guest_id)
);

create table if not exists public.family_meal_distributions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.guest_families(id) on delete cascade,
  meals_per_member smallint not null check (meals_per_member > 0),
  member_count_snapshot smallint not null check (member_count_snapshot > 0),
  total_meals integer generated always as (meals_per_member * member_count_snapshot) stored,
  served_on date not null,
  recorded_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_meal_distributions_family_day_unique unique (family_id, served_on)
);

drop trigger if exists trg_guest_families_updated_at on public.guest_families;
create trigger trg_guest_families_updated_at
before update on public.guest_families
for each row execute function public.touch_updated_at();

drop trigger if exists trg_family_meal_distributions_updated_at on public.family_meal_distributions;
create trigger trg_family_meal_distributions_updated_at
before update on public.family_meal_distributions
for each row execute function public.touch_updated_at();

create index if not exists guest_families_primary_guest_id_idx
  on public.guest_families (primary_guest_id);

create index if not exists guest_families_enrolled_idx
  on public.guest_families (created_at desc)
  where enrolled_in_family_meal = true;

create index if not exists guest_family_members_family_id_idx
  on public.guest_family_members (family_id);

create index if not exists guest_family_members_guest_id_idx
  on public.guest_family_members (guest_id);

create index if not exists family_meal_distributions_family_id_idx
  on public.family_meal_distributions (family_id);

create index if not exists family_meal_distributions_served_on_idx
  on public.family_meal_distributions (served_on desc);

alter table public.guest_families enable row level security;
alter table public.guest_family_members enable row level security;
alter table public.family_meal_distributions enable row level security;

drop policy if exists "Authenticated users can view guest families" on public.guest_families;
create policy "Authenticated users can view guest families"
  on public.guest_families for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage guest families" on public.guest_families;
create policy "Authenticated users can manage guest families"
  on public.guest_families for all
  to authenticated, anon
  using (true)
  with check (true);

drop policy if exists "Authenticated users can view guest family members" on public.guest_family_members;
create policy "Authenticated users can view guest family members"
  on public.guest_family_members for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage guest family members" on public.guest_family_members;
create policy "Authenticated users can manage guest family members"
  on public.guest_family_members for all
  to authenticated, anon
  using (true)
  with check (true);

drop policy if exists "Authenticated users can view family meal distributions" on public.family_meal_distributions;
create policy "Authenticated users can view family meal distributions"
  on public.family_meal_distributions for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage family meal distributions" on public.family_meal_distributions;
create policy "Authenticated users can manage family meal distributions"
  on public.family_meal_distributions for all
  to authenticated, anon
  using (true)
  with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'guest_families'
  ) then
    alter publication supabase_realtime add table public.guest_families;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'guest_family_members'
  ) then
    alter publication supabase_realtime add table public.guest_family_members;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'family_meal_distributions'
  ) then
    alter publication supabase_realtime add table public.family_meal_distributions;
  end if;
end $$;
