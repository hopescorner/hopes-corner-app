'use client';

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Loader2 } from 'lucide-react';
import { useRemindersStore, ReminderServiceType, GuestReminder } from '@/stores/useRemindersStore';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

interface ReminderIndicatorProps {
    guestId: string;
    serviceType: ReminderServiceType;
    /** Compact mode shows just an icon, full mode shows the message */
    compact?: boolean;
    /** Whether to show inline dismiss button */
    allowInlineDismiss?: boolean;
    className?: string;
}

/**
 * ReminderIndicator - Shows active reminders for a guest's service card
 * 
 * This component displays when a guest has an active reminder that applies
 * to the specified service. Staff must dismiss reminders before they disappear.
 */
export const ReminderIndicator = memo(function ReminderIndicator({
    guestId,
    serviceType,
    compact = false,
    allowInlineDismiss = true,
    className,
}: ReminderIndicatorProps) {
    const { getRemindersForService, dismissReminder } = useRemindersStore();
    const [dismissingId, setDismissingId] = useState<string | null>(null);
    const [showTooltip, setShowTooltip] = useState(false);

    const reminders = getRemindersForService(guestId, serviceType);

    if (reminders.length === 0) {
        return null;
    }

    const handleDismiss = async (e: React.MouseEvent, reminderId: string) => {
        e.stopPropagation();
        e.preventDefault();
        setDismissingId(reminderId);
        try {
            const success = await dismissReminder(reminderId);
            if (success) {
                toast.success('Reminder dismissed');
            }
        } catch (error) {
            toast.error('Failed to dismiss reminder');
        } finally {
            setDismissingId(null);
        }
    };

    // Compact mode: just show an animated bell icon
    if (compact) {
        return (
            <div 
                className={cn("relative", className)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-md"
                >
                    <Bell size={12} />
                </motion.div>
                {reminders.length > 1 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {reminders.length}
                    </span>
                )}
                
                {/* Tooltip on hover */}
                <AnimatePresence>
                    {showTooltip && (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl"
                        >
                            <p className="font-bold mb-1">Reminders:</p>
                            {reminders.slice(0, 3).map((r, i) => (
                                <p key={r.id} className="text-gray-300 truncate">• {r.message}</p>
                            ))}
                            {reminders.length > 3 && (
                                <p className="text-gray-400 text-[10px] mt-1">+{reminders.length - 3} more</p>
                            )}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // Full mode: show all reminders with dismiss buttons
    return (
        <div className={cn("space-y-2", className)}>
            {reminders.map((reminder) => (
                <motion.div
                    key={reminder.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2 p-2 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200"
                >
                    <div className="flex-shrink-0 mt-0.5">
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center"
                        >
                            <Bell size={10} className="text-white" />
                        </motion.div>
                    </div>
                    <p className="flex-1 text-xs font-medium text-gray-700 leading-tight">
                        {reminder.message}
                    </p>
                    {allowInlineDismiss && (
                        <button
                            onClick={(e) => handleDismiss(e, reminder.id)}
                            disabled={dismissingId === reminder.id}
                            className="flex-shrink-0 p-1 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors disabled:opacity-50"
                            title="Dismiss reminder"
                        >
                            {dismissingId === reminder.id ? (
                                <Loader2 size={12} className="animate-spin" />
                            ) : (
                                <Check size={12} />
                            )}
                        </button>
                    )}
                </motion.div>
            ))}
        </div>
    );
});

/**
 * ReminderBadge - A small badge showing reminder count
 * 
 * Use this when you just want to show that reminders exist,
 * not the full reminder content.
 */
export const ReminderBadge = memo(function ReminderBadge({
    guestId,
    serviceType,
    onClick,
    className,
}: {
    guestId: string;
    serviceType?: ReminderServiceType;
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
}) {
    const { getRemindersForService, hasActiveReminder } = useRemindersStore();
    
    const reminders = serviceType 
        ? getRemindersForService(guestId, serviceType)
        : [];
    
    const hasReminder = serviceType 
        ? hasActiveReminder(guestId, serviceType)
        : hasActiveReminder(guestId);

    if (!hasReminder) {
        return null;
    }

    return (
        <motion.button
            onClick={onClick}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full",
                "bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200",
                "text-blue-700 text-[10px] font-bold",
                onClick && "cursor-pointer hover:from-blue-200 hover:to-purple-200 transition-colors",
                className
            )}
        >
            <motion.span
                animate={{ rotate: [-5, 5, -5] }}
                transition={{ repeat: Infinity, duration: 0.5, ease: "easeInOut" }}
            >
                <Bell size={10} />
            </motion.span>
            {reminders.length > 0 ? reminders.length : '!'}
        </motion.button>
    );
});

/**
 * ServiceCardReminder - Full reminder display for service detail modals
 * 
 * Shows all reminders with full message and dismiss capability
 */
export const ServiceCardReminder = memo(function ServiceCardReminder({
    guestId,
    serviceType,
    className,
}: {
    guestId: string;
    serviceType: ReminderServiceType;
    className?: string;
}) {
    const { getRemindersForService, dismissReminder } = useRemindersStore();
    const [dismissingId, setDismissingId] = useState<string | null>(null);

    const reminders = getRemindersForService(guestId, serviceType);

    if (reminders.length === 0) {
        return null;
    }

    const handleDismissAll = async () => {
        for (const reminder of reminders) {
            setDismissingId(reminder.id);
            try {
                await dismissReminder(reminder.id);
            } catch (error) {
                console.error('Failed to dismiss reminder:', error);
            }
        }
        setDismissingId(null);
        toast.success(`Dismissed ${reminders.length} reminder${reminders.length > 1 ? 's' : ''}`);
    };

    return (
        <div className={cn("rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 overflow-hidden", className)}>
            <div className="px-4 py-2 bg-gradient-to-r from-blue-100/50 to-purple-100/50 border-b border-blue-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <motion.div
                        animate={{ rotate: [-5, 5, -5] }}
                        transition={{ repeat: Infinity, duration: 0.5, ease: "easeInOut" }}
                    >
                        <Bell size={14} className="text-blue-600" />
                    </motion.div>
                    <span className="text-xs font-black text-blue-700 uppercase tracking-wider">
                        Staff Reminder{reminders.length > 1 ? 's' : ''}
                    </span>
                </div>
                {reminders.length > 1 && (
                    <button
                        onClick={handleDismissAll}
                        disabled={dismissingId !== null}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline transition-colors disabled:opacity-50"
                    >
                        Dismiss All
                    </button>
                )}
            </div>
            <div className="p-3 space-y-2">
                <AnimatePresence mode="popLayout">
                    {reminders.map((reminder) => (
                        <ReminderItem
                            key={reminder.id}
                            reminder={reminder}
                            onDismiss={async () => {
                                setDismissingId(reminder.id);
                                try {
                                    await dismissReminder(reminder.id);
                                    toast.success('Reminder dismissed');
                                } catch (error) {
                                    toast.error('Failed to dismiss');
                                } finally {
                                    setDismissingId(null);
                                }
                            }}
                            isDismissing={dismissingId === reminder.id}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
});

const ReminderItem = memo(function ReminderItem({
    reminder,
    onDismiss,
    isDismissing,
}: {
    reminder: GuestReminder;
    onDismiss: () => void;
    isDismissing: boolean;
}) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20, height: 0 }}
            className="flex items-start gap-2 p-2 rounded-lg bg-white/70 border border-blue-100"
        >
            <div className="flex-1">
                <p className="text-sm text-gray-700 font-medium">{reminder.message}</p>
                {reminder.createdAt && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                        Added {new Date(reminder.createdAt).toLocaleDateString()}
                    </p>
                )}
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDismiss();
                }}
                disabled={isDismissing}
                className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 rounded-lg transition-all disabled:opacity-50"
            >
                {isDismissing ? (
                    <Loader2 size={12} className="animate-spin" />
                ) : (
                    <>
                        <Check size={12} />
                        Dismiss
                    </>
                )}
            </button>
        </motion.div>
    );
});

export default ReminderIndicator;
