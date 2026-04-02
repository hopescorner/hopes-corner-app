-- Add 'bicycle' to the allowed roles in the profiles table check constraint
-- The bicycle role grants access to check-in and bicycle services only
-- Role is also inferred from email prefix ('bicycle' → bicycle role) in the app

-- Drop and recreate the check constraint to include 'bicycle'
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('checkin', 'staff', 'admin', 'board', 'bicycle'));
