'use client';

import { useState, useMemo, useCallback, useRef, useDeferredValue, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WashingMachine, Clock, Wind, Package, CheckCircle, Trash2, User, Timer, Edit3, Save, ChevronDown, ChevronUp, GripVertical, AlertTriangle, CalendarDays } from 'lucide-react';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    closestCenter,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { todayPacificDateString, pacificDateStringFrom, formatDateForDisplay } from '@/lib/utils/date';
import { useShallow } from 'zustand/react/shallow';
import { useLaundryStatusChange, LAUNDRY_NEXT_ACTION } from './useLaundryStatusChange';
import { useServiceViewState } from '@/hooks/useServiceViewState';
import { useServiceScrollPosition } from '@/hooks/useServiceScrollPosition';
import { useServiceClock } from '@/hooks/useServiceClock';
import { generateLaundrySlots } from '@/lib/utils/serviceSlots';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';
import { CompactWaiverIndicator } from '@/components/ui/CompactWaiverIndicator';
import { HousingStatusBadge } from '@/components/ui/HousingStatusBadge';
import CompactLaundryList from './CompactLaundryList';
import { LayoutGrid, List, Settings } from 'lucide-react';
import { SlotBlockModal } from '../admin/SlotBlockModal';
import { EndServiceDayPanel } from './EndServiceDayPanel';
import { ServiceDatePicker } from './ServiceDatePicker';
import { ServiceDayNote } from './ServiceDayNote';
import { useSession } from 'next-auth/react';

