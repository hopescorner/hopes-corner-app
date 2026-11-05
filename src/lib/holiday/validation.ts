import { HOLIDAY_TIME_SLOTS, HOLIDAY_NO_SCHOOL_VALUE } from '@/lib/holiday/constants';
import { calculateAge } from '@/lib/holiday/ageGroups';
import { normalizeHolidayPhoneDigits } from '@/lib/holiday/phone';
import { HOLIDAY_TRANSLATIONS } from '@/lib/holiday/translations';
import type { HolidayLanguage, HolidayRegistrationInput } from '@/types/holiday';

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

export type HolidayValidationErrorCode =
    | 'INVALID_PAYLOAD'
    | 'PARENT_NAME_REQUIRED'
    | 'PARENT_NAME_TOO_LONG'
    | 'PHONE_REQUIRED'
    | 'PHONE_INVALID'
    | 'PHONE_TOO_LONG'
    | 'CITY_REQUIRED'
    | 'CITY_TOO_LONG'
    | 'INVALID_HOUSING_STATUS'
    | 'INVALID_INCOME_RANGE'
    | 'INVALID_LANGUAGE'
    | 'INVALID_TIME_SLOT'
    | 'CHILDREN_REQUIRED'
    | 'TOO_MANY_CHILDREN'
    | 'INVALID_CHILD'
    | 'CHILD_NAME_REQUIRED'
    | 'CHILD_NAME_TOO_LONG'
    | 'CHILD_AGE_INVALID'
    | 'CHILD_SCHOOL_TOO_LONG'
    | 'CHILD_SCHOOL_REQUIRED'
    | 'CHILD_GENDER_TOO_LONG'
    | 'CHILD_BIRTHDATE_REQUIRED'
    | 'CHILD_BIRTHDATE_FORMAT'
    | 'CHILD_BIRTHDATE_INVALID';

export interface HolidayRegistrationValidationOptions {
    requireBirthdate?: boolean;
    requireSchool?: boolean;
    maxChildren?: number;
}

function optionalStringIsValid(value: unknown, maxLength: number): boolean {
    return value === undefined || value === null || (typeof value === 'string' && value.length <= maxLength);
}

function isRealIsoDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

function isFutureIsoDate(value: string, now: Date = new Date()): boolean {
    const [year, month, day] = value.split('-').map(Number);
    const dateUtc = Date.UTC(year, month - 1, day);
    const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return dateUtc > todayUtc;
}

export function holidayRegistrationValidationErrorCode(
    input: unknown,
    options?: HolidayRegistrationValidationOptions
): HolidayValidationErrorCode | null {
    if (!input || typeof input !== 'object') return 'INVALID_PAYLOAD';

    const body = input as Partial<HolidayRegistrationInput>;
    if (typeof body.parentName !== 'string' || !body.parentName.trim()) {
        return 'PARENT_NAME_REQUIRED';
    }
    if (body.parentName.length > MAX_PARENT_NAME_LENGTH) return 'PARENT_NAME_TOO_LONG';

    if (typeof body.phone !== 'string' || !body.phone.trim()) return 'PHONE_REQUIRED';
    const phoneDigits = normalizeHolidayPhoneDigits(body.phone);
    if (phoneDigits.length !== 10) return 'PHONE_INVALID';
    if (body.phone.length > MAX_PHONE_LENGTH) return 'PHONE_TOO_LONG';

    if (typeof body.city !== 'string' || !body.city.trim()) return 'CITY_REQUIRED';
    if (body.city.length > MAX_CITY_LENGTH) return 'CITY_TOO_LONG';

    if (body.housingStatus !== undefined && !HOUSING_STATUSES.has(body.housingStatus)) {
        return 'INVALID_HOUSING_STATUS';
    }
    if (body.incomeRange !== undefined && !INCOME_RANGES.has(body.incomeRange)) {
        return 'INVALID_INCOME_RANGE';
    }
    if (body.language !== undefined && !LANGUAGES.has(body.language)) return 'INVALID_LANGUAGE';
    if (body.timeSlot !== undefined) {
        if (typeof body.timeSlot !== 'string' || !TIME_SLOTS.has(body.timeSlot.trim())) {
            return 'INVALID_TIME_SLOT';
        }
    }

    if (!Array.isArray(body.children) || body.children.length === 0) {
        return 'CHILDREN_REQUIRED';
    }
    if (body.children.length > (options?.maxChildren ?? MAX_HOLIDAY_CHILDREN)) {
        return 'TOO_MANY_CHILDREN';
    }

    for (const child of body.children) {
        if (!child || typeof child !== 'object') return 'INVALID_CHILD';
        if (typeof child.name !== 'string' || !child.name.trim()) return 'CHILD_NAME_REQUIRED';
        if (child.name.length > MAX_CHILD_NAME_LENGTH) return 'CHILD_NAME_TOO_LONG';
        if (!Number.isInteger(child.age) || child.age < 0 || child.age > 18) {
            return 'CHILD_AGE_INVALID';
        }
        if (!optionalStringIsValid(child.school, MAX_SCHOOL_LENGTH)) return 'CHILD_SCHOOL_TOO_LONG';
        if (
            options?.requireSchool &&
            (typeof child.school !== 'string' || !child.school.trim()) &&
            child.school !== HOLIDAY_NO_SCHOOL_VALUE
        ) {
            return 'CHILD_SCHOOL_REQUIRED';
        }
        if (!optionalStringIsValid(child.gender, MAX_GENDER_LENGTH)) return 'CHILD_GENDER_TOO_LONG';
        if (options?.requireBirthdate && (!child.birthdate || typeof child.birthdate !== 'string')) {
            return 'CHILD_BIRTHDATE_REQUIRED';
        }
        if (child.birthdate !== undefined && child.birthdate !== null && child.birthdate !== '') {
            if (typeof child.birthdate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(child.birthdate)) {
                return 'CHILD_BIRTHDATE_FORMAT';
            }
            if (!isRealIsoDate(child.birthdate) || isFutureIsoDate(child.birthdate)) {
                return 'CHILD_BIRTHDATE_INVALID';
            }
            if (calculateAge(child.birthdate, new Date(), 120) > 18) {
                return 'CHILD_AGE_INVALID';
            }
        }
    }

    return null;
}

