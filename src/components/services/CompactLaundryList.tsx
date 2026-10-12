'use client';

import React, { useMemo, useState, useCallback, memo } from "react";
import { WashingMachine, Clock, CheckCircle, Package, Wind, Truck, ChevronDown, ChevronUp, Eye, ChevronRight, Loader2, Pencil, Save, X } from "lucide-react";
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { todayPacificDateString, pacificDateStringFrom, formatPacificTimeString } from '@/lib/utils/date';
import { HousingStatusBadge } from '@/components/ui/HousingStatusBadge';
import { CompactWaiverIndicator } from '@/components/ui/CompactWaiverIndicator';
import { ReminderIndicator } from '@/components/ui/ReminderIndicator';
import { cn } from '@/lib/utils/cn';
import { useShallow } from 'zustand/react/shallow';
import { useLaundryStatusChange, LAUNDRY_NEXT_ACTION } from './useLaundryStatusChange';
import toast from 'react-hot-toast';

// Status Constants
const LAUNDRY_STATUS = {
    WAITING: 'waiting',
    WASHER: 'washer',
    DRYER: 'dryer',
    DONE: 'done',
    PICKED_UP: 'picked_up',
    PENDING: 'pending',
    TRANSPORTED: 'transported',
    RETURNED: 'returned',
    OFFSITE_PICKED_UP: 'offsite_picked_up',
} as const;

// Types
interface CompactLaundryListProps {
    viewDate?: string | null;
    onGuestClick?: (guestId: string, recordId: string) => void;
    readOnly?: boolean;
    search?: string;
    showOffsiteInitially?: boolean;
    readyOnly?: boolean;
}

interface LaundryBooking {
    id: string;
    guestId: string;
    name: string;
    housingStatus?: string;
    time?: string | null;
    timeLabel: string;
    status: string;
    bagNumber?: string;
    createdAt?: string;
    laundryType?: string;
}

// Memoized helper functions
const formatLaundrySlot = (slot: string | null | undefined): string => {
    if (!slot) return "—";
    const [start] = String(slot).split(" - ");
    const [hoursStr, minutesStr = '00'] = String(start).split(":");
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return slot;
    return formatPacificTimeString(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
};

const parseSlotStartMinutes = (slot: string | null | undefined): number => {
    if (!slot) return Number.POSITIVE_INFINITY;
    const [start] = String(slot).split(" - ");
    const [h, m] = String(start).split(":");
    return parseInt(h, 10) * 60 + parseInt(m, 10);
};

// Memoized status badge component
const LaundryStatusBadge = memo(({ status }: { status: string }) => {
    const statusConfig: Record<string, { icon: any; label: string; className: string }> = {
        [LAUNDRY_STATUS.WAITING]: {
            icon: Clock,
            label: "Waiting",
            className: "bg-amber-100 text-amber-700"
        },
        [LAUNDRY_STATUS.WASHER]: {
            icon: WashingMachine,
            label: "Washer",
            className: "bg-blue-100 text-blue-700"
        },
        [LAUNDRY_STATUS.DRYER]: {
            icon: Wind,
            label: "Dryer",
            className: "bg-purple-100 text-purple-700"
        },
        [LAUNDRY_STATUS.DONE]: {
            icon: Package,
            label: "Done",
            className: "bg-emerald-100 text-emerald-700"
        },
        [LAUNDRY_STATUS.PICKED_UP]: {
            icon: CheckCircle,
            label: "Picked Up",
            className: "bg-green-100 text-green-700"
        },
        [LAUNDRY_STATUS.PENDING]: {
            icon: Clock,
            label: "Pending",
            className: "bg-amber-100 text-amber-700"
        },
        [LAUNDRY_STATUS.TRANSPORTED]: {
            icon: Truck,
            label: "Transported",
            className: "bg-blue-100 text-blue-700"
        },
        [LAUNDRY_STATUS.RETURNED]: {
            icon: Package,
            label: "Returned",
            className: "bg-teal-100 text-teal-700"
        },
        [LAUNDRY_STATUS.OFFSITE_PICKED_UP]: {
            icon: CheckCircle,
            label: "Picked Up",
            className: "bg-green-100 text-green-700"
        },
    };

    const config = statusConfig[status] || {
        icon: Clock,
        label: status || "Unknown",
        className: "bg-gray-100 text-gray-600"
    };
    const Icon = config.icon;

    return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", config.className)}>
            <Icon size={12} />
            {config.label}
        </span>
    );
});
LaundryStatusBadge.displayName = "LaundryStatusBadge";

