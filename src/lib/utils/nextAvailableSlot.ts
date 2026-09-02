import { generateShowerSlots, generateLaundrySlots, formatSlotLabel } from './serviceSlots';
import { MAX_GUESTS_PER_SHOWER_SLOT, SHOWER_SLOT_OCCUPYING_STATUSES, LAUNDRY_SLOT_OCCUPYING_STATUSES } from '@/lib/constants/constants';
import { pacificDateStringFrom } from '@/lib/utils/date';

export interface NextAvailableShowerSlot {
    slotTime: string;
    label: string;
    count: number;
}

export interface NextAvailableLaundrySlot {
    slotLabel: string;
    label: string;
}

export function findNextAvailableShowerSlot(
    showerRecords: any[] = [],
    isSlotBlocked: (service: 'shower', slot: string, date: string) => boolean,
    targetDate: string
): NextAvailableShowerSlot | null {
    const slots = generateShowerSlots();
    const slotCounts = new Map<string, number>();

    for (const r of showerRecords || []) {
        if (!r) continue;
        const matchesDate = r.dateKey
            ? r.dateKey === targetDate
            : r.scheduledFor
                ? r.scheduledFor === targetDate
                : r.date
                    ? pacificDateStringFrom(r.date) === targetDate
                    : true;
        if (!matchesDate) continue;
        if (!SHOWER_SLOT_OCCUPYING_STATUSES.has(r.status)) continue;
        const slot = r.time || r.slotTime || r.scheduledTime;
        if (slot) {
            slotCounts.set(slot, (slotCounts.get(slot) || 0) + 1);
        }
    }

    for (const slotTime of slots) {
        if (isSlotBlocked('shower', slotTime, targetDate)) continue;

        const count = slotCounts.get(slotTime) || 0;
        if (count < MAX_GUESTS_PER_SHOWER_SLOT) {
            return {
                slotTime,
                label: formatSlotLabel(slotTime),
                count,
            };
        }
    }

    return null;
}

export function findNextAvailableLaundrySlot(
    laundryRecords: any[] = [],
    isSlotBlocked: (service: 'laundry', slot: string, date: string) => boolean,
    targetDate: string
): NextAvailableLaundrySlot | null {
    const slots = generateLaundrySlots();
    const bookedSlots = new Set<string>();

    for (const r of laundryRecords || []) {
        if (!r) continue;
        const matchesDate = r.dateKey
            ? r.dateKey === targetDate
            : r.scheduledFor
                ? r.scheduledFor === targetDate
                : r.date
                    ? pacificDateStringFrom(r.date) === targetDate
                    : true;
        if (!matchesDate) continue;
        const isOnsite = r.laundryType === 'onsite' || r.type === 'onsite' || r.washType === 'onsite' || (!r.laundryType && !r.type && !r.washType);
        if (!isOnsite) continue;
        if (!LAUNDRY_SLOT_OCCUPYING_STATUSES.has(r.status)) continue;
        const slot = r.time || r.slotTime || r.slotLabel || r.slot_label;
        if (slot) {
            bookedSlots.add(slot);
        }
    }

    for (const slotLabel of slots) {
        if (isSlotBlocked('laundry', slotLabel, targetDate)) continue;

        if (!bookedSlots.has(slotLabel)) {
            return {
                slotLabel,
                label: formatSlotLabel(slotLabel),
            };
        }
    }

    return null;
}
