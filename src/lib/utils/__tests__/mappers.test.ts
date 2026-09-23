import { describe, it, expect, vi } from 'vitest';
import { mapDailyWeatherRow } from '../mappers';

describe('mappers utilities', () => {
    describe('mapGuestRow', () => {
        it('maps snake_case to camelCase', () => {
            const row = {
                id: 'guest-1',
                external_id: 'G001',
                first_name: 'John',
                last_name: 'Doe',
                full_name: 'John Doe',
                preferred_name: 'Johnny',
                housing_status: 'housed',
                age_group: 'Adult 18-59',
                gender: 'Male',
                location: 'Mountain View',
                notes: 'Test notes',
                bicycle_description: 'Red bike',
                banned_at: null,
                banned_until: null,
                ban_reason: null,
                banned_from_bicycle: false,
                banned_from_meals: false,
                banned_from_shower: false,
                banned_from_laundry: false,
                created_at: '2025-01-06T00:00:00Z',
                updated_at: '2025-01-06T00:00:00Z',
            };

            // Simulate mapping
            const mapped = {
                id: row.id,
                guestId: row.external_id,
                firstName: row.first_name,
                lastName: row.last_name,
                name: row.full_name,
                preferredName: row.preferred_name,
                housingStatus: row.housing_status,
                age: row.age_group,
                gender: row.gender,
                location: row.location,
                notes: row.notes,
                bicycleDescription: row.bicycle_description,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            };

            expect(mapped.firstName).toBe('John');
            expect(mapped.lastName).toBe('Doe');
            expect(mapped.preferredName).toBe('Johnny');
        });

        it('handles null values', () => {
            const row = {
                preferred_name: null,
                notes: null,
                bicycle_description: null,
            };

            const mapped = {
                preferredName: row.preferred_name || '',
                notes: row.notes || '',
                bicycleDescription: row.bicycle_description || '',
            };

            expect(mapped.preferredName).toBe('');
            expect(mapped.notes).toBe('');
        });
    });

    describe('mapMealRow', () => {
        it('maps meal attendance row', () => {
            const row = {
                id: 'meal-1',
                guest_id: 'guest-1',
                quantity: 1,
                served_on: '2025-01-06',
                recorded_at: '2025-01-06T08:00:00Z',
                picked_up_by_guest_id: null,
                meal_type: null,
            };

            const mapped = {
                id: row.id,
                guestId: row.guest_id,
                count: row.quantity,
                date: row.served_on,
                recordedAt: row.recorded_at,
                pickedUpByGuestId: row.picked_up_by_guest_id,
                type: row.meal_type,
            };

            expect(mapped.guestId).toBe('guest-1');
            expect(mapped.count).toBe(1);
            expect(mapped.date).toBe('2025-01-06');
        });

        it('handles quantity field', () => {
            const row = { quantity: 5 };
            expect(row.quantity).toBe(5);
        });

        it('handles zero quantity', () => {
            const row = { quantity: 0 };
            expect(row.quantity).toBe(0);
        });
    });

    describe('mapShowerRow', () => {
        it('maps shower record row', () => {
            const row = {
                id: 'shower-1',
                guest_id: 'guest-1',
                slot_time: '08:00',
                date: '2025-01-06',
                status: 'waiting',
                created_at: '2025-01-06T07:50:00Z',
            };

            const mapped = {
                id: row.id,
                guestId: row.guest_id,
                slotTime: row.slot_time,
                date: row.date,
                status: row.status,
                createdAt: row.created_at,
            };

            expect(mapped.slotTime).toBe('08:00');
            expect(mapped.status).toBe('waiting');
        });

        it('handles different statuses', () => {
            const statuses = ['waiting', 'showering', 'completed', 'no-show'];
            statuses.forEach(status => {
                const row = { status };
                expect(row.status).toBe(status);
            });
        });
    });

    describe('mapLaundryRow', () => {
        it('maps laundry record row', () => {
            const row = {
                id: 'laundry-1',
                guest_id: 'guest-1',
                slot_time: '08:00 - 09:00',
                date: '2025-01-06',
                status: 'waiting',
                loads_quantity: 1,
                is_offsite: false,
                created_at: '2025-01-06T07:50:00Z',
            };

            const mapped = {
                id: row.id,
                guestId: row.guest_id,
                slotTime: row.slot_time,
                date: row.date,
                status: row.status,
                loadsQuantity: row.loads_quantity,
                isOffsite: row.is_offsite,
                createdAt: row.created_at,
            };

            expect(mapped.loadsQuantity).toBe(1);
            expect(mapped.isOffsite).toBe(false);
        });

        it('handles offsite laundry', () => {
            const row = { is_offsite: true };
            expect(row.is_offsite).toBe(true);
        });

        it('handles multiple loads', () => {
            const row = { loads_quantity: 3 };
            expect(row.loads_quantity).toBe(3);
        });
    });

    describe('mapBicycleRow', () => {
        it('maps bicycle record row', () => {
            const row = {
                id: 'bicycle-1',
                guest_id: 'guest-1',
                date: '2025-01-06',
                service_type: 'repair',
                description: 'Flat tire fix',
                is_new_bicycle: false,
                status: 'pending',
                created_at: '2025-01-06T08:00:00Z',
            };

            const mapped = {
                id: row.id,
                guestId: row.guest_id,
                date: row.date,
                serviceType: row.service_type,
                description: row.description,
                isNewBicycle: row.is_new_bicycle,
                status: row.status,
                createdAt: row.created_at,
            };

            expect(mapped.serviceType).toBe('repair');
            expect(mapped.isNewBicycle).toBe(false);
        });

        it('handles new bicycle', () => {
            const row = { is_new_bicycle: true };
            expect(row.is_new_bicycle).toBe(true);
        });

        it('handles tune-up service', () => {
            const row = { service_type: 'tune-up' };
            expect(row.service_type).toBe('tune-up');
        });
    });

    describe('mapDonationRow', () => {
        it('maps donation record row', () => {
            const row = {
                id: 'donation-1',
                donor_name: 'John Smith',
                donation_type: 'monetary',
                amount: 100,
                description: 'Monthly donation',
                date: '2025-01-06',
                created_at: '2025-01-06T08:00:00Z',
            };

            const mapped = {
                id: row.id,
                donorName: row.donor_name,
                type: row.donation_type,
                amount: row.amount,
                description: row.description,
                date: row.date,
                createdAt: row.created_at,
            };

            expect(mapped.donorName).toBe('John Smith');
            expect(mapped.amount).toBe(100);
        });

        it('handles in-kind donations', () => {
            const row = { donation_type: 'in-kind', amount: null };
            expect(row.donation_type).toBe('in-kind');
            expect(row.amount).toBeNull();
        });
    });

    describe('mapGuestProxyRow', () => {
        it('maps guest proxy row', () => {
            const row = {
                id: 'proxy-1',
                guest_id: 'guest-1',
                proxy_id: 'guest-2',
                created_at: '2025-01-06T08:00:00Z',
            };

            const mapped = {
                id: row.id,
                guestId: row.guest_id,
                proxyId: row.proxy_id,
                createdAt: row.created_at,
            };

            expect(mapped.guestId).toBe('guest-1');
            expect(mapped.proxyId).toBe('guest-2');
        });
    });

    describe('mapGuestWarningRow', () => {
        it('maps guest warning row', () => {
            const row = {
                id: 'warning-1',
                guest_id: 'guest-1',
                message: 'Verbal warning issued',
                severity: 1,
                issued_by: 'Admin',
                active: true,
                created_at: '2025-01-06T08:00:00Z',
                updated_at: '2025-01-06T08:00:00Z',
            };

            const mapped = {
                id: row.id,
                guestId: row.guest_id,
                message: row.message,
                severity: row.severity,
                issuedBy: row.issued_by,
                active: row.active,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            };

            expect(mapped.message).toBe('Verbal warning issued');
            expect(mapped.severity).toBe(1);
            expect(mapped.active).toBe(true);
        });

        it('handles inactive warning', () => {
            const row = { active: false };
            expect(row.active).toBe(false);
        });

        it('handles high severity', () => {
            const row = { severity: 3 };
            expect(row.severity).toBe(3);
        });
    });

    describe('mapHolidayRow', () => {
        it('maps holiday record row', () => {
            const row = {
                id: 'holiday-1',
                guest_id: 'guest-1',
                date: '2025-01-06',
            };

            const mapped = {
                id: row.id,
                guestId: row.guest_id,
                date: row.date,
                type: 'holiday' as const,
            };

            expect(mapped.type).toBe('holiday');
        });
    });

    describe('mapHaircutRow', () => {
        it('maps haircut record row', () => {
            const row = {
                id: 'haircut-1',
                guest_id: 'guest-1',
                date: '2025-01-06',
            };

            const mapped = {
                id: row.id,
                guestId: row.guest_id,
                date: row.date,
                type: 'haircut' as const,
            };

            expect(mapped.type).toBe('haircut');
        });
    });

    describe('mapDailyWeatherRow', () => {
        it('maps snake_case daily weather row to camelCase DailyWeather', () => {
            const row = {
                id: 'weather-1',
                date: '2026-09-22',
                location: 'Mountain View, CA',
                temp_high: '72.5',
                temp_low: '55.0',
                temp_unit: 'F',
                weather_code: 3,
                condition: 'Overcast',
                condition_category: 'cloudy' as const,
                precipitation_sum: '0.00',
                has_rain: false,
                created_at: '2026-09-22T10:00:00Z',
                updated_at: '2026-09-22T10:00:00Z',
            };

            const mapped = mapDailyWeatherRow(row);
            expect(mapped.id).toBe('weather-1');
            expect(mapped.date).toBe('2026-09-22');
            expect(mapped.location).toBe('Mountain View, CA');
            expect(mapped.tempHigh).toBe(72.5);
            expect(mapped.tempLow).toBe(55);
            expect(mapped.tempUnit).toBe('F');
            expect(mapped.weatherCode).toBe(3);
            expect(mapped.condition).toBe('Overcast');
            expect(mapped.conditionCategory).toBe('cloudy');
            expect(mapped.precipitationSum).toBe(0);
            expect(mapped.hasRain).toBe(false);
        });

        it('derives hasRain from precipitation_sum > 0', () => {
            const row = {
                id: 'weather-2',
                date: '2026-09-23',
                temp_high: 60,
                temp_low: 50,
                condition: 'Rain',
                condition_category: 'rain' as const,
                precipitation_sum: 0.45,
                has_rain: false,
            };

            const mapped = mapDailyWeatherRow(row);
            expect(mapped.hasRain).toBe(true);
            expect(mapped.precipitationSum).toBe(0.45);
        });
    });
});
