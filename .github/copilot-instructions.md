# Copilot Instructions (Repository-wide)

These instructions apply to all Copilot coding tasks in this repository.

## Scope and quality bar

- Make focused, minimal changes that solve the root cause.
- Follow existing patterns before introducing new abstractions.
- Do not leave placeholder logic or partially wired features.
- Preserve existing UX unless the task explicitly requires UX changes.

## Tech stack conventions

- Framework: Next.js App Router + TypeScript.
- State: Zustand stores (immer/persist where used).
- Data: Supabase PostgreSQL.
- Styling: Tailwind CSS + existing design tokens/utilities.

## Codebase-specific rules

- Check types first in `src/types/database.ts`.
- Keep business logic in stores where current code already does so.
- Use existing mappers/utilities in `src/lib/utils/` instead of duplicating transformations.
- For Zustand object selectors, use `useShallow` from `zustand/react/shallow`.
- Keep date handling consistent with existing helpers in `src/lib/utils/date`.

## Testing requirements (mandatory)

For any logic/UI change:

- Add/update tests for changed behavior.
- Prefer targeted tests first, then broader tests as needed.
- Keep existing tests passing; do not break unrelated behavior.

Before final handoff, run:

- `npm run lint`
- `npm test -- --run`
- `npm run build`
- Relevant Playwright component tests when UI was changed (CI runs `npm run test:ct`).

## Database and migrations

If schema/data model changes are required:

- Create migration files under `supabase/migrations/` using Supabase conventions.
- Include all required DB objects in migration scope (tables, columns, enums, triggers, views, RLS policies).
- Keep `database/schema.sql` updated as a reference when schema changes are made.
- Ensure migration changes are safe, reversible where practical, and documented in the PR/issue notes.

## Feature removal / deprecation tasks

When removing or replacing a feature, perform complete cleanup:

- Remove UI entry points (routes, tabs, buttons, modals, navigation links).
- Remove/refactor related stores, hooks, selectors, APIs, and permissions.
- Remove/migrate DB dependencies via migrations.
- Remove dead types, constants, utilities, and unused dependencies/imports.
- Remove/update tests for deleted behavior.
- Verify no orphaned references remain (`lint`, TypeScript, and search should be clean).
- Update user/admin documentation and runbooks impacted by removal.

## Versioning and changelog

For user-visible feature work, update `src/lib/utils/appVersion.ts`:

- Bump `APP_VERSION` using semantic versioning.
- Add a concise, non-technical `CHANGELOG` entry.

## PR/task output expectations

Copilot responses and generated changes should include:

- What changed and where.
- Test evidence (what was run and outcome).
- Any known risks, follow-ups, or constraints.
