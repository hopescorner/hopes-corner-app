# Changelog

## [0.24.9] - 2026-09-09

### Fixed

- Warning details now actually appear on check-in cards by default. The badge count comes from the daily snapshot but the panel reads full warning records from the store — and the snapshot load path never fetched them (only the legacy fallback did), so the panel stayed empty. The snapshot path now loads warnings alongside proxies via the same cached query.

## [0.24.8] - 2026-09-09

### Improved

- Guest warnings now show by default on the check-in card. The full panel (severity, date, message, Manage shortcut) renders whether the card is expanded or not, so staff never have to expand just to read a warning. The truncated single-line preview was removed since the real details are always visible.
- The warning badge scroll is now guarded for environments without `scrollIntoView`, fixing an unhandled error in tests.

### Tests

- Updated `GuestCard` warning coverage for the default-visible panel (visible collapsed, still present expanded) and hardened the badge-expands assertion.

## [0.24.7] - 2026-09-09

### Improved

- Guest warnings on the check-in card are now color-coded by highest severity (Low/Medium/High), with a one-tap badge that expands the card and scrolls to the warnings section.
- Collapsed guest cards now preview the first warning message with a severity pill and "+N more" instead of hiding all details until expand.
- The expanded warnings panel shows severity, date, and message per warning with a Manage shortcut, and the Warnings action button carries the active count.

### Tests

- Updated `GuestCard` warning coverage for the collapsed preview vs. mounted panel distinction and added badge-expands coverage.

## [0.24.6] - 2026-09-09

### Fixed

- Holiday "Reset Test Data & Start at #1" now completes. The redeployed reset still failed, this time visibly: the database guard rejects unqualified wipes with "DELETE requires a WHERE clause". The rate-limits delete is now qualified (`where true`, same rows as before) in a new migration (`20260910000003_fix_holiday_reset_where_clause`), mirrored in `database/schema.sql`.
- Reset failures now show the server's real reason in the on-screen message, not just in the console. The store returns the error with the result instead of null so staff see why a reset failed without opening devtools.

### Tests

- Extended the reset migration contract to pin the newest function definition (correct table, qualified wipe) and added store plus component coverage for the surfaced error message.

## [0.24.5] - 2026-09-09

### Fixed

- Holiday "Reset Test Data & Start at #1" works again. The reset function running in production was a stale copy referencing a rate-limits table that never existed, because the fix had edited the original migration file in place and `supabase db push` never re-applies an already-recorded version. The corrected function now ships in a new migration (`20260910000002_fix_holiday_ticket_counter_reset`), and `database/schema.sql` already matched.
- Reset failures now surface the real database message in the API response and in the console log. Previously the app logged the empty HTTP status text, so failures were undiagnosable without server logs.

### Tests

- Added migration contract coverage pinning the redeploy (new version, correct table, no phantom table reference) plus API and store coverage for error surfacing.

## [0.24.4] - 2026-09-09

### Fixed

- "Mark All Picked Up" for previous-day laundry now reports each item that failed (with guest names) instead of silently skipping failures, and errors loudly when everything fails instead of staying silent.
- The laundry list view now evaluates the bag-number gate against the freshest store record rather than a possibly stale row prop, matching the kanban view; both views share one `laundryBagRequired` rule.
- Reopening or undo-cancelling a shower now optimistically shows the display-canonical `awaiting` status (the database still receives `booked`), eliminating the unstyled `booked` flash before realtime maps it back.
- End-of-Day shower cancel now covers exactly what its confirmation dialog claims (booked, awaiting, waitlisted): terminal `no_show` rows are excluded from the pending set and the cancelled ids.

### Improved

- Shower advisory locks moved from 32-bit `hashtext` to 64-bit `hashtextextended`, unifying with laundry and shrinking collision odds under parallel booking (new migration `20260910000001_unify_advisory_lock_hashes`, mirrored in `database/schema.sql`).

### Tests

- Added unit coverage for the shared bag gate and the End-of-Day pending predicate, render coverage for bulk-pickup failure reporting and stale-prop bag reads, a store test for booked-to-awaiting normalization, an integration test excluding `no_show` from End-of-Day cancel, and migration contract coverage for the 64-bit locks.

## [0.24.3] - 2026-09-09

### Fixed

