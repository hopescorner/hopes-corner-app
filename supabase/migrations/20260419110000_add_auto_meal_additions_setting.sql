alter table public.app_settings
  add column if not exists auto_meal_additions_enabled boolean not null default true;
