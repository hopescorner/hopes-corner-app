'use client';

import React, { memo, useMemo, useState, useCallback, useEffect } from "react";
import { User, Clock, CheckCircle, AlertCircle, XCircle, RotateCcw, Loader2 } from "lucide-react";
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useItemsStore } from '@/stores/useItemsStore';
import { ShowerIneligibleSupplies } from './ShowerIneligibleSupplies';
import { HousingStatusBadge } from '@/components/ui/HousingStatusBadge';
import { CompactWaiverIndicator } from '@/components/ui/CompactWaiverIndicator';
import { ReminderIndicator } from '@/components/ui/ReminderIndicator';
import { cn } from '@/lib/utils/cn';
import { formatSlotLabel } from '@/lib/utils/serviceSlots';
import toast from 'react-hot-toast';

interface Props {
    records: any[];
    onGuestClick?: (guestId: string, recordId: string) => void;
    readOnly?: boolean;
    waitlistQueueMap?: Map<string, number>;
    timeCues?: Map<string, string>;
    onAssignSlot?: (guestId: string) => void;
}

const ShowerListRow = memo(({ record, guestId, guestName, housingStatus, onGuestClick, readOnly = false, queuePosition, timeCue, onAssignSlot }: {
    record: any;
    guestId?: string;
    guestName: string;
    housingStatus?: string;
    onGuestClick?: (guestId: string, recordId: string) => void;
    readOnly?: boolean;
    queuePosition?: number;
    timeCue?: string;
    onAssignSlot?: (guestId: string) => void;
}) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const updateShowerStatus = useServicesStore((s) => s.updateShowerStatus);

    const handleStatusUpdate = useCallback(async (e: React.MouseEvent, newStatus: string) => {
        e.stopPropagation();
        if (readOnly) return;
        setIsUpdating(true);
        try {
            const ok = await updateShowerStatus(record.id, newStatus);
            if (ok) toast.success(newStatus === 'done' ? 'Shower completed' : 'Status updated');
            else toast.error('Failed to update status');
        } catch {
            toast.error('Failed to update status');
        } finally {
            setIsUpdating(false);
        }
    }, [record.id, readOnly, updateShowerStatus]);

    const handleCancel = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (readOnly) return;
        if (!window.confirm('Are you sure you want to cancel this shower?')) return;
        setIsUpdating(true);
        try {
            const success = await updateShowerStatus(record.id, 'cancelled');
            if (success) {
                toast.success('Shower cancelled');
            } else {
                toast.error('Failed to cancel shower');
            }
        } catch {
            toast.error('Failed to cancel shower');
        } finally {
            setIsUpdating(false);
        }
    }, [record.id, readOnly, updateShowerStatus]);

    const isActive = record.status !== 'done' && record.status !== 'cancelled' && record.status !== 'no_show';
    const isDone = record.status === 'done';
    const isCancelledOrNoShow = record.status === 'cancelled' || record.status === 'no_show';

    return (
        <div
            onClick={() => onGuestClick?.(record.guestId, record.id)}
            className={cn(
                "group flex items-center justify-between p-3 transition-colors",
                onGuestClick ? "cursor-pointer hover:bg-sky-50" : ""
            )}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                    "w-11 h-11 shrink-0 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm",
                    record.status === 'done' ? 'bg-emerald-700' :
                    record.status === 'waitlisted' ? 'bg-amber-700' : 'bg-sky-700'
                )}>
                    {queuePosition != null ? (
                        <span className="text-xs font-black">#{queuePosition}</span>
                    ) : record.status === 'waitlisted' ? <Clock size={14} /> : (
                        <User size={20} />
                    )}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-gray-900 text-base break-words group-hover:text-sky-700 transition-colors">
                            {guestName}
                        </h4>
                        {guestId && <ShowerIneligibleSupplies guestId={guestId} />}
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-gray-600">
                        <HousingStatusBadge housingStatus={housingStatus} />
                        {record.time && (
                            <span className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded text-sm font-medium">
                                <Clock size={16} />
                                {timeCue && <span className="font-bold text-sky-700">{timeCue}</span>}
                                {formatSlotLabel(record.time)}
                            </span>
                        )}
                        {record.status === 'waitlisted' && (
                            <span className="text-amber-800 font-medium flex items-center gap-1">
                                <AlertCircle size={10} /> {queuePosition != null ? `Queue #${queuePosition}` : 'Waitlisted'}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <ReminderIndicator guestId={record.guestId} serviceType="shower" compact />
                <CompactWaiverIndicator guestId={record.guestId} serviceType="shower" />

                {!readOnly && record.status === 'waitlisted' && onAssignSlot && <button type="button" onClick={(event) => { event.stopPropagation(); onAssignSlot(record.guestId); }} className="min-h-11 rounded-lg bg-sky-700 px-4 text-sm font-bold text-white">Assign slot</button>}
                {!readOnly && isActive && (
                    <>
                        <button
                            disabled={isUpdating}
                            onClick={(e) => handleStatusUpdate(e, 'done')}
                            className="min-h-11 min-w-11 px-2 py-1 rounded-lg text-sm font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors flex items-center gap-1 shadow-sm"
                            aria-label="Complete shower"
                        >
                            {isUpdating ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />}
                            Done
                        </button>
                        <button
                            disabled={isUpdating}
                            onClick={handleCancel}
                            className="min-h-11 min-w-11 p-1 rounded-lg text-gray-600 hover:text-red-500 hover:bg-red-50 transition-colors"
                            aria-label="Cancel shower"
                        >
                            <XCircle size={16} />
                        </button>
                    </>
                )}

                {!readOnly && isDone && (
                    <button
                        disabled={isUpdating}
                        onClick={(e) => handleStatusUpdate(e, 'booked')}
                        className="min-h-11 min-w-11 px-2 py-1 rounded-lg text-sm font-bold bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-800 transition-colors flex items-center gap-1"
                        aria-label="Reopen shower"
                    >
                        {isUpdating ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
                        Reopen
                    </button>
                )}

                {!readOnly && isCancelledOrNoShow && (
                    <>
                        {record.status === 'cancelled' && (
                            <button
                                disabled={isUpdating}
                                onClick={(e) => handleStatusUpdate(e, 'booked')}
                                className="min-h-11 min-w-11 px-2 py-1 rounded-lg text-sm font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors flex items-center gap-1"
                                aria-label="Undo cancellation"
                            >
                                {isUpdating ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
                                Undo Cancel
                            </button>
                        )}
                        <button
                            disabled={isUpdating}
                            onClick={(e) => handleStatusUpdate(e, 'done')}
                            className="min-h-11 min-w-11 px-2 py-1 rounded-lg text-sm font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                            aria-label="Complete cancelled shower"
                        >
                            {isUpdating ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />}
                            Mark Done
                        </button>
                    </>
                )}

                <span className={cn(
                    "px-2 py-0.5 rounded-full text-sm font-black uppercase tracking-widest",
                    record.status === 'done'
                        ? "bg-emerald-100 text-emerald-700"
                        : record.status === 'booked'
                            ? "bg-sky-100 text-sky-700"
                            : record.status === 'cancelled' || record.status === 'no_show'
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                )}>
                    {record.status}
                </span>
            </div>
        </div>
    );
});
ShowerListRow.displayName = "ShowerListRow";

const CompactShowerList = memo(({ records, onGuestClick, readOnly = false, waitlistQueueMap, timeCues, onAssignSlot }: Props) => {
    const guests = useGuestsStore((s) => s.guests);
    const fetchItemsForGuests = useItemsStore((s) => s.fetchItemsForGuests);

    const guestMap = useMemo(() => {
        const map = new Map<string, (typeof guests)[number]>();
        for (const guest of guests) {
            if (guest?.id) map.set(guest.id, guest);
        }
        return map;
    }, [guests]);

    const visibleGuestIdsKey = useMemo(() => {
        const ids = new Set<string>();
        for (const record of records || []) {
            if (record?.guestId) ids.add(record.guestId);
        }
        return [...ids].sort().join(',');
    }, [records]);

    useEffect(() => {
        if (typeof fetchItemsForGuests !== 'function' || !visibleGuestIdsKey) return;
        const ids = visibleGuestIdsKey.split(',').filter(Boolean);
        if (ids.length === 0) return;
        void fetchItemsForGuests(ids);
    }, [visibleGuestIdsKey, fetchItemsForGuests]);

    if (records.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <div className="flex justify-center mb-2">
                    <User size={24} className="text-gray-600" />
                </div>
                <p className="text-gray-600 font-medium">No showers in this list</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="divide-y divide-gray-100">
                {records.map((record) => {
                    const guest = guestMap.get(record.guestId);
                    const guestName = guest ? (guest.preferredName || guest.name) : 'Unknown Guest';

                    return (
                        <ShowerListRow
                            key={record.id}
                            record={record}
                            guestId={record.guestId}
                            guestName={guestName}
                            housingStatus={guest?.housingStatus}
                            onGuestClick={onGuestClick}
                            readOnly={readOnly}
                            queuePosition={waitlistQueueMap?.get(record.id)}
                            timeCue={timeCues?.get(record.id)}
                            onAssignSlot={onAssignSlot}
                        />
                    );
                })}
            </div>
        </div>
    );
});

CompactShowerList.displayName = "CompactShowerList";

export default CompactShowerList;
