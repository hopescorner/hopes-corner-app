/**
 * App version utilities
 * Centralizes version information and changelog data
 */

export const APP_VERSION = '0.5.17';

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
