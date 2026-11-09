'use client';

import React, { useState, useEffect } from 'react';
import {
    Shield,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Calendar,
    AlertTriangle,
    Ban,
    Info,
} from 'lucide-react';
import { useBlockedSlotsStore } from '@/stores/useBlockedSlotsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { pacificDateStringFrom, todayPacificDateString } from '@/lib/utils/date';
import { generateShowerSlots, generateLaundrySlots, formatSlotLabel } from '@/lib/utils/serviceSlots';
import { capacityFor } from '@/lib/utils/blockedSlots';
import { SHOWER_SLOT_OCCUPYING_STATUSES, LAUNDRY_SLOT_OCCUPYING_STATUSES } from '@/lib/constants/constants';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

interface SlotBlockManagerProps {
    serviceType: 'shower' | 'laundry';
}

/** A shower time has 2 spots; a laundry time has 1. */
type SpotChoice = 1 | 2;

const slotStartTime = (slot: string) => slot.split(' - ')[0].trim();

export function SlotBlockManager({ serviceType }: SlotBlockManagerProps) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const store = useBlockedSlotsStore();
    const { fetchBlockedSlots, blockSlot, unblockSlot, isSlotBlocked } = store;
    // Defensive fallbacks keep the manager working with a partial store shape
    // (e.g. older test doubles / HMR), while the real store always provides these.
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
    ) => (count === 0 ? unblockSlot(service, slot, date) : blockSlot(service, slot, date, count)));

    const { showerRecords, laundryRecords } = useServicesStore();
    const [loading, setLoading] = useState(false);
    const [processingSlot, setProcessingSlot] = useState<string | null>(null);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [spotChoice, setSpotChoice] = useState<SpotChoice>(1);
    // Null overrides fall back to the whole selectable day, so changing the date
    // always resets the selection to "all remaining times".
    const [rangeFromOverride, setRangeFromOverride] = useState<string | null>(null);
    const [rangeToOverride, setRangeToOverride] = useState<string | null>(null);

    const isShower = serviceType === 'shower';
    const capacity = capacityFor(serviceType);
    const dateStr = pacificDateStringFrom(selectedDate);
    const todayStr = todayPacificDateString();
    const isTodayOrFuture = dateStr >= todayStr;

    useEffect(() => {
        setLoading(true);
        fetchBlockedSlots().finally(() => setLoading(false));
    }, [fetchBlockedSlots]);

    const handleDateChange = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + days);
        setSelectedDate(newDate);
        setRangeFromOverride(null);
        setRangeToOverride(null);
    };

    const getDisplayDate = (date: Date) =>
        date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

    const bookingCountFor = (slotLabel: string) => {
        if (isShower) {
            return showerRecords.filter(r => r.time === slotLabel && pacificDateStringFrom(r.date) === dateStr && SHOWER_SLOT_OCCUPYING_STATUSES.has(r.status)).length;
        }
        return laundryRecords.filter(r => r.time === slotLabel && r.laundryType !== 'offsite' && pacificDateStringFrom(r.date) === dateStr && LAUNDRY_SLOT_OCCUPYING_STATUSES.has(r.status)).length;
    };

    const slots = isShower ? generateShowerSlots(selectedDate) : generateLaundrySlots(selectedDate);

    /**
     * From / To always list every time on the selected date. Filtering past
     * times out of the options left the dropdowns empty (and apparently broken)
     * whenever today's service hours had ended. Blocking a past DATE is still
     * prevented; a note offers a one-click jump to tomorrow when today's times
     * have all passed.
     */
    const slotOptions = slots;
    const rangeFrom = rangeFromOverride && slotOptions.includes(rangeFromOverride)
        ? rangeFromOverride
        : (slotOptions[0] ?? '');
    const rangeTo = rangeToOverride && slotOptions.includes(rangeToOverride)
        ? rangeToOverride
        : (slotOptions[slotOptions.length - 1] ?? '');
    const rangeSlots = slotOptions.filter(
        (slot) => slotStartTime(slot) >= slotStartTime(rangeFrom) && slotStartTime(slot) <= slotStartTime(rangeTo)
    );
    const rangeInvalid = rangeSlots.length === 0;

    const nowPacific = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Los_Angeles',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(new Date());
    const todaysTimesHavePassed = dateStr === todayStr && slotOptions.length > 0
        && slotOptions.every((slot) => slotStartTime(slot) < nowPacific);

    /** Set how many spots are blocked at one time. Increasing a block never cancels existing bookings. */
    const setSlotCount = async (slotLabel: string, target: number) => {
        if (processingSlot || bulkProcessing) return;
        const current = getBlockedCountFn(serviceType, slotLabel, dateStr);
        if (target === current) return;

        if (target > current) {
            const bookingCount = bookingCountFor(slotLabel);
            if (bookingCount > 0) {
                const confirmBlock = window.confirm(
                    `Warning: This time already has ${bookingCount} active booking${bookingCount === 1 ? '' : 's'}. Blocking will stop NEW bookings but will NOT cancel existing ones. Continue?`
                );
                if (!confirmBlock) return;
            }
        }

        setProcessingSlot(slotLabel);
        try {
            if (await setBlockedCountFn(serviceType, slotLabel, dateStr, target) === false) throw new Error('Save failed');
            toast.success(target === 0 ? 'Time reopened' : target >= capacity ? 'Time fully blocked' : '1 spot blocked');
        } catch (error) {
            console.error('Failed to update slot status', error);
            toast.error('Failed to update slot status');
        } finally {
            setProcessingSlot(null);
        }
    };

    /**
     * Apply the chosen number of blocked spots to every time in the selected
     * period. Never downgrades a time that is already blocked at or above the
     * target (so "1 spot" won't reopen a fully blocked time), but does upgrade
     * a half-blocked time to a full block when "Both spots" is chosen.
     */
    const handleApplyBlock = async () => {
        if (bulkProcessing || processingSlot || !isTodayOrFuture || rangeInvalid) return;
        const target = isShower ? spotChoice : capacity;
        const targetLabel = isShower
            ? (spotChoice === 1 ? '1 spot' : 'both spots')
            : 'the spot';

        const toChange = rangeSlots.filter((slot) => getBlockedCountFn(serviceType, slot, dateStr) < target);
        const skipped = rangeSlots.length - toChange.length;
        if (toChange.length === 0) {
            toast('Those times are already blocked at that level');
            return;
        }

        const withBookings = toChange.filter((slot) => bookingCountFor(slot) > 0).length;
        if (withBookings > 0) {
            const ok = window.confirm(
                `${withBookings} of the selected time(s) already have bookings. Blocking ${targetLabel} will stop NEW bookings but will NOT cancel existing ones. Continue?`
            );
            if (!ok) return;
        }

        setBulkProcessing(true);
        let changed = 0;
        let failed = 0;
        try {
            for (const slot of toChange) {
                const ok = await setBlockedCountFn(serviceType, slot, dateStr, target);
                if (ok) changed += 1;
                else failed += 1;
            }
            const message = `Blocked ${targetLabel} at ${changed} time${changed === 1 ? '' : 's'}${skipped ? ` (${skipped} already blocked)` : ''}`;
            if (failed) toast.error(`${message}; ${failed} time${failed === 1 ? '' : 's'} failed to save. Please retry.`);
            else toast.success(message);
        } catch (error) {
            console.error('Failed to block time period', error);
            toast.error('Failed to update slots');
        } finally {
            setBulkProcessing(false);
        }
    };

    const handleUnblockPeriod = async () => {
        if (bulkProcessing || processingSlot || !isTodayOrFuture || rangeInvalid) return;
        const toChange = rangeSlots.filter((slot) => getBlockedCountFn(serviceType, slot, dateStr) !== 0);
        if (toChange.length === 0) {
            toast('No blocked times in this period');
            return;
        }
        setBulkProcessing(true);
        let changed = 0;
        let failed = 0;
        try {
            for (const slot of toChange) {
                const ok = await setBlockedCountFn(serviceType, slot, dateStr, 0);
                if (ok) changed += 1;
                else failed += 1;
            }
            const message = `Reopened ${changed} time${changed === 1 ? '' : 's'}`;
            if (failed) toast.error(`${message}; ${failed} time${failed === 1 ? '' : 's'} failed to save. Please retry.`);
            else toast.success(message);
        } catch (error) {
            console.error('Failed to unblock time period', error);
            toast.error('Failed to update slots');
        } finally {
            setBulkProcessing(false);
        }
    };

    const blockedTone = (count: number) =>
        count === 0
            ? { card: 'bg-green-50/60 border-green-200 text-green-800', text: 'text-green-700', active: 'bg-green-600 text-white' }
            : count >= capacity
                ? { card: 'bg-red-50 border-red-200 text-red-700', text: 'text-red-700', active: 'bg-red-600 text-white' }
                : { card: 'bg-amber-50 border-amber-200 text-amber-800', text: 'text-amber-700', active: 'bg-amber-500 text-white' };

    const countOptions = isShower
        ? [
            { count: 0, label: '2 open' },
            { count: 1, label: '1 open' },
            { count: 2, label: 'Blocked' },
        ]
        : [
            { count: 0, label: 'Open' },
            { count: 1, label: 'Blocked' },
        ];

    const blockLabel = isShower
        ? `Block ${spotChoice === 1 ? '1 spot' : 'both spots'} · ${rangeSlots.length} time${rangeSlots.length === 1 ? '' : 's'}`
        : `Block ${rangeSlots.length} time${rangeSlots.length === 1 ? '' : 's'}`;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
            {/* Header / Date Control */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-lg text-white",
                        isShower ? "bg-cyan-500" : "bg-purple-500"
                    )}>
                        <Shield size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 leading-tight">
                            Manage {isShower ? 'Shower' : 'Laundry'} Slots
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">
                            {isShower
                                ? 'Block time slots when there is no staff on-site or a bathroom is down. Each time has 2 spots.'
                                : 'Block time slots when the machines are unavailable. Each time has 1 spot.'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center bg-white rounded-lg border border-gray-200 shadow-sm">
                    <button
                        onClick={() => handleDateChange(-1)}
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors border-r border-gray-100"
                        aria-label="Previous day"
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
                        aria-label="Next day"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-x-5 gap-y-2 text-xs font-semibold text-gray-500 bg-white flex-wrap">
                <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold">Status:</span>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-50 border-2 border-green-200"></div>
                    <span>{isShower ? '2 spots open' : 'Available'}</span>
                </div>
                {isShower && (
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-amber-50 border-2 border-amber-200"></div>
                        <span>1 spot open</span>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-50 border-2 border-red-200"></div>
                    <span>Blocked</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gray-50 border-2 border-gray-200 opacity-60"></div>
                    <span>Has bookings</span>
                </div>
            </div>

            {/* Block a time period */}
            <div className={cn(
                'px-4 py-3 border-b border-gray-100',
                isShower ? 'bg-cyan-50/50' : 'bg-purple-50/50'
            )}>
                <div className="flex items-center gap-2 mb-2.5">
                    <Ban size={14} className={isShower ? 'text-cyan-700' : 'text-purple-700'} />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Block a time period</span>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                    {isShower && (
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Spots to block</label>
                            <div className="inline-flex rounded-lg border border-gray-300 bg-white overflow-hidden divide-x divide-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setSpotChoice(1)}
                                    disabled={bulkProcessing || !!processingSlot}
                                    aria-pressed={spotChoice === 1}
                                    className={cn(
                                        'min-h-[40px] px-3 text-xs font-bold transition-colors disabled:opacity-50',
                                        spotChoice === 1 ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                                    )}
                                >
                                    1 spot
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSpotChoice(2)}
                                    disabled={bulkProcessing || !!processingSlot}
                                    aria-pressed={spotChoice === 2}
                                    className={cn(
                                        'min-h-[40px] px-3 text-xs font-bold transition-colors disabled:opacity-50',
                                        spotChoice === 2 ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                                    )}
                                >
                                    Both spots
                                </button>
                            </div>
                        </div>
                    )}

                    <div>
                        <label htmlFor="block-range-from" className="block text-[11px] font-semibold text-gray-500 mb-1">From</label>
                        <select
                            id="block-range-from"
                            value={rangeFrom}
                            onChange={(e) => setRangeFromOverride(e.target.value)}
                            disabled={bulkProcessing || !!processingSlot || !isTodayOrFuture}
                            className="min-h-[40px] min-w-[110px] rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50"
                        >
                            {slotOptions.map((slot) => (
                                <option key={slot} value={slot}>{formatSlotLabel(slot)}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="block-range-to" className="block text-[11px] font-semibold text-gray-500 mb-1">To</label>
                        <select
                            id="block-range-to"
                            value={rangeTo}
                            onChange={(e) => setRangeToOverride(e.target.value)}
                            disabled={bulkProcessing || !!processingSlot || !isTodayOrFuture}
                            className="min-h-[40px] min-w-[110px] rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50"
                        >
                            {slotOptions.map((slot) => (
                                <option key={slot} value={slot}>{formatSlotLabel(slot)}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={handleApplyBlock}
                        disabled={bulkProcessing || !!processingSlot || !isTodayOrFuture || rangeInvalid}
                        className={cn(
                            'min-h-[40px] px-4 rounded-lg text-xs font-bold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed',
                            isShower && spotChoice === 2
                                ? 'bg-red-600 hover:bg-red-700'
                                : isShower
                                    ? 'bg-cyan-600 hover:bg-cyan-700'
                                    : 'bg-purple-600 hover:bg-purple-700'
                        )}
                    >
                        {bulkProcessing ? 'Updating…' : blockLabel}
                    </button>

                    <button
                        type="button"
                        onClick={handleUnblockPeriod}
                        disabled={bulkProcessing || !!processingSlot || !isTodayOrFuture || rangeInvalid}
                        className="min-h-[40px] px-3 rounded-lg text-xs font-bold bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Unblock period
                    </button>
                </div>

                <div className="mt-2 space-y-1">
                    <p className="flex items-start gap-1.5 text-[11px] leading-snug text-gray-500">
                        <Info size={12} className="mt-0.5 shrink-0" />
                        <span>
                            {!isTodayOrFuture
                                ? 'Choose today or a future date to block times.'
                                : rangeInvalid
                                    ? 'Choose a start time that is not after the end time.'
                                    : `Covers ${rangeSlots.length} time${rangeSlots.length === 1 ? '' : 's'} from ${formatSlotLabel(rangeFrom)} to ${formatSlotLabel(rangeTo)}. Adjust From / To to block only part of the day. Only NEW bookings are stopped — existing bookings are kept.`}
                        </span>
                    </p>
                    {todaysTimesHavePassed && (
                        <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                            <AlertTriangle size={12} className="shrink-0" />
                            All of today&apos;s times have passed, so blocking them will not affect new bookings.
                            <button
                                type="button"
                                onClick={() => handleDateChange(1)}
                                className="min-h-[40px] rounded-md bg-amber-100 px-2 text-[11px] font-bold text-amber-800 hover:bg-amber-200"
                            >
                                Use tomorrow →
                            </button>
                        </p>
                    )}
                </div>
            </div>

            {/* Slots Grid */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                <p className="mb-3 text-xs font-semibold text-gray-500">
                    Or set each time on its own — tap a state to change how many spots are blocked.
                </p>
                {loading ? (
                    <div className="h-40 flex items-center justify-center text-gray-400">
                        <Loader2 className="animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {slots.map((slot) => {
                            const blockedCount = getBlockedCountFn(serviceType, slot, dateStr);
                            const openSpots = Math.max(0, capacity - blockedCount);
                            const isBlocked = blockedCount >= capacity;
                            const tone = blockedTone(blockedCount);
                            const isProcessing = processingSlot === slot;
                            const bookingCount = bookingCountFor(slot);
                            const hasBookings = bookingCount > 0;

                            return (
                                <div
                                    key={slot}
                                    className={cn(
                                        'relative flex flex-col gap-2 p-3 rounded-xl border-2 transition-all duration-200',
                                        tone.card,
                                        isProcessing && 'opacity-70'
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-sm tracking-tight">{formatSlotLabel(slot)}</span>
                                        {hasBookings && (
                                            <span
                                                className="shrink-0 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-gray-700 shadow-sm"
                                                title={`${bookingCount} active bookings`}
                                            >
                                                {bookingCount} booked
                                            </span>
                                        )}
                                    </div>

                                    <div className={cn('flex items-center gap-1 text-[11px] font-semibold', tone.text)}>
                                        {isProcessing
                                            ? <Loader2 size={12} className="animate-spin" />
                                            : <span className="w-2 h-2 rounded-full bg-current" />}
                                        <span>{openSpots} of {capacity} spot{capacity === 1 ? '' : 's'} open</span>
                                        {hasBookings && isBlocked && (
                                            <span
                                                className="ml-auto shrink-0 text-amber-500"
                                                title="Existing bookings are kept; new bookings are blocked"
                                            >
                                                <AlertTriangle size={13} />
                                            </span>
                                        )}
                                    </div>

                                    <div
                                        role="group"
                                        aria-label={`Blocked spots at ${formatSlotLabel(slot)}`}
                                        className="flex rounded-lg border border-gray-300 bg-white/60 overflow-hidden divide-x divide-gray-200"
                                    >
                                        {countOptions.map((option) => {
                                            const active = blockedCount === option.count;
                                            return (
                                                <button
                                                    key={option.count}
                                                    type="button"
                                                    onClick={() => setSlotCount(slot, option.count)}
                                                    disabled={!!processingSlot || bulkProcessing}
                                                    aria-pressed={active}
                                                    className={cn(
                                                        'flex-1 min-h-[44px] px-1 text-[11px] font-bold transition-colors disabled:opacity-50',
                                                        active ? tone.active : 'text-gray-500 hover:bg-white'
                                                    )}
                                                >
                                                    {option.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