// Inline bag-number editor for list rows (mirrors the kanban card Edit field).
// Display mode shows the saved bag (or "No Bag #") with an Add/Edit button;
// editing mode shows an input with Save/Cancel. Reads the freshest store
// value when opening so a bag saved elsewhere isn't wiped on Save.
const LaundryBagEditor = memo(({ booking, readOnly = false, displayClassName = "text-purple-600" }: { booking: LaundryBooking; readOnly?: boolean; displayClassName?: string }) => {
    const { updateLaundryBagNumber } = useServicesStore(useShallow((s) => ({ updateLaundryBagNumber: s.updateLaundryBagNumber })));
    const [isEditing, setIsEditing] = useState(false);
    const [bagValue, setBagValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const openEditor = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        const fresh = useServicesStore.getState?.().laundryRecords?.find((r) => r.id === booking.id);
        setBagValue(fresh?.bagNumber ?? booking.bagNumber ?? '');
        setIsEditing(true);
    }, [booking.bagNumber, booking.id]);

    const closeEditor = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        setIsEditing(false);
    }, []);

    const handleSave = useCallback(async (event: React.FormEvent | React.MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();
        if (isSaving) return;
        setIsSaving(true);
        try {
            if (await updateLaundryBagNumber(booking.id, bagValue) === false) {
                throw new Error('Failed to save bag number');
            }
            setIsEditing(false);
            toast.success('Bag number saved');
        } catch {
            toast.error('Failed to save bag number');
        } finally {
            setIsSaving(false);
        }
    }, [bagValue, booking.id, isSaving, updateLaundryBagNumber]);

    if (readOnly) {
        if (!booking.bagNumber) return null;
        return (
            <span className={cn("text-xs", displayClassName)}>Bag #{booking.bagNumber}</span>
        );
    }

    if (isEditing) {
        return (
            <form
                onSubmit={handleSave}
                onClick={(e) => e.stopPropagation()}
                className="mt-1 flex items-center gap-1.5"
            >
                <input
                    type="text"
                    value={bagValue}
                    onChange={(e) => setBagValue(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Bag #"
                    aria-label={`Bag number for ${booking.name}`}
                    autoFocus
                    disabled={isSaving}
                    className="min-h-11 w-28 rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <button
                    type="submit"
                    disabled={isSaving}
                    onClick={handleSave}
                    aria-label={`Save bag number for ${booking.name}`}
                    className="min-h-11 min-w-11 flex items-center justify-center rounded-lg bg-purple-700 px-2 text-white hover:bg-purple-600 disabled:cursor-wait"
                >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                </button>
                <button
                    type="button"
                    disabled={isSaving}
                    onClick={closeEditor}
                    aria-label={`Cancel editing bag number for ${booking.name}`}
                    className="min-h-11 min-w-11 flex items-center justify-center rounded-lg border border-gray-300 px-2 text-gray-600 hover:bg-gray-100"
                >
                    <X size={14} />
                </button>
            </form>
        );
    }

    return (
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={cn("text-xs", booking.bagNumber ? displayClassName : "italic text-gray-500")}>
                {booking.bagNumber ? `Bag #${booking.bagNumber}` : 'No Bag #'}
            </span>
            <button
                type="button"
                onClick={openEditor}
                aria-label={`${booking.bagNumber ? 'Edit' : 'Add'} bag number for ${booking.name}`}
                className="min-h-11 min-w-11 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-50 hover:underline"
            >
                <Pencil size={12} />
                {booking.bagNumber ? 'Edit' : 'Add'}
            </button>
        </span>
    );
});
LaundryBagEditor.displayName = "LaundryBagEditor";

