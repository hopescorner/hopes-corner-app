/**
 * Whether a shower reservation counts as pending for End-of-Day cancel.
 * Expressed positively to match the confirmation dialog copy
 * ("booked, awaiting, and waitlisted"): terminal states (done, cancelled,
 * no_show) are never cancelled again, so the count, the dialog, and the
 * cancelled ids always agree.
 */
export function isShowerPendingForEndOfDay(status: string | null | undefined): boolean {
    return status === 'booked' || status === 'awaiting' || status === 'waitlisted';
}
