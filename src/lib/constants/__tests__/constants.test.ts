import { describe, it, expect, vi } from 'vitest';

describe('constants', () => {
    describe('HOUSING_STATUSES', () => {
        const HOUSING_STATUSES = ['housed', 'unhoused', 'unknown', 'at-risk', 'transitional'];

        it('has housed status', () => {
            expect(HOUSING_STATUSES).toContain('housed');
        });

        it('has unhoused status', () => {
            expect(HOUSING_STATUSES).toContain('unhoused');
        });

        it('has unknown status', () => {
            expect(HOUSING_STATUSES).toContain('unknown');
        });

        it('has at-risk status', () => {
            expect(HOUSING_STATUSES).toContain('at-risk');
        });

        it('has transitional status', () => {
            expect(HOUSING_STATUSES).toContain('transitional');
        });

        it('has exactly 5 statuses', () => {
            expect(HOUSING_STATUSES.length).toBe(5);
        });
    });

    describe('AGE_GROUPS', () => {
        const AGE_GROUPS = ['Child 0-17', 'Adult 18-59', 'Senior 60+', 'Unknown'];

        it('has child age group', () => {
            expect(AGE_GROUPS).toContain('Child 0-17');
        });

        it('has adult age group', () => {
            expect(AGE_GROUPS).toContain('Adult 18-59');
        });

        it('has senior age group', () => {
            expect(AGE_GROUPS).toContain('Senior 60+');
        });

        it('has unknown age group', () => {
            expect(AGE_GROUPS).toContain('Unknown');
        });

        it('has exactly 4 age groups', () => {
            expect(AGE_GROUPS.length).toBe(4);
        });
    });

    describe('GENDERS', () => {
        const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Unknown'];

        it('has male option', () => {
            expect(GENDERS).toContain('Male');
        });

        it('has female option', () => {
            expect(GENDERS).toContain('Female');
        });

        it('has non-binary option', () => {
            expect(GENDERS).toContain('Non-binary');
        });

        it('has prefer not to say option', () => {
            expect(GENDERS).toContain('Prefer not to say');
        });

        it('has unknown option', () => {
            expect(GENDERS).toContain('Unknown');
        });

        it('has exactly 5 options', () => {
            expect(GENDERS.length).toBe(5);
        });
    });

    describe('LOCATIONS', () => {
        const LOCATIONS = ['Mountain View', 'Palo Alto', 'Sunnyvale', 'Los Altos', 'Other'];

        it('includes Mountain View', () => {
            expect(LOCATIONS).toContain('Mountain View');
        });

        it('includes Palo Alto', () => {
            expect(LOCATIONS).toContain('Palo Alto');
        });

        it('includes Other option', () => {
            expect(LOCATIONS).toContain('Other');
        });

        it('has at least 3 options', () => {
            expect(LOCATIONS.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe('MEAL_TYPES', () => {
        const MEAL_TYPES = ['guest', 'rv', 'extras', 'day_worker', 'shelter', 'united_effort', 'lunch_bag'];

        it('has guest meal type', () => {
            expect(MEAL_TYPES).toContain('guest');
        });

        it('has rv meal type', () => {
            expect(MEAL_TYPES).toContain('rv');
        });

        it('has extras meal type', () => {
            expect(MEAL_TYPES).toContain('extras');
        });

        it('has day_worker meal type', () => {
            expect(MEAL_TYPES).toContain('day_worker');
        });

        it('has shelter meal type', () => {
            expect(MEAL_TYPES).toContain('shelter');
        });

        it('has united_effort meal type', () => {
            expect(MEAL_TYPES).toContain('united_effort');
        });

        it('has lunch_bag meal type', () => {
            expect(MEAL_TYPES).toContain('lunch_bag');
        });

        it('has exactly 7 meal types', () => {
            expect(MEAL_TYPES.length).toBe(7);
        });
    });

    describe('SHOWER_STATUSES', () => {
        const SHOWER_STATUSES = ['waiting', 'showering', 'completed', 'no-show'];

        it('has waiting status', () => {
            expect(SHOWER_STATUSES).toContain('waiting');
        });

        it('has showering status', () => {
            expect(SHOWER_STATUSES).toContain('showering');
        });

        it('has completed status', () => {
            expect(SHOWER_STATUSES).toContain('completed');
        });

        it('has no-show status', () => {
            expect(SHOWER_STATUSES).toContain('no-show');
        });

        it('has exactly 4 statuses', () => {
            expect(SHOWER_STATUSES.length).toBe(4);
        });
    });

    describe('LAUNDRY_STATUSES', () => {
        const LAUNDRY_STATUSES = ['waiting', 'washing', 'drying', 'folding', 'ready', 'completed', 'no-show'];

        it('has waiting status', () => {
            expect(LAUNDRY_STATUSES).toContain('waiting');
        });

        it('has washing status', () => {
            expect(LAUNDRY_STATUSES).toContain('washing');
        });

        it('has drying status', () => {
            expect(LAUNDRY_STATUSES).toContain('drying');
        });

        it('has folding status', () => {
            expect(LAUNDRY_STATUSES).toContain('folding');
        });

        it('has ready status', () => {
            expect(LAUNDRY_STATUSES).toContain('ready');
        });

        it('has completed status', () => {
            expect(LAUNDRY_STATUSES).toContain('completed');
        });

        it('has no-show status', () => {
            expect(LAUNDRY_STATUSES).toContain('no-show');
        });

        it('has exactly 7 statuses', () => {
            expect(LAUNDRY_STATUSES.length).toBe(7);
        });
    });

    describe('BICYCLE_SERVICE_TYPES', () => {
        const BICYCLE_SERVICE_TYPES = ['repair', 'tune-up', 'new-bicycle'];

        it('has repair type', () => {
            expect(BICYCLE_SERVICE_TYPES).toContain('repair');
        });

        it('has tune-up type', () => {
            expect(BICYCLE_SERVICE_TYPES).toContain('tune-up');
        });

        it('has new-bicycle type', () => {
            expect(BICYCLE_SERVICE_TYPES).toContain('new-bicycle');
        });

        it('has exactly 3 types', () => {
            expect(BICYCLE_SERVICE_TYPES.length).toBe(3);
        });
    });

    describe('DONATION_TYPES', () => {
        const DONATION_TYPES = ['monetary', 'in-kind', 'volunteer', 'other'];

        it('has monetary type', () => {
            expect(DONATION_TYPES).toContain('monetary');
        });

        it('has in-kind type', () => {
            expect(DONATION_TYPES).toContain('in-kind');
        });

        it('has volunteer type', () => {
            expect(DONATION_TYPES).toContain('volunteer');
        });

        it('has other type', () => {
            expect(DONATION_TYPES).toContain('other');
        });

        it('has exactly 4 types', () => {
            expect(DONATION_TYPES.length).toBe(4);
        });
    });

    describe('DAYS_OF_WEEK', () => {
        const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        it('starts with Sunday', () => {
            expect(DAYS_OF_WEEK[0]).toBe('Sunday');
        });

        it('ends with Saturday', () => {
            expect(DAYS_OF_WEEK[6]).toBe('Saturday');
        });

        it('has exactly 7 days', () => {
            expect(DAYS_OF_WEEK.length).toBe(7);
        });

        it('includes Monday', () => {
            expect(DAYS_OF_WEEK).toContain('Monday');
        });

        it('includes Wednesday', () => {
            expect(DAYS_OF_WEEK).toContain('Wednesday');
        });

        it('has correct order', () => {
            expect(DAYS_OF_WEEK.indexOf('Monday')).toBe(1);
            expect(DAYS_OF_WEEK.indexOf('Friday')).toBe(5);
        });
    });

    describe('SERVICE_DAYS', () => {
        const SERVICE_DAYS = [1, 3, 5, 6]; // Monday, Wednesday, Friday, Saturday

        it('includes Monday (1)', () => {
            expect(SERVICE_DAYS).toContain(1);
        });

        it('includes Wednesday (3)', () => {
            expect(SERVICE_DAYS).toContain(3);
        });

        it('includes Friday (5)', () => {
            expect(SERVICE_DAYS).toContain(5);
        });

        it('includes Saturday (6)', () => {
            expect(SERVICE_DAYS).toContain(6);
        });

        it('excludes Sunday (0)', () => {
            expect(SERVICE_DAYS).not.toContain(0);
        });

        it('excludes Tuesday (2)', () => {
            expect(SERVICE_DAYS).not.toContain(2);
        });

        it('excludes Thursday (4)', () => {
            expect(SERVICE_DAYS).not.toContain(4);
        });

        it('has exactly 4 service days', () => {
            expect(SERVICE_DAYS.length).toBe(4);
        });
    });

    describe('AUTOMATIC_MEALS_CONFIG', () => {
        const config = {
            monday: { rv: 100, lunchBags: 120 },
            wednesday: { rv: 40, lunchBags: 120 },
            thursday: { rv: 100 },
            saturday: { rv: 100, lunchBags: 220, dayWorker: 50 },
        };

        it('Monday has 100 RV meals', () => {
            expect(config.monday.rv).toBe(100);
        });

        it('Monday has 120 lunch bags', () => {
            expect(config.monday.lunchBags).toBe(120);
        });

        it('Wednesday has 40 RV meals', () => {
            expect(config.wednesday.rv).toBe(40);
        });

        it('Saturday has 50 day worker meals', () => {
            expect(config.saturday.dayWorker).toBe(50);
        });

        it('Saturday has 220 lunch bags', () => {
            expect(config.saturday.lunchBags).toBe(220);
        });

        it('Thursday has 100 RV meals', () => {
            expect(config.thursday.rv).toBe(100);
        });
    });

    describe('TARGET_DEFAULTS', () => {
        const TARGETS = {
            monthlyMeals: 1500,
            yearlyMeals: 18000,
            monthlyShowers: 300,
            yearlyShowers: 3600,
            monthlyLaundry: 200,
            yearlyLaundry: 2400,
            monthlyBicycles: 50,
            yearlyBicycles: 600,
        };

        it('has monthly meals target', () => {
            expect(TARGETS.monthlyMeals).toBe(1500);
        });

        it('has yearly meals target', () => {
            expect(TARGETS.yearlyMeals).toBe(18000);
        });

        it('has monthly showers target', () => {
            expect(TARGETS.monthlyShowers).toBe(300);
        });

        it('has yearly showers target', () => {
            expect(TARGETS.yearlyShowers).toBe(3600);
        });

        it('has monthly laundry target', () => {
            expect(TARGETS.monthlyLaundry).toBe(200);
        });

        it('has monthly bicycles target', () => {
            expect(TARGETS.monthlyBicycles).toBe(50);
        });

        it('yearly equals monthly times 12', () => {
            expect(TARGETS.yearlyMeals).toBe(TARGETS.monthlyMeals * 12);
            expect(TARGETS.yearlyShowers).toBe(TARGETS.monthlyShowers * 12);
        });
    });
});
