export type ServiceDataKey = 'services' | 'guests' | 'meals' | 'donations' | 'reminders' | 'dailyNotes';

export function serviceTabDataKeys(tab: string): ServiceDataKey[] {
    switch (tab) {
        case 'donations':
            return ['donations'];
        case 'meals':
            return ['meals', 'guests', 'dailyNotes'];
        case 'overview':
        case 'timeline':
            return ['services', 'guests', 'meals'];
        case 'showers':
        case 'laundry':
            return ['services', 'guests', 'reminders', 'dailyNotes'];
        case 'haircuts':
        case 'bicycles':
            return ['services', 'guests', 'reminders'];
        default:
            return ['services', 'guests'];
    }
}
