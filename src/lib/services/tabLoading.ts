export type ServiceDataKey = 'services' | 'guests' | 'meals' | 'donations' | 'reminders';

export function serviceTabDataKeys(tab: string): ServiceDataKey[] {
    switch (tab) {
        case 'donations':
            return ['donations'];
        case 'meals':
            return ['meals', 'guests'];
        case 'overview':
        case 'timeline':
            return ['services', 'guests', 'meals'];
        case 'showers':
        case 'laundry':
        case 'haircuts':
        case 'bicycles':
            return ['services', 'guests', 'reminders'];
        default:
            return ['services', 'guests'];
    }
}
