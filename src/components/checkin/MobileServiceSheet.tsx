'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
    X,
    Utensils,
    ShowerHead,
    WashingMachine,
    Check,
    Loader2,
    ChevronDown,
    RotateCcw,
    Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatSlotLabel } from '@/lib/utils/serviceSlots';
import type { NextAvailableShowerSlot, NextAvailableLaundrySlot } from '@/lib/utils/nextAvailableSlot';
import { GuestBanNotice } from '@/components/guests/GuestBanNotice';

interface Guest {
    id: string;
    name: string;
    preferredName?: string;
    isBanned?: boolean;
    bannedUntil?: string | null;
    banReason?: string | null;
    bannedFromMeals?: boolean;
    bannedFromShower?: boolean;
    bannedFromLaundry?: boolean;
    bannedFromBicycle?: boolean;
}

interface MobileServiceSheetProps {
    isOpen: boolean;
    onClose: () => void;
    guest: Guest | null;
    // Meal props
    onMealSelect: (guestId: string, count: number) => void;
    hasMealToday?: boolean;
    mealCount?: number;
    isPendingMeal?: boolean;
    isBannedFromMeals?: boolean;
    onMealUndo?: () => void;
    // Shower props
    onShowerSelect: (guest: Guest) => void;
    onQuickShowerSelect?: (guest: Guest) => void;
    hasShowerToday?: boolean;
    isBannedFromShower?: boolean;
    onShowerUndo?: () => void;
    nextAvailableShowerSlot?: NextAvailableShowerSlot | null;
    bookedShowerTime?: string | null;
    isPendingShower?: boolean;
    // Laundry props
    onLaundrySelect: (guest: Guest) => void;
    onQuickLaundrySelect?: (guest: Guest) => void;
    hasLaundryToday?: boolean;
    isBannedFromLaundry?: boolean;
    onLaundryUndo?: () => void;
    nextAvailableLaundrySlot?: NextAvailableLaundrySlot | null;
    bookedLaundryTime?: string | null;
    isPendingLaundry?: boolean;
}

/**
 * MobileServiceSheet - A bottom sheet component for mobile/tablet service actions
 * 
 * Provides large, thumb-friendly touch targets for assigning meals, showers, and laundry.
 * Features swipe-to-dismiss and backdrop tap-to-close for intuitive mobile UX.
 */
