import { describe, expect, it } from 'vitest';
import { holidayRegistrationValidationError, holidayValidationMessage } from '../validation';

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

    it('rejects a birthdate that would make the child older than 18', () => {
        const currentYear = new Date().getFullYear();
        expect(holidayRegistrationValidationError({
            ...validRegistration,
            children: [{
                name: 'Ineligible Adult',
                age: 0,
                birthdate: `${currentYear - 19}-01-01`,
            }],
        })).toBe('Child age must be a whole number between 0 and 18');
    });

    it('rejects a future birthdate', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const day = String(tomorrow.getDate()).padStart(2, '0');
        const iso = `${tomorrow.getFullYear()}-${month}-${day}`;

        expect(holidayRegistrationValidationError({
            ...validRegistration,
            children: [{ name: 'Future Child', age: 0, birthdate: iso, school: 'Mountain View High' }],
        }, { requireBirthdate: true, requireSchool: true })).toBe(
            'Please enter a valid birthdate that is not in the future.'
        );
    });

    it('accepts the not-in-school marker when school is required', () => {
        expect(holidayRegistrationValidationError({
            ...validRegistration,
            children: [{ name: 'Toddler', age: 2, birthdate: '2024-01-01', school: 'not_in_school' }],
        }, { requireBirthdate: true, requireSchool: true })).toBeNull();
    });

    it('localizes validation codes for the public form', () => {
        expect(holidayValidationMessage('PARENT_NAME_REQUIRED', 'es'))
            .toBe('Por favor ingrese el nombre del padre o tutor.');
        expect(holidayValidationMessage('CHILD_SCHOOL_REQUIRED', 'es'))
            .toBe('Por favor ingrese el nombre de la escuela de cada niño/a.');
    });

    it('requires a school name when the school requirement is enabled', () => {
        expect(holidayRegistrationValidationError(
            { ...validRegistration, children: [{ name: 'Child A', age: 7 }] },
            { requireSchool: true }
        )).toBe('Child school name is required');
    });

    it('accepts three children but rejects a fourth when a three-child limit is set', () => {
        const children = Array.from({ length: 4 }, (_, index) => ({
            name: `Child ${index + 1}`,
            age: 7,
            school: 'Mountain View High',
        }));

        expect(holidayRegistrationValidationError(
            { ...validRegistration, children: children.slice(0, 3) },
            { requireSchool: true, maxChildren: 3 }
        )).toBeNull();

        expect(holidayRegistrationValidationError(
            { ...validRegistration, children },
            { requireSchool: true, maxChildren: 3 }
        )).toBe('No more than 3 children may be registered');
    });
});
