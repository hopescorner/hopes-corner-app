# AGENTS.md - LLM Context Guide

> Quick reference for LLMs to understand the Hope's Corner Check-in App codebase.

## Project Overview

**Purpose**: Check-in and service management app for Hope's Corner, a nonprofit serving unhoused individuals in Santa Clara County, California.

**Core Functions**:

- Guest registration and check-in
- Meal tracking (breakfast, lunch, extra meals, RV/shelter pickup)
- Service bookings: showers, laundry (onsite/offsite), bicycle repairs, haircuts, holiday visits
- Item distribution tracking
- Donation logging
- Admin dashboard with analytics and reporting

## Tech Stack

- Framework: Next.js 16.1.6 (App Router, React 19)
- Language: TypeScript
- Styling: Tailwind CSS v4
- State: Zustand with immer middleware
- Database: Supabase (PostgreSQL)
- Auth: NextAuth v5 (beta) with Supabase
- Animation: framer-motion
- Charts: recharts, chart.js
- Testing: Vitest + React Testing Library + Playwright Component Testing
- PWA: Custom service worker (`public/sw.js`)

## Directory Structure

```text
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Login page (unprotected)
│   ├── (protected)/       # Authenticated routes
│   │   ├── check-in/      # Main check-in interface
│   │   ├── dashboard/     # Admin dashboard
│   │   └── services/      # Service management
│   └── api/auth/          # NextAuth API routes
├── components/
│   ├── admin/             # Dashboard, analytics, reporting
│   ├── checkin/           # Check-in flow components
│   ├── guests/            # GuestCard, GuestCreateModal, LinkedGuestsList
│   ├── modals/            # All modal dialogs
│   ├── services/          # Shower, laundry, bicycle, donations sections
│   └── ui/                # Shared UI primitives
├── stores/                # Zustand stores
│   └── selectors/         # Precomputed status map hooks
├── lib/
│   ├── auth/              # Auth utilities
│   ├── constants/         # App constants
│   ├── supabase/          # Supabase client setup
│   └── utils/             # Helpers (normalizers, mappers, search)
└── types/                 # TypeScript type definitions
```

## Key Zustand Stores

| Store                   | Purpose                                               |
| ----------------------- | ----------------------------------------------------- |
| `useGuestsStore`        | Guest CRUD, proxies (linked guests), warnings, bans   |
| `useMealsStore`         | Meal attendance records                               |
| `useServicesStore`      | Showers, laundry, bicycle repairs, haircuts, holidays |
| `useItemsStore`         | Item distribution tracking                            |
| `useDonationsStore`     | Donation logging                                      |
| `useSettingsStore`      | App settings (slot configs, etc.)                     |
| `useBlockedSlotsStore`  | Blocked shower/laundry time slots                     |
| `useActionHistoryStore` | Undo/redo action history                              |
| `useModalStore`         | Global modal state                                    |
| `useWaiverStore`        | Service waivers                                       |

### Store Pattern

All stores use:

- `zustand` with `immer` middleware for immutable updates
- `persist` middleware for localStorage (where needed)
- `loadFromSupabase()` for initial data fetch
- Real-time Supabase subscriptions for live updates

## Database Schema (Supabase)

**Core Tables**:

- `guests` - Guest profiles with ban fields
- `meal_attendance` - Meal records with `meal_type` enum
- `shower_reservations` - Shower bookings with status
- `laundry_bookings` - Onsite/offsite laundry with status workflow
- `bicycle_repairs` - Repair requests with priority queue
- `haircut_visits`, `holiday_visits` - Simple visit logs
- `items_distributed` - Item distribution records
- `donations` - Primary food donation logs used by current Services UI
- `guest_proxies` - Linked guests (max 3 per guest)
- `guest_warnings` - Warning records for guests
- `service_waivers` - Signed waivers for services
- `profiles` - User roles (checkin, staff, admin, board)

**Key Enums**:

- `meal_type`: guest, extra, rv, shelter, united_effort, day_worker, lunch_bag
- `shower_status`: booked, waitlisted, done, cancelled, no_show
- `laundry_status`: waiting, washer, dryer, done, picked_up, pending, transported, returned, offsite_picked_up
- `bicycle_repair_status`: pending, in_progress, done

## Authentication & Roles

Roles defined in `profiles.role`:

- `checkin` - Basic check-in access
- `staff` - Service management
- `admin` - Full admin access
- `board` - Board member view

Protected routes in `src/app/(protected)/` require authentication.

## Performance Optimizations

1. **Precomputed Status Maps** (`src/stores/selectors/todayStatusSelectors.ts`):
   - `useTodayMealStatusMap()` - O(1) guest meal status lookup
   - `useTodayServiceStatusMap()` - O(1) service status lookup
   - `useTodayActionStatusMap()` - O(1) action history lookup

2. **Search Debouncing**: `useDeferredValue` for search input

3. **Animation Gating**: Large lists (>20 items) disable framer-motion animations

4. **Guest Card Optimization**: Accepts precomputed maps as optional props

## Testing

- **Frameworks**: Vitest (jsdom) + Playwright Component Testing
- **Location**: `__tests__/` directories adjacent to source files
- **Run**: `npm test` (or `npm run test:watch`)
- **Coverage**: `npm run test:coverage`
- **Component tests**: `npm run test:ct` (or `npm run test:ct:ui`)

Test files follow pattern: `*.test.ts` or `*.test.tsx`

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
npm test         # Run all tests
npm run test:ct  # Run Playwright component tests
```

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

## Environment Variables

See `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL=[your-project-id].supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=ey_[your-anon-key-here]`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_[your-publishable-default-key-here]`
- `SUPABASE_SECRET_KEY=sb_secret_[your-secret-key-here]`

- `NEXTAUTH_URL=http://localhost:3000`
- `NEXTAUTH_SECRET="[your-nextauth-secret-here]"`
- `NEXT_PUBLIC_APP_NAME="Hope's Corner"`


## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`):

1. Lint + Vitest + Playwright component tests on branches/PRs
2. Run Supabase migrations on push to `main` when `supabase/migrations/` changed
3. Build and deploy on push to `main`

## Code Style

- ESLint with Next.js config
- Prefer functional components with hooks
- Use `cn()` utility for conditional classNames
- Toast notifications via `react-hot-toast`
- Icons from `lucide-react`

## Quick Tips for LLMs

1. **Types first**: Check `src/types/database.ts` for data shapes
2. **Store logic**: Most business logic lives in Zustand stores
3. **Supabase schema**: See `database/schema.sql` for triggers/RLS
4. **Test mocks**: Mock store hooks in tests, not Supabase directly
5. **Component colocation**: Tests live in `__tests__/` next to components
6. **Date handling**: Use `date-fns` patterns, dates stored as ISO strings
7. **Location options**: BAY_AREA_CITIES array in `GuestCreateModal.tsx` and `GuestEditModal.tsx`
8. **Zustand selectors**: Prefer `useShallow` from `zustand/react/shallow` for object selectors
