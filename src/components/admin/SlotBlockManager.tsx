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
import { pacificDateStringFrom, todayPacificDateString } from '@/lib/utils/date';
import { generateShowerSlots, generateLaundrySlots, formatSlotLabel } from '@/lib/utils/serviceSlots';
import { capacityFor } from '@/lib/utils/blockedSlots';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

interface SlotBlockManagerProps {
    serviceType: 'shower' | 'laundry';
}

export function SlotBlockManager({ serviceType }: SlotBlockManagerProps) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const store = useBlockedSlotsStore();
    const { fetchBlockedSlots, blockSlot, unblockSlot, isSlotBlocked } = store;
    const getBlockedCount = (store as any).getBlockedCount as
        | ((serviceType: 'shower' | 'laundry', slotTime: string, date: string) => number)
        | undefined;
    const setBlockedCount = (store as any).setBlockedCount as
        | ((serviceType: 'shower' | 'laundry', slotTime: string, date: string, count: number) => Promise<boolean>)
        | undefined;
    const getBlockedCountFn = getBlockedCount ?? ((service: 'shower' | 'laundry', slot: string, date: string) =>
        isSlotBlocked(service, slot, date) ? capacityFor(service) : 0);
    const setBlockedCountFn = setBlockedCount ?? (async (
        service: 'shower' | 'laundry',
        slot: string,
        date: string,
        count: number
    ) => (count === 0 ? unblockSlot(service, slot, date) : blockSlot(service, slot, date)));
    const { showerRecords, laundryRecords } = useServicesStore();
    const [loading, setLoading] = useState(false);
    const [processingSlot, setProcessingSlot] = useState<string | null>(null);
    const [bulkProcessing, setBulkProcessing] = useState(false);

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

    const bookingCountFor = (slotLabel: string) => {
        if (serviceType === 'shower') {
            return showerRecords.filter(r => r.time === slotLabel && r.date?.startsWith(dateStr)).length;
        }
        return laundryRecords.filter(r => r.time === slotLabel && r.laundryType === 'onsite' && r.date?.startsWith(dateStr)).length;
    };

    const toggleSlotBlock = async (slotLabel: string) => {
        if (processingSlot || bulkProcessing) return;

        const isBlocked = isSlotBlocked(serviceType, slotLabel, dateStr);
        setProcessingSlot(slotLabel);

        try {
            if (isBlocked) {
                // Unblock using the same parameters (store handles logic)
                await unblockSlot(serviceType, slotLabel, dateStr);
                toast.success('Slot unblocked successfully');
            } else {
                // Check if slot has bookings
                const hasBookings = bookingCountFor(slotLabel) > 0;

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

    const toggleHalfBlock = async (slotLabel: string) => {
        if (processingSlot || bulkProcessing) return;
        const blocked = getBlockedCountFn(serviceType, slotLabel, dateStr);
        setProcessingSlot(slotLabel);
        try {
            if (blocked === 0) {
                const bookingCount = bookingCountFor(slotLabel);
                if (bookingCount >= 1) {
                    const confirmBlock = window.confirm(
                        `Warning: This slot already has ${bookingCount} active booking${bookingCount === 1 ? '' : 's'}. Blocking 1 spot will stop NEW bookings until only 1 spot remains open. Existing bookings are NOT cancelled. Continue?`
                    );
                    if (!confirmBlock) {
                        setProcessingSlot(null);
                        return;
                    }
                }
                await setBlockedCountFn(serviceType, slotLabel, dateStr, 1);
                toast.success('1 spot blocked');
            } else {
                // 1 blocked → open; 2 blocked → 1 blocked
                const next = blocked === 1 ? 0 : 1;
                await setBlockedCountFn(serviceType, slotLabel, dateStr, next);
                toast.success(next === 0 ? 'Spot unblocked' : '1 spot unblocked');
            }
        } catch (error) {
            console.error('Failed to toggle half block', error);
            toast.error('Failed to update slot status');
        } finally {
            setProcessingSlot(null);
        }
    };

    const slots = serviceType === 'shower' ? generateShowerSlots(selectedDate) : generateLaundrySlots(selectedDate);

    const getRemainingSlots = (): string[] => {
        const todayStr = todayPacificDateString();
        if (dateStr < todayStr) return [];
        if (dateStr > todayStr) return slots;
        const nowPacific = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'America/Los_Angeles',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).format(new Date());
        return slots.filter((slot) => slot.split(' - ')[0].trim() >= nowPacific);
    };

    const handleBulkBlockOne = async () => {
        if (bulkProcessing || processingSlot) return;
        const remaining = getRemainingSlots();
        if (remaining.length === 0) {
            toast('No remaining slots for this day');
            return;
        }
        const withBookings = remaining.filter((slot) => bookingCountFor(slot) > 0).length;
        if (withBookings > 0) {
            const ok = window.confirm(
                `${withBookings} of the remaining slot(s) already have bookings. Blocking 1 spot will reduce each to 1 spot open — existing bookings are NOT cancelled. Continue?`
            );
            if (!ok) return;
        }
        setBulkProcessing(true);
        let changed = 0;
        let skipped = 0;
        try {
            for (const slot of remaining) {
                if (getBlockedCountFn(serviceType, slot, dateStr) !== 0) {
                    skipped += 1;
                    continue;
                }
                const ok = await setBlockedCountFn(serviceType, slot, dateStr, 1);
                if (ok) changed += 1;
                else skipped += 1;
            }
            toast.success(`Blocked 1 spot at ${changed} slot${changed === 1 ? '' : 's'}${skipped ? ` (${skipped} already blocked)` : ''}`);
        } catch (error) {
            console.error('Failed bulk block', error);
            toast.error('Failed to update slots');
        } finally {
            setBulkProcessing(false);
        }
    };

    const handleBulkUnblockAll = async () => {
        if (bulkProcessing || processingSlot) return;
        const remaining = getRemainingSlots();
        if (remaining.length === 0) {
            toast('No remaining slots for this day');
            return;
        }
        setBulkProcessing(true);
        let changed = 0;
        try {
            for (const slot of remaining) {
                if (getBlockedCountFn(serviceType, slot, dateStr) === 0) continue;
                const ok = await setBlockedCountFn(serviceType, slot, dateStr, 0);
                if (ok) changed += 1;
            }
            toast.success(`Unblocked ${changed} slot${changed === 1 ? '' : 's'}`);
        } catch (error) {
            console.error('Failed bulk unblock', error);
            toast.error('Failed to update slots');
        } finally {
            setBulkProcessing(false);
        }
    };

    const isTodayOrFuture = dateStr >= todayPacificDateString();

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
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-6 text-xs font-semibold text-gray-500 bg-white flex-wrap">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-white border-2 border-green-200"></div>
                    <span>Available</span>
                </div>
                {serviceType === 'shower' && (
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-amber-50 border-2 border-amber-200"></div>
                        <span>1 Spot Open</span>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-50 border-2 border-red-200"></div>
                    <span>Blocked</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gray-50 border-2 border-gray-200 opacity-50"></div>
                    <span>Has Bookings (Warning)</span>
                </div>
            </div>

            {/* Bulk actions — one bathroom down for the rest of the day */}
            <div className="px-4 py-3 border-b border-gray-100 bg-cyan-50/50 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Rest of day:</span>
                {serviceType === 'shower' ? (
                    <>
                        <button
                            onClick={handleBulkBlockOne}
                            disabled={bulkProcessing || !!processingSlot || !isTodayOrFuture}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-cyan-200 text-cyan-700 hover:bg-cyan-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {bulkProcessing ? 'Updating…' : 'Block 1 spot for rest of day'}
                        </button>
                        <button
                            onClick={handleBulkUnblockAll}
                            disabled={bulkProcessing || !!processingSlot || !isTodayOrFuture}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {bulkProcessing ? 'Updating…' : 'Unblock all for rest of day'}
                        </button>
                    </>
                ) : (
                    <button
                        onClick={handleBulkBlockOne}
                        disabled={bulkProcessing || !!processingSlot || !isTodayOrFuture}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {bulkProcessing ? 'Updating…' : 'Block all for rest of day'}
                    </button>
                )}
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
                            const blockedCount = getBlockedCountFn(serviceType, slot, dateStr);
                            const isHalf = serviceType === 'shower' && blockedCount === 1;
                            const isProcessing = processingSlot === slot;

                            const bookingCount = bookingCountFor(slot);
                            const hasBookings = bookingCount > 0;

                            return (
                                <div
                                    key={slot}
                                    className={cn(
                                        "relative flex flex-col gap-1.5 p-2 rounded-xl border-2 transition-all duration-200 min-h-[100px]",
                                        isProcessing && "opacity-70",
                                        isBlocked
                                            ? "bg-red-50 border-red-200 text-red-700 shadow-sm"
                                            : isHalf
                                                ? "bg-amber-50 border-amber-200 text-amber-700 shadow-sm"
                                                : "bg-white border-green-100 text-gray-700"
                                    )}
                                >
                                    <button
                                        onClick={() => toggleSlotBlock(slot)}
                                        disabled={isProcessing || bulkProcessing}
                                        className="relative flex flex-col items-center justify-center p-3 rounded-lg w-full hover:bg-black/5 transition-colors"
                                    >
                                        <span className="font-bold text-sm tracking-tight">{formatSlotLabel(slot)}</span>

                                        <div className="mt-2 flex items-center gap-1">
                                            {isProcessing ? (
                                                <Loader2 size={12} className="animate-spin" />
                                            ) : isBlocked ? (
                                                <div className="flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-red-600 bg-red-100/50 px-1.5 py-0.5 rounded">
                                                    <ShieldAlert size={10} /> Blocked
                                                </div>
                                            ) : isHalf ? (
                                                <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-amber-100/60 px-1.5 py-0.5 rounded">
                                                    <Unlock size={10} /> 1 Open
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

                                    {serviceType === 'shower' && (
                                        <button
                                            onClick={() => toggleHalfBlock(slot)}
                                            disabled={isProcessing || bulkProcessing}
                                            className="w-full px-2 py-1.5 rounded-lg text-[11px] font-bold border border-gray-300 bg-white/70 hover:bg-white disabled:opacity-50"
                                        >
                                            {blockedCount === 0 ? 'Block 1 spot' : 'Unblock 1 spot'}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