- Blocked shower and laundry slots are now enforced by the database on every write path (booking RPC plus triggers), not just greyed out in the booking dialog. Stale screens, backfill forms, and direct writes can no longer book into a blocked slot, and closing or voiding a booking on a blocked slot still works.
- Canonicalized the onsite laundry slot limit to 1 guest per slot across fresh and migrated databases (a stale duplicate trigger definition enforced 2 on fresh builds).
- Closing out a shower or laundry booking (done, cancelled, no-show, pickup, return) is no longer rejected when the guest was banned after the booking was made, so End-of-Day can always finish open rows.
- Proxy meal pickups on the Check-In page now record the picker and grant the picker a lunch bag, matching the Services page and the one-bag-per-person-per-day rule (including the concurrent-write recovery path).
- Meal undo is quantity-aware: undoing one tap decrements the shared daily row instead of deleting it, the lunch bag is retracted only with the last remaining meal, and pickers can undo proxy pickups from their own card.
- Laundry waitlist writes now include the required laundry type, and a cancelled laundry booking can be re-booked the same day by reusing its row.

### Tests

- Added migration contract coverage for the database guards, store coverage for blocked-slot rejection, waitlist payloads, cancelled-row reuse, and friendly duplicate errors, plus chain coverage for picker forwarding, API validation, decrement-on-undo, and shared-record double undo.
- Updated undo expectations from clear-the-day to decrement semantics.

## [0.24.2] - 2026-09-09

### Fixed

- Ignore background check-in snapshots when meal or service status changed while the request was loading. A refresh started before a guest-card check-in can no longer overwrite its newer counts, including on a single laptop.
- Keep one local copy of each regular or extra meal when a live event arrives before the save response in the keyboard or Services flow.

### Tests

- Reproduced stale refreshes overwriting successful card check-ins and duplicate local records from live events arriving before save responses. Added regression coverage for both cases and unchanged-state refreshes.

## [0.24.1] - 2026-09-09

### Fixed

- Process each meal attendance event individually so simultaneous guest check-ins and automatic lunch bags cannot cancel one another’s live updates across devices.
- Refresh the affected guest’s counts after a check-in meal-limit error and show a readable error message. Failed writes are not retried, and daily meal limits remain enforced.

### Tests

- Added regression coverage for simultaneous meal and lunch-bag updates, recovery after a meal-limit error, failed recovery requests, and authentication errors.

## [0.24.0] - 2026-09-07

### Improved

- Upgraded the penalty shootout goalkeeper with athletic proportions, bent knees, articulated elbows, recognizable gloves, and soccer cleats.
- Kit updated to a bright amber jersey with navy details, providing high contrast against the green pitch.
- Added a weight-shifting ready stance and dynamic full-body diving animations with reaching hands and trailing legs.
- Goal posts and crossbar upgraded with 3D cylindrical rounded shading, crisp specular highlights, corner joints, and grounded turf shadows.
- Net upgraded with consistent 3D perspective across the roof, sides, and back wall, open goal mouth, and radial ripples spreading from ball impact.

### Tests

- Added automated tests for net ripple propagation, keeper ready stance weight shifting, and full-body diving physics.

## [0.23.0] - 2026-09-07

### Improved

- Linked guests now have a dedicated responsive meal panel with a clear served count, named “1 meal each” and “2 meals each” actions, and larger individual meal and undo controls on desktop, tablet, and mobile.
- Link management is separated behind “Manage links”, keeping unlink actions away from routine meal service.
- Linked guest names and remaining meal needs are visible before expanding the guest card.

### Tests

- Added responsive linked-guest flow coverage for group serving, individual serving, undo, and link management.

## [0.22.0] - 2026-09-07

### Fixed

- Undoing a guest or extra meal now uses the deleted database row to retract its automatic lunch bag, including immediate undo before the check-in record reaches the local store.
- Undo also checks the primary guest’s lunch bag when a linked pickup is removed. Bags remain while a qualifying meal or pickup still exists, and disappear after the last one is undone.
- Manually entered lunch bags remain in local totals when an automatic bag is removed.
- Failed meal deletions preserve the meal and undo action so staff can retry.

### Tests

- Added regression coverage through the real meal and action-history stores for immediate undo, one- and two-meal primary-plus-linked check-ins, both undo orders, remaining extra meals, manual bags, and deletion failures.

## [0.21.0] - 2026-09-07

### Added

- Guest cards now show whether linked guests have received their meals directly from the card badge (e.g. `✓ 1/1 served` or `1/2 served`).
- Added a one-tap `+ Buddy ×1` quick action button on guest cards when primary guests have received a meal but buddies are still unserved, so staff and volunteers no longer have to expand the card.
- A confirmed buddy badge shows on the card once all linked guests have been served.

### Fixed

