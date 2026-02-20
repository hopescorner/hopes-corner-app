'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, ShowerHead, Users, Clock, Loader2, Sparkles, Zap } from 'lucide-react';
import { useModalStore } from '@/stores/useModalStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useActionHistoryStore } from '@/stores/useActionHistoryStore';
import { ServiceCardReminder } from '@/components/ui/ReminderIndicator';
import { generateShowerSlots, formatSlotLabel } from '@/lib/utils/serviceSlots';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import { useSession } from 'next-auth/react';
import { type UserRole } from '@/lib/auth/types';
import { ShieldAlert } from 'lucide-react';
import { useBlockedSlotsStore } from '@/stores/useBlockedSlotsStore';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

export function ShowerBookingModal() {
    const { showerPickerGuest, setShowerPickerGuest } = useModalStore();
    const { showerRecords, addShowerRecord, addShowerWaitlist } = useServicesStore();
    const { guests } = useGuestsStore();
    const { addAction } = useActionHistoryStore();
    const { fetchBlockedSlots, isSlotBlocked } = useBlockedSlotsStore();

    useEffect(() => {
        fetchBlockedSlots();
    }, [fetchBlockedSlots]);

    const [isPending, setIsPending] = useState(false);

    const { data: session } = useSession();
    const role = (session?.user?.role as UserRole) || 'checkin';
    const isCheckinRole = role === 'checkin';

    const today = todayPacificDateString();
    const allSlots = generateShowerSlots();

    const slotsWithDetails = useMemo(() => {
        if (!showerPickerGuest) return [];
        return allSlots.map((slotTime) => {
            const todaysRecords = (showerRecords || []).filter(
                (record) =>
                    record.time === slotTime &&
                    pacificDateStringFrom(record.date) === today &&
                    record.status !== "waitlisted"
            );

            const count = todaysRecords.length;
            const guestsInSlot = todaysRecords.map((record) => {
                const guest = guests.find((g) => g.id === record.guestId);
                return guest?.name || "Guest";
            });

            const isBlocked = isSlotBlocked('shower', slotTime, today);

            return {
                slotTime,
                label: formatSlotLabel(slotTime),
                count,
                guests: guestsInSlot,
                isFull: count >= 2,
                isNearlyFull: count === 1,
                isBlocked,
            };
        });
    }, [allSlots, showerRecords, today, guests, showerPickerGuest, isSlotBlocked]);

    const nextAvailableSlot = useMemo(() => {
        return slotsWithDetails.find(s => !s.isFull && !s.isBlocked);
    }, [slotsWithDetails]);

    if (!showerPickerGuest) return null;

    const handleBook = async (slotTime: string) => {
        if (isPending) return;
        setIsPending(true);
        try {
            const record = await addShowerRecord(showerPickerGuest.id, slotTime);
            if (record && record.id) {
                addAction('SHOWER_BOOKED', { recordId: record.id, guestId: showerPickerGuest.id });
                toast.success(`Shower booked for ${formatSlotLabel(slotTime)}`);
            }
            setShowerPickerGuest(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to book shower');
        } finally {
            setIsPending(false);
        }
    };

    const handleWaitlist = async () => {
        if (isPending) return;
        setIsPending(true);
        try {
            const record = await addShowerWaitlist(showerPickerGuest.id);
            if (record && record.id) {
                addAction('SHOWER_BOOKED', { recordId: record.id, guestId: showerPickerGuest.id }); // Using SHOWER_BOOKED for waitlist since it's same store delete
                toast.success('Added to shower waitlist');
            }
            setShowerPickerGuest(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to add to waitlist');
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 bg-sky-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-sky-500 flex items-center justify-center text-white shadow-lg shadow-sky-200">
                            <ShowerHead size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Book a Shower</h2>
                            <p className="text-sm text-gray-500 font-medium">
                                Scheduling for <span className="text-sky-600 font-bold">{showerPickerGuest.preferredName || showerPickerGuest.name}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowerPickerGuest(null)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Guest Reminders */}
                    <ServiceCardReminder guestId={showerPickerGuest.id} serviceType="shower" />
                    
                    {isCheckinRole ? (
                        <div className="space-y-6">
                            <div className="p-8 rounded-2xl bg-sky-50 border-2 border-sky-100 flex flex-col items-center text-center space-y-4">
                                <div className="p-4 rounded-full bg-white shadow-sm text-sky-500">
                                    <Clock size={48} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-gray-900">Book Next Slot</h3>
                                    {nextAvailableSlot ? (
                                        <>
                                            <p className="text-gray-500 text-sm font-medium">
                                                The next available shower is at
                                            </p>
                                            <p className="text-3xl font-black text-sky-600 tracking-tight">
                                                {nextAvailableSlot.label}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-lg text-amber-600 font-bold">All slots are full for today</p>
                                    )}
                                </div>

                                {nextAvailableSlot ? (
                                    <button
                                        onClick={() => handleBook(nextAvailableSlot.slotTime)}
                                        disabled={isPending}
                                        className="w-full max-w-xs py-4 rounded-2xl bg-sky-500 text-white font-black text-lg hover:bg-sky-600 shadow-lg shadow-sky-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isPending ? <Loader2 className="animate-spin" /> : <ShowerHead size={20} />}
                                        Confirm Booking
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleWaitlist}
                                        disabled={isPending}
                                        className="w-full max-w-xs py-4 rounded-2xl bg-amber-500 text-white font-black text-lg hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isPending ? <Loader2 className="animate-spin" /> : <Users size={20} />}
                                        Join Waitlist
                                    </button>
                                )}
                            </div>

                            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
                                <Sparkles className="text-emerald-500 shrink-0" size={24} />
                                <p className="text-sm text-emerald-700 font-medium leading-relaxed">
                                    Check-in staff can only book the next available slot to ensure fair service distribution.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Book Next Available */}
                            <button
                                onClick={() => nextAvailableSlot && handleBook(nextAvailableSlot.slotTime)}
                                disabled={!nextAvailableSlot || isPending}
                                className={cn(
                                    'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all active:scale-[0.98]',
                                    nextAvailableSlot
                                        ? 'bg-sky-50 border-sky-200 hover:border-sky-400 hover:shadow-lg hover:shadow-sky-100'
                                        : 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed'
                                )}
                            >
                                <div className={cn(
                                    'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
                                    nextAvailableSlot ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'bg-gray-200 text-gray-400'
                                )}>
                                    <Zap size={22} />
                                </div>
                                <div className="text-left flex-1">
                                    <h3 className="text-sm font-black text-gray-900">Book Next Available Slot</h3>
                                    {nextAvailableSlot ? (
                                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                                            Next open: <span className="text-sky-600 font-bold">{nextAvailableSlot.label}</span>
                                        </p>
                                    ) : (
                                        <p className="text-xs text-amber-600 font-bold mt-0.5">All slots are full for today</p>
                                    )}
                                </div>
                                {nextAvailableSlot && !isPending && (
                                    <div className="px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-black uppercase tracking-wider shadow-sm">
                                        Book
                                    </div>
                                )}
                                {isPending && <Loader2 size={18} className="animate-spin text-sky-500" />}
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">or pick a time</span>
                                <div className="flex-1 h-px bg-gray-200" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2 space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Select an available time</h3>
                                        <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                                            2 GUESTS PER SLOT
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {slotsWithDetails.map((slot) => (
                                            <button
                                                key={slot.slotTime}
                                                disabled={slot.isFull || slot.isBlocked || isPending}
                                                onClick={() => handleBook(slot.slotTime)}
                                                className={cn(
                                                    'flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all active:scale-95',
                                                    slot.isFull
                                                        ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'
                                                        : slot.isBlocked
                                                            ? 'bg-red-50 border-red-100 opacity-80 cursor-not-allowed'
                                                            : slot.isNearlyFull
                                                                ? 'bg-amber-50 border-amber-200 hover:border-amber-400'
                                                                : 'bg-white border-gray-100 hover:border-sky-400 hover:shadow-lg hover:shadow-sky-100'
                                                )}
                                            >
                                                <span className={cn(
                                                    'text-lg font-black',
                                                    slot.isFull ? 'text-gray-400' : slot.isBlocked ? 'text-red-400' : 'text-gray-900'
                                                )}>{slot.label}</span>

                                                {slot.isBlocked ? (
                                                    <div className="flex items-center gap-1 mt-1 text-red-500">
                                                        <ShieldAlert size={12} />
                                                        <span className="text-[10px] font-bold uppercase">Blocked</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <Users size={12} className={slot.isFull ? 'text-gray-300' : 'text-sky-500'} />
                                                        <span className="text-[10px] font-bold text-gray-500">{slot.count}/2</span>
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
                                                <Clock size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900">Waitlist info</h4>
                                                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                                    If no slots work, we can put them on the waitlist.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleWaitlist}
                                            disabled={isPending}
                                            className="w-full py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-sm shadow-sm hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Users size={16} />
                                            Add to Waitlist
                                        </button>
                                    </div>


                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                    <button
                        onClick={() => setShowerPickerGuest(null)}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
