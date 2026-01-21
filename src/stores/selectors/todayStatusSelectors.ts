/**
 * Precomputed status selectors for efficient per-guest lookups.
 * 
 * These selectors build guestId→status maps in a single pass,
 * eliminating repeated array scans in GuestCard components.
 * 
 * Usage: Call once at the list level, pass maps to individual cards.
 */

import { useMemo } from 'react';
import { useMealsStore, MealRecord } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useActionHistoryStore } from '@/stores/useActionHistoryStore';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';

export interface TodayMealStatus {
    hasMeal: boolean;
    mealRecord?: MealRecord;
    mealCount: number;
    extraMealCount: number;
    totalMeals: number;
}

export interface TodayServiceStatus {
    hasShower: boolean;
    hasLaundry: boolean;
    hasBicycle: boolean;
    hasHaircut: boolean;
    hasHoliday: boolean;
    showerRecord?: { id: string; time?: string | null; status: string };
    laundryRecord?: { id: string; time?: string | null; status: string };
    bicycleRecord?: { id: string; status: string };
    haircutRecord?: { id: string };
    holidayRecord?: { id: string };
}

export interface TodayGuestActions {
    mealActionId?: string;
    showerActionId?: string;
    laundryActionId?: string;
    bicycleActionId?: string;
    haircutActionId?: string;
    holidayActionId?: string;
}

export type MealStatusMap = Map<string, TodayMealStatus>;
export type ServiceStatusMap = Map<string, TodayServiceStatus>;
export type ActionStatusMap = Map<string, TodayGuestActions>;
export type RecentGuestsMap = Set<string>;

/**
 * Hook that returns a Set of guest IDs who have had a meal in the last 7 days.
 * Efficient O(n) single pass over meal records.
 */
export function useRecentGuestsMap(): RecentGuestsMap {
    const mealRecords = useMealsStore((s) => s.mealRecords);
    
    return useMemo(() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        
        const recentGuests = new Set<string>();
        
        for (const record of mealRecords) {
            const recordDate = new Date(record.date);
            if (recordDate >= sevenDaysAgo) {
                recentGuests.add(record.guestId);
            }
        }
        
        return recentGuests;
    }, [mealRecords]);
}

/**
 * Hook that returns precomputed meal status maps for all guests.
 * Call once at the list level, not per-card.
 */
export function useTodayMealStatusMap(): MealStatusMap {
    const mealRecords = useMealsStore((s) => s.mealRecords);
    const extraMealRecords = useMealsStore((s) => s.extraMealRecords);
    
    return useMemo(() => {
        const today = todayPacificDateString();
        const map = new Map<string, TodayMealStatus>();
        
        // Build base meal map in single pass
        for (const record of mealRecords) {
            if (pacificDateStringFrom(record.date) === today) {
                const existing = map.get(record.guestId);
                if (existing) {
                    existing.mealCount += record.count || 1;
                    existing.totalMeals += record.count || 1;
                } else {
                    map.set(record.guestId, {
                        hasMeal: true,
                        mealRecord: record,
                        mealCount: record.count || 1,
                        extraMealCount: 0,
                        totalMeals: record.count || 1,
                    });
                }
            }
        }
        
        // Add extra meals in single pass
        for (const record of extraMealRecords || []) {
            if (pacificDateStringFrom(record.date) === today) {
                const count = record.count || 1;
                const existing = map.get(record.guestId);
                if (existing) {
                    existing.extraMealCount += count;
                    existing.totalMeals += count;
                } else {
                    map.set(record.guestId, {
                        hasMeal: false,
                        mealCount: 0,
                        extraMealCount: count,
                        totalMeals: count,
                    });
                }
            }
        }
        
        return map;
    }, [mealRecords, extraMealRecords]);
}

/**
 * Hook that returns precomputed service status maps for all guests.
 * Call once at the list level, not per-card.
 */