- Fixed an issue where snapshot check-in mode did not load guest proxies on initial page load, causing "All ×1" and "All ×2" multi-guest check-in buttons to miss linked guests.
- Ensured `LinkedGuestsList` reflects optimistic meal statuses from snapshot state.

### Tests

- Added automated tests for linked guest meal indicators, quick buddy check-in button, and multi-guest meal recording.

## [0.20.0] - 2026-09-05

### Fixed

- Background check-in refreshes no longer clear loaded linked guests from expanded cards. Linked guests remain visible after recording a primary guest's meal and subsequent refreshes.
- Loaded warnings, notes, and bicycle descriptions are preserved when refreshed directory summaries arrive; updated summary fields still take effect.

### Tests

- Added regression coverage using the real linked-guest list and stores for primary meal updates followed by repeated snapshot refreshes, both relationship directions, and reopening the list.
- Added coverage for preserving detailed guest fields and warnings while updating directory fields and initializing new guests.

## [0.19.0] - 2026-09-04

### Improved

- The Meals page is redesigned to be easier to scan: a compact toolbar with date navigation and the Add button, a slimmer automation switch, and clearly grouped entry forms.
- Meal entry forms now sit in a tidy layout: individual and multi-guest entry on the left, the family meal program on the right, and bulk entries below as compact rows instead of large cards.
- Day summary numbers are easier to read with cleaner stat tiles.
- Activity log rows are half as tall, with the type badge shown next to each name instead of floating on the right.
- Edit and delete buttons on activity log rows are now always faintly visible instead of appearing only on mouse hover.
- One consistent primary action color across the page, with category color kept only to identify record types.

## [0.18.0] - 2026-09-04

### Improved

- The name search is now the first thing on the check-in page. Staff no longer scroll past service status cards to find a guest.
- Recent check-ins now show inside the search card, so staff can tap a guest they just served instead of searching again.
- Shower and laundry cards now show a capacity bar with how many slots are booked (for example, 2 of 20 booked). The bar turns amber when nearly full and red when full.
- Service cards show a Book hint with an arrow pointing to the next open slot time.
- Keyboard shortcut hints now show only the essentials, with a question-mark button to reveal the full list.
- The header keeps status pills on a single row instead of stacking them, and Daily Notes shrinks to one slim line when there is nothing to read.
- The lunch bag count now shows in today's stats and turns amber when bags don't match guests served.
- "Meal service ended for today" now shows in amber instead of gray so it is harder to miss.
- The New Guest keyboard hint now shows the correct keys for Mac and Windows.

## [0.17.0] - 2026-09-04

### Added

- The mobile services sheet now displays the next available shower and laundry slot times directly on the buttons with one-tap quick booking and dedicated time picker buttons.

## [0.16.1] - 2026-09-04

### Fixed

- Teens who are 18 can now register for the toy drive. Registration, staff check-in tools, shopper lists, gift-card counts, and reports all use the same ages 0–18 rule.

## [0.16.0] - 2026-09-04

### Added

- Guest cards on phones and tablets now have meal buttons for one meal and two meals. Staff no longer need to open the sheet to give two meals.
- After a meal is logged, an undo button shows next to the meal count on the card. Staff can remove a meal with one tap.
- A Next button now shows on guest cards without a service today. Staff can skip to the next search result without clearing the search.

## [0.15.0] - 2026-09-04

### Added

- A one-tap meal button now shows on each guest card on phones and tablets. Staff can log a meal without opening the service sheet.
- After staff finish a check-in, the page now moves to the next guest in the search results. Staff no longer need to search again for each person.
- A small Undo bar now shows after each action. Staff can undo the last meal, shower, laundry, bicycle, haircut, or holiday in one tap.

### Improved

- The search box now stays at the top of the screen while staff scroll through results.
- The loading screen now shows placeholders that match the guest cards instead of a spinning circle.
- Phones and tablets now show a compact row of shortcut hints.

## [0.14.0] - 2026-09-03

### Added

- The hidden penalty shootout is now a real challenge: the goalkeeper starts at full skill and learns your favorite corners, and the game fits phone screens and runs more smoothly.
- The Need Help guide now teaches the current keyboard shortcuts and one-click shower and laundry booking. It also shows how to undo mistakes and avoid duplicate profiles.

### Improved

- The holiday toy program is now only for children under 18. Registration and check-in enforce this rule.

## [0.13.0] - 2026-09-02

### Added

- The check-in page now hides a penalty shootout game: aim and shoot past the diving goalkeeper and count your goals before you close it. Scores are never saved.

## [0.12.0] - 2026-09-02

### Added

