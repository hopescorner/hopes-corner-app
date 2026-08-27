# Copilot Instructions (Repository-wide)

These instructions apply to all Copilot coding tasks in this repository.

## Scope and quality bar

- Make focused, minimal changes that solve the root cause.
- Follow existing patterns before introducing new abstractions.
- Do not leave placeholder logic or partially wired features.
- Preserve existing UX unless the task explicitly requires UX changes.
- For bug fixes, first find the shared failing path and fix it there instead of patching only the reported screen.

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

## Fix workflow

For every bug fix or behavior change:

- Reproduce the issue from the code path, test, or smallest local check before changing code when practical.
- Add or update a regression test that fails without the fix.
- Keep the test scoped to the changed behavior; broaden only when the touched code is shared.
- Do not skip tests because a change is "small" if it changes logic, UI behavior, store behavior, data mapping, dates, permissions, or service limits.
- If a regression test truly cannot be added, state the concrete reason in the final handoff.

## Testing requirements (mandatory)

For any logic/UI change:

- Add/update tests for changed behavior before final handoff.
- Prefer targeted Vitest or colocated component tests first, then broader tests as needed.
- Keep existing tests passing; do not break unrelated behavior.
- Never claim tests passed unless the command was actually run and passed locally or in visible CI.

Before final handoff, run:

- `npm run lint`
- `npm test`
- `npm run build`
- `npm run test:ct` when UI/components/interactions changed.

If a required command cannot be run, include the command and the blocker in the final handoff.

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

## Versioning and changelog (mandatory for app-visible changes)

For every user-visible app change, including fixes:

- Bump `APP_VERSION` in `src/lib/utils/appVersion.ts` using semantic versioning.
- Add a concise, non-technical entry at the top of the `CHANGELOG` array in `src/lib/utils/appVersion.ts`.
- Update `APP_VERSION` in `public/sw.js` to the same value so the service worker cache name stays in sync.
- Add the same release note to the top of `CHANGELOG.md`.
- Run `npm run version:check` before final handoff.

Do not update the app version for documentation-only, test-only, CI-only, or internal refactor changes with no staff/admin-visible behavior change.

## PR/task output expectations

Copilot responses and generated changes should include:

- What changed and where.
- Test evidence with exact commands run and outcomes.
- Changelog/version evidence for app-visible changes, or a short note explaining why no version bump was needed.
- Any known risks, follow-ups, or constraints.
