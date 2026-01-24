'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Loader2, Plus, Check, Trash2, ShowerHead, WashingMachine, Bike, Clock } from 'lucide-react';
import { useRemindersStore, ReminderServiceType, GuestReminder } from '@/stores/useRemindersStore';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils/cn';

interface ReminderManagementModalProps {
    guest: any;
    onClose: () => void;
}

const SERVICE_OPTIONS: { id: ReminderServiceType; label: string; icon: any; color: string }[] = [
    { id: 'all', label: 'All Services', icon: Bell, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { id: 'shower', label: 'Shower', icon: ShowerHead, color: 'text-sky-600 bg-sky-50 border-sky-200' },
    { id: 'laundry', label: 'Laundry', icon: WashingMachine, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { id: 'bicycle', label: 'Bicycle', icon: Bike, color: 'text-amber-600 bg-amber-50 border-amber-200' },
];

export function ReminderManagementModal({ guest, onClose }: ReminderManagementModalProps) {
    const { 
        getRemindersForGuest, 
        getActiveRemindersForGuest,
        addReminder, 
        dismissReminder, 
        deleteReminder 
    } = useRemindersStore();

    const [isPending, setIsPending] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [selectedServices, setSelectedServices] = useState<ReminderServiceType[]>(['all']);

    const allReminders = getRemindersForGuest(guest.id);
    const activeReminders = getActiveRemindersForGuest(guest.id);
    const dismissedReminders = allReminders.filter(r => r.dismissedAt);

    const toggleService = (serviceId: ReminderServiceType) => {
        if (serviceId === 'all') {
            setSelectedServices(['all']);
            return;
        }
        
        let newSelection = selectedServices.filter(s => s !== 'all');
        
        if (newSelection.includes(serviceId)) {
            newSelection = newSelection.filter(s => s !== serviceId);
        } else {
            newSelection = [...newSelection, serviceId];
        }
        
        // If nothing selected, default to 'all'
        if (newSelection.length === 0) {
            setSelectedServices(['all']);
        } else {
            setSelectedServices(newSelection);
        }
    };

    const handleAddReminder = async () => {
        if (!newMessage.trim()) {
            toast.error('Please enter a reminder message');
            return;
        }

        setIsPending(true);
        try {
            await addReminder(guest.id, { 
                message: newMessage.trim(), 
                appliesTo: selectedServices 
            });
            toast.success('Reminder added');
            setNewMessage('');
            setSelectedServices(['all']);
        } catch (error: any) {
            toast.error(error.message || 'Failed to add reminder');
        } finally {
            setIsPending(false);
        }
    };

    const handleDismissReminder = async (reminderId: string) => {
        setActionId(reminderId);
        try {
            const success = await dismissReminder(reminderId);
            if (success) {
                toast.success('Reminder dismissed');
            } else {
                toast.error('Failed to dismiss reminder');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to dismiss reminder');
        } finally {
            setActionId(null);
        }
    };

    const handleDeleteReminder = async (reminderId: string) => {
        setActionId(reminderId);
        try {
            const success = await deleteReminder(reminderId);
            if (success) {
                toast.success('Reminder deleted');
            } else {
                toast.error('Failed to delete reminder');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete reminder');
        } finally {
            setActionId(null);
        }
    };

    const getServiceBadges = (appliesTo: ReminderServiceType[]) => {
        if (appliesTo.includes('all')) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                    <Bell size={10} /> All Services
                </span>
            );
        }
        return appliesTo.map(service => {
            const option = SERVICE_OPTIONS.find(s => s.id === service);
            if (!option) return null;
            const Icon = option.icon;
            return (
                <span 
                    key={service}
                    className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold",
                        option.color
                    )}
                >
                    <Icon size={10} /> {option.label}
                </span>
            );
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-purple-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                            <Bell size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Reminders</h2>
                            <p className="text-sm text-gray-500 font-medium">
                                {guest.preferredName || guest.name}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Add New Reminder */}
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-4">
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">Add New Reminder</h3>
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            rows={2}
                            placeholder="Enter reminder message for staff..."
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium outline-none resize-none"
                        />
                        
                        {/* Service Selection */}
                        <div className="space-y-2">
                            <span className="text-xs font-bold text-gray-500">Show on services:</span>
                            <div className="flex flex-wrap gap-2">
                                {SERVICE_OPTIONS.map((option) => {
                                    const Icon = option.icon;
                                    const isSelected = selectedServices.includes(option.id) || 
                                        (option.id !== 'all' && selectedServices.includes('all'));
                                    
                                    return (
                                        <button
                                            key={option.id}
                                            onClick={() => toggleService(option.id)}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                                isSelected
                                                    ? option.color
                                                    : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                                            )}
                                        >
                                            <Icon size={14} />
                                            {option.label}
                                            {isSelected && <Check size={12} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={handleAddReminder}
                                disabled={isPending || !newMessage.trim()}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold text-sm transition-all disabled:opacity-50 shadow-sm"
                            >
                                {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                Add Reminder
                            </button>
                        </div>
                    </div>

                    {/* Active Reminders */}
                    <div>
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">
                            Active Reminders ({activeReminders.length})
                        </h3>
                        {activeReminders.length === 0 ? (
                            <div className="p-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-center">
                                <Bell size={24} className="text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No active reminders for this guest</p>
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                <AnimatePresence>
                                    {activeReminders.map((reminder) => (
                                        <motion.li
                                            key={reminder.id}
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="p-4 rounded-xl border border-blue-200 bg-blue-50/50"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 space-y-2">
                                                    <p className="text-sm text-gray-700 font-medium">{reminder.message}</p>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {getServiceBadges(reminder.appliesTo)}
                                                        {reminder.createdAt && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                                                                <Clock size={10} />
                                                                {new Date(reminder.createdAt).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleDismissReminder(reminder.id)}
                                                        disabled={actionId === reminder.id}
                                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 rounded-lg transition-all disabled:opacity-50"
                                                        title="Dismiss reminder"
                                                    >
                                                        {actionId === reminder.id ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Check size={14} />
                                                                Dismiss
                                                            </>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteReminder(reminder.id)}
                                                        disabled={actionId === reminder.id}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                                        title="Delete reminder"
                                                    >
                                                        {actionId === reminder.id ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : (
                                                            <Trash2 size={14} />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.li>
                                    ))}
                                </AnimatePresence>
                            </ul>
                        )}
                    </div>

                    {/* Dismissed Reminders (collapsed by default) */}
                    {dismissedReminders.length > 0 && (
                        <details className="group">
                            <summary className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 cursor-pointer hover:text-gray-600 transition-colors list-none flex items-center gap-2">
                                <span className="group-open:rotate-90 transition-transform">▶</span>
                                Recently Dismissed ({dismissedReminders.length})
                            </summary>
                            <ul className="space-y-2 mt-3">
                                {dismissedReminders.slice(0, 5).map((reminder) => (
                                    <li
                                        key={reminder.id}
                                        className="p-3 rounded-lg border border-gray-100 bg-gray-50/50 opacity-60"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-500 line-through">{reminder.message}</p>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    {getServiceBadges(reminder.appliesTo)}
                                                    {reminder.dismissedAt && (
                                                        <span className="text-[10px] text-gray-400">
                                                            Dismissed {new Date(reminder.dismissedAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteReminder(reminder.id)}
                                                disabled={actionId === reminder.id}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                                title="Delete permanently"
                                            >
                                                {actionId === reminder.id ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={14} />
                                                )}
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </details>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gray-200 hover:bg-gray-300 text-gray-700 transition-all"
                    >
                        Done
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
