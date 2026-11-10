# AGENTS.md - LLM Context Guide

> Quick reference for LLMs to understand the Hope's Corner Check-in App codebase.

## Project Overview

**Purpose**: Check-in and service management app for Hope's Corner, a nonprofit serving unhoused individuals in Santa Clara County, California.

The repo ships two experiences on one Next.js app and one Supabase database:

1. **Staff app** — guest check-in, meal tracking, service bookings, dashboard (roles: `admin`, `staff`, `checkin`, `bicycle`, `board`).
2. **Public Holiday Toy & Gift Distribution** — self-service, trilingual (en/es/zh) registration with QR tickets at `/holiday`. No login; staff manage it from the Services → Holiday tab.

**Core Functions**:

- Guest registration and check-in (v2 "snapshot + commands" backend, see below)
- Meal tracking (breakfast, lunch, extra meals, RV/shelter pickup, auto lunch bags)
- Service bookings: showers, laundry (onsite/offsite), bicycle repairs, haircuts, holiday visits
- Item distribution tracking
- Donation logging
- Admin dashboard with analytics and reporting
- Public holiday program registration + staff check-in/walk-in/ticket scanning

## Tech Stack

- Framework: Next.js 16.4.5 (App Router, React 19, Turbopack)
- Language: TypeScript
- Styling: Tailwind CSS v4
- State: Zustand with immer middleware
- Database: Supabase (PostgreSQL) — `supabase/migrations/` is the operational source of truth
- Auth: NextAuth v5 (beta) with Supabase Auth as the identity backend
- Animation: framer-motion
- Charts: recharts
- Lists: `@tanstack/react-virtual` (check-in directory)
- Holiday tickets: `qrcode`, `jspdf`, `jsqr` (canvas tickets, PDF export, camera scan)
- Testing: Vitest + React Testing Library + Playwright Component Testing
- PWA: Hand-written service worker (`public/sw.js`), registered by `ServiceWorkerRegistration`

## Directory Structure

```text
src/
├── app/                    # Next.js App Router
│   ├── (auth)/login/      # Login page (unprotected)
│   ├── (protected)/       # NextAuth-gated routes (see src/proxy.ts)
│   │   ├── check-in/      # Main check-in interface
│   │   ├── dashboard/     # Admin dashboard (server component)
│   │   └── services/      # Service management tabs
│   ├── holiday/           # Public holiday registration (+ /holiday/shopper checklist)
│   └── api/               # Route handlers — /api is public at the proxy; each route authenticates
│       ├── auth/          # NextAuth handler
│       ├── check-in/      # v2 snapshot, commands, reconcile, guest merge/duplicates/history
│       ├── headlines/     # Daily Bay Area headlines (rank ≤ 5/day)
│       ├── holiday/       # Public register/lookup/slots + staff ops (registrations, check-in…)
│       ├── version/       # { version } — polled by the SW update banner
│       └── weather/       # Mountain View weather fetch + daily cache
├── components/
│   ├── admin/             # Dashboard, analytics, reports/ (Holiday/Meal/Monthly), SlotBlockManager
│   ├── checkin/           # Check-in flow components
│   ├── guests/            # GuestCard, GuestCreateModal, LinkedGuestsList, …
│   ├── modals/            # All modal dialogs
│   ├── services/          # Shower, laundry, bicycle, meals, holiday program, donations sections
│   ├── ui/                # Shared badges (waiver, reminder, housing status)
│   ├── icons/             # Custom SVG icon components
│   ├── layouts/           # MainLayout
│   ├── providers/         # NextAuthProvider, LanguageProvider, ProtectedOverlays, RealtimeSyncProvider
│   ├── pwa/               # ServiceWorkerRegistration, AppVersion
│   ├── __ct__/            # Playwright CT story wrappers (serialisable props, not tests)
│   └── **/__tests__/      # Vitest tests co-located beside source
├── hooks/                  # useServiceViewDate/useServiceViewState, useRealtimeSync, useServiceClock, useIsMobile, …
├── stores/                # Zustand stores
│   └── selectors/         # Precomputed status map hooks
├── lib/
│   ├── auth/              # NextAuth config + role inference (ROLE_ACCESS, inferRole)
│   ├── checkin/           # Check-In v2: snapshot normalizers, RPC repository, offline queue, commands
│   ├── constants/         # App constants (meal limits, housing statuses, laundry slots)
│   ├── holiday/           # Holiday program: tokens (HMAC), rate limit, translations, age groups
│   ├── headlines/         # Bay Area headlines fetch/save
│   ├── services/          # Service tab → data-key mapping (tabLoading)
│   ├── supabase/          # Client/server/realtime setup
│   ├── utils/             # Helpers — incl. date.ts (Pacific helpers), slots, search, CSV, dashboard
│   ├── weather/           # Mountain View weather (Open-Meteo)
│   └── seasonal.ts        # October pumpkin brand swap; Nov turkey easter egg
├── data/                  # changelog.json (consumed by AppVersion/WhatsNewModal)
├── proxy.ts               # Next.js 16 proxy (not middleware.ts): NextAuth gate + role access
└── types/                 # database.ts, checkin.ts, holiday.ts
```

