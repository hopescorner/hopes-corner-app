/**
 * App version utilities
 * Centralizes version information and changelog data
 */

export const APP_VERSION = '0.5.0';

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
