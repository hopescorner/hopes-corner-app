-- Qualify the rate-limits wipe in the holiday ticket-counter reset.
--
-- The redeployed reset (20260910000002) fixed the table name but kept an
-- unqualified `delete from public.holiday_registration_rate_limits`, which
-- the database guard rejects with "DELETE requires a WHERE clause" — the
-- reset failed a second time, now diagnosably thanks to the surfaced error.
-- `where true` wipes every row exactly as before while satisfying the guard.
-- Mirrored in database/schema.sql.
create or replace function public.reset_holiday_ticket_counter(
  p_clear_registrations boolean default true,
  p_target_number integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_event_year constant integer := 2026;
  v_seq_name text;
  v_deleted_count integer := 0;
  v_target integer := greatest(1, coalesce(p_target_number, 1));
begin
  if p_clear_registrations then
    with deleted as (
      delete from public.holiday_registrations
      where event_year = c_event_year
      returning id
    )
    select count(*) into v_deleted_count from deleted;

    -- Also clear rate limit attempts for fresh start. The WHERE clause is
    -- required: unqualified DELETEs are rejected by the database guard.
    delete from public.holiday_registration_rate_limits where true;
  end if;

  -- Get sequence name for holiday_registrations ticket_number
  v_seq_name := pg_get_serial_sequence('public.holiday_registrations', 'ticket_number');

  if v_seq_name is not null then
    -- In Postgres, setval(seq, val, false) causes the next nextval() call to return val
    perform setval(v_seq_name, v_target, false);
  end if;

  return jsonb_build_object(
    'success', true,
    'deletedRegistrations', v_deleted_count,
    'nextTicketNumber', v_target
  );
end;
$$;

revoke all on function public.reset_holiday_ticket_counter(boolean, integer) from public, anon, authenticated;
grant execute on function public.reset_holiday_ticket_counter(boolean, integer) to service_role;
