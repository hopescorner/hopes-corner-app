# Hope's Corner Check-in App

A check-in and service management application for Hope's Corner.

## Run

- `npm run dev`
- `npm test`
- `npm run lint`

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
