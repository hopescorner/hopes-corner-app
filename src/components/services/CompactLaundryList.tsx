'use client';

import React, { useMemo, useState, useCallback, memo } from "react";
import { WashingMachine, Clock, CheckCircle, Package, Wind, Truck, ChevronDown, ChevronUp, Eye, ChevronRight, Loader2 } from "lucide-react";
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { todayPacificDateString, pacificDateStringFrom, formatPacificTimeString } from '@/lib/utils/date';
import { CompactWaiverIndicator } from '@/components/ui/CompactWaiverIndicator';
import { ReminderIndicator } from '@/components/ui/ReminderIndicator';
import { cn } from '@/lib/utils/cn';
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
}

interface LaundryBooking {
    id: string;
    guestId: string;
    name: string;
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

// Shared status change hook
function useStatusChange(recordId: string, readOnly: boolean) {
    const [isUpdating, setIsUpdating] = useState(false);
    const { updateLaundryStatus, updateLaundryBagNumber } = useServicesStore();

    const handleStatusChange = useCallback(async (e: React.MouseEvent | React.ChangeEvent<HTMLSelectElement>, newStatus: string, currentRecord?: LaundryBooking) => {
        if ('stopPropagation' in e) e.stopPropagation();
        if (readOnly || isUpdating) return;

        // Check if bag number is needed (moving out of waiting/pending without one)
        if (currentRecord && !currentRecord.bagNumber) {
            const isOffsite = currentRecord.laundryType === 'offsite';
            const currentStatus = currentRecord.status;
            const needsBag = isOffsite
                ? (currentStatus === 'pending' || currentStatus === 'waiting') && newStatus !== 'pending' && newStatus !== 'waiting'
                : currentStatus === 'waiting' && newStatus !== 'waiting';

            if (needsBag) {
                const manualBag = window.prompt('A bag number is required before moving out of waiting. Enter one to continue.');
                const trimmedBag = (manualBag || '').trim();
                if (!trimmedBag) {
                    toast.error('Please enter a bag number to continue');
                    return;
                }
                try {
                    await updateLaundryBagNumber(recordId, trimmedBag);
                    toast.success('Bag number saved');
                } catch {
                    toast.error('Failed to save bag number');
                    return;
                }
            }
        }

        setIsUpdating(true);
        try {
            await updateLaundryStatus(recordId, newStatus);
            toast.success('Status updated');
        } catch {
            toast.error('Failed to update status');
        } finally {
            setIsUpdating(false);
        }
    }, [recordId, readOnly, isUpdating, updateLaundryStatus, updateLaundryBagNumber]);

    return { isUpdating, handleStatusChange };
}

// Memoized active laundry row
const ActiveLaundryRow = memo(({ booking, onGuestClick, readOnly = false }: { booking: LaundryBooking; onGuestClick?: (guestId: string, recordId: string) => void; readOnly?: boolean }) => {
    const handleClick = useCallback(() => {
        onGuestClick?.(booking.guestId, booking.id);
    }, [onGuestClick, booking.guestId, booking.id]);

    const { isUpdating, handleStatusChange } = useStatusChange(booking.id, readOnly);
    const isOffsite = booking.laundryType === 'offsite';
    const nextStatus = getNextStatus(booking.status, isOffsite);
    const statusOptions = isOffsite ? OFFSITE_STATUS_OPTIONS : ONSITE_STATUS_OPTIONS;

    return (
        <div
            onClick={handleClick}
            className={cn(
                "px-4 py-2.5 flex items-center justify-between gap-3 transition-colors duration-75",
                onGuestClick ? "hover:bg-purple-50 cursor-pointer active:bg-purple-100" : "hover:bg-gray-50"
            )}
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-xs font-medium text-gray-500 w-16 flex-shrink-0">
                    {booking.timeLabel}
                </span>
                <div className="min-w-0 flex-1">
                    <span className="font-medium text-gray-900 text-sm truncate block">
                        {booking.name}
                    </span>
                    {booking.bagNumber && (
                        <span className="text-xs text-purple-600">Bag #{booking.bagNumber}</span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <ReminderIndicator guestId={booking.guestId} serviceType="laundry" compact />
                <CompactWaiverIndicator guestId={booking.guestId} serviceType="laundry" />

                {!readOnly && nextStatus && (
                    <button
                        disabled={isUpdating}
                        onClick={(e) => handleStatusChange(e, nextStatus, booking)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-500 text-white hover:bg-purple-600 transition-colors flex items-center gap-1 shadow-sm"
                        aria-label={`Advance to ${getNextStatusLabel(nextStatus)}`}
                    >
                        {isUpdating ? <Loader2 size={10} className="animate-spin" /> : <ChevronRight size={10} />}
                        {getNextStatusLabel(nextStatus)}
                    </button>
                )}

                {!readOnly && (
                    <select
                        value={booking.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStatusChange(e, e.target.value, booking)}
                        disabled={isUpdating}
                        className="text-[10px] font-medium border border-gray-200 rounded-lg px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer"
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
    );
});
ActiveLaundryRow.displayName = "ActiveLaundryRow";

// Memoized done laundry row
const DoneLaundryRow = memo(({ booking, onGuestClick, readOnly = false }: { booking: LaundryBooking; onGuestClick?: (guestId: string, recordId: string) => void; readOnly?: boolean }) => {
    const handleClick = useCallback(() => {
        onGuestClick?.(booking.guestId, booking.id);
    }, [onGuestClick, booking.guestId, booking.id]);

    const { isUpdating, handleStatusChange } = useStatusChange(booking.id, readOnly);
    const statusOptions = ONSITE_STATUS_OPTIONS;

    return (
        <div
            onClick={handleClick}
            className={cn(
                "px-4 py-2.5 flex items-center justify-between gap-3 transition-colors duration-75",
                onGuestClick ? "hover:bg-emerald-100 cursor-pointer active:bg-emerald-200" : "hover:bg-emerald-50"
            )}
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-xs font-medium text-emerald-600 w-16 flex-shrink-0">
                    {booking.timeLabel}
                </span>
                <div className="min-w-0 flex-1">
                    <span className="font-medium text-gray-700 text-sm truncate block">
                        {booking.name}
                    </span>
                    {booking.bagNumber && (
                        <span className="text-xs text-emerald-600">Bag #{booking.bagNumber}</span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                {!readOnly && (
                    <select
                        value={booking.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStatusChange(e, e.target.value, booking)}
                        disabled={isUpdating}
                        className="text-[10px] font-medium border border-gray-200 rounded-lg px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer"
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
    );
});
DoneLaundryRow.displayName = "DoneLaundryRow";

// Memoized offsite laundry row (active)
const OffsiteActiveRow = memo(({ item, onGuestClick, readOnly = false }: { item: LaundryBooking; onGuestClick?: (guestId: string, recordId: string) => void; readOnly?: boolean }) => {
    const handleClick = useCallback(() => {
        onGuestClick?.(item.guestId, item.id);
    }, [onGuestClick, item.guestId, item.id]);

    const { isUpdating, handleStatusChange } = useStatusChange(item.id, readOnly);
    const nextStatus = getNextStatus(item.status, true);

    return (
        <div
            onClick={handleClick}
            className={cn(
                "px-4 py-2.5 flex items-center justify-between gap-3 transition-colors duration-75",
                onGuestClick ? "hover:bg-blue-100 cursor-pointer active:bg-blue-200" : ""
            )}
        >
            <div className="min-w-0 flex-1">
                <span className="font-medium text-blue-900 text-sm truncate block">
                    {item.name}
                </span>
                {item.bagNumber && (
                    <span className="text-xs text-blue-600">Bag #{item.bagNumber}</span>
                )}
            </div>
            <div className="flex items-center gap-2">
                <ReminderIndicator guestId={item.guestId} serviceType="laundry" compact />
                <CompactWaiverIndicator guestId={item.guestId} serviceType="laundry" />

                {!readOnly && nextStatus && (
                    <button
                        disabled={isUpdating}
                        onClick={(e) => handleStatusChange(e, nextStatus, item)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-1 shadow-sm"
                        aria-label={`Advance to ${getNextStatusLabel(nextStatus)}`}
                    >
                        {isUpdating ? <Loader2 size={10} className="animate-spin" /> : <ChevronRight size={10} />}
                        {getNextStatusLabel(nextStatus)}
                    </button>
                )}

                {!readOnly && (
                    <select
                        value={item.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStatusChange(e, e.target.value, item)}
                        disabled={isUpdating}
                        className="text-[10px] font-medium border border-gray-200 rounded-lg px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
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
    );
});
OffsiteActiveRow.displayName = "OffsiteActiveRow";

// Memoized offsite laundry row (done)
const OffsiteDoneRow = memo(({ item, onGuestClick, readOnly = false }: { item: LaundryBooking; onGuestClick?: (guestId: string, recordId: string) => void; readOnly?: boolean }) => {
    const handleClick = useCallback(() => {
        onGuestClick?.(item.guestId, item.id);
    }, [onGuestClick, item.guestId, item.id]);

    const { isUpdating, handleStatusChange } = useStatusChange(item.id, readOnly);

    return (
        <div
            onClick={handleClick}
            className={cn(
                "px-4 py-2.5 flex items-center justify-between gap-3 bg-emerald-50/30 transition-colors duration-75",
                onGuestClick ? "hover:bg-emerald-100 cursor-pointer active:bg-emerald-200" : ""
            )}
        >
            <div className="min-w-0 flex-1">
                <span className="font-medium text-emerald-900 text-sm truncate block">
                    {item.name}
                </span>
                {item.bagNumber && (
                    <span className="text-xs text-emerald-600">Bag #{item.bagNumber}</span>
                )}
            </div>
            <div className="flex items-center gap-2">
                {!readOnly && (
                    <select
                        value={item.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStatusChange(e, e.target.value, item)}
                        disabled={isUpdating}
                        className="text-[10px] font-medium border border-gray-200 rounded-lg px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
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
    );
});
OffsiteDoneRow.displayName = "OffsiteDoneRow";

/**
 * CompactLaundryList - A simplified read-only view of laundry bookings for a specific date
 * Shows guest name, time slot, and status in a compact format for quick reference
 * Can view today's laundry or travel back in time to see laundry from past dates
 */
const CompactLaundryList = memo(({ viewDate = null, onGuestClick, readOnly = false }: CompactLaundryListProps) => {
    const { laundryRecords } = useServicesStore();
    const { guests } = useGuestsStore();

    const [showOffsite, setShowOffsite] = useState(false);
    const [showDone, setShowDone] = useState(false);

    // Store in a ref so we don't recompute today's date on every render
    // but typically useMemo is fine
    const todayString = todayPacificDateString();

    // Use provided viewDate or default to today
    const displayDate = viewDate || todayString;

    // Create completed status set for efficient lookup
    const completedStatuses = useMemo(() => new Set<string>([
        LAUNDRY_STATUS.DONE,
        LAUNDRY_STATUS.PICKED_UP,
        LAUNDRY_STATUS.RETURNED,
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
        return guest.name || guest.preferredName || `${guest.firstName || ""} ${guest.lastName || ""}`.trim() || "Guest";
    }, [guestMap]);

    // Filter target day records - only records from the selected date.
    // Past active records are surfaced by the dedicated legacy section in LaundrySection.
    const targetDayRecords = useMemo(() => {
        return (laundryRecords || []).filter((record) => {
            return pacificDateStringFrom(record.date) === displayDate;
        });
    }, [laundryRecords, displayDate]);

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
                time: record.time,
                timeLabel: formatLaundrySlot(record.time),
                status: record.status,
                bagNumber: record.bagNumber,
                laundryType: record.laundryType,
            }));

        const offsiteActive = offsite.filter(item => !isCompletedStatus(item.status));
        const offsiteDone = offsite.filter(item => isCompletedStatus(item.status));

        return { onsiteActive, onsiteDone, offsiteActive, offsiteDone, total: targetDayRecords.length };
    }, [targetDayRecords, getGuestName, isCompletedStatus]);

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
                    <span className="text-xs text-gray-500 ml-auto flex items-center gap-1">
                        <Eye size={12} /> Quick View
                    </span>
                </div>
                <p className="text-sm text-gray-500 text-center py-4">
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
                    <div className="flex items-center gap-2">
                        <WashingMachine size={18} className="text-purple-600" />
                        <h3 className="font-semibold text-gray-900 text-sm">
                            {isViewingPastDate ? `Laundry (${dateLabel})` : "All Laundry (Today)"}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
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
                <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                    {laundryData.onsiteActive.length === 0 && laundryData.onsiteDone.length > 0 && (
                        <div className="px-4 py-8 text-center">
                            <CheckCircle size={24} className="mx-auto text-emerald-400 mb-2" />
                            <p className="text-sm text-gray-500">All on-site laundry completed</p>
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
                        className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                        <span className="flex items-center gap-2">
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
                        className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            <Truck size={14} />
                            Off-site ({laundryData.offsiteActive.length + laundryData.offsiteDone.length})
                        </span>
                        {showOffsite ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showOffsite && (
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