## Key Zustand Stores

| Store                   | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `useGuestsStore`        | Guest CRUD, proxies (linked guests), warnings, bans, families  |
| `useMealsStore`         | Meal attendance, extra meals, auto lunch-bag logic, undo       |
| `useServicesStore`      | Showers, laundry, bicycle repairs, haircuts, holiday visit log |
| `useItemsStore`         | Item distribution tracking                                      |
| `useDonationsStore`     | Donation logging                                                |
| `useSettingsStore`      | App settings (`auto_meal_additions_enabled`, targets)           |
| `useBlockedSlotsStore`  | Blocked shower/laundry time slots (partial blocks)             |
| `useActionHistoryStore` | Undo/redo action history (max 300, persisted)                  |
| `useModalStore`         | Global modal state                                              |
| `useWaiverStore`        | Service waivers (shower+laundry shared; bicycle separate)       |
| `useCheckInStore`       | Check-In v2 client state (directory, search index, status map) |
| `useDailyNotesStore`    | Daily service notes (date range, service type)                  |
| `useRemindersStore`     | Guest reminders (shower/laundry/bicycle/all) with dismiss flow  |
| `useHolidayStore`       | Holiday program staff store (registrations, check-in, walk-ins) |
| `useHeadlinesStore`     | Bay Area daily headlines (write + realtime)                     |
| `useWeatherStore`       | Daily Mountain View weather records                             |

### Store Pattern

All stores use:

- `zustand` with `immer` middleware for immutable updates
- `persist` middleware for localStorage (where needed)
- `loadFromSupabase()` for initial data fetch
- Real-time Supabase subscriptions (`useRealtimeSync` / `lib/supabase/realtime.ts`) for live updates

## Database Schema (Supabase)

`supabase/migrations/` (43 migrations) is the operational source of truth — CI applies
them with `supabase db push`. `database/schema.sql` is a fresh-database reference; it
currently lags migrations (e.g. the check-in v2 RPCs `get_checkin_snapshot` /
`execute_checkin_meal_command` exist only in migrations), so don't treat it as complete.

**Core Tables**:

- `guests` - Guest profiles with ban fields
- `meal_attendance` - Meal records with `meal_type` enum; `deduplication_key` unique index drives lunch-bag idempotency
- `shower_reservations` - Shower bookings with status, waitlist positions, `replica identity full`
- `laundry_bookings` - Onsite/offsite laundry with status workflow
- `bicycle_repairs` - Repair requests (`repair_types text[]`) with priority queue
- `haircut_visits`, `holiday_visits` - Simple once-per-day visit logs (`holiday_visits` is unrelated to the holiday program — see below)
- `blocked_slots` - Partial/full shower & laundry slot blocks (capacity enforced in DB)
- `items_distributed` - Item distribution records
- `donations` - Primary food donation logs used by current Services UI
- `guest_proxies` - Linked guests (max 3 per guest)
- `guest_families`, `guest_family_members`, `family_meal_distributions` - Family tracking
- `guest_warnings`, `guest_reminders` - Warning and reminder records
- `service_waivers` - Signed waivers (shower/laundry/bicycle)
- `daily_notes` - Per-service daily notes
- `app_settings` - Global settings (`auto_meal_additions_enabled`, targets)
- `sync_state` - Sync bookkeeping
- `daily_weather`, `daily_headlines` - Dashboard analytics cache
- `holiday_registrations`, `holiday_children`, `holiday_registration_rate_limits` - Holiday program
- `profiles` - User roles (`checkin`, `staff`, `admin`, `board`, `bicycle`)

