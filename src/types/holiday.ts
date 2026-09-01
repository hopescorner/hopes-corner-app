export type HolidayLanguage = 'en' | 'es' | 'zh';

export type HolidayHousingStatus =
    | 'house_apartment'
    | 'vehicle_rv_camper'
    | 'temp_shelter_motel'
    | 'outside';

export type HolidayIncomeRange =
    | '0_40k'
    | '41_65k'
    | '66_90k'
    | 'over_90k';

export type HolidayAgeGroup =
    | 'infant'
    | 'toddler'
    | 'child'
    | 'teen_13'
    | 'teen_14'
    | 'teen_15'
    | 'teen_16_18';

export type HolidayRegistrationStatus =
    | 'registered'
    | 'checked_in'
    | 'cancelled'
    | 'no_show';

export interface HolidayChild {
    id: string;
    registrationId?: string;
    name: string;
    birthdate?: string;
    age: number;
    school?: string;
    gender?: string;
    ageGroup: HolidayAgeGroup;
    createdAt?: string;
}

export interface HolidayRegistration {
    id: string;
    ticketNumber: number;
    eventYear: number;
    parentName: string;
    phone: string;
    city: string;
    housingStatus: HolidayHousingStatus;
    incomeRange: HolidayIncomeRange;
    timeSlot: string;
    language: HolidayLanguage;
    status: HolidayRegistrationStatus;
    groceryCards: number;
    teenCards: number;
    notes?: string;
    checkedInAt?: string;
    checkedInBy?: string;
    children?: HolidayChild[];
    createdAt: string;
    updatedAt: string;
}

export interface HolidayRegistrationInput {
    parentName: string;
    phone: string;
    city: string;
    housingStatus: HolidayHousingStatus;
    incomeRange: HolidayIncomeRange;
    timeSlot?: string;
    language: HolidayLanguage;
    children: Array<{
        name: string;
        birthdate?: string;
        age: number;
        school?: string;
        gender?: string;
    }>;
}


export interface HolidayTimeSlotInfo {
    slot: string;
    label: string;
    bookedCount: number;
    maxCapacity: number;
    remaining: number;
    isFull: boolean;
}

export interface HolidaySummaryMetrics {
    totalRegistrations: number;
    checkedInCount: number;
    pendingCount: number;
    infantsCount: number;
    toddlersCount: number;
    childrenCount: number;
    teen13Count: number;
    teen14Count: number;
    teen15Count: number;
    teen16To18Count: number;
    totalChildrenCount: number;
    teen14PlusCount: number;
    groceryCardsCount: number;
    teenCardsCount: number;
}
