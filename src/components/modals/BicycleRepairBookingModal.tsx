'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Bike, Star, AlertCircle, CheckCircle, Loader2, ClipboardList, Info } from 'lucide-react';
import { useModalStore } from '@/stores/useModalStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useActionHistoryStore } from '@/stores/useActionHistoryStore';
import { ServiceCardReminder } from '@/components/ui/ReminderIndicator';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

const REPAIR_TYPES = [
    "New Bicycle",
    "Flat Tire",
    "Brake Adjustment",
    "Gear Adjustment",
    "Chain Replacement",
    "Wheel Truing",
    "Basic Tune Up",
    "Drivetrain Cleaning",
    "Cable Replacement",
    "Headset Adjustment",
    "Seat Adjustment",
    "Kickstand",
    "Basket/Rack",
    "Bike Lights",
    "Lock",
    "New Tube",
    "New Tire",
    "Other",
];

export function BicycleRepairBookingModal() {
    const { bicyclePickerGuest, setBicyclePickerGuest } = useModalStore();
    const { addBicycleRecord, hasReceivedNewBicycleInLastSixMonths } = useServicesStore();
    const { addAction } = useActionHistoryStore();

    const [selectedRepairTypes, setSelectedRepairTypes] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    const [isPending, setIsPending] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [lastBicycleDate, setLastBicycleDate] = useState<string | undefined>(undefined);

    if (!bicyclePickerGuest) return null;

    const bikeDescription = bicyclePickerGuest.bicycleDescription?.trim();

    const toggleRepairType = (type: string) => {
        setSelectedRepairTypes((prev) =>
            prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
        );
    };

    const handleBook = async () => {
        if (isPending) return;

        if (!bikeDescription) {
            toast.error("Please add a bicycle description to this guest's profile first.");
            return;
        }

        if (selectedRepairTypes.length === 0) {
            toast.error("Please select at least one repair type.");
            return;
        }

        if (selectedRepairTypes.includes("Other") && !notes.trim()) {
            toast.error("Please add notes for 'Other' repair type.");
            return;
        }

        // Check if "New Bicycle" is selected and guest received one in the last 6 months
        if (selectedRepairTypes.includes("New Bicycle") && !showWarning) {
            const result = hasReceivedNewBicycleInLastSixMonths(bicyclePickerGuest.id);
            
            if (result.hasReceived) {
                // Store the date and show warning modal
                setLastBicycleDate(result.lastBicycleDate);
                setShowWarning(true);
                return;
            }
        }

        setIsPending(true);
        try {
            const record = await addBicycleRecord(bicyclePickerGuest.id, {
                repairTypes: selectedRepairTypes,
                notes,
            });
            if (record && record.id) {
                addAction('BICYCLE_LOGGED', { recordId: record.id, guestId: bicyclePickerGuest.id });
                toast.success(`Bicycle repair logged for ${bicyclePickerGuest.preferredName || bicyclePickerGuest.firstName}`);
            }
            setBicyclePickerGuest(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to log repair');
        } finally {
            setIsPending(false);
            setShowWarning(false);
            setLastBicycleDate(undefined);
        }
    };

    // Warning modal for 6-month rule
    if (showWarning) {
        const lastDate = lastBicycleDate ? new Date(lastBicycleDate).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }) : '';

        return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                >
                    {/* Warning Header */}
                    <div className="p-6 border-b border-gray-100 bg-amber-50 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-200">
                            <AlertCircle size={28} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">6-Month Rule</h2>
                            <p className="text-sm text-gray-600 font-medium">Review bicycle distribution</p>
                        </div>
                    </div>

                    {/* Warning Content */}
                    <div className="p-6 space-y-4">
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                            <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-800 font-semibold">
                                    <span className="font-black text-amber-700">{bicyclePickerGuest.preferredName || bicyclePickerGuest.firstName}</span> received a new bicycle on <span className="font-black text-amber-700">{lastDate}</span>.
                                </p>
                                <p className="text-sm text-gray-600 mt-2">
                                    Guests should only receive 1 new bicycle every 6 months. Do you want to proceed anyway?
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Warning Footer */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                        <button
                            onClick={() => setShowWarning(false)}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all"
                        >
                            Go Back
                        </button>
                        <button
                            onClick={handleBook}
                            className="px-6 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-black shadow-lg shadow-amber-200 hover:bg-amber-700 hover:shadow-amber-300 transition-all flex items-center gap-2"
                        >
                            Proceed Anyway
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 bg-amber-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-200">
                            <Bike size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Bicycle Repair</h2>
                            <p className="text-sm text-gray-500 font-medium">
                                Logging for <span className="text-amber-600 font-bold">{bicyclePickerGuest.preferredName || bicyclePickerGuest.name}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setBicyclePickerGuest(null)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Guest Reminders */}
                    <ServiceCardReminder guestId={bicyclePickerGuest.id} serviceType="bicycle" />
                    
                    {/* Bike Info Banner */}
                    {bikeDescription ? (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-sky-50 border border-sky-100">
                            <div className="p-1.5 rounded-lg bg-sky-100 text-sky-600 shrink-0">
                                <Info size={18} />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-sky-800 uppercase tracking-wider">Bicycle on file</h4>
                                <p className="text-sm text-sky-700 font-medium mt-0.5">{bikeDescription}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
                            <div className="p-1.5 rounded-lg bg-red-100 text-red-600 shrink-0">
                                <AlertCircle size={18} />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-red-800 uppercase tracking-wider">Missing Description</h4>
                                <p className="text-sm text-red-700 font-medium mt-0.5">
                                    Guest needs a specific bike description (make, color, etc.) before we can log repairs.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <ClipboardList size={14} /> Select Repair Items
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {REPAIR_TYPES.map((type) => {
                                const isSelected = selectedRepairTypes.includes(type);
                                const isNew = type === "New Bicycle";

                                return (
                                    <button
                                        key={type}
                                        onClick={() => toggleRepairType(type)}
                                        className={cn(
                                            'flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                                            isSelected
                                                ? isNew
                                                    ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-sm'
                                                    : 'bg-sky-50 border-sky-400 text-sky-900 shadow-sm'
                                                : isNew
                                                    ? 'bg-amber-50/30 border-amber-100 hover:border-amber-200'
                                                    : 'bg-white border-gray-100 hover:border-gray-300'
                                        )}
                                    >
                                        <div className={cn(
                                            'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                                            isSelected
                                                ? isNew ? 'bg-amber-500 border-amber-500' : 'bg-sky-500 border-sky-500'
                                                : 'bg-white border-gray-200'
                                        )}>
                                            {isSelected && <CheckCircle size={14} className="text-white" />}
                                        </div>
                                        <span className={cn(
                                            'text-sm font-bold',
                                            isSelected ? 'font-black' : 'text-gray-600'
                                        )}>
                                            {type}
                                        </span>
                                        {isNew && <Star size={14} className="ml-auto text-amber-500 fill-amber-500" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Additional Notes</h3>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={selectedRepairTypes.includes("Other") ? "Notes are required for 'Other' repairs..." : "Any extra details for the mechanic..."}
                            rows={3}
                            className={cn(
                                "w-full p-4 rounded-xl border-2 bg-gray-50 focus:bg-white transition-all font-medium outline-none",
                                selectedRepairTypes.includes("Other") && !notes.trim() ? "border-amber-200" : "border-gray-100 focus:border-amber-400"
                            )}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                    <button
                        onClick={() => setBicyclePickerGuest(null)}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleBook}
                        disabled={isPending || !bikeDescription || selectedRepairTypes.length === 0 || (selectedRepairTypes.includes("Other") && !notes.trim())}
                        className="px-8 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-black shadow-lg shadow-amber-200 hover:bg-amber-700 hover:shadow-amber-300 transition-all flex items-center gap-2 disabled:opacity-50 disabled:grayscale disabled:shadow-none"
                    >
                        {isPending ? <Loader2 size={18} className="animate-spin" /> : <Bike size={18} />}
                        Log Repair
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
