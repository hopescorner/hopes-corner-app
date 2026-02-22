-- Performance indexes for high-frequency operational queries
create index if not exists idx_meal_attendance_recorded_at_desc
    on public.meal_attendance (recorded_at desc);

create index if not exists idx_meal_attendance_served_on_meal_type
    on public.meal_attendance (served_on, meal_type);

create index if not exists idx_shower_reservations_scheduled_for_status
    on public.shower_reservations (scheduled_for, status);

create index if not exists idx_laundry_bookings_scheduled_for_status_type
    on public.laundry_bookings (scheduled_for, status, laundry_type);

create index if not exists idx_bicycle_repairs_requested_at_status
    on public.bicycle_repairs (requested_at, status);

create index if not exists idx_daily_notes_note_date_service_type
    on public.daily_notes (note_date, service_type);
