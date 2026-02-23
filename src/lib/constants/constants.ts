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
 * cancelled / no_show / waitlisted do NOT occupy a slot.
 */
export const SHOWER_SLOT_OCCUPYING_STATUSES = new Set(['booked', 'done']);

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

/** Maximum number of base (non-extra) meals a guest can receive per service day. */
export const MAX_BASE_MEALS_PER_DAY = 2;

/** Maximum number of extra meals a guest can receive per service day. */
export const MAX_EXTRA_MEALS_PER_DAY = 2;

/** Maximum total meals (base + extra) a guest can receive per service day. */
export const MAX_TOTAL_MEALS_PER_DAY = MAX_BASE_MEALS_PER_DAY + MAX_EXTRA_MEALS_PER_DAY;
