'use client';

import React, { useState, useEffect } from 'react';
import {
    Shield,
    ShieldAlert,
    Unlock,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Calendar,
    AlertTriangle
} from 'lucide-react';
import { useBlockedSlotsStore } from '@/stores/useBlockedSlotsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { pacificDateStringFrom } from '@/lib/utils/date';
import { generateShowerSlots, generateLaundrySlots, formatSlotLabel } from '@/lib/utils/serviceSlots';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

interface SlotBlockManagerProps {
    serviceType: 'shower' | 'laundry';
}

export function SlotBlockManager({ serviceType }: SlotBlockManagerProps) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const { fetchBlockedSlots, blockSlot, unblockSlot, isSlotBlocked } = useBlockedSlotsStore();
    const { showerRecords, laundryRecords } = useServicesStore();
    const [loading, setLoading] = useState(false);
    const [processingSlot, setProcessingSlot] = useState<string | null>(null);

    // Format date specifically for our logic
    const getDateString = (date: Date) => pacificDateStringFrom(date);

    // Display format for header
    const getDisplayDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const dateStr = getDateString(selectedDate);

    // Load slots on mount and when date changes
    useEffect(() => {
        setLoading(true);
        fetchBlockedSlots().finally(() => setLoading(false));
    }, [fetchBlockedSlots]);

    const handleDateChange = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + days);
        setSelectedDate(newDate);
    };

    const toggleSlotBlock = async (slotLabel: string) => {
        if (processingSlot) return;

        const isBlocked = isSlotBlocked(serviceType, slotLabel, dateStr);
        setProcessingSlot(slotLabel);

        try {
            if (isBlocked) {
                // Unblock using the same parameters (store handles logic)
                await unblockSlot(serviceType, slotLabel, dateStr);
                toast.success('Slot unblocked successfully');
            } else {
                // Check if slot has bookings
                let hasBookings = false;
                if (serviceType === 'shower') {
                    hasBookings = showerRecords.some(r => r.time === slotLabel && r.date?.startsWith(dateStr));
                } else {
                    hasBookings = laundryRecords.some(r => r.time === slotLabel && r.laundryType === 'onsite' && r.date?.startsWith(dateStr));
                }

                if (hasBookings) {
                    const confirmBlock = window.confirm(
                        'Warning: This slot already has active bookings. Blocking it will stop NEW bookings but will NOT cancel existing ones. Continue?'
                    );
                    if (!confirmBlock) {
                        setProcessingSlot(null);
                        return;
                    }
                }

                await blockSlot(serviceType, slotLabel, dateStr);
                toast.success('Slot blocked successfully');
            }
        } catch (error) {
            console.error('Failed to toggle block', error);
            toast.error('Failed to update slot status');
        } finally {
            setProcessingSlot(null);
        }
    };

    const slots = serviceType === 'shower' ? generateShowerSlots(selectedDate) : generateLaundrySlots(selectedDate);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
            {/* Header / Date Control */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-lg text-white",
                        serviceType === 'shower' ? "bg-cyan-500" : "bg-purple-500"
                    )}>
                        <Shield size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 leading-tight">
                            Manage {serviceType === 'shower' ? 'Shower' : 'Laundry'} Slots
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">Block time slots for maintenance or staff break</p>
                    </div>
                </div>

                <div className="flex items-center bg-white rounded-lg border border-gray-200 shadow-sm">
                    <button
                        onClick={() => handleDateChange(-1)}
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors border-r border-gray-100"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <div className="px-4 py-2 text-sm font-bold text-gray-700 min-w-[160px] text-center flex items-center justify-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        {getDisplayDate(selectedDate)}
                    </div>
                    <button
                        onClick={() => handleDateChange(1)}
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors border-l border-gray-100"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-6 text-xs font-semibold text-gray-500 bg-white">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-white border-2 border-green-200"></div>
                    <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-50 border-2 border-red-200"></div>
                    <span>Blocked</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gray-50 border-2 border-gray-200 opacity-50"></div>
                    <span>Has Bookings (Warning)</span>
                </div>
            </div>

            {/* Slots Grid */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                {loading ? (
                    <div className="h-40 flex items-center justify-center text-gray-400">
                        <Loader2 className="animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {slots.map((slot) => {
                            const isBlocked = isSlotBlocked(serviceType, slot, dateStr);
                            const isProcessing = processingSlot === slot;

                            // Check for bookings
                            let bookingCount = 0;
                            if (serviceType === 'shower') {
                                bookingCount = showerRecords.filter(r => r.time === slot && r.date?.startsWith(dateStr)).length;
                            } else {
                                bookingCount = laundryRecords.filter(r => r.time === slot && r.laundryType === 'onsite' && r.date?.startsWith(dateStr)).length;
                            }
                            const hasBookings = bookingCount > 0;

                            return (
                                <button
                                    key={slot}
                                    onClick={() => toggleSlotBlock(slot)}
                                    disabled={isProcessing}
                                    className={cn(
                                        "relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 min-h-[80px]",
                                        isProcessing && "opacity-70 cursor-wait",
                                        isBlocked
                                            ? "bg-red-50 border-red-200 text-red-700 shadow-sm"
                                            : "bg-white border-green-100 text-gray-700 hover:border-green-300 hover:shadow-md hover:-translate-y-0.5"
                                    )}
                                >
                                    <span className="font-bold text-sm tracking-tight">{formatSlotLabel(slot)}</span>

                                    <div className="mt-2 flex items-center gap-1">
                                        {isProcessing ? (
                                            <Loader2 size={12} className="animate-spin" />
                                        ) : isBlocked ? (
                                            <div className="flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-red-600 bg-red-100/50 px-1.5 py-0.5 rounded">
                                                <ShieldAlert size={10} /> Blocked
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                                <Unlock size={10} /> Open
                                            </div>
                                        )}
                                    </div>

                                    {hasBookings && !isBlocked && (
                                        <div className="absolute top-1 right-1">
                                            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 shadow-sm" title={`${bookingCount} active bookings`}>
                                                {bookingCount}
                                            </div>
                                        </div>
                                    )}
                                    {hasBookings && isBlocked && (
                                        <div className="absolute top-1 right-1 text-amber-500" title="Has active bookings despite being blocked!">
                                            <AlertTriangle size={14} fill="currentColor" className="text-amber-100" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
