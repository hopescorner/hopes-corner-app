/**
 * Seasonal UI helpers.
 *
 * Halloween special: during October the header brand swaps the "o" in
 * "Hope's" for a pumpkin. Automatically reverts on November 1st.
 */
export function isHalloweenSeason(date: Date = new Date()): boolean {
    // getMonth() is 0-indexed: 9 = October. November (10) returns false,
    // so the Halloween branding expires/reverts on Nov 1st with no cleanup.
    return date.getMonth() === 9;
}
