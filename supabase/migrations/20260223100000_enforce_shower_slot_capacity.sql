-- Enforce maximum 2 guests per shower time slot at the database level.
-- Only statuses that actually occupy a slot ('booked', 'done') count towards capacity.
-- This prevents race conditions and bypasses of the UI-level check.

create or replace function public.check_shower_slot_capacity()
returns trigger as $$
declare
  slot_count integer;
  max_per_slot constant integer := 2;
begin
  -- Only enforce for statuses that occupy a slot
  if NEW.status not in ('booked', 'done') then
    return NEW;
  end if;

  -- Skip if no scheduled_time (waitlisted records may have no time)
  if NEW.scheduled_time is null then
    return NEW;
  end if;

  select count(*)
    into slot_count
    from public.shower_reservations
   where scheduled_for  = NEW.scheduled_for
     and scheduled_time = NEW.scheduled_time
     and status in ('booked', 'done')
     and id != NEW.id;  -- exclude self on UPDATE

  if slot_count >= max_per_slot then
    raise exception 'Shower slot % on % is full (%/% taken)',
      NEW.scheduled_time, NEW.scheduled_for, slot_count, max_per_slot;
  end if;

  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_shower_slot_capacity on public.shower_reservations;
create trigger trg_shower_slot_capacity
  before insert or update on public.shower_reservations
  for each row execute function public.check_shower_slot_capacity();
