# Changelog

## [0.7.0] - 2026-07-22

### Fixed

- Lunch bags are now added automatically for meals recorded through the Check-In page: the check-in database command recorded the meal but skipped the lunch-bag auto-add that the Services flow performs, so daily lunch bag counts fell far below the number of people served (e.g. 30 bags for 315 guest meals).
- Lunch bag auto-adds now follow a strict one-bag-per-person-per-day rule: a guest receiving a second meal on the same day no longer generates a duplicate bag.

### Added

- Auto-added lunch bags are now attributed to the guest they were assigned to, so staff can see exactly who received each bag and when.
- New "Lunch Bag Assignments" panel on the Meals page shows every bag for the selected day with the guest's name and assignment time, and separates guest-assigned bags from bulk entries.
- The Proxy Pickup Activity card now includes a detail list of who picked up meals for whom, with pickup times.
- New "Service Mix" breakdown visualizes the day's meal distribution across guest, extra, RV, day worker, shelter, and United Effort categories with lightweight bars (no chart library, so the page stays fast on phones and tablets).

### Changed

- The Meals summary area was reorganized into a responsive two-column layout on large screens that stacks cleanly on tablets and phones.

### Security & Stability (multi-device concurrency hardening)

- Daily meal limits (2 base, 2 extra, 4 total per guest per day) are now enforced by a database trigger with per-guest locking, so two devices recording meals for the same guest simultaneously can no longer exceed the limits. Over-limit edits in the activity log are also rejected and rolled back locally.
- The one-guest-meal-row-per-day unique index existed only in the reference schema, never as a migration; it now ships as a migration (merging any existing duplicate rows first), so incrementally-migrated databases get the same duplicate protection.
- When two devices record a guest's first meal at the same time, the losing device now recovers by incrementing the winning row instead of failing with "Unable to save meal record".
- Auto-added lunch bags now carry deduplication keys, making them idempotent across devices and across the Check-In and Services entry paths — parallel use can no longer double-bag a guest.
- Holiday visits are now limited to one per guest per day in the database (previously there was no duplicate protection at all — double-taps created unlimited duplicate rows).
- Onsite laundry slot booking is now serialized with a database advisory lock; previously two devices booking the last slot at the same moment could both succeed.
- The 2-loads-per-week laundry limit is now enforced in the database (previously client-side only, so two devices could each book a guest's "second" load).
- Haircut and holiday booking races now surface accurate messages ("that stylist slot was just taken") instead of generic save failures.
- Guest creation retries once with a fresh ID if the generated guest ID collides.
- The Check-In page now re-reconciles its snapshot whenever the tab becomes visible again and every 2 minutes while visible, so a device that slept, lost its realtime connection, or sat open all day at the front desk converges automatically instead of staying stale until manual reload.
- Shower and laundry status buttons no longer show a false "Status updated" success toast when the update actually failed and was rolled back — every caller now checks the result.
- Reactivating a laundry booking that would exceed the weekly limit or a taken slot now shows the real reason instead of a generic failure, and shower booking surfaces the "already has a reservation for this date" message from the database.

## [0.6.8] - 2026-07-20

### Fixed

- The Meals "Proxy Pickup Activity" card no longer flashes a false "No proxy pickups logged" message during the brief window after Check-In hydrates today's placeholder data — it now shows a loading state until the real records finish loading.

## [0.6.7] - 2026-07-20

### Fixed

- The Meals activity log no longer shows the same 5:00 AM time for every guest after visiting Check-In: the check-in snapshot seeded placeholder meal records and marked the stores as loaded, so the Services and Dashboard pages skipped fetching the real records — losing real timestamps, RV/lunch-bag/day-worker meals, and all history.
- Meal totals no longer double-count during check-in: the real-time update for a guest's meal now replaces the snapshot placeholder record instead of appearing alongside it.
- Returning to the Check-In page no longer wipes already-loaded meal and service data back to today-only placeholder records.

## [0.6.6] - 2026-07-20

### Fixed

- The Services page no longer appears empty when opened directly: a regression from the 0.6.0 check-in refactor built the list of data loaders but never invoked them, so guests, meals, showers, and laundry only showed up if another page had already loaded them.

### Added

- Production deploys now create a Git tag and a GitHub release automatically, with release notes pulled from the matching CHANGELOG.md section.
- `version:check` now also verifies that the in-app changelog (`appVersion.ts`) and `CHANGELOG.md` both cover the current version, so the "What's New" modal and release notes can't drift out of date.

## [0.6.5] - 2026-07-20

### Fixed

- Laundry bag numbers no longer disappear: the card's Edit field now always starts from the latest saved bag number, so saving can't silently erase one entered elsewhere (for example, via the drag prompt or another device).
- Laundry updates from other devices are no longer dropped when several records change at nearly the same time, so bag numbers and statuses stay in sync across tablets.

### Improved

- The Off-site Laundry board is now always visible on the Laundry tab, showing its empty columns even when no off-site loads are booked yet.

## [0.6.2] - 2026-07-20

### Fixed

- Undoing a meal or service now updates the guest card immediately and stays in sync when the real-time confirmation arrives.

## [0.6.1] - 2026-07-20

### Removed

- Removed the in-app GitHub issue filing feature that used Copilot to triage feedback.

## [0.6.0] - 2026-07-19

### Performance

- Check-in now opens from a compact daily snapshot, searches a prebuilt guest directory, and loads full guest details only when needed for a much faster, more responsive tablet experience.

### Improved

- Meal and service actions now respond immediately and reconcile with the server so check-in tablets stay aligned when staff work at the same time.

## [0.5.55] - 2026-07-18

### Fixed

- The Meals service summary now shows shelter meals only for the selected date instead of displaying the total across all loaded dates.

## [0.5.54] - 2026-07-18

### Fixed

- Guests with a cancelled or no-show shower can now be rebooked or marked completed. If their original slot has since filled, the completion is automatically recorded as an unscheduled waitlist shower instead of failing with a capacity error.

## [0.5.53] - 2026-07-17

### Fixed

- RV meals (40) are no longer automatically added on Wednesdays, and the RV bulk entry option is hidden when the selected date falls on a Wednesday.


## [0.5.52] - 2026-07-15

### Improved

- Increased the rendering size and stroke width of the Jacket and Backpack icons in the amenities grid, making them significantly easier to see against thin-line styles.

## [0.5.51] - 2026-07-15

### Improved

- Assigned supplies (backpack, jacket, sleeping bag, etc.) now display in a distinct, muted gray style when unavailable or on cooldown, providing clearer visual separation from available items.

## [0.5.50] - 2026-07-15

### Added

- Allowed staff to cancel past laundry slots that were assigned in the waiting lane but never processed, preventing those stale entries from showing up as legacy Action Required items on subsequent service days.

## [0.5.49] - 2026-07-15

### Fixed

- Added stable tiebreaker ordering to database pagination queries when ordering by a non-unique column, resolving potential skipped or duplicated rows across pagination pages.

## [0.5.48] - 2026-07-11

### Improved

- Proxy pickup stat cards on the Meals service summary now use a custom two-handed handshake icon, matching the visual style of other custom amenity icons throughout the app.

## [0.5.47] - 2026-07-11

### Added

- The Meals service summary now shows how many people performed proxy pickups, the meals they collected for themselves, and the collective pickup total — replacing the previous percentage-only Proxy Share card with clearer per-person and per-meal breakdowns.

## [0.5.46] - 2026-07-08

### Improved

- Replaced the Sleeping Bag amenity icon on the Showers detail view with a detailed silhouette of a person curled up inside a mummy sleeping bag (fill-based design), giving the amenity grid a more recognizable sleeping bag graphic.

## [0.5.45] - 2026-07-08

### Fixed

- Resolved the client-side crash ("Application error: a client-side exception has occurred") that affected the board role when landing directly on the dashboard. Each dashboard section (Analytics, Compare, reports, Data Export) is now wrapped in an error boundary that renders a graceful "couldn't load right now" fallback with a Try again button instead of taking down the whole page, and the Analytics charts now defer mounting until after hydration and a layout-stable paint frame to avoid the recharts ResponsiveContainer infinite-render loop (React error #185).

## [0.5.44] - 2026-07-08

### Improved

- Redesigned the Jacket amenity icon on the Showers detail view as a hooded rain jacket silhouette with a visible hood, sleeves extending past the torso, drawstrings, and a center zipper, replacing the previous vest-like shape.
- Added a custom backpack icon for the Backpack amenity on the Showers detail view, replacing the generic package icon.

## [0.5.43] - 2026-07-08

### Improved

- The Sleeping Bag amenity on the Showers detail view now uses a custom sleeping bag icon instead of a generic package icon.

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