export function useTodayServiceStatusMap(): ServiceStatusMap {
    const showerRecords = useServicesStore((s) => s.showerRecords);
    const laundryRecords = useServicesStore((s) => s.laundryRecords);
    const bicycleRecords = useServicesStore((s) => s.bicycleRecords);
    const haircutRecords = useServicesStore((s) => s.haircutRecords);
    const holidayRecords = useServicesStore((s) => s.holidayRecords);
    
    return useMemo(() => {
        const today = todayPacificDateString();
        const map = new Map<string, TodayServiceStatus>();
        
        const getOrCreate = (guestId: string): TodayServiceStatus => {
            let status = map.get(guestId);
            if (!status) {
                status = {
                    hasShower: false,
                    hasLaundry: false,
                    hasBicycle: false,
                    hasHaircut: false,
                    hasHoliday: false,
                };
                map.set(guestId, status);
            }
            return status;
        };
        
        // Showers
        for (const record of showerRecords) {
            if (pacificDateStringFrom(record.date) === today) {
                const status = getOrCreate(record.guestId);
                status.hasShower = true;
                status.showerRecord = { id: record.id, time: record.time, status: record.status };
            }
        }
        
        // Laundry
        for (const record of laundryRecords) {
            if (pacificDateStringFrom(record.date) === today) {
                const status = getOrCreate(record.guestId);
                status.hasLaundry = true;
                status.laundryRecord = { id: record.id, time: record.time, status: record.status };
            }
        }
        
        // Bicycles
        for (const record of bicycleRecords || []) {
            if (pacificDateStringFrom(record.date) === today) {
                const status = getOrCreate(record.guestId);
                status.hasBicycle = true;
                status.bicycleRecord = { id: record.id, status: record.status };
            }
        }
        
        // Haircuts
        for (const record of haircutRecords || []) {
            if (pacificDateStringFrom(record.date) === today) {
                const status = getOrCreate(record.guestId);
                status.hasHaircut = true;
                status.haircutRecord = { id: record.id };
            }
        }
        
        // Holidays
        for (const record of holidayRecords || []) {
            if (pacificDateStringFrom(record.date) === today) {
                const status = getOrCreate(record.guestId);
                status.hasHoliday = true;
                status.holidayRecord = { id: record.id };
            }
        }
        
        return map;
    }, [showerRecords, laundryRecords, bicycleRecords, haircutRecords, holidayRecords]);
}

/**
 * Hook that returns precomputed action IDs for undo functionality.
 * Call once at the list level, not per-card.
 */
export function useTodayActionStatusMap(): ActionStatusMap {
    const actionHistory = useActionHistoryStore((s) => s.actionHistory);
    
    return useMemo(() => {
        const today = todayPacificDateString();
        const map = new Map<string, TodayGuestActions>();
        
        for (const action of actionHistory) {
            if (pacificDateStringFrom(action.timestamp) !== today) continue;
            
            const guestId = action.data?.guestId;
            if (!guestId) continue;
            
            let entry = map.get(guestId);
            if (!entry) {
                entry = {};
                map.set(guestId, entry);
            }
            
            switch (action.type) {
                case 'MEAL_ADDED':
                    if (!entry.mealActionId) entry.mealActionId = action.id;
                    break;
                case 'SHOWER_BOOKED':
                    if (!entry.showerActionId) entry.showerActionId = action.id;
                    break;
                case 'LAUNDRY_BOOKED':
                    if (!entry.laundryActionId) entry.laundryActionId = action.id;
                    break;
                case 'BICYCLE_LOGGED':
                    if (!entry.bicycleActionId) entry.bicycleActionId = action.id;
                    break;
                case 'HAIRCUT_LOGGED':
                    if (!entry.haircutActionId) entry.haircutActionId = action.id;
                    break;
                case 'HOLIDAY_LOGGED':
                    if (!entry.holidayActionId) entry.holidayActionId = action.id;
                    break;
            }
        }
        
        return map;
    }, [actionHistory]);
}

/**
 * Combined hook that returns all precomputed status maps.
 * Most efficient when you need all three maps.
 */
export function useTodayStatusMaps() {
    const mealStatus = useTodayMealStatusMap();
    const serviceStatus = useTodayServiceStatusMap();
    const actionStatus = useTodayActionStatusMap();
    const recentGuests = useRecentGuestsMap();
    
    return { mealStatus, serviceStatus, actionStatus, recentGuests };
}

/**
 * Get default empty status objects for guests not in the maps.
 */
export const defaultMealStatus: TodayMealStatus = {
    hasMeal: false,
    mealCount: 0,
    extraMealCount: 0,
    totalMeals: 0,
};

export const defaultServiceStatus: TodayServiceStatus = {
    hasShower: false,
    hasLaundry: false,
    hasBicycle: false,
    hasHaircut: false,
    hasHoliday: false,
};

export const defaultActionStatus: TodayGuestActions = {};
