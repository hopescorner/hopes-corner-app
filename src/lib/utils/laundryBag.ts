export interface LaundryBagGateRecord {
    bagNumber?: string | null;
    laundryType?: string | null;
    status?: string | null;
}

/**
 * Whether moving a laundry booking to `newStatus` requires a bag number
 * first. A bag is required when leaving the initial onsite (`waiting`) or
 * offsite (`pending`, plus legacy offsite `waiting`) status without one
 * already recorded. Shared by the kanban and list views so both gates
 * agree; callers must pass the freshest store record, not a possibly
 * stale row prop.
 */
export function laundryBagRequired(
    record: LaundryBagGateRecord | undefined | null,
    newStatus: string,
): boolean {
    if (!record) return false;
    if (String(record.bagNumber ?? '').trim().length > 0) return false;

    const isOffsite = record.laundryType === 'offsite';
    const currentStatus = record.status;

    if (isOffsite) {
        return (currentStatus === 'pending' || currentStatus === 'waiting') &&
            newStatus !== 'pending' && newStatus !== 'waiting';
    }

    return currentStatus === 'waiting' && newStatus !== 'waiting';
}
