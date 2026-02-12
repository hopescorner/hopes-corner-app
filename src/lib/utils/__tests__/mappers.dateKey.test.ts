import { describe, it, expect } from 'vitest';
import { mapShowerRow, mapLaundryRow } from '../mappers';

describe('mapper date key behavior for historical entries', () => {
    it('uses scheduled_for date for shower rows when time is missing', () => {
        const mapped = mapShowerRow({
            id: 's-1',
            guest_id: 'g-1',
            scheduled_for: '2026-02-11',
            scheduled_time: null,
            status: 'booked',
            created_at: '2026-02-12T16:00:00Z',
            updated_at: '2026-02-12T16:05:00Z',
        });

        expect(mapped.dateKey).toBe('2026-02-11');
    });

    it('uses scheduled_for date for laundry rows when slot is missing', () => {
        const mapped = mapLaundryRow({
            id: 'l-1',
            guest_id: 'g-1',
            scheduled_for: '2026-02-11',
            slot_label: null,
            laundry_type: 'offsite',
            bag_number: null,
            status: 'pending',
            created_at: '2026-02-12T16:00:00Z',
            updated_at: '2026-02-12T16:05:00Z',
        });

        expect(mapped.dateKey).toBe('2026-02-11');
    });
});
