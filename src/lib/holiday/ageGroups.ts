import { HolidayAgeGroup } from '@/types/holiday';

export const MAX_HOLIDAY_CHILD_AGE = 18;

export function calculateAge(birthdateStr?: string, referenceDate: Date = new Date(), maxAge: number = MAX_HOLIDAY_CHILD_AGE): number {
    if (!birthdateStr || typeof birthdateStr !== 'string') return 0;
    const parts = birthdateStr.trim().split('-');
    if (parts.length !== 3) return 0;
    const birthYear = parseInt(parts[0], 10);
    const birthMonth = parseInt(parts[1], 10);
    const birthDay = parseInt(parts[2], 10);
    if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return 0;

    const currentYear = referenceDate.getFullYear();
    const currentMonth = referenceDate.getMonth() + 1;
    const currentDay = referenceDate.getDate();

    let age = currentYear - birthYear;
    if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
        age--;
    }
    return Math.max(0, Math.min(maxAge, age));
}


export function getHolidayAgeGroup(age: number): HolidayAgeGroup {
    const clampedAge = Math.max(0, Math.min(MAX_HOLIDAY_CHILD_AGE, Math.floor(age)));
    if (clampedAge <= 1) return 'infant';
    if (clampedAge <= 4) return 'toddler';
    if (clampedAge <= 12) return 'child';
    if (clampedAge === 13) return 'teen_13';
    if (clampedAge === 14) return 'teen_14';
    if (clampedAge === 15) return 'teen_15';
    return 'teen_16_18';
}

export function isTeen14Plus(age: number): boolean {
    return age >= 14 && age <= MAX_HOLIDAY_CHILD_AGE;
}

export function calculateRecommendedCards(children: Array<{ age: number }>): {
    groceryCards: number;
    teenCards: number;
} {
    const teenCards = children.filter((c) => isTeen14Plus(c.age)).length;
    return {
        groceryCards: children.length > 0 ? 1 : 0,
        teenCards,
    };
}

export function formatAgeGroupLabel(group: HolidayAgeGroup): string {
    switch (group) {
        case 'infant':
            return 'Infant (0-1)';
        case 'toddler':
            return 'Toddler (1-4)';
        case 'child':
            return 'Child (5-12)';
        case 'teen_13':
            return 'Teen (13)';
        case 'teen_14':
            return 'Teen (14)';
        case 'teen_15':
            return 'Teen (15)';
        case 'teen_16_18':
            return 'Teen (16-18)';
        default:
            return group;
    }
}
