-- Ages 0-18 are eligible for the holiday toy drive.
-- Keep registration, staff edits, teen-card counts, and shopper age groups aligned.
update public.holiday_children
set age_group = 'teen_16_18'
where age_group = 'teen_16_17';

alter table public.holiday_children drop constraint if exists holiday_children_age_check;
alter table public.holiday_children
  add constraint holiday_children_age_check check (age >= 0 and age <= 18) not valid;

create or replace function public.register_holiday_family(
  p_parent_name text,
  p_phone text,
  p_city text,
  p_housing_status text default 'house_apartment',
  p_income_range text default '0_40k',
  p_time_slot text default null,
  p_language text default 'en',
  p_children jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_event_year constant integer := 2026;
  c_max_per_slot constant integer := 16;
  v_assigned_slot text := trim(coalesce(p_time_slot, ''));
  v_slot_count integer;
  v_slots text[] := array[
    '09:00 AM - 09:20 AM',
    '09:20 AM - 09:40 AM',
    '09:40 AM - 10:00 AM',
    '10:00 AM - 10:20 AM',
    '10:20 AM - 10:40 AM',
    '10:40 AM - 11:00 AM',
    '11:00 AM - 11:20 AM',
    '11:20 AM - 11:40 AM',
    '11:40 AM - 12:00 PM',
    '12:00 PM - 12:20 PM',
    '12:20 PM - 12:40 PM',
    '12:40 PM - 01:00 PM',
    '01:00 PM - 01:20 PM',
    '01:20 PM - 01:40 PM',
    '01:40 PM - 02:00 PM'
  ];
  v_slot_item text;
  v_grocery_cards integer := 0;
  v_teen_cards integer := 0;
  v_child jsonb;
  v_child_age integer;
  v_child_name text;
  v_child_group text;
  v_reg_id uuid;
  v_ticket_number integer;
  v_created_at timestamptz;
  v_updated_at timestamptz;
  v_inserted_children jsonb := '[]'::jsonb;
  v_child_record record;
begin
  if p_parent_name is null or trim(p_parent_name) = '' then
    raise exception 'Parent/Guardian name is required' using errcode = '22023';
  end if;
  if p_phone is null or trim(p_phone) = '' then
    raise exception 'Phone number is required' using errcode = '22023';
  end if;
  if p_city is null or trim(p_city) = '' then
    raise exception 'City is required' using errcode = '22023';
  end if;
  if jsonb_array_length(p_children) = 0 then
    raise exception 'At least one child is required' using errcode = '22023';
  end if;
  if jsonb_array_length(p_children) > 20 then
    raise exception 'No more than 20 children may be registered' using errcode = '22023';
  end if;
  if char_length(p_parent_name) > 200 or char_length(p_phone) > 50 or char_length(p_city) > 100 then
    raise exception 'Registration field is too long' using errcode = '22023';
  end if;

  -- Validate slot against allowed slots if specified
  if v_assigned_slot != '' and not (v_assigned_slot = any(v_slots)) then
    raise exception 'INVALID_TIME_SLOT' using errcode = '22023';
  end if;

  -- Transaction-level advisory lock prevents concurrent overbooking
  perform pg_advisory_xact_lock(hashtext('holiday_registration_' || c_event_year::text));

  -- Auto-assign next chronological slot with capacity < c_max_per_slot if slot omitted
  if v_assigned_slot = '' then
    foreach v_slot_item in array v_slots loop
      select count(*)
      into v_slot_count
      from public.holiday_registrations
      where event_year = c_event_year
        and time_slot = v_slot_item
        and status != 'cancelled';

      if v_slot_count < c_max_per_slot then
        v_assigned_slot := v_slot_item;
        exit;
      end if;
    end loop;

    if v_assigned_slot = '' then
      raise exception 'ALL_SLOTS_FULL' using errcode = 'P0001';
    end if;
  else
    -- Verify requested slot capacity
    select count(*)
    into v_slot_count
    from public.holiday_registrations
    where event_year = c_event_year
      and time_slot = v_assigned_slot
      and status != 'cancelled';

    if v_slot_count >= c_max_per_slot then
      raise exception 'SLOT_FULL' using errcode = 'P0001';
    end if;
  end if;

  -- Card entitlement logic
  if jsonb_array_length(p_children) > 0 then
    v_grocery_cards := 1;
  end if;

  for v_child in select * from jsonb_array_elements(p_children) loop
    v_child_age := (v_child->>'age')::integer;
    if v_child_age >= 14 and v_child_age <= 18 then
      v_teen_cards := v_teen_cards + 1;
    end if;
  end loop;

  -- Insert registration record
  insert into public.holiday_registrations (
    event_year,
    parent_name,
    phone,
    city,
    housing_status,
    income_range,
    time_slot,
    language,
    status,
    grocery_cards,
    teen_cards
  ) values (
    c_event_year,
    trim(p_parent_name),
    trim(p_phone),
    trim(p_city),
    coalesce(nullif(trim(p_housing_status), ''), 'house_apartment'),
    coalesce(nullif(trim(p_income_range), ''), '0_40k'),
    v_assigned_slot,
    coalesce(nullif(trim(p_language), ''), 'en'),
    'registered',
    v_grocery_cards,
    v_teen_cards
  )
  returning id, ticket_number, created_at, updated_at
  into v_reg_id, v_ticket_number, v_created_at, v_updated_at;

  -- Insert children atomically
  for v_child in select * from jsonb_array_elements(p_children) loop
    v_child_name := trim(v_child->>'name');
    v_child_age := (v_child->>'age')::integer;

    if v_child_name is null or v_child_name = '' then
      raise exception 'Child name is required' using errcode = '22023';
    end if;
    if v_child_age is null or v_child_age < 0 or v_child_age > 18 then
      raise exception 'Child age must be 18 or younger' using errcode = '22023';
    end if;

    if v_child_age <= 1 then v_child_group := 'infant';
    elsif v_child_age <= 4 then v_child_group := 'toddler';
    elsif v_child_age <= 12 then v_child_group := 'child';
    elsif v_child_age = 13 then v_child_group := 'teen_13';
    elsif v_child_age = 14 then v_child_group := 'teen_14';
    elsif v_child_age = 15 then v_child_group := 'teen_15';
    else v_child_group := 'teen_16_18';
    end if;

    insert into public.holiday_children (
      registration_id,
      name,
      birthdate,
      age,
      school,
      gender,
      age_group
    ) values (
      v_reg_id,
      v_child_name,
      case when nullif(v_child->>'birthdate', '') is not null then (v_child->>'birthdate')::date else null end,
      v_child_age,
      nullif(trim(v_child->>'school'), ''),
      nullif(trim(v_child->>'gender'), ''),
      v_child_group
    )
    returning id, name, birthdate, age, school, gender, age_group, created_at
    into v_child_record;

    v_inserted_children := v_inserted_children || jsonb_build_object(
      'id', v_child_record.id,
      'registrationId', v_reg_id,
      'name', v_child_record.name,
      'birthdate', v_child_record.birthdate,
      'age', v_child_record.age,
      'school', v_child_record.school,
      'gender', v_child_record.gender,
      'ageGroup', v_child_record.age_group,
      'createdAt', v_child_record.created_at
    );
  end loop;

  return jsonb_build_object(
    'id', v_reg_id,
    'ticketNumber', v_ticket_number,
    'eventYear', c_event_year,
    'parentName', trim(p_parent_name),
    'phone', trim(p_phone),
    'city', trim(p_city),
    'housingStatus', coalesce(nullif(trim(p_housing_status), ''), 'house_apartment'),
    'incomeRange', coalesce(nullif(trim(p_income_range), ''), '0_40k'),
    'timeSlot', v_assigned_slot,
    'language', coalesce(nullif(trim(p_language), ''), 'en'),
    'status', 'registered',
    'groceryCards', v_grocery_cards,
    'teenCards', v_teen_cards,
    'children', v_inserted_children,
    'createdAt', v_created_at,
    'updatedAt', v_updated_at
  );
end;
$$;

revoke all on function public.register_holiday_family(text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.register_holiday_family(text, text, text, text, text, text, text, jsonb) to service_role;

create or replace function public.update_holiday_family(
  p_registration_id uuid,
  p_parent_name text,
  p_phone text,
  p_city text,
  p_housing_status text default 'house_apartment',
  p_income_range text default '0_40k',
  p_language text default 'en',
  p_children jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reg record;
  v_grocery_cards integer := 0;
  v_teen_cards integer := 0;
  v_child jsonb;
  v_child_age integer;
  v_child_name text;
  v_child_group text;
  v_inserted_children jsonb := '[]'::jsonb;
  v_child_record record;
  v_updated_at timestamptz;
begin
  if p_registration_id is null then
    raise exception 'REGISTRATION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_parent_name is null or trim(p_parent_name) = '' then
    raise exception 'Parent/Guardian name is required' using errcode = '22023';
  end if;
  if p_phone is null or trim(p_phone) = '' then
    raise exception 'Phone number is required' using errcode = '22023';
  end if;
  if p_city is null or trim(p_city) = '' then
    raise exception 'City is required' using errcode = '22023';
  end if;
  if p_children is null or jsonb_array_length(p_children) = 0 then
    raise exception 'At least one child is required' using errcode = '22023';
  end if;
  if jsonb_array_length(p_children) > 20 then
    raise exception 'No more than 20 children may be registered' using errcode = '22023';
  end if;
  if char_length(p_parent_name) > 200 or char_length(p_phone) > 50 or char_length(p_city) > 100 then
    raise exception 'Registration field is too long' using errcode = '22023';
  end if;

  select *
  into v_reg
  from public.holiday_registrations
  where id = p_registration_id
  for update;

  if not found then
    raise exception 'REGISTRATION_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_reg.status != 'registered' then
    raise exception 'ALREADY_CHECKED_IN' using errcode = 'P0001';
  end if;

  -- Card entitlement logic (same as registration)
  if jsonb_array_length(p_children) > 0 then
    v_grocery_cards := 1;
  end if;

  for v_child in select * from jsonb_array_elements(p_children) loop
    v_child_age := (v_child->>'age')::integer;
    if v_child_age >= 14 and v_child_age <= 18 then
      v_teen_cards := v_teen_cards + 1;
    end if;
  end loop;

  update public.holiday_registrations
  set
    parent_name = trim(p_parent_name),
    phone = trim(p_phone),
    city = trim(p_city),
    housing_status = coalesce(nullif(trim(p_housing_status), ''), 'house_apartment'),
    income_range = coalesce(nullif(trim(p_income_range), ''), '0_40k'),
    language = coalesce(nullif(trim(p_language), ''), 'en'),
    grocery_cards = v_grocery_cards,
    teen_cards = v_teen_cards,
    updated_at = now()
  where id = p_registration_id
  returning updated_at
  into v_updated_at;

  delete from public.holiday_children
  where registration_id = p_registration_id;

  for v_child in select * from jsonb_array_elements(p_children) loop
    v_child_name := trim(v_child->>'name');
    v_child_age := (v_child->>'age')::integer;

    if v_child_name is null or v_child_name = '' then
      raise exception 'Child name is required' using errcode = '22023';
    end if;
    if v_child_age is null or v_child_age < 0 or v_child_age > 18 then
      raise exception 'Child age must be 18 or younger' using errcode = '22023';
    end if;

    if v_child_age <= 1 then v_child_group := 'infant';
    elsif v_child_age <= 4 then v_child_group := 'toddler';
    elsif v_child_age <= 12 then v_child_group := 'child';
    elsif v_child_age = 13 then v_child_group := 'teen_13';
    elsif v_child_age = 14 then v_child_group := 'teen_14';
    elsif v_child_age = 15 then v_child_group := 'teen_15';
    else v_child_group := 'teen_16_18';
    end if;

    insert into public.holiday_children (
      registration_id,
      name,
      birthdate,
      age,
      school,
      gender,
      age_group
    ) values (
      p_registration_id,
      v_child_name,
      case when nullif(v_child->>'birthdate', '') is not null then (v_child->>'birthdate')::date else null end,
      v_child_age,
      nullif(trim(v_child->>'school'), ''),
      nullif(trim(v_child->>'gender'), ''),
      v_child_group
    )
    returning id, name, birthdate, age, school, gender, age_group, created_at
    into v_child_record;

    v_inserted_children := v_inserted_children || jsonb_build_object(
      'id', v_child_record.id,
      'registrationId', p_registration_id,
      'name', v_child_record.name,
      'birthdate', v_child_record.birthdate,
      'age', v_child_record.age,
      'school', v_child_record.school,
      'gender', v_child_record.gender,
      'ageGroup', v_child_record.age_group,
      'createdAt', v_child_record.created_at
    );
  end loop;

  return jsonb_build_object(
    'id', p_registration_id,
    'ticketNumber', v_reg.ticket_number,
    'eventYear', v_reg.event_year,
    'parentName', trim(p_parent_name),
    'phone', trim(p_phone),
    'city', trim(p_city),
    'housingStatus', coalesce(nullif(trim(p_housing_status), ''), 'house_apartment'),
    'incomeRange', coalesce(nullif(trim(p_income_range), ''), '0_40k'),
    'timeSlot', v_reg.time_slot,
    'language', coalesce(nullif(trim(p_language), ''), 'en'),
    'status', 'registered',
    'groceryCards', v_grocery_cards,
    'teenCards', v_teen_cards,
    'notes', v_reg.notes,
    'children', v_inserted_children,
    'createdAt', v_reg.created_at,
    'updatedAt', v_updated_at
  );
end;
$$;

revoke all on function public.update_holiday_family(uuid, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.update_holiday_family(uuid, text, text, text, text, text, text, jsonb) to service_role;
