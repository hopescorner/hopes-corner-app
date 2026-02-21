'use client';

import { useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MAX_EXTRA_MEALS_PER_DAY, MAX_TOTAL_MEALS_PER_DAY } from '@/lib/constants/constants';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
    User,
    ChevronDown,
    ChevronUp,
    Utensils,
    ShowerHead,
    WashingMachine,
    Bike,
    AlertTriangle,
    Link2,
    Check,
    Ban,
    Plus,
    Loader2,
    Home,
    MapPin,
    Edit,
    UserCheck,
    AlertCircle,
    Scissors,
    Gift,
    RotateCcw,
    Bell
} from 'lucide-react';
import LinkedGuestsList from './LinkedGuestsList';
import { cn } from '@/lib/utils/cn';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useModalStore } from '@/stores/useModalStore';
import { useActionHistoryStore } from '@/stores/useActionHistoryStore';
import { GuestEditModal } from '@/components/modals/GuestEditModal';
import { BanManagementModal } from '@/components/modals/BanManagementModal';
import { WarningManagementModal } from '@/components/modals/WarningManagementModal';
import { ReminderManagementModal } from '@/components/modals/ReminderManagementModal';
import { MobileServiceSheet } from '@/components/checkin/MobileServiceSheet';
import { useRemindersStore } from '@/stores/useRemindersStore';
import type { 
    MealStatusMap, 
    ServiceStatusMap, 
    ActionStatusMap,
    RecentGuestsMap,
    TodayMealStatus,
    TodayServiceStatus,
    TodayGuestActions
} from '@/stores/selectors/todayStatusSelectors';
import {
    defaultMealStatus,
    defaultServiceStatus,
    defaultActionStatus
} from '@/stores/selectors/todayStatusSelectors';
import toast from 'react-hot-toast';
import { useShallow } from 'zustand/react/shallow';

interface GuestCardProps {
    guest: any;
    isSelected?: boolean;
    onSelect?: () => void;
    compact?: boolean;
    onClearSearch?: () => void;
    // Optional precomputed status maps for performance optimization
    // When provided, skips local useMemo calculations
    mealStatusMap?: MealStatusMap;
    serviceStatusMap?: ServiceStatusMap;
    actionStatusMap?: ActionStatusMap;
    recentGuestsMap?: RecentGuestsMap;
    // Disable layout animations for better performance in large lists
    disableLayoutAnimation?: boolean;

    // Optional precomputed per-guest counts to avoid per-card store subscriptions
    warningsCount?: number;
    linkedGuestsCount?: number;
    activeRemindersCount?: number;

    // Optional expansion callback (useful for list virtualization measurement)
    onExpandedChange?: (guestId: string, expanded: boolean) => void;
}

type PureGuestCardProps = GuestCardProps & {
    mealRecords: any[];
    extraMealRecords: any[];
    showerRecords: any[];
    laundryRecords: any[];
    bicycleRecords: any[];
    haircutRecords: any[];
    holidayRecords: any[];

    addMealRecord: (guestId: string, count?: number) => Promise<any>;
    addExtraMealRecord: (guestId: string, count?: number) => Promise<any>;
    addHaircutRecord: (guestId: string) => Promise<any>;
    addHolidayRecord: (guestId: string) => Promise<any>;

    setShowerPickerGuest: (guest: any) => void;
    setLaundryPickerGuest: (guest: any) => void;
    setBicyclePickerGuest: (guest: any) => void;

    addAction: (type: any, data?: any) => void;
    undoAction: (actionId: string) => Promise<any>;
    getActionsForGuestToday: (guestId: string) => any[];
};

const EMPTY_ARRAY: any[] = [];

