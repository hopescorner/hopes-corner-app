export interface CheckInGuestSummary {
    id: string;
    guestId: string;
    firstName: string;
    lastName: string;
    name: string;
    preferredName: string;
    housingStatus: string;
    age: string;
    gender: string;
    location: string;
    bannedAt: string | null;
    bannedUntil: string | null;
    banReason: string;
    isBanned: boolean;
    bannedFromMeals: boolean;
    bannedFromShower: boolean;
    bannedFromLaundry: boolean;
    bannedFromBicycle: boolean;
    createdAt: string;
    updatedAt: string;
    warningCount: number;
    linkedGuestCount: number;
    reminderCount: number;
    lastVisitDate: string | null;
    recentMeal: boolean;
}

export interface CheckInServiceRecord {
    id: string;
    time?: string | null;
    status?: string;
}

export interface CheckInTodayStatus {
    mealCount: number;
    extraMealCount: number;
    totalMeals: number;
    shower: CheckInServiceRecord | null;
    laundry: CheckInServiceRecord | null;
    bicycle: CheckInServiceRecord | null;
    haircut: CheckInServiceRecord | null;
    holiday: CheckInServiceRecord | null;
}

export interface CheckInDailyNote {
    id: string;
    noteDate: string;
    noteEndDate?: string | null;
    serviceType: DailyNoteServiceType;
    noteText: string;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface CheckInSnapshot {
    generatedAt: string;
    directoryVersion: string;
    serviceDate: string;
    guests: CheckInGuestSummary[];
    todayByGuest: Record<string, CheckInTodayStatus>;
    dailyNotes: CheckInDailyNote[];
}

export interface CheckInGuestContext {
    guest: CheckInGuestSummary & {
        notes: string;
        bicycleDescription: string;
    };
    warnings: unknown[];
    reminders: unknown[];
    linkedGuests: CheckInGuestSummary[];
}

export type CheckInCommand =
    | { type: 'meal.add'; guestId: string; quantity: number; extra?: boolean; idempotencyKey: string }
    | { type: 'meal.undo'; guestId: string; recordId: string; idempotencyKey: string };

export interface CheckInCommandResult {
    guestId: string;
    status: CheckInTodayStatus;
    recordId?: string;
}
import type { DailyNoteServiceType } from '@/types/database';