export function MobileServiceSheet({
    isOpen,
    onClose,
    guest,
    // Meal props
    onMealSelect,
    hasMealToday = false,
    mealCount = 0,
    isPendingMeal = false,
    isBannedFromMeals = false,
    onMealUndo,
    // Shower props
    onShowerSelect,
    onQuickShowerSelect,
    hasShowerToday = false,
    isBannedFromShower = false,
    onShowerUndo,
    nextAvailableShowerSlot,
    bookedShowerTime,
    isPendingShower = false,
    // Laundry props
    onLaundrySelect,
    onQuickLaundrySelect,
    hasLaundryToday = false,
    isBannedFromLaundry = false,
    onLaundryUndo,
    nextAvailableLaundrySlot,
    bookedLaundryTime,
    isPendingLaundry = false,
}: MobileServiceSheetProps) {
    const sheetRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const currentY = useRef(0);
    const isDragging = useRef(false);
    const prefersReducedMotion = useReducedMotion();

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Touch handlers for swipe-to-dismiss
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        startY.current = e.touches[0].clientY;
        isDragging.current = true;
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging.current) return;
        currentY.current = e.touches[0].clientY;
        const diff = currentY.current - startY.current;

        // Only allow dragging down
        if (diff > 0 && sheetRef.current) {
            sheetRef.current.style.transform = `translateY(${diff}px)`;
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (!isDragging.current) return;
        isDragging.current = false;

        const diff = currentY.current - startY.current;

        // If dragged more than 100px down, close
        if (diff > 100) {
            onClose();
        }

        // Reset transform
        if (sheetRef.current) {
            sheetRef.current.style.transform = '';
        }
    }, [onClose]);

    if (!guest) return null;

    const guestName = guest.preferredName || guest.name || 'Guest';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Bottom Sheet */}
                    <motion.div
                        ref={sheetRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="mobile-service-sheet-title"
                        initial={prefersReducedMotion ? false : { y: '100%' }}
                        animate={{ y: 0 }}
                        exit={prefersReducedMotion ? undefined : { y: '100%' }}
                        transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Drag Handle */}
                        <div className="flex justify-center py-3 cursor-grab active:cursor-grabbing">
                            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="px-5 pb-4 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <h2
                                    id="mobile-service-sheet-title"
                                    className="text-xl font-bold text-gray-900"
                                >
                                    Quick Add for {guestName}
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors touch-manipulation"
                                    aria-label="Close"
                                >
                                    <X size={20} className="text-gray-600" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-5 py-5 space-y-4 pb-safe">
                            {guest.isBanned && (
                                <GuestBanNotice guest={guest} compact />
                            )}

                            {/* Meal Section */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                    Meals
                                </h3>
                                {hasMealToday ? (
                                    <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-700 font-bold">
                                        <div className="flex items-center gap-3">
                                            <Check size={24} className="text-emerald-600" />
                                            <span>
                                                {mealCount} Meal{mealCount > 1 ? 's' : ''} Today
                                            </span>
                                        </div>
                                        {onMealUndo && (
                                            <button
                                                onClick={() => {
                                                    onMealUndo();
                                                    onClose();
                                                }}
                                                className="flex items-center justify-center gap-1.5 px-3 h-10 rounded-xl bg-orange-100 border border-orange-200 text-orange-700 font-semibold active:scale-95 transition-transform touch-manipulation"
                                                title="Undo meals"
                                            >
                                                <RotateCcw size={16} />
                                                <span className="text-sm">Undo</span>
                                            </button>
                                        )}
                                    </div>
                                ) : isBannedFromMeals ? (
                                    <div className="flex items-center justify-center gap-3 h-16 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 font-bold">
                                        <span>Banned from Meals</span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        {[1, 2].map((count) => (
                                            <button
                                                key={count}
                                                onClick={() => {
                                                    onMealSelect(guest.id, count);
                                                    onClose();
                                                }}
                                                disabled={isPendingMeal}
                                                className="flex items-center justify-center gap-3 h-16 rounded-2xl bg-white border-2 border-emerald-200 text-emerald-700 font-bold hover:bg-emerald-50 active:bg-emerald-100 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-manipulation"
                                            >
                                                {isPendingMeal ? (
                                                    <Loader2 size={24} className="animate-spin" />
                                                ) : (
                                                    <Utensils size={24} />
                                                )}
                                                <span className="text-lg">
                                                    {count} Meal{count > 1 ? 's' : ''}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Divider */}
                            <div className="border-t border-gray-100" />

                            {/* Shower Section */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                    Shower
                                </h3>
                                {hasShowerToday ? (
                                    <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-sky-50 border-2 border-sky-200 text-sky-700 font-bold">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Check size={24} className="text-sky-600 shrink-0" />
                                            <div className="flex flex-col min-w-0">
                                                <span className="truncate">Shower Booked Today</span>
                                                {bookedShowerTime && (
                                                    <span className="text-xs font-semibold text-sky-600 truncate">
                                                        Slot: {formatSlotLabel(bookedShowerTime)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {onShowerUndo && (
                                            <button
                                                onClick={() => {
                                                    onShowerUndo();
                                                    onClose();
                                                }}
                                                className="flex items-center justify-center gap-1.5 px-3 h-10 rounded-xl bg-orange-100 border border-orange-200 text-orange-700 font-semibold active:scale-95 transition-transform touch-manipulation shrink-0"
                                                title="Undo shower"
                                            >
                                                <RotateCcw size={16} />
                                                <span className="text-sm">Undo</span>
                                            </button>
                                        )}
                                    </div>
                                ) : isBannedFromShower ? (
                                    <div className="flex items-center justify-center gap-3 h-16 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 font-bold">
                                        <span>Banned from Showers</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                if (onQuickShowerSelect) {
                                                    onQuickShowerSelect(guest);
                                                } else {
                                                    onShowerSelect(guest);
                                                }
                                                onClose();
                                            }}
                                            disabled={isPendingShower}
                                            className={cn(
                                                "flex items-center gap-3 flex-1 min-w-0 h-16 px-4 rounded-2xl bg-white border-2 text-left transition-all active:scale-[0.98] touch-manipulation disabled:opacity-50",
                                                nextAvailableShowerSlot === null
                                                    ? "border-amber-200 text-amber-700 hover:bg-amber-50 active:bg-amber-100"
                                                    : "border-sky-200 text-sky-700 hover:bg-sky-50 active:bg-sky-100"
                                            )}
                                        >
                                            {isPendingShower ? (
                                                <Loader2 size={24} className="animate-spin shrink-0" />
                                            ) : (
                                                <ShowerHead size={24} className="shrink-0" />
                                            )}
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <span className="text-base font-bold truncate">
                                                    {nextAvailableShowerSlot === null ? 'Join Waitlist' : 'Book Shower'}
                                                </span>
                                                {nextAvailableShowerSlot ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 shrink-0">
                                                        {nextAvailableShowerSlot.label || nextAvailableShowerSlot.slotTime}
                                                    </span>
                                                ) : nextAvailableShowerSlot === null ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 shrink-0">
                                                        Waitlist
                                                    </span>
                                                ) : null}
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onShowerSelect(guest);
                                                onClose();
                                            }}
                                            disabled={isPendingShower}
                                            className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-white border-2 border-gray-200 text-gray-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 active:scale-95 transition-all touch-manipulation shrink-0 disabled:opacity-50"
                                            title="Choose specific shower time"
                                            aria-label="Choose specific shower time"
                                        >
                                            <Clock size={20} />
                                            <span className="text-[10px] font-bold mt-0.5">Time</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Divider */}
                            <div className="border-t border-gray-100" />

                            {/* Laundry Section */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                    Laundry
                                </h3>
                                {hasLaundryToday ? (
                                    <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-indigo-700 font-bold">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Check size={24} className="text-indigo-600 shrink-0" />
                                            <div className="flex flex-col min-w-0">
                                                <span className="truncate">Laundry Booked Today</span>
                                                {bookedLaundryTime && (
                                                    <span className="text-xs font-semibold text-indigo-600 truncate">
                                                        Slot: {formatSlotLabel(bookedLaundryTime)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {onLaundryUndo && (
                                            <button
                                                onClick={() => {
                                                    onLaundryUndo();
                                                    onClose();
                                                }}
                                                className="flex items-center justify-center gap-1.5 px-3 h-10 rounded-xl bg-orange-100 border border-orange-200 text-orange-700 font-semibold active:scale-95 transition-transform touch-manipulation shrink-0"
                                                title="Undo laundry"
                                            >
                                                <RotateCcw size={16} />
                                                <span className="text-sm">Undo</span>
                                            </button>
                                        )}
                                    </div>
                                ) : isBannedFromLaundry ? (
                                    <div className="flex items-center justify-center gap-3 h-16 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 font-bold">
                                        <span>Banned from Laundry</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                if (nextAvailableLaundrySlot && onQuickLaundrySelect) {
                                                    onQuickLaundrySelect(guest);
                                                } else {
                                                    onLaundrySelect(guest);
                                                }
                                                onClose();
                                            }}
                                            disabled={isPendingLaundry}
                                            className={cn(
                                                "flex items-center gap-3 flex-1 min-w-0 h-16 px-4 rounded-2xl bg-white border-2 text-left transition-all active:scale-[0.98] touch-manipulation disabled:opacity-50",
                                                nextAvailableLaundrySlot === null
                                                    ? "border-amber-200 text-amber-700 hover:bg-amber-50 active:bg-amber-100"
                                                    : "border-indigo-200 text-indigo-700 hover:bg-indigo-50 active:bg-indigo-100"
                                            )}
                                        >
                                            {isPendingLaundry ? (
                                                <Loader2 size={24} className="animate-spin shrink-0" />
                                            ) : (
                                                <WashingMachine size={24} className="shrink-0" />
                                            )}
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <span className="text-base font-bold truncate">
                                                    {nextAvailableLaundrySlot === null ? 'Laundry Options' : 'Book Laundry'}
                                                </span>
                                                {nextAvailableLaundrySlot ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 shrink-0">
                                                        {nextAvailableLaundrySlot.label.split(' - ')[0]}
                                                    </span>
                                                ) : nextAvailableLaundrySlot === null ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 shrink-0">
                                                        Off-site / Full
                                                    </span>
                                                ) : null}
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onLaundrySelect(guest);
                                                onClose();
                                            }}
                                            disabled={isPendingLaundry}
                                            className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-white border-2 border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 transition-all touch-manipulation shrink-0 disabled:opacity-50"
                                            title="Choose laundry options"
                                            aria-label="Choose laundry options"
                                        >
                                            <Clock size={20} />
                                            <span className="text-[10px] font-bold mt-0.5">Options</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Close hint */}
                            <div className="pt-4 flex justify-center">
                                <button
                                    onClick={onClose}
                                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <ChevronDown size={16} />
                                    <span>Swipe down or tap to close</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default MobileServiceSheet;