const STATUS_COLUMNS = [
    { id: 'waiting', title: 'Waiting', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', badgeClass: 'bg-amber-100 text-amber-700' },
    { id: 'washer', title: 'In Washer', icon: WashingMachine, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', badgeClass: 'bg-blue-100 text-blue-700' },
    { id: 'dryer', title: 'In Dryer', icon: Wind, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', badgeClass: 'bg-purple-100 text-purple-700' },
    { id: 'done', title: 'Ready', icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', badgeClass: 'bg-emerald-100 text-emerald-700' },
    { id: 'picked_up', title: 'Picked Up', icon: CheckCircle, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', badgeClass: 'bg-gray-100 text-gray-700' },
];

const OFFSITE_STATUS_COLUMNS = [
    { id: 'pending', title: 'Pending', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', badgeClass: 'bg-amber-100 text-amber-700' },
    { id: 'transported', title: 'Transported', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', badgeClass: 'bg-blue-100 text-blue-700' },
    { id: 'returned', title: 'Returned', icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', badgeClass: 'bg-purple-100 text-purple-700' },
    { id: 'offsite_picked_up', title: 'Picked Up', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', badgeClass: 'bg-emerald-100 text-emerald-700' },
];

/**
 * Formats time elapsed from an ISO timestamp to now
 */
const formatTimeElapsed = (isoTimestamp: string | null, nowMs: number): string | null => {
    if (!isoTimestamp) return null;
    try {
        const timestamp = new Date(isoTimestamp);
        if (isNaN(timestamp.getTime())) return null;
        const diffMs = nowMs - timestamp.getTime();
        if (diffMs < 0) return null;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const remainingMinutes = diffMinutes % 60;
        if (diffMinutes < 1) return '< 1m';
        if (diffHours < 1) return `${diffMinutes}m`;
        if (diffHours < 24) return remainingMinutes > 0 ? `${diffHours}h ${remainingMinutes}m` : `${diffHours}h`;
        const days = Math.floor(diffHours / 24);
        const remainingHours = diffHours % 24;
        return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    } catch {
        return null;
    }
};

export function LaundrySection() {
    useServiceScrollPosition('laundry');
    const { laundryRecords, updateLaundryStatus, cancelMultipleLaundry, addLaundryRecord, getLaundryWeeklyUsage } = useServicesStore(useShallow((s) => ({
        laundryRecords: s.laundryRecords, updateLaundryStatus: s.updateLaundryStatus, cancelMultipleLaundry: s.cancelMultipleLaundry, addLaundryRecord: s.addLaundryRecord, getLaundryWeeklyUsage: s.getLaundryWeeklyUsage,
    })));
    const now = useServiceClock();
    const { guests } = useGuestsStore(useShallow((s) => ({ guests: s.guests })));
    const { data: session } = useSession();

    const today = todayPacificDateString();
    const [selectedDate, setSelectedDate] = useServiceViewState('laundry-date', today);
    const [search, setSearch] = useServiceViewState<string>('laundry-search', '');
    const query = useDeferredValue(search.trim().toLowerCase());
    const [showPickedUp, setShowPickedUp] = useServiceViewState<boolean>('laundry-picked-up', false);
    const [backfillGuestId, setBackfillGuestId] = useState('');
    const [backfillLaundryType, setBackfillLaundryType] = useState<'onsite' | 'offsite'>('onsite');
    const [backfillSlotLabel, setBackfillSlotLabel] = useState('');
    const [backfillBagNumber, setBackfillBagNumber] = useState('');
    const [isAddingBackfill, setIsAddingBackfill] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showLegacySection, setShowLegacySection] = useState(true);

    // Check if user is admin/staff
    const userRole = (session?.user as any)?.role || '';
    const isAdmin = ['admin', 'board', 'staff'].includes(userRole);

    // Check if viewing historical data
    const isViewingPast = selectedDate !== today;

    // Filter logic depends on whether viewing historical data or current
    const activeLaundry = useMemo(() => {
        if (isViewingPast) {
            // When viewing past, show all records from that specific date
            return laundryRecords.filter(r => pacificDateStringFrom(r.date) === selectedDate);
        }
        
        // Current view: only today's records
        return laundryRecords.filter(r => pacificDateStringFrom(r.date) === today);
    }, [laundryRecords, selectedDate, isViewingPast, today]);

    // Legacy laundry: past-day records still needing pickup (not completed/cancelled)
    // Sorted oldest-first so the most urgent items surface at the top
    const legacyLaundry = useMemo(() => {
        if (isViewingPast) return [];
        const completedStatuses = new Set(['picked_up', 'offsite_picked_up', 'cancelled']);
        return laundryRecords
            .filter(r => {
                const recordDate = pacificDateStringFrom(r.date);
                return recordDate < today && !completedStatuses.has(r.status);
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [laundryRecords, isViewingPast, today]);

    const guestMap = useMemo(() => new Map(guests.map((guest) => [guest.id, guest])), [guests]);
    const matchesSearch = useCallback((record: any) => {
        const guest = guestMap.get(record.guestId);
        return !query || [guest?.name, guest?.preferredName, guest?.firstName, guest?.lastName, record.bagNumber].join(' ').toLowerCase().includes(query);
    }, [guestMap, query]);
    const groupedLaundry = useMemo(() => {
        const groups: Record<string, any[]> = {};
        for (const record of activeLaundry) {
            if (!matchesSearch(record)) continue;
            const type = record.laundryType === 'offsite' ? 'offsite' : 'onsite';
            const status = type === 'offsite' && record.status === 'waiting' ? 'pending' : record.status;
            (groups[`${type}:${status}`] ??= []).push(record);
        }
        for (const records of Object.values(groups)) records.sort((a, b) => (a.time || '').localeCompare(b.time || '') || (a.createdAt || '').localeCompare(b.createdAt || ''));
        return groups;
    }, [activeLaundry, matchesSearch]);
    const visibleLegacyLaundry = useMemo(() => legacyLaundry.filter(matchesSearch), [legacyLaundry, matchesSearch]);
    const onsiteLaundry = activeLaundry.filter(r => (r.laundryType === 'onsite' || !r.laundryType) && matchesSearch(r));
    const offsiteLaundry = activeLaundry.filter(r => r.laundryType === 'offsite' && matchesSearch(r));

    const selectedDateLaundrySlots = useMemo(() => {
        const selectedDateObject = new Date(`${selectedDate}T12:00:00`);
        return generateLaundrySlots(selectedDateObject);
    }, [selectedDate]);

    const selectableGuests = useMemo(() => {
        return (guests || [])
            .filter((guest) => guest?.id)
            .sort((firstGuest, secondGuest) => {
                const firstName = (firstGuest.preferredName || firstGuest.name || `${firstGuest.firstName || ''} ${secondGuest.lastName || ''}`).toString();
                const secondName = (secondGuest.preferredName || secondGuest.name || `${secondGuest.firstName || ''} ${secondGuest.lastName || ''}`).toString();
                return firstName.localeCompare(secondName);
            });
    }, [guests]);

    // Per-guest weekly laundry usage for the *selected* backfill date's week
    const backfillWeeklyUsage = useMemo(() => {
        if (!backfillGuestId) return null;
        return getLaundryWeeklyUsage(backfillGuestId, selectedDate);
    }, [backfillGuestId, selectedDate, getLaundryWeeklyUsage, laundryRecords]);
    const backfillWeeklyLimitReached = !!backfillWeeklyUsage?.limitReached;

    // Calculate pending on-site laundry for End Service Day (only 'waiting' status, only for today)
    const todaysRecords = laundryRecords.filter(r => pacificDateStringFrom(r.date) === today);
    const pendingOnsiteLaundry = todaysRecords.filter(r => 
        (r.laundryType === 'onsite' || !r.laundryType) && r.status === 'waiting'
    );

    const handleEndLaundryDay = async () => {
        if (pendingOnsiteLaundry.length === 0) {
            toast.error('No pending on-site laundry to cancel.');
            return;
        }
        const success = await cancelMultipleLaundry(pendingOnsiteLaundry.map((r) => r.id));
        if (success) {
            toast.success(`Cancelled ${pendingOnsiteLaundry.length} laundry loads.`);
        } else {
            toast.error('Failed to cancel laundry.');
        }
    };

    const handleAddLaundryRecord = useCallback(async () => {
        if (!backfillGuestId) {
            toast.error('Please select a guest');
            return;
        }

        setIsAddingBackfill(true);
        try {
            await addLaundryRecord(
                backfillGuestId,
                backfillLaundryType,
                backfillLaundryType === 'onsite' ? backfillSlotLabel : undefined,
                backfillBagNumber,
                selectedDate
            );
            toast.success(`Laundry record added for ${selectedDate}`);
            setBackfillGuestId('');
            setBackfillSlotLabel('');
            setBackfillBagNumber('');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to add laundry record');
        } finally {
            setIsAddingBackfill(false);
        }
    }, [addLaundryRecord, backfillBagNumber, backfillGuestId, backfillLaundryType, backfillSlotLabel, selectedDate]);

    const handleAddCompletedLaundryRecord = useCallback(async () => {
        if (!backfillGuestId) {
            toast.error('Please select a guest');
            return;
        }

        const completedStatus = backfillLaundryType === 'offsite' ? 'returned' : 'done';

        setIsAddingBackfill(true);
        try {
            await addLaundryRecord(
                backfillGuestId,
                backfillLaundryType,
                backfillLaundryType === 'onsite' ? backfillSlotLabel : undefined,
                backfillBagNumber,
                selectedDate,
                completedStatus
            );
            toast.success(`Completed laundry added for ${selectedDate}`);
            setBackfillGuestId('');
            setBackfillSlotLabel('');
            setBackfillBagNumber('');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to add completed laundry');
        } finally {
            setIsAddingBackfill(false);
        }
    }, [addLaundryRecord, backfillBagNumber, backfillGuestId, backfillLaundryType, backfillSlotLabel, selectedDate]);

    // Drag and drop state (using @dnd-kit)
    const [activeId, setActiveId] = useState<string | null>(null);
    const activeRecord = useMemo(
        () => activeLaundry.find(r => r.id === activeId) || null,
        [activeLaundry, activeId]
    );

    // Configure sensors with activation constraints to avoid accidental drags
    const pointerSensor = useSensor(PointerSensor, {
        activationConstraint: { distance: 8 },
    });
    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: { delay: 200, tolerance: 5 },
    });
    const sensors = useSensors(pointerSensor, touchSensor);

    // View mode state
    const [viewPreference, setViewMode] = useServiceViewState<'kanban' | 'list' | 'auto'>('laundry-view', 'auto', ['kanban', 'list', 'auto']);
    const portrait = useSyncExternalStore(subscribePortrait, getPortrait, () => false);
    const viewMode = viewPreference === 'auto' ? (portrait ? 'list' : 'kanban') : viewPreference;
    const [showSlotManager, setShowSlotManager] = useState(false);

    const { changeStatus, updatingIds, bagDialog } = useLaundryStatusChange(isViewingPast);
    const handleStatusChange = useCallback((record: any, status: string) => {
        const guest = guestMap.get(record.guestId);
        return changeStatus(record, status, guest?.preferredName || guest?.name || 'Guest');
    }, [changeStatus, guestMap]);

    // @dnd-kit drag handlers
    const handleDragStart = useCallback((event: DragStartEvent) => {
        if (isViewingPast) return;
        setActiveId(event.active.id as string);
    }, [isViewingPast]);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const draggedRecord = activeLaundry.find(r => r.id === active.id);
        const newStatus = over.id as string;

        if (draggedRecord && draggedRecord.status !== newStatus) {
            await handleStatusChange(draggedRecord, newStatus);
        }
    }, [activeLaundry, handleStatusChange]);

    // Get guest name details
    const getGuestNameDetails = useCallback((guestId: string) => {
        const guest = guestMap.get(guestId) || null;
        const legalName = guest?.name || `${guest?.firstName || ''} ${guest?.lastName || ''}`.trim() || 'Unknown Guest';
        const preferredName = (guest?.preferredName || '').trim();
        const hasPreferred = Boolean(preferredName) && preferredName.toLowerCase() !== legalName.toLowerCase();
        const primaryName = hasPreferred ? preferredName : legalName;
        return { guest, legalName, preferredName, hasPreferred, primaryName };
    }, [guestMap]);

    const handleBulkLegacyPickup = useCallback(async () => {
        if (visibleLegacyLaundry.length === 0) return;
        const confirmed = window.confirm(
            `Mark all ${visibleLegacyLaundry.length} previous-day laundry item${visibleLegacyLaundry.length > 1 ? 's' : ''} as picked up?`
        );
        if (!confirmed) return;
        let successCount = 0;
        const failedNames: string[] = [];
        for (const record of visibleLegacyLaundry) {
            const isOnsite = record.laundryType === 'onsite' || !record.laundryType;
            try {
                const ok = await updateLaundryStatus(record.id, isOnsite ? 'picked_up' : 'offsite_picked_up');
                if (ok) successCount++;
                else failedNames.push(getGuestNameDetails(record.guestId).primaryName);
            } catch {
                // Keep going so one failure cannot block the rest, but
                // remember every failure for the summary below.
                failedNames.push(getGuestNameDetails(record.guestId).primaryName);
            }
        }
        if (successCount > 0) {
            toast.success(`${successCount} laundry item${successCount > 1 ? 's' : ''} marked as picked up`);
        }
        if (failedNames.length > 0) {
            const shown = failedNames.slice(0, 3).join(', ');
            const remainder = failedNames.length > 3 ? ` and ${failedNames.length - 3} more` : '';
            toast.error(
                `Could not mark ${failedNames.length} laundry item${failedNames.length > 1 ? 's' : ''} as picked up (${shown}${remainder}). ` +
                `They remain in the list — please retry them individually.`
            );
        } else if (successCount === 0) {
            toast.error('Could not mark laundry as picked up. Please try again.');
        }
    }, [visibleLegacyLaundry, updateLaundryStatus, getGuestNameDetails]);

    return (
        <div className="space-y-8">
            {/* Historical Data Warning Banner */}
            {isViewingPast && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <div>
                        <p className="text-sm font-bold text-amber-800">Viewing Historical Data</p>
                        <p className="text-xs text-amber-600">
                            You are viewing laundry records from {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}. 
                            Status updates are disabled in history view.
                        </p>
                    </div>
                </div>
            )}

            <div className="sticky top-0 z-20 space-y-2 rounded-xl bg-white/95 p-2 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-4 bg-white/95 p-3 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-4 flex-wrap">
                        {/* Date Picker for time travel */}
                        <ServiceDatePicker
                            selectedDate={selectedDate}
                            onDateChange={setSelectedDate}
                            isAdmin={isAdmin}
                        />
                        <div>
                            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
                                <WashingMachine className="text-purple-600" />
                                {viewMode === 'list' ? 'Laundry Overview' : 'On-site Laundry - Kanban Board'}
                            </h2>
                            <p className="text-sm text-gray-500 font-medium">
                                {isViewingPast ? 'Historical view - status updates disabled' : 'Drag and drop cards between columns to update status'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {!isViewingPast && (
                            <button
                                onClick={() => setShowSlotManager(true)}
                                className="min-h-11 min-w-11 flex items-center gap-2 px-3 py-1.5 bg-white text-gray-700 rounded-lg border hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                                <Settings className="w-4 h-4" />
                                Manage Slots
                            </button>
                        )}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode('kanban')}
                                className={cn(
                                    "min-h-11 min-w-11 flex items-center justify-center p-2 rounded-md transition-all",
                                    viewMode === 'kanban' ? "bg-white shadow text-purple-600" : "text-gray-500 hover:text-gray-700"
                                )}
                                title="Kanban View"
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    "min-h-11 min-w-11 flex items-center justify-center p-2 rounded-md transition-all",
                                    viewMode === 'list' ? "bg-white shadow text-purple-600" : "text-gray-500 hover:text-gray-700"
                                )}
                                title="List View"
                            >
                                <List size={16} />
                            </button>
                        </div>
                        <span className="bg-gray-100 text-gray-700 font-bold px-3 py-1 rounded-full text-sm">
                            {onsiteLaundry.length} total
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white/95 p-3">
                    <label className="flex-1 min-w-48 text-sm font-medium text-gray-700">
                        Find laundry
                        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Guest name or bag number" className="min-h-11 min-w-11 mt-1 w-full rounded-lg border border-gray-300 px-3 text-base" />
                    </label>
                    {viewMode === 'kanban' && <button type="button" aria-pressed={showPickedUp} onClick={() => setShowPickedUp(!showPickedUp)} className="min-h-11 min-w-11 rounded-lg border px-4 text-base font-medium">{showPickedUp ? 'Hide picked up' : 'Show picked up'}</button>}
                    <button type="button" onClick={() => setViewMode('auto')} aria-pressed={viewPreference === 'auto'} className="min-h-11 min-w-11 rounded-lg border px-4 text-sm">Auto layout</button>
                </div>

            </div>

            {/* End Service Day Panel - Only show for today */}
            {!isViewingPast && (
                <EndServiceDayPanel
                    showShower={false}
                    showLaundry={true}
                    pendingLaundryCount={pendingOnsiteLaundry.length}
                    onEndShowerDay={async () => { }}
                    onEndLaundryDay={handleEndLaundryDay}
                    isAdmin={isAdmin}
                />
            )}

            {/* Legacy Laundry — Pending Pickup (always visible, prominent) */}
            {!isViewingPast && visibleLegacyLaundry.length > 0 && (
                <div className="rounded-xl overflow-hidden border-2 border-red-300 shadow-md" data-testid="legacy-laundry-section">
                    {/* Prominent header */}
                    <div className="bg-gradient-to-r from-red-600 to-orange-500 px-5 py-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <AlertTriangle size={22} className="text-white" />
                                    <span className="absolute -top-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-yellow-300 ring-2 ring-red-600 animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-white tracking-tight">
                                        Previous Day Laundry — Action Required ({visibleLegacyLaundry.length})
                                    </h3>
                                    <p className="text-xs text-red-100 mt-0.5">
                                        These bookings are from previous days and still need to be picked up. They do not block today&apos;s slots.
                                    </p>
                                </div>
                            </div>
                            {isAdmin && visibleLegacyLaundry.length > 1 && (
                                <button
                                    type="button"
                                    onClick={handleBulkLegacyPickup}
                                    className="min-h-11 min-w-11 flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-lg border border-white/30 hover:bg-white/30 transition-colors whitespace-nowrap"
                                >
                                    <CheckCircle size={14} />
                                    Mark All Picked Up
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Cards */}
                    <div className="bg-red-50/60 px-4 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {visibleLegacyLaundry.map((record) => {
                                const { guest, primaryName, legalName, hasPreferred } = getGuestNameDetails(record.guestId);
                                const recordDateObj = new Date(record.date);
                                const todayObj = new Date(`${today}T12:00:00`);
                                const daysAgo = Math.max(1, Math.round((todayObj.getTime() - recordDateObj.getTime()) / (1000 * 60 * 60 * 24)));
                                const recordDateStr = recordDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                                const isOnsite = record.laundryType === 'onsite' || !record.laundryType;
                                const statusLabel = STATUS_COLUMNS.find(c => c.id === record.status)?.title
                                    || OFFSITE_STATUS_COLUMNS.find(c => c.id === record.status)?.title
                                    || record.status;
                                const isStale = daysAgo >= 3;

                                return (
                                    <div
                                        key={record.id}
                                        className={cn(
                                            "bg-white rounded-xl border-2 shadow-sm p-4 flex flex-col gap-2",
                                            isStale ? "border-red-300 ring-1 ring-red-200" : "border-orange-200"
                                        )}
                                    >
                                        {/* Guest name + waiver + status */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="min-w-0">
                                                    <span
                                                        className="font-bold text-sm text-gray-900 break-words block"
                                                        title={hasPreferred ? `${primaryName} (${legalName})` : legalName}
                                                    >
                                                        {primaryName}
                                                    </span>
                                                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                                                        <HousingStatusBadge housingStatus={guest?.housingStatus} />
                                                    </div>
                                                </div>
                                                <CompactWaiverIndicator guestId={record.guestId} serviceType="laundry" />
                                            </div>
                                            <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 whitespace-nowrap flex-shrink-0">
                                                {statusLabel}
                                            </span>
                                        </div>

                                        {/* Date + days-ago badge */}
                                        <div className="flex items-center gap-2">
                                            <CalendarDays size={13} className="text-gray-400 flex-shrink-0" />
                                            <span className="text-xs font-semibold text-gray-700">{recordDateStr}</span>
                                            <span
                                                className={cn(
                                                    "text-sm font-bold px-2 py-0.5 rounded-full",
                                                    isStale
                                                        ? "bg-red-100 text-red-700"
                                                        : "bg-amber-100 text-amber-700"
                                                )}
                                                data-testid="days-ago-badge"
                                            >
                                                {daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`}
                                            </span>
                                        </div>

                                        {/* Details */}
                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                            {record.bagNumber && (
                                                <span className="font-semibold text-purple-600">Bag #{record.bagNumber}</span>
                                            )}
                                            <span>{isOnsite ? 'On-site' : 'Off-site'}{record.time ? ` • ${record.time}` : ''}</span>
                                        </div>

                                        {/* Action button */}
                                        <button
                                            disabled={updatingIds.has(record.id)}
                                            onClick={() => handleStatusChange(record, isOnsite ? 'picked_up' : 'offsite_picked_up')}
                                            className="min-h-11 min-w-11 mt-1 flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                                        >
                                            <CheckCircle size={14} />
                                            Mark Picked Up
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* On-site Laundry Kanban */}
            <div className="space-y-4">
                <ServiceDayNote date={selectedDate} serviceType="laundry" />

                {viewMode === 'list' ? (
                    <CompactLaundryList viewDate={selectedDate} search={query} readOnly={isViewingPast} showOffsiteInitially />
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                    <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-hide">
                        {STATUS_COLUMNS.filter((column) => showPickedUp || isViewingPast || column.id !== 'picked_up').map((column) => {
                            const columnRecords = groupedLaundry[`onsite:${column.id}`] || [];
                            const Icon = column.icon;

                            return (
                                <DroppableColumn
                                    key={column.id}
                                    columnId={column.id}
                                    className={cn(
                                        "flex-shrink-0 w-56 lg:flex-1 lg:min-w-[180px] rounded-xl border-2 p-4 min-h-[400px] flex flex-col transition-colors",
                                        column.bg,
                                        column.border,
                                        activeId && activeRecord?.status !== column.id && "ring-2 ring-offset-2 ring-blue-200"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Icon size={18} className={column.color} />
                                            <h3 className={cn("font-bold text-sm", column.color)}>
                                                {column.title}
                                            </h3>
                                        </div>

                                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold", column.badgeClass)}>
                                            {columnRecords.length}
                                        </span>
                                    </div>

                                    <div className="space-y-3 flex-1">
                                        <AnimatePresence mode="popLayout">
                                            {columnRecords.map((record) => (
                                                <DraggableLaundryCard
                                                    key={record.id}
                                                    record={record}
                                                    guestDetails={getGuestNameDetails(record.guestId)}
                                                    isDragging={activeId === record.id}
                                                    onStatusChange={(newStatus) => handleStatusChange(record, newStatus)}
                                                    columns={STATUS_COLUMNS}
                                                    readOnly={isViewingPast}
                                                    isUpdating={updatingIds.has(record.id)} now={now}
                                                />
                                            ))}
                                            {columnRecords.length === 0 && (
                                                <div className="py-12 text-center">
                                                    <Icon size={32} className="mx-auto text-gray-200/50 mb-2" />
                                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No laundry</p>
                                                    <p className="text-sm text-gray-300 mt-1">Drag cards here</p>
                                                </div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </DroppableColumn>
                            );
                        })}

                    </div>
                    <DragOverlay>
                        {activeRecord ? (
                            <div className="bg-white rounded-lg border-2 border-blue-400 shadow-2xl p-3 opacity-90 w-56 rotate-2">
                                <div className="font-medium text-base text-gray-900">
                                    {getGuestNameDetails(activeRecord.guestId).primaryName}
                                </div>
                                {activeRecord.bagNumber && (
                                    <div className="text-sm text-purple-600 mt-1">Bag #{activeRecord.bagNumber}</div>
                                )}
                            </div>
                        ) : null}
                    </DragOverlay>
                    </DndContext>
                )}
            </div>

            {isAdmin && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="min-h-11 min-w-11 w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                        aria-expanded={showAddForm}
                    >
                        <span className="flex items-center gap-2">
                            <WashingMachine size={16} className="text-purple-600" />
                            Add Laundry Record
                            <span className="text-sm font-normal text-gray-400">
                                (saves to {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
                            </span>
                        </span>
                        <ChevronDown size={16} className={cn("text-gray-400 transition-transform", showAddForm && "rotate-180")} />
                    </button>
                    {showAddForm && (
                        <div className="px-4 pb-4 border-t border-gray-100">
                            <div className="flex flex-col xl:flex-row xl:items-end gap-3 pt-3">
                                <div className="flex-1">
                                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Add Individual Laundry Record</p>
                                    <select
                                        value={backfillGuestId}
                                        onChange={(event) => setBackfillGuestId(event.target.value)}
                                        className="min-h-11 min-w-11 w-full p-2.5 rounded-lg border border-gray-200 bg-white text-base"
                                    >
                                        <option value="">Select guest</option>
                                        {selectableGuests.map((guest) => {
                                            const displayName = guest.preferredName || guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest';
                                            return (
                                                <option key={guest.id} value={guest.id}>
                                                    {displayName}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                                <div className="w-full xl:w-40">
                                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Type</p>
                                    <select
                                        value={backfillLaundryType}
                                        onChange={(event) => {
                                            const laundryType = event.target.value as 'onsite' | 'offsite';
                                            setBackfillLaundryType(laundryType);
                                            if (laundryType === 'offsite') setBackfillSlotLabel('');
                                        }}
                                        className="min-h-11 min-w-11 w-full p-2.5 rounded-lg border border-gray-200 bg-white text-base"
                                    >
                                        <option value="onsite">On-site</option>
                                        <option value="offsite">Off-site</option>
                                    </select>
                                </div>
                                {backfillLaundryType === 'onsite' && (
                                    <div className="w-full xl:w-52">
                                        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Slot</p>
                                        <select
                                            value={backfillSlotLabel}
                                            onChange={(event) => setBackfillSlotLabel(event.target.value)}
                                            className="min-h-11 min-w-11 w-full p-2.5 rounded-lg border border-gray-200 bg-white text-base"
                                        >
                                            <option value="">Select slot</option>
                                            {selectedDateLaundrySlots.map((slotLabel) => (
                                                <option key={slotLabel} value={slotLabel}>{slotLabel}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="w-full xl:w-44">
                                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Bag # (Optional)</p>
                                    <input
                                        value={backfillBagNumber}
                                        onChange={(event) => setBackfillBagNumber(event.target.value)}
                                        placeholder="Bag number"
                                        className="min-h-11 min-w-11 w-full p-2.5 rounded-lg border border-gray-200 bg-white text-base"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAddLaundryRecord}
                                        disabled={!backfillGuestId || isAddingBackfill || backfillWeeklyLimitReached || (backfillLaundryType === 'onsite' && !backfillSlotLabel)}
                                        className={cn(
                                            "px-4 py-2.5 rounded-lg text-sm font-bold transition-colors",
                                            !backfillGuestId || isAddingBackfill || backfillWeeklyLimitReached || (backfillLaundryType === 'onsite' && !backfillSlotLabel)
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                        )}
                                    >
                                        {isAddingBackfill ? 'Saving...' : 'Add Laundry'}
                                    </button>
                                    <button
                                        onClick={handleAddCompletedLaundryRecord}
                                        disabled={!backfillGuestId || isAddingBackfill || backfillWeeklyLimitReached || (backfillLaundryType === 'onsite' && !backfillSlotLabel)}
                                        className={cn(
                                            "px-4 py-2.5 rounded-lg text-sm font-bold transition-colors",
                                            !backfillGuestId || isAddingBackfill || backfillWeeklyLimitReached || (backfillLaundryType === 'onsite' && !backfillSlotLabel)
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        )}
                                    >
                                        Add Completed
                                    </button>
                                </div>
                            </div>
                            {backfillWeeklyUsage && (
                                <div className={cn(
                                    'mt-3 flex items-start gap-3 p-3 rounded-xl border text-xs',
                                    backfillWeeklyUsage.limitReached
                                        ? 'bg-red-50 border-red-200 text-red-700'
                                        : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                                )}>
                                    <AlertTriangle size={16} className={cn('shrink-0 mt-0.5', backfillWeeklyUsage.limitReached ? 'text-red-500' : 'text-indigo-500')} />
                                    <p className="font-medium leading-relaxed">
                                        Weekly laundry for this guest: <span className="font-black">{backfillWeeklyUsage.count}/{backfillWeeklyUsage.max} loads</span>.
                                        {backfillWeeklyUsage.limitReached
                                            ? <> Limit reached — cannot assign more laundry until Monday, {formatDateForDisplay(backfillWeeklyUsage.nextWeekStart, { month: 'short', day: 'numeric' })}.</>
                                            : <> {backfillWeeklyUsage.remaining} remaining in this week.</>}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Off-site Laundry Kanban */}
            {viewMode === 'kanban' && <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
                                <Package className="text-blue-600" /> Off-site Laundry - Kanban Board
                            </h2>
                            <p className="text-sm text-gray-500 font-medium">Track laundry sent to external facility</p>
                        </div>
                        <span className="bg-gray-100 text-gray-700 font-bold px-3 py-1 rounded-full text-sm">
                            {offsiteLaundry.length} total
                        </span>
                    </div>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                    <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-hide">
                        {OFFSITE_STATUS_COLUMNS.filter((column) => showPickedUp || isViewingPast || column.id !== 'offsite_picked_up').map((column) => {
                            const columnRecords = groupedLaundry[`offsite:${column.id}`] || [];
                            const Icon = column.icon;

                            return (
                                <DroppableColumn
                                    key={column.id}
                                    columnId={column.id}
                                    className={cn(
                                        "flex-shrink-0 w-64 xl:flex-1 xl:min-w-[240px] rounded-xl border-2 p-4 min-h-[400px] flex flex-col transition-colors",
                                        column.bg,
                                        column.border,
                                        activeId && activeRecord?.status !== column.id && "ring-2 ring-offset-2 ring-blue-200"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Icon size={18} className={column.color} />
                                            <h3 className={cn("font-bold text-sm", column.color)}>
                                                {column.title}
                                            </h3>
                                        </div>
                                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold", column.badgeClass)}>
                                            {columnRecords.length}
                                        </span>
                                    </div>

                                    <div className="space-y-3 flex-1">
                                        <AnimatePresence mode="popLayout">
                                            {columnRecords.map((record) => (
                                                <DraggableLaundryCard
                                                    key={record.id}
                                                    record={record}
                                                    guestDetails={getGuestNameDetails(record.guestId)}
                                                    isDragging={activeId === record.id}
                                                    onStatusChange={(newStatus) => handleStatusChange(record, newStatus)}
                                                    columns={OFFSITE_STATUS_COLUMNS}
                                                    isOffsite
                                                    readOnly={isViewingPast}
                                                    isUpdating={updatingIds.has(record.id)} now={now}
                                                />
                                            ))}
                                            {columnRecords.length === 0 && (
                                                <div className="py-12 text-center">
                                                    <Icon size={32} className="mx-auto text-gray-200/50 mb-2" />
                                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No laundry</p>
                                                    <p className="text-sm text-gray-300 mt-1">Drag cards here</p>
                                                </div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </DroppableColumn>
                            );
                        })}
                    </div>
                    <DragOverlay>
                        {activeRecord ? (
                            <div className="bg-white rounded-lg border-2 border-blue-400 shadow-2xl p-3 opacity-90 w-56 rotate-2">
                                <div className="font-medium text-base text-gray-900">
                                    {getGuestNameDetails(activeRecord.guestId).primaryName}
                                </div>
                                {activeRecord.bagNumber && (
                                    <div className="text-sm text-purple-600 mt-1">Bag #{activeRecord.bagNumber}</div>
                                )}
                            </div>
                        ) : null}
                    </DragOverlay>
                    </DndContext>
            </div>

            }
            {bagDialog}
            <SlotBlockModal
                isOpen={showSlotManager}
                onClose={() => setShowSlotManager(false)}
                serviceType="laundry"
            />
        </div>
    );
}

/** @dnd-kit droppable column wrapper */
function DroppableColumn({ columnId, children, className }: { columnId: string; children: React.ReactNode; className?: string }) {
    const { isOver, setNodeRef } = useDroppable({ id: columnId });
    return (
        <div
            ref={setNodeRef}
            className={cn(className, isOver && 'ring-2 ring-blue-400 bg-blue-50/40')}
        >
            {children}
        </div>
    );
}

/** @dnd-kit draggable wrapper for LaundryCard */
interface DraggableLaundryCardProps {
    record: any;
    guestDetails: { guest: any; legalName: string; preferredName: string; hasPreferred: boolean; primaryName: string };
    isDragging: boolean;
    onStatusChange: (newStatus: string) => void;
    columns: typeof STATUS_COLUMNS;
    isOffsite?: boolean;
    readOnly?: boolean;
    isUpdating?: boolean;
    now: number;
}

function DraggableLaundryCard({ record, guestDetails, isDragging, onStatusChange, columns, isOffsite = false, readOnly = false, isUpdating = false, now }: DraggableLaundryCardProps) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: record.id,
        disabled: readOnly || isUpdating,
    });

    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
        : undefined;

    return (
        <div ref={setNodeRef} style={style}>
            <LaundryCard
                record={record}
                guestDetails={guestDetails}
                isDragging={isDragging}
                dragListeners={{ ...attributes, ...listeners }}
                onStatusChange={onStatusChange}
                columns={columns}
                isOffsite={isOffsite}
                readOnly={readOnly}
                isUpdating={isUpdating} now={now}
            />
        </div>
    );
}

interface LaundryCardProps {
    record: any;
    guestDetails: { guest: any; legalName: string; preferredName: string; hasPreferred: boolean; primaryName: string };
    isDragging: boolean;
    dragListeners?: Record<string, any>;
    onStatusChange: (newStatus: string) => void;
    columns: typeof STATUS_COLUMNS;
    isOffsite?: boolean;
    readOnly?: boolean;
    isUpdating?: boolean;
    now: number;
}

function LaundryCard({ record, guestDetails, isDragging, dragListeners, onStatusChange, columns, isOffsite = false, readOnly = false, isUpdating = false, now }: LaundryCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditingBag, setIsEditingBag] = useState(false);
    const [bagValue, setBagValue] = useState(record.bagNumber || '');
    const { updateLaundryBagNumber, deleteLaundryRecord } = useServicesStore(useShallow((s) => ({ updateLaundryBagNumber: s.updateLaundryBagNumber, deleteLaundryRecord: s.deleteLaundryRecord })));

    const isCompleted = record.status === 'picked_up' || record.status === 'offsite_picked_up';
    const nextAction = LAUNDRY_NEXT_ACTION[isOffsite && record.status === 'waiting' ? 'pending' : record.status];

    const handleSaveBag = async () => {
        if (readOnly) return;
        try {
            if (await updateLaundryBagNumber(record.id, bagValue) === false) {
                throw new Error('Failed to save bag number');
            }
            setIsEditingBag(false);
            toast.success('Bag number saved');
        } catch {
            toast.error('Failed to save bag number');
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Cancel laundry booking for ${guestDetails.primaryName}?`)) return;
        try {
            await deleteLaundryRecord(record.id);
            toast.success('Laundry booking cancelled');
        } catch {
            toast.error('Failed to cancel laundry booking');
        }
    };

    return (
        <div
            className={cn(
                "bg-white rounded-lg border-2 shadow-sm p-3 transition-all hover:shadow-md",
                "cursor-default",
                isDragging && "opacity-50 scale-105",
                isCompleted ? "border-emerald-200 hover:border-emerald-300" : "border-gray-200 hover:border-gray-300"
            )}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
            >
                <div className="flex items-center justify-between gap-1.5 mb-2 min-h-[24px]">
                    {!readOnly && (
                        <button type="button" {...dragListeners}
                            className="min-h-11 min-w-11 flex-shrink-0 touch-none cursor-grab text-gray-500"
                            aria-label="Drag to reorder"
                        >
                            <GripVertical size={20} />
                        </button>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base text-gray-900 leading-tight break-words" title={guestDetails.hasPreferred ? `${guestDetails.preferredName} (${guestDetails.legalName})` : guestDetails.legalName}>
                            {guestDetails.primaryName}
                        </div>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <HousingStatusBadge housingStatus={guestDetails.guest?.housingStatus} />
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {/* Waiver indicator for non-completed laundry */}
                        {!isCompleted && (
                            <CompactWaiverIndicator guestId={record.guestId} serviceType="laundry" />
                        )}
                        <button
                            type="button"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="min-h-11 min-w-11 flex items-center justify-center text-gray-500 transition-colors flex-shrink-0"
                            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} laundry details`}
                        >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    </div>
                </div>

                {/* Secondary info line */}
                {(guestDetails.hasPreferred || (!isOffsite && record.time)) && (
                    <div className="text-sm text-gray-600 mb-2 break-words">
                        {guestDetails.hasPreferred && guestDetails.legalName}
                        {guestDetails.hasPreferred && !isOffsite && record.time && ' • '}
                        {!isOffsite && record.time}
                    </div>
                )}

                <div className="space-y-2">
                    {record.bagNumber && (
                        <div className="flex items-start gap-1.5 text-xs text-gray-600 bg-purple-50 border border-purple-100 rounded px-2 py-1.5">
                            <Package size={12} className="text-purple-600 flex-shrink-0 mt-0.5" />
                            <span>Bag #{record.bagNumber}</span>
                        </div>
                    )}

                    {isOffsite && (
                        <div className="text-xs bg-blue-50 border border-blue-100 rounded px-2 py-1">
                            <span className="font-semibold text-blue-700">Off-site laundry</span>
                        </div>
                    )}

                    {/* Time tracking indicator */}
                    {!isCompleted && (record.createdAt || record.lastUpdated) && (
                        <div
                            className="flex items-center gap-1.5 text-sm text-gray-500 bg-gray-50 rounded px-2 py-1 cursor-help"
                            title={`Dropoff: ${record.createdAt ? formatTimeElapsed(record.createdAt, now) + ' ago' : 'N/A'}\nIn current status: ${record.lastUpdated ? formatTimeElapsed(record.lastUpdated, now) + ' ago' : 'N/A'}`}
                        >
                            <Timer size={10} className="text-gray-400 flex-shrink-0" />
                            <span>
                                {record.lastUpdated && record.lastUpdated !== record.createdAt ? (
                                    <>
                                        <span className="font-bold text-gray-700">{formatTimeElapsed(record.lastUpdated, now)}</span> in status
                                        <span className="text-gray-300 mx-1">•</span>
                                        <span className="text-gray-400">Total: {formatTimeElapsed(record.createdAt, now) || '—'}</span>
                                    </>
                                ) : (
                                    <span>{formatTimeElapsed(record.createdAt, now) || '—'}</span>
                                )}
                            </span>
                        </div>
                    )}

                    {!readOnly && nextAction && <button type="button" disabled={isUpdating} onClick={() => onStatusChange(nextAction.status)} className="min-h-11 min-w-11 w-full rounded-lg bg-purple-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{isUpdating ? 'Saving…' : nextAction.label}</button>}
                    {isExpanded && (
                        <div className="pt-2 mt-2 border-t border-gray-100 space-y-2">
                            <div>
                                <label className="block text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                                    Bag Number
                                </label>
                                {isEditingBag && !readOnly ? (
                                    <div className="flex gap-1">
                                        <input
                                            type="text"
                                            value={bagValue}
                                            onChange={(e) => setBagValue(e.target.value)}
                                            placeholder="Enter bag number"
                                            className="min-h-11 min-w-11 flex-1 border border-gray-200 rounded px-2 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                                            autoFocus
                                        />
                                        <button onClick={handleSaveBag} className="min-h-11 min-w-11 px-2 py-1 bg-purple-600 text-white rounded text-sm font-bold">
                                            <Save size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <span className={cn("text-xs font-medium", record.bagNumber ? "text-gray-900" : "text-gray-300 italic")}>
                                            {record.bagNumber || 'No Bag #'}
                                        </span>
                                        {!readOnly && (
                                            <button
                                                onClick={() => {
                                                    // Re-seed from the record so a bag number saved after
                                                    // mount (drag prompt, another device) isn't wiped on Save
                                                    setBagValue(record.bagNumber || '');
                                                    setIsEditingBag(true);
                                                }}
                                                className="min-h-11 min-w-11 text-sm text-blue-500 hover:underline"
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {!readOnly && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                                        Status
                                    </label>
                                    <select
                                        value={record.status}
                                        disabled={isUpdating}
                                        onChange={(e) => onStatusChange(e.target.value)}
                                        className="min-h-11 min-w-11 w-full border border-gray-200 rounded px-2 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                                    >
                                        {columns.map((col) => (
                                            <option key={col.id} value={col.id}>{col.title}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {(!readOnly || (readOnly && (record.status === 'waiting' || record.status === 'pending'))) && (
                                <button
                                    type="button"
                                    onClick={() => void handleDelete()}
                                    className="min-h-11 min-w-11 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded px-3 py-1.5 transition-colors"
                                >
                                    <Trash2 size={12} />
                                    Cancel Booking
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

function getPortrait() { return window.matchMedia('(max-width: 1023px), (orientation: portrait)').matches; }
function subscribePortrait(callback: () => void) {
    const media = window.matchMedia('(max-width: 1023px), (orientation: portrait)');
    media.addEventListener('change', callback);
    return () => media.removeEventListener('change', callback);
}
