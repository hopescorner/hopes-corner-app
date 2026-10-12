'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, ShowerHead, WashingMachine, AlertTriangle, Loader2 } from 'lucide-react';

interface EndServiceDayPanelProps {
    showShower?: boolean;
    showLaundry?: boolean;
    pendingShowerCount?: number;
    pendingLaundryCount?: number;
    onEndShowerDay: () => Promise<void>;
    onEndLaundryDay: () => Promise<void>;
    isAdmin?: boolean;
}

export function EndServiceDayPanel({
    showShower = false,
    showLaundry = false,
    pendingShowerCount = 0,
    pendingLaundryCount = 0,
    onEndShowerDay,
    onEndLaundryDay,
    isAdmin = false,
}: EndServiceDayPanelProps) {
    const [isEndingShowers, setIsEndingShowers] = useState(false);
    const [isEndingLaundry, setIsEndingLaundry] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState<'shower' | 'laundry' | null>(null);

    // Only show for admin/staff users
    if (!isAdmin || (!showShower && !showLaundry)) return null;

    const handleEndShowerClick = () => {
        if (pendingShowerCount === 0) return;
        setShowConfirmDialog('shower');
    };

    const handleEndLaundryClick = () => {
        if (pendingLaundryCount === 0) return;
        setShowConfirmDialog('laundry');
    };

    const handleConfirm = async () => {
        if (showConfirmDialog === 'shower') {
            setIsEndingShowers(true);
            try {
                await onEndShowerDay();
            } finally {
                setIsEndingShowers(false);
            }
        } else if (showConfirmDialog === 'laundry') {
            setIsEndingLaundry(true);
            try {
                await onEndLaundryDay();
            } finally {
                setIsEndingLaundry(false);
            }
        }
        setShowConfirmDialog(null);
    };

    return (
        <>
            <motion.div
                initial={false}
                animate={{ y: 0 }}
                className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/80 rounded-xl p-4 shadow-sm"
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-100/80 rounded-xl">
                            <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-red-900">End Service Day</h3>
                            <p className="text-xs text-red-700/90">
                                Cancel all remaining bookings to close for the day
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        {showShower && (
                            <button
                                onClick={handleEndShowerClick}
                                disabled={isEndingShowers || pendingShowerCount === 0}
                                className="min-h-11 flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-700 bg-white/90 border-2 border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all disabled:cursor-not-allowed shadow-sm"
                            >
                                {isEndingShowers ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <ShowerHead className="w-4 h-4" />
                                )}
                                End Showers
                                {pendingShowerCount > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                                        {pendingShowerCount}
                                    </span>
                                )}
                            </button>
                        )}
                        {showLaundry && (
                            <button
                                onClick={handleEndLaundryClick}
                                disabled={isEndingLaundry || pendingLaundryCount === 0}
                                className="min-h-11 flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-700 bg-white/90 border-2 border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all disabled:cursor-not-allowed shadow-sm"
                            >
                                {isEndingLaundry ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <WashingMachine className="w-4 h-4" />
                                )}
                                End Laundry
                                {pendingLaundryCount > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                                        {pendingLaundryCount}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Confirmation Dialog */}
            <AnimatePresence>
                {showConfirmDialog && (
                    <motion.div
                        initial={false}
                        animate={{}}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={() => setShowConfirmDialog(null)}
                    >
                        <motion.div
                            initial={false}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            role="dialog" aria-modal="true" aria-labelledby="end-service-title"
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-red-100 rounded-full">
                                        <AlertTriangle className="w-6 h-6 text-red-600" />
                                    </div>
                                    <div>
                                        <h3 id="end-service-title" className="text-lg font-bold text-gray-900">
                                            End {showConfirmDialog === 'shower' ? 'Shower' : 'Laundry'} Day?
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            This action cannot be undone.
                                        </p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-700 mb-6">
                                    {showConfirmDialog === 'shower' ? (
                                        <>
                                            This will cancel all <strong>{pendingShowerCount}</strong> remaining
                                            showers (booked, awaiting, and waitlisted).
                                        </>
                                    ) : (
                                        <>
                                            This will cancel all <strong>{pendingLaundryCount}</strong> pending
                                            on-site laundry loads.
                                        </>
                                    )}
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowConfirmDialog(null)}
                                        className="min-h-11 flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        className="min-h-11 flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        End Service Day
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
