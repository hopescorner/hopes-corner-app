'use client';

import { useState, useMemo, memo, useCallback, useRef, useEffect } from 'react';
import { AGE_GROUPS, MAX_EXTRA_MEALS_PER_DAY, MAX_TOTAL_MEALS_PER_DAY } from '@/lib/constants/constants';
import dynamic from 'next/dynamic';
import {
    ChevronDown,
    ChevronUp,
    Ban,
    UserCheck,
    Bell,
    History,
    AlertTriangle,
    Edit,
    ArrowRight,
    Mars,
    Venus,
    CircleHelp,
    NonBinary,
    Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';
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
import { getGuestBanDetails } from '@/lib/utils/banUtils';
import { GuestIdentity } from './GuestIdentity';
import { GuestMealActions, GuestExtraMealSection } from './GuestMealActions';
import { GuestQuickServiceSlots, GuestServiceSlots, GuestAdditionalServices } from './GuestServiceSlots';
import { GuestLinkedSection } from './GuestLinkedSection';
import { GuestWarningsPanel } from './GuestWarnings';

const LinkedGuestsList = dynamic(() => import('./LinkedGuestsList'));
import { GuestBanNotice } from './GuestBanNotice';
const GuestEditModal = dynamic(() => import('@/components/modals/GuestEditModal').then((module) => module.GuestEditModal));
const BanManagementModal = dynamic(() => import('@/components/modals/BanManagementModal').then((module) => module.BanManagementModal));
const WarningManagementModal = dynamic(() => import('@/components/modals/WarningManagementModal').then((module) => module.WarningManagementModal));
const ReminderManagementModal = dynamic(() => import('@/components/modals/ReminderManagementModal').then((module) => module.ReminderManagementModal));
const GuestHistoryModal = dynamic(() => import('@/components/modals/GuestHistoryModal').then((module) => module.GuestHistoryModal));
const MobileServiceSheet = dynamic(() => import('@/components/checkin/MobileServiceSheet').then((module) => module.MobileServiceSheet));

interface GuestCardProps {
    guest: any;
    isSelected?: boolean;
    onSelect?: () => void;
    compact?: boolean;
    onClearSearch?: () => void;
    mealStatusMap?: MealStatusMap;
    serviceStatusMap?: ServiceStatusMap;
    actionStatusMap?: ActionStatusMap;
    recentGuestsMap?: RecentGuestsMap;
    lastVisitDateMap?: LastVisitDateMap;
    nextAvailableShowerSlot?: NextAvailableShowerSlot | null;
    nextAvailableLaundrySlot?: NextAvailableLaundrySlot | null;
    disableLayoutAnimation?: boolean;
    warningsCount?: number;
    linkedGuestsCount?: number;
    activeRemindersCount?: number;
    onExpandedChange?: (guestId: string, expanded: boolean) => void;
    onAdvanceToNext?: (guestId: string) => void;
    loadGuestContext?: () => Promise<void>;
    guestContext?: CheckInGuestContext | null;
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
    disableLayoutAnimation: _disableLayoutAnimation = false,
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
    guestContext,
}: PureGuestCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showBanModal, setShowBanModal] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showMobileSheet, setShowMobileSheet] = useState(false);
    const [pulses, setPulses] = useState<Record<string, number>>({});
    const pulseTokenRef = useRef(0);

    const triggerSuccessPulse = useCallback((...targets: string[]) => {
        const token = ++pulseTokenRef.current;
        const next: Record<string, number> = {};
        targets.forEach((target, index) => {
            next[target] = index * 140;
        });
        setPulses(next);
        window.setTimeout(() => {
            if (pulseTokenRef.current === token) setPulses({});
        }, 700 + targets.length * 140);
    }, []);

    useEffect(() => () => {
        pulseTokenRef.current += 1;
    }, []);

    const warningBadgeCount = warningsCount ?? 0;
    const linkedBadgeCount = linkedGuestsCount ?? 0;
    const reminderBadgeCount = activeRemindersCount ?? 0;

    const linkedGuestIds = useGuestsStore(
        useShallow((s) => {
            const ids = new Set<string>();
            for (const p of s.guestProxies || []) {
                if (p.guestId === guest.id && p.proxyId && p.proxyId !== guest.id) {
                    ids.add(p.proxyId);
                } else if (p.proxyId === guest.id && p.guestId && p.guestId !== guest.id) {
                    ids.add(p.guestId);
                }
            }
            return Array.from(ids);
        })
    );

    const effectiveLinkedIds = useMemo(() => {
        if (guestContext?.linkedGuests) {
            return Array.from(new Set(guestContext.linkedGuests.map((g) => g.id)));
        }
        return linkedGuestIds;
    }, [guestContext, linkedGuestIds]);

    const totalLinkedCount = guestContext
        ? effectiveLinkedIds.length
        : Math.max(linkedBadgeCount, effectiveLinkedIds.length);

    const today = todayPacificDateString();
    const servedLinkedIds = useMemo(() => new Set(effectiveLinkedIds.filter((id) => (
        mealStatusMap
            ? mealStatusMap.get(id)?.hasMeal
            : mealRecords.some((record) => record.guestId === id && (record.dateKey || pacificDateStringFrom(record.date)) === today)
    ))), [mealStatusMap, effectiveLinkedIds, mealRecords, today]);
    const linkedServedCount = servedLinkedIds.size;
    const linkedNames = useGuestsStore(useShallow((state) => (state.guests ?? [])
        .filter((linked) => effectiveLinkedIds.includes(linked.id))
        .map(getGuestDisplayName)));

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

    const mealStatus: TodayMealStatus = mealStatusMap 
        ? (mealStatusMap.get(guest.id) || defaultMealStatus)
        : localMealStatus;

    const serviceStatus: TodayServiceStatus = serviceStatusMap
        ? (serviceStatusMap.get(guest.id) || defaultServiceStatus)
        : localServiceStatus;

    const actionStatus: TodayGuestActions = actionStatusMap
        ? (actionStatusMap.get(guest.id) || defaultActionStatus)
        : localActionStatus;

    const todayMeal = mealStatus.mealRecord || (mealStatus.hasMeal ? { id: `meal-${guest.id}`, guestId: guest.id, count: mealStatus.mealCount, date: '' } as any : undefined);
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
    const hasAnyActivityToday = hasServiceToday || todayHaircut || todayHoliday;
    const banDetails = useMemo(() => getGuestBanDetails(guest), [guest]);
    const isBanned = banDetails.isBanned;
    const isBannedFromAllServices = banDetails.isAllProgramsBanned;

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
            addAction('MEAL_ADDED', { recordId: record.id, guestId: guest.id, count });
            toast.success(`${count} meal${count > 1 ? 's' : ''} logged for ${guest.preferredName || guest.firstName}`);
            triggerSuccessPulse('meal');
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
                    triggerSuccessPulse('shower');
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
                    triggerSuccessPulse('shower');
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
                    triggerSuccessPulse('laundry');
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
        if (isPending || (todayMeal && totalLinkedCount > 0 && linkedServedCount >= totalLinkedCount) || (!todayMeal && isBannedFromMeals)) return;

        setIsPending(true);
        try {
            let primarySuccess = false;
            if (!todayMeal) {
                const primaryRecord = await addMealRecord(guest.id, count);
                if (primaryRecord?.id) {
                    addAction('MEAL_ADDED', { recordId: primaryRecord.id, guestId: guest.id, count });
                    primarySuccess = true;
                }
            }

            let linkedList = useGuestsStore.getState().getLinkedGuests(guest.id);
            if (linkedList.length === 0 && guestContext?.linkedGuests && guestContext.linkedGuests.length > 0) {
                linkedList = guestContext.linkedGuests as unknown as typeof linkedList;
            }
            if (linkedList.length === 0 && totalLinkedCount > 0 && loadGuestContext) {
                await loadGuestContext();
                linkedList = useGuestsStore.getState().getLinkedGuests(guest.id);
                if (linkedList.length === 0 && guestContext?.linkedGuests) {
                    linkedList = guestContext.linkedGuests as unknown as typeof linkedList;
                }
            }

            let proxySuccessCount = 0;
            for (const proxy of linkedList) {
                if (!servedLinkedIds.has(proxy.id)) {
                    try {
                        const proxyRecord = await addMealRecord(proxy.id, count, guest.id);
                        if (proxyRecord?.id) {
                            addAction('MEAL_ADDED', { recordId: proxyRecord.id, guestId: proxy.id, count, pickerId: guest.id });
                            proxySuccessCount++;
                        }
                    } catch {
                        toast.error(`Could not record meals for ${getGuestDisplayName(proxy)}. Please try this guest individually.`);
                    }
                }
            }

            if (primarySuccess && proxySuccessCount > 0) {
                toast.success(`Checked in ${displayName} + ${proxySuccessCount} linked buddy${proxySuccessCount > 1 ? 'ies' : ''} (${count} meal${count > 1 ? 's' : ''} each)`);
            } else if (proxySuccessCount > 0) {
                toast.success(`Checked in ${proxySuccessCount} linked buddy${proxySuccessCount > 1 ? 'ies' : ''} (${count} meal${count > 1 ? 's' : ''} each)`);
            } else if (primarySuccess) {
                toast.success(`${count} meal${count > 1 ? 's' : ''} logged for ${displayName}`);
            }
            if (primarySuccess || proxySuccessCount > 0) triggerSuccessPulse('meal');
        } catch (error: any) {
            toast.error(error.message || 'Failed to check in');
        } finally {
            setIsPending(false);
        }
    };

    const handleExtraMealAdd = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isPending || isBannedFromMeals || hasReachedMealLimit || hasReachedExtraMealLimit) return;

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
                triggerSuccessPulse('meal');
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
        } catch {
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

    const expandAndScrollToWarnings = useCallback(() => {
        if (compact) return;
        if (!isExpanded) {
            setIsExpanded(true);
            void loadGuestContext?.();
            onExpandedChange?.(guest.id, true);
            if (onSelect) onSelect();
        }
        requestAnimationFrame(() => {
            setTimeout(() => {
                const el = document.getElementById(`warnings-${guest.id}`);
                if (el && typeof el.scrollIntoView === 'function') {
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 60);
        });
    }, [compact, isExpanded, loadGuestContext, onExpandedChange, onSelect, guest.id]);

    const handleHaircutAdd = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isPending || isBannedFromAllServices) return;

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
        if (isPending || isBannedFromAllServices) return;

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
                'group relative overflow-hidden transition-all duration-300 border',
                compact ? 'rounded-lg' : 'rounded-2xl',
                isBanned
                    ? 'border-red-200 bg-red-50/30'
                    : hasAnyActivityToday
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-gray-100 bg-white',
                isSelected ? 'ring-2 ring-emerald-500/50 border-emerald-400 shadow-lg' : 'shadow-sm hover:border-emerald-200 hover:shadow-md'
            )}
        >
            <span
                data-testid="service-rail"
                aria-hidden="true"
                className={cn(
                    'pointer-events-none absolute inset-y-0 left-0 w-1.5',
                    isBanned ? 'bg-red-400' : hasAnyActivityToday ? 'bg-emerald-500' : 'bg-slate-300/70'
                )}
            />
            <div
                className={cn(
                    'cursor-pointer',
                    compact
                        ? 'flex items-center justify-between gap-3 p-3'
                        : 'flex flex-col md:flex-row md:items-center md:justify-between md:gap-3 md:p-4'
                )}
                onClick={toggleExpand}
            >
                <GuestIdentity
                    guest={guest}
                    displayName={displayName}
                    fullName={fullName}
                    showFullName={showFullName}
                    ageRange={ageRange}
                    genderPresentation={genderPresentation}
                    compact={compact}
                    isBanned={isBanned}
                    banDetails={banDetails}
                    today={today}
                    warningBadgeCount={warningBadgeCount}
                    reminderBadgeCount={reminderBadgeCount}
                    totalLinkedCount={totalLinkedCount}
                    linkedServedCount={linkedServedCount}
                    totalMeals={totalMeals}
                    todayShower={todayShower}
                    todayLaundry={todayLaundry}
                    todayHaircut={todayHaircut}
                    serviceStatus={serviceStatus}
                    mealStatus={mealStatus}
                    recentGuestsMap={recentGuestsMap}
                    pulses={pulses}
                    lastVisitLabel={lastVisitLabel}
                    lastVisitDateStr={lastVisitDateStr}
                    isExpanded={isExpanded}
                    onExpandWarnings={expandAndScrollToWarnings}
                    onOpenReminders={() => setShowReminderModal(true)}
                />

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
                    {!compact && (
                        <GuestMealActions
                            guest={guest}
                            todayMeal={!!todayMeal}
                            baseMealCount={baseMealCount}
                            extraMealsCount={extraMealsCount}
                            totalMeals={totalMeals}
                            hasReachedMealLimit={hasReachedMealLimit}
                            hasReachedExtraMealLimit={hasReachedExtraMealLimit}
                            isBannedFromMeals={isBannedFromMeals}
                            isPending={isPending}
                            mealAction={mealAction}
                            extraMealAction={extraMealAction}
                            onMealAdd={handleMealAdd}
                            onExtraMealAdd={handleExtraMealAdd}
                            onUndo={handleUndo}
                        />
                    )}

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

                    {!compact && (
                        <GuestQuickServiceSlots
                            guest={guest}
                            isPending={isPending}
                            todayShower={todayShower}
                            todayLaundry={todayLaundry}
                            isBannedFromShower={isBannedFromShower}
                            isBannedFromLaundry={isBannedFromLaundry}
                            showerAction={showerAction}
                            laundryAction={laundryAction}
                            nextAvailableShowerSlot={nextAvailableShowerSlot}
                            nextAvailableLaundrySlot={nextAvailableLaundrySlot}
                            onQuickShower={handleQuickShower}
                            onQuickLaundry={handleQuickLaundry}
                            onUndo={handleUndo}
                        />
                    )}

                    {hasServiceToday && !compact && (
                        <>
                            <div className="hidden w-px h-8 bg-gray-200 mx-1 md:block" aria-hidden="true" />
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

            {!compact && (
                <GuestLinkedSection
                    guestId={guest.id}
                    displayName={displayName}
                    totalLinkedCount={totalLinkedCount}
                    linkedServedCount={linkedServedCount}
                    linkedNames={linkedNames}
                    todayMeal={!!todayMeal}
                    isPending={isPending}
                    isBannedFromMeals={isBannedFromMeals}
                    mealStatusMap={mealStatusMap}
                    addMealRecord={addMealRecord}
                    loadGuestContext={loadGuestContext}
                    onCheckInAll={handleCheckInAll}
                />
            )}

            <GuestWarningsPanel guestId={guest.id} onManage={() => setShowWarningModal(true)} />

            {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/30 overflow-hidden motion-safe:animate-[fadeIn_160ms_ease-out]">
                    <div className="p-4 space-y-4">
                        {isBanned && (
                            <GuestBanNotice guest={guest} />
                        )}

                        <GuestServiceSlots
                            guest={guest}
                            todayShower={todayShower}
                            todayLaundry={todayLaundry}
                            todayBicycle={todayBicycle}
                            isBannedFromShower={isBannedFromShower}
                            isBannedFromLaundry={isBannedFromLaundry}
                            isBannedFromBicycle={isBannedFromBicycle}
                            showerAction={showerAction}
                            laundryAction={laundryAction}
                            bicycleAction={bicycleAction}
                            nextAvailableShowerSlot={nextAvailableShowerSlot}
                            nextAvailableLaundrySlot={nextAvailableLaundrySlot}
                            onQuickShower={handleQuickShower}
                            onQuickLaundry={handleQuickLaundry}
                            onOpenShowerPicker={() => setShowerPickerGuest(guest)}
                            onOpenLaundryPicker={() => setLaundryPickerGuest(guest)}
                            onOpenBicyclePicker={() => setBicyclePickerGuest(guest)}
                            onUndo={handleUndo}
                        />

                        {todayMeal && (
                            <GuestExtraMealSection
                                todayMeal={!!todayMeal}
                                extraMealAction={extraMealAction}
                                hasReachedMealLimit={hasReachedMealLimit}
                                hasReachedExtraMealLimit={hasReachedExtraMealLimit}
                                totalMeals={totalMeals}
                                extraMealsCount={extraMealsCount}
                                isPending={isPending}
                                isBannedFromMeals={isBannedFromMeals}
                                onExtraMealAdd={handleExtraMealAdd}
                                onUndo={handleUndo}
                            />
                        )}

                        {totalLinkedCount === 0 && (
                            <LinkedGuestsList
                                guestId={guest.id}
                                mealStatusMap={mealStatusMap}
                                addMealRecord={addMealRecord}
                                className="mb-4"
                            />
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 flex-wrap">
                            <GuestAdditionalServices
                                guestId={guest.id}
                                todayHaircut={todayHaircut}
                                todayHoliday={todayHoliday}
                                isPending={isPending}
                                isBannedFromAllServices={isBannedFromAllServices}
                                hasHaircutForSelectedDate={hasHaircutForSelectedDate}
                                haircutDate={haircutDate}
                                today={today}
                                haircutAction={haircutAction}
                                holidayAction={holidayAction}
                                onHaircutDateChange={setHaircutDate}
                                onHaircutAdd={handleHaircutAdd}
                                onHolidayAdd={handleHolidayAdd}
                                onUndo={handleUndo}
                            />

                            <span className="w-px h-4 bg-gray-200 mx-1" />

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
                                className={cn(
                                    "inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 touch-manipulation",
                                    warningBadgeCount > 0
                                        ? "text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                                        : "text-amber-600 hover:bg-amber-50"
                                )}
                            >
                                <AlertTriangle size={14} />
                                Warnings
                                {warningBadgeCount > 0 && (
                                    <span className="ml-0.5 px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded-full text-[9px] font-black">
                                        {warningBadgeCount}
                                    </span>
                                )}
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

            {showEditModal && <GuestEditModal guest={guest} onClose={() => setShowEditModal(false)} />}
            {showBanModal && <BanManagementModal guest={guest} onClose={() => setShowBanModal(false)} />}
            {showWarningModal && <WarningManagementModal guest={guest} onClose={() => setShowWarningModal(false)} />}
            {showReminderModal && <ReminderManagementModal guest={guest} onClose={() => setShowReminderModal(false)} />}
            {showHistoryModal && <GuestHistoryModal guest={guest} onClose={() => setShowHistoryModal(false)} />}

            <MobileServiceSheet
                isOpen={showMobileSheet}
                onClose={() => setShowMobileSheet(false)}
                guest={guest}
                onMealSelect={async (guestId, count) => {
                    if (isPending) return;
                    setIsPending(true);
                    try {
                        const record = await addMealRecord(guestId, count);
                        addAction('MEAL_ADDED', { recordId: record.id, guestId, count });
                        toast.success(`${count} meal${count > 1 ? 's' : ''} logged for ${guest.preferredName || guest.firstName}`);
                        triggerSuccessPulse('meal');
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
    const executeSnapshotMeal = useCallback((guestId: string, count = 1, extra = false, pickedUpByGuestId?: string | null) => {
        const idempotencyKey = globalThis.crypto?.randomUUID?.() ?? `${guestId}-${Date.now()}-${Math.random()}`;
        return executeOptimisticMeal({
            guestId,
            quantity: count,
            extra,
            pickedUpByGuestId: pickedUpByGuestId ?? undefined,
            optimisticMeal,
            replaceMealCounts,
            acknowledgeMealRecord,
            request: fetch,
            idempotencyKey,
        });
    }, [optimisticMeal, replaceMealCounts, acknowledgeMealRecord]);
    const effectiveAddMealRecord = useCallback((guestId: string, count = 1, pickedUpByGuestId?: string | null, serviceDate?: string) => (
        snapshotReady
            ? executeSnapshotMeal(guestId, count, false, pickedUpByGuestId)
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
        const storeState = typeof (useActionHistoryStore as unknown as { getState?: unknown }).getState === 'function'
            ? useActionHistoryStore.getState()
            : undefined;
        const action = snapshotReady
            ? (getActionsForGuestToday(guest.id).find((entry) => entry.id === actionId)
                ?? storeState?.actionHistory.find((entry) => entry.id === actionId))
            : undefined;
        const success = await undoAction(actionId);
        if (success && action) {
            applySnapshotUndo({
                type: action.type,
                guestId: action.data.guestId,
                recordId: action.data.recordId,
                quantity: action.data.quantity ?? action.data.count ?? 1,
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
            guestContext={guestContext}
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
            loadGuestContext={props.loadGuestContext || loadGuestContext}
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