**Key Enums**:

- `meal_type`: guest, extra, rv, shelter, united_effort, day_worker, lunch_bag
- `shower_status`: booked, waitlisted, done, cancelled, no_show
- `laundry_status`: waiting, washer, dryer, done, picked_up, pending, transported, returned, offsite_picked_up, cancelled, no_show, waitlisted
- `bicycle_repair_status`: pending, in_progress, done

## Authentication & Roles

Sessions are NextAuth v5 (beta); Supabase Auth is the identity backend
(`signInWithPassword` via a service-role admin client). Role comes from
`profiles.role`, falling back to email-prefix inference (`admin*`→admin,
`board*`/`grants*`→board, `checkin*`→checkin, `bicycle*`→bicycle, else staff).

Roles and `ROLE_ACCESS` (`src/lib/auth/types.ts`):

- `admin` - check-in + services + dashboard (Full access)
- `staff` - check-in + services + dashboard
- `board` - dashboard only (read-only analytics/reports/exports)
- `checkin` - check-in only
- `bicycle` - check-in + services (Bicycles tab only)

Routing is gated by `src/proxy.ts` (Next.js 16 proxy convention — there is **no**
`middleware.ts`). Public: `/login`, `/api` (routes authenticate themselves),
`/sw.js`, `/holiday`. `/` redirects to the role's default route.

## Check-In v2

The check-in page runs a server-backed v2 flow (rollback flag `CHECKIN_V2_ENABLED=false`):

- `GET /api/check-in/snapshot` → `get_checkin_snapshot` RPC
- `POST /api/check-in/commands` → `execute_checkin_meal_command` RPC (role-gated)
- `/api/check-in/reconcile`, `/api/check-in/guests/...` (history, context, duplicates, merge)
- Server logic lives in `src/lib/checkin/` (normalizers, RPC repository, command validation,
  IndexedDB offline queue `hopes_corner_offline_db` with replay)

## Holiday Program

Public, self-service toy-and-gift registration at `/holiday` (trilingual en/es/zh):

- Server-generated ticket number + HMAC-signed QR ticket token (`src/lib/holiday/ticketToken.ts`)
- Download ticket PNG/PDF (`ticketImage.ts`, `jspdf`), Add to Calendar ICS, lookup-by-phone
- Rate-limited by hashed IP + honeypot fields (`rateLimit.ts`, `validation.ts`)
- Staff management from Services → Holiday tab: registrations list, check-in/undo, walk-ins,
  QR scan (`HolidayQRScannerModal`, `jsqr`), shopper checklist tokens (`/holiday/shopper?token=…`)
- Staff endpoints (`/api/holiday/staff/*`) require `admin`/`staff` via `requireHolidayStaff()`

## Performance Optimizations

1. **Precomputed Status Maps** (`src/stores/selectors/todayStatusSelectors.ts`):
   - `useTodayMealStatusMap()` - O(1) guest meal status lookup
   - `useTodayServiceStatusMap()` - O(1) service status lookup
   - `useTodayActionStatusMap()` - O(1) action history lookup

2. **Search Debouncing**: `useDeferredValue` for search input (`CheckInClient`, showers/laundry)

3. **Animation Gating**: Large lists (>20 items) disable framer-motion animations

4. **Guest Card Optimization**: Accepts precomputed maps as optional props

5. **Directory Virtualization**: `@tanstack/react-virtual` in `CheckInClient`

## Testing

