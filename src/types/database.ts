// Database type definitions matching Supabase schema

// Enums
export type GenderEnum = 'Male' | 'Female' | 'Unknown' | 'Non-binary';
export type AgeGroupEnum = 'Adult 18-59' | 'Senior 60+' | 'Child 0-17';
export type HousingStatusEnum = 'Unhoused' | 'Housed' | 'Temp. shelter' | 'RV or vehicle';
export type LaundryStatusEnum = 'waiting' | 'washer' | 'dryer' | 'done' | 'picked_up' | 'pending' | 'transported' | 'returned' | 'offsite_picked_up';
export type BicycleRepairStatusEnum = 'pending' | 'in_progress' | 'done';
export type DonationTypeEnum = 'Protein' | 'Carbs' | 'Vegetables' | 'Fruit' | 'Veggie Protein' | 'Deli Foods' | 'Pastries' | 'School Lunch';
export type LaPlazaCategoryEnum = 'Bakery' | 'Beverages' | 'Dairy' | 'Meat' | 'Mix' | 'Nonfood' | 'Prepared/Perishable' | 'Produce';
export type MealTypeEnum = 'guest' | 'extra' | 'rv' | 'shelter' | 'united_effort' | 'day_worker' | 'lunch_bag';
export type ShowerStatusEnum = 'booked' | 'waitlisted' | 'done' | 'cancelled' | 'no_show';

// Core types
export interface Guest {
    id: string;
    external_id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    preferred_name?: string;
    housing_status: HousingStatusEnum;
    age_group: AgeGroupEnum;
    gender: GenderEnum;
    location: string;
    notes?: string;
    bicycle_description?: string;
    ban_reason?: string;
    banned_at?: string;
    banned_until?: string;
    banned_from_meals?: boolean;
    banned_from_shower?: boolean;
    banned_from_laundry?: boolean;
    banned_from_bicycle?: boolean;
    created_at: string;
    updated_at: string;
}

export interface MealAttendance {
    id: string;
    guest_id?: string;
    picked_up_by_guest_id?: string;
    meal_type: MealTypeEnum;
    quantity: number;
    served_on: string;
    recorded_at: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface ShowerReservation {
    id: string;
    guest_id: string;
    scheduled_for: string;
    scheduled_time?: string;
    status: ShowerStatusEnum;
    waitlist_position?: number;
    note?: string;
    created_at: string;
    updated_at: string;
}

export interface LaundryBooking {
    id: string;
    guest_id: string;
    scheduled_for: string;
    slot_label?: string;
    laundry_type: 'onsite' | 'offsite';
    bag_number?: string;
    status: LaundryStatusEnum;
    note?: string;
    created_at: string;
    updated_at: string;
}

export interface BicycleRepair {
    id: string;
    guest_id?: string;
    requested_at: string;
    repair_type?: string;
    repair_types: string[];
    completed_repairs: string[];
    notes?: string;
    status: BicycleRepairStatusEnum;
    priority: number;
    completed_at?: string;
    updated_at: string;
}

export interface HolidayVisit {
    id: string;
    guest_id: string;
    served_at: string;
    created_at: string;
}

export interface HaircutVisit {
    id: string;
    guest_id: string;
    served_at: string;
    created_at: string;
}

export interface ItemDistributed {
    id: string;
    guest_id: string;
    item_key: string;
    distributed_at: string;
    created_at: string;
}

export interface Donation {
    id: string;
    donation_type: DonationTypeEnum;
    item_name: string;
    trays: number;
    weight_lbs: number;
    density?: 'light' | 'medium' | 'high';
    servings?: number;
    temperature?: string;
    donor: string;
    donated_at: string;
    date_key?: string;
    created_at: string;
    updated_at: string;
}

export interface LaPlazaDonation {
    id: string;
    category: LaPlazaCategoryEnum;
    weight_lbs: number;
    notes?: string;
    received_at: string;
    date_key?: string;
    created_at: string;
    updated_at: string;
}

export interface ServiceWaiver {
    id: string;
    guest_id: string;
    service_type: 'shower' | 'laundry';
    signed_at: string;
    dismissed_at?: string;
    dismissed_by_user_id?: string;
    dismissed_reason?: string;
    created_at: string;
    updated_at: string;
}

export type ReminderServiceType = 'shower' | 'laundry' | 'bicycle' | 'all';

export interface GuestReminder {
    id: string;
    guest_id: string;
    message: string;
    applies_to: ReminderServiceType[];
    created_by?: string;
    dismissed_at?: string;
    dismissed_by?: string;
    created_at: string;
    updated_at: string;
}

export interface GuestWarning {
    id: string;
    guest_id: string;
    warning_text: string;
    severity: 'low' | 'medium' | 'high';
    created_by?: string;
    created_at: string;
    expires_at?: string;
}

export interface GuestProxy {
    id: string;
    guest_id: string;
    proxy_guest_id: string;
    relationship?: string;
    created_at: string;
}

export interface BlockedSlot {
    id: string;
    slot_type: 'shower' | 'laundry';
    slot_date: string;
    slot_time: string;
    reason?: string;
    created_at: string;
}

export interface AppSettings {
    id: string;
    site_name: string;
    max_onsite_laundry_slots: number;
    enable_offsite_laundry: boolean;
    ui_density: string;
    show_charts: boolean;
    default_report_days: number;
    donation_autofill: boolean;
    default_donation_type: DonationTypeEnum;
    targets: {
        monthlyMeals: number;
        yearlyMeals: number;
        monthlyShowers: number;
        yearlyShowers: number;
        monthlyLaundry: number;
        yearlyLaundry: number;
        monthlyBicycles: number;
        yearlyBicycles: number;
        monthlyHaircuts: number;
        yearlyHaircuts: number;
        monthlyHolidays: number;
        yearlyHolidays: number;
    };
    created_at: string;
    updated_at: string;
}

// Extended types with relations
export interface GuestWithRelations extends Guest {
    warnings?: GuestWarning[];
    proxies?: GuestProxy[];
    linked_guests?: Guest[];
    reminders?: GuestReminder[];
}
