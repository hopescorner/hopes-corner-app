# Hope's Corner Check-in App

A check-in and service management application for Hope's Corner.

## Run

- `npm run dev`
- `npm test`
- `npm run lint`

## Test service changes

Run these commands before merging changes to showers or laundry:

```bash
npm run typecheck
npm test
npm run test:ct
npm run build
npm run version:check
```

Browser tests cover Chromium and WebKit with an iPad profile. CI also runs every SQL test in `supabase/tests/`. It tests the core schema, then applies migrations from the initial Check-In migration onward. New migrations in that sequence run automatically. Separate database connections compete for the last shower spot, a half-blocked spot, a laundry slot, and the weekly laundry allowance.

To run database tests locally, prepare a fresh Supabase Postgres database named `slot_blocking_test`. Set `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE`, then run `npm run test:db`. CI prepares this database automatically. These tests create tables and sample records, so use a disposable database.

## User Roles & Access

| Role | Access | Description |
| --- | --- | --- |
| `admin` | `/check-in`, `/services`, `/dashboard` | Full system access including settings, reports, and data exports |
| `staff` | `/check-in`, `/services`, `/dashboard` | Daily service management, guest workflows, and operational metrics |
| `checkin` | `/check-in` | Front-desk volunteer check-in, meal logging, and guest registration |
| `bicycle` | `/check-in`, `/services` | Bicycle repair logging and guest check-in |
| `board` | `/dashboard` | Read-only access to dashboard analytics, reports, and grant data exports |

## Supabase User Setup

1. In Supabase Auth, create or invite users and copy each `user.id`.
2. In the `profiles` table, insert or update each user with their `id` and `role`.
3. Ask users to sign out and sign back in to refresh role-based access.

## Docs

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/hopescorner/hopes-corner-app)
