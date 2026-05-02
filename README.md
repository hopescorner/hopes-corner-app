# Hope's Corner Check-in App

A check-in and service management application for Hope's Corner.

## Run

- `npm run dev`
- `npm test`
- `npm run lint`

## Supabase User Setup

Roles: `checkin`, `staff`, `admin`, `board`, `bicycle`.

1. In Supabase Auth, create or invite users and copy each `user.id`.
2. In the `profiles` table, insert or update each user:
   - `id = user.id`
   - `role = checkin | staff | admin | board | bicycle`
3. Ask users to sign out and sign back in to refresh role-based access.

## GitHub Feedback Setup

To let non-check-in users file app issues and feature requests from inside the app, add these server-side environment variables in Vercel:

- `GITHUB_FEEDBACK_TOKEN`: GitHub token with permission to create issues in this repository and assign Copilot.
- `GITHUB_FEEDBACK_OWNER`: defaults to `karangattu`.
- `GITHUB_FEEDBACK_REPO`: defaults to `hopes-corner-app`.
- `GITHUB_FEEDBACK_ASSIGNEE`: defaults to `copilot`.

## Docs

[Wiki](https://deepwiki.com/hopescorner/hopes-corner-app)
