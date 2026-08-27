export const HOUSING_STATUSES = [
  "Unhoused",
  "Housed",
  "Temp. shelter",
  "RV or vehicle",
];

export const AGE_GROUPS = ["Adult 18-59", "Senior 60+", "Child 0-17"];

export const GENDERS = ["Male", "Female", "Unknown", "Non-binary"];

export const LAUNDRY_STATUS = {
  WAITING: "waiting",
  WASHER: "washer",
  DRYER: "dryer",
  DONE: "done",
  PICKED_UP: "picked_up",
  PENDING: "pending",
  TRANSPORTED: "transported",
  RETURNED: "returned",
  OFFSITE_PICKED_UP: "offsite_picked_up",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
  WAITLISTED: "waitlisted",
};

export const DONATION_TYPES = [
  "Protein",
  "Carbs",
  "Vegetables",
  "Fruit",
  "Veggie Protein",
  "Deli Foods",
  "Pastries",
  "School Lunch",
];

export const BICYCLE_REPAIR_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  DONE: "done",
};

/** Maximum number of guests that can be booked into a single shower time slot. */
export const MAX_GUESTS_PER_SHOWER_SLOT = 2;

/**
 * Shower statuses that occupy a slot and count towards capacity.
 * In the app layer, DB 'booked' is normalized to 'awaiting', so both are treated as occupying.
 * cancelled / no_show / waitlisted do NOT occupy a slot.
 */
export const SHOWER_SLOT_OCCUPYING_STATUSES = new Set(['booked', 'awaiting', 'done']);

/**
 * Maximum number of guests per onsite laundry slot (each slot = one machine window).
 * Offsite laundry is unconstrained.
 */
export const MAX_GUESTS_PER_LAUNDRY_SLOT = 1;

/**
 * Laundry statuses that occupy a slot and count towards capacity.
 * Once a guest has used the slot (even if done/picked_up), the slot is consumed for the day.
 * Only 'waitlisted' does not count.
 */
export const LAUNDRY_SLOT_OCCUPYING_STATUSES = new Set([
  'waiting', 'washer', 'dryer', 'done', 'picked_up',
]);

/**
 * Maximum number of laundry loads (onsite + offsite combined) a guest can be
 * assigned per rolling week. The week resets on Monday (Pacific time).
 */
export const MAX_LAUNDRY_LOADS_PER_WEEK = 2;

/**
 * Laundry statuses that do NOT count toward a guest's weekly laundry limit.
 * A record with one of these statuses is considered voided / unoccupied and
 * the assosiated load is returned to the guest's weekly allowance.
 * Everything else (waiting, washer, dryer, done, picked_up, pending,
 * transported, returned, offsite_picked_up) counts as a consumed load.
 */
export const LAUNDRY_WEEKLY_VOID_STATUSES = new Set([
  'cancelled',
  'no_show',
  'waitlisted',
]);

export const LAUNDRY_WEEKLY_COUNT_STATUSES = Object.values(LAUNDRY_STATUS).filter(
  (status) => !LAUNDRY_WEEKLY_VOID_STATUSES.has(status)
);

/** Maximum number of base (non-extra) meals a guest can receive per service day. */
export const MAX_BASE_MEALS_PER_DAY = 2;

/** Maximum number of extra meals a guest can receive per service day. */
export const MAX_EXTRA_MEALS_PER_DAY = 2;

/** Maximum total meals (base + extra) a guest can receive per service day. */
export const MAX_TOTAL_MEALS_PER_DAY = MAX_BASE_MEALS_PER_DAY + MAX_EXTRA_MEALS_PER_DAY;