// Status flow definitions for quick-advance buttons
const ONSITE_STATUS_FLOW: string[] = ['waiting', 'washer', 'dryer', 'done', 'picked_up'];
const OFFSITE_STATUS_FLOW: string[] = ['pending', 'transported', 'returned', 'offsite_picked_up'];

const ONSITE_STATUS_OPTIONS = [
    { id: 'waiting', label: 'Waiting' },
    { id: 'washer', label: 'Washer' },
    { id: 'dryer', label: 'Dryer' },
    { id: 'done', label: 'Done' },
    { id: 'picked_up', label: 'Picked Up' },
];

const OFFSITE_STATUS_OPTIONS = [
    { id: 'pending', label: 'Pending' },
    { id: 'transported', label: 'Transported' },
    { id: 'returned', label: 'Returned' },
    { id: 'offsite_picked_up', label: 'Picked Up' },
];

function getNextStatus(currentStatus: string, isOffsite: boolean): string | null {
    const flow = isOffsite ? OFFSITE_STATUS_FLOW : ONSITE_STATUS_FLOW;
    const idx = flow.indexOf(currentStatus);
    if (idx === -1 || idx >= flow.length - 1) return null;
    return flow[idx + 1];
}

function getNextStatusLabel(nextStatus: string): string {
    const labels: Record<string, string> = {
        washer: 'Washer',
        dryer: 'Dryer',
        done: 'Done',
        picked_up: 'Picked Up',
        transported: 'Transported',
        returned: 'Returned',
        offsite_picked_up: 'Picked Up',
    };
    return labels[nextStatus] || nextStatus;
}

function useStatusChange(recordId: string, readOnly: boolean) {
    const { changeStatus, updatingIds, bagDialog } = useLaundryStatusChange(readOnly);
    const handleStatusChange = (event: React.MouseEvent | React.ChangeEvent<HTMLSelectElement>, status: string, record?: LaundryBooking) => {
        event.stopPropagation();
        if (record) void changeStatus(record, status, record.name);
    };
    return { isUpdating: updatingIds.has(recordId), handleStatusChange, bagDialog };
}

