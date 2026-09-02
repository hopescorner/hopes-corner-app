import { describe, it, expect } from 'vitest';
import { findNextAvailableShowerSlot, findNextAvailableLaundrySlot } from '../nextAvailableSlot';
import { generateShowerSlots, generateLaundrySlots } from '../serviceSlots';
import { MAX_GUESTS_PER_SHOWER_SLOT } from '@/lib/constants/constants';
import { todayPacificDateString } from '@/lib/utils/date';

describe('nextAvailableSlot', () => {
    const today = todayPacificDateString();
    const isSlotBlocked = () => false;
    const showerSlots = generateShowerSlots();
    const laundrySlots = generateLaundrySlots();

    describe('findNextAvailableShowerSlot', () => {
        it('returns the earliest open slot when no records exist', () => {
            const result = findNextAvailableShowerSlot([], isSlotBlocked, today);
            expect(result).not.toBeNull();
            expect(result?.slotTime).toBe(showerSlots[0]);
        });

        it('skips full slots and picks next available', () => {
            const firstSlot = showerSlots[0];
            const records = Array.from({ length: MAX_GUESTS_PER_SHOWER_SLOT }, (_, i) => ({
                id: `rec-${i}`,
                guestId: `guest-${i}`,
                date: today,
                slotTime: firstSlot,
                status: 'booked',
            }));

            const result = findNextAvailableShowerSlot(records, isSlotBlocked, today);
            expect(result?.slotTime).toBe(showerSlots[1]);
        });

        it('skips blocked slots', () => {
            const blockedChecker = (_type: any, slot: string) => slot === showerSlots[0];
            const result = findNextAvailableShowerSlot([], blockedChecker, today);
            expect(result?.slotTime).toBe(showerSlots[1]);
        });

        it('returns null when all slots are full', () => {
            const records: any[] = [];
            showerSlots.forEach((slot, slotIdx) => {
                for (let i = 0; i < MAX_GUESTS_PER_SHOWER_SLOT; i++) {
                    records.push({
                        id: `rec-${slotIdx}-${i}`,
                        guestId: `guest-${slotIdx}-${i}`,
                        date: today,
                        slotTime: slot,
                        status: 'booked',
                    });
                }
            });

            const result = findNextAvailableShowerSlot(records, isSlotBlocked, today);
            expect(result).toBeNull();
        });
    });

    describe('findNextAvailableLaundrySlot', () => {
        it('returns the earliest open onsite laundry slot', () => {
            const result = findNextAvailableLaundrySlot([], isSlotBlocked, today);
            expect(result).not.toBeNull();
            expect(result?.slotLabel).toBe(laundrySlots[0]);
        });

        it('skips occupied laundry slot', () => {
            const firstSlot = laundrySlots[0];
            const records = [{
                id: 'laundry-1',
                guestId: 'guest-1',
                date: today,
                type: 'onsite',
                slotTime: firstSlot,
                status: 'waiting',
            }];

            const result = findNextAvailableLaundrySlot(records, isSlotBlocked, today);
            expect(result?.slotLabel).toBe(laundrySlots[1]);
        });

        it('ignores offsite laundry records when evaluating onsite slots', () => {
            const records = [{
                id: 'laundry-offsite',
                guestId: 'guest-1',
                date: today,
                type: 'offsite',
                slotTime: laundrySlots[0],
                status: 'pending',
            }];

            const result = findNextAvailableLaundrySlot(records, isSlotBlocked, today);
            expect(result?.slotLabel).toBe(laundrySlots[0]);
        });

        it('handles DB row properties (time, laundryType, dateKey)', () => {
            const records = [{
                id: 'laundry-db',
                guestId: 'guest-1',
                dateKey: today,
                laundryType: 'onsite',
                time: laundrySlots[0],
                status: 'waiting',
            }];

            const result = findNextAvailableLaundrySlot(records, isSlotBlocked, today);
            expect(result?.slotLabel).toBe(laundrySlots[1]);
        });
    });
});
