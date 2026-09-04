'use client';

import { useMemo } from 'react';
import { Utensils, Users, ShoppingBag } from 'lucide-react';
import { useMealsStore } from '@/stores/useMealsStore';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';

export function TodayStats() {
    const { mealRecords, extraMealRecords, lunchBagRecords, isLoaded: mealsFullyLoaded } = useMealsStore();
    const today = todayPacificDateString();

    const stats = useMemo(() => {
        const todayMeals = (mealRecords || []).filter(
            (r) => pacificDateStringFrom(r.date) === today
        );
        const todayExtraMeals = (extraMealRecords || []).filter(
            (r) => pacificDateStringFrom(r.date) === today
        );
        const todayBags = (lunchBagRecords || []).filter(
            (r) => pacificDateStringFrom(r.date) === today
        );

        const regularCount = todayMeals.reduce((sum, r) => sum + (r.count || 1), 0);
        const extraCount = todayExtraMeals.reduce((sum, r) => sum + (r.count || 1), 0);
        const bagCount = todayBags.reduce((sum, r) => sum + (r.count || 1), 0);

        const uniqueGuestIds = new Set([
            ...todayMeals.map((r) => r.guestId),
            ...todayExtraMeals.map((r) => r.guestId)
        ]);

        return {
            totalMeals: regularCount + extraCount,
            uniqueGuests: uniqueGuestIds.size,
            lunchBags: bagCount
        };
    }, [mealRecords, extraMealRecords, lunchBagRecords, today]);

    // Lunch bags are only hydrated on pages that fully load the meals store
    // (the check-in snapshot path seeds meals/extras only). Show the bag count
    // once real bag data is present, and flag the AGENTS.md invariant:
    // Guests Served should equal Lunch Bags (Fridays legitimately have zero).
    const isFriday = new Date(`${today}T12:00:00`).getDay() === 5;
    const showBags = Boolean(mealsFullyLoaded) || stats.lunchBags > 0;
    const bagsMismatch = Boolean(mealsFullyLoaded) && !isFriday && stats.lunchBags !== stats.uniqueGuests;

    // Always show stats, even if 0


    return (
        <div className="flex items-center gap-3 text-xs font-medium text-gray-500 bg-white/50 px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
            <div className="flex items-center gap-1.5" title="Total meals served today">
                <Utensils size={13} className="text-gray-400" />
                <span className="text-gray-700">{stats.totalMeals}</span>
                <span className="hidden sm:inline">meals</span>
            </div>
            <div className="w-px h-3 bg-gray-200" />
            <div className={cn('flex items-center gap-1.5', bagsMismatch && 'text-amber-700')} title="Unique guests served today">
                <Users size={13} className={bagsMismatch ? 'text-amber-500' : 'text-gray-400'} />
                <span className={cn('text-gray-700', bagsMismatch && 'text-amber-800 font-bold')}>{stats.uniqueGuests}</span>
                <span className="hidden sm:inline">guests</span>
            </div>
            {showBags && (
                <>
                    <div className={cn('w-px h-3', bagsMismatch ? 'bg-amber-200' : 'bg-gray-200')} />
                    <div
                        className={cn('flex items-center gap-1.5', bagsMismatch && 'text-amber-700')}
                        title={
                            bagsMismatch
                                ? `Lunch bags (${stats.lunchBags}) don't match guests served (${stats.uniqueGuests}) — check for orphan bags`
                                : 'Lunch bags handed out today'
                        }
                    >
                        <ShoppingBag size={13} className={bagsMismatch ? 'text-amber-500' : 'text-gray-400'} />
                        <span className={cn('text-gray-700', bagsMismatch && 'text-amber-800 font-bold')}>{stats.lunchBags}</span>
                        <span className="hidden sm:inline">bags</span>
                    </div>
                </>
            )}
        </div>
    );
}
