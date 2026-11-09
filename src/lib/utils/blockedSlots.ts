import {
  MAX_GUESTS_PER_SHOWER_SLOT,
  MAX_GUESTS_PER_LAUNDRY_SLOT,
} from '@/lib/constants/constants';

export type ServiceType = 'shower' | 'laundry';

export interface BlockedSlotLike {
  serviceType: string;
  slotTime: string;
  date: string;
  blockedCount?: number | null;
}

/** Total spots at one (service, date, time) before any blocking. */
export function capacityFor(serviceType: ServiceType): number {
  return serviceType === 'shower' ? MAX_GUESTS_PER_SHOWER_SLOT : MAX_GUESTS_PER_LAUNDRY_SLOT;
}

/**
 * Normalizes a stored blocked_count into a concrete number of blocked spots.
 * Legacy rows (and pre-migration rows) have blocked_count NULL — they mean
 * "fully blocked", i.e. the whole capacity for that service.
 */
export function normalizeBlockedCount(
  serviceType: ServiceType,
  blockedCount?: number | null
): number {
  const cap = capacityFor(serviceType);
  if (blockedCount === null || blockedCount === undefined) return cap;
  const n = Math.trunc(Number(blockedCount));
  if (Number.isNaN(n)) return cap;
  return Math.max(0, Math.min(cap, n));
}

function findRow(
  blockedSlots: BlockedSlotLike[] | undefined | null,
  serviceType: ServiceType,
  slotTime: string,
  date: string
): BlockedSlotLike | undefined {
  if (!blockedSlots || blockedSlots.length === 0) return undefined;
  const cleanSlot = slotTime?.trim();
  const cleanDate = date?.trim();
  return blockedSlots.find(
    (s) =>
      s.serviceType === serviceType &&
      s.slotTime?.trim() === cleanSlot &&
      s.date?.trim() === cleanDate
  );
}

/** How many spots are blocked at this (service, date, time). 0 = open. */
export function getBlockedCount(
  blockedSlots: BlockedSlotLike[] | undefined | null,
  serviceType: ServiceType,
  slotTime: string,
  date: string
): number {
  const row = findRow(blockedSlots, serviceType, slotTime, date);
  if (!row) return 0;
  return normalizeBlockedCount(serviceType, row.blockedCount);
}

/** Remaining bookable spots at this (service, date, time). 0 = fully blocked. */
export function getEffectiveCapacity(
  blockedSlots: BlockedSlotLike[] | undefined | null,
  serviceType: ServiceType,
  slotTime: string,
  date: string
): number {
  return capacityFor(serviceType) - getBlockedCount(blockedSlots, serviceType, slotTime, date);
}

/** True only when every spot at this (service, date, time) is blocked. */
export function isFullyBlocked(
  blockedSlots: BlockedSlotLike[] | undefined | null,
  serviceType: ServiceType,
  slotTime: string,
  date: string
): boolean {
  return getEffectiveCapacity(blockedSlots, serviceType, slotTime, date) === 0;
}
