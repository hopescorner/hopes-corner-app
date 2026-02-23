-- Enforce maximum 1 guest per onsite laundry time slot at the database level.
-- Only onsite laundry with a slot_label is constrained.
-- Statuses that occupy the slot: waiting, washer, dryer, done, picked_up
-- (once a guest has used the slot, it is consumed for the day).

create or replace function public.check_laundry_slot_capacity()
returns trigger as $$
declare
  slot_count integer;
  max_per_slot constant integer := 1;
begin
  -- Only enforce for onsite laundry with a slot assigned
  if NEW.laundry_type != 'onsite' then
    return NEW;
  end if;

  if NEW.slot_label is null then
    return NEW;
  end if;

  -- Only enforce for statuses that occupy the slot
  if NEW.status not in ('waiting', 'washer', 'dryer', 'done', 'picked_up') then
    return NEW;
  end if;

  select count(*)
    into slot_count
    from public.laundry_bookings
   where scheduled_for = NEW.scheduled_for
     and slot_label    = NEW.slot_label
     and laundry_type  = 'onsite'
     and status in ('waiting', 'washer', 'dryer', 'done', 'picked_up')
     and id != NEW.id;  -- exclude self on UPDATE

  if slot_count >= max_per_slot then
    raise exception 'Laundry slot % on % is already booked',
      NEW.slot_label, NEW.scheduled_for;
  end if;

  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_laundry_slot_capacity on public.laundry_bookings;
create trigger trg_laundry_slot_capacity
  before insert or update on public.laundry_bookings
  for each row execute function public.check_laundry_slot_capacity();
