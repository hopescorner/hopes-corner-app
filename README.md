# Hope's Corner Check-in App

Check-in and service management app for Hope's Corner.

## Scripts

- Dev: `npm run dev`
- Test: `npm test`
- Lint: `npm run lint`

## Supabase Roles (checkin, staff, admin, board)

1. In Supabase Auth, create users (or invite) and note their `user.id`.
2. In the `profiles` table, insert/update each user with `id = user.id` and `role` set to `checkin`, `staff`, `admin`, or `board`.
3. Refresh the session in the app to apply the new role.
