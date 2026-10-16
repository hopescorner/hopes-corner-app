-- Performance indexes for check-in snapshot RPC and high-frequency operational queries

create index if not exists idx_guest_warnings_active_guest_id
  on public.guest_warnings (guest_id)
  where active = true;

create index if not exists idx_guest_reminders_active_guest_id
  on public.guest_reminders (guest_id)
  where dismissed_at is null;

create index if not exists idx_meal_attendance_recent_meals
  on public.meal_attendance (served_on, guest_id)
  where guest_id is not null;
