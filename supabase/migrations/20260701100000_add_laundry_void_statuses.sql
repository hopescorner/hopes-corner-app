-- Add laundry statuses already used by the app for waitlists and cancellations.
alter type public.laundry_status_enum add value if not exists 'cancelled';
alter type public.laundry_status_enum add value if not exists 'no_show';
alter type public.laundry_status_enum add value if not exists 'waitlisted';
