import {
  toTitleCase,
  normalizePreferredName,
  normalizeBicycleDescription,
  normalizeHousingStatus,
  combineDateAndTimeISO,
  fallbackIsoFromDateOnly,
  extractLaundrySlotStart,
  computeIsGuestBanned,
} from "./normalizers";
import { pacificDateStringFrom } from './date';

// Type for shower status in database
type ShowerDbStatus = 'booked' | 'waitlisted' | 'done' | 'cancelled' | 'no_show' | null | undefined;
// Type for shower status in app (maps 'booked' to 'awaiting')
type ShowerAppStatus = 'awaiting' | 'waitlisted' | 'done' | 'cancelled' | 'no_show';

// Database row types (what comes from Supabase)
interface GuestRow {
  id: string;
  external_id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  preferred_name?: string | null;
  housing_status?: string | null;
  age_group?: string | null;
  gender?: string | null;
  location?: string | null;
  notes?: string | null;
  bicycle_description?: string | null;
  ban_reason?: string | null;
  banned_at?: string | null;
  banned_until?: string | null;
  banned_from_meals?: boolean | null;
  banned_from_shower?: boolean | null;
  banned_from_laundry?: boolean | null;
  banned_from_bicycle?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

interface MealRow {
  id: string;
  guest_id: string;
  picked_up_by_guest_id?: string | null;
  meal_type: string;
  quantity?: number;
  served_on?: string | null;
  recorded_at?: string | null;
  created_at?: string;
}

interface ShowerRow {
  id: string;
  guest_id: string;
  scheduled_for?: string | null;
  scheduled_time?: string | null;
  status?: ShowerDbStatus;
  created_at?: string;
  updated_at?: string;
}

interface LaundryRow {
  id: string;
  guest_id: string;
  scheduled_for?: string | null;
  slot_label?: string | null;
  laundry_type: 'onsite' | 'offsite';
  bag_number?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}

interface BicycleRow {
  id: string;
  guest_id?: string | null;
  requested_at: string;
  repair_type?: string | null;
  repair_types?: string[] | null;
  completed_repairs?: string[] | null;
  notes?: string | null;
  status: string;
  priority?: number | null;
  completed_at?: string | null;
  updated_at?: string;
}

interface HolidayRow {
  id: string;
  guest_id: string;
  served_at: string;
}

interface HaircutRow {
  id: string;
  guest_id: string;
  served_at: string;
}

interface ItemRow {
  id: string;
  guest_id: string;
  item_key: string;
  distributed_at: string;
}

interface DonationRow {
  id: string;
  donation_type: string;
  item_name?: string;
  trays?: number | string | null;
  weight_lbs?: number | string | null;
  servings?: number | string | null;
  temperature?: string | null;
  donor?: string;
  donated_at: string;
  date_key?: string;
  created_at?: string;
}

interface LaPlazaDonationRow {
  id: string;
  category: string;
  weight_lbs?: number | string | null;
  notes?: string | null;
  received_at: string;
  date_key?: string;
  created_at?: string;
}

interface GuestProxyRow {
  id: string;
  guest_id: string;
  proxy_id: string;
  created_at?: string;
}

interface GuestWarningRow {
  id: string;
  guest_id: string;
  message: string;
  severity?: number | string | null;
  issued_by?: string | null;
  active?: boolean | string | null;
  created_at?: string;
  updated_at?: string;
}

interface BlockedSlotRow {
  id: string;
  service_type: string;
  slot_time: string;
  date: string;
  created_at?: string;
  created_by?: string | null;
}

interface GuestReminderRow {
  id: string;
  guest_id: string;
  message: string;
  applies_to?: string[] | null;
  created_by?: string | null;
  dismissed_at?: string | null;
  dismissed_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Validation result type
interface ValidationResult {
  isValid: boolean;
  issues: string[];
}

export const mapShowerStatusToApp = (status: ShowerDbStatus): ShowerAppStatus => {
  if (!status) return "awaiting";
  return status === "booked" ? "awaiting" : status;
};

export const mapShowerStatusToDb = (status: ShowerAppStatus | null): ShowerDbStatus => {
  if (!status) return "booked";
  return status === "awaiting" ? "booked" : status;
};

/**
 * DATA INTEGRITY: Validate that a guest row has all required fields
 * Logs a warning if critical data is missing to help detect corruption
 * @param row - Database row from guests table
 * @returns Validation result with isValid flag and issues array
 */
export const validateGuestRow = (row: GuestRow | null): ValidationResult => {
  const issues: string[] = [];

  if (!row) {
    return { isValid: false, issues: ['Row is null or undefined'] };
  }

  if (!row.id) {
    issues.push('Missing id (primary key)');
  }

  if (!row.external_id) {
    issues.push('Missing external_id (guest ID)');
  }

  // Critical: first_name is required
  if (!row.first_name || !row.first_name.trim()) {
    issues.push(`Missing or empty first_name (id: ${row.id}, external_id: ${row.external_id})`);
  }

  // Critical: full_name is required
  if (!row.full_name || !row.full_name.trim()) {
    issues.push(`Missing or empty full_name (id: ${row.id}, external_id: ${row.external_id})`);
  }

  // last_name can technically be empty but should be logged
  if (!row.last_name || !row.last_name.trim()) {
    issues.push(`Missing or empty last_name (id: ${row.id}, external_id: ${row.external_id})`);
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
};

// Extend Window interface for data integrity tracking
declare global {
  interface Window {
    __guestDataIntegrityIssues?: Array<{
      timestamp: string;
      guestId: string | undefined;
      externalId: string | undefined;
      issues: string[];
    }>;
  }
}

/**
 * Maps a database guest row to the application's guest object format.
 * CRITICAL: This function now validates required fields and logs warnings
 * for potential data corruption issues (guests becoming "Unknown Guest").
 * 
 * @param row - Database row from guests table
 * @returns Mapped guest object
 */
export const mapGuestRow = (row: GuestRow) => {
  // DATA INTEGRITY CHECK: Validate critical fields
  const validation = validateGuestRow(row);
  if (!validation.isValid) {
    console.error(
      '[DATA INTEGRITY WARNING] Guest row has missing/empty critical fields:',
      validation.issues,
      '\nRow data:', JSON.stringify(row, null, 2)
    );
    // Track this for potential alerting/monitoring
    if (typeof window !== 'undefined' && window.__guestDataIntegrityIssues) {
      window.__guestDataIntegrityIssues.push({
        timestamp: new Date().toISOString(),
        guestId: row?.id,
        externalId: row?.external_id,
        issues: validation.issues,
      });
    }
  }

  const firstNameFromRow = toTitleCase(row.first_name || "");
  const lastNameFromRow = toTitleCase(row.last_name || "");
  const fullName = toTitleCase(
    row.full_name || `${row.first_name || ""} ${row.last_name || ""}`,
  );

  let firstName = firstNameFromRow;
  let lastName = lastNameFromRow;
  if (!firstName || !lastName) {
    const fallbackParts = fullName.trim().split(/\s+/).filter(Boolean);
    if (!firstName && fallbackParts.length > 0) {
      firstName = fallbackParts[0];
    }
    if (!lastName && fallbackParts.length > 1) {
      lastName = fallbackParts.slice(1).join(" ");
    }
  }

  // Additional safety check: if all name fields are empty, this is a critical issue
  if (!firstName && !lastName && !fullName) {
    console.error(
      '[CRITICAL DATA INTEGRITY] Guest has completely empty name fields! This guest will appear as "Unknown Guest".',
      'id:', row?.id, 'external_id:', row?.external_id,
      '\nFull row:', JSON.stringify(row, null, 2)
    );
  }

  return {
    id: row.id,
    guestId: row.external_id,
    firstName,
    lastName,
    name: fullName,
    preferredName: normalizePreferredName(row.preferred_name),
    housingStatus: normalizeHousingStatus(row.housing_status),
    age: row.age_group,
    gender: row.gender,
    location: row.location || "Mountain View",
    notes: row.notes || "",
    bicycleDescription: normalizeBicycleDescription(row.bicycle_description),
    bannedAt: row.banned_at,
    bannedUntil: row.banned_until,
    banReason: row.ban_reason || "",
    isBanned: computeIsGuestBanned(row.banned_until),
    // Program-specific bans - if all are false/null but isBanned is true, it's a blanket ban
    bannedFromBicycle: row.banned_from_bicycle || false,
    bannedFromMeals: row.banned_from_meals || false,
    bannedFromShower: row.banned_from_shower || false,
    bannedFromLaundry: row.banned_from_laundry || false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    docId: row.id,
  };
};

export const mapMealRow = (row: MealRow) => {
  const recordedAt = row.recorded_at || row.created_at || null;
  // Use served_on as the primary date for filtering (this is the date the meal was actually served)
  // Fall back to recordedAt if served_on is not available
  const servedOnDate = row.served_on
    ? new Date(`${row.served_on}T12:00:00Z`).toISOString()
    : null;

  const picked = row.picked_up_by_guest_id || null;
  const effectiveTimestamp = servedOnDate || recordedAt || new Date().toISOString();
  return {
    id: row.id,
    guestId: row.guest_id,
    // Support both property names for historical compatibility and UI usage
    pickedUpByGuestId: picked,
    pickedUpByProxyId: picked,
    count: row.quantity || 1,
    date: effectiveTimestamp,
    dateKey: pacificDateStringFrom(effectiveTimestamp),
    recordedAt,
    servedOn: row.served_on,
    createdAt: row.created_at,
    type: row.meal_type,
  };
};

export const mapShowerRow = (row: ShowerRow) => {
  const scheduledTimestamp = combineDateAndTimeISO(
    row.scheduled_for,
    row.scheduled_time,
  );
  const fallbackTimestamp =
    row.updated_at ||
    row.created_at ||
    fallbackIsoFromDateOnly(row.scheduled_for) ||
    new Date().toISOString();
  const effectiveTimestamp = scheduledTimestamp || fallbackTimestamp;
  return {
    id: row.id,
    guestId: row.guest_id,
    time: row.scheduled_time || null,
    scheduledFor: row.scheduled_for || row.created_at || null,
    date: effectiveTimestamp,
    dateKey: pacificDateStringFrom(effectiveTimestamp),
    status: mapShowerStatusToApp(row.status),
    createdAt: row.created_at,
    lastUpdated: row.updated_at,
  };
};

export const mapLaundryRow = (row: LaundryRow) => {
  const slotStart = extractLaundrySlotStart(row.slot_label);
  const scheduledTimestamp = combineDateAndTimeISO(
    row.scheduled_for,
    slotStart,
  );
  const fallbackTimestamp =
    row.updated_at ||
    row.created_at ||
    fallbackIsoFromDateOnly(row.scheduled_for) ||
    new Date().toISOString();
  const effectiveTimestamp = scheduledTimestamp || fallbackTimestamp;
  return {
    id: row.id,
    guestId: row.guest_id,
    time: row.slot_label || null,
    laundryType: row.laundry_type,
    bagNumber: row.bag_number || "",
    scheduledFor: row.scheduled_for || row.created_at || null,
    date: effectiveTimestamp,
    dateKey: pacificDateStringFrom(effectiveTimestamp),
    status: row.status,
    createdAt: row.created_at,
    lastUpdated: row.updated_at,
  };
};

export const mapBicycleRow = (row: BicycleRow) => {
  const effectiveTimestamp = row.requested_at || row.updated_at || new Date().toISOString();
  return {
    id: row.id,
    guestId: row.guest_id || undefined,
    date: effectiveTimestamp,
    dateKey: pacificDateStringFrom(effectiveTimestamp),
    type: "bicycle",
    repairType: row.repair_type || undefined,
    repairTypes: row.repair_types || (row.repair_type ? [row.repair_type] : []),
    completedRepairs: row.completed_repairs || [],
    notes: row.notes || undefined,
    status: row.status,
    priority: row.priority || 0,
    doneAt: row.completed_at || undefined,
    lastUpdated: row.updated_at,
  };
};

export const mapHolidayRow = (row: HolidayRow) => {
  const effectiveTimestamp = row.served_at || new Date().toISOString();
  return {
    id: row.id,
    guestId: row.guest_id,
    date: effectiveTimestamp,
    dateKey: pacificDateStringFrom(effectiveTimestamp),
    type: "holiday",
  };
};

export const mapHaircutRow = (row: HaircutRow) => {
  const effectiveTimestamp = row.served_at || new Date().toISOString();
  return {
    id: row.id,
    guestId: row.guest_id,
    date: effectiveTimestamp,
    dateKey: pacificDateStringFrom(effectiveTimestamp),
    type: "haircut",
  };
};

export const mapItemRow = (row: ItemRow) => ({
  id: row.id,
  guestId: row.guest_id,
  item: row.item_key,
  date: row.distributed_at,
});

export const mapDonationRow = (row: DonationRow) => {
  return {
    id: row.id,
    type: toTitleCase(row.donation_type),
    itemName: row.item_name || "",
    trays: Number(row.trays) || 0,
    weightLbs: Number(row.weight_lbs) || 0,
    servings: Number(row.servings) || 0,
    temperature: row.temperature || undefined,
    donor: row.donor || "",
    date: row.donated_at,
    dateKey: row.date_key,
    createdAt: row.created_at,
  };
};

export const mapLaPlazaDonationRow = (row: LaPlazaDonationRow) => {
  return {
    id: row.id,
    category: row.category,
    weightLbs: Number(row.weight_lbs) || 0,
    notes: row.notes || "",
    receivedAt: row.received_at,
    dateKey: row.date_key,
    createdAt: row.created_at,
  };
};

export const mapGuestProxyRow = (row: GuestProxyRow) => ({
  id: row.id,
  guestId: row.guest_id,
  proxyId: row.proxy_id,
  createdAt: row.created_at,
});

export const mapGuestWarningRow = (row: GuestWarningRow) => ({
  id: row.id,
  guestId: row.guest_id,
  message: row.message,
  severity: Number(row.severity) || 1,
  issuedBy: row.issued_by || null,
  active: row.active === true || row.active === 't' || row.active === 'TRUE' || row.active === 'true',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapBlockedSlotRow = (row: BlockedSlotRow) => ({
  id: row.id,
  serviceType: row.service_type,
  slotTime: row.slot_time,
  date: row.date,
  createdAt: row.created_at,
  createdBy: row.created_by,
});

export const mapGuestReminderRow = (row: GuestReminderRow) => ({
  id: row.id,
  guestId: row.guest_id,
  message: row.message,
  appliesTo: row.applies_to || ['all'],
  createdBy: row.created_by || null,
  dismissedAt: row.dismissed_at || null,
  dismissedBy: row.dismissed_by || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

interface DailyNoteRow {
  id: string;
  note_date: string;
  service_type: 'meals' | 'showers' | 'laundry' | 'general';
  note_text: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const mapDailyNoteRow = (row: DailyNoteRow) => ({
  id: row.id,
  noteDate: row.note_date,
  serviceType: row.service_type,
  noteText: row.note_text,
  createdBy: row.created_by || null,
  updatedBy: row.updated_by || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
