-- Keep shower and laundry screens consistent across devices.
-- FULL preserves the guest and service date in DELETE events.
alter table public.shower_reservations replica identity full;
alter table public.laundry_bookings replica identity full;

-- Make publication membership part of the migration history instead of
-- relying only on the reference schema or dashboard configuration.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shower_reservations'
  ) then
    alter publication supabase_realtime add table public.shower_reservations;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'laundry_bookings'
  ) then
    alter publication supabase_realtime add table public.laundry_bookings;
  end if;
end
$$;
