/**
 * US federal holiday detection for calendar dates (YYYY-MM-DD).
 * Pure calendar math — no network or database needed.
 */

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

function toKey(y: number, m: number, d: number): string {
    return `${y}-${pad(m)}-${pad(d)}`;
}

/** Weekday of a calendar date (0 = Sunday … 6 = Saturday), timezone-independent. */
function weekdayOf(y: number, m: number, d: number): number {
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Date of the nth weekday of a month (e.g. 3rd Monday of January). */
function nthWeekdayOfMonth(y: number, m: number, weekday: number, n: number): number {
    const firstWeekday = weekdayOf(y, m, 1);
    const offset = (weekday - firstWeekday + 7) % 7;
    return 1 + offset + (n - 1) * 7;
}

/** Date of the last weekday of a month (e.g. last Monday of May). */
function lastWeekdayOfMonth(y: number, m: number, weekday: number): number {
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const lastWeekday = weekdayOf(y, m, daysInMonth);
    return daysInMonth - ((lastWeekday - weekday + 7) % 7);
}

function parseDateStr(dateStr: string): { y: number; m: number; d: number } | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (!match) return null;
    return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/**
 * Federal holiday name for a Pacific calendar date, or null when the date
 * is not a federal holiday. Weekend-fixed holidays observed on a adjacent
 * weekday are labelled "(observed)".
 */
export function getFederalHoliday(dateStr: string): string | null {
    const parsed = parseDateStr(dateStr);
    if (!parsed) return null;
    const { y, m, d } = parsed;

    const fixedWithObserved = (month: number, day: number, name: string): string | null => {
        if (m === month && d === day) return name;
        // Observed Friday when the holiday falls on Saturday.
        const wd = weekdayOf(y, month, day);
        if (wd === 6) {
            // Friday before; may fall in the previous month/year (e.g. Jan 1 Sat -> Dec 31).
            const prev = new Date(Date.UTC(y, month - 1, day - 1));
            if (
                m === prev.getUTCMonth() + 1 &&
                d === prev.getUTCDate() &&
                (prev.getUTCFullYear() === y || toKey(y, m, d) === toKey(prev.getUTCFullYear(), m, d))
            ) {
                return `${name} (observed)`;
            }
        }
        // Observed Monday when the holiday falls on Sunday.
        if (wd === 0 && m === month && d === day + 1) return `${name} (observed)`;
        return null;
    };

    // New Year's Day (observed Dec 31 of prior year belongs to next year's holiday).
    if (m === 1 && d === 1) return "New Year's Day";
    if (m === 12 && d === 31 && weekdayOf(y + 1, 1, 1) === 6) return "New Year's Day (observed)";
    if (m === 1 && d === 2 && weekdayOf(y, 1, 1) === 0) return "New Year's Day (observed)";

    if (m === 1 && d === nthWeekdayOfMonth(y, 1, 1, 3)) return 'Martin Luther King Jr. Day';
    if (m === 2 && d === nthWeekdayOfMonth(y, 2, 1, 3)) return "Presidents' Day";
    if (m === 5 && d === lastWeekdayOfMonth(y, 5, 1)) return 'Memorial Day';

    const juneteenth = fixedWithObserved(6, 19, 'Juneteenth');
    if (juneteenth) return juneteenth;
    const independence = fixedWithObserved(7, 4, 'Independence Day');
    if (independence) return independence;

    if (m === 9 && d === nthWeekdayOfMonth(y, 9, 1, 1)) return 'Labor Day';
    if (m === 10 && d === nthWeekdayOfMonth(y, 10, 1, 2)) return 'Columbus Day';

    const veterans = fixedWithObserved(11, 11, 'Veterans Day');
    if (veterans) return veterans;
    if (m === 11 && d === nthWeekdayOfMonth(y, 11, 4, 4)) return 'Thanksgiving Day';

    const christmas = fixedWithObserved(12, 25, 'Christmas Day');
    if (christmas) return christmas;

    return null;
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Full weekday name for a calendar date (e.g. "Monday"), or null for invalid input. */
export function getWeekdayName(dateStr: string): string | null {
    const parsed = parseDateStr(dateStr);
    if (!parsed) return null;
    return WEEKDAY_NAMES[weekdayOf(parsed.y, parsed.m, parsed.d)];
}
