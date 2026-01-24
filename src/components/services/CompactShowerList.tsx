'use client';

import React, { memo } from "react";
import { User, Clock, CheckCircle, AlertCircle, Calendar } from "lucide-react";
import { useGuestsStore } from '@/stores/useGuestsStore';
import { CompactWaiverIndicator } from '@/components/ui/CompactWaiverIndicator';
import { ReminderIndicator } from '@/components/ui/ReminderIndicator';
import { cn } from '@/lib/utils/cn';
import { formatSlotLabel } from '@/lib/utils/serviceSlots';

interface Props {
    records: any[];
    onGuestClick?: (guestId: string, recordId: string) => void;
}

const CompactShowerList = memo(({ records, onGuestClick }: Props) => {
    const { guests } = useGuestsStore();

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
                    const guest = guests.find(g => g.id === record.guestId);
                    const guestName = guest ? (guest.preferredName || guest.name) : 'Unknown Guest';

                    return (
                        <div
                            key={record.id}
                            onClick={() => onGuestClick?.(record.guestId, record.id)}
                            className={cn(
                                "group flex items-center justify-between p-3 transition-colors",
                                onGuestClick ? "cursor-pointer hover:bg-sky-50" : ""
                            )}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm",
                                    record.status === 'done' ? 'bg-emerald-500' : 'bg-sky-500'
                                )}>
                                    {record.status === 'waitlisted' ? <Clock size={14} /> : (
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
                                                <AlertCircle size={10} /> Waitlisted
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <ReminderIndicator guestId={record.guestId} serviceType="shower" compact />
                                <CompactWaiverIndicator guestId={record.guestId} serviceType="shower" />

                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                                    record.status === 'done'
                                        ? "bg-emerald-100 text-emerald-700"
                                        : record.status === 'booked'
                                            ? "bg-sky-100 text-sky-700"
                                            : "bg-amber-100 text-amber-700"
                                )}>
                                    {record.status}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

CompactShowerList.displayName = "CompactShowerList";

export default CompactShowerList;