export function holidayValidationMessage(
    code: HolidayValidationErrorCode,
    language: HolidayLanguage = 'en'
): string {
    const errors = HOLIDAY_TRANSLATIONS[language]?.errors ?? HOLIDAY_TRANSLATIONS.en.errors;

    switch (code) {
        case 'PARENT_NAME_REQUIRED':
            return errors.parentNameRequired;
        case 'PHONE_REQUIRED':
        case 'PHONE_INVALID':
            return errors.phoneRequired;
        case 'CITY_REQUIRED':
            return errors.cityRequired;
        case 'CHILDREN_REQUIRED':
            return errors.atLeastOneChild;
        case 'TOO_MANY_CHILDREN':
            return errors.childLimitReached;
        case 'CHILD_NAME_REQUIRED':
            return errors.childNameRequired;
        case 'CHILD_BIRTHDATE_REQUIRED':
            return errors.childBirthdateRequired;
        case 'CHILD_BIRTHDATE_FORMAT':
        case 'CHILD_BIRTHDATE_INVALID':
            return errors.childBirthdateInvalid;
        case 'CHILD_SCHOOL_REQUIRED':
            return errors.childSchoolRequired;
        case 'CHILD_AGE_INVALID':
            return errors.childAgeRange;
        default:
            return errors.submissionFailed;
    }
}

const ENGLISH_VALIDATION_MESSAGES: Record<HolidayValidationErrorCode, string> = {
    INVALID_PAYLOAD: 'Invalid registration payload',
    PARENT_NAME_REQUIRED: 'Parent/Guardian name is required',
    PARENT_NAME_TOO_LONG: 'Parent/Guardian name is too long',
    PHONE_REQUIRED: 'Phone number is required',
    PHONE_INVALID: 'Phone number must be exactly 10 digits',
    PHONE_TOO_LONG: 'Phone number is too long',
    CITY_REQUIRED: 'City is required',
    CITY_TOO_LONG: 'City is too long',
    INVALID_HOUSING_STATUS: 'Invalid housing status',
    INVALID_INCOME_RANGE: 'Invalid income range',
    INVALID_LANGUAGE: 'Invalid language',
    INVALID_TIME_SLOT: 'Invalid time slot specified',
    CHILDREN_REQUIRED: 'At least one child is required',
    TOO_MANY_CHILDREN: `No more than ${MAX_HOLIDAY_CHILDREN} children may be registered`,
    INVALID_CHILD: 'Invalid child information',
    CHILD_NAME_REQUIRED: 'Child name is required',
    CHILD_NAME_TOO_LONG: 'Child name is too long',
    CHILD_AGE_INVALID: 'Child age must be a whole number between 0 and 18',
    CHILD_SCHOOL_TOO_LONG: 'School name is too long',
    CHILD_SCHOOL_REQUIRED: 'Child school name is required',
    CHILD_GENDER_TOO_LONG: 'Gender value is too long',
    CHILD_BIRTHDATE_REQUIRED: 'Child birthdate is required',
    CHILD_BIRTHDATE_FORMAT: 'Child birthdate must use YYYY-MM-DD format',
    CHILD_BIRTHDATE_INVALID: 'Please enter a valid birthdate that is not in the future.',
};

export function holidayRegistrationValidationError(
    input: unknown,
    options?: HolidayRegistrationValidationOptions
): string | null {
    const code = holidayRegistrationValidationErrorCode(input, options);

    if (code === 'TOO_MANY_CHILDREN') {
        return `No more than ${options?.maxChildren ?? MAX_HOLIDAY_CHILDREN} children may be registered`;
    }

    return code ? ENGLISH_VALIDATION_MESSAGES[code] : null;
}

export function isValidHolidayCardCount(value: unknown): value is number {
    return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MAX_HOLIDAY_CARD_COUNT;
}

export function isValidHolidayNotes(value: unknown): value is string | null | undefined {
    return value === undefined || value === null || (typeof value === 'string' && value.length <= MAX_HOLIDAY_NOTES_LENGTH);
}
