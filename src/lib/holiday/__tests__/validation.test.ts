import { describe, expect, it } from 'vitest';
import { holidayRegistrationValidationError } from '../validation';

const validRegistration = {
    parentName: 'Jane Doe',
    phone: '6505551234',
    city: 'Mountain View',
    housingStatus: 'house_apartment',
    incomeRange: '0_40k',
    language: 'en',
    children: [{ name: 'Eligible Teen', age: 18 }],
};

describe('holidayRegistrationValidationError', () => {
    it('accepts an 18-year-old for public and staff registration requests', () => {
        expect(holidayRegistrationValidationError(validRegistration)).toBeNull();
    });

    it('rejects ages above 18', () => {
        expect(holidayRegistrationValidationError({
            ...validRegistration,
            children: [{ name: 'Ineligible Adult', age: 19 }],
        })).toBe('Child age must be a whole number between 0 and 18');
    });
});
