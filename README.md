# Hope's Corner Check-in App

A check-in and service management application for Hope's Corner.

## Run

- `npm run dev`
- `npm test`
- `npm run lint`

## Supabase User Setup

Roles: `checkin`, `staff`, `admin`, `board`.

1. In Supabase Auth, create or invite users and copy each `user.id`.
2. In the `profiles` table, insert or update each user:
   - `id = user.id`
   - `role = checkin | staff | admin | board`
3. Ask users to sign out and sign back in to refresh role-based access.

## Docs

[Wiki](https://deepwiki.com/hopescorner/hopes-corner-app)