- **Frameworks**: Vitest (jsdom) + React Testing Library; Playwright Component Testing for `.ct.tsx`
- **Location**: `__tests__/` directories adjacent to source files; CT files are `*.ct.tsx` beside the component
- **Run**: `npm test` (or `npm run test:watch`)
- **Coverage**: `npm run test:coverage` (thresholds: 80% lines/functions/statements, 70% branches)
- **Component tests**: `npm run test:ct` (or `npm run test:ct:ui`)
- **SQL tests**: `npm run test:db` — applies migrations + `supabase/tests/*.test.sql` on a disposable Postgres (`slot_blocking_test`)

Test files follow pattern: `*.test.ts` or `*.test.tsx`; CT: `*.ct.tsx` (story wrappers in `src/components/__ct__/`)

### Shower and laundry safeguards

- Use `useServiceViewDate` for the selected service date (in `src/hooks/useServiceViewState.ts`). Today must follow the Pacific service day; historical selections must stay fixed.
- Keep slot capacity, blocked slots, and weekly laundry limits enforced in the database. Blocks must preserve existing bookings and allow staff to finish them.
- Add a regression test for each changed booking rule. Test real UI, store, or database behavior. Arithmetic on test constants does not test database enforcement.
- Test updates received during a slow refresh or failed save. Newer bookings, status changes, and deletions must survive those requests.
- Keep `database/schema.sql` and `supabase/migrations/` in agreement — but know migrations win where they diverge; fix schema.sql when you notice drift. SQL tests and competing-booking checks run in CI on a disposable database.
- Run `npm run typecheck`, `npm test`, `npm run test:ct`, `npm run build`, and `npm run version:check` before release. Playwright CT covers Chromium for all `.ct.tsx`; WebKit with an iPad (gen 7) profile runs only the showers/laundry CT files.

## Scripts

```bash
npm run dev             # Start dev server
npm run build           # Production build + check-in bundle budget check (budget:check-in)
npm run start           # Start production server
npm run lint            # ESLint
npm run typecheck       # next typegen && tsc --noEmit
npm test                # Run all Vitest tests
npm run test:watch      # Vitest watch mode
npm run test:coverage   # Coverage report (v8)
npm run test:ct         # Run Playwright component tests
npm run test:ct:ui      # Playwright CT UI mode
npm run test:db         # Database rule tests (needs disposable Postgres)
npm run version:check   # CI guard: package.json / appVersion.ts / sw.js / CHANGELOG in sync
npm run budget:check-in # Check-in bundle budget (also wired into build)
```

## App version

`APP_VERSION` lives in `src/lib/utils/appVersion.ts` and must match `public/sw.js`,
`package.json`, and the top `## [x.y.z]` entry in `CHANGELOG.md`.
`npm run version:check` (run in CI) fails if they drift. Releases are tagged
`v<version>` and GitHub-released automatically by `release.yml`.

## Common Patterns

### Adding a new service type

1. Add types in `src/types/database.ts`
2. Create/update store in `src/stores/`
3. Add UI component in `src/components/services/`
4. Update `GuestCard.tsx` if service appears on guest card
5. Add precomputed selector if needed for performance

### Guest bans

Guests can be banned globally or per-service:

- `banned_until` - Global ban expiry
- `banned_from_meals`, `banned_from_shower`, etc. - Service-specific bans
- Database triggers enforce bans at write time

### Linked guests (proxies)

- Max 3 linked guests per primary guest
- Used for meal pickup on behalf of others
- Managed in `useGuestsStore` via `guest_proxies` table

### Automatic lunch bags — one per person per service day

**Invariant: each person gets exactly one auto-added lunch bag per service day**,
no matter how they earned it — one meal, two meals, an extra meal, picking up for
a linked guest, or any combination. Fridays are excluded, and the whole feature
is gated on the `auto_meal_additions_enabled` app setting.

Enforcement is the database, not app logic: every write path computes the same
deduplication key and lets the unique index collapse repeats.

```text
lunch_bag_auto_<guestId>_<YYYY-MM-DD>
```

Because the key is identical everywhere, adds are idempotent and order-independent
across devices. **If you add a new write path (importer, server-side command, backfill),
use this key** — do not invent a variant. A separate `lunch_bag_proxy_*` key once
existed and silently gave proxy pickers two bags a day; that is why the rule is
written down here.

Paths that must stay in agreement:

