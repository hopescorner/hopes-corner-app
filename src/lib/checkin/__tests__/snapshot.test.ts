import { describe, expect, it } from 'vitest';
import { normalizeCheckInSnapshot } from '@/lib/checkin/snapshot';

describe('normalizeCheckInSnapshot', () => {
    it('normalizes the database snapshot into the client contract', () => {
        const snapshot = normalizeCheckInSnapshot({
            generated_at: '2026-07-19T18:00:00.000Z',
            directory_version: '2026-07-19T17:59:00.000Z:1',
            service_date: '2026-07-19',
            guests: [{
                id: 'guest-1',
                external_id: 'HC-1',
                first_name: 'Ada',
                last_name: 'Lovelace',
                full_name: 'Ada Lovelace',
                preferred_name: 'Ada',
                housing_status: 'Unhoused',
                age_group: 'Adult',
                gender: 'Female',
                location: 'Mountain View',
                banned_at: null,
                banned_until: null,
                ban_reason: null,
                banned_from_meals: false,
                banned_from_shower: false,
                banned_from_laundry: false,
                banned_from_bicycle: false,
                created_at: '2026-01-01T00:00:00.000Z',
                updated_at: '2026-07-19T17:59:00.000Z',
                warning_count: 2,
                linked_guest_count: 1,
                reminder_count: 3,
                last_visit_date: '2026-07-18',
                recent_meal: true,
            }],
            today_by_guest: {
                'guest-1': {
                    meal_count: 1,
                    extra_meal_count: 0,
                    shower: null,
                    laundry: null,
                    bicycle: null,
                    haircut: null,
                    holiday: null,
                },
            },
            daily_notes: [],
        });

        expect(snapshot.directoryVersion).toBe('2026-07-19T17:59:00.000Z:1');
        expect(snapshot.guests[0]).toMatchObject({
            id: 'guest-1',
            guestId: 'HC-1',
            firstName: 'Ada',
            name: 'Ada Lovelace',
            warningCount: 2,
            linkedGuestCount: 1,
            reminderCount: 3,
            lastVisitDate: '2026-07-18',
            recentMeal: true,
            isBanned: false,
        });
        expect(snapshot.todayByGuest['guest-1'].mealCount).toBe(1);
    });

    it('returns a safe empty snapshot when optional database fields are absent', () => {
        const snapshot = normalizeCheckInSnapshot({
            service_date: '2026-07-19',
        });

        expect(snapshot.guests).toEqual([]);
        expect(snapshot.todayByGuest).toEqual({});
        expect(snapshot.dailyNotes).toEqual([]);
        expect(snapshot.directoryVersion).toContain(':0');
    });
});