- Staff can now fix a holiday family registration before check-in: edit parent details, or add, change, or remove children, while keeping the same ticket number and arrival time. Gift card counts update by themselves; editing locks once checked in.
- Public holiday registration page now shows a 3-step picture guide (register, get ticket, pick up gifts) at the top of the page.
- Tickets now save to your device as a picture right after registration, with save-to-photos, PDF download, and print actions.

### Improved

- Registration instructions are now shorter and plainer in English, Spanish, and Mandarin, with duplicate step numbers removed.
- Behind-the-scenes updates keep the app fast and safe, including fixes for serious security problems.

## [0.11.3] - 2026-09-02

### Fixed

- Fixed hidden errors in data export and live updates. These fixes keep the app stable. You will not see any change on screen.

## [0.11.2] - 2026-09-02

### Fixed

- Fixed shower and laundry quick-book buttons on guest cards to skip full time slots. They always offer the next open time.
- Fixed a hidden problem that sometimes froze the app or showed errors. The app now runs more smoothly.

## [0.11.1] - 2026-09-01

### Fixed

- Shower and laundry status cards now show the correct next open time right away. They skip times that staff blocked off, without needing to open the booking dialog first.

## [0.11.0] - 2026-09-01

### Added

- Added keyboard shortcuts for check-in (`1` and `2` for meals, `S` for shower, `L` for laundry, `B` for bicycle, `H` for history, and `U` for undo).
- Added Recent Check-ins Quick-Bar showing the 5 most recently served guests for quick review, undo, or service additions.
- Added 1-click booking of the next open shower or laundry slot directly on guest cards.
- Added 1-click shower waitlist when scheduled slots are full.
- Added 1-tap "Check In All (Self + Buddies)" for primary guests with linked proxy companions.
- Added duplicate check in guest creation with a "Check In Existing Instead" action to avoid duplicate profiles.
- Added a sync indicator in the check-in header showing live database sync and offline status.

### Improved

- Replaced plain user icons with colored initials. Each guest keeps the same color, so regulars are easy to spot.

## [0.10.0] - 2026-08-31

### Added

- Added the Holiday Toy Distribution Program to help families register online for the annual holiday event.
- Families can sign up online in English, Spanish, or Mandarin without logging in, and automatically receive a 20-minute arrival time slot and ticket number.
- Staff can manage holiday registrations on the Services page, check in families on the day of the event, track grocery and teen gift cards, add day-of notes, register walk-ins, and export registration lists to CSV.
- Added automatic staff-screen refreshes, shared registration throttling, and service-role-only database protection for family and child information.

## [0.9.0] - 2026-08-31

### Added

- Added support for the Family Meal Program across guest management, meal services, reports, and data exports.
- Staff can enroll a guest as a household primary or member in the guest create and edit forms, setting the household name and family size.
- The Meals tab now includes a Family Meals section to record household meal pickups, edit entries, and view daily family meal totals.
- Family meal distributions are included in Dashboard Overview, Analytics, Meal Reports, Monthly Reports, and CSV data exports.
- Users with grants-related email addresses now receive board-level dashboard access for grant reporting.

## [0.8.6] - 2026-08-22

### Fixed

- Automatic meal additions now immediately run when toggled back to enabled, ensuring Saturday RV meals and other scheduled bulk meals add without requiring a page refresh.
- Fixed day-of-week calculation for automatic meal additions to strictly use Pacific Time, preventing Saturday meals from being skipped during late afternoon/evening hours under UTC runtime environments.

## [0.8.5] - 2026-08-22

### Fixed

- Monthly Summary reports now count unique guests only once across the selected month range, preventing repeated visits from inflating the Selected Months Total.

## [0.8.4] - 2026-08-19

### Improved

- Optimized touch targets to meet 44px minimum sizing standards across guest cards, meal buttons, quick services, undos, and expanded action footers for iPad and tablet ergonomics.
- Added automatic software keyboard dismissal on touch scroll in Check-In search results.
- Updated Check-In search guidance and enlarged clear button for tablet screens.

## [0.8.3] - 2026-08-19

### Changed

- Pressing Enter in the Check-In search bar when no matching guest is found no longer opens the Create New Guest modal automatically. Staff can click the New Guest button or use the keyboard shortcut to create a guest.

## [0.8.2] - 2026-08-19

### Added

- Ban notices and badges now explicitly display which programs a guest is banned from (such as showers and laundry) while indicating which programs remain allowed (such as meals and bicycles).
- Expanded guest cards and ban management modals now feature a clear program access matrix with visual badges for Meals, Showers, Laundry, and Bicycles.

