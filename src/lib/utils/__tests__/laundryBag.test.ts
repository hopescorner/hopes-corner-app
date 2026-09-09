import { describe, expect, it } from 'vitest';
import { laundryBagRequired } from '../laundryBag';

describe('laundryBagRequired', () => {
    it('requires a bag when moving onsite out of waiting without one', () => {
        expect(laundryBagRequired({ status: 'waiting', laundryType: 'onsite' }, 'washer')).toBe(true);
    });

    it('does not require a bag once one is recorded', () => {
        expect(laundryBagRequired({ status: 'waiting', laundryType: 'onsite', bagNumber: 'B1' }, 'washer')).toBe(false);
    });

    it('does not require a bag for status changes within waiting', () => {
        expect(laundryBagRequired({ status: 'waiting', laundryType: 'onsite' }, 'waiting')).toBe(false);
    });

    it('requires a bag when moving offsite out of pending without one', () => {
        expect(laundryBagRequired({ status: 'pending', laundryType: 'offsite' }, 'transported')).toBe(true);
    });

    it('treats legacy offsite waiting like pending', () => {
        expect(laundryBagRequired({ status: 'waiting', laundryType: 'offsite' }, 'transported')).toBe(true);
    });

    it('does not require a bag for offsite moves between early statuses', () => {
        expect(laundryBagRequired({ status: 'pending', laundryType: 'offsite' }, 'waiting')).toBe(false);
    });

    it('never requires a bag without a record', () => {
        expect(laundryBagRequired(undefined, 'washer')).toBe(false);
    });
});
