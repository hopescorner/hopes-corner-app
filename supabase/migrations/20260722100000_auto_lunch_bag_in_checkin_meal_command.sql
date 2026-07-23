-- The check-in command path recorded guest meals without the automatic
-- lunch-bag addition that the client-side addMealRecord flow performs,
-- so daily lunch bag counts fell far below the number of people served.
-- Re-create execute_checkin_meal_command so it adds one lunch bag per
-- person (on their first guest meal of the service day), honouring the
-- Friday exclusion and the auto_meal_additions_enabled app setting.
-- The lunch bag row is attributed to the guest (guest_id) so staff can
-- see when each bag was assigned and to whom.

create or replace function public.execute_checkin_meal_command(
  p_guest_id uuid,
  p_service_date date,
  p_quantity smallint,
  p_extra boolean,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_response jsonb;
  base_count integer;
  extra_count integer;
  target_record_id uuid;
  is_new_guest_meal boolean := false;
  auto_additions_enabled boolean;
  result jsonb;
begin
  if p_quantity < 1 or p_quantity > 2 or length(trim(p_idempotency_key)) = 0 then
    raise exception 'INVALID_MEAL_COMMAND';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_guest_id::text || ':' || p_service_date::text, 0));

  select response into existing_response
  from public.checkin_command_receipts
  where idempotency_key = p_idempotency_key;
  if existing_response is not null then
    return existing_response || jsonb_build_object('idempotent', true);
  end if;

  select
    coalesce(sum(quantity) filter (where meal_type = 'guest'), 0)::integer,
    coalesce(sum(quantity) filter (where meal_type = 'extra'), 0)::integer
  into base_count, extra_count
  from public.meal_attendance
  where guest_id = p_guest_id and served_on = p_service_date;

  if (p_extra and (extra_count + p_quantity > 2 or base_count + extra_count + p_quantity > 4))
     or (not p_extra and (base_count + p_quantity > 2 or base_count + extra_count + p_quantity > 4)) then
    raise exception 'MEAL_LIMIT_REACHED';
  end if;

  if p_extra then
    insert into public.meal_attendance (guest_id, meal_type, quantity, served_on, recorded_at, deduplication_key)
    values (p_guest_id, 'extra', p_quantity, p_service_date, now(), p_idempotency_key)
    returning id into target_record_id;
    extra_count := extra_count + p_quantity;
  else
    select id into target_record_id
    from public.meal_attendance
    where guest_id = p_guest_id and served_on = p_service_date and meal_type = 'guest'
    limit 1;

    if target_record_id is null then
      insert into public.meal_attendance (guest_id, meal_type, quantity, served_on, recorded_at)
      values (p_guest_id, 'guest', p_quantity, p_service_date, now())
      returning id into target_record_id;
      is_new_guest_meal := true;
    else
      update public.meal_attendance
      set quantity = quantity + p_quantity, recorded_at = now()
      where id = target_record_id;
    end if;
    base_count := base_count + p_quantity;
  end if;

  -- One lunch bag per person per service day, added with their first
  -- guest meal. Fridays are excluded, matching the client-side rule.
  if is_new_guest_meal and extract(dow from p_service_date) <> 5 then
    select auto_meal_additions_enabled into auto_additions_enabled
    from public.app_settings
    where id = 'global';

    if coalesce(auto_additions_enabled, true) then
      -- Deduplication key makes the auto-add idempotent across the RPC and
      -- the client-side Services flow, so parallel devices can't double-bag.
      insert into public.meal_attendance (guest_id, meal_type, quantity, served_on, recorded_at, notes, deduplication_key)
      values (
        p_guest_id, 'lunch_bag', 1, p_service_date, now(), 'Auto-added with meal',
        'lunch_bag_auto_' || p_guest_id || '_' || p_service_date
      )
      on conflict (deduplication_key) do nothing;
    end if;
  end if;

  result := jsonb_build_object(
    'guest_id', p_guest_id,
    'record_id', target_record_id,
    'meal_count', base_count,
    'extra_meal_count', extra_count,
    'idempotent', false
  );

  insert into public.checkin_command_receipts (idempotency_key, command_type, response)
  values (p_idempotency_key, case when p_extra then 'meal.extra' else 'meal.add' end, result);

  return result;
end;
$$;

revoke all on function public.execute_checkin_meal_command(uuid, date, smallint, boolean, text) from public, anon, authenticated;
grant execute on function public.execute_checkin_meal_command(uuid, date, smallint, boolean, text) to service_role;
