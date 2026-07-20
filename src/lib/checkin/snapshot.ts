import type {
    CheckInDailyNote,
    CheckInGuestContext,
    CheckInGuestSummary,
    CheckInSnapshot,
    CheckInTodayStatus,
} from '@/types/checkin';
import type { DailyNoteServiceType } from '@/types/database';

type UnknownRecord = Record<string, unknown>;

const stringValue = (value: unknown) => typeof value === 'string' ? value : '';
const nullableString = (value: unknown) => typeof value === 'string' ? value : null;
const numberValue = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const booleanValue = (value: unknown) => value === true;

function isActiveBan(until: string | null): boolean {
    if (!until) return false;
    const expiry = Date.parse(until);
    return Number.isFinite(expiry) && expiry > Date.now();
}

function normalizeGuest(row: UnknownRecord): CheckInGuestSummary {
    const firstName = stringValue(row.first_name);
    const lastName = stringValue(row.last_name);
    const bannedUntil = nullableString(row.banned_until);

    return {
        id: stringValue(row.id),
        guestId: stringValue(row.external_id),
        firstName,
        lastName,
        name: stringValue(row.full_name) || `${firstName} ${lastName}`.trim(),
        preferredName: stringValue(row.preferred_name),
        housingStatus: stringValue(row.housing_status),
        age: stringValue(row.age_group),
        gender: stringValue(row.gender),
        location: stringValue(row.location),
        bannedAt: nullableString(row.banned_at),
        bannedUntil,
        banReason: stringValue(row.ban_reason),
        isBanned: isActiveBan(bannedUntil),
        bannedFromMeals: booleanValue(row.banned_from_meals),
        bannedFromShower: booleanValue(row.banned_from_shower),
        bannedFromLaundry: booleanValue(row.banned_from_laundry),
        bannedFromBicycle: booleanValue(row.banned_from_bicycle),
        createdAt: stringValue(row.created_at),
        updatedAt: stringValue(row.updated_at),
        warningCount: numberValue(row.warning_count),
        linkedGuestCount: numberValue(row.linked_guest_count),
        reminderCount: numberValue(row.reminder_count),
        lastVisitDate: nullableString(row.last_visit_date),
        recentMeal: booleanValue(row.recent_meal),
    };
}

function normalizeService(value: unknown) {
    if (!value || typeof value !== 'object') return null;
    const row = value as UnknownRecord;
    const id = stringValue(row.id);
    if (!id) return null;
    return {
        id,
        time: nullableString(row.time),
        status: stringValue(row.status),
    };
}

function normalizeToday(value: unknown): CheckInTodayStatus {
    const row = value && typeof value === 'object' ? value as UnknownRecord : {};
    const mealCount = numberValue(row.meal_count);
    const extraMealCount = numberValue(row.extra_meal_count);
    return {
        mealCount,
        extraMealCount,
        totalMeals: mealCount + extraMealCount,
        shower: normalizeService(row.shower),
        laundry: normalizeService(row.laundry),
        bicycle: normalizeService(row.bicycle),
        haircut: normalizeService(row.haircut),
        holiday: normalizeService(row.holiday),
    };
}

function normalizeDailyNote(value: unknown): CheckInDailyNote | null {
    if (!value || typeof value !== 'object') return null;
    const row = value as UnknownRecord;
    const id = stringValue(row.id);
    if (!id) return null;
    return {
        id,
        noteDate: stringValue(row.note_date),
        noteEndDate: nullableString(row.note_end_date),
        serviceType: (['meals', 'showers', 'laundry', 'general'].includes(stringValue(row.service_type))
            ? stringValue(row.service_type)
            : 'general') as DailyNoteServiceType,
        noteText: stringValue(row.note_text),
        createdBy: nullableString(row.created_by),
        updatedBy: nullableString(row.updated_by),
        createdAt: stringValue(row.created_at),
        updatedAt: stringValue(row.updated_at),
    };
}

export function normalizeCheckInSnapshot(value: unknown): CheckInSnapshot {
    const row = value && typeof value === 'object' ? value as UnknownRecord : {};
    const generatedAt = stringValue(row.generated_at) || new Date(0).toISOString();
    const guests = Array.isArray(row.guests)
        ? row.guests.filter((guest): guest is UnknownRecord => !!guest && typeof guest === 'object').map(normalizeGuest)
        : [];
    const rawToday = row.today_by_guest && typeof row.today_by_guest === 'object'
        ? row.today_by_guest as UnknownRecord
        : {};
    const todayByGuest = Object.fromEntries(
        Object.entries(rawToday).map(([guestId, status]) => [guestId, normalizeToday(status)])
    );
    const dailyNotes = Array.isArray(row.daily_notes)
        ? row.daily_notes.map(normalizeDailyNote).filter((note): note is CheckInDailyNote => note !== null)
        : [];

    return {
        generatedAt,
        directoryVersion: stringValue(row.directory_version) || `${generatedAt}:${guests.length}`,
        serviceDate: stringValue(row.service_date),
        guests,
        todayByGuest,
        dailyNotes,
    };
}

export function normalizeCheckInGuestContext(value: unknown): CheckInGuestContext {
    const row = value && typeof value === 'object' ? value as UnknownRecord : {};
    const rawGuest = row.guest && typeof row.guest === 'object' ? row.guest as UnknownRecord : {};
    const guest = normalizeGuest(rawGuest);
    const normalizeWarning = (item: unknown) => {
        const warning = item && typeof item === 'object' ? item as UnknownRecord : {};
        return {
            id: stringValue(warning.id),
            guestId: stringValue(warning.guest_id),
            message: stringValue(warning.message),
            severity: numberValue(warning.severity),
            issuedBy: nullableString(warning.issued_by),
            active: warning.active !== false,
            createdAt: stringValue(warning.created_at),
            updatedAt: stringValue(warning.updated_at),
        };
    };
    const normalizeReminder = (item: unknown) => {
        const reminder = item && typeof item === 'object' ? item as UnknownRecord : {};
        return {
            id: stringValue(reminder.id),
            guestId: stringValue(reminder.guest_id),
            message: stringValue(reminder.message),
            appliesTo: Array.isArray(reminder.applies_to) ? reminder.applies_to.map(stringValue) : [],
            createdBy: nullableString(reminder.created_by),
            dismissedAt: nullableString(reminder.dismissed_at),
            dismissedBy: nullableString(reminder.dismissed_by),
            createdAt: stringValue(reminder.created_at),
            updatedAt: stringValue(reminder.updated_at),
        };
    };
    return {
        guest: {
            ...guest,
            notes: stringValue(rawGuest.notes),
            bicycleDescription: stringValue(rawGuest.bicycle_description),
        },
        warnings: Array.isArray(row.warnings) ? row.warnings.map(normalizeWarning) : [],
        reminders: Array.isArray(row.reminders) ? row.reminders.map(normalizeReminder) : [],
        linkedGuests: Array.isArray(row.linked_guests)
            ? row.linked_guests.filter((item): item is UnknownRecord => !!item && typeof item === 'object').map(normalizeGuest)
            : [],
    };
}
