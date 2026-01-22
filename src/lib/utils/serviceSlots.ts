
export const generateShowerSlots = (date: Date = new Date()) => {
    const dayOfWeek = date.getDay();
    const slots = [];

    // Monday and Wednesday (day 1 or 3) and all other days EXCEPT Saturday
    if (dayOfWeek !== 6) {
        // 07:30 AM to 12:30 PM (exclusive), every 30 minutes
        const start = 7.5 * 60; // 07:30
        const end = 12.5 * 60; // 12:30
        for (let t = start; t < end; t += 30) {
            const hours = Math.floor(t / 60);
            const minutes = t % 60;
            const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            slots.push(time);
        }
    } else {
        // Saturday (day 6): 08:30 AM to 01:30 PM, every 30 minutes
        const start = 8.5 * 60; // 08:30
        const end = 13.5 * 60; // 13:30
        for (let t = start; t < end; t += 30) {
            const hours = Math.floor(t / 60);
            const minutes = t % 60;
            const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            slots.push(time);
        }
    }

    return slots;
};

export const generateLaundrySlots = (date: Date = new Date()) => {
    const dayOfWeek = date.getDay();

    // Saturday (day 6)
    if (dayOfWeek === 6) {
        return [
            "08:30 - 10:00",
            "09:00 - 10:30",
            "09:30 - 11:00",
            "10:00 - 11:30",
            "10:30 - 12:00",
        ];
    }

    // Monday, Wednesday, and all other days
    return [
        "07:30 - 08:30",
        "08:00 - 09:00",
        "08:30 - 09:45",
        "09:00 - 10:15",
        "09:30 - 11:45",
    ];
};

import { formatPacificTimeString } from '@/lib/utils/date';

export const formatSlotLabel = (time: string) => {
    if (!time) return '';
    if (time.includes(' - ')) {
        const [start, end] = time.split(' - ');
        return `${formatSingleTime(start)} - ${formatSingleTime(end)}`;
    }
    return formatSingleTime(time);
};

const formatSingleTime = (timeStr: string) => formatPacificTimeString(timeStr);
