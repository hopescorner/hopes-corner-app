'use client';

import React, { useEffect, useState } from 'react';
import { X, Shirt, Package, Tent, Footprints, AlertCircle, CheckCircle, Loader2, Clock, Undo2, Check } from 'lucide-react';
import { JacketIcon } from '@/components/icons/JacketIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { WaiverBadge } from '@/components/ui/WaiverBadge';
import { ServiceCardReminder } from '@/components/ui/ReminderIndicator';
import { useItemsStore } from '@/stores/useItemsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { formatTimeElapsed } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

interface ShowerDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: any;
    guest: any;
}

// Items with cooldown limits - socks and underwear are unlimited/always available
// so they are not shown here (guests can get them anytime without tracking)
const AMENITY_ITEMS = [
    { key: 'tshirt', label: 'T-Shirt', icon: Shirt, limit: 'Weekly (Mon)' },
    { key: 'jacket', label: 'Jacket', icon: JacketIcon, limit: '15 Days' },
    { key: 'tent', label: 'Tent', icon: Tent, limit: '30 Days' },
    { key: 'sleeping_bag', label: 'Sleeping Bag', icon: Package, limit: '30 Days' },
    { key: 'backpack', label: 'Backpack', icon: Package, limit: '30 Days' },
    { key: 'flipflops', label: 'Flip Flops', icon: Footprints, limit: '30 Days' },
];