## [0.8.1] - 2026-08-19

### Fixed

- Check-In now keeps a guest’s preferred name first and shows their full name underneath when it is different, making identification easier for staff.
- Staff can find a guest on Check-In by either the preferred name or the full name.

## [0.8.0] - 2026-08-19

### Added

- Staff can open History from an expanded guest card on the Check-In page.
- The guest timeline shows meals, proxy pickups, showers, laundry, bicycle repairs, haircuts, holiday visits, distributed items, warnings, reminders, service waivers, bans, and profile creation.
- Staff can view activity from the last 30 days, the last 90 days, or all time.

### Improved

- Guest history loads only when staff open it, which keeps the Check-In list fast.
- Imported meal records use the original service date instead of the migration date.

## [0.7.8] - 2026-08-19

### Added

- The Check-In page now shows potential duplicate guest profiles from legacy migrations. Staff must review a matched pair before using either profile.
- Staff can keep one profile and move all records from the duplicate in one database transaction.
- Staff can mark a matched pair as different people. The app saves this decision for all check-in devices.

## [0.7.7] - 2026-08-17

### Fixed

- Automatic Day Worker meal entries now run on Mondays instead of Saturdays. RV and lunch bag automation remain on their existing schedules.

## [0.7.6] - 2026-08-14

### Added

- Month range filter for Meals Summary, Bicycle Services Summary, and Shower & Laundry Services Summary. Staff can select a start and end month to filter displayed data and CSV exports. Totals are automatically recalculated for the selected range.

## [0.7.5] - 2026-08-12

### Added

- Meals Summary CSV export now includes a month filter. Staff can select which months to include before exporting, eliminating the need to manually edit the spreadsheet for mid-year or custom-range reports.

## [0.7.4] - 2026-08-02

### Added

- Cancelled shower appointments now show an "Undo Cancel" button in the Cancelled tab. Staff can restore an accidentally cancelled appointment to booked status without re-entering the guest.

## [0.7.3] - 2026-07-29

### Added

- Meals, Showers, and Laundry now show their operational note for the selected service date directly inside each Services tab. Staff can navigate to a previous day, add missing context, or edit an existing single-day or multi-day note without returning to Check-In or the dashboard.

## [0.7.2] - 2026-07-29

### Fixed

- Undoing a check-in now removes the lunch bag that was auto-added with the meal. Previously the bag was left behind, so every corrected entry permanently overstated the day's lunch bag count by one. A guest keeps their bag if any base or extra meal remains, or if they are still recorded as picking up for someone else; bulk and manually-entered bags are never touched.

### Changed

- Documented the "one lunch bag per person per service day" invariant and its `lunch_bag_auto_<guestId>_<date>` deduplication key in AGENTS.md, listing every write path that has to agree, so a future importer or command can't reintroduce the duplicate-bag bug.

### Data

- Removed 49 invalid lunch bag rows across the three service days affected by the 0.7.0 duplicate-bag bug (2026-07-25, 07-27, 07-29): 44 duplicates created under the retired `lunch_bag_proxy_*` key plus 5 orphan bags whose meals had been undone. All three days now reconcile exactly to one bag per person served, with nobody missing a bag.

## [0.7.1] - 2026-07-29

### Fixed

- The Check-In card no longer under-reports meals: assigning 2 meals correctly saved 2 but displayed "1 MEAL". The realtime handler fed every meal row attributed to a guest into the per-guest check-in counts, so the lunch bag auto-added alongside the meal (quantity 1) overwrote the real base count. Only `guest` and `extra` rows now affect those counts.
- Closed the remaining gaps behind the lunch-bag-vs-guests-served delta. 0.7.0 added the bag only at the single moment a guest's *first guest-meal row* was created, so any guest whose day didn't pass through exactly that transition never got one:
  - a guest whose only meal of the day was an **extra** (that path never added bags at all);
  - a guest whose meal row already existed from an import or another device, so the add took the increment path and skipped the bag;
  - a guest whose first meal landed while automatic additions were toggled off, then toggled back on.
  The bag is now attempted on every meal command for the guest/day; the unique deduplication key keeps it to exactly one bag per guest per day.
- A proxy picker who also collected their own meal received two lunch bags (their own plus a proxy one, which used a separate deduplication key). Proxy and personal bags now share one key per guest per day, so every person gets exactly one bag regardless of how many meals or pickups they had.

### Added

- New "Guests Served" stat on the Meals tab under Services shows the number of distinct guests alongside the meal counts, so meals and people can be read at a glance (and any lunch-bag delta is immediately visible).

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
