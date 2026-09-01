export const HOLIDAY_EVENT_YEAR = new Date().getFullYear();
export const MAX_PARENTS_PER_HOLIDAY_SLOT = 16;

export const HOLIDAY_TIME_SLOTS = [
    { id: '09:00 AM - 09:20 AM', label: '09:00 AM - 09:20 AM' },
    { id: '09:20 AM - 09:40 AM', label: '09:20 AM - 09:40 AM' },
    { id: '09:40 AM - 10:00 AM', label: '09:40 AM - 10:00 AM' },
    { id: '10:00 AM - 10:20 AM', label: '10:00 AM - 10:20 AM' },
    { id: '10:20 AM - 10:40 AM', label: '10:20 AM - 10:40 AM' },
    { id: '10:40 AM - 11:00 AM', label: '10:40 AM - 11:00 AM' },
    { id: '11:00 AM - 11:20 AM', label: '11:00 AM - 11:20 AM' },
    { id: '11:20 AM - 11:40 AM', label: '11:20 AM - 11:40 AM' },
    { id: '11:40 AM - 12:00 PM', label: '11:40 AM - 12:00 PM' },
    { id: '12:00 PM - 12:20 PM', label: '12:00 PM - 12:20 PM' },
    { id: '12:20 PM - 12:40 PM', label: '12:20 PM - 12:40 PM' },
    { id: '12:40 PM - 01:00 PM', label: '12:40 PM - 01:00 PM' },
    { id: '01:00 PM - 01:20 PM', label: '01:00 PM - 01:20 PM' },
    { id: '01:20 PM - 01:40 PM', label: '01:20 PM - 01:40 PM' },
    { id: '01:40 PM - 02:00 PM', label: '01:40 PM - 02:00 PM' },
] as const;

export function getNextAvailableHolidaySlot(
    slotCounts: Record<string, number>,
    maxPerSlot: number = MAX_PARENTS_PER_HOLIDAY_SLOT
): string | null {
    for (const slot of HOLIDAY_TIME_SLOTS) {
        const count = slotCounts[slot.id] || 0;
        if (count < maxPerSlot) {
            return slot.id;
        }
    }
    return null;
}

export const HOLIDAY_CITIES = [
    'Mountain View',
    'Sunnyvale',
    'Palo Alto',
    'Los Altos',
    'Santa Clara',
    'San Jose',
    'Cupertino',
    'Redwood City',
    'Menlo Park',
    'East Palo Alto',
    'Other',
] as const;
