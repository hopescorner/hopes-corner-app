'use client';

import React from 'react';
import { Utensils, Check, RotateCcw, Loader2, Plus } from 'lucide-react';
import { UndoButton, DisabledAction } from './GuestActionControls';
import { MAX_TOTAL_MEALS_PER_DAY } from '@/lib/constants/constants';

export interface GuestMealActionsProps {
    guest: any;
    todayMeal: boolean;
    baseMealCount: number;
    extraMealsCount: number;
    totalMeals: number;
    hasReachedMealLimit: boolean;
    hasReachedExtraMealLimit: boolean;
    isBannedFromMeals: boolean;
    isPending: boolean;
    mealAction?: { id: string };
    extraMealAction?: { id: string };
    onMealAdd: (e: React.MouseEvent, count: number) => void;
    onExtraMealAdd: (e: React.MouseEvent) => void;
    onUndo: (e: React.MouseEvent | undefined, actionId: string, label: string) => void;
}

export function GuestMealActions({
    todayMeal,
    baseMealCount,
    extraMealsCount,
    totalMeals,
    hasReachedMealLimit,
    hasReachedExtraMealLimit,
    isBannedFromMeals,
    isPending,
    mealAction,
    extraMealAction,
    onMealAdd,
    onExtraMealAdd,
    onUndo,
}: GuestMealActionsProps) {
    return (
        <>
            {/* Mobile Meal Controls (1/2 + undo) - only visible on small screens */}
            <div className="contents md:hidden">
                {!todayMeal ? (
                    isBannedFromMeals ? (
                        <DisabledAction
                            label="Meals"
                            reason="Banned"
                            title="Banned from meals"
                            className="col-span-2 h-16 flex-col"
                        />
                    ) : (
                        [1, 2].map((count) => (
                            <button
                                key={count}
                                onClick={(e) => onMealAdd(e, count)}
                                disabled={isPending}
                                className="flex h-16 min-h-[44px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl bg-emerald-600 px-1 text-white shadow-sm transition-transform active:scale-95 touch-manipulation disabled:opacity-50"
                                title={`Log ${count} meal${count > 1 ? 's' : ''}`}
                                aria-label={`Log ${count} meal${count > 1 ? 's' : ''}`}
                            >
                                {isPending ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Utensils size={19} />
                                )}
                                <span className="text-[11px] font-bold leading-none">
                                    {count} Meal{count > 1 ? 's' : ''}
                                </span>
                            </button>
                        ))
                    )
                ) : (
                    <>
                        <div
                            className="flex h-16 min-h-[44px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl bg-emerald-100 px-1 text-emerald-700"
                            title="Meal logged"
                        >
                            <Check size={18} strokeWidth={3} />
                            <span className="text-[11px] font-bold leading-none">
                                {totalMeals} Meal{totalMeals === 1 ? '' : 's'}
                            </span>
                        </div>
                        {mealAction && (
                            <button
                                onClick={(e) => onUndo(e, mealAction.id, 'Check-in')}
                                disabled={isPending}
                                className="flex h-16 min-h-[44px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-orange-200 bg-orange-100 px-1 text-orange-700 transition-transform active:scale-95 touch-manipulation disabled:opacity-50"
                                title="Undo meal"
                                aria-label="Undo meal"
                            >
                                <RotateCcw size={18} />
                                <span className="text-[11px] font-bold leading-none">Undo</span>
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Desktop Meal Controls - hidden on mobile */}
            {isBannedFromMeals ? (
                <div className="hidden md:flex items-center">
                    <DisabledAction label="Meals" reason="Banned" />
                </div>
            ) : (
                <div className="hidden md:flex items-center gap-1">
                    {!todayMeal ? (
                        <div className="flex items-center gap-1 px-1 py-1 bg-gray-50 rounded-xl border border-gray-100 shadow-inner">
                            {[1, 2].map((count) => (
                                <button
                                    key={count}
                                    onClick={(e) => onMealAdd(e, count)}
                                    disabled={isPending}
                                    className="flex items-center justify-center gap-1.5 h-11 min-h-[44px] min-w-[44px] px-3.5 rounded-lg bg-white border border-gray-200 text-emerald-700 font-bold text-sm shadow-sm hover:border-emerald-300 hover:bg-emerald-50 transition-all active:scale-95 touch-manipulation disabled:opacity-50"
                                >
                                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <Utensils size={14} />}
                                    <span>{count}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 px-1 py-1 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                <div className="flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm">
                                    <Check size={14} />
                                    <span>{baseMealCount}</span>
                                    {extraMealsCount > 0 && (
                                        <span className="text-orange-600 text-xs ml-0.5">+{extraMealsCount}</span>
                                    )}
                                </div>
                                {mealAction && (
                                    <UndoButton
                                        title="Undo Check-in"
                                        label="Undo Check-in"
                                        disabled={isPending}
                                        onClick={(e) => onUndo(e, mealAction.id, 'Check-in')}
                                    />
                                )}
                            </div>
                            {hasReachedMealLimit || hasReachedExtraMealLimit ? (
                                <div className="flex items-center gap-1">
                                    <div
                                        className="flex items-center justify-center gap-1 h-11 min-h-[44px] px-3 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 text-gray-400 font-bold text-xs cursor-not-allowed"
                                        title={`Daily meal limit reached (${totalMeals}/${MAX_TOTAL_MEALS_PER_DAY})`}
                                    >
                                        <span>Limit</span>
                                    </div>
                                    {extraMealAction && (
                                        <UndoButton
                                            title="Undo extra meal"
                                            label="Undo extra meal"
                                            disabled={isPending}
                                            onClick={(e) => onUndo(e, extraMealAction.id, 'Extra meal')}
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={onExtraMealAdd}
                                        disabled={isPending}
                                        className="flex items-center justify-center gap-1.5 h-11 min-h-[44px] min-w-[44px] px-3 rounded-lg bg-orange-50 border-2 border-dashed border-orange-300 text-orange-600 font-bold text-xs hover:bg-orange-100 hover:border-orange-400 transition-all active:scale-95 touch-manipulation disabled:opacity-50"
                                        title="Add extra meal (requires confirmation)"
                                    >
                                        <Plus size={14} />
                                        <span>Extra</span>
                                    </button>
                                    {extraMealAction && (
                                        <UndoButton
                                            title="Undo extra meal"
                                            label="Undo extra meal"
                                            disabled={isPending}
                                            onClick={(e) => onUndo(e, extraMealAction.id, 'Extra meal')}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}

export interface GuestExtraMealSectionProps {
    todayMeal: boolean;
    extraMealAction?: { id: string };
    hasReachedMealLimit: boolean;
    hasReachedExtraMealLimit: boolean;
    totalMeals: number;
    extraMealsCount: number;
    isPending: boolean;
    isBannedFromMeals: boolean;
    onExtraMealAdd: (e: React.MouseEvent) => void;
    onUndo: (e: React.MouseEvent | undefined, actionId: string, label: string) => void;
}

export function GuestExtraMealSection({
    todayMeal,
    extraMealAction,
    hasReachedMealLimit,
    hasReachedExtraMealLimit,
    totalMeals,
    extraMealsCount,
    isPending,
    isBannedFromMeals,
    onExtraMealAdd,
    onUndo,
}: GuestExtraMealSectionProps) {
    if (!todayMeal) return null;

    return (
        <div className="mt-2 pt-2 border-t border-dashed border-orange-200">
            <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">Extra Meals</p>
                {extraMealAction && (
                    <UndoButton
                        title="Undo extra meal"
                        label="Undo extra meal"
                        disabled={isPending}
                        onClick={(e) => onUndo(e, extraMealAction.id, 'Extra meal')}
                    />
                )}
            </div>
            {hasReachedMealLimit || hasReachedExtraMealLimit ? (
                <div className="w-full flex items-center justify-center gap-2 min-h-[44px] p-3 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 text-gray-400 font-bold text-sm">
                    <span>Daily meal limit reached ({totalMeals}/{MAX_TOTAL_MEALS_PER_DAY})</span>
                </div>
            ) : (
                <button
                    onClick={onExtraMealAdd}
                    disabled={isPending || isBannedFromMeals}
                    className="w-full flex items-center justify-center gap-2 min-h-[44px] p-3 rounded-xl bg-orange-50 border-2 border-dashed border-orange-300 text-orange-700 font-bold text-sm hover:bg-orange-100 hover:border-orange-400 transition-all active:scale-[0.98] touch-manipulation disabled:opacity-50"
                >
                    <Plus size={16} />
                    <span>Add Extra Meal</span>
                    {extraMealsCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-orange-200 rounded-full text-[10px] font-black">{extraMealsCount} added</span>
                    )}
                </button>
            )}
        </div>
    );
}
