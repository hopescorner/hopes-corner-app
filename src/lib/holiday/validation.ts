import { HOLIDAY_TIME_SLOTS } from '@/lib/holiday/constants';
import type { HolidayRegistrationInput } from '@/types/holiday';

export const MAX_HOLIDAY_CHILDREN = 20;
export const MAX_HOLIDAY_CARD_COUNT = 100;
export const MAX_HOLIDAY_NOTES_LENGTH = 2_000;

const MAX_PARENT_NAME_LENGTH = 200;
const MAX_PHONE_LENGTH = 50;
const MAX_CITY_LENGTH = 100;
const MAX_CHILD_NAME_LENGTH = 200;
const MAX_SCHOOL_LENGTH = 200;
const MAX_GENDER_LENGTH = 50;

const HOUSING_STATUSES = new Set(['house_apartment', 'vehicle_rv_camper', 'temp_shelter_motel', 'outside']);
const INCOME_RANGES = new Set(['0_40k', '41_65k', '66_90k', 'over_90k']);
const LANGUAGES = new Set(['en', 'es', 'zh']);
const TIME_SLOTS = new Set<string>(HOLIDAY_TIME_SLOTS.map((slot) => slot.id));

function optionalStringIsValid(value: unknown, maxLength: number): boolean {
    return value === undefined || value === null || (typeof value === 'string' && value.length <= maxLength);
}

export function holidayRegistrationValidationError(input: unknown, options?: { requireBirthdate?: boolean }): string | null {
    if (!input || typeof input !== 'object') return 'Invalid registration payload';

    const body = input as Partial<HolidayRegistrationInput>;
    if (typeof body.parentName !== 'string' || !body.parentName.trim()) {
        return 'Parent/Guardian name is required';
    }
    if (body.parentName.length > MAX_PARENT_NAME_LENGTH) return 'Parent/Guardian name is too long';

    if (typeof body.phone !== 'string' || !body.phone.trim()) return 'Phone number is required';
    const phoneDigits = body.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) return 'Phone number must be exactly 10 digits';
    if (body.phone.length > MAX_PHONE_LENGTH) return 'Phone number is too long';

    if (typeof body.city !== 'string' || !body.city.trim()) return 'City is required';
    if (body.city.length > MAX_CITY_LENGTH) return 'City is too long';

    if (body.housingStatus !== undefined && !HOUSING_STATUSES.has(body.housingStatus)) {
        return 'Invalid housing status';
    }
    if (body.incomeRange !== undefined && !INCOME_RANGES.has(body.incomeRange)) {
        return 'Invalid income range';
    }
    if (body.language !== undefined && !LANGUAGES.has(body.language)) return 'Invalid language';
    if (body.timeSlot !== undefined) {
        if (typeof body.timeSlot !== 'string' || !TIME_SLOTS.has(body.timeSlot.trim())) {
            return 'Invalid time slot specified';
        }
    }

    if (!Array.isArray(body.children) || body.children.length === 0) {
        return 'At least one child is required';
    }
    if (body.children.length > MAX_HOLIDAY_CHILDREN) {
        return `No more than ${MAX_HOLIDAY_CHILDREN} children may be registered`;
    }

    for (const child of body.children) {
        if (!child || typeof child !== 'object') return 'Invalid child information';
        if (typeof child.name !== 'string' || !child.name.trim()) return 'Child name is required';
        if (child.name.length > MAX_CHILD_NAME_LENGTH) return 'Child name is too long';
        if (!Number.isInteger(child.age) || child.age < 0 || child.age >= 18) {
            return 'Child age must be a whole number between 0 and 17';
        }
        if (!optionalStringIsValid(child.school, MAX_SCHOOL_LENGTH)) return 'School name is too long';
        if (!optionalStringIsValid(child.gender, MAX_GENDER_LENGTH)) return 'Gender value is too long';
        if (options?.requireBirthdate && (!child.birthdate || typeof child.birthdate !== 'string')) {
            return 'Child birthdate is required';
        }
        if (child.birthdate !== undefined && child.birthdate !== null && child.birthdate !== '') {
            if (typeof child.birthdate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(child.birthdate)) {
                return 'Child birthdate must use YYYY-MM-DD format';
            }
        }
    }

    return null;
}

export function isValidHolidayCardCount(value: unknown): value is number {
    return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MAX_HOLIDAY_CARD_COUNT;
}

export function isValidHolidayNotes(value: unknown): value is string | null | undefined {
    return value === undefined || value === null || (typeof value === 'string' && value.length <= MAX_HOLIDAY_NOTES_LENGTH);
}
