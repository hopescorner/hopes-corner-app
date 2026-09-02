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

    for (const slotTime of slots) {
        if (isSlotBlocked('shower', slotTime, targetDate)) continue;

        const count = showerRecords.filter(
            (r) =>
                (r.time === slotTime || r.slotTime === slotTime) &&
                (r.date ? pacificDateStringFrom(r.date) === targetDate : true) &&
                SHOWER_SLOT_OCCUPYING_STATUSES.has(r.status)
        ).length;

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

    for (const slotLabel of slots) {
        if (isSlotBlocked('laundry', slotLabel, targetDate)) continue;

        const isBooked = laundryRecords.some(
            (r) =>
                (r.time === slotLabel || r.slotTime === slotLabel) &&
                (r.laundryType === 'onsite' || r.type === 'onsite') &&
                (r.date ? pacificDateStringFrom(r.date) === targetDate : true) &&
                LAUNDRY_SLOT_OCCUPYING_STATUSES.has(r.status)
        );

        if (!isBooked) {
            return {
                slotLabel,
                label: formatSlotLabel(slotLabel),
            };
        }
    }

    return null;
}
