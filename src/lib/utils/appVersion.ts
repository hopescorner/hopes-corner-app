/**
 * App version utilities
 * Centralizes version information and changelog data
 */

export const APP_VERSION = '0.5.3';

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
