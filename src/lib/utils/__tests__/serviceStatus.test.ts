import { describe, expect, it } from 'vitest';
import { isShowerPendingForEndOfDay } from '../serviceStatus';

describe('isShowerPendingForEndOfDay', () => {
    it.each(['booked', 'awaiting', 'waitlisted'])('treats %s as pending (matches the End-of-Day dialog)', (status) => {
        expect(isShowerPendingForEndOfDay(status)).toBe(true);
    });

    it.each(['done', 'cancelled', 'no_show'])('excludes terminal status %s from End-of-Day cancel', (status) => {
        expect(isShowerPendingForEndOfDay(status)).toBe(false);
    });
});
