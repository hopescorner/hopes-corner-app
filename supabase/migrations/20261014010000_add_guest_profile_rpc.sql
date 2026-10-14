-- Save guest profiles through a server-side helper that tolerates schema-cache
-- lag and only writes the shelter_guest field when the column is available.

create or replace function public.save_guest_profile(
  p_guest_id uuid default null,
  p_guest_data jsonb default '{}'::jsonb
)
returns public.guests
language plpgsql
as $$
declare
  has_shelter_guest boolean;
  sql text;
  result public.guests;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'guests'
      and column_name = 'shelter_guest'
  ) into has_shelter_guest;

  if (p_guest_data ? 'shelter_guest') and not has_shelter_guest then
    raise exception 'Column shelter_guest is not available on guests table';
  end if;

  if p_guest_id is null then
    sql := '
      insert into public.guests (
        external_id,
        first_name,
        last_name,
        full_name,
        preferred_name,
        housing_status,
        age_group,
        gender,
        location,
        notes,
        bicycle_description';
    if has_shelter_guest then
      sql := sql || ',
        shelter_guest';
    end if;
    sql := sql || '
      )
      values (
        coalesce(nullif($1->>''external_id'', ''''), gen_random_uuid()::text),
        coalesce($1->>''first_name'', ''''),
        coalesce($1->>''last_name'', ''''),
        coalesce(
          $1->>''full_name'',
          concat_ws('' '', coalesce($1->>''first_name'', ''''), coalesce($1->>''last_name'', ''''))
        ),
        coalesce($1->>''preferred_name'', ''''),
        coalesce(nullif($1->>''housing_status'', '''')::public.housing_status_enum, ''Unhoused''::public.housing_status_enum),
        coalesce(nullif($1->>''age_group'', '''')::public.age_group_enum, ''Adult 18-59''::public.age_group_enum),
        coalesce(nullif($1->>''gender'', '''')::public.gender_enum, ''Unknown''::public.gender_enum),
        coalesce($1->>''location'', ''Mountain View''),
        coalesce($1->>''notes'', ''''),
        coalesce($1->>''bicycle_description'', '''')';
    if has_shelter_guest then
      sql := sql || ',
        coalesce(($1->>''shelter_guest'')::boolean, false)';
    end if;
    sql := sql || '
      )
      returning *';
    execute sql using p_guest_data into result;
    if (p_guest_data ? 'shelter_guest') and has_shelter_guest then
      if result.shelter_guest is distinct from (p_guest_data->>'shelter_guest')::boolean then
        raise exception 'Failed to persist shelter_guest value';
      end if;
    end if;
    return result;
  end if;

  sql := '
    update public.guests
    set
      external_id = coalesce(nullif($2->>''external_id'', ''''), external_id),
      first_name = coalesce($2->>''first_name'', first_name),
      last_name = coalesce($2->>''last_name'', last_name),
      full_name = coalesce($2->>''full_name'', full_name),
      preferred_name = coalesce($2->>''preferred_name'', preferred_name),
      housing_status = coalesce(nullif($2->>''housing_status'', '''')::public.housing_status_enum, housing_status),
      age_group = coalesce(nullif($2->>''age_group'', '''')::public.age_group_enum, age_group),
      gender = coalesce(nullif($2->>''gender'', '''')::public.gender_enum, gender),
      location = coalesce($2->>''location'', location),
      notes = coalesce($2->>''notes'', notes),
      bicycle_description = coalesce($2->>''bicycle_description'', bicycle_description)';
  if has_shelter_guest then
    sql := sql || ',
      shelter_guest = coalesce(($2->>''shelter_guest'')::boolean, shelter_guest)';
  end if;
  sql := sql || '
    where id = $1
    returning *';

  execute sql using p_guest_id, p_guest_data into result;
  if not found then
    raise exception 'Guest not found';
  end if;
  if (p_guest_data ? 'shelter_guest') and has_shelter_guest then
    if result.shelter_guest is distinct from (p_guest_data->>'shelter_guest')::boolean then
      raise exception 'Failed to persist shelter_guest value';
    end if;
  end if;
  return result;
end;
$$;
