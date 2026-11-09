/**
 * Seasonal UI helpers. Both seasons are year-over-year: the code ships
 * permanently but only activates inside its calendar window.
 *
 * Halloween special: during October the header brand swaps the "o" in
 * "Hope's" for a pumpkin. Automatically reverts on November 1st.
 *
 * Turkey Easter egg: a wild turkey runs across the bottom of the
 * check-in page when the user scrolls to the bottom. Active from
 * November 15 through the last Thursday of November inclusive, then
 * disappears the next day. The last Thursday is computed per year.
 */
export function isHalloweenSeason(date: Date = new Date()): boolean {
    // getMonth() is 0-indexed: 9 = October. November (10) returns false,
    // so the Halloween branding expires/reverts on Nov 1st with no cleanup.
    // Year is intentionally ignored, so this repeats every October.
    return date.getMonth() === 9;
}

/** Day-of-month (1-indexed) of the last Thursday of November in `year`. */
export function getLastThursdayOfNovember(year: number): number {
    // Start from Nov 30 and walk back to the most recent Thursday (getDay 4).
    const lastDay = new Date(year, 10, 30);
    const dow = lastDay.getDay();
    const daysSinceThursday = (dow - 4 + 7) % 7;
    return 30 - daysSinceThursday;
}

/** Last day (inclusive) the turkey Easter egg is active for `year`. */
export function getTurkeySeasonEnd(year: number): number {
    return getLastThursdayOfNovember(year);
}

/**
 * True from November 15 through the last Thursday of November inclusive,
 * every year. Inactive before Nov 15, after the last Thursday (i.e. it
 * disappears going into the last weekend), and all other months.
 */
export function isTurkeySeason(date: Date = new Date()): boolean {
    if (date.getMonth() !== 10) return false;
    const day = date.getDate();
    if (day < 15) return false;
    return day <= getLastThursdayOfNovember(date.getFullYear());
}
