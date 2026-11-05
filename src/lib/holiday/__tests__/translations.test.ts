import { describe, it, expect } from 'vitest';
import { HOLIDAY_TRANSLATIONS } from '../translations';
import { HolidayLanguage } from '@/types/holiday';

describe('Holiday translations', () => {
    const languages: HolidayLanguage[] = ['en', 'es', 'zh'];

    it('contains translations for en, es, and zh', () => {
        languages.forEach((lang) => {
            expect(HOLIDAY_TRANSLATIONS[lang]).toBeDefined();
        });
    });

    it('has all required keys populated with non-empty strings across all languages', () => {
        const requiredKeys = [
            'appTitle',
            'programTitle',
            'registrationTitle',
            'registrationNotice',
            'languageLabel',
            'parentSectionTitle',
            'parentNameLabel',
            'phoneLabel',
            'cityLabel',
            'housingLabel',
            'incomeLabel',
            'childSectionTitle',
            'addChildButton',
            'howItWorksTitle',
            'step1Title',
            'step1Desc',
            'step2Title',
            'step2Desc',
            'step3Title',
            'step3Desc',
            'guidelinesTitle',
            'guidelineScreenshot',
            'guidelineArrival',
            'guidelineHousehold',
            'arrivalInfoTitle',
            'arrivalInfoNotice',
            'submitButton',
            'confirmationTitle',
            'ticketNumberLabel',
            'yourTimeSlot',
            'downloadImageButton',
            'downloadPdfButton',
            'autoSaveNotice',
            'printTicketButton',
            'childLimitNotice',
            'childCountOne',
            'childCountMany',
            'childNotInSchoolLabel',
            'eventDateLabel',
            'eventYearLabel',
            'addToCalendarButton',
            'directionsButton',
            'privacyNoticeTitle',
            'privacyNotice',
            'duplicateWarning',
            'findTicketButton',
            'findTicketTitle',
            'findTicketDescription',
            'findTicketPhoneLabel',
            'findTicketParentNameLabel',
            'findTicketSubmitButton',
            'findTicketSearchingButton',
            'findTicketNotFound',
            'findTicketMissingFields',
            'findTicketError',
            'findTicketResultTitle',
            'findTicketCloseButton',
        ] as const;

        languages.forEach((lang) => {
            const translation = HOLIDAY_TRANSLATIONS[lang];
            requiredKeys.forEach((key) => {
                expect(translation[key]).toBeTypeOf('string');
                expect(translation[key].length).toBeGreaterThan(0);
            });

            expect(translation.housingOptions.house_apartment).toBeTypeOf('string');
            expect(translation.housingOptions.vehicle_rv_camper).toBeTypeOf('string');
            expect(translation.housingOptions.temp_shelter_motel).toBeTypeOf('string');
            expect(translation.housingOptions.outside).toBeTypeOf('string');

            expect(translation.incomeOptions['0_40k']).toBeTypeOf('string');
            expect(translation.incomeOptions['41_65k']).toBeTypeOf('string');
            expect(translation.incomeOptions['66_90k']).toBeTypeOf('string');
            expect(translation.incomeOptions['over_90k']).toBeTypeOf('string');

            expect(translation.errors.parentNameRequired).toBeTypeOf('string');
            expect(translation.errors.phoneRequired).toBeTypeOf('string');
            expect(translation.errors.cityRequired).toBeTypeOf('string');
            expect(translation.errors.atLeastOneChild).toBeTypeOf('string');
            expect(translation.errors.allSlotsFull).toBeTypeOf('string');
            expect(translation.errors.childSchoolRequired).toBeTypeOf('string');
            expect(translation.errors.childLimitReached).toBeTypeOf('string');
            expect(translation.errors.childBirthdateInvalid).toBeTypeOf('string');
            expect(translation.errors.rateLimited).toBeTypeOf('string');
            expect(translation.errors.slotFull).toBeTypeOf('string');

            (['infant', 'toddler', 'child', 'teen_13', 'teen_14', 'teen_15', 'teen_16_18'] as const).forEach((group) => {
                expect(translation.ageGroupLabels[group]).toBeTypeOf('string');
                expect(translation.ageGroupLabels[group].length).toBeGreaterThan(0);
            });
        });
    });

    it('provides a per-child over-age error with a name placeholder in every language', () => {
        languages.forEach((lang) => {
            const message = HOLIDAY_TRANSLATIONS[lang].errors.childOverAge;
            expect(message).toBeTypeOf('string');
            expect(message).toContain('{name}');
            expect(message.length).toBeGreaterThan(0);
        });
    });

    it('dynamically includes the current year in programTitle across all languages', () => {
        const currentYear = String(new Date().getFullYear());
        languages.forEach((lang) => {
            expect(HOLIDAY_TRANSLATIONS[lang].programTitle).toContain(currentYear);
        });
    });
});
