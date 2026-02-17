'use client';

import { useState, useMemo, useDeferredValue, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    X, 
    AlertTriangle, 
    Loader2, 
    Search, 
    User, 
    ArrowRight,
    Utensils,
    ShowerHead,
    WashingMachine,
    Scissors,
    Gift,
    Bike,
    Package,
    Bell,
    ShieldAlert,
    Link2
} from 'lucide-react';
import { useGuestsStore, Guest, GuestRecordCounts } from '@/stores/useGuestsStore';
import { flexibleNameSearch } from '@/lib/utils/flexibleNameSearch';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

interface GuestDeleteWithTransferModalProps {
    guest: Guest;
    onClose: () => void;
    onDeleted?: () => void;
}

export function GuestDeleteWithTransferModal({ 
    guest, 
    onClose,
    onDeleted 
}: GuestDeleteWithTransferModalProps) {
    const { guests, checkGuestHasRecords, deleteGuestWithTransfer } = useGuestsStore();
    
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, setIsPending] = useState(false);
    const [recordCounts, setRecordCounts] = useState<GuestRecordCounts | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTransferGuest, setSelectedTransferGuest] = useState<Guest | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    
    const deferredSearchQuery = useDeferredValue(searchQuery);

    // Load record counts on mount
    useEffect(() => {
        const loadRecordCounts = async () => {
            setIsLoading(true);
            try {
                const counts = await checkGuestHasRecords(guest.id);
                setRecordCounts(counts);
            } catch (error) {
                console.error('Failed to load record counts:', error);
                toast.error('Failed to load guest records');
            } finally {
                setIsLoading(false);
            }
        };
        loadRecordCounts();
    }, [guest.id, checkGuestHasRecords]);

    // Filter guests for transfer target (exclude current guest)
    const filteredGuests = useMemo(() => {
        if (!deferredSearchQuery.trim()) {
            return [];
        }
        const results = flexibleNameSearch(deferredSearchQuery, guests);
        // Exclude the current guest being deleted
        return results.filter((g: Guest) => g.id !== guest.id).slice(0, 10);
    }, [guests, deferredSearchQuery, guest.id]);

    const hasRecords = recordCounts && recordCounts.total > 0;

    const handleDelete = async () => {
        if (hasRecords && !selectedTransferGuest) {
            toast.error('Please select a guest to transfer records to');
            return;
        }

        setIsPending(true);
        try {
            const success = await deleteGuestWithTransfer(
                guest.id, 
                selectedTransferGuest?.id
            );
            
            if (success) {
                toast.success(
                    selectedTransferGuest 
                        ? `Guest deleted. Records transferred to ${selectedTransferGuest.preferredName || selectedTransferGuest.name}.`
                        : 'Guest deleted successfully.'
                );
                onDeleted?.();
                onClose();
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete guest');
        } finally {
            setIsPending(false);
        }
    };

    const handleSelectGuest = (g: Guest) => {
        setSelectedTransferGuest(g);
        setSearchQuery('');
    };

    const renderRecordSummary = () => {
        if (!recordCounts) return null;
        
        const items = [
            { key: 'meals', label: 'Meals', count: recordCounts.meals, icon: Utensils },
            { key: 'showers', label: 'Showers', count: recordCounts.showers, icon: ShowerHead },
            { key: 'laundry', label: 'Laundry', count: recordCounts.laundry, icon: WashingMachine },
            { key: 'haircuts', label: 'Haircuts', count: recordCounts.haircuts, icon: Scissors },
            { key: 'holidays', label: 'Holidays', count: recordCounts.holidays, icon: Gift },
            { key: 'bicycleRepairs', label: 'Bike Repairs', count: recordCounts.bicycleRepairs, icon: Bike },
            { key: 'itemsDistributed', label: 'Items', count: recordCounts.itemsDistributed, icon: Package },
            { key: 'reminders', label: 'Reminders', count: recordCounts.reminders, icon: Bell },
            { key: 'warnings', label: 'Warnings', count: recordCounts.warnings, icon: ShieldAlert },
            { key: 'proxies', label: 'Proxy Links', count: recordCounts.proxies, icon: Link2 },
        ].filter(item => item.count > 0);

        if (items.length === 0) return null;

        return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-bold text-amber-800 mb-3">
                    This guest has {recordCounts.total} historical record{recordCounts.total !== 1 ? 's' : ''}:
                </p>
                <div className="grid grid-cols-2 gap-2">
                    {items.map(({ key, label, count, icon: Icon }) => (
                        <div 
                            key={key}
                            className="flex items-center gap-2 text-sm text-amber-700 bg-amber-100/50 px-3 py-1.5 rounded-lg"
                        >
                            <Icon size={14} />
                            <span>{label}: <strong>{count}</strong></span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 bg-red-50 border-b border-red-100 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 border-2 border-red-200 flex items-center justify-center shrink-0">
                        <AlertTriangle size={24} className="text-red-500" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-black text-gray-900">Delete Guest</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Delete <span className="font-bold text-red-600">{guest.preferredName || guest.name}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isPending}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 size={32} className="animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <>
                            {/* Record Summary */}
                            {renderRecordSummary()}

                            {/* Transfer Section */}
                            {hasRecords && (
                                <div className="space-y-4">
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                        <p className="text-sm text-blue-800">
                                            <strong>Transfer Required:</strong> Select another guest to transfer these records to before deletion.
                                        </p>
                                    </div>

                                    {/* Selected Transfer Guest */}
                                    {selectedTransferGuest ? (
                                        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                                            <div className="flex-1 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                                                    <User size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">
                                                        {selectedTransferGuest.preferredName || selectedTransferGuest.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        ID: {selectedTransferGuest.guestId}
                                                    </p>
                                                </div>
                                            </div>
                                            <ArrowRight size={16} className="text-green-500" />
                                            <span className="text-sm font-medium text-green-700">
                                                Records will transfer here
                                            </span>
                                            <button
                                                onClick={() => setSelectedTransferGuest(null)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Search Input */}
                                            <div className="relative">
                                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Search for transfer target guest..."
                                                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium outline-none"
                                                    autoFocus
                                                />
                                            </div>

                                            {/* Search Results */}
                                            {deferredSearchQuery.trim() && (
                                                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                                                    {filteredGuests.length > 0 ? (
                                                        filteredGuests.map((g: Guest) => (
                                                            <button
                                                                key={g.id}
                                                                onClick={() => handleSelectGuest(g)}
                                                                className={cn(
                                                                    "w-full flex items-center gap-3 p-3 text-left hover:bg-blue-50 transition-all",
                                                                )}
                                                            >
                                                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm">
                                                                    {(g.firstName?.[0] || '?').toUpperCase()}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-bold text-gray-900 truncate">
                                                                        {g.preferredName || g.name}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        {g.guestId} • {g.location || 'No location'}
                                                                    </p>
                                                                </div>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="p-4 text-center text-gray-500 text-sm">
                                                            No guests found matching &quot;{deferredSearchQuery}&quot;
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* No Records - Simple Delete */}
                            {!hasRecords && (
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                    <p className="text-sm text-gray-600">
                                        This guest has no historical records. You can delete them directly.
                                    </p>
                                </div>
                            )}

                            {/* Confirmation Checkbox for guests with records */}
                            {hasRecords && selectedTransferGuest && (
                                <label className="flex items-start gap-3 mt-4 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-all">
                                    <input
                                        type="checkbox"
                                        checked={showConfirmation}
                                        onChange={(e) => setShowConfirmation(e.target.checked)}
                                        className="mt-0.5 w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                    />
                                    <span className="text-sm text-gray-700">
                                        I understand that all records from <strong>{guest.preferredName || guest.name}</strong> will be transferred to <strong>{selectedTransferGuest.preferredName || selectedTransferGuest.name}</strong> and this action cannot be undone.
                                    </span>
                                </label>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isPending}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={
                            isPending || 
                            isLoading || 
                            (!!hasRecords && !selectedTransferGuest) ||
                            (!!hasRecords && !!selectedTransferGuest && !showConfirmation)
                        }
                        className="px-5 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isPending && <Loader2 size={16} className="animate-spin" />}
                        {hasRecords && selectedTransferGuest ? 'Transfer & Delete' : 'Delete Guest'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
