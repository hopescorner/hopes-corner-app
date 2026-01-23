import { cache } from 'react';
import { createClient } from './client';
import { fetchAllPaginated } from '../utils/supabasePagination';
import {
    mapGuestRow,
    mapGuestWarningRow,
    mapGuestProxyRow,
    mapMealRow,
    mapHolidayRow,
    mapHaircutRow,
    mapShowerRow,
    mapLaundryRow,
    mapBicycleRow,
} from '../utils/mappers';

/**
 * Cached Supabase query functions to prevent duplicate fetches during parallel loads.
 * Uses React's cache() to memoize queries within a single render cycle.
 * 
 * Benefits:
 * - Deduplicates identical queries when multiple components load data simultaneously
 * - Reduces server load and CPU usage
 * - Faster initial page loads
 */

// ============================================================================
// GUESTS QUERIES
// ============================================================================

export const getCachedGuests = cache(async () => {
    const supabase = createClient();
    return await fetchAllPaginated(supabase, {
        table: 'guests',
        select: '*',
        orderBy: 'updated_at',
        ascending: false,
        pageSize: 1000,
        mapper: mapGuestRow,
    });
});

export const getCachedGuestWarnings = cache(async () => {
    const supabase = createClient();
    return await fetchAllPaginated(supabase, {
        table: 'guest_warnings',
        select: '*',
        orderBy: 'created_at',
        ascending: false,
        pageSize: 1000,
        mapper: mapGuestWarningRow,
    });
});

export const getCachedGuestProxies = cache(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('guest_proxies')
        .select('*');
    
    if (error) throw error;
    return (data || []).map(mapGuestProxyRow);
});

// ============================================================================
// MEALS QUERIES
// ============================================================================

export const getCachedMealRecords = cache(async () => {
    const supabase = createClient();
    return await fetchAllPaginated(supabase, {
        table: 'meal_attendance',
        select: 'id,guest_id,quantity,served_on,meal_type,recorded_at,created_at,picked_up_by_guest_id',
        orderBy: 'recorded_at',
        ascending: false,
        pageSize: 1000,
        mapper: mapMealRow,
    });
});

export const getCachedHolidayRecords = cache(async () => {
    const supabase = createClient();
    return await fetchAllPaginated(supabase, {
        table: 'holiday_visits',
        select: 'id,guest_id,served_at,created_at',
        orderBy: 'created_at',
        ascending: false,
        pageSize: 1000,
        mapper: mapHolidayRow,
    });
});

export const getCachedHaircutRecords = cache(async () => {
    const supabase = createClient();
    return await fetchAllPaginated(supabase, {
        table: 'haircut_visits',
        select: 'id,guest_id,served_at,created_at',
        orderBy: 'created_at',
        ascending: false,
        pageSize: 1000,
        mapper: mapHaircutRow,
    });
});

// ============================================================================
// SERVICES QUERIES
// ============================================================================

export const getCachedShowerRecords = cache(async () => {
    const supabase = createClient();
    return await fetchAllPaginated(supabase, {
        table: 'shower_reservations',
        select: '*',
        orderBy: 'created_at',
        ascending: false,
        pageSize: 1000,
        mapper: mapShowerRow,
    });
});

export const getCachedLaundryRecords = cache(async () => {
    const supabase = createClient();
    return await fetchAllPaginated(supabase, {
        table: 'laundry_bookings',
        select: '*',
        orderBy: 'created_at',
        ascending: false,
        pageSize: 1000,
        mapper: mapLaundryRow,
    });
});

export const getCachedBicycleRecords = cache(async () => {
    const supabase = createClient();
    return await fetchAllPaginated(supabase, {
        table: 'bicycle_repairs',
        select: '*',
        orderBy: 'requested_at',
        ascending: false,
        pageSize: 1000,
        mapper: mapBicycleRow,
    });
});

// ============================================================================
// COMBINED QUERIES FOR PARALLEL LOADING
// ============================================================================

/**
 * Load all guest-related data in parallel with automatic deduplication.
 * If multiple components call this simultaneously, React cache() ensures
 * each query only runs once.
 */
export const loadAllGuestData = cache(async () => {
    const [guests, warnings, proxies] = await Promise.all([
        getCachedGuests(),
        getCachedGuestWarnings(),
        getCachedGuestProxies(),
    ]);
    
    return { guests, warnings, proxies };
});

/**
 * Load all meal-related data in parallel with automatic deduplication.
 */
export const loadAllMealData = cache(async () => {
    const [meals, holidays, haircuts] = await Promise.all([
        getCachedMealRecords(),
        getCachedHolidayRecords(),
        getCachedHaircutRecords(),
    ]);
    
    return { meals, holidays, haircuts };
});

/**
 * Load all service-related data in parallel with automatic deduplication.
 */
export const loadAllServiceData = cache(async () => {
    const [showers, laundry, bicycles] = await Promise.all([
        getCachedShowerRecords(),
        getCachedLaundryRecords(),
        getCachedBicycleRecords(),
    ]);
    
    return { showers, laundry, bicycles };
});

/**
 * Load ALL app data in one shot with maximum deduplication.
 * Perfect for initial page loads where multiple stores need data.
 */
export const loadAllAppData = cache(async () => {
    const [guestData, mealData, serviceData] = await Promise.all([
        loadAllGuestData(),
        loadAllMealData(),
        loadAllServiceData(),
    ]);
    
    return {
        ...guestData,
        ...mealData,
        ...serviceData,
    };
});