function GuestWarningsPanel({ guestId }: { guestId: string }) {
    const warnings = useGuestsStore((s) => s.warnings);

    const activeWarnings = useMemo(
        () => (warnings || []).filter((w: any) => w.guestId === guestId && w.active),
        [warnings, guestId]
    );

    if (activeWarnings.length === 0) return null;

    return (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Warnings</p>
            <ul className="space-y-1">
                {activeWarnings.map((warning: any) => (
                    <li key={warning.id} className="text-sm text-amber-800 flex items-start gap-2">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        {warning.message}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function PureGuestCard({
    guest,
    isSelected = false,
    onSelect,
    compact = false,
    onClearSearch,
    mealStatusMap,
    serviceStatusMap,
    actionStatusMap,
    recentGuestsMap,
    disableLayoutAnimation = false,
    warningsCount,
    linkedGuestsCount,
    activeRemindersCount,
    onExpandedChange,
    mealRecords,
    extraMealRecords,
    showerRecords,
    laundryRecords,
    bicycleRecords,
    haircutRecords,
    holidayRecords,
    addMealRecord,
    addExtraMealRecord,
    addHaircutRecord,
    addHolidayRecord,
    setShowerPickerGuest,
    setLaundryPickerGuest,
    setBicyclePickerGuest,
    addAction,
    undoAction,
    getActionsForGuestToday,
}: PureGuestCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showBanModal, setShowBanModal] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [showMobileSheet, setShowMobileSheet] = useState(false);
    const prefersReducedMotion = useReducedMotion();

    const warningBadgeCount = warningsCount ?? 0;
    const linkedBadgeCount = linkedGuestsCount ?? 0;
    const reminderBadgeCount = activeRemindersCount ?? 0;

    const today = todayPacificDateString();

    // Always compute local status (useMemo must be called unconditionally)
    // Then use precomputed map if provided
    const localMealStatus = useMemo(() => {
        if (mealStatusMap) return defaultMealStatus;
        const todayRecord = mealRecords.find(
            (r) => r.guestId === guest.id && pacificDateStringFrom(r.date) === today
        );
        const todayExtras = (extraMealRecords || []).filter(
            (r) => r.guestId === guest.id && pacificDateStringFrom(r.date) === today
        );
        const extraCount = todayExtras.reduce((sum, r) => sum + (r.count || 1), 0);
        const baseCount = todayRecord?.count || 0;
        const total = baseCount + extraCount;
        return {
            hasMeal: !!todayRecord,
            mealRecord: todayRecord,
            mealCount: baseCount,
            extraMealCount: extraCount,
            totalMeals: total,
            hasReachedMealLimit: total >= MAX_TOTAL_MEALS_PER_DAY,
            hasReachedExtraMealLimit: extraCount >= MAX_EXTRA_MEALS_PER_DAY,
        };
    }, [mealRecords, extraMealRecords, guest.id, today]);

    const localServiceStatus = useMemo(() => {
        if (serviceStatusMap) return defaultServiceStatus;
        const shower = showerRecords.find(
            (r) => r.guestId === guest.id && pacificDateStringFrom(r.date) === today
        );
        const laundry = laundryRecords.find(
            (r) => r.guestId === guest.id && pacificDateStringFrom(r.date) === today
        );
        const bicycle = (bicycleRecords || []).find(
            (r) => r.guestId === guest.id && pacificDateStringFrom(r.date) === today
        );
        const haircut = (haircutRecords || []).find(
            (r) => r.guestId === guest.id && pacificDateStringFrom(r.date) === today
        );
        const holiday = (holidayRecords || []).find(
            (r) => r.guestId === guest.id && pacificDateStringFrom(r.date) === today
        );
        return {
            hasShower: !!shower,
            hasLaundry: !!laundry,
            hasBicycle: !!bicycle,
            hasHaircut: !!haircut,
            hasHoliday: !!holiday,
            showerRecord: shower ? { id: shower.id, time: shower.time, status: shower.status } : undefined,
            laundryRecord: laundry ? { id: laundry.id, time: laundry.time, status: laundry.status } : undefined,
            bicycleRecord: bicycle ? { id: bicycle.id, status: bicycle.status } : undefined,
            haircutRecord: haircut ? { id: haircut.id } : undefined,
            holidayRecord: holiday ? { id: holiday.id } : undefined,
        };
    }, [showerRecords, laundryRecords, bicycleRecords, haircutRecords, holidayRecords, guest.id, today]);

    const localActionStatus = useMemo(() => {
        if (actionStatusMap) return defaultActionStatus;
        const actions = getActionsForGuestToday(guest.id);
        return {
            mealActionId: actions.find(a => a.type === 'MEAL_ADDED' && pacificDateStringFrom(a.timestamp) === today)?.id,
            showerActionId: actions.find(a => a.type === 'SHOWER_BOOKED' && pacificDateStringFrom(a.timestamp) === today)?.id,
            laundryActionId: actions.find(a => a.type === 'LAUNDRY_BOOKED' && pacificDateStringFrom(a.timestamp) === today)?.id,
            bicycleActionId: actions.find(a => a.type === 'BICYCLE_LOGGED' && pacificDateStringFrom(a.timestamp) === today)?.id,
            haircutActionId: actions.find(a => a.type === 'HAIRCUT_LOGGED' && pacificDateStringFrom(a.timestamp) === today)?.id,
            holidayActionId: actions.find(a => a.type === 'HOLIDAY_LOGGED' && pacificDateStringFrom(a.timestamp) === today)?.id,
        };
    }, [getActionsForGuestToday, guest.id, today]);

    // Use precomputed maps if provided, otherwise use local calculation
    const mealStatus: TodayMealStatus = mealStatusMap 
        ? (mealStatusMap.get(guest.id) || defaultMealStatus)
        : localMealStatus;

    const serviceStatus: TodayServiceStatus = serviceStatusMap
        ? (serviceStatusMap.get(guest.id) || defaultServiceStatus)
        : localServiceStatus;

    const actionStatus: TodayGuestActions = actionStatusMap
        ? (actionStatusMap.get(guest.id) || defaultActionStatus)
        : localActionStatus;

    // Extract values for easier use
    const todayMeal = mealStatus.mealRecord;
    const baseMealCount = mealStatus.mealCount;
    const extraMealsCount = mealStatus.extraMealCount;
    const totalMeals = mealStatus.totalMeals;
    const hasReachedMealLimit = mealStatus.hasReachedMealLimit;
    const hasReachedExtraMealLimit = mealStatus.hasReachedExtraMealLimit;

    const todayShower = serviceStatus.hasShower;
    const todayLaundry = serviceStatus.hasLaundry;
    const todayBicycle = serviceStatus.hasBicycle;
    const todayHaircut = serviceStatus.hasHaircut;
    const todayHoliday = serviceStatus.hasHoliday;

    const mealAction = actionStatus.mealActionId ? { id: actionStatus.mealActionId } : undefined;
    const showerAction = actionStatus.showerActionId ? { id: actionStatus.showerActionId } : undefined;
    const laundryAction = actionStatus.laundryActionId ? { id: actionStatus.laundryActionId } : undefined;
    const bicycleAction = actionStatus.bicycleActionId ? { id: actionStatus.bicycleActionId } : undefined;
    const haircutAction = actionStatus.haircutActionId ? { id: actionStatus.haircutActionId } : undefined;
    const holidayAction = actionStatus.holidayActionId ? { id: actionStatus.holidayActionId } : undefined;

    const hasServiceToday = !!todayMeal || todayShower || todayLaundry || todayBicycle;
    const isBanned = guest.isBanned;

    // Check program-specific bans
    const isBannedFromMeals = isBanned && (guest.bannedFromMeals || (!guest.bannedFromMeals && !guest.bannedFromShower && !guest.bannedFromLaundry && !guest.bannedFromBicycle));
    const isBannedFromShower = isBanned && (guest.bannedFromShower || (!guest.bannedFromMeals && !guest.bannedFromShower && !guest.bannedFromLaundry && !guest.bannedFromBicycle));
    const isBannedFromLaundry = isBanned && (guest.bannedFromLaundry || (!guest.bannedFromMeals && !guest.bannedFromShower && !guest.bannedFromLaundry && !guest.bannedFromBicycle));
    const isBannedFromBicycle = isBanned && (guest.bannedFromBicycle || (!guest.bannedFromMeals && !guest.bannedFromShower && !guest.bannedFromLaundry && !guest.bannedFromBicycle));

    const handleMealAdd = async (e: React.MouseEvent, count: number) => {
        e.stopPropagation();
        if (todayMeal || isPending || isBannedFromMeals) return;

        setIsPending(true);
        try {
            const record = await addMealRecord(guest.id, count);
            addAction('MEAL_ADDED', { recordId: record.id, guestId: guest.id });
            toast.success(`${count} meal${count > 1 ? 's' : ''} logged for ${guest.preferredName || guest.firstName}`);
        } catch (error: any) {
            toast.error(error.message || 'Failed to log meals');
        } finally {
            setIsPending(false);
        }
    };

    const handleExtraMealAdd = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isPending || isBannedFromMeals || hasReachedMealLimit || hasReachedExtraMealLimit) return;

        // Require explicit confirmation to prevent accidental extra meal additions
        const confirmed = window.confirm(
            `Add an extra meal for ${guest.preferredName || guest.firstName}?\n\nThis is in addition to the ${baseMealCount} meal${baseMealCount !== 1 ? 's' : ''} already logged.`
        );
        if (!confirmed) return;

        setIsPending(true);
        try {
            const record = await addExtraMealRecord(guest.id, 1);
            if (record && record.id) {
                addAction('EXTRA_MEALS_ADDED', { recordId: record.id, guestId: guest.id });
                toast.success(`Extra meal logged for ${guest.preferredName || guest.firstName}`);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to log extra meal');
        } finally {
            setIsPending(false);
        }
    };

    const handleUndo = async (e: React.MouseEvent, actionId: string, label: string) => {
        e.stopPropagation();
        if (isPending) return;

        // Simple haptic feedback if available (simulated)
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(50);
        }

        setIsPending(true);
        try {
            const success = await undoAction(actionId);
            if (success) {
                toast.success(`${label} undone`);
            } else {
                toast.error(`Failed to undo ${label.toLowerCase()}`);
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setIsPending(false);
        }
    };

    const toggleExpand = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (compact) return;
        const next = !isExpanded;
        setIsExpanded(next);
        onExpandedChange?.(guest.id, next);
        if (onSelect) onSelect();
    };

    const handleHaircutAdd = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isPending || isBanned) return; // Blanket ban check

        setIsPending(true);
        try {
            const record = await addHaircutRecord(guest.id);
            if (record && record.id) {
                addAction('HAIRCUT_LOGGED', { recordId: record.id, guestId: guest.id });
                toast.success(`Haircut logged for ${guest.preferredName || guest.firstName}`);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to log haircut');
        } finally {
            setIsPending(false);
        }
    };

    const handleHolidayAdd = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isPending || isBanned) return;

        setIsPending(true);
        try {
            const record = await addHolidayRecord(guest.id);
            if (record && record.id) {
                addAction('HOLIDAY_LOGGED', { recordId: record.id, guestId: guest.id });
                toast.success(`Holiday visit logged for ${guest.preferredName || guest.firstName}`);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to log holiday visit');
        } finally {
            setIsPending(false);
        }
    };

    const handleCompleteCheckIn = (e: React.MouseEvent) => {
        e.stopPropagation();
        const servicesParts = [];
        if (totalMeals > 0) servicesParts.push(`${totalMeals} meal${totalMeals > 1 ? 's' : ''}`);
        if (todayShower) servicesParts.push('shower');
        if (todayLaundry) servicesParts.push('laundry');
        if (todayBicycle) servicesParts.push('bicycle');
        const servicesSummary = servicesParts.join(' + ');

        toast.success(`${servicesSummary} ✓`);
        if (onClearSearch) onClearSearch();
    };

    // Conditionally wrap in motion.div for layout animation
    // When disableLayoutAnimation is true, use a plain div for better performance
    const CardWrapper = disableLayoutAnimation ? 'div' : motion.div;
    const cardWrapperProps = disableLayoutAnimation 
        ? {} 
        : { layout: true };

    return (
        <CardWrapper
            {...cardWrapperProps}
            className={cn(
                'group relative overflow-hidden transition-all duration-300 border bg-white',
                compact ? 'rounded-lg' : 'rounded-2xl',
                isSelected ? 'ring-2 ring-emerald-500/50 border-emerald-400 shadow-lg' : 'border-gray-100 shadow-sm hover:border-emerald-200 hover:shadow-md',
                isBanned ? 'border-red-200 bg-red-50/30' : ''
            )}
        >
            <div
                className={cn(
                    'flex items-center justify-between gap-3 p-4 cursor-pointer',
                    compact && 'p-3'
                )}
                onClick={toggleExpand}
            >
                {/* Left: Avatar & Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                        'flex items-center justify-center rounded-xl border shrink-0 transition-transform group-hover:scale-105',
                        compact ? 'w-10 h-10' : 'w-12 h-12',
                        isBanned ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                    )}>
                        <User size={compact ? 20 : 24} />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={cn(
                                'font-bold text-gray-900 truncate',
                                compact ? 'text-sm' : 'text-base'
                            )}>
                                {guest.preferredName || guest.name}
                            </h3>

                            {/* Badges */}
                            <div className="flex items-center gap-1 flex-wrap">
                                {(() => {
                                    const isNewGuest = guest.createdAt && pacificDateStringFrom(guest.createdAt) === today;
                                    return isNewGuest ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold animate-pulse">
                                            ✨ NEW
                                        </span>
                                    ) : null;
                                })()}
                                {warningBadgeCount > 0 && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                        <AlertTriangle size={10} />
                                        {warningBadgeCount}
                                    </span>
                                )}
                                {reminderBadgeCount > 0 && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setShowReminderModal(true); }}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200 text-[10px] font-bold hover:from-blue-100 hover:to-purple-100 transition-colors"
                                    >
                                        <Bell size={10} className="animate-pulse" />
                                        {reminderBadgeCount}
                                    </button>
                                )}
                                {linkedBadgeCount > 0 && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                                        <Link2 size={10} />
                                        {linkedBadgeCount}
                                    </span>
                                )}
                                {isBanned && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                                        <Ban size={10} />
                                        BANNED
                                    </span>
                                )}
                                {/* Recent Badge (Active in last 7 days) - uses precomputed map for efficiency */}
                                {(() => {
                                    // Use precomputed map if available, otherwise compute locally
                                    const isRecent = recentGuestsMap ? recentGuestsMap.has(guest.id) : false;
                                    
                                    // Don't show "Recent" badge if guest already has meal today (redundant info)
                                    if (isRecent && !mealStatus.hasMeal) {
                                        return (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold">
                                                <Utensils size={10} />
                                                RECENT
                                            </span>
                                        );
                                    }
                                    return null;
                                })()}
                                {totalMeals > 0 && (
                                    <span className={cn(
                                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold",
                                        isPending && "animate-success-pulse"
                                    )}>
                                        <Check size={10} />
                                        {totalMeals} MEAL{totalMeals > 1 ? 'S' : ''}
                                    </span>
                                )}
                                {todayShower && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold">
                                        <ShowerHead size={10} />
                                        SHOWER{serviceStatus.showerRecord?.time ? ` @ ${serviceStatus.showerRecord.time}` : ''}
                                    </span>
                                )}
                                {todayLaundry && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                                        <WashingMachine size={10} />
                                        LAUNDRY{serviceStatus.laundryRecord?.time ? ` @ ${serviceStatus.laundryRecord.time}` : ''}
                                    </span>
                                )}
                                {todayHaircut && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                                        <Scissors size={10} />
                                        HAIRCUT
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Guest details */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50/60 rounded-md border border-blue-100/50 text-xs text-gray-600">
                                <Home size={12} className="text-blue-500" />
                                {guest.housingStatus}
                            </span>
                            {guest.location && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50/60 rounded-md border border-amber-100/50 text-xs text-gray-600">
                                    <MapPin size={12} className="text-amber-500" />
                                    {guest.location}
                                </span>
                            )}
                            {guest.gender && (
                                <span className="px-2 py-0.5 bg-purple-50/60 text-purple-700 rounded-md border border-purple-100/50 text-xs font-medium">
                                    {guest.gender.charAt(0)}
                                </span>
                            )}
                            {guest.age && (
                                <span className="px-2 py-0.5 bg-teal-50/60 text-teal-700 rounded-md border border-teal-100/50 text-xs font-medium">
                                    {guest.age}
                                </span>
                            )}
                            {/* Last Check-in */}
                            {(() => {
                                const lastMeal = mealRecords
                                    .filter(r => r.guestId === guest.id)
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

                                if (lastMeal) {
                                    const date = new Date(lastMeal.date);
                                    const now = new Date();
                                    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

                                    let timeString = '';
                                    if (diffDays === 0) timeString = 'Today';
                                    else if (diffDays === 1) timeString = 'Yesterday';
                                    else if (diffDays < 7) timeString = `${diffDays}d ago`;
                                    else timeString = date.toLocaleDateString();

                                    return (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 rounded-md border border-gray-100 text-[10px] font-medium text-gray-500 ml-auto sm:ml-0" title={`Last meal: ${date.toLocaleString()}`}>
                                            <Utensils size={10} className="text-gray-400" />
                                            Last: {timeString}
                                        </span>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Mobile Quick Add Button - only visible on small screens */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMobileSheet(true);
                        }}
                        className="flex md:hidden items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 active:scale-95 transition-transform touch-manipulation"
                        title="Quick Add Services"
                        aria-label="Quick add services"
                    >
                        <Plus size={22} strokeWidth={2.5} />
                    </button>

                    {/* Meal Buttons - hidden on mobile */}
                    {!isBannedFromMeals && !compact && (
                        <div className="hidden md:flex">
                            {!todayMeal ? (
                                <div className="flex items-center gap-1 px-1 py-1 bg-gray-50 rounded-xl border border-gray-100 shadow-inner">
                                    {[1, 2].map((count) => (
                                        <button
                                            key={count}
                                            onClick={(e) => handleMealAdd(e, count)}
                                            disabled={isPending}
                                            className="flex items-center justify-center gap-1 h-10 px-3 rounded-lg bg-white border border-gray-200 text-emerald-700 font-bold text-sm shadow-sm hover:border-emerald-300 hover:bg-emerald-50 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Utensils size={14} />}
                                            <span>{count}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 px-1 py-1 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                        <div className="flex items-center justify-center gap-1 h-10 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm">
                                            <Check size={14} />
                                            <span>{baseMealCount}</span>
                                            {extraMealsCount > 0 && (
                                                <span className="text-orange-600 text-xs ml-0.5">+{extraMealsCount}</span>
                                            )}
                                        </div>
                                        {mealAction && (
                                            <button
                                                onClick={(e) => handleUndo(e, mealAction.id, 'Check-in')}
                                                disabled={isPending}
                                                className="flex items-center justify-center h-10 px-2 rounded-lg bg-orange-100 border border-orange-200 text-orange-700 hover:bg-orange-200 transition-all active:scale-95 disabled:opacity-50"
                                                title="Undo Check-in"
                                            >
                                                <RotateCcw size={16} />
                                            </button>
                                        )}
                                    </div>
                                    {hasReachedMealLimit || hasReachedExtraMealLimit ? (
                                        <div
                                            className="flex items-center justify-center gap-1 h-10 px-3 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 text-gray-400 font-bold text-xs cursor-not-allowed"
                                            title={`Daily meal limit reached (${totalMeals}/${4})`}
                                        >
                                            <span>Limit</span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleExtraMealAdd}
                                            disabled={isPending}
                                            className="flex items-center justify-center gap-1 h-10 px-3 rounded-lg bg-orange-50 border-2 border-dashed border-orange-300 text-orange-600 font-bold text-xs hover:bg-orange-100 hover:border-orange-400 transition-all active:scale-95 disabled:opacity-50"
                                            title="Add extra meal (requires confirmation)"
                                        >
                                            <Plus size={14} />
                                            <span>Extra</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Quick Service Buttons - hidden on mobile */}
                    {!compact && (
                        <div className="hidden md:flex items-center gap-1 px-1 py-1 bg-gray-50 rounded-xl border border-gray-100 shadow-inner">
                            {/* Shower */}
                            {!isBannedFromShower && (
                                todayShower ? (
                                    <div className="flex items-center justify-center gap-1 h-10 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm opacity-90">
                                        <Check size={14} />
                                        <ShowerHead size={14} />
                                        {showerAction && (
                                            <button
                                                onClick={(e) => handleUndo(e, showerAction.id, 'Shower booking')}
                                                className="ml-1 p-1 hover:bg-red-100 rounded text-red-500 transition-colors"
                                                title="Undo shower"
                                            >
                                                <RotateCcw size={12} />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowerPickerGuest(guest); }}
                                        className="flex items-center justify-center h-10 px-3 rounded-lg bg-white border border-gray-200 text-sky-600 font-bold text-sm hover:border-sky-300 hover:bg-sky-50 transition-all active:scale-95"
                                    >
                                        <ShowerHead size={16} />
                                    </button>
                                )
                            )}
                            {/* Laundry */}
                            {!isBannedFromLaundry && (
                                todayLaundry ? (
                                    <div className="flex items-center justify-center gap-1 h-10 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm opacity-90">
                                        <Check size={14} />
                                        <WashingMachine size={14} />
                                        {laundryAction && (
                                            <button
                                                onClick={(e) => handleUndo(e, laundryAction.id, 'Laundry booking')}
                                                className="ml-1 p-1 hover:bg-red-100 rounded text-red-500 transition-colors"
                                                title="Undo laundry"
                                            >
                                                <RotateCcw size={12} />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setLaundryPickerGuest(guest); }}
                                        className="flex items-center justify-center h-10 px-3 rounded-lg bg-white border border-gray-200 text-indigo-600 font-bold text-sm hover:border-indigo-300 hover:bg-indigo-50 transition-all active:scale-95"
                                    >
                                        <WashingMachine size={16} />
                                    </button>
                                )
                            )}
                        </div>
                    )}

                    {/* Complete Check-in Button - separated from undo to prevent confusion */}
                    {hasServiceToday && !compact && (
                        <>
                            {/* Visual separator to distinguish from undo button */}
                            <div className="w-px h-8 bg-gray-200 mx-1" aria-hidden="true"></div>
                            <button
                                onClick={handleCompleteCheckIn}
                                className="flex items-center justify-center h-10 px-3 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold transition-all active:scale-95"
                                title="Complete check-in and search for next guest"
                            >
                                <UserCheck size={20} />
                            </button>
                        </>
                    )}

                    <div className={cn(
                        "p-2 rounded-xl bg-gray-50 border border-gray-100 text-gray-400 group-hover:text-emerald-500 transition-colors",
                        compact && "p-1.5"
                    )}>
                        {isExpanded ? <ChevronUp size={compact ? 16 : 20} /> : <ChevronDown size={compact ? 16 : 20} />}
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-gray-100 bg-gray-50/30 overflow-hidden"
                    >
                        <div className="p-4 space-y-4">
                            {/* Ban Status */}
                            {isBanned ? (
                                <div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-start gap-3">
                                    <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-red-700">
                                            Guest is banned
                                            {guest.bannedUntil && ` until ${new Date(guest.bannedUntil).toLocaleDateString()}`}
                                        </p>
                                        {guest.banReason && (
                                            <p className="text-sm text-red-600 mt-1">Reason: {guest.banReason}</p>
                                        )}
                                    </div>
                                </div>
                            ) : null}

                            {/* Services Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowerPickerGuest(guest); }}
                                    disabled={isBannedFromShower || !!todayShower}
                                    className={cn(
                                        "relative flex flex-col items-center justify-center p-4 rounded-xl border shadow-sm transition-all",
                                        todayShower
                                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                            : isBannedFromShower
                                                ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                                                : "bg-white border-gray-100 hover:border-sky-200 hover:bg-sky-50"
                                    )}
                                >
                                    {todayShower ? (
                                        <>
                                            <Check size={20} className="text-emerald-500 mb-1.5" />
                                            {showerAction && (
                                                <span onClick={(e) => handleUndo(e, showerAction.id, 'Shower booking')} className="absolute top-2 right-2 text-red-400 hover:text-red-600">
                                                    <RotateCcw size={14} />
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <ShowerHead size={20} className={isBannedFromShower ? "text-gray-400 mb-1.5" : "text-sky-500 mb-1.5"} />
                                    )}
                                    <span className="text-xs font-bold">{todayShower ? 'Shower ✓' : 'Shower'}</span>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setLaundryPickerGuest(guest); }}
                                    disabled={isBannedFromLaundry || !!todayLaundry}
                                    className={cn(
                                        "relative flex flex-col items-center justify-center p-4 rounded-xl border shadow-sm transition-all",
                                        todayLaundry
                                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                            : isBannedFromLaundry
                                                ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                                                : "bg-white border-gray-100 hover:border-indigo-200 hover:bg-indigo-50"
                                    )}
                                >
                                    {todayLaundry ? (
                                        <>
                                            <Check size={20} className="text-emerald-500 mb-1.5" />
                                            {laundryAction && (
                                                <span onClick={(e) => handleUndo(e, laundryAction.id, 'Laundry booking')} className="absolute top-2 right-2 text-red-400 hover:text-red-600">
                                                    <RotateCcw size={14} />
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <WashingMachine size={20} className={isBannedFromLaundry ? "text-gray-400 mb-1.5" : "text-indigo-500 mb-1.5"} />
                                    )}
                                    <span className="text-xs font-bold">{todayLaundry ? 'Laundry ✓' : 'Laundry'}</span>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setBicyclePickerGuest(guest); }}
                                    disabled={isBannedFromBicycle || !!todayBicycle}
                                    className={cn(
                                        "relative flex flex-col items-center justify-center p-4 rounded-xl border shadow-sm transition-all",
                                        todayBicycle
                                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                            : isBannedFromBicycle
                                                ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                                                : "bg-white border-gray-100 hover:border-amber-200 hover:bg-amber-50"
                                    )}
                                >
                                    {todayBicycle ? (
                                        <>
                                            <Check size={20} className="text-emerald-500 mb-1.5" />
                                            {bicycleAction && (
                                                <span onClick={(e) => handleUndo(e, bicycleAction.id, 'Bicycle booking')} className="absolute top-2 right-2 text-red-400 hover:text-red-600">
                                                    <RotateCcw size={14} />
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <Bike size={20} className={isBannedFromBicycle ? "text-gray-400 mb-1.5" : "text-amber-500 mb-1.5"} />
                                    )}
                                    <span className="text-xs font-bold text-gray-700">{todayBicycle ? 'Bicycle ✓' : 'Bicycle'}</span>
                                </button>
                            </div>

                            {/* Extra Meal - separated from main services to prevent accidental taps */}
                            {todayMeal && (
                                <div className="mt-2 pt-2 border-t border-dashed border-orange-200">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-1.5">Extra Meals</p>
                                    {hasReachedMealLimit || hasReachedExtraMealLimit ? (
                                        <div className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 text-gray-400 font-bold text-sm">
                                            <span>Daily meal limit reached ({totalMeals}/{4})</span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleExtraMealAdd}
                                            disabled={isPending || isBannedFromMeals}
                                            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-orange-50 border-2 border-dashed border-orange-300 text-orange-700 font-bold text-sm hover:bg-orange-100 hover:border-orange-400 transition-all disabled:opacity-50"
                                        >
                                            <Plus size={16} />
                                            <span>Add Extra Meal</span>
                                            {extraMealsCount > 0 && (
                                                <span className="ml-1 px-1.5 py-0.5 bg-orange-200 rounded-full text-[10px] font-black">{extraMealsCount} added</span>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Linked Guests Manager */}
                            <LinkedGuestsList guestId={guest.id} className="mb-4" />

                            {/* Warnings (store-driven, mounted only when expanded) */}
                            <GuestWarningsPanel guestId={guest.id} />

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 flex-wrap">
                                {todayHaircut ? (
                                    <div className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg">
                                        <Check size={14} />
                                        Haircut
                                        {haircutAction && (
                                            <button
                                                onClick={(e) => handleUndo(e, haircutAction.id, 'Haircut')}
                                                className="ml-1 p-0.5 hover:bg-red-100 rounded text-red-500 transition-colors"
                                                title="Undo haircut"
                                            >
                                                <RotateCcw size={12} />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleHaircutAdd}
                                        disabled={isPending || isBanned}
                                        className={cn(
                                            "inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-colors border border-transparent",
                                            isBanned
                                                ? "text-gray-400 cursor-not-allowed"
                                                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                        )}
                                    >
                                        <Scissors size={14} />
                                        Haircut
                                    </button>
                                )}

                                {todayHoliday ? (
                                    <div className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold text-pink-700 bg-pink-50 border border-pink-200 rounded-lg">
                                        <Check size={14} />
                                        Holiday
                                        {holidayAction && (
                                            <button
                                                onClick={(e) => handleUndo(e, holidayAction.id, 'Holiday visit')}
                                                className="ml-1 p-0.5 hover:bg-red-100 rounded text-red-500 transition-colors"
                                                title="Undo holiday visit"
                                            >
                                                <RotateCcw size={12} />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleHolidayAdd}
                                        disabled={isPending || isBanned}
                                        className={cn(
                                            "inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-colors border border-transparent",
                                            isBanned
                                                ? "text-gray-400 cursor-not-allowed"
                                                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                        )}
                                    >
                                        <Gift size={14} />
                                        Holiday Service
                                    </button>
                                )}

                                <span className="w-px h-4 bg-gray-200 mx-1"></span>

                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowReminderModal(true); }}
                                    className={cn(
                                        "inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-colors",
                                        reminderBadgeCount > 0
                                            ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                                            : "text-blue-600 hover:bg-blue-50"
                                    )}
                                >
                                    <Bell size={14} />
                                    Reminders
                                    {reminderBadgeCount > 0 && (
                                        <span className="ml-0.5 px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded-full text-[9px] font-black">
                                            {reminderBadgeCount}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowWarningModal(true); }}
                                    className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                >
                                    <AlertTriangle size={14} />
                                    Warnings
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowEditModal(true); }}
                                    className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <Edit size={14} />
                                    Edit
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowBanModal(true); }}
                                    className={cn(
                                        "inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-colors",
                                        isBanned
                                            ? "text-emerald-600 hover:bg-emerald-50"
                                            : "text-red-600 hover:bg-red-50"
                                    )}
                                >
                                    <Ban size={14} />
                                    {isBanned ? 'Manage Ban' : 'Ban'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modals */}
            <AnimatePresence>
                {showEditModal && (
                    <GuestEditModal guest={guest} onClose={() => setShowEditModal(false)} />
                )}
                {showBanModal && (
                    <BanManagementModal guest={guest} onClose={() => setShowBanModal(false)} />
                )}
                {showWarningModal && (
                    <WarningManagementModal guest={guest} onClose={() => setShowWarningModal(false)} />
                )}
                {showReminderModal && (
                    <ReminderManagementModal guest={guest} onClose={() => setShowReminderModal(false)} />
                )}
            </AnimatePresence>

            {/* Mobile Service Sheet */}
            <MobileServiceSheet
                isOpen={showMobileSheet}
                onClose={() => setShowMobileSheet(false)}
                guest={guest}
                onMealSelect={async (guestId, count) => {
                    if (isPending) return;
                    setIsPending(true);
                    try {
                        const record = await addMealRecord(guestId, count);
                        addAction('MEAL_ADDED', { recordId: record.id, guestId });
                        toast.success(`${count} meal${count > 1 ? 's' : ''} logged for ${guest.preferredName || guest.firstName}`);
                    } catch (error: any) {
                        toast.error(error.message || 'Failed to log meals');
                    } finally {
                        setIsPending(false);
                    }
                }}
                hasMealToday={!!todayMeal}
                mealCount={totalMeals}
                isPendingMeal={isPending}
                isBannedFromMeals={isBannedFromMeals}
                onShowerSelect={(g) => setShowerPickerGuest(g)}
                hasShowerToday={!!todayShower}
                isBannedFromShower={isBannedFromShower}
                onLaundrySelect={(g) => setLaundryPickerGuest(g)}
                hasLaundryToday={!!todayLaundry}
                isBannedFromLaundry={isBannedFromLaundry}
            />
        </CardWrapper>
    );
}

function GuestCardImpl(props: GuestCardProps) {
    const { mealStatusMap, serviceStatusMap, actionStatusMap, recentGuestsMap, guest } = props;

    const needsMealRecords = !mealStatusMap || !recentGuestsMap;
    const mealRecords = useMealsStore((s) => (needsMealRecords ? s.mealRecords : EMPTY_ARRAY));
    const extraMealRecords = useMealsStore((s) => (!mealStatusMap ? s.extraMealRecords : EMPTY_ARRAY));

    const needsServiceRecords = !serviceStatusMap;
    const showerRecords = useServicesStore((s) => (needsServiceRecords ? s.showerRecords : EMPTY_ARRAY));
    const laundryRecords = useServicesStore((s) => (needsServiceRecords ? s.laundryRecords : EMPTY_ARRAY));
    const bicycleRecords = useServicesStore((s) => (needsServiceRecords ? (s.bicycleRecords || EMPTY_ARRAY) : EMPTY_ARRAY));
    const haircutRecords = useServicesStore((s) => (needsServiceRecords ? (s.haircutRecords || EMPTY_ARRAY) : EMPTY_ARRAY));
    const holidayRecords = useServicesStore((s) => (needsServiceRecords ? (s.holidayRecords || EMPTY_ARRAY) : EMPTY_ARRAY));

    const { addMealRecord, addExtraMealRecord } = useMealsStore(
        useShallow((s) => ({ addMealRecord: s.addMealRecord, addExtraMealRecord: s.addExtraMealRecord }))
    );
    const { addHaircutRecord, addHolidayRecord } = useServicesStore(
        useShallow((s) => ({ addHaircutRecord: s.addHaircutRecord, addHolidayRecord: s.addHolidayRecord }))
    );
    const { setShowerPickerGuest, setLaundryPickerGuest, setBicyclePickerGuest } = useModalStore(
        useShallow((s) => ({
            setShowerPickerGuest: s.setShowerPickerGuest,
            setLaundryPickerGuest: s.setLaundryPickerGuest,
            setBicyclePickerGuest: s.setBicyclePickerGuest,
        }))
    );
    const { addAction, undoAction, getActionsForGuestToday } = useActionHistoryStore(
        useShallow((s) => ({
            addAction: s.addAction,
            undoAction: s.undoAction,
            getActionsForGuestToday: s.getActionsForGuestToday,
        }))
    );

    const warningsCount = useGuestsStore((s) => {
        if (props.warningsCount != null) return props.warningsCount;
        return (s.warnings || []).filter((w: any) => w.guestId === guest.id && w.active).length;
    });

    const linkedGuestsCount = useGuestsStore((s) => {
        if (props.linkedGuestsCount != null) return props.linkedGuestsCount;
        const linkedIds = new Set<string>();
        for (const p of s.guestProxies || []) {
            if (p.guestId === guest.id) linkedIds.add(p.proxyId);
            if (p.proxyId === guest.id) linkedIds.add(p.guestId);
        }
        return linkedIds.size;
    });

    const activeRemindersCount = useRemindersStore((s) => {
        if (props.activeRemindersCount != null) return props.activeRemindersCount;
        return (s.reminders || []).filter((r: any) => r.guestId === guest.id && !r.dismissedAt).length;
    });

    return (
        <PureGuestCard
            {...props}
            mealRecords={mealRecords}
            extraMealRecords={extraMealRecords}
            showerRecords={showerRecords}
            laundryRecords={laundryRecords}
            bicycleRecords={bicycleRecords}
            haircutRecords={haircutRecords}
            holidayRecords={holidayRecords}
            addMealRecord={addMealRecord}
            addExtraMealRecord={addExtraMealRecord}
            addHaircutRecord={addHaircutRecord}
            addHolidayRecord={addHolidayRecord}
            setShowerPickerGuest={setShowerPickerGuest}
            setLaundryPickerGuest={setLaundryPickerGuest}
            setBicyclePickerGuest={setBicyclePickerGuest}
            addAction={addAction}
            undoAction={undoAction}
            getActionsForGuestToday={getActionsForGuestToday}
            warningsCount={warningsCount}
            linkedGuestsCount={linkedGuestsCount}
            activeRemindersCount={activeRemindersCount}
        />
    );
}

const mealSnapshot = (props: GuestCardProps) => {
    const id = props.guest?.id;
    if (!id) return '';
    const s = props.mealStatusMap?.get(id) || defaultMealStatus;
    return `${s.hasMeal}-${s.mealCount}-${s.extraMealCount}-${s.totalMeals}-${s.hasReachedMealLimit}-${s.hasReachedExtraMealLimit}`;
};

const serviceSnapshot = (props: GuestCardProps) => {
    const id = props.guest?.id;
    if (!id) return '';
    const s = props.serviceStatusMap?.get(id) || defaultServiceStatus;
    return [
        s.hasShower,
        s.hasLaundry,
        s.hasBicycle,
        s.hasHaircut,
        s.hasHoliday,
        s.showerRecord?.id || '',
        s.laundryRecord?.id || '',
        s.bicycleRecord?.id || '',
    ].join('|');
};

const actionSnapshot = (props: GuestCardProps) => {
    const id = props.guest?.id;
    if (!id) return '';
    const s = props.actionStatusMap?.get(id) || defaultActionStatus;
    return [
        s.mealActionId || '',
        s.showerActionId || '',
        s.laundryActionId || '',
        s.bicycleActionId || '',
        s.haircutActionId || '',
        s.holidayActionId || '',
    ].join('|');
};

const recentSnapshot = (props: GuestCardProps) => {
    const id = props.guest?.id;
    if (!id) return '0';
    return props.recentGuestsMap?.has(id) ? '1' : '0';
};

export const GuestCard = memo(GuestCardImpl, (prev, next) => {
    const prevId = prev.guest?.id;
    const nextId = next.guest?.id;
    if (!prevId || !nextId || prevId !== nextId) return false;

    // If the guest object identity changes but none of the rendered fields do, allow memo to skip.
    // Track a few common fields used in rendering.
    const guestFieldsEqual =
        (prev.guest?.preferredName || prev.guest?.name) === (next.guest?.preferredName || next.guest?.name) &&
        prev.guest?.housingStatus === next.guest?.housingStatus &&
        prev.guest?.location === next.guest?.location &&
        prev.guest?.gender === next.guest?.gender &&
        prev.guest?.age === next.guest?.age &&
        prev.guest?.isBanned === next.guest?.isBanned;

    return (
        guestFieldsEqual &&
        prev.isSelected === next.isSelected &&
        prev.compact === next.compact &&
        prev.disableLayoutAnimation === next.disableLayoutAnimation &&
        (prev.warningsCount || 0) === (next.warningsCount || 0) &&
        (prev.linkedGuestsCount || 0) === (next.linkedGuestsCount || 0) &&
        (prev.activeRemindersCount || 0) === (next.activeRemindersCount || 0) &&
        mealSnapshot(prev) === mealSnapshot(next) &&
        serviceSnapshot(prev) === serviceSnapshot(next) &&
        actionSnapshot(prev) === actionSnapshot(next) &&
        recentSnapshot(prev) === recentSnapshot(next)
    );
});
