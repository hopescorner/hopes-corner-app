const PACIFIC_TIME_ZONE = "America/Los_Angeles";

export const formatTimeInPacific = (
    dateLike: Date | string | number | null | undefined,
    options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
) => {
    if (!dateLike) return '';
    const date = new Date(dateLike);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, { timeZone: PACIFIC_TIME_ZONE, ...options }).format(date);
};

export const formatPacificTimeString = (timeStr: string) => {
    if (!timeStr) return '';
    const [hoursRaw, minutesRaw = '00'] = timeStr.trim().split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeStr;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = ((hours + 11) % 12) + 1;
    const displayMinutes = String(minutes).padStart(2, '0');
    return `${displayHour}:${displayMinutes} ${period}`;
};

export const formatTimeElapsed = (dateString: string | null | undefined | Date) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hr ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} days ago`;
    } catch (e) {
        return '';
    }
};
export const pacificDateStringFrom = (dateLike: Date | string | number = new Date()) => {
    const d = new Date(dateLike);
    const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Los_Angeles",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    return fmt.format(d);
};

export const todayPacificDateString = () => pacificDateStringFrom(new Date());

/**
 * Converts a Pacific date string (YYYY-MM-DD) to an ISO timestamp that correctly
 * represents that date in Pacific time. 
 * 
 * For example: "YYYY-09-15" -> ISO timestamp that equals that same date in Pacific time
 */
export const isoFromPacificDateString = (pacificDateStr: string) => {
    // Parse the date string
    const [year, month, day] = pacificDateStr.split("-").map(Number);

    // Start searching from UTC hour 14 (typical offset for Pacific time)
    // Check hours 14-22 to account for different DST offsets
    for (let hour = 14; hour <= 22; hour++) {
        const testDate = new Date(Date.UTC(year, month - 1, day, hour, 0, 0, 0));
        const testPacificStr = pacificDateStringFrom(testDate);

        if (testPacificStr === pacificDateStr) {
            return testDate.toISOString();
        }
    }

    // Fallback: return UTC midnight if search fails
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).toISOString();
};

/**
 * Formats a date string (YYYY-MM-DD or ISO) for display in local time.
 * This avoids the day-shifting issue where YYYY-MM-DD is interpreted as UTC.
 */
export const formatDateForDisplay = (dateValue: string | Date, options: Intl.DateTimeFormatOptions = {}) => {
    if (!dateValue) return "";

    // If it's a YYYY-MM-DD string, parse it manually to avoid UTC shift
    if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        const [year, month, day] = dateValue.split("-").map(Number);
        // Create local date (month is 0-indexed)
        const localDate = new Date(year, month - 1, day);
        return localDate.toLocaleDateString(undefined, options);
    }

    // For other values, use standard Date parsing
    return new Date(dateValue).toLocaleDateString(undefined, options);
};

/**
 * Parses a date string (YYYY-MM-DD or ISO timestamp) into { year, month, day, dayOfWeek }
 * using Pacific timezone for ISO timestamps, or direct parsing for YYYY-MM-DD strings.
 * This avoids day-shifting bugs where new Date(isoString).getDay() differs across timezones.
 *
 * YYYY-MM-DD strings are treated as Pacific dates (no timezone conversion needed).
 * ISO timestamps (contain 'T') are converted to Pacific via pacificDateStringFrom.
 */
export const parsePacificDateParts = (dateStr: string): { year: number; month: number; day: number; dayOfWeek: number } | null => {
    if (!dateStr) return null;

    let y: number, m: number, d: number;

    // YYYY-MM-DD strings are already Pacific dates — parse directly to avoid
    // new Date("YYYY-MM-DD") interpreting them as UTC midnight and shifting back.
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        [y, m, d] = dateStr.split('-').map(Number);
    } else {
        // ISO timestamp — convert to Pacific YYYY-MM-DD first
        const pacificStr = pacificDateStringFrom(dateStr);
        [y, m, d] = pacificStr.split('-').map(Number);
    }

    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

    // Create a local Date from the components to get dayOfWeek
    const localDate = new Date(y, m - 1, d);
    return {
        year: y,
        month: m - 1, // 0-indexed to match Date.getMonth()
        day: d,
        dayOfWeek: localDate.getDay(),
    };
};