| Path | Where |
| --- | --- |
| Services page / proxy pickup | `useMealsStore.addMealRecord`, `addExtraMealRecord` |
| Check-In page | `execute_checkin_meal_command` RPC |
| Retraction on undo/delete | `useMealsStore.deleteMealRecord`, `deleteExtraMealRecord` |

Removing a guest's last meal for the day must also retract their bag, or undone
check-ins leave orphan bags that permanently inflate the day's count. Only bags
matching the key above are ever retracted — bulk and manually-entered bags are
left alone.

Sanity check on the Meals tab: **Guests Served should equal Lunch Bags.** Bags may
legitimately run slightly higher when someone only collected for a buddy and never
ate (entitled to a bag, absent from Guests Served), and are zero on Fridays.

## Environment Variables

See `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL=<your-project-id>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=ey_<your-anon-key-here>`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_<your-publishable-default-key-here>`
- `SUPABASE_SECRET_KEY=sb_secret_<your-secret-key-here>`

- `NEXTAUTH_URL=http://localhost:3000`
- `AUTH_SECRET="<your-auth-secret-here>"` (generate with `npx auth secret`; `NEXTAUTH_SECRET` also supported)
- `NEXTAUTH_SECRET="<your-nextauth-secret-here>"`
- `NEXT_PUBLIC_APP_NAME="Hope's Corner"`
- `CHECKIN_V2_ENABLED=true` (set to `false` to roll back to the legacy check-in loader)
- `NEXT_PUBLIC_HOLIDAY_EVENT_MONTH_DAY=12-20` (optional, MM-DD; year comes from system date)

## CI/CD

Pull requests run `.github/workflows/ci.yml` → reusable `test.yml`:

1. **lint**: `version:check`, ESLint, `typecheck`
2. **vitest**: `npm test`
3. **playwright**: `npm run test:ct` with chromium + webkit installed; the WebKit/iPad (gen 7)
   project only runs the Showers/Laundry CT files — everything else is Chromium-only
4. **database**: Postgres 17 service → `scripts/testSlotBlockingDb.sh` → `supabase/tests/*.test.sql`
5. **ci-pass**: gates on all four

Pushes to `main` run `release.yml`: the same test suite, then **migrate**
(`supabase db push --remote`, gated on `supabase/migrations/` changes vs the moving
`last-migrated` tag), then **deploy** to Vercel via the Vercel CLI
(`vercel pull`/`build`/`deploy --prebuilt --prod`, not the GitHub integration), then
**tag-release** (`v<version>` tag + GitHub release from `CHANGELOG.md`).

## Code Style

- ESLint with Next.js config
- Prefer functional components with hooks
- Use `cn()` utility for conditional classNames
- Toast notifications via `react-hot-toast`
- Icons from `lucide-react` (plus custom animated icons in `src/components/icons/`)
- Pacific service day everywhere: use the helpers in `src/lib/utils/date.ts`
  (`todayPacificDateString`, `pacificDateStringFrom`, …), not ad-hoc `new Date()` math

## Quick Tips for LLMs

1. **Types first**: Check `src/types/database.ts` for data shapes (plus `checkin.ts`, `holiday.ts`)
2. **Store logic**: Most business logic lives in Zustand stores
3. **Supabase schema**: `database/schema.sql` is a reference for a fresh DB; `supabase/migrations/` wins on drift — check recent migrations for the check-in v2 RPCs and lunch-bag triggers
4. **Test mocks**: Mock store hooks in tests, not Supabase directly
5. **Component colocation**: Tests live in `__tests__/` next to components; CT files (`*.ct.tsx`) sit beside the component they test
6. **Date handling**: Pacific-service-day helpers in `src/lib/utils/date.ts`; dates stored as ISO strings / `date` columns
7. **Location options**: BAY_AREA_CITIES array in `GuestCreateModal.tsx` and `GuestEditModal.tsx`
8. **Zustand selectors**: Prefer `useShallow` from `zustand/react/shallow` for object selectors
9. **Route gating**: `src/proxy.ts` (Next 16 proxy, not middleware.ts) — if a route should be public, add it to `publicRoutes` there and authenticate inside the handler

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
