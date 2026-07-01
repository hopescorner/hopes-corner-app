# Changelog

## [0.5.40] - 2026-07-01

### Fixed

- Laundry bookings now verify weekly usage with valid database statuses only, preventing the weekly-limit check from blocking valid onsite and offsite bookings.

## [0.5.39] - 2026-07-01

### Fixed

- Fixed a laundry booking bug that could incorrectly block valid onsite and offsite assignments when checking a guest's weekly laundry limit.

## [0.5.38] - 2026-06-29

### Added

- Guests are now limited to 2 laundry loads per week (onsite + offsite combined). The week resets every Monday (Pacific time). The laundry booking modal and admin backfill form show the guest load count, remaining slots, and a clear "limit reached" banner that blocks further assignments until next Monday. The cap is enforced at the store on every write, so it is respected even when multiple staff book concurrently.

## [0.5.36] - 2026-06-11

### Fixed

- Resolved client-side infinite render loop (React error #185) on the admin dashboard, specifically affecting the `board` role upon direct login. Chart mounting is now deferred by 500ms (completed entrance transitions) to prevent measuring shifting elements.

## [0.5.35] - 2026-06-11

### Fixed

- Prevented Recharts' `ResponsiveContainer` from triggering repeated `ResizeObserver` measurements and infinite-render loops (React error #185) by replacing entrance animation `scale` with `translateY` + `opacity`, deferring chart mounting with double `requestAnimationFrame` in `AnalyticsSection`, and enforcing explicit `minWidth` and `minHeight` on responsive charts.

### Added

- Added Monthly Summary Report export as CSV, supporting detailed per-section exports.
- Pinned Turbopack's workspace root configuration in `next.config.ts`.

### Performance

- Improved dashboard report preloading by replacing direct state usage with `loadedReportYearsRef` to eliminate unnecessary dependencies and stale-closure issues.

## [0.5.34] - 2026-06-10

### Fixed

- Implemented a self-healing background guest loading mechanism. If a shower reservation, laundry booking, meal record, or bicycle repair references a guest ID not present in the local store, it is fetched dynamically in the background, resolving "Unknown Guest" names in the queues.

### Added

- Clicking the Hope's Corner logo in the top-left header now triggers a page reload, enabling PWA users to easily refresh the application.

## [0.5.33] - 2026-06-09

### Added

- Added Year-to-Date (YTD) cumulative metrics on the Meal Services Report page, featuring a dedicated count of all meals served excluding lunch bags for the YTD.

## [0.5.32] - 2026-05-11

### Added

- The Donations Log export now includes a per-row estimated dollar value at $1.97 per pound, leaving the value blank for donations without a usable weight.

## [0.5.31] - 2026-05-11

### Added

- Donation totals now show an estimated dollar value at $1.97 per pound in the Donations section, Analytics, Monthly Report Generator, and Monthly Summary Report.
- Donation value calculations ignore records without a usable positive weight, so incomplete rows do not skew totals.

## [0.5.30] - 2026-05-02

### Fixed

- In-app issue and feature request submissions now create the GitHub issue before applying Copilot assignment and labels, preventing optional GitHub metadata validation failures from blocking the submission.
- Staff now see a successful issue-created message even if GitHub accepts the issue but needs assignment or labels reviewed.

## [0.5.29] - 2026-05-02

### Added

- Guest cards now show a "Last visit" badge so staff can quickly see when someone was most recently seen.
- The last-visit date is computed across meals, showers, laundry, bicycles, haircuts, and holiday visits, so it reflects the guest's most recent activity anywhere in the app.
- Added selector tests covering each record source and the shared most-recent-date logic.

## [0.5.28] - 2026-05-02

### Performance

- Made the dashboard feel snappier on lower-powered laptops by deferring heavier report preloading until browser idle time or when a report tab is opened.
- Reduced dashboard overview CPU and memory churn by calculating monthly and yearly cards in one shared pass instead of repeatedly filtering large record lists.
- Improved repeat report generation by reusing parsed date values in the shared report cache and narrowing report subscriptions to the store data each report needs.

## [0.5.21] - 2026-03-31

### Added in 0.5.21

- Multi-day notes: daily notes can now span a date range via a "Multi-day note" toggle in the modal, with start/end date pickers and validation. Range notes automatically appear on all intermediate dates. Useful for equipment outages or multi-day events.
- 6 new tests covering range-aware getters (getNotesForDate, getNotesForDateRange, hasNoteForDateAndService).
- Database migration adding nullable `note_end_date` column with check constraint.

## [0.4.1] - 2026-03-31

### Added in 0.4.1

- Realtime toast notifications for shower and laundry bookings — when a checkin user books a slot on one device, staff users viewing the services page see an immediate toast (e.g. "John Doe was signed up for Shower at 9:00 AM") with lucide-react icons (ShowerHead, WashingMachine). Uses preferred name when available, falls back to first + last name.
- `resolveGuestName()` helper in `useRealtimeSync` for guest name lookup from the Zustand store.
- 7 new tests covering: INSERT notifications for showers/laundry, preferred name resolution, UPDATE/DELETE suppression, unknown guest fallback, and absent slot time handling.
