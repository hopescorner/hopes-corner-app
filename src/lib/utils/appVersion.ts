/**
 * App version utilities
 * Centralizes version information and changelog data
 */

export const APP_VERSION = '0.6.6';

export interface ChangelogItem {
    type: 'feature' | 'fix' | 'performance' | 'improvement';
    title: string;
    description: string;
}

export interface ChangelogEntry {
    version: string;
    date: string;
    highlights: ChangelogItem[];
}

// Changelog entries - add new entries at the top
export const CHANGELOG: ChangelogEntry[] = [
    {
        version: '0.6.6',
        date: 'July 20, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Service Center Loads Its Own Data',
                description: 'The Services page no longer appears empty (no guests, meals, showers, or laundry) when opened directly — it previously only showed data if another page had loaded it first.',
            },
            {
                type: 'improvement',
                title: 'Releases Published Automatically',
                description: 'Every production deploy now creates a Git tag and a GitHub release with notes from the changelog, and the release check verifies both changelogs cover the latest version.',
            },
        ],
    },
    {
        version: '0.6.5',
        date: 'July 20, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Laundry Bag Numbers No Longer Disappear',
                description: 'The bag number Edit field now always starts from the latest saved value, and updates from other devices are no longer dropped when several laundry records change at nearly the same time.',
            },
            {
                type: 'improvement',
                title: 'Off-site Laundry Board Always Visible',
                description: 'The Off-site Laundry board now appears on the Laundry tab even when no off-site loads are booked yet, matching the on-site board.',
            },
        ],
    },
    {
        version: '0.6.4',
        date: 'July 20, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Mobile/Tablet Undo Actions',
                description: 'Exposed direct Undo buttons inside the mobile/tablet bottom sheet (MobileServiceSheet) for checked-in meals, shower bookings, and laundry bookings.',
            },
        ],
    },
    {
        version: '0.6.3',
        date: 'July 20, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Neon Arcade Pinball Visual Upgrade',
                description: 'Upgraded the in-app pinball mini-game with custom neon aesthetics, glowing bumper pulse animations, a chrome 3D ball shader, and a dynamic spark/particle physics system on collisions.',
            },
            {
                type: 'improvement',
                title: 'Verified deployment gates and parallel testing',
                description: 'Ensured deployment workflow does not trigger until parallel test suites fully pass.',
            },
        ],
    },
    {
        version: '0.6.2',
        date: 'July 20, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Undo Updates Check-In Immediately',
                description: 'Undoing a meal or service now updates the guest card immediately and stays in sync when the real-time confirmation arrives.',
            },
        ],
    },
    {
        version: '0.6.1',
        date: 'July 20, 2026',
        highlights: [
            {
                type: 'improvement',
                title: 'Remove GitHub Feedback Feature',
                description: 'Removed the in-app GitHub issue filing feature that used Copilot to triage feedback.',
            },
        ],
    },
    {
        version: '0.6.0',
        date: 'July 19, 2026',
        highlights: [
            {
                type: 'performance',
                title: 'Blazingly Fast Check-In',
                description: 'Check-in now opens from a compact daily snapshot, searches a prebuilt guest directory, and loads full guest details only when needed for a much faster, more responsive tablet experience.',
            },
            {
                type: 'improvement',
                title: 'Instant, Reliable Multi-Tablet Actions',
                description: 'Meal and service actions now respond immediately and reconcile with the server so check-in tablets stay aligned when staff work at the same time.',
            },
        ],
    },
    {
        version: '0.5.55',
        date: 'July 18, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Correct Shelter Meal Daily Totals',
                description: 'The Meals service summary now shows shelter meals only for the selected date instead of displaying the total across all loaded dates.',
            },
        ],
    },
    {
        version: '0.5.54',
        date: 'July 18, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Rebook Cancelled Showers',
                description: 'Guests with a cancelled or no-show shower can now be rebooked or marked completed. If the original slot has filled, the completion is recorded as an unscheduled waitlist shower instead of failing.',
            },
        ],
    },
    {
        version: '0.5.53',
        date: 'July 17, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Disable RV Meal Distribution on Wednesdays',
                description: 'RV meals (40) are no longer automatically added on Wednesdays, and the RV bulk entry option is hidden when the selected date falls on a Wednesday.',
            },
        ],
    },
    {
        version: '0.5.52',
        date: 'July 15, 2026',
        highlights: [
            {
                type: 'improvement',
                title: 'Enhanced Visibility for Jacket and Backpack Icons',
                description: 'Increased the rendering size and stroke width of the Jacket and Backpack icons in the amenities grid, making them significantly easier to see against thin-line styles.',
            },
        ],
    },
    {
        version: '0.5.51',
        date: 'July 15, 2026',
        highlights: [
            {
                type: 'improvement',
                title: 'Distinct Color for Distributed Amenities',
                description: 'Assigned supplies (backpack, jacket, sleeping bag, etc.) now display in a distinct, muted gray style when unavailable or on cooldown, providing clearer visual separation from available items.',
            },
        ],
    },
    {
        version: '0.5.50',
        date: 'July 15, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Cancel Historical Waiting Laundry Bookings',
                description: 'Allowed staff to cancel past laundry slots that were assigned in the waiting lane but never processed, preventing those stale entries from showing up as legacy Action Required items on subsequent service days.',
            },
        ],
    },
    {
        version: '0.5.49',
        date: 'July 15, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Stable Pagination Tiebreaker',
                description: 'Added stable tiebreaker ordering to database pagination queries when ordering by a non-unique column, resolving potential skipped or duplicated rows across pagination pages.',
            },
        ],
    },
    {
        version: '0.5.48',
        date: 'July 11, 2026',
        highlights: [
            {
                type: 'improvement',
                title: 'Custom Handshake Icon for Proxy Pickups',
                description: 'Proxy pickup stat cards on the Meals service summary now use a custom two-handed handshake glyph instead of the generic Lucide icon, matching the visual style of other custom amenity icons throughout the app.',
            },
        ],
    },
    {
        version: '0.5.47',
        date: 'July 11, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Proxy Pickup Activity Card',
                description: 'The Meals service summary now shows how many people performed proxy pickups, the meals they collected for themselves, and the collective pickup total — replacing the previous percentage-only Proxy Share card with clearer per-person and per-meal breakdowns.',
            },
        ],
    },
    {
        version: '0.5.46',
        date: 'July 8, 2026',
        highlights: [
            {
                type: 'improvement',
                title: 'Redesigned Sleeping Bag Amenity Icon',
                description: 'The Sleeping Bag amenity on the Showers detail view now uses a detailed silhouette of a person curled inside a mummy sleeping bag, replacing the previous abstract line icon.',
            },
        ],
    },
    {
        version: '0.5.45',
        date: 'July 8, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Board Dashboard Crash Fix',
                description: 'Resolved the client-side crash that affected the board role when landing directly on the dashboard. Each dashboard section is now wrapped in an error boundary that shows a graceful fallback instead of taking down the page, and the Analytics charts now defer mounting until after a layout-stable paint frame to avoid the recharts infinite-render loop (React error #185).',
            },
        ],
    },
    {
        version: '0.5.44',
        date: 'July 8, 2026',
        highlights: [
            {
                type: 'improvement',
                title: 'Redesigned Jacket Amenity Icon',
                description: 'The Jacket amenity on the Showers detail view now uses a hooded rain jacket silhouette with a visible hood, sleeves extending past the torso, drawstrings, and a center zipper instead of the previous vest-like shape.',
            },
            {
                type: 'improvement',
                title: 'Backpack Amenity Icon',
                description: 'The Backpack amenity on the Showers detail view now uses a custom backpack icon instead of a generic package icon.',
            },
        ],
    },
    {
        version: '0.5.43',
        date: 'July 8, 2026',
        highlights: [
            {
                type: 'improvement',
                title: 'Sleeping Bag Amenity Icon',
                description: 'The Sleeping Bag amenity on the Showers detail view now uses a custom sleeping bag icon instead of a generic package icon.',
            },
        ],
    },
    {
        version: '0.5.42',
        date: 'July 8, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Meal Proxy Share Summary',
                description: 'The Meals service summary now shows what percentage of guest meals were proxy pickups, with direct and proxy counts shown side by side.',
            },
            {
                type: 'improvement',
                title: 'Professional Meal Summary Icons',
                description: 'Meal summary and distribution cards now use clear Lucide icons, and proxy pickup labels no longer rely on emoji.',
            },
        ],
    },
    {
        version: '0.5.41',
        date: 'July 1, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Dashboard Chunk Load Recovery',
                description: 'The app now clears cached assets and reloads once when a stale dashboard JavaScript chunk fails to load, preventing board users from getting stuck on a client-side application error after deploys.',
            },
        ],
    },
    {
        version: '0.5.40',
        date: 'July 1, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Laundry Booking Weekly Limit Query Fix',
                description: 'Laundry bookings now verify weekly usage with valid database statuses only, preventing the weekly-limit check from blocking valid onsite and offsite bookings.',
            },
        ],
    },
    {
        version: '0.5.39',
        date: 'July 1, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Laundry Weekly Limit Booking Fix',
                description: 'Fixed a laundry booking bug that could incorrectly block valid onsite and offsite assignments when checking a guest’s weekly laundry limit.',
            },
        ],
    },
    {
        version: '0.5.38',
        date: 'June 29, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Weekly Laundry Limit per Guest',
                description: 'Each guest is now limited to 2 laundry loads per week (onsite + offsite combined). The week resets on Monday, and the laundry booking modal and admin backfill form show the guest load count, remaining slots, and a clear "limit reached" banner that blocks further assignments until next Monday.',
            },
        ],
    },
    {
        version: '0.5.37',
        date: 'June 27, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Multi-Select Analytics Demographic Filters',
                description: 'Analytics demographic filters now allow more than one selection, so reports can include multiple cities, age groups, genders, or housing statuses at the same time.',
            },
        ],
    },
    {
        version: '0.5.36',
        date: 'June 11, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Dashboard Board-Role Render Loop Fix',
                description: 'Resolved client-side infinite render loop (React error 185) on the admin dashboard, specifically affecting the board role upon direct login, by deferring chart mounting until transitions complete.',
            },
        ],
    },
    {
        version: '0.5.35',
        date: 'June 11, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Responsive Chart & Infinite-Render Fix',
                description: 'Prevented repeated ResizeObserver measurements and infinite loops by disabling chart entrance animation scale, deferring mounting via requestAnimationFrame, and enforcing explicit minWidth/minHeight constraints.',
            },
            {
                type: 'feature',
                title: 'CSV Export for Monthly Summary Report',
                description: 'Added a dedicated CSV export feature for the Monthly Summary Report to support detailed per-section offline spreadsheets.',
            },
            {
                type: 'performance',
                title: 'Ref-Based Report Preloading',
                description: 'Optimized preloading inside the dashboard by migrating loadedReportYears to a ref (loadedReportYearsRef), eliminating unnecessary state dependency tracking.',
            },
        ],
    },
    {
        version: '0.5.34',
        date: 'June 10, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Self-Healing Queue Guest Names',
                description: 'Implemented a background-fetching mechanism to resolve and display guest names correctly in shower and laundry queues instead of falling back to "Unknown Guest".',
            },
            {
                type: 'feature',
                title: 'Header Logo App Refresh',
                description: 'Clicking the Hope\'s Corner logo in the top left header now triggers a page reload, enabling PWA users to easily refresh the application.',
            },
        ],
    },
    {
        version: '0.5.33',
        date: 'June 9, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'YTD Cumulative Meal Metrics',
                description: 'Added Year-to-Date (YTD) cumulative metrics on the Meal Services Report page, featuring a dedicated count of all meals served excluding lunch bags for the YTD.',
            },
        ],
    },
    {
        version: '0.5.32',
        date: 'May 11, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Donation Log Line-Item Value',
                description: 'The Donations Log export now includes a per-row estimated dollar value at $1.97 per pound, leaving the value blank for donations without a usable weight.',
            },
        ],
    },
    {
        version: '0.5.31',
        date: 'May 11, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Donation Value Reporting',
                description: 'Donation totals now show an estimated dollar value at $1.97 per pound across daily donations, analytics, and monthly reports, while records without a usable weight are ignored.',
            },
            {
                type: 'feature',
                title: 'Donation Value Summary Cards',
                description: "The Donations section now shows the selected day's estimated value alongside weight, trays, and servings so staff can see pounds and dollars together.",
            },
        ],
    },
    {
        version: '0.5.30',
        date: 'May 2, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'More Reliable In-App GitHub Feedback',
                description: 'Filing an issue or feature request now creates the GitHub issue first, then applies assignment and labels separately so optional GitHub metadata problems no longer block submission.',
            },
        ],
    },
    {
        version: '0.5.29',
        date: 'May 2, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Guest Last Visit Date on Cards',
                description: 'Guest cards now show the most recent visit date using meals and service records, giving staff quick context about when someone was last seen.',
            },
            {
                type: 'improvement',
                title: 'Shared Last-Visit Selector Coverage',
                description: 'The app now uses a shared selector to calculate last-visit dates across meals, showers, laundry, bicycles, haircuts, and holiday visits with test coverage for each source.',
            },
        ],
    },
    {
        version: '0.5.28',
        date: 'May 2, 2026',
        highlights: [
            {
                type: 'performance',
                title: 'Snappier Dashboard and Reports',
                description: 'Dashboard cards now calculate totals with less CPU work, and report data warms up during idle time so the app stays more responsive on modest laptops.',
            },
            {
                type: 'performance',
                title: 'Quicker Repeat Report Generation',
                description: 'Report generation now reuses parsed dates and focused store subscriptions to reduce repeated processing and memory churn when switching between report views.',
            },
        ],
    },
    {
        version: '0.5.27',
        date: 'May 2, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'In-App Feedback to GitHub',
                description: 'Staff, admin, board, and bicycle users can now file issues or feature requests from the app with browser and device details attached for faster troubleshooting.',
            },
            {
                type: 'feature',
                title: 'Dashboard Time-Frame Comparisons',
                description: 'The dashboard now compares any two selected time frames with cards, graphs, percent changes, and area filters for guest and service metrics.',
            },
        ],
    },
    {
        version: '0.5.26',
        date: 'April 20, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Meal Automation Pause Applies Across Check-In',
                description: 'Paused meal automation now blocks guest check-in lunch bag auto-additions and Saturday RV, lunch bag, and day worker automatic entries across the app.',
            },
        ],
    },
    {
        version: '0.5.25',
        date: 'April 20, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Day Worker Added to Meal Automation Pause',
                description: 'The meal automation pause/resume toggle now also controls Saturday day worker automatic meal entries alongside RV and lunch bags.',
            },
            {
                type: 'performance',
                title: 'Faster Dashboard Reports',
                description: 'Dashboard report tabs now reuse prebuilt month summaries, so the monthly report, meal report, and summary views open much faster after the dashboard finishes loading data.',
            },
        ],
    },
    {
        version: '0.5.24',
        date: 'April 19, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Pause Automatic Meal Entries',
                description: 'Meals now includes a toggle to pause automatic RV and lunch bag entries while leaving Saturday day worker totals untouched.',
            },
        ],
    },
    {
        version: '0.5.23',
        date: 'April 18, 2026',
        highlights: [
            {
                type: 'improvement',
                title: 'Analytics Filters Stay In Sync',
                description: 'Analytics meal and demographic filters now stay visible and apply consistently across Overview, Trends, and Demographics.',
            },
        ],
    },
    {
        version: '0.5.22',
        date: 'April 2, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Bicycle-Only User Role',
                description: 'A new bicycle role allows dedicated bicycle volunteers to access the guest check-in page and the bicycle services tab without seeing other service areas.',
            },
        ],
    },
    {
        version: '0.5.21',
        date: 'March 31, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Multi-Day Notes',
                description: 'Daily notes can now span a date range. Toggle "Multi-day note" when adding a note to set a start and end date, useful for equipment outages or multi-day events.',
            },
        ],
    },
    {
        version: '0.5.20',
        date: 'March 31, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Realtime Booking Notifications',
                description: 'Staff viewing the Showers or Laundry section now see a toast notification when a guest is booked into a slot from another device, showing the guest name and time slot.',
            },
        ],
    },
    {
        version: '0.5.19',
        date: 'March 31, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Peak Activity Heatmap',
                description: 'New heatmap in the Analytics dashboard shows check-in hotspots across Monday, Wednesday, and Saturday service hours so staff can plan coverage.',
            },
            {
                type: 'feature',
                title: 'Guest Retention Chart',
                description: 'Monthly bar chart showing new versus returning guests, with toggleable 6- and 12-month views to track community engagement trends.',
            },
        ],
    },
    {
        version: '0.5.18',
        date: 'March 11, 2026',
        highlights: [
            {
                type: 'improvement',
                title: 'Housing Labels in Shower and Laundry Queues',
                description: 'Shower and laundry guest cards now show housing labels like Unhoused or Housed, so staff can see that context without opening the full guest record.',
            },
        ],
    },
    {
        version: '0.5.17',
        date: 'March 9, 2026',
        highlights: [
            {
                type: 'improvement',
                title: 'Smarter Bulk Meal Handling',
                description: 'Bulk multi-guest meal add now skips guests already at the 2 base meals/day limit instead of erroring. Added a "Can Add More" filter to show only guests who have room. Guests at the limit are clearly marked with an amber "(limit)" badge.',
            },
        ],
    },
    {
        version: '0.5.16',
        date: 'March 9, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Bulk Multi-Guest Meal Addition',
                description: 'Added a Multi-Guest Meal Entry panel that lets staff select all guests served on a specific date and bulk-add meals to them at once, instead of updating each guest individually.',
            },
        ],
    },
    {
        version: '0.5.15',
        date: 'February 26, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'One Haircut Per Guest Per Day',
                description: 'Guests can now only be scheduled for one haircut per day. Duplicates are blocked at the database, store, and UI level.',
            },
            {
                type: 'improvement',
                title: 'Redesigned Previous Day Laundry Section',
                description: 'Stale laundry from past days now appears in a prominent Action Required banner with age badges, waiver status indicators, and a bulk Mark All Picked Up button.',
            },
            {
                type: 'fix',
                title: 'Past Laundry No Longer Duplicated in Today View',
                description: 'On-site laundry from previous days no longer appears in the All Laundry (Today) list. They are now shown exclusively in the Action Required section.',
            },
        ],
    },
    {
        version: '0.5.14',
        date: 'February 24, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Atomic Shower Slot Booking',
                description: 'Shower bookings now use an atomic database function with advisory locking to prevent double-booking the same slot when multiple staff book simultaneously.',
            },
        ],
    },
    {
        version: '0.5.13',
        date: 'February 23, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Consistent Unique Guest Counts in Analytics',
                description: 'Aligned Overview unique guest totals with Demographics program/date logic so custom-range counts stay consistent when filtering to Meals only.',
            },
        ],
    },
    {
        version: '0.5.12',
        date: 'February 23, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Mobile Analytics Tab Overflow',
                description: 'Fixed the Analytics view tabs on mobile so labels like Demographics no longer bleed outside the card border.',
            },
        ],
    },
    {
        version: '0.5.11',
        date: 'February 23, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Accurate Haircut Range Filtering in Analytics',
                description: 'Haircuts in analytics now prioritize service date fields when filtering by time range, preventing backfilled past-date haircuts from being counted in recent periods.',
            },
            {
                type: 'fix',
                title: 'Board Login Redirect',
                description: 'Board users now default to the dashboard after login (when no callback URL is specified), instead of being sent to check-in.',
            },
        ],
    },
    {
        version: '0.5.10',
        date: 'February 23, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Haircuts Now Included in Analytics and Monthly Reports',
                description: 'Fixed an issue where haircut backfills could be missing from analytics and monthly reports. Haircut counts now use the service date/date key and the correct data source.',
            },
        ],
    },
    {
        version: '0.5.9',
        date: 'February 23, 2026',
        highlights: [
            {
                type: 'improvement',
                title: 'Backdate Haircuts from Check-In',
                description: 'Staff can now choose a past service date when logging a haircut directly from the guest check-in card, making historical backfill easier without leaving check-in.',
            },
        ],
    },
    {
        version: '0.5.8',
        date: 'February 23, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Haircut Slot Scheduler',
                description: 'Added a new Haircuts services page with a paper-style grid to assign guests to 15-minute time slots and stylists, plus quick slot clearing for corrections.',
            },
            {
                type: 'improvement',
                title: 'Haircut Data Model Upgrade',
                description: 'Haircut records now support service date, slot time, and stylist fields so schedules can be saved and viewed by date.',
            },
        ],
    },
    {
        version: '0.5.7',
        date: 'February 23, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Correct Shower Next-Slot Availability',
                description: 'Fixed an issue where the check-in overview could show a shower slot as next available even when it was already full. The app now correctly treats awaiting and done shower records as slot-occupying when computing next availability.',
            },
        ],
    },
    {
        version: '0.5.6',
        date: 'February 23, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Slot Capacity Enforcement',
                description: 'Shower and laundry slots are now enforced at the application and database level, preventing overbooking even through admin backfill or race conditions.',
            },
            {
                type: 'fix',
                title: 'Accurate Next-Available Slot Display',
                description: 'The "Next" slot shown on the check-in page now correctly accounts for completed showers and finished laundry, so fully-booked slots no longer appear available.',
            },
        ],
    },
    {
        version: '0.5.5',
        date: 'February 23, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Shower Slot Capacity Enforcement',
                description: 'Fixed a critical bug where more guests than allowed could be booked into a single shower time slot. Capacity is now enforced at both the application and database level.',
            },
        ],
    },
    {
        version: '0.5.4',
        date: 'February 22, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Accurate Per-Day Average',
                description: 'The "per day" average for Unique Guests now divides only by service days that have already occurred this month, so the number is not diluted by future days.',
            },
            {
                type: 'improvement',
                title: 'Cleaner Mobile Header',
                description: 'Removed the non-functional hamburger menu from the mobile header. Navigation is handled entirely by the bottom tab bar.',
            },
        ],
    },
    {
        version: '0.5.3',
        date: 'February 21, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Daily Meal Limit',
                description: 'Guests are now limited to 4 meals per day (2 regular + 2 extra). The check-in card shows a clear indicator when the limit is reached.',
            },
            {
                type: 'fix',
                title: 'Undo Extra Meals',
                description: 'The undo button now works for extra meals too. A dedicated undo control appears on both desktop and mobile after logging an extra meal.',
            },
            {
                type: 'improvement',
                title: 'Board Report Redesign',
                description: 'The monthly Service Statistics table now uses color-coded left borders for each service category, replacing the hard-to-read gray backgrounds.',
            },
            {
                type: 'fix',
                title: 'Bicycle Undo Fix',
                description: 'Fixed a bug where undoing a bicycle booking would attempt to delete the record twice.',
            },
            {
                type: 'fix',
                title: 'Chart Tooltip Fix',
                description: 'Chart tooltips on mobile are now fully opaque and no longer hidden behind other elements.',
            },
            {
                type: 'improvement',
                title: 'Mobile-Optimized Charts',
                description: 'All graphs now scale gracefully on smaller screens with reduced margins, compact labels, and stacked pie-chart layouts.',
            },
        ],
    },
    {
        version: '0.5.2',
        date: 'February 21, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Shower Cancellations Now Tracked',
                description: 'Cancelling a shower now moves it to the Cancelled tab instead of deleting it, so staff can see a full history of the day.',
            },
            {
                type: 'fix',
                title: 'Shower Modal Closes on Done',
                description: 'The shower detail modal now closes automatically after marking a shower as done, returning you straight to the list.',
            },
        ],
    },
    {
        version: '0.5.1',
        date: 'February 21, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Guest Reminders on Services Page',
                description: 'Reminders now load automatically on the Services page, so notes like "no extra shirt this week" appear in the shower and laundry sections without visiting Check-In first.',
            },
            {
                type: 'fix',
                title: 'App Update Notifications',
                description: 'The "new version available" banner now reliably appears after every deployment. A background version check catches updates even when the service worker cache stays the same.',
            },
        ],
    },
    {
        version: '0.5.0',
        date: 'February 21, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Extra Meal Confirmation',
                description: 'Extra meals now require a confirmation step and have their own dedicated section, reducing accidental entries.',
            },
            {
                type: 'feature',
                title: 'Refreshed Login Page',
                description: 'The login page now features animated illustrations and an updated design for a friendlier first impression.',
            },
            {
                type: 'improvement',
                title: 'Sorted Service Views',
                description: 'Showers are sorted by slot time and laundry/service Kanban lists are sorted chronologically so the oldest entries appear first.',
            },
            {
                type: 'improvement',
                title: 'Shower Auto-Disable on Completion',
                description: 'Shower action buttons are now automatically disabled once a reservation is marked as done, preventing accidental status changes.',
            },
            {
                type: 'fix',
                title: 'Laundry Kanban Drag & Drop',
                description: 'Fixed an issue where stale records could prevent laundry items from being moved between status columns in the Kanban view.',
            },
            {
                type: 'fix',
                title: 'Test Stability Improvements',
                description: 'Resolved flaky test failures with deterministic slot helpers and improved mocking strategies.',
            },
        ],
    },
    {
        version: '0.4.0',
        date: 'February 20, 2026',
        highlights: [
            {
                type: 'performance',
                title: 'Faster Check-In Search and Navigation',
                description: 'Search input, tab switching, and key workflows now respond faster by reducing repeated data reloads and expensive re-renders.',
            },
            {
                type: 'performance',
                title: 'Smarter Background Updates',
                description: 'Live updates now patch only the changed records instead of reloading entire datasets, making the app feel snappier during active use.',
            },
            {
                type: 'improvement',
                title: 'Lower Memory Use in Long Sessions',
                description: 'Large operational data is no longer persisted unnecessarily, helping prevent slowdown during long kiosk-style sessions.',
            },
            {
                type: 'improvement',
                title: 'Faster Initial Load for Heavy Sections',
                description: 'Dashboard/service sections and booking modals now load on demand, so the app starts faster and uses less JavaScript upfront.',
            },
            {
                type: 'performance',
                title: 'Database Query and Index Optimization',
                description: 'Operational queries now use date windows and tuned indexes for better speed as data grows.',
            },
        ],
    },
    {
        version: '0.3.0',
        date: 'February 20, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'App Update Prompt',
                description: 'A banner now appears when a new version of the app is available, prompting users to refresh instead of serving stale cached content.',
            },
            {
                type: 'feature',
                title: 'Donor Grouping in Donations',
                description: 'Donations are now grouped by donor with collapsible cards showing totals for weight, trays, and servings at a glance.',
            },
            {
                type: 'feature',
                title: 'Meal Activity Log Filters & Batch Delete',
                description: 'Filter the activity log by meal type and batch-delete all lunch bag entries for the day with one click.',
            },
            {
                type: 'fix',
                title: 'Friday Lunch Bag Skip',
                description: 'Lunch bags are no longer auto-added on Fridays, matching the real-world schedule.',
            },
        ],
    },
    {
        version: '0.2.1',
        date: 'February 19, 2026',
        highlights: [
            {
                type: 'fix',
                title: 'Consistent Meal Report Numbers',
                description: 'Fixed discrepancies across the 7-Month Trend, Service Statistics PDF, and Monthly Summary reports. Bulk meal types (RV, Day Worker, Shelter) are no longer incorrectly filtered by onsite service days, and all three views now produce matching totals.',
            },
            {
                type: 'improvement',
                title: 'New Report Columns',
                description: 'Monthly Summary now shows RV Other and Shelter as separate columns for full transparency. The PDF report breaks out RV Meals and Shelter under RV / Safe Park.',
            },
        ],
    },
    {
        version: '0.2.0',
        date: 'February 16, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Inline Status Changes in List View',
                description: 'Shower and laundry list views now show quick-action buttons to advance, reopen, or cancel statuses directly — no need to open a detail modal.',
            },
            {
                type: 'feature',
                title: 'Laundry Status Dropdown',
                description: 'A compact dropdown on each laundry row lets you jump to any status in the workflow, with automatic bag-number prompts when required.',
            },
            {
                type: 'improvement',
                title: 'Collapsible Add-Entry Forms',
                description: 'The shower and laundry "Add Record" forms are now collapsed by default, freeing up screen space while still accessible with one click.',
            },
        ],
    },
    {
        version: '0.1.0',
        date: 'January 20, 2026',
        highlights: [
            {
                type: 'feature',
                title: 'Enhanced Guest Management',
                description: 'New guest edit, ban management, and warning modals with a streamlined interface for faster check-ins.',
            },
            {
                type: 'feature',
                title: 'Keyboard Shortcuts',
                description: 'Press ⌘K (or Ctrl+K) to quickly focus the search bar, and ⌘⌥G (or Ctrl+Alt+G) to open the new guest form.',
            },
        ],
    },
];

/**
 * Check if there are unseen updates
 */
export const hasUnseenUpdates = (): boolean => {
    if (typeof window === 'undefined') return false;
    const seenVersion = localStorage.getItem('hopes-corner-seen-version');
    return seenVersion !== APP_VERSION;
};

/**
 * Mark current version as seen
 */
export const markVersionAsSeen = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('hopes-corner-seen-version', APP_VERSION);
};

/**
 * Get the current app version
 */
export const getAppVersion = (): string => APP_VERSION;
