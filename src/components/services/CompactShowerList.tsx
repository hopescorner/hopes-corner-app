'use client';

import React, { memo, useMemo, useState, useCallback } from "react";
import { User, Clock, CheckCircle, AlertCircle, XCircle, RotateCcw, Loader2 } from "lucide-react";
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useServicesStore } from '@/stores/useServicesStore';
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
}

const ShowerListRow = memo(({ record, guestName, onGuestClick, readOnly = false, queuePosition }: {
    record: any;
    guestName: string;
    onGuestClick?: (guestId: string, recordId: string) => void;
    readOnly?: boolean;
    queuePosition?: number;
}) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const updateShowerStatus = useServicesStore((s) => s.updateShowerStatus);

    const handleStatusUpdate = useCallback(async (e: React.MouseEvent, newStatus: string) => {
        e.stopPropagation();
        if (readOnly) return;
        setIsUpdating(true);
        try {
            await updateShowerStatus(record.id, newStatus);
            toast.success(newStatus === 'done' ? 'Shower completed' : 'Status updated');
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
                    "w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm",
                    record.status === 'done' ? 'bg-emerald-500' :
                    record.status === 'waitlisted' ? 'bg-amber-500' : 'bg-sky-500'
                )}>
                    {queuePosition != null ? (
                        <span className="text-xs font-black">#{queuePosition}</span>
                    ) : record.status === 'waitlisted' ? <Clock size={14} /> : (
                        record.time ? record.time.split(':')[0] : <User size={14} />
                    )}
                </div>
                <div className="min-w-0">
                    <h4 className="font-bold text-gray-900 text-sm truncate group-hover:text-sky-700 transition-colors">
                        {guestName}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        {record.time && (
                            <span className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                <Clock size={10} />
                                {formatSlotLabel(record.time)}
                            </span>
                        )}
                        {record.status === 'waitlisted' && (
                            <span className="text-amber-600 font-medium flex items-center gap-1">
                                <AlertCircle size={10} /> {queuePosition != null ? `Queue #${queuePosition}` : 'Waitlisted'}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <ReminderIndicator guestId={record.guestId} serviceType="shower" compact />
                <CompactWaiverIndicator guestId={record.guestId} serviceType="shower" />

                {!readOnly && isActive && (
                    <>
                        <button
                            disabled={isUpdating}
                            onClick={(e) => handleStatusUpdate(e, 'done')}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors flex items-center gap-1 shadow-sm"
                            aria-label="Complete shower"
                        >
                            {isUpdating ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />}
                            Done
                        </button>
                        <button
                            disabled={isUpdating}
                            onClick={handleCancel}
                            className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
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
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-600 transition-colors flex items-center gap-1"
                        aria-label="Reopen shower"
                    >
                        {isUpdating ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
                        Reopen
                    </button>
                )}

                {!readOnly && isCancelledOrNoShow && (
                    <button
                        disabled={isUpdating}
                        onClick={(e) => handleStatusUpdate(e, 'booked')}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-500 hover:bg-sky-50 hover:text-sky-600 transition-colors flex items-center gap-1"
                        aria-label="Rebook shower"
                    >
                        {isUpdating ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
                        Rebook
                    </button>
                )}

                <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                    record.status === 'done'
                        ? "bg-emerald-100 text-emerald-700"
                        : record.status === 'booked'
                            ? "bg-sky-100 text-sky-700"
                            : record.status === 'cancelled' || record.status === 'no_show'
                                ? "bg-red-100 text-red-600"
                                : "bg-amber-100 text-amber-700"
                )}>
                    {record.status}
                </span>
            </div>
        </div>
    );
});
ShowerListRow.displayName = "ShowerListRow";

const CompactShowerList = memo(({ records, onGuestClick, readOnly = false, waitlistQueueMap }: Props) => {
    const guests = useGuestsStore((s) => s.guests);

    const guestMap = useMemo(() => {
        const map = new Map<string, (typeof guests)[number]>();
        for (const guest of guests) {
            if (guest?.id) map.set(guest.id, guest);
        }
        return map;
    }, [guests]);

    if (records.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <div className="flex justify-center mb-2">
                    <User size={24} className="text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">No showers in this list</p>
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
                            guestName={guestName}
                            onGuestClick={onGuestClick}
                            readOnly={readOnly}
                            queuePosition={waitlistQueueMap?.get(record.id)}
                        />
                    );
                })}
            </div>
        </div>
    );
});

CompactShowerList.displayName = "CompactShowerList";

export default CompactShowerList;
