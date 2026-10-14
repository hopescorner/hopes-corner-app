import type { DailyNoteServiceType } from '@/types/database';

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
    shelterGuest: boolean;
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

export interface CheckInGuestWarning {
    id: string;
    guestId: string;
    message: string;
    severity: number;
    issuedBy: string | null;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CheckInGuestReminder {
    id: string;
    guestId: string;
    message: string;
    appliesTo: string[];
    createdBy: string | null;
    dismissedAt: string | null;
    dismissedBy: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CheckInGuestContext {
    guest: CheckInGuestSummary & {
        notes: string;
        bicycleDescription: string;
    };
    warnings: CheckInGuestWarning[];
    reminders: CheckInGuestReminder[];
    linkedGuests: CheckInGuestSummary[];
}

export interface CheckInGuestHistoryEvent {
    id: string;
    type: string;
    occurredAt: string;
    title: string;
    detail: string | null;
    status: string | null;
}

export interface CheckInGuestHistory {
    events: CheckInGuestHistoryEvent[];
}

export type CheckInCommand =
    | { type: 'meal.add'; guestId: string; quantity: number; extra?: boolean; idempotencyKey: string; pickedUpByGuestId?: string }
    | { type: 'meal.undo'; guestId: string; recordId: string; idempotencyKey: string };

export interface CheckInCommandResult {
    guestId: string;
    status: CheckInTodayStatus;
    recordId?: string;
}