export function ShowerDetailModal({ isOpen, onClose, record, guest }: ShowerDetailModalProps) {
    const { fetchItemsForGuest, checkAvailability, giveItem, undoItem, distributedItems, isLoading } = useItemsStore();
    const { updateShowerStatus } = useServicesStore();
    const [localLoading, setLocalLoading] = useState<string | null>(null);
    const [undoLoading, setUndoLoading] = useState<string | null>(null);
    const [markingDone, setMarkingDone] = useState(false);
    const [isWaiverModalOpen, setIsWaiverModalOpen] = useState(false);

    useEffect(() => {
        if (isOpen && guest?.id) {
            fetchItemsForGuest(guest.id);
        }
    }, [isOpen, guest?.id, fetchItemsForGuest]);

    // Hide this modal when waiver modal is open to prevent stacking
    if (!isOpen || !record || !guest || isWaiverModalOpen) return null;

    const handleGiveItem = async (itemKey: string, itemName: string) => {
        if (!guest.id) return;
        setLocalLoading(itemKey);
        try {
            const result = await giveItem(guest.id, itemKey);
            if (result) {
                toast.success(`Gave ${itemName} to ${guest.firstName}`);
            } else {
                toast.error('Failed to log item distribution');
            }
        } catch (error) {
            toast.error('Error giving item');
        } finally {
            setLocalLoading(null);
        }
    };

    const handleUndoItem = async (itemId: string, itemName: string) => {
        setUndoLoading(itemId);
        try {
            const success = await undoItem(itemId);
            if (success) {
                toast.success(`Undid ${itemName} for ${guest.firstName || guest.preferredName || 'Guest'}`);
            } else {
                toast.error('Failed to undo item');
            }
        } catch (error) {
            toast.error('Error undoing item');
        } finally {
            setUndoLoading(null);
        }
    };

    // Check if an item was given today (for showing undo option)
    const isGivenToday = (distributedAt: string) => {
        const itemDate = new Date(distributedAt);
        const today = new Date();
        return (
            itemDate.getFullYear() === today.getFullYear() &&
            itemDate.getMonth() === today.getMonth() &&
            itemDate.getDate() === today.getDate()
        );
    };

    // Handle marking shower as done
    const handleMarkAsDone = async () => {
        if (!record?.id) return;
        setMarkingDone(true);
        try {
            const success = await updateShowerStatus(record.id, 'done');
            if (success) {
                toast.success(`Shower marked as done for ${guest.preferredName || guest.firstName || 'Guest'}`);
            } else {
                toast.error('Failed to update shower status');
            }
        } catch (error) {
            toast.error('Error updating shower status');
        } finally {
            setMarkingDone(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">
                            {guest.preferredName || guest.name || 'Guest'}
                        </h2>
                        <p className="text-sm text-gray-500 font-medium">Shower Details & Amenities</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Reminders Section - Shows at top if guest has active reminders */}
                    <ServiceCardReminder guestId={guest.id} serviceType="shower" />

                    {/* Status & Waiver Section */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Shower Status</span>
                            <span className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-widest",
                                record.status === 'done' ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"
                            )}>
                                {record.status}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Time Slot</span>
                            <span className="font-bold text-gray-900">{record.time || 'N/A'}</span>
                        </div>
                        
                        {/* Mark as Done Button - only show if not already done */}
                        {record.status !== 'done' ? (
                            <button
                                onClick={handleMarkAsDone}
                                disabled={markingDone}
                                className={cn(
                                    "w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl",
                                    "bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold text-sm",
                                    "transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                )}
                            >
                                {markingDone ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Check size={16} />
                                )}
                                Mark as Done
                            </button>
                        ) : (
                            <div className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-50 border border-emerald-200">
                                <CheckCircle size={16} className="text-emerald-600" />
                                <span className="text-emerald-700 font-bold text-sm">Shower Completed</span>
                            </div>
                        )}
                        
                        <div className="pt-3 border-t border-gray-200">
                            <WaiverBadge 
                                guestId={guest.id} 
                                serviceType="shower" 
                                onModalOpen={() => setIsWaiverModalOpen(true)}
                                onModalClose={() => setIsWaiverModalOpen(false)}
                            />
                        </div>
                    </div>

                    {/* Amenities Section */}
                    <div>
                        <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                            <Package className="text-purple-600" size={20} />
                            Amenities & Supplies
                        </h3>

                        <div className="grid grid-cols-2 gap-3">
                            {AMENITY_ITEMS.map((item) => {
                                const availability = checkAvailability(guest.id, item.key);
                                const isAvailable = availability.available;
                                const isProcessing = localLoading === item.key;
                                const Icon = item.icon;

                                return (
                                    <button
                                        key={item.key}
                                        onClick={() => handleGiveItem(item.key, item.label)}
                                        disabled={!isAvailable || isProcessing || isLoading}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all relative overflow-hidden",
                                            isAvailable
                                                ? "bg-white border-gray-100 hover:border-purple-200 hover:bg-purple-50 hover:shadow-sm cursor-pointer active:scale-95"
                                                : "bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed"
                                        )}
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="animate-spin text-purple-600 mb-1" size={24} />
                                        ) : (
                                            <Icon size={24} className={cn("mb-1", isAvailable ? "text-purple-600" : "text-gray-400")} />
                                        )}

                                        <span className="font-bold text-sm text-gray-900">{item.label}</span>

                                        {!isAvailable && availability.daysRemaining !== undefined && (
                                            <span className="text-[10px] font-bold text-amber-600 mt-1 flex items-center gap-1">
                                                <Clock size={10} /> {availability.daysRemaining}d left
                                            </span>
                                        )}
                                        {!isAvailable && availability.daysRemaining === undefined && (
                                            <span className="text-[10px] text-gray-400 mt-1 font-medium">
                                                Limit reached
                                            </span>
                                        )}

                                        {isAvailable && (
                                            <span className="text-[10px] text-gray-400 mt-1 font-medium">
                                                {item.limit}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* History Section (Recent items) */}
                    {distributedItems.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Recent Items Given</h4>
                            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                                {distributedItems.slice(0, 5).map((item) => {
                                    const canUndo = isGivenToday(item.distributedAt);
                                    const isUndoing = undoLoading === item.id;
                                    
                                    return (
                                        <div key={item.id} className="px-4 py-2.5 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle size={14} className="text-emerald-500" />
                                                <span className="capitalize font-bold text-gray-700 text-sm">
                                                    {item.itemKey.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-400 font-medium">
                                                    {new Date(item.distributedAt).toLocaleDateString()}
                                                </span>
                                                {canUndo && (
                                                    <button
                                                        onClick={() => handleUndoItem(item.id, item.itemKey.replace('_', ' '))}
                                                        disabled={isUndoing || isLoading}
                                                        className={cn(
                                                            "p-1.5 rounded-lg transition-all",
                                                            "text-amber-600 hover:bg-amber-50 hover:text-amber-700",
                                                            "disabled:opacity-50 disabled:cursor-not-allowed"
                                                        )}
                                                        title="Undo - remove this item"
                                                    >
                                                        {isUndoing ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : (
                                                            <Undo2 size={14} />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
