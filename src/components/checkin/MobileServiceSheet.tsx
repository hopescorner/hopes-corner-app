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
} from 'lucide-react';

interface Guest {
    id: string;
    name: string;
    preferredName?: string;
    isBanned?: boolean;
    bannedFromMeals?: boolean;
    bannedFromShower?: boolean;
    bannedFromLaundry?: boolean;
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
    // Shower props
    onShowerSelect: (guest: Guest) => void;
    hasShowerToday?: boolean;
    isBannedFromShower?: boolean;
    // Laundry props
    onLaundrySelect: (guest: Guest) => void;
    hasLaundryToday?: boolean;
    isBannedFromLaundry?: boolean;
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
    // Shower props
    onShowerSelect,
    hasShowerToday = false,
    isBannedFromShower = false,
    // Laundry props
    onLaundrySelect,
    hasLaundryToday = false,
    isBannedFromLaundry = false,
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
                            {/* Meal Section */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                    Meals
                                </h3>
                                {hasMealToday ? (
                                    <div className="flex items-center justify-center gap-3 h-16 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-700 font-bold">
                                        <Check size={24} className="text-emerald-600" />
                                        <span>
                                            {mealCount} Meal{mealCount > 1 ? 's' : ''} Today
                                        </span>
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
                                    <div className="flex items-center justify-center gap-3 h-16 rounded-2xl bg-sky-50 border-2 border-sky-200 text-sky-700 font-bold">
                                        <Check size={24} className="text-sky-600" />
                                        <span>Shower Booked Today</span>
                                    </div>
                                ) : isBannedFromShower ? (
                                    <div className="flex items-center justify-center gap-3 h-16 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 font-bold">
                                        <span>Banned from Showers</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => {
                                            onShowerSelect(guest);
                                            onClose();
                                        }}
                                        className="flex items-center justify-center gap-3 w-full h-16 rounded-2xl bg-white border-2 border-sky-200 text-sky-700 font-bold hover:bg-sky-50 active:bg-sky-100 active:scale-[0.98] transition-all touch-manipulation"
                                    >
                                        <ShowerHead size={24} />
                                        <span className="text-lg">Book Shower</span>
                                    </button>
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
                                    <div className="flex items-center justify-center gap-3 h-16 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-indigo-700 font-bold">
                                        <Check size={24} className="text-indigo-600" />
                                        <span>Laundry Booked Today</span>
                                    </div>
                                ) : isBannedFromLaundry ? (
                                    <div className="flex items-center justify-center gap-3 h-16 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 font-bold">
                                        <span>Banned from Laundry</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => {
                                            onLaundrySelect(guest);
                                            onClose();
                                        }}
                                        className="flex items-center justify-center gap-3 w-full h-16 rounded-2xl bg-white border-2 border-indigo-200 text-indigo-700 font-bold hover:bg-indigo-50 active:bg-indigo-100 active:scale-[0.98] transition-all touch-manipulation"
                                    >
                                        <WashingMachine size={24} />
                                        <span className="text-lg">Book Laundry</span>
                                    </button>
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