const ActiveLaundryRow = memo(({ booking, onGuestClick, readOnly = false }: { booking: LaundryBooking; onGuestClick?: (guestId: string, recordId: string) => void; readOnly?: boolean }) => {
    const handleClick = useCallback(() => {
        onGuestClick?.(booking.guestId, booking.id);
    }, [onGuestClick, booking.guestId, booking.id]);

    const { isUpdating, handleStatusChange, bagDialog } = useStatusChange(booking.id, readOnly);
    const isOffsite = booking.laundryType === 'offsite';
    const nextStatus = getNextStatus(booking.status, isOffsite);
    const statusOptions = isOffsite ? OFFSITE_STATUS_OPTIONS : ONSITE_STATUS_OPTIONS;

    return (
        <>
        {bagDialog}
        <div
            onClick={handleClick}
            className={cn(
                "px-4 py-3 flex flex-wrap items-center justify-between gap-3 transition-colors duration-75",
                onGuestClick ? "hover:bg-purple-50 cursor-pointer active:bg-purple-100" : "hover:bg-gray-50"
            )}
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-xs font-medium text-gray-600 w-16 flex-shrink-0">
                    {booking.timeLabel}
                </span>
                <div className="min-w-0 flex-1">
                    <span className="font-medium text-gray-900 text-base break-words block">
                        {booking.name}
                    </span>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <HousingStatusBadge housingStatus={booking.housingStatus} />
                    </div>
                    <LaundryBagEditor booking={booking} readOnly={readOnly} displayClassName="text-purple-600" />
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <ReminderIndicator guestId={booking.guestId} serviceType="laundry" compact />
                <CompactWaiverIndicator guestId={booking.guestId} serviceType="laundry" />

                {!readOnly && nextStatus && (
                    <button
                        disabled={isUpdating}
                        onClick={(e) => handleStatusChange(e, nextStatus, booking)}
                        className="min-h-11 min-w-11 px-2 py-1 rounded-lg text-sm font-bold bg-purple-700 text-white hover:bg-purple-600 transition-colors flex items-center gap-1 shadow-sm"
                        aria-label={`Advance to ${getNextStatusLabel(nextStatus)}`}
                    >
                        {isUpdating ? <Loader2 size={10} className="animate-spin" /> : <ChevronRight size={10} />}
                        {LAUNDRY_NEXT_ACTION[isOffsite && booking.status === 'waiting' ? 'pending' : booking.status]?.label || getNextStatusLabel(nextStatus)}
                    </button>
                )}

                {!readOnly && (
                    <select
                        value={booking.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStatusChange(e, e.target.value, booking)}
                        disabled={isUpdating}
                        className="min-h-11 min-w-11 text-base font-medium border border-gray-200 rounded-lg px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer"
                        aria-label="Change laundry status"
                    >
                        {statusOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                    </select>
                )}

                {readOnly && <LaundryStatusBadge status={booking.status} />}
            </div>
        </div>
        </>
    );
});
ActiveLaundryRow.displayName = "ActiveLaundryRow";

// Memoized done laundry row
const DoneLaundryRow = memo(({ booking, onGuestClick, readOnly = false }: { booking: LaundryBooking; onGuestClick?: (guestId: string, recordId: string) => void; readOnly?: boolean }) => {
    const handleClick = useCallback(() => {
        onGuestClick?.(booking.guestId, booking.id);
    }, [onGuestClick, booking.guestId, booking.id]);

    const { isUpdating, handleStatusChange, bagDialog } = useStatusChange(booking.id, readOnly);
    const statusOptions = ONSITE_STATUS_OPTIONS;

    return (
        <>
        {bagDialog}
        <div
            onClick={handleClick}
            className={cn(
                "px-4 py-3 flex flex-wrap items-center justify-between gap-3 transition-colors duration-75",
                onGuestClick ? "hover:bg-emerald-100 cursor-pointer active:bg-emerald-200" : "hover:bg-emerald-50"
            )}
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-xs font-medium text-emerald-700 w-16 flex-shrink-0">
                    {booking.timeLabel}
                </span>
                <div className="min-w-0 flex-1">
                    <span className="font-medium text-gray-700 text-base break-words block">
                        {booking.name}
                    </span>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <HousingStatusBadge housingStatus={booking.housingStatus} />
                    </div>
                    <LaundryBagEditor booking={booking} readOnly={readOnly} displayClassName="text-emerald-700" />
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                {!readOnly && (
                    <select
                        value={booking.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStatusChange(e, e.target.value, booking)}
                        disabled={isUpdating}
                        className="min-h-11 min-w-11 text-base font-medium border border-gray-200 rounded-lg px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer"
                        aria-label="Change laundry status"
                    >
                        {statusOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                    </select>
                )}
                {readOnly && <LaundryStatusBadge status={booking.status} />}
            </div>
        </div>
        </>
    );
});
DoneLaundryRow.displayName = "DoneLaundryRow";

// Memoized offsite laundry row (active)
const OffsiteActiveRow = memo(({ item, onGuestClick, readOnly = false }: { item: LaundryBooking; onGuestClick?: (guestId: string, recordId: string) => void; readOnly?: boolean }) => {
    const handleClick = useCallback(() => {
        onGuestClick?.(item.guestId, item.id);
    }, [onGuestClick, item.guestId, item.id]);

    const { isUpdating, handleStatusChange, bagDialog } = useStatusChange(item.id, readOnly);
    const nextStatus = getNextStatus(item.status, true);

    return (
        <>
        {bagDialog}
        <div
            onClick={handleClick}
            className={cn(
                "px-4 py-3 flex flex-wrap items-center justify-between gap-3 transition-colors duration-75",
                onGuestClick ? "hover:bg-blue-100 cursor-pointer active:bg-blue-200" : ""
            )}
        >
            <div className="min-w-0 flex-1">
                <span className="font-medium text-blue-900 text-base break-words block">
                    {item.name}
                </span>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <HousingStatusBadge housingStatus={item.housingStatus} />
                </div>
                <LaundryBagEditor booking={item} readOnly={readOnly} displayClassName="text-blue-600" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <ReminderIndicator guestId={item.guestId} serviceType="laundry" compact />
                <CompactWaiverIndicator guestId={item.guestId} serviceType="laundry" />

                {!readOnly && nextStatus && (
                    <button
                        disabled={isUpdating}
                        onClick={(e) => handleStatusChange(e, nextStatus, item)}
                        className="min-h-11 min-w-11 px-2 py-1 rounded-lg text-sm font-bold bg-blue-700 text-white hover:bg-blue-600 transition-colors flex items-center gap-1 shadow-sm"
                        aria-label={`Advance to ${getNextStatusLabel(nextStatus)}`}
                    >
                        {isUpdating ? <Loader2 size={10} className="animate-spin" /> : <ChevronRight size={10} />}
                        {LAUNDRY_NEXT_ACTION[item.status === 'waiting' ? 'pending' : item.status]?.label || getNextStatusLabel(nextStatus)}
                    </button>
                )}

                {!readOnly && (
                    <select
                        value={item.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStatusChange(e, e.target.value, item)}
                        disabled={isUpdating}
                        className="min-h-11 min-w-11 text-base font-medium border border-gray-200 rounded-lg px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
                        aria-label="Change laundry status"
                    >
                        {OFFSITE_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                    </select>
                )}

                {readOnly && <LaundryStatusBadge status={item.status} />}
            </div>
        </div>
        </>
    );
});
OffsiteActiveRow.displayName = "OffsiteActiveRow";

// Memoized offsite laundry row (done)
const OffsiteDoneRow = memo(({ item, onGuestClick, readOnly = false }: { item: LaundryBooking; onGuestClick?: (guestId: string, recordId: string) => void; readOnly?: boolean }) => {
    const handleClick = useCallback(() => {
        onGuestClick?.(item.guestId, item.id);
    }, [onGuestClick, item.guestId, item.id]);

    const { isUpdating, handleStatusChange, bagDialog } = useStatusChange(item.id, readOnly);

    return (
        <>
        {bagDialog}
        <div
            onClick={handleClick}
            className={cn(
                "px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-emerald-50/30 transition-colors duration-75",
                onGuestClick ? "hover:bg-emerald-100 cursor-pointer active:bg-emerald-200" : ""
            )}
        >
            <div className="min-w-0 flex-1">
                <span className="font-medium text-emerald-900 text-base break-words block">
                    {item.name}
                </span>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <HousingStatusBadge housingStatus={item.housingStatus} />
                </div>
                <LaundryBagEditor booking={item} readOnly={readOnly} displayClassName="text-emerald-700" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
                {!readOnly && (
                    <select
                        value={item.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStatusChange(e, e.target.value, item)}
                        disabled={isUpdating}
                        className="min-h-11 min-w-11 text-base font-medium border border-gray-200 rounded-lg px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
                        aria-label="Change laundry status"
                    >
                        {OFFSITE_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                    </select>
                )}
                {readOnly && <LaundryStatusBadge status={item.status} />}
            </div>
        </div>
        </>
    );
});
OffsiteDoneRow.displayName = "OffsiteDoneRow";

/**
 * CompactLaundryList - A compact list view of laundry bookings for a specific date
 * Shows guest name, time slot, bag number, and status for quick reference.
 * Bag numbers can be added or edited inline (matching the kanban card Edit
 * field); status changes still go through the shared bag-number gate.
 * Can view today's laundry or travel back in time to see laundry from past dates
 */
const CompactLaundryList = memo(({ viewDate = null, onGuestClick, readOnly = false, search = '', showOffsiteInitially = false, readyOnly = false }: CompactLaundryListProps) => {
    const { laundryRecords } = useServicesStore(useShallow((s) => ({ laundryRecords: s.laundryRecords })));
    const { guests } = useGuestsStore(useShallow((s) => ({ guests: s.guests })));

    const [showOffsite, setShowOffsite] = useState(showOffsiteInitially);
    const [showDone, setShowDone] = useState(false);

    // Store in a ref so we don't recompute today's date on every render
    // but typically useMemo is fine
    const todayString = todayPacificDateString();

    // Use provided viewDate or default to today
    const displayDate = viewDate || todayString;

    // Create completed status set for efficient lookup
    const completedStatuses = useMemo(() => new Set<string>([
        LAUNDRY_STATUS.PICKED_UP,
        LAUNDRY_STATUS.OFFSITE_PICKED_UP,
    ]), []);

    const isCompletedStatus = useCallback((status: string) => {
        return completedStatuses.has(status);
    }, [completedStatuses]);

    // Create a stable guest lookup map for efficient name resolution
    const guestMap = useMemo(() => {
        const map = new Map();
        (guests || []).forEach(g => map.set(g.id, g));
        return map;
    }, [guests]);

    // Helper function to get guest name - uses memoized map for performance
    const getGuestName = useCallback((guestId: string) => {
        const guest = guestMap.get(guestId);
        if (!guest) return "Guest";
        return guest.preferredName || guest.name || `${guest.firstName || ""} ${guest.lastName || ""}`.trim() || "Guest";
    }, [guestMap]);

    const getGuestHousingStatus = useCallback((guestId: string) => {
        return guestMap.get(guestId)?.housingStatus;
    }, [guestMap]);

    // Filter target day records - only records from the selected date.
    // Past active records are surfaced by the dedicated legacy section in LaundrySection.
    const targetDayRecords = useMemo(() => {
        return (laundryRecords || []).filter((record) => {
            const guest = guestMap.get(record.guestId);
            const matches = !search || [guest?.name, guest?.preferredName, guest?.firstName, guest?.lastName, record.bagNumber].join(' ').toLowerCase().includes(search.toLowerCase());
            return pacificDateStringFrom(record.date) === displayDate && matches && (!readyOnly || record.status === 'done' || record.status === 'returned');
        });
    }, [laundryRecords, displayDate, guestMap, search, readyOnly]);

    // Group laundry records by type and status
    const laundryData = useMemo(() => {
        const onsite = targetDayRecords
            .filter(r => r.laundryType !== "offsite")
            .sort((a, b) => {
                // First sort by time slot
                const timeDiff = parseSlotStartMinutes(a.time) - parseSlotStartMinutes(b.time);
                if (timeDiff !== 0) return timeDiff;
                // Within same slot, sort by createdAt
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return aTime - bTime;
            })
            .map(record => ({
                id: record.id,
                guestId: record.guestId,
                name: getGuestName(record.guestId),
                housingStatus: getGuestHousingStatus(record.guestId),
                time: record.time,
                timeLabel: formatLaundrySlot(record.time),
                status: record.status,
                bagNumber: record.bagNumber,
                laundryType: record.laundryType,
            }));

        const onsiteActive = onsite.filter(item => !isCompletedStatus(item.status));
        const onsiteDone = onsite.filter(item => isCompletedStatus(item.status));

        const offsite = targetDayRecords
            .filter(r => r.laundryType === "offsite")
            .sort((a, b) => {
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return aTime - bTime;
            })
            .map(record => ({
                id: record.id,
                guestId: record.guestId,
                name: getGuestName(record.guestId),
                housingStatus: getGuestHousingStatus(record.guestId),
                time: record.time,
                timeLabel: formatLaundrySlot(record.time),
                status: record.status,
                bagNumber: record.bagNumber,
                laundryType: record.laundryType,
            }));

        const offsiteActive = offsite.filter(item => !isCompletedStatus(item.status));
        const offsiteDone = offsite.filter(item => isCompletedStatus(item.status));

        return { onsiteActive, onsiteDone, offsiteActive, offsiteDone, total: targetDayRecords.length };
    }, [targetDayRecords, getGuestHousingStatus, getGuestName, isCompletedStatus]);

    // Memoized toggle handlers
    const toggleOffsite = useCallback(() => setShowOffsite(prev => !prev), []);
    const toggleDone = useCallback(() => setShowDone(prev => !prev), []);

    // Determine if viewing a past date
    const isViewingPastDate = displayDate !== todayString;
    const dateLabel = isViewingPastDate
        ? (() => {
            const [year, month, day] = displayDate.split("-").map(Number);
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
            });
        })()
        : "Today";

    if (laundryData.total === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                    <WashingMachine size={18} className="text-purple-600" />
                    <h3 className="font-semibold text-gray-900 text-sm">
                        Laundry {isViewingPastDate ? `(${dateLabel})` : "Today"}
                    </h3>
                    <span className="text-xs text-gray-600 ml-auto flex items-center gap-1">
                        <Eye size={12} /> Quick View
                    </span>
                </div>
                <p className="text-sm text-gray-600 text-center py-4">
                    No laundry bookings for {dateLabel.toLowerCase()}
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-50 to-white px-4 py-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <WashingMachine size={18} className="text-purple-600" />
                        <h3 className="font-semibold text-gray-900 text-sm">
                            {isViewingPastDate ? `Laundry (${dateLabel})` : "All Laundry (Today)"}
                        </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs text-gray-600 flex items-center gap-1">
                            <Eye size={12} /> Quick View
                        </span>
                        <span className="text-xs font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            {laundryData.total} total
                        </span>
                    </div>
                </div>
            </div>

            {/* On-site List */}
            {(laundryData.onsiteActive.length > 0 || laundryData.onsiteDone.length > 0) && (
                <div className="divide-y divide-gray-100 ">
                    {laundryData.onsiteActive.length === 0 && laundryData.onsiteDone.length > 0 && (
                        <div className="px-4 py-8 text-center">
                            <CheckCircle size={24} className="mx-auto text-emerald-400 mb-2" />
                            <p className="text-sm text-gray-600">All on-site laundry completed</p>
                        </div>
                    )}
                    {laundryData.onsiteActive.map((booking) => (
                        <ActiveLaundryRow
                            key={booking.id}
                            booking={booking}
                            onGuestClick={onGuestClick}
                            readOnly={readOnly}
                        />
                    ))}
                </div>
            )}

            {/* Done Laundry Section */}
            {laundryData.onsiteDone.length > 0 && (
                <div className="border-t border-emerald-200 bg-emerald-50">
                    <button
                        type="button"
                        onClick={toggleDone}
                        className="min-h-11 min-w-11 w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                        <span className="flex flex-wrap items-center gap-3">
                            <CheckCircle size={14} />
                            Done Laundry ({laundryData.onsiteDone.length})
                        </span>
                        {showDone ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showDone && (
                        <div className="divide-y divide-emerald-200/50 bg-white">
                            {laundryData.onsiteDone.map((booking) => (
                                <DoneLaundryRow
                                    key={booking.id}
                                    booking={booking}
                                    onGuestClick={onGuestClick}
                                    readOnly={readOnly}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Off-site Section */}
            {(laundryData.offsiteActive.length > 0 || laundryData.offsiteDone.length > 0) && (
                <div className="border-t border-blue-200 bg-blue-50">
                    <button
                        type="button"
                        onClick={toggleOffsite}
                        className="min-h-11 min-w-11 w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                        <span className="flex flex-wrap items-center gap-3">
                            <Truck size={14} />
                            Off-site ({laundryData.offsiteActive.length + laundryData.offsiteDone.length})
                        </span>
                        {showOffsite ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {(showOffsite || readyOnly) && (
                        <div className="divide-y divide-blue-200/50">
                            {laundryData.offsiteActive.map((item) => (
                                <OffsiteActiveRow
                                    key={item.id}
                                    item={item}
                                    onGuestClick={onGuestClick}
                                    readOnly={readOnly}
                                />
                            ))}
                            {laundryData.offsiteDone.map((item) => (
                                <OffsiteDoneRow
                                    key={item.id}
                                    item={item}
                                    onGuestClick={onGuestClick}
                                    readOnly={readOnly}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

CompactLaundryList.displayName = "CompactLaundryList";

export default CompactLaundryList;
