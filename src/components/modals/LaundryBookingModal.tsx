'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, WashingMachine, Clock, Loader2, Package } from 'lucide-react';
import { useModalStore } from '@/stores/useModalStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useActionHistoryStore } from '@/stores/useActionHistoryStore';
import { generateLaundrySlots, formatSlotLabel } from '@/lib/utils/serviceSlots';
import { cn } from '@/lib/utils/cn';
import { useSession } from 'next-auth/react';
import { type UserRole } from '@/lib/auth/types';
import { ShieldAlert } from 'lucide-react';
import { useBlockedSlotsStore } from '@/stores/useBlockedSlotsStore';
import { ServiceCardReminder } from '@/components/ui/ReminderIndicator';
import toast from 'react-hot-toast';
import { useEffect } from 'react';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';

export function LaundryBookingModal() {
    const { laundryPickerGuest, setLaundryPickerGuest } = useModalStore();
    const { laundryRecords, addLaundryRecord } = useServicesStore();
    const { addAction } = useActionHistoryStore();
    const { fetchBlockedSlots, isSlotBlocked } = useBlockedSlotsStore();

    useEffect(() => {
        fetchBlockedSlots();
    }, [fetchBlockedSlots]);

    const [isPending, setIsPending] = useState(false);
    const [washType, setWashType] = useState<'onsite' | 'offsite'>('onsite');
    const [bagNumber, setBagNumber] = useState('');

    const { data: session } = useSession();
    const role = (session?.user?.role as UserRole) || 'checkin';
    const isCheckinRole = role === 'checkin';

    const today = todayPacificDateString();
    const allSlots = generateLaundrySlots();

    const slotsWithStatus = useMemo(() => {
        if (!laundryPickerGuest) return [];
        return allSlots.map((slotLabel) => {
            const isBooked = (laundryRecords || []).some(
                (r) =>
                    r.time === slotLabel &&
                    r.laundryType === 'onsite' &&
                    pacificDateStringFrom(r.date) === today
            );
            const isBlocked = isSlotBlocked('laundry', slotLabel, today);

            return {
                label: slotLabel,
                isBooked,
                isBlocked
            };
        });
    }, [allSlots, laundryRecords, laundryPickerGuest, isSlotBlocked, today]);

    const nextAvailableSlot = useMemo(() => {
        return slotsWithStatus.find(s => !s.isBooked && !s.isBlocked);
    }, [slotsWithStatus]);

    if (!laundryPickerGuest) return null;

    const handleBook = async (slotLabel?: string) => {
        if (isPending) return;
        setIsPending(true);
        try {
            const record = await addLaundryRecord(laundryPickerGuest.id, washType, slotLabel, bagNumber);
            if (record && record.id) {
                addAction('LAUNDRY_BOOKED', { recordId: record.id, guestId: laundryPickerGuest.id });
                toast.success(`${washType === 'onsite' ? 'On-site' : 'Off-site'} laundry booked`);
            }
            setLaundryPickerGuest(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to book laundry');
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
                <div className="p-6 border-b border-gray-100 bg-indigo-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <WashingMachine size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Laundry Booking</h2>
                            <p className="text-sm text-gray-500 font-medium">
                                Scheduling for <span className="text-indigo-600 font-bold">{laundryPickerGuest.preferredName || laundryPickerGuest.name}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setLaundryPickerGuest(null)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Guest Reminders */}
                    <ServiceCardReminder guestId={laundryPickerGuest.id} serviceType="laundry" />
                    
                    {isCheckinRole ? (
                        <div className="space-y-8">
                            <div className="flex p-1 bg-gray-100 rounded-2xl">
                                {(['onsite', 'offsite'] as const).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setWashType(type)}
                                        className={cn(
                                            'flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all capitalize',
                                            washType === type
                                                ? 'bg-white text-indigo-600 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                        )}
                                    >
                                        {type} Service
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="p-8 rounded-2xl bg-indigo-50 border-2 border-indigo-100 flex flex-col items-center text-center space-y-4">
                                        <div className="p-4 rounded-full bg-white shadow-sm text-indigo-500">
                                            {washType === 'onsite' ? <Clock size={48} /> : <Package size={48} />}
                                        </div>

                                        <div className="space-y-2">
                                            <h3 className="text-xl font-black text-gray-900">
                                                {washType === 'onsite' ? 'Next On-site Slot' : 'Off-site Laundry'}
                                            </h3>
                                            {washType === 'onsite' ? (
                                                nextAvailableSlot ? (
                                                    <>
                                                        <p className="text-gray-500 text-sm font-medium">
                                                            Next available at
                                                        </p>
                                                        <p className="text-3xl font-black text-indigo-600 tracking-tight">
                                                            {formatSlotLabel(nextAvailableSlot.label)}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="text-lg text-amber-600 font-bold">On-site is fully booked</p>
                                                )
                                            ) : (
                                                <p className="text-gray-600 font-medium">No specific time required</p>
                                            )}
                                        </div>

                                        {washType === 'onsite' ? (
                                            nextAvailableSlot ? (
                                                <button
                                                    onClick={() => handleBook(nextAvailableSlot.label)}
                                                    disabled={isPending}
                                                    className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {isPending ? <Loader2 className="animate-spin" /> : <WashingMachine size={20} />}
                                                    Confirm Booking
                                                </button>
                                            ) : (
                                                <p className="text-amber-600 font-bold text-center py-4">On-site slots unavailable today</p>
                                            )
                                        ) : (
                                            <button
                                                onClick={() => handleBook()}
                                                disabled={isPending}
                                                className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {isPending ? <Loader2 className="animate-spin" /> : <WashingMachine size={20} />}
                                                Book Off-site
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Optional Details</h3>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                                <Package size={20} />
                                            </div>
                                            <input
                                                type="text"
                                                value={bagNumber}
                                                onChange={(e) => setBagNumber(e.target.value)}
                                                placeholder="Bag or Ticket Number"
                                                className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all font-bold placeholder:text-gray-300 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                                            <Clock size={20} />
                                        </div>
                                        <p className="text-xs text-emerald-700 font-medium leading-relaxed">
                                            Check-in staff book the next available onsite slot or any off-site request.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Wash Type Toggle */}
                            <div className="flex p-1 bg-gray-100 rounded-2xl">
                                {(['onsite', 'offsite'] as const).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setWashType(type)}
                                        className={cn(
                                            'flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all capitalize',
                                            washType === type
                                                ? 'bg-white text-indigo-600 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                        )}
                                    >
                                        {type} Service
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    {washType === 'onsite' ? (
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Select an available slot</h3>
                                            <div className="grid grid-cols-1 gap-2">
                                                {slotsWithStatus.map((slot) => (
                                                    <button
                                                        key={slot.label}
                                                        disabled={slot.isBooked || slot.isBlocked || isPending}
                                                        onClick={() => handleBook(slot.label)}
                                                        className={cn(
                                                            'flex items-center justify-between p-4 rounded-xl border-2 transition-all group',
                                                            slot.isBooked
                                                                ? 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed'
                                                                : slot.isBlocked
                                                                    ? 'bg-red-50 border-red-100 opacity-80 cursor-not-allowed'
                                                                    : 'bg-white border-gray-100 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-50 active:scale-[0.98]'
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Clock size={16} className={slot.isBooked ? 'text-gray-300' : slot.isBlocked ? 'text-red-400' : 'text-indigo-500'} />
                                                            <span className={cn(
                                                                'font-bold',
                                                                slot.isBooked ? 'text-gray-400' : slot.isBlocked ? 'text-red-400' : 'text-gray-900'
                                                            )}>{formatSlotLabel(slot.label)}</span>
                                                            {slot.isBlocked && (
                                                                <div className="flex items-center gap-1 text-red-500 text-[10px] font-bold uppercase ml-2">
                                                                    <ShieldAlert size={12} />
                                                                    Blocked
                                                                </div>
                                                            )}
                                                        </div>
                                                        {!slot.isBooked && !slot.isBlocked && (
                                                            <div className="w-6 h-6 rounded-full border-2 border-indigo-100 group-hover:border-indigo-500 group-hover:bg-indigo-500 transition-all flex items-center justify-center">
                                                                <svg
                                                                    width="14"
                                                                    height="14"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="3"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    className="text-transparent group-hover:text-white"
                                                                >
                                                                    <line x1="12" y1="5" x2="12" y2="19" />
                                                                    <line x1="5" y1="12" x2="19" y2="12" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="p-6 rounded-2xl bg-indigo-50 border border-indigo-100">
                                                <h3 className="text-indigo-900 font-bold mb-2">Off-site Laundry</h3>
                                                <p className="text-sm text-indigo-700 leading-relaxed mb-6">
                                                    Off-site laundry doesn&apos;t require a specific time slot. Bags are picked up and returned within 24-48 hours.
                                                </p>
                                                <button
                                                    onClick={() => handleBook()}
                                                    disabled={isPending}
                                                    className="w-full py-4 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 flex items-center justify-center gap-2"
                                                >
                                                    {isPending ? <Loader2 size={20} className="animate-spin" /> : <WashingMachine size={20} />}
                                                    Book Off-site Now
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Optional Details</h3>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                                <Package size={20} />
                                            </div>
                                            <input
                                                type="text"
                                                value={bagNumber}
                                                onChange={(e) => setBagNumber(e.target.value)}
                                                placeholder="Bag or Ticket Number"
                                                className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all font-bold placeholder:text-gray-300 outline-none"
                                            />
                                        </div>
                                    </div>


                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                    <button
                        onClick={() => setLaundryPickerGuest(null)}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

function Plus({ size, className }: { size: number, className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}
