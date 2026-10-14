'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Users, ChevronDown, ChevronUp, Check, Loader2, Utensils } from 'lucide-react';
import type { MealStatusMap } from '@/stores/selectors/todayStatusSelectors';

const LinkedGuestsList = dynamic(() => import('./LinkedGuestsList'));

export interface GuestLinkedSectionProps {
    guestId: string;
    displayName: string;
    totalLinkedCount: number;
    linkedServedCount: number;
    linkedNames: string[];
    todayMeal: boolean;
    isPending: boolean;
    isBannedFromMeals: boolean;
    mealStatusMap?: MealStatusMap;
    addMealRecord: (guestId: string, count?: number, pickedUpByGuestId?: string | null, serviceDate?: string) => Promise<any>;
    loadGuestContext?: () => Promise<void>;
    onCheckInAll: (e: React.MouseEvent, count: number) => void;
}

export function GuestLinkedSection({
    guestId,
    displayName,
    totalLinkedCount,
    linkedServedCount,
    linkedNames,
    todayMeal,
    isPending,
    isBannedFromMeals,
    mealStatusMap,
    addMealRecord,
    loadGuestContext,
    onCheckInAll,
}: GuestLinkedSectionProps) {
    const [showLinkedGuests, setShowLinkedGuests] = useState(false);
    const [loadingLinkedGuests, setLoadingLinkedGuests] = useState(false);

    if (totalLinkedCount <= 0) return null;

    return (
        <section aria-label={`Linked guest meals for ${displayName}`} className="border-t border-gray-100 bg-slate-50/70 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h4 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-gray-800">
                        <Users size={16} className="text-emerald-700" aria-hidden="true" />
                        Linked guests
                        <span className="text-xs font-medium text-gray-600">{linkedServedCount} of {totalLinkedCount} served</span>
                    </h4>
                    <p className="mt-1 break-words text-sm text-gray-600">{linkedNames.join(', ') || 'View guests to see who is linked'}</p>
                </div>
                <button
                    type="button"
                    aria-label={showLinkedGuests ? 'Hide linked guests' : 'View linked guests'}
                    aria-expanded={showLinkedGuests}
                    aria-controls={`linked-guests-${guestId}`}
                    onClick={async () => {
                        const next = !showLinkedGuests;
                        setShowLinkedGuests(next);
                        if (next && loadGuestContext) {
                            setLoadingLinkedGuests(true);
                            try { await loadGuestContext(); } finally { setLoadingLinkedGuests(false); }
                        }
                    }}
                    className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                >
                    {showLinkedGuests ? 'Hide' : 'View'}
                    {showLinkedGuests ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>
            {todayMeal && linkedServedCount >= totalLinkedCount ? (
                <p role="status" className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-700"><Check size={16} />All linked guests served</p>
            ) : (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <p className="text-sm font-semibold text-gray-700">
                        {todayMeal
                            ? `${totalLinkedCount - linkedServedCount} linked guest${totalLinkedCount - linkedServedCount === 1 ? '' : 's'} still need meals`
                            : `${displayName} + ${totalLinkedCount - linkedServedCount} linked guest${totalLinkedCount - linkedServedCount === 1 ? '' : 's'}`}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:shrink-0">
                        {[1, 2].map((count) => (
                            <button
                                key={count}
                                type="button"
                                onClick={(e) => onCheckInAll(e, count)}
                                disabled={isPending || (!todayMeal && isBannedFromMeals)}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 touch-manipulation"
                            >
                                {isPending ? <Loader2 size={16} className="animate-spin" /> : <Utensils size={16} aria-hidden="true" />}
                                {count} meal{count === 1 ? '' : 's'} each
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {showLinkedGuests && (
                <div id={`linked-guests-${guestId}`}>
                    {loadingLinkedGuests ? <p role="status" className="py-3 text-sm text-gray-600">Loading linked guests…</p> : (
                        <LinkedGuestsList guestId={guestId} mealStatusMap={mealStatusMap} addMealRecord={addMealRecord} disabled={isPending} />
                    )}
                </div>
            )}
        </section>
    );
}
