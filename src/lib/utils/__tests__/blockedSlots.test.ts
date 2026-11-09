import { describe, it, expect } from 'vitest';
import {
  capacityFor,
  normalizeBlockedCount,
  getBlockedCount,
  getEffectiveCapacity,
  isFullyBlocked,
} from '../blockedSlots';

describe('blockedSlots capacity helpers', () => {
  it('capacityFor returns 2 for shower and 1 for laundry', () => {
    expect(capacityFor('shower')).toBe(2);
    expect(capacityFor('laundry')).toBe(1);
  });

  it('normalizeBlockedCount treats null/undefined as fully blocked (legacy rows)', () => {
    expect(normalizeBlockedCount('shower', null)).toBe(2);
    expect(normalizeBlockedCount('shower', undefined)).toBe(2);
    expect(normalizeBlockedCount('laundry', null)).toBe(1);
  });

  it('normalizeBlockedCount clamps to 0..capacity', () => {
    expect(normalizeBlockedCount('shower', 0)).toBe(0);
    expect(normalizeBlockedCount('shower', 1)).toBe(1);
    expect(normalizeBlockedCount('shower', 2)).toBe(2);
    expect(normalizeBlockedCount('shower', 99)).toBe(2);
    expect(normalizeBlockedCount('shower', -1)).toBe(0);
    expect(normalizeBlockedCount('laundry', 2)).toBe(1);
  });

  it('getBlockedCount returns 0 when no row exists', () => {
    expect(getBlockedCount([], 'shower', '08:00', '2025-01-06')).toBe(0);
  });

  it('getEffectiveCapacity is full when open and 1 when half-blocked', () => {
    const half = [
      { id: '1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06', blockedCount: 1 },
    ];
    expect(getBlockedCount(half, 'shower', '08:00', '2025-01-06')).toBe(1);
    expect(getEffectiveCapacity(half, 'shower', '08:00', '2025-01-06')).toBe(1);
    expect(isFullyBlocked(half, 'shower', '08:00', '2025-01-06')).toBe(false);
  });

  it('legacy rows without blockedCount mean fully blocked', () => {
    const legacy = [{ id: '1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06' }];
    expect(getEffectiveCapacity(legacy, 'shower', '08:00', '2025-01-06')).toBe(0);
    expect(isFullyBlocked(legacy, 'shower', '08:00', '2025-01-06')).toBe(true);
  });

  it('respects service, date, and slot trimming', () => {
    const rows = [
      { id: '1', serviceType: 'shower', slotTime: ' 08:00 ', date: ' 2025-01-06 ', blockedCount: 1 },
    ];
    expect(getEffectiveCapacity(rows, 'shower', '08:00', '2025-01-06')).toBe(1);
    expect(getEffectiveCapacity(rows, 'laundry', '08:00', '2025-01-06')).toBe(1);
    expect(getEffectiveCapacity(rows, 'shower', '09:00', '2025-01-06')).toBe(2);
  });
});
