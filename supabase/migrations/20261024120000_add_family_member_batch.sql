-- Add multiple household members in one transaction.
-- Creating a guest and its guest_family_members row separately can leave an
-- unlinked guest when the second write fails. This RPC keeps both writes
-- atomic and enrolls the household in the Family Meal Program at the same time.

create or replace function public.create_family_members(
  p_family_id uuid,
  p_members jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_family public.guest_families%rowtype;
  v_member jsonb;
  v_guest public.guests%rowtype;
  v_membership public.guest_family_members%rowtype;
  v_guests jsonb := '[]'::jsonb;
  v_members jsonb := '[]'::jsonb;
  v_first text;
  v_last text;
begin
  select * into v_family
  from public.guest_families
  where id = p_family_id;

  if not found then
    raise exception 'Household not found' using errcode = 'P0002';
  end if;

  if p_members is null
    or jsonb_typeof(p_members) <> 'array'
    or jsonb_array_length(p_members) = 0 then
    raise exception 'At least one family member is required' using errcode = '22023';
  end if;

  if jsonb_array_length(p_members) > 50 then
    raise exception 'No more than 50 family members may be added at once' using errcode = '22023';
  end if;

  -- Adding a member puts the household in the program. Staff can still
  -- unenroll it later without deleting the household or its history.
  update public.guest_families
  set enrolled_in_family_meal = true
  where id = p_family_id;

  for v_member in select value from jsonb_array_elements(p_members) loop
    v_first := trim(coalesce(v_member->>'first_name', ''));
    v_last := trim(coalesce(v_member->>'last_name', ''));

    if v_first = '' or v_last = '' then
      raise exception 'First and last name are required for every family member' using errcode = '22023';
    end if;

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
      bicycle_description,
      shelter_guest
    ) values (
      coalesce(
        nullif(trim(v_member->>'external_id'), ''),
        'G' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
      ),
      v_first,
      v_last,
      trim(concat_ws(' ', v_first, v_last)),
      coalesce(v_member->>'preferred_name', ''),
      coalesce(nullif(v_member->>'housing_status', '')::public.housing_status_enum, 'Unhoused'::public.housing_status_enum),
      coalesce(nullif(v_member->>'age_group', '')::public.age_group_enum, 'Child 0-17'::public.age_group_enum),
      coalesce(nullif(v_member->>'gender', '')::public.gender_enum, 'Unknown'::public.gender_enum),
      coalesce(nullif(v_member->>'location', ''), 'Mountain View'),
      coalesce(v_member->>'notes', ''),
      coalesce(v_member->>'bicycle_description', ''),
      coalesce((v_member->>'shelter_guest')::boolean, false)
    )
    returning * into v_guest;

    insert into public.guest_family_members (family_id, guest_id)
    values (p_family_id, v_guest.id)
    returning * into v_membership;

    v_guests := v_guests || jsonb_build_array(to_jsonb(v_guest));
    v_members := v_members || jsonb_build_array(to_jsonb(v_membership));
  end loop;

  return jsonb_build_object('guests', v_guests, 'members', v_members);
end;
$$;

grant execute on function public.create_family_members(uuid, jsonb) to authenticated, anon;
