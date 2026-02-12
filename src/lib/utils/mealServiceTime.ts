export function getMealServiceInfo(date: Date = new Date()) {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    const serviceSchedule: Record<number, { startHour: number; startMinute: number; endHour: number; endMinute: number; } | null> = {
        0: { startHour: 10, startMinute: 0, endHour: 14, endMinute: 0 }, // Sunday Brunch
        1: { startHour: 8, startMinute: 0, endHour: 9, endMinute: 0 }, // Monday
        2: null, // Tuesday - no service
        3: { startHour: 8, startMinute: 0, endHour: 9, endMinute: 0 }, // Wednesday
        4: null, // Thursday - no service
        5: { startHour: 7, startMinute: 30, endHour: 8, endMinute: 30 }, // Friday
        6: { startHour: 8, startMinute: 0, endHour: 10, endMinute: 0 }, // Saturday
    };

    return serviceSchedule[dayOfWeek];
}

export function getMealServiceName(date: Date = new Date()): string | null {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) {
        return 'Sunday Brunch';
    }
    return null;
}

export function isSundayBrunch(date: Date = new Date()): boolean {
    return date.getDay() === 0;
}

export function formatTime(hour: number, minute: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
}

export function formatTimeRemaining(minutes: number): string {
    if (minutes < 1) {
        return 'less than a minute';
    }

    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    if (hours === 0) {
        return `${mins} min`;
    }

    if (mins === 0) {
        return hours === 1 ? '1 hour' : `${hours} hours`;
    }

    return `${hours}h ${mins}m`;
}

export interface MealServiceStatus {
    type: 'no-service' | 'before-service' | 'during-service' | 'ended';
    message: string | null;
    timeRemaining: number | null;
    startsAt?: string;
    endsAt?: string;
    totalDuration?: number;
    elapsed?: number;
}

export function getMealServiceStatus(now: Date = new Date()): MealServiceStatus {
    const serviceInfo = getMealServiceInfo(now);

    // No service today
    if (!serviceInfo) {
        return {
            type: 'no-service',
            message: null,
            timeRemaining: null,
        };
    }

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    const startTimeInMinutes = serviceInfo.startHour * 60 + serviceInfo.startMinute;
    const endTimeInMinutes = serviceInfo.endHour * 60 + serviceInfo.endMinute;

    // Before service starts
    if (currentTimeInMinutes < startTimeInMinutes) {
        const minutesUntilStart = startTimeInMinutes - currentTimeInMinutes;
        return {
            type: 'before-service',
            message: `Meal service starts in ${formatTimeRemaining(minutesUntilStart)}`,
            timeRemaining: minutesUntilStart,
            startsAt: formatTime(serviceInfo.startHour, serviceInfo.startMinute),
            endsAt: formatTime(serviceInfo.endHour, serviceInfo.endMinute),
        };
    }

    // During service
    if (currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes) {
        const minutesRemaining = endTimeInMinutes - currentTimeInMinutes;
        return {
            type: 'during-service',
            message: `${formatTimeRemaining(minutesRemaining)} remaining`,
            timeRemaining: minutesRemaining,
            totalDuration: endTimeInMinutes - startTimeInMinutes,
            elapsed: currentTimeInMinutes - startTimeInMinutes,
            endsAt: formatTime(serviceInfo.endHour, serviceInfo.endMinute),
        };
    }

    // After service ended
    return {
        type: 'ended',
        message: 'Meal service ended for today',
        timeRemaining: 0,
    };
}
