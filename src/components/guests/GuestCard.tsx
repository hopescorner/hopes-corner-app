'use client';

import { useState, useMemo, memo, useCallback } from 'react';
import { AGE_GROUPS, MAX_EXTRA_MEALS_PER_DAY, MAX_TOTAL_MEALS_PER_DAY } from '@/lib/constants/constants';
import dynamic from 'next/dynamic';
import {
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
    Bell,
    Clock,
    History,
    Sparkles,
    Users,
    ListPlus,
    ArrowRight,
    Mars,
    Venus,
    CircleHelp,
    NonBinary
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';
import { getGuestInitials, getGuestAvatarColor } from '@/lib/utils/guestAvatar';
import { findNextAvailableShowerSlot, findNextAvailableLaundrySlot, type NextAvailableShowerSlot, type NextAvailableLaundrySlot } from '@/lib/utils/nextAvailableSlot';
import { useBlockedSlotsStore } from '@/stores/useBlockedSlotsStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useModalStore } from '@/stores/useModalStore';
import { useActionHistoryStore } from '@/stores/useActionHistoryStore';
import { useRemindersStore } from '@/stores/useRemindersStore';
import { useCheckInStore } from '@/stores/useCheckInStore';
import { executeOptimisticMeal } from '@/lib/checkin/clientCommands';
import type { CheckInGuestContext } from '@/types/checkin';
import type { 
    MealStatusMap, 
    ServiceStatusMap, 
    ActionStatusMap,
    RecentGuestsMap,
    LastVisitDateMap,
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

const LinkedGuestsList = dynamic(() => import('./LinkedGuestsList'));
const GuestEditModal = dynamic(() => import('@/components/modals/GuestEditModal').then((module) => module.GuestEditModal));
const BanManagementModal = dynamic(() => import('@/components/modals/BanManagementModal').then((module) => module.BanManagementModal));
const WarningManagementModal = dynamic(() => import('@/components/modals/WarningManagementModal').then((module) => module.WarningManagementModal));
const ReminderManagementModal = dynamic(() => import('@/components/modals/ReminderManagementModal').then((module) => module.ReminderManagementModal));
const GuestHistoryModal = dynamic(() => import('@/components/modals/GuestHistoryModal').then((module) => module.GuestHistoryModal));
const MobileServiceSheet = dynamic(() => import('@/components/checkin/MobileServiceSheet').then((module) => module.MobileServiceSheet));
import { GuestBanNotice } from './GuestBanNotice';
import { getGuestBanDetails } from '@/lib/utils/banUtils';

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
    /** Precomputed map of guestId → most recent service date (YYYY-MM-DD) across all service types. */
    lastVisitDateMap?: LastVisitDateMap;
    // Precomputed next available shower and laundry slots
    nextAvailableShowerSlot?: NextAvailableShowerSlot | null;
    nextAvailableLaundrySlot?: NextAvailableLaundrySlot | null;
    // Disable layout animations for better performance in large lists
    disableLayoutAnimation?: boolean;

    // Optional precomputed per-guest counts to avoid per-card store subscriptions
    warningsCount?: number;
    linkedGuestsCount?: number;
    activeRemindersCount?: number;

    // Optional expansion callback (useful for list virtualization measurement)
    onExpandedChange?: (guestId: string, expanded: boolean) => void;

    // Called when the staff completes a check-in and wants to advance to the next result.
    onAdvanceToNext?: (guestId: string) => void;
}

type PureGuestCardProps = GuestCardProps & {
    mealRecords: any[];
    extraMealRecords: any[];
    showerRecords: any[];
    laundryRecords: any[];
    bicycleRecords: any[];
    haircutRecords: any[];
    holidayRecords: any[];

    addMealRecord: (guestId: string, count?: number, pickedUpByGuestId?: string | null, serviceDate?: string) => Promise<any>;
    addExtraMealRecord: (guestId: string, count?: number) => Promise<any>;
    addShowerRecord?: (guestId: string, slotTime: string) => Promise<any>;
    addShowerWaitlist?: (guestId: string) => Promise<any>;
    addLaundryRecord?: (guestId: string, type: 'onsite' | 'offsite', slotTime?: string, bagNumber?: string) => Promise<any>;
    addHaircutRecord: (guestId: string, options?: { serviceDate?: string; slotTime?: string; stylistName?: string }) => Promise<any>;
    addHolidayRecord: (guestId: string) => Promise<any>;
    isSlotBlocked?: (serviceType: 'shower' | 'laundry', slot: string, date: string) => boolean;

    setShowerPickerGuest: (guest: any) => void;
    setLaundryPickerGuest: (guest: any) => void;
    setBicyclePickerGuest: (guest: any) => void;

    addAction: (type: any, data?: any) => void;
    undoAction: (actionId: string) => Promise<any>;
    getActionsForGuestToday: (guestId: string) => any[];
    loadGuestContext?: () => Promise<void>;
};

const EMPTY_ARRAY: any[] = [];

const normalizeGuestName = (value?: string | null) => value?.trim().replace(/\s+/g, ' ').toLowerCase() || '';

const getGuestFullName = (guest: { name?: string; firstName?: string; lastName?: string }) =>
    guest.name?.trim() || `${guest.firstName || ''} ${guest.lastName || ''}`.trim();

const getGuestDisplayName = (guest: { preferredName?: string; name?: string; firstName?: string; lastName?: string }) =>
    guest.preferredName?.trim() || getGuestFullName(guest) || 'Unknown';

const getGuestAgeRange = (value: unknown) => {
    if (value === null || value === undefined) return '';

    const normalizedValue = String(value).trim();
    if (!/^\d+$/.test(normalizedValue)) return normalizedValue;

    const exactAge = Number(normalizedValue);
    if (exactAge <= 17) return AGE_GROUPS[2];
    if (exactAge <= 59) return AGE_GROUPS[0];
    return AGE_GROUPS[1];
};

const getGuestGenderPresentation = (value: unknown) => {
    const gender = String(value || '').trim();

    switch (gender.toLowerCase()) {
        case 'male':
            return { Icon: Mars, shortLabel: 'M' };
        case 'female':
            return { Icon: Venus, shortLabel: 'F' };
        case 'non-binary':
            return { Icon: NonBinary, shortLabel: 'NB' };
        case 'unknown':
            return { Icon: CircleHelp, shortLabel: 'Unknown' };
        default:
            return { Icon: CircleHelp, shortLabel: gender };
    }
};

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
    lastVisitDateMap,
    nextAvailableShowerSlot: propNextAvailableShowerSlot,
    nextAvailableLaundrySlot: propNextAvailableLaundrySlot,
    disableLayoutAnimation = false,
    warningsCount,
    linkedGuestsCount,
    activeRemindersCount,
    onExpandedChange,
    onAdvanceToNext,
    mealRecords,
    extraMealRecords,
    showerRecords,
    laundryRecords,
    bicycleRecords,
    haircutRecords,
    holidayRecords,
    addMealRecord,
    addExtraMealRecord,
    addShowerRecord,
    addShowerWaitlist,
    addLaundryRecord,
    addHaircutRecord,
    addHolidayRecord,
    isSlotBlocked,
    setShowerPickerGuest,
    setLaundryPickerGuest,
    setBicyclePickerGuest,
    addAction,
    undoAction,
    getActionsForGuestToday,
    loadGuestContext,
}: PureGuestCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showBanModal, setShowBanModal] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showMobileSheet, setShowMobileSheet] = useState(false);

    const warningBadgeCount = warningsCount ?? 0;
    const linkedBadgeCount = linkedGuestsCount ?? 0;
    const reminderBadgeCount = activeRemindersCount ?? 0;

    const today = todayPacificDateString();
    const [haircutDate, setHaircutDate] = useState(today);
    const displayName = getGuestDisplayName(guest);
    const fullName = getGuestFullName(guest);
    const showFullName = Boolean(fullName) && normalizeGuestName(displayName) !== normalizeGuestName(fullName);
    const ageRange = getGuestAgeRange(guest.age);
    const genderPresentation = getGuestGenderPresentation(guest.gender);

    const blockedSlotFn = useMemo(() => isSlotBlocked || (() => false), [isSlotBlocked]);

    const computedNextAvailableShowerSlot = useMemo(() => {
        if (propNextAvailableShowerSlot !== undefined) return null;
        return findNextAvailableShowerSlot(showerRecords, blockedSlotFn, today);
    }, [propNextAvailableShowerSlot, showerRecords, blockedSlotFn, today]);

    const nextAvailableShowerSlot = propNextAvailableShowerSlot !== undefined
        ? propNextAvailableShowerSlot
        : computedNextAvailableShowerSlot;

    const computedNextAvailableLaundrySlot = useMemo(() => {
        if (propNextAvailableLaundrySlot !== undefined) return null;
        return findNextAvailableLaundrySlot(laundryRecords, blockedSlotFn, today);
    }, [propNextAvailableLaundrySlot, laundryRecords, blockedSlotFn, today]);

    const nextAvailableLaundrySlot = propNextAvailableLaundrySlot !== undefined
        ? propNextAvailableLaundrySlot
        : computedNextAvailableLaundrySlot;

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
            (r) =>
                r.guestId === guest.id &&
                pacificDateStringFrom(r.date) === today &&
                r.status !== 'cancelled' &&
                r.status !== 'no_show'
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
            extraMealActionId: actions.find(a => a.type === 'EXTRA_MEALS_ADDED' && pacificDateStringFrom(a.timestamp) === today)?.id,
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

    // Check if the guest already has a haircut for the selected haircutDate
    const hasHaircutForSelectedDate = useMemo(() => {
        if (haircutDate === today) return todayHaircut;
        return (haircutRecords || []).some(
            (r) => r.guestId === guest.id && (r.serviceDate || r.dateKey || pacificDateStringFrom(r.date)) === haircutDate
        );
    }, [haircutRecords, guest.id, haircutDate, today, todayHaircut]);

    const mealAction = actionStatus.mealActionId ? { id: actionStatus.mealActionId } : undefined;
    const extraMealAction = actionStatus.extraMealActionId ? { id: actionStatus.extraMealActionId } : undefined;
    const showerAction = actionStatus.showerActionId ? { id: actionStatus.showerActionId } : undefined;
    const laundryAction = actionStatus.laundryActionId ? { id: actionStatus.laundryActionId } : undefined;
    const bicycleAction = actionStatus.bicycleActionId ? { id: actionStatus.bicycleActionId } : undefined;
    const haircutAction = actionStatus.haircutActionId ? { id: actionStatus.haircutActionId } : undefined;
    const holidayAction = actionStatus.holidayActionId ? { id: actionStatus.holidayActionId } : undefined;

    const hasServiceToday = !!todayMeal || todayShower || todayLaundry || todayBicycle;
    const banDetails = useMemo(() => getGuestBanDetails(guest), [guest]);
    const isBanned = banDetails.isBanned;

    // Check program-specific bans
    const isBannedFromMeals = banDetails.programs.find(p => p.key === 'meals')?.isBanned ?? false;
    const isBannedFromShower = banDetails.programs.find(p => p.key === 'shower')?.isBanned ?? false;
    const isBannedFromLaundry = banDetails.programs.find(p => p.key === 'laundry')?.isBanned ?? false;
    const isBannedFromBicycle = banDetails.programs.find(p => p.key === 'bicycle')?.isBanned ?? false;

    const lastVisitDateStr = useMemo(() => {
        const precomputedDate = lastVisitDateMap?.get(guest.id);
        if (precomputedDate) return precomputedDate;

        const dateOf = (record: any): string =>
            record?.serviceDate || record?.dateKey || (record?.date ? pacificDateStringFrom(record.date) : '');
        const allRecords = [
            ...mealRecords.filter(record => record.guestId === guest.id),
            ...extraMealRecords.filter(record => record.guestId === guest.id),
            ...showerRecords.filter(record => record.guestId === guest.id),
            ...laundryRecords.filter(record => record.guestId === guest.id),
            ...bicycleRecords.filter(record => record.guestId === guest.id),
            ...haircutRecords.filter(record => record.guestId === guest.id),
            ...holidayRecords.filter(record => record.guestId === guest.id),
        ];

        return allRecords.reduce((latest, record) => {
            const date = dateOf(record);
            return date > latest ? date : latest;
        }, '') || null;
    }, [
        lastVisitDateMap,
        guest.id,
        mealRecords,
        extraMealRecords,
        showerRecords,
        laundryRecords,
        bicycleRecords,
        haircutRecords,
        holidayRecords,
    ]);

    const lastVisitLabel = useMemo(() => {
        if (!lastVisitDateStr) return null;

        // Parse as noon local time to avoid DST edge-case shifts.
        const date = new Date(`${lastVisitDateStr}T12:00:00`);
        const todayDate = new Date(`${today}T12:00:00`);
        const diffDays = Math.round((todayDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }, [lastVisitDateStr, today]);

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

    const handleQuickShower = async (e?: React.MouseEvent | React.KeyboardEvent) => {
        e?.stopPropagation();
        if (todayShower || isPending || isBannedFromShower) return;

        if (nextAvailableShowerSlot && addShowerRecord) {
            setIsPending(true);
            try {
                const record = await addShowerRecord(guest.id, nextAvailableShowerSlot.slotTime);
                if (record && record.id) {
                    addAction('SHOWER_BOOKED', { recordId: record.id, guestId: guest.id });
                    toast.success(`Shower booked for ${nextAvailableShowerSlot.label}`);
                }
            } catch (error: any) {
                toast.error(error.message || 'Failed to book shower');
            } finally {
                setIsPending(false);
            }
        } else if (addShowerWaitlist) {
            setIsPending(true);
            try {
                const record = await addShowerWaitlist(guest.id);
                if (record && record.id) {
                    addAction('SHOWER_BOOKED', { recordId: record.id, guestId: guest.id });
                    toast.success(`Added ${displayName} to shower waitlist`);
                }
            } catch (error: any) {
                toast.error(error.message || 'Failed to join waitlist');
            } finally {
                setIsPending(false);
            }
        } else {
            setShowerPickerGuest(guest);
        }
    };

    const handleQuickLaundry = async (e?: React.MouseEvent | React.KeyboardEvent) => {
        e?.stopPropagation();
        if (todayLaundry || isPending || isBannedFromLaundry) return;

        if (nextAvailableLaundrySlot && addLaundryRecord) {
            setIsPending(true);
            try {
                const record = await addLaundryRecord(guest.id, 'onsite', nextAvailableLaundrySlot.slotLabel, '');
                if (record && record.id) {
                    addAction('LAUNDRY_BOOKED', { recordId: record.id, guestId: guest.id });
                    toast.success(`On-site laundry booked for ${nextAvailableLaundrySlot.label}`);
                }
            } catch (error: any) {
                toast.error(error.message || 'Failed to book laundry');
            } finally {
                setIsPending(false);
            }
        } else {
            setLaundryPickerGuest(guest);
        }
    };

    const handleCheckInAll = async (e: React.MouseEvent, count: number = 1) => {
        e.stopPropagation();
        if (todayMeal || isPending || isBannedFromMeals) return;

        setIsPending(true);
        try {
            const primaryRecord = await addMealRecord(guest.id, count);
            if (primaryRecord?.id) {
                addAction('MEAL_ADDED', { recordId: primaryRecord.id, guestId: guest.id, count });
            }

            const { getLinkedGuests } = useGuestsStore.getState();
            const linkedList = getLinkedGuests(guest.id);
            let proxySuccessCount = 0;

            for (const proxy of linkedList) {
                const status = mealStatusMap?.get(proxy.id);
                if (!status?.hasMeal) {
                    try {
                        const proxyRecord = await addMealRecord(proxy.id, count, guest.id);
                        if (proxyRecord?.id) {
                            addAction('MEAL_ADDED', { recordId: proxyRecord.id, guestId: proxy.id, count });
                            proxySuccessCount++;
                        }
                    } catch {
                        // Continue to next buddy if one fails
                    }
                }
            }

            if (proxySuccessCount > 0) {
                toast.success(`Checked in ${displayName} + ${proxySuccessCount} linked buddy${proxySuccessCount > 1 ? 'ies' : ''} (${count} meal${count > 1 ? 's' : ''} each)`);
            } else {
                toast.success(`${count} meal${count > 1 ? 's' : ''} logged for ${displayName}`);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to check in');
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

    const handleUndo = async (e: React.MouseEvent | undefined, actionId: string, label: string) => {
        if (e) e.stopPropagation();
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
        if (next) void loadGuestContext?.();
        onExpandedChange?.(guest.id, next);
        if (onSelect) onSelect();
    };

    const handleHaircutAdd = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isPending || isBanned) return; // Blanket ban check

        const targetHaircutDate = haircutDate || today;

        setIsPending(true);
        try {
            const record = await addHaircutRecord(guest.id, { serviceDate: targetHaircutDate });
            if (record && record.id) {
                if (targetHaircutDate === today) {
                    addAction('HAIRCUT_LOGGED', { recordId: record.id, guestId: guest.id });
                }

                const displayDate = new Date(`${targetHaircutDate}T12:00:00`).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                });

                toast.success(
                    targetHaircutDate === today
                        ? `Haircut logged for ${guest.preferredName || guest.firstName}`
                        : `Haircut logged for ${guest.preferredName || guest.firstName} on ${displayDate}`
                );
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

        toast.success(`${servicesSummary} completed`);
        if (onAdvanceToNext) {
            onAdvanceToNext(guest.id);
        } else if (onClearSearch) {
            onClearSearch();
        }
    };

    return (
        <div
            className={cn(
                'group relative overflow-hidden transition-all duration-300 border bg-white',
                compact ? 'rounded-lg' : 'rounded-2xl',
                isSelected ? 'ring-2 ring-emerald-500/50 border-emerald-400 shadow-lg' : 'border-gray-100 shadow-sm hover:border-emerald-200 hover:shadow-md',
                isBanned ? 'border-red-200 bg-red-50/30' : ''
            )}
        >
            <div
                className={cn(
                    'cursor-pointer',
                    compact
                        ? 'flex items-center justify-between gap-3 p-3'
                        : 'flex flex-col md:flex-row md:items-center md:justify-between md:gap-3 md:p-4'
                )}
                onClick={toggleExpand}
            >
                {/* Left: Avatar & Info */}
                <div
                    role={compact ? undefined : 'group'}
                    aria-label={compact ? undefined : 'Guest identity'}
                    className={cn(
                        'flex flex-1 min-w-0',
                        compact
                            ? 'items-center gap-3'
                            : 'w-full items-start gap-3 px-4 pb-3 pt-4 md:w-auto md:items-center md:p-0'
                    )}
                >
                    {(() => {
                        const avatarColor = getGuestAvatarColor(guest?.id || displayName);
                        const initials = getGuestInitials(guest);
                        return (
                            <div className={cn(
                                'flex items-center justify-center rounded-xl border shrink-0 transition-transform group-hover:scale-105 font-black select-none',
                                compact ? 'w-10 h-10 text-xs' : 'w-12 h-12 text-sm',
                                isBanned
                                    ? 'bg-red-50 border-red-200 text-red-600'
                                    : cn(avatarColor.bg, avatarColor.border, avatarColor.text)
                            )}>
                                {isBanned ? <Ban size={compact ? 18 : 22} /> : initials}
                            </div>
                        );
                    })()}

                    <div className="flex-1 min-w-0">
                        <div className="flex flex-col items-start gap-1 md:flex-row md:gap-2">
                            <div className="min-w-0 w-full md:w-auto">
                                <h3 className={cn(
                                    'font-bold text-gray-900',
                                    compact
                                        ? 'truncate text-sm'
                                        : 'break-words text-lg leading-tight md:truncate md:text-base'
                                )}>
                                    {displayName}
                                </h3>
                                {showFullName && (
                                    <p className={cn(
                                        'text-gray-500 truncate',
                                        compact ? 'text-[11px]' : 'text-xs'
                                    )}>
                                        Full name: {fullName}
                                    </p>
                                )}
                            </div>

                            {/* Badges */}
                            <div className="flex items-center gap-1 flex-wrap">
                                {(() => {
                                    const isNewGuest = guest.createdAt && pacificDateStringFrom(guest.createdAt) === today;
                                    return isNewGuest ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold animate-pulse">
                                            <Sparkles size={10} />
                                            NEW
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
                                    <span 
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold"
                                        title={banDetails.isAllProgramsBanned ? 'Banned from all programs' : `Banned from: ${banDetails.bannedSummary}`}
                                    >
                                        <Ban size={10} />
                                        <span>BANNED</span>
                                        {!banDetails.isAllProgramsBanned && (
                                            <span className="font-semibold text-red-600">({banDetails.bannedSummary})</span>
                                        )}
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
                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs font-medium text-gray-600 md:mt-1.5">
                            <span className="inline-flex items-center gap-1.5 md:gap-1 md:rounded-md md:border md:border-blue-100/50 md:bg-blue-50/60 md:px-2 md:py-0.5">
                                <Home size={12} className="text-blue-500" />
                                {guest.housingStatus}
                            </span>
                            {guest.location && (
                                <span className="inline-flex items-center gap-1.5 border-l border-gray-200 pl-2 md:gap-1 md:rounded-md md:border md:border-amber-100/50 md:bg-amber-50/60 md:px-2 md:py-0.5">
                                    <MapPin size={12} className="text-amber-500" />
                                    {guest.location}
                                </span>
                            )}
                            {guest.gender && (
                                <span
                                    aria-label={`Gender: ${guest.gender}`}
                                    className="inline-flex items-center gap-1 border-l border-gray-200 pl-2 text-purple-700 md:rounded-md md:border md:border-purple-100/50 md:bg-purple-50/60 md:px-2 md:py-0.5"
                                >
                                    <genderPresentation.Icon size={13} aria-hidden="true" />
                                    <span>{genderPresentation.shortLabel}</span>
                                </span>
                            )}
                            {ageRange && (
                                <span className="border-l border-gray-200 pl-2 text-teal-700 md:rounded-md md:border md:border-teal-100/50 md:bg-teal-50/60 md:px-2 md:py-0.5">
                                    {ageRange}
                                </span>
                            )}
                            {lastVisitLabel && (
                                <span className="inline-flex items-center gap-1.5 border-l border-gray-200 pl-2 text-[11px] text-gray-500 md:ml-0 md:gap-1 md:rounded-md md:border md:border-gray-100 md:bg-gray-50 md:px-2 md:py-0.5 md:text-[10px]" title={`Last visit: ${lastVisitDateStr}`}>
                                    <Clock size={10} className="text-gray-400" />
                                    Last visit: {lastVisitLabel}
                                </span>
                            )}
                        </div>
                    </div>

                    {!compact && (
                        <div className="flex h-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400 transition-colors group-hover:text-emerald-500 md:hidden">
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                    )}
                </div>

                {/* Right: Actions */}
                <div
                    role={compact ? undefined : 'group'}
                    aria-label={compact ? undefined : `Quick check-in actions for ${displayName}`}
                    className={cn(
                        'shrink-0',
                        compact
                            ? 'flex items-center gap-2'
                            : 'grid w-full grid-cols-4 gap-2 border-t border-gray-100 bg-gray-50/40 p-3 md:flex md:w-auto md:items-center md:gap-2 md:border-0 md:bg-transparent md:p-0'
                    )}
                >
                    {/* Mobile Meal Controls (1/2 + undo) - only visible on small screens */}
                    {!compact && (
                        <div className="contents md:hidden">
                            {!todayMeal ? (
                                isBannedFromMeals ? (
                                    <div
                                        className="col-span-2 flex h-16 min-h-[44px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl bg-red-100 px-1 text-red-600 opacity-70"
                                        title="Banned from meals"
                                    >
                                        <Ban size={19} />
                                        <span className="text-[11px] font-bold leading-none">Meals unavailable</span>
                                    </div>
                                ) : (
                                    [1, 2].map((count) => (
                                        <button
                                            key={count}
                                            onClick={(e) => handleMealAdd(e, count)}
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
                                            onClick={(e) => handleUndo(e, mealAction.id, 'Check-in')}
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
                    )}

                    {/* Mobile Quick Add Button - only visible on small screens */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMobileSheet(true);
                        }}
                        className="flex h-16 min-h-[44px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl bg-blue-100 px-1 text-blue-700 transition-transform active:scale-95 touch-manipulation md:hidden"
                        title="Quick Add Services"
                        aria-label="Quick add services"
                    >
                        <Plus size={20} strokeWidth={2.5} />
                        <span className="text-[11px] font-bold leading-none">Services</span>
                    </button>

                    {/* Meal Buttons - hidden on mobile */}
                    {!isBannedFromMeals && !compact && (
                        <div className="hidden md:flex items-center gap-1">
                            {!todayMeal ? (
                                <div className="flex items-center gap-1 px-1 py-1 bg-gray-50 rounded-xl border border-gray-100 shadow-inner">
                                    {[1, 2].map((count) => (
                                        <button
                                            key={count}
                                            onClick={(e) => handleMealAdd(e, count)}
                                            disabled={isPending}
                                            className="flex items-center justify-center gap-1.5 h-11 min-h-[44px] min-w-[44px] px-3.5 rounded-lg bg-white border border-gray-200 text-emerald-700 font-bold text-sm shadow-sm hover:border-emerald-300 hover:bg-emerald-50 transition-all active:scale-95 touch-manipulation disabled:opacity-50"
                                        >
                                            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Utensils size={14} />}
                                            <span>{count}</span>
                                        </button>
                                    ))}
                                    {linkedBadgeCount > 0 && (
                                        <div className="flex items-center gap-1 pl-1 ml-0.5 border-l border-gray-200">
                                            {[1, 2].map((count) => (
                                                <button
                                                    key={count}
                                                    onClick={(e) => handleCheckInAll(e, count)}
                                                    disabled={isPending}
                                                    className="flex items-center justify-center gap-1 h-11 min-h-[44px] px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 touch-manipulation disabled:opacity-50"
                                                    title={`Check in ${displayName} + ${linkedBadgeCount} linked buddy/buddies (${count} meal${count > 1 ? 's' : ''} each)`}
                                                >
                                                    {isPending ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />}
                                                    <span>All ×{count}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
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
                                            <button
                                                onClick={(e) => handleUndo(e, mealAction.id, 'Check-in')}
                                                disabled={isPending}
                                                className="flex items-center justify-center h-11 min-h-[44px] min-w-[44px] px-2.5 rounded-lg bg-orange-100 border border-orange-200 text-orange-700 hover:bg-orange-200 transition-all active:scale-95 touch-manipulation disabled:opacity-50"
                                                title="Undo Check-in"
                                            >
                                                <RotateCcw size={16} />
                                            </button>
                                        )}
                                    </div>
                                    {hasReachedMealLimit || hasReachedExtraMealLimit ? (
                                        <div className="flex items-center gap-1">
                                            <div
                                                className="flex items-center justify-center gap-1 h-11 min-h-[44px] px-3 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 text-gray-400 font-bold text-xs cursor-not-allowed"
                                                title={`Daily meal limit reached (${totalMeals}/${4})`}
                                            >
                                                <span>Limit</span>
                                            </div>
                                            {extraMealAction && (
                                                <button
                                                    onClick={(e) => handleUndo(e, extraMealAction.id, 'Extra meal')}
                                                    disabled={isPending}
                                                    className="flex items-center justify-center h-11 min-h-[44px] min-w-[44px] px-2.5 rounded-lg bg-orange-100 border border-orange-200 text-orange-700 hover:bg-orange-200 transition-all active:scale-95 touch-manipulation disabled:opacity-50"
                                                    title="Undo extra meal"
                                                >
                                                    <RotateCcw size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={handleExtraMealAdd}
                                                disabled={isPending}
                                                className="flex items-center justify-center gap-1.5 h-11 min-h-[44px] min-w-[44px] px-3 rounded-lg bg-orange-50 border-2 border-dashed border-orange-300 text-orange-600 font-bold text-xs hover:bg-orange-100 hover:border-orange-400 transition-all active:scale-95 touch-manipulation disabled:opacity-50"
                                                title="Add extra meal (requires confirmation)"
                                            >
                                                <Plus size={14} />
                                                <span>Extra</span>
                                            </button>
                                            {extraMealAction && (
                                                <button
                                                    onClick={(e) => handleUndo(e, extraMealAction.id, 'Extra meal')}
                                                    disabled={isPending}
                                                    className="flex items-center justify-center h-11 min-h-[44px] min-w-[44px] px-2.5 rounded-lg bg-orange-100 border border-orange-200 text-orange-700 hover:bg-orange-200 transition-all active:scale-95 touch-manipulation disabled:opacity-50"
                                                    title="Undo extra meal"
                                                >
                                                    <RotateCcw size={14} />
                                                </button>
                                            )}
                                        </div>
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
                                    <div className="flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm opacity-90">
                                        <Check size={14} />
                                        <ShowerHead size={15} />
                                        {showerAction && (
                                            <button
                                                onClick={(e) => handleUndo(e, showerAction.id, 'Shower booking')}
                                                className="ml-1 p-1.5 min-w-[28px] min-h-[28px] hover:bg-red-100 active:scale-90 rounded-md text-red-500 transition-all touch-manipulation flex items-center justify-center"
                                                title="Undo shower"
                                            >
                                                <RotateCcw size={12} />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleQuickShower}
                                        disabled={isPending}
                                        className="flex items-center justify-center h-11 min-h-[44px] min-w-[44px] px-3 rounded-lg bg-white border border-gray-200 text-sky-600 font-bold text-sm hover:border-sky-300 hover:bg-sky-50 transition-all active:scale-95 touch-manipulation disabled:opacity-50"
                                        title={nextAvailableShowerSlot ? `Quick book shower @ ${nextAvailableShowerSlot.label}` : 'Join shower waitlist'}
                                    >
                                        <ShowerHead size={16} />
                                        {nextAvailableShowerSlot ? (
                                            <span className="text-[11px] ml-1 font-bold text-sky-700">{nextAvailableShowerSlot.slotTime}</span>
                                        ) : (
                                            <span className="text-[10px] ml-1 font-bold text-amber-600">Waitlist</span>
                                        )}
                                    </button>
                                )
                            )}
                            {/* Laundry */}
                            {!isBannedFromLaundry && (
                                todayLaundry ? (
                                    <div className="flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm opacity-90">
                                        <Check size={14} />
                                        <WashingMachine size={15} />
                                        {laundryAction && (
                                            <button
                                                onClick={(e) => handleUndo(e, laundryAction.id, 'Laundry booking')}
                                                className="ml-1 p-1.5 min-w-[28px] min-h-[28px] hover:bg-red-100 active:scale-90 rounded-md text-red-500 transition-all touch-manipulation flex items-center justify-center"
                                                title="Undo laundry"
                                            >
                                                <RotateCcw size={12} />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleQuickLaundry}
                                        disabled={isPending}
                                        className="flex items-center justify-center h-11 min-h-[44px] min-w-[44px] px-3 rounded-lg bg-white border border-gray-200 text-indigo-600 font-bold text-sm hover:border-indigo-300 hover:bg-indigo-50 transition-all active:scale-95 touch-manipulation disabled:opacity-50"
                                        title={nextAvailableLaundrySlot ? `Quick book on-site laundry @ ${nextAvailableLaundrySlot.label}` : 'Book laundry'}
                                    >
                                        <WashingMachine size={16} />
                                        {nextAvailableLaundrySlot && (
                                            <span className="text-[10px] ml-1 font-bold text-indigo-700">{nextAvailableLaundrySlot.label.split(' - ')[0]}</span>
                                        )}
                                    </button>
                                )
                            )}
                        </div>
                    )}

                    {/* Complete Check-in Button - separated from undo to prevent confusion */}
                    {hasServiceToday && !compact && (
                        <>
                            {/* Visual separator to distinguish from undo button */}
                            <div className="hidden w-px h-8 bg-gray-200 mx-1 md:block" aria-hidden="true"></div>
                            <button
                                onClick={handleCompleteCheckIn}
                                className="flex h-16 min-h-[44px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl bg-blue-100 px-1 text-blue-800 font-bold transition-all hover:bg-blue-200 active:scale-95 touch-manipulation md:h-11 md:min-w-[44px] md:flex-row md:px-3.5"
                                title="Complete check-in and search for next guest"
                            >
                                <UserCheck size={20} />
                                <span className="text-[11px] leading-none md:hidden">Done</span>
                            </button>
                        </>
                    )}

                    {/* Next Result Button - lets staff skip a guest without service today */}
                    {!hasServiceToday && !compact && onAdvanceToNext && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onAdvanceToNext(guest.id);
                            }}
                            className="flex h-16 min-h-[44px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-1 text-gray-500 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 active:scale-95 touch-manipulation md:h-11 md:min-w-[44px] md:flex-row md:px-3"
                            title="Next guest"
                            aria-label="Next guest"
                        >
                            <ArrowRight size={18} />
                            <span className="text-[11px] font-bold leading-none md:hidden">Next</span>
                        </button>
                    )}

                    <div className={cn(
                        "items-center justify-center rounded-xl bg-gray-50 border border-gray-100 text-gray-400 group-hover:text-emerald-500 transition-colors touch-manipulation",
                        compact
                            ? "flex h-9 min-h-[36px] min-w-[36px]"
                            : "hidden h-11 min-h-[44px] min-w-[44px] md:flex"
                    )}>
                        {isExpanded ? <ChevronUp size={compact ? 16 : 20} /> : <ChevronDown size={compact ? 16 : 20} />}
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/30 overflow-hidden motion-safe:animate-[fadeIn_160ms_ease-out]">
                    <div className="p-4 space-y-4">
                        {/* Ban Status */}
                        {isBanned && (
                            <GuestBanNotice guest={guest} />
                        )}

                            {/* Services Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div
                                    role="button"
                                    tabIndex={isBannedFromShower || !!todayShower ? -1 : 0}
                                    onClick={handleQuickShower}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleQuickShower();
                                        }
                                    }}
                                    aria-disabled={isBannedFromShower || !!todayShower}
                                    className={cn(
                                        "relative flex flex-col items-center justify-center min-h-[84px] p-3.5 sm:p-4 rounded-2xl border shadow-sm transition-all active:scale-[0.98] touch-manipulation cursor-pointer select-none",
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
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleUndo(e, showerAction.id, 'Shower booking')}
                                                    className="absolute top-1.5 right-1.5 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg active:scale-90 transition-all touch-manipulation"
                                                    title="Undo shower"
                                                >
                                                    <RotateCcw size={14} />
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <ShowerHead size={20} className={isBannedFromShower ? "text-gray-400 mb-1.5" : "text-sky-500 mb-1.5"} />
                                            {!isBannedFromShower && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setShowerPickerGuest(guest); }}
                                                    className="absolute top-1.5 right-1.5 p-1.5 text-gray-400 hover:text-sky-600 rounded-md hover:bg-sky-50 transition-colors"
                                                    title="Choose specific shower time"
                                                >
                                                    <Clock size={14} />
                                                </button>
                                            )}
                                        </>
                                    )}
                                    <span className="text-xs font-bold">
                                        {todayShower ? 'Shower Done' : nextAvailableShowerSlot ? `Shower (${nextAvailableShowerSlot.slotTime})` : 'Join Waitlist'}
                                    </span>
                                </div>
                                <div
                                    role="button"
                                    tabIndex={isBannedFromLaundry || !!todayLaundry ? -1 : 0}
                                    onClick={handleQuickLaundry}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleQuickLaundry();
                                        }
                                    }}
                                    aria-disabled={isBannedFromLaundry || !!todayLaundry}
                                    className={cn(
                                        "relative flex flex-col items-center justify-center min-h-[84px] p-3.5 sm:p-4 rounded-2xl border shadow-sm transition-all active:scale-[0.98] touch-manipulation cursor-pointer select-none",
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
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleUndo(e, laundryAction.id, 'Laundry booking')}
                                                    className="absolute top-1.5 right-1.5 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg active:scale-90 transition-all touch-manipulation"
                                                    title="Undo laundry"
                                                >
                                                    <RotateCcw size={14} />
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <WashingMachine size={20} className={isBannedFromLaundry ? "text-gray-400 mb-1.5" : "text-indigo-500 mb-1.5"} />
                                            {!isBannedFromLaundry && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setLaundryPickerGuest(guest); }}
                                                    className="absolute top-1.5 right-1.5 p-1.5 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                                                    title="Choose laundry options"
                                                >
                                                    <Clock size={14} />
                                                </button>
                                            )}
                                        </>
                                    )}
                                    <span className="text-xs font-bold">
                                        {todayLaundry ? 'Laundry Done' : nextAvailableLaundrySlot ? `Laundry (${nextAvailableLaundrySlot.label.split(' - ')[0]})` : 'Laundry'}
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setBicyclePickerGuest(guest); }}
                                    disabled={isBannedFromBicycle || !!todayBicycle}
                                    className={cn(
                                        "relative flex flex-col items-center justify-center min-h-[84px] p-3.5 sm:p-4 rounded-2xl border shadow-sm transition-all active:scale-[0.98] touch-manipulation",
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
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleUndo(e, bicycleAction.id, 'Bicycle booking')}
                                                    className="absolute top-1.5 right-1.5 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg active:scale-90 transition-all touch-manipulation"
                                                    title="Undo bicycle"
                                                >
                                                    <RotateCcw size={14} />
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <Bike size={20} className={isBannedFromBicycle ? "text-gray-400 mb-1.5" : "text-amber-500 mb-1.5"} />
                                    )}
                                    <span className="text-xs font-bold text-gray-700">{todayBicycle ? 'Bicycle Done' : 'Bicycle'}</span>
                                </button>
                            </div>

                            {/* Extra Meal - separated from main services to prevent accidental taps */}
                            {todayMeal && (
                                <div className="mt-2 pt-2 border-t border-dashed border-orange-200">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">Extra Meals</p>
                                        {extraMealAction && (
                                            <button
                                                onClick={(e) => handleUndo(e, extraMealAction.id, 'Extra meal')}
                                                disabled={isPending}
                                                className="flex items-center justify-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-orange-100 border border-orange-200 text-orange-700 text-xs font-semibold hover:bg-orange-200 transition-all active:scale-95 touch-manipulation disabled:opacity-50"
                                                title="Undo extra meal"
                                            >
                                                <RotateCcw size={12} />
                                                Undo
                                            </button>
                                        )}
                                    </div>
                                    {hasReachedMealLimit || hasReachedExtraMealLimit ? (
                                        <div className="w-full flex items-center justify-center gap-2 min-h-[44px] p-3 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 text-gray-400 font-bold text-sm">
                                            <span>Daily meal limit reached ({totalMeals}/{4})</span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleExtraMealAdd}
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
                            )}

                            {/* Linked Guests Manager */}
                            <LinkedGuestsList guestId={guest.id} className="mb-4" />

                            {/* Warnings (store-driven, mounted only when expanded) */}
                            <GuestWarningsPanel guestId={guest.id} />

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 flex-wrap">
                                {todayHaircut ? (
                                    <div className="inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-xl">
                                        <Check size={14} />
                                        Haircut
                                        {haircutAction && (
                                            <button
                                                onClick={(e) => handleUndo(e, haircutAction.id, 'Haircut')}
                                                className="ml-1 p-1 min-w-[28px] min-h-[28px] hover:bg-red-100 rounded-md text-red-500 transition-all touch-manipulation flex items-center justify-center"
                                                title="Undo haircut"
                                            >
                                                <RotateCcw size={12} />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-2">
                                        <label htmlFor={`haircut-date-${guest.id}`} className="sr-only">Haircut date</label>
                                        <input
                                            id={`haircut-date-${guest.id}`}
                                            aria-label="Haircut date"
                                            type="date"
                                            value={haircutDate}
                                            max={today}
                                            onChange={(e) => setHaircutDate(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="h-10 min-h-[40px] rounded-xl border border-gray-200 px-2.5 text-xs sm:text-sm text-gray-600 touch-manipulation"
                                            disabled={isPending || isBanned || hasHaircutForSelectedDate}
                                        />
                                        <button
                                            onClick={handleHaircutAdd}
                                            disabled={isPending || isBanned || hasHaircutForSelectedDate}
                                            className={cn(
                                                "inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 touch-manipulation border border-transparent",
                                                isBanned || hasHaircutForSelectedDate
                                                    ? "text-gray-400 cursor-not-allowed"
                                                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                                            )}
                                        >
                                            <Scissors size={14} />
                                            {hasHaircutForSelectedDate ? 'Haircut Done' : 'Haircut'}
                                        </button>
                                    </div>
                                )}

                                {todayHoliday ? (
                                    <div className="inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-bold text-pink-700 bg-pink-50 border border-pink-200 rounded-xl">
                                        <Check size={14} />
                                        Holiday
                                        {holidayAction && (
                                            <button
                                                onClick={(e) => handleUndo(e, holidayAction.id, 'Holiday visit')}
                                                className="ml-1 p-1 min-w-[28px] min-h-[28px] hover:bg-red-100 rounded-md text-red-500 transition-all touch-manipulation flex items-center justify-center"
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
                                            "inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 touch-manipulation border border-transparent",
                                            isBanned
                                                ? "text-gray-400 cursor-not-allowed"
                                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                                        )}
                                    >
                                        <Gift size={14} />
                                        Holiday Service
                                    </button>
                                )}

                                <span className="w-px h-4 bg-gray-200 mx-1"></span>

                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowHistoryModal(true); }}
                                    className="inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all active:scale-95 touch-manipulation"
                                >
                                    <History size={14} />
                                    History
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowReminderModal(true); }}
                                    className={cn(
                                        "inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 touch-manipulation",
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
                                    className="inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-bold text-amber-600 hover:bg-amber-50 rounded-xl transition-all active:scale-95 touch-manipulation"
                                >
                                    <AlertTriangle size={14} />
                                    Warnings
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowEditModal(true); }}
                                    className="inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all active:scale-95 touch-manipulation"
                                >
                                    <Edit size={14} />
                                    Edit
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowBanModal(true); }}
                                    className={cn(
                                        "inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 touch-manipulation",
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
                    </div>
            )}

            {/* Modals */}
            {showEditModal && <GuestEditModal guest={guest} onClose={() => setShowEditModal(false)} />}
            {showBanModal && <BanManagementModal guest={guest} onClose={() => setShowBanModal(false)} />}
            {showWarningModal && <WarningManagementModal guest={guest} onClose={() => setShowWarningModal(false)} />}
            {showReminderModal && <ReminderManagementModal guest={guest} onClose={() => setShowReminderModal(false)} />}
            {showHistoryModal && <GuestHistoryModal guest={guest} onClose={() => setShowHistoryModal(false)} />}

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
                onMealUndo={mealAction ? () => handleUndo(undefined, mealAction.id, 'Check-in') : undefined}
                onShowerSelect={(g) => setShowerPickerGuest(g)}
                onQuickShowerSelect={() => { void handleQuickShower(); }}
                hasShowerToday={!!todayShower}
                isBannedFromShower={isBannedFromShower}
                onShowerUndo={showerAction ? () => handleUndo(undefined, showerAction.id, 'Shower booking') : undefined}
                nextAvailableShowerSlot={nextAvailableShowerSlot}
                bookedShowerTime={serviceStatus.showerRecord?.time}
                isPendingShower={isPending}
                onLaundrySelect={(g) => setLaundryPickerGuest(g)}
                onQuickLaundrySelect={() => { void handleQuickLaundry(); }}
                hasLaundryToday={!!todayLaundry}
                isBannedFromLaundry={isBannedFromLaundry}
                onLaundryUndo={laundryAction ? () => handleUndo(undefined, laundryAction.id, 'Laundry booking') : undefined}
                nextAvailableLaundrySlot={nextAvailableLaundrySlot}
                bookedLaundryTime={serviceStatus.laundryRecord?.time}
                isPendingLaundry={isPending}
            />
        </div>
    );
}

function GuestCardImpl(props: GuestCardProps) {
    const {
        mealStatusMap,
        serviceStatusMap,
        actionStatusMap,
        recentGuestsMap,
        lastVisitDateMap,
        nextAvailableShowerSlot,
        nextAvailableLaundrySlot,
        guest
    } = props;

    // Also fetch records when lastVisitDateMap is not provided so the fallback
    // last-visit computation in PureGuestCard has data to work with.
    const needsLastVisitRecords = !lastVisitDateMap;

    const needsMealRecords = !mealStatusMap || !recentGuestsMap;
    const mealRecords = useMealsStore((s) => (needsMealRecords || needsLastVisitRecords ? s.mealRecords : EMPTY_ARRAY));
    const extraMealRecords = useMealsStore((s) => (!mealStatusMap || needsLastVisitRecords ? s.extraMealRecords : EMPTY_ARRAY));

    const needsShowerRecords = !serviceStatusMap || needsLastVisitRecords || nextAvailableShowerSlot === undefined;
    const needsLaundryRecords = !serviceStatusMap || needsLastVisitRecords || nextAvailableLaundrySlot === undefined;
    const needsOtherServiceRecords = !serviceStatusMap || needsLastVisitRecords;

    const showerRecords = useServicesStore((s) => (needsShowerRecords ? s.showerRecords : EMPTY_ARRAY));
    const laundryRecords = useServicesStore((s) => (needsLaundryRecords ? s.laundryRecords : EMPTY_ARRAY));
    const bicycleRecords = useServicesStore((s) => (needsOtherServiceRecords ? (s.bicycleRecords || EMPTY_ARRAY) : EMPTY_ARRAY));
    const haircutRecords = useServicesStore((s) => (needsOtherServiceRecords ? (s.haircutRecords || EMPTY_ARRAY) : EMPTY_ARRAY));
    const holidayRecords = useServicesStore((s) => (needsOtherServiceRecords ? (s.holidayRecords || EMPTY_ARRAY) : EMPTY_ARRAY));

    const { addMealRecord, addExtraMealRecord } = useMealsStore(
        useShallow((s) => ({ addMealRecord: s.addMealRecord, addExtraMealRecord: s.addExtraMealRecord }))
    );
    const snapshotReady = useCheckInStore((s) => s.isReady);
    const optimisticMeal = useCheckInStore((s) => s.optimisticMeal);
    const replaceMealCounts = useCheckInStore((s) => s.replaceMealCounts);
    const acknowledgeMealRecord = useCheckInStore((s) => s.acknowledgeMealRecord);
    const applySnapshotUndo = useCheckInStore((s) => s.applyUndo);
    const executeSnapshotMeal = useCallback((guestId: string, count = 1, extra = false) => {
        const idempotencyKey = globalThis.crypto?.randomUUID?.() ?? `${guestId}-${Date.now()}-${Math.random()}`;
        return executeOptimisticMeal({
            guestId,
            quantity: count,
            extra,
            optimisticMeal,
            replaceMealCounts,
            acknowledgeMealRecord,
            request: fetch,
            idempotencyKey,
        });
    }, [optimisticMeal, replaceMealCounts, acknowledgeMealRecord]);
    const effectiveAddMealRecord = useCallback((guestId: string, count = 1, pickedUpByGuestId?: string | null, serviceDate?: string) => (
        snapshotReady
            ? executeSnapshotMeal(guestId, count, false)
            : pickedUpByGuestId !== undefined
                ? addMealRecord(guestId, count, pickedUpByGuestId, serviceDate)
                : addMealRecord(guestId, count)
    ), [snapshotReady, executeSnapshotMeal, addMealRecord]);
    const effectiveAddExtraMealRecord = useCallback((guestId: string, count = 1) => (
        snapshotReady ? executeSnapshotMeal(guestId, count, true) : addExtraMealRecord(guestId, count)
    ), [snapshotReady, executeSnapshotMeal, addExtraMealRecord]);
    const [guestContext, setGuestContext] = useState<CheckInGuestContext | null>(null);
    const [contextPromise, setContextPromise] = useState<Promise<void> | null>(null);
    const loadGuestContext = useCallback(() => {
        if (!snapshotReady || guestContext) return Promise.resolve();
        if (contextPromise) return contextPromise;
        const pending = fetch(`/api/check-in/guests/${guest.id}/context`)
            .then(async (response) => {
                const body = await response.json() as CheckInGuestContext & { error?: string };
                if (!response.ok) throw new Error(body.error || 'Unable to load guest details');
                setGuestContext(body);
                const guestState = useGuestsStore.getState();
                const otherGuests = guestState.guests.filter((item) => item.id !== guest.id && !body.linkedGuests.some((linked) => linked.id === item.id));
                const linkedGuests = body.linkedGuests.map((linked) => ({
                    ...linked,
                    notes: '',
                    bicycleDescription: '',
                    docId: linked.id,
                }));
                useGuestsStore.setState({
                    guests: [...otherGuests, body.guest, ...linkedGuests],
                    warnings: [
                        ...guestState.warnings.filter((warning) => warning.guestId !== guest.id),
                        ...(body.warnings as typeof guestState.warnings),
                    ],
                    guestProxies: [
                        ...guestState.guestProxies.filter((proxy) => proxy.guestId !== guest.id && proxy.proxyId !== guest.id),
                        ...body.linkedGuests.map((linked) => ({
                            id: `context-${guest.id}-${linked.id}`,
                            guestId: guest.id,
                            proxyId: linked.id,
                            createdAt: new Date().toISOString(),
                        })),
                    ],
                });
                const reminderState = useRemindersStore.getState();
                useRemindersStore.setState({
                    reminders: [
                        ...reminderState.reminders.filter((reminder) => reminder.guestId !== guest.id),
                        ...(body.reminders as typeof reminderState.reminders),
                    ],
                });
            })
            .catch((error) => {
                toast.error(error instanceof Error ? error.message : 'Unable to load guest details');
            })
            .finally(() => setContextPromise(null));
        setContextPromise(pending);
        return pending;
    }, [snapshotReady, guestContext, contextPromise, guest.id]);
    const { addShowerRecord, addShowerWaitlist, addLaundryRecord, addHaircutRecord, addHolidayRecord } = useServicesStore(
        useShallow((s) => ({
            addShowerRecord: s.addShowerRecord,
            addShowerWaitlist: s.addShowerWaitlist,
            addLaundryRecord: s.addLaundryRecord,
            addHaircutRecord: s.addHaircutRecord,
            addHolidayRecord: s.addHolidayRecord,
        }))
    );
    const isSlotBlocked = useBlockedSlotsStore((s) => s.isSlotBlocked);
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
    const effectiveUndoAction = useCallback(async (actionId: string) => {
        const action = snapshotReady
            ? getActionsForGuestToday(guest.id).find((entry) => entry.id === actionId)
            : undefined;
        const success = await undoAction(actionId);
        if (success && action) {
            applySnapshotUndo({
                type: action.type,
                guestId: action.data.guestId,
                recordId: action.data.recordId,
                quantity: action.data.quantity,
            });
        }
        return success;
    }, [snapshotReady, getActionsForGuestToday, guest.id, undoAction, applySnapshotUndo]);

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
            guest={guestContext?.guest ?? guest}
            mealRecords={mealRecords}
            extraMealRecords={extraMealRecords}
            showerRecords={showerRecords}
            laundryRecords={laundryRecords}
            bicycleRecords={bicycleRecords}
            haircutRecords={haircutRecords}
            holidayRecords={holidayRecords}
            addMealRecord={effectiveAddMealRecord}
            addExtraMealRecord={effectiveAddExtraMealRecord}
            addShowerRecord={addShowerRecord}
            addShowerWaitlist={addShowerWaitlist}
            addLaundryRecord={addLaundryRecord}
            addHaircutRecord={addHaircutRecord}
            addHolidayRecord={addHolidayRecord}
            isSlotBlocked={isSlotBlocked}
            setShowerPickerGuest={setShowerPickerGuest}
            setLaundryPickerGuest={setLaundryPickerGuest}
            setBicyclePickerGuest={setBicyclePickerGuest}
            addAction={addAction}
            undoAction={effectiveUndoAction}
            getActionsForGuestToday={getActionsForGuestToday}
            loadGuestContext={loadGuestContext}
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
        s.extraMealActionId || '',
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

const lastVisitSnapshot = (props: GuestCardProps) => {
    const id = props.guest?.id;
    if (!id) return '';
    return props.lastVisitDateMap?.get(id) || '';
};

export const GuestCard = memo(GuestCardImpl, (prev, next) => {
    const prevId = prev.guest?.id;
    const nextId = next.guest?.id;
    if (!prevId || !nextId || prevId !== nextId) return false;

    // If the guest object identity changes but none of the rendered fields do, allow memo to skip.
    // Track a few common fields used in rendering.
    const guestFieldsEqual =
        getGuestDisplayName(prev.guest || {}) === getGuestDisplayName(next.guest || {}) &&
        getGuestFullName(prev.guest || {}) === getGuestFullName(next.guest || {}) &&
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
        recentSnapshot(prev) === recentSnapshot(next) &&
        lastVisitSnapshot(prev) === lastVisitSnapshot(next)
    );
});
