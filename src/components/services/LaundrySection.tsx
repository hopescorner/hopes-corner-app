'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WashingMachine, Clock, Wind, Package, CheckCircle, Trash2, User, Timer, Edit3, Save, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';
import { CompactWaiverIndicator } from '@/components/ui/CompactWaiverIndicator';
import CompactLaundryList from './CompactLaundryList';
import { LayoutGrid, List, Settings } from 'lucide-react';
import { SlotBlockModal } from '../admin/SlotBlockModal';
import { EndServiceDayPanel } from './EndServiceDayPanel';
import { ServiceDatePicker } from './ServiceDatePicker';
import { useSession } from 'next-auth/react';

const STATUS_COLUMNS = [
    { id: 'waiting', title: 'Waiting', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', badgeClass: 'bg-amber-100 text-amber-700' },
    { id: 'washer', title: 'In Washer', icon: WashingMachine, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', badgeClass: 'bg-blue-100 text-blue-700' },
    { id: 'dryer', title: 'In Dryer', icon: Wind, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', badgeClass: 'bg-purple-100 text-purple-700' },
    { id: 'done', title: 'Ready', icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', badgeClass: 'bg-emerald-100 text-emerald-700' },
    { id: 'picked_up', title: 'Picked Up', icon: CheckCircle, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', badgeClass: 'bg-gray-100 text-gray-700' },
];

const OFFSITE_STATUS_COLUMNS = [
    { id: 'pending', title: 'Pending', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', badgeClass: 'bg-amber-100 text-amber-700' },
    { id: 'transported', title: 'Transported', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', badgeClass: 'bg-blue-100 text-blue-700' },
    { id: 'returned', title: 'Returned', icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', badgeClass: 'bg-purple-100 text-purple-700' },
    { id: 'offsite_picked_up', title: 'Picked Up', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', badgeClass: 'bg-emerald-100 text-emerald-700' },
];

/**
 * Formats time elapsed from an ISO timestamp to now
 */
const formatTimeElapsed = (isoTimestamp: string | null): string | null => {
    if (!isoTimestamp) return null;
    try {
        const timestamp = new Date(isoTimestamp);
        if (isNaN(timestamp.getTime())) return null;
        const now = new Date();
        const diffMs = now.getTime() - timestamp.getTime();
        if (diffMs < 0) return null;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const remainingMinutes = diffMinutes % 60;
        if (diffMinutes < 1) return '< 1m';
        if (diffHours < 1) return `${diffMinutes}m`;
        if (diffHours < 24) return remainingMinutes > 0 ? `${diffHours}h ${remainingMinutes}m` : `${diffHours}h`;
        const days = Math.floor(diffHours / 24);
        const remainingHours = diffHours % 24;
        return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    } catch {
        return null;
    }
};

export function LaundrySection() {
    const { laundryRecords, updateLaundryStatus, updateLaundryBagNumber, cancelMultipleLaundry, loadFromSupabase } = useServicesStore();
    const { guests } = useGuestsStore();
    const { data: session } = useSession();

    const today = todayPacificDateString();
    const [selectedDate, setSelectedDate] = useState(today);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Check if user is admin/staff
    const userRole = (session?.user as any)?.role || '';
    const isAdmin = ['admin', 'board', 'staff'].includes(userRole);

    // Check if viewing historical data
    const isViewingPast = selectedDate !== today;

    // Refresh handler
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        const toastId = toast.loading('Refreshing laundry...');
        try {
            await loadFromSupabase();
            toast.success('Laundry refreshed', { id: toastId });
        } catch (error) {
            console.error('Failed to refresh laundry:', error);
            toast.error('Failed to refresh', { id: toastId });
        } finally {
            setIsRefreshing(false);
        }
    }, [loadFromSupabase]);

    // Filter logic depends on whether viewing historical data or current
    const activeLaundry = useMemo(() => {
        if (isViewingPast) {
            // When viewing past, show all records from that specific date
            return laundryRecords.filter(r => pacificDateStringFrom(r.date) === selectedDate);
        }
        
        // Current view: today's records + any past records that are not completed (pending pickup/active)
        return laundryRecords.filter(r => {
            const recordDate = pacificDateStringFrom(r.date);
            const isToday = recordDate === today;
            const isPast = recordDate < today;

            // Active statuses are anything NOT in this list
            const completedStatuses = new Set(['picked_up', 'returned', 'offsite_picked_up', 'cancelled']);
            const isActive = !completedStatuses.has(r.status);

            return isToday || (isPast && isActive);
        });
    }, [laundryRecords, selectedDate, isViewingPast, today]);

    const onsiteLaundry = activeLaundry.filter(r => r.laundryType === 'onsite' || !r.laundryType);
    const offsiteLaundry = activeLaundry.filter(r => r.laundryType === 'offsite');

    // Calculate pending on-site laundry for End Service Day (only 'waiting' status, only for today)
    const todaysRecords = laundryRecords.filter(r => pacificDateStringFrom(r.date) === today);
    const pendingOnsiteLaundry = todaysRecords.filter(r => 
        (r.laundryType === 'onsite' || !r.laundryType) && r.status === 'waiting'
    );

    const handleEndLaundryDay = async () => {
        if (pendingOnsiteLaundry.length === 0) {
            toast.error('No pending on-site laundry to cancel.');
            return;
        }
        const success = await cancelMultipleLaundry(pendingOnsiteLaundry.map((r) => r.id));
        if (success) {
            toast.success(`Cancelled ${pendingOnsiteLaundry.length} laundry loads.`);
        } else {
            toast.error('Failed to cancel laundry.');
        }
    };

    // Drag and drop state
    const [draggedItem, setDraggedItem] = useState<any>(null);
    const draggedItemRef = useRef<any>(null);

    // View mode state
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [showSlotManager, setShowSlotManager] = useState(false);

    // Memoize guest lookup map for O(1) access
    const guestMap = useMemo(() => {
        const map = new Map();
        (guests || []).forEach(g => map.set(g.id, g));
        return map;
    }, [guests]);

    // Bag number check
    const hasBagNumber = useCallback((record: any) =>
        Boolean(String(record?.bagNumber ?? '').trim().length), []);

    // Check if bag is required before moving from initial status
    const requiresBagPrompt = useCallback((record: any, newStatus: string) => {
        if (hasBagNumber(record)) return false; // Already has bag number

        const isOffsite = record?.laundryType === 'offsite';
        const currentStatus = record?.status;

        // For offsite: require bag when moving from pending/waiting
        if (isOffsite) {
            return (currentStatus === 'pending' || currentStatus === 'waiting') &&
                newStatus !== 'pending' && newStatus !== 'waiting';
        }

        // For onsite: require bag when moving from waiting
        return currentStatus === 'waiting' && newStatus !== 'waiting';
    }, [hasBagNumber]);

    // Handle status change with bag number validation
    const handleStatusChange = useCallback(async (record: any, newStatus: string) => {
        if (!record || isViewingPast) return;

        // Check if we need to prompt for bag number
        if (requiresBagPrompt(record, newStatus)) {
            const manualBag = window.prompt('A bag number is required before moving out of waiting. Enter one to continue.');
            const trimmedBag = (manualBag || '').trim();
            if (!trimmedBag) {
                toast.error('Please enter a bag number to continue');
                return;
            }
            try {
                await updateLaundryBagNumber(record.id, trimmedBag);
                toast.success('Bag number saved');
            } catch {
                toast.error('Failed to save bag number');
                return;
            }
        }

        try {
            await updateLaundryStatus(record.id, newStatus);
            toast.success('Status updated');
        } catch {
            toast.error('Failed to update status');
        }
    }, [requiresBagPrompt, updateLaundryBagNumber, updateLaundryStatus, isViewingPast]);

    // Drag handlers - disabled when viewing historical data
    const handleDragStart = useCallback((e: React.DragEvent, record: any) => {
        if (isViewingPast) {
            e.preventDefault();
            return;
        }
        draggedItemRef.current = record;
        setDraggedItem(record);
        e.dataTransfer.effectAllowed = 'move';
        if (typeof e.dataTransfer.setDragImage === 'function') {
            e.dataTransfer.setDragImage(e.currentTarget as Element, 0, 0);
        }
    }, [isViewingPast]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        const item = draggedItemRef.current;
        if (item && item.status !== newStatus) {
            await handleStatusChange(item, newStatus);
        }
        draggedItemRef.current = null;
        setDraggedItem(null);
    }, [handleStatusChange]);

    const handleDragEnd = useCallback(() => {
        draggedItemRef.current = null;
        setDraggedItem(null);
    }, []);

    // Get guest name details
    const getGuestNameDetails = useCallback((guestId: string) => {
        const guest = guestMap.get(guestId) || null;
        const legalName = guest?.name || `${guest?.firstName || ''} ${guest?.lastName || ''}`.trim() || 'Unknown Guest';
        const preferredName = (guest?.preferredName || '').trim();
        const hasPreferred = Boolean(preferredName) && preferredName.toLowerCase() !== legalName.toLowerCase();
        const primaryName = hasPreferred ? preferredName : legalName;
        return { guest, legalName, preferredName, hasPreferred, primaryName };
    }, [guestMap]);

    return (
        <div className="space-y-8">
            {/* Historical Data Warning Banner */}
            {isViewingPast && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <div>
                        <p className="text-sm font-bold text-amber-800">Viewing Historical Data</p>
                        <p className="text-xs text-amber-600">
                            You are viewing laundry records from {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}. 
                            Actions are disabled in history view.
                        </p>
                    </div>
                </div>
            )}

            {/* End Service Day Panel - Only show for today */}
            {!isViewingPast && (
                <EndServiceDayPanel
                    showShower={false}
                    showLaundry={true}
                    pendingLaundryCount={pendingOnsiteLaundry.length}
                    onEndShowerDay={async () => { }}
                    onEndLaundryDay={handleEndLaundryDay}
                    isAdmin={isAdmin}
                />
            )}

            {/* On-site Laundry Kanban */}
            <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        {/* Date Picker for time travel */}
                        <ServiceDatePicker
                            selectedDate={selectedDate}
                            onDateChange={setSelectedDate}
                            isAdmin={isAdmin}
                        />
                        <div>
                            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
                                <WashingMachine className="text-purple-600" />
                                {viewMode === 'list' ? 'Laundry Overview' : 'On-site Laundry - Kanban Board'}
                            </h2>
                            <p className="text-sm text-gray-500 font-medium">
                                {isViewingPast ? 'Historical view - read only' : 'Drag and drop cards between columns to update status'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Refresh Button */}
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white text-gray-700 rounded-lg border hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Refresh laundry data"
                            aria-label="Refresh laundry data"
                        >
                            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                        {!isViewingPast && (
                            <button
                                onClick={() => setShowSlotManager(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white text-gray-700 rounded-lg border hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                                <Settings className="w-4 h-4" />
                                Manage Slots
                            </button>
                        )}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode('kanban')}
                                className={cn(
                                    "p-1.5 rounded-md transition-all",
                                    viewMode === 'kanban' ? "bg-white shadow text-purple-600" : "text-gray-500 hover:text-gray-700"
                                )}
                                title="Kanban View"
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    "p-1.5 rounded-md transition-all",
                                    viewMode === 'list' ? "bg-white shadow text-purple-600" : "text-gray-500 hover:text-gray-700"
                                )}
                                title="List View"
                            >
                                <List size={16} />
                            </button>
                        </div>
                        <span className="bg-gray-100 text-gray-700 font-bold px-3 py-1 rounded-full text-sm">
                            {onsiteLaundry.length} total
                        </span>
                    </div>
                </div>

                {viewMode === 'list' ? (
                    <CompactLaundryList />
                ) : (
                    <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-hide">
                        {STATUS_COLUMNS.map((column) => {
                            const columnRecords = onsiteLaundry.filter(r => r.status === column.id);
                            const Icon = column.icon;

                            return (
                                <div
                                    key={column.id}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, column.id)}
                                    className={cn(
                                        "flex-shrink-0 w-56 lg:flex-1 lg:min-w-[180px] rounded-xl border-2 p-4 min-h-[400px] flex flex-col transition-colors",
                                        column.bg,
                                        column.border,
                                        draggedItem && draggedItem.status !== column.id && "border-opacity-75"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Icon size={18} className={column.color} />
                                            <h3 className={cn("font-bold text-sm", column.color)}>
                                                {column.title}
                                            </h3>
                                        </div>

                                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold", column.badgeClass)}>
                                            {columnRecords.length}
                                        </span>
                                    </div>

                                    <div className="space-y-3 flex-1">
                                        <AnimatePresence mode="popLayout">
                                            {columnRecords.map((record) => (
                                                <LaundryCard
                                                    key={record.id}
                                                    record={record}
                                                    guestDetails={getGuestNameDetails(record.guestId)}
                                                    isDragging={draggedItem?.id === record.id}
                                                    onDragStart={(e) => handleDragStart(e, record)}
                                                    onDragEnd={handleDragEnd}
                                                    onStatusChange={(newStatus) => handleStatusChange(record, newStatus)}
                                                    columns={STATUS_COLUMNS}
                                                    readOnly={isViewingPast}
                                                />
                                            ))}
                                            {columnRecords.length === 0 && (
                                                <div className="py-12 text-center">
                                                    <Icon size={32} className="mx-auto text-gray-200/50 mb-2" />
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No laundry</p>
                                                    <p className="text-[9px] text-gray-300 mt-1">Drag cards here</p>
                                                </div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            );
                        })}

                    </div>
                )}
            </div>

            {/* Off-site Laundry Kanban - only show if there are off-site records */}
            {offsiteLaundry.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
                                <Package className="text-blue-600" /> Off-site Laundry - Kanban Board
                            </h2>
                            <p className="text-sm text-gray-500 font-medium">Track laundry sent to external facility</p>
                        </div>
                        <span className="bg-gray-100 text-gray-700 font-bold px-3 py-1 rounded-full text-sm">
                            {offsiteLaundry.length} total
                        </span>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-hide">
                        {OFFSITE_STATUS_COLUMNS.map((column) => {
                            // For pending column, also include 'waiting' status for backwards compatibility
                            const columnRecords = offsiteLaundry.filter(r =>
                                column.id === 'pending'
                                    ? (r.status === 'pending' || r.status === 'waiting')
                                    : r.status === column.id
                            );
                            const Icon = column.icon;

                            return (
                                <div
                                    key={column.id}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, column.id)}
                                    className={cn(
                                        "flex-shrink-0 w-56 lg:flex-1 lg:min-w-[200px] rounded-xl border-2 p-4 min-h-[400px] flex flex-col transition-colors",
                                        column.bg,
                                        column.border,
                                        draggedItem && draggedItem.status !== column.id && "border-opacity-75"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Icon size={18} className={column.color} />
                                            <h3 className={cn("font-bold text-sm", column.color)}>
                                                {column.title}
                                            </h3>
                                        </div>
                                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold", column.badgeClass)}>
                                            {columnRecords.length}
                                        </span>
                                    </div>

                                    <div className="space-y-3 flex-1">
                                        <AnimatePresence mode="popLayout">
                                            {columnRecords.map((record) => (
                                                <LaundryCard
                                                    key={record.id}
                                                    record={record}
                                                    guestDetails={getGuestNameDetails(record.guestId)}
                                                    isDragging={draggedItem?.id === record.id}
                                                    onDragStart={(e) => handleDragStart(e, record)}
                                                    onDragEnd={handleDragEnd}
                                                    onStatusChange={(newStatus) => handleStatusChange(record, newStatus)}
                                                    columns={OFFSITE_STATUS_COLUMNS}
                                                    isOffsite
                                                    readOnly={isViewingPast}
                                                />
                                            ))}
                                            {columnRecords.length === 0 && (
                                                <div className="py-12 text-center">
                                                    <Icon size={32} className="mx-auto text-gray-200/50 mb-2" />
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No laundry</p>
                                                    <p className="text-[9px] text-gray-300 mt-1">Drag cards here</p>
                                                </div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <SlotBlockModal
                isOpen={showSlotManager}
                onClose={() => setShowSlotManager(false)}
                serviceType="laundry"
            />
        </div>
    );
}

interface LaundryCardProps {
    record: any;
    guestDetails: { guest: any; legalName: string; preferredName: string; hasPreferred: boolean; primaryName: string };
    isDragging: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    onStatusChange: (newStatus: string) => void;
    columns: typeof STATUS_COLUMNS;
    isOffsite?: boolean;
    readOnly?: boolean;
}

function LaundryCard({ record, guestDetails, isDragging, onDragStart, onDragEnd, onStatusChange, columns, isOffsite = false, readOnly = false }: LaundryCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditingBag, setIsEditingBag] = useState(false);
    const [bagValue, setBagValue] = useState(record.bagNumber || '');
    const { updateLaundryBagNumber, deleteLaundryRecord } = useServicesStore();

    const isCompleted = record.status === 'picked_up' || record.status === 'offsite_picked_up';

    const handleSaveBag = async () => {
        if (readOnly) return;
        try {
            await updateLaundryBagNumber(record.id, bagValue);
            setIsEditingBag(false);
            toast.success('Bag number saved');
        } catch {
            toast.error('Failed to save bag number');
        }
    };

    return (
        <div
            draggable={!readOnly}
            onDragStart={readOnly ? undefined : onDragStart}
            onDragEnd={readOnly ? undefined : onDragEnd}
            style={{ willChange: isDragging ? 'transform, opacity' : 'auto' }}
            className={cn(
                "bg-white rounded-lg border-2 shadow-sm p-3 transition-all hover:shadow-md",
                readOnly ? "cursor-default" : "cursor-move",
                isDragging && "opacity-50 scale-105",
                isCompleted ? "border-emerald-200 hover:border-emerald-300" : "border-gray-200 hover:border-gray-300"
            )}
        >
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
            >
                <div className="flex items-center justify-between gap-1.5 mb-2 min-h-[24px]">
                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs text-gray-900 leading-tight break-words line-clamp-2" title={guestDetails.hasPreferred ? `${guestDetails.preferredName} (${guestDetails.legalName})` : guestDetails.legalName}>
                            {guestDetails.primaryName}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {/* Waiver indicator for non-completed laundry */}
                        {!isCompleted && (
                            <CompactWaiverIndicator guestId={record.guestId} serviceType="laundry" />
                        )}
                        <button
                            type="button"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} laundry details`}
                        >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    </div>
                </div>

                {/* Secondary info line */}
                {(guestDetails.hasPreferred || (!isOffsite && record.time)) && (
                    <div className="text-[9px] text-gray-500 mb-2 line-clamp-1">
                        {guestDetails.hasPreferred && guestDetails.legalName}
                        {guestDetails.hasPreferred && !isOffsite && record.time && ' • '}
                        {!isOffsite && record.time}
                    </div>
                )}

                <div className="space-y-2">
                    {record.bagNumber && (
                        <div className="flex items-start gap-1.5 text-xs text-gray-600 bg-purple-50 border border-purple-100 rounded px-2 py-1.5">
                            <Package size={12} className="text-purple-600 flex-shrink-0 mt-0.5" />
                            <span>Bag #{record.bagNumber}</span>
                        </div>
                    )}

                    {isOffsite && (
                        <div className="text-xs bg-blue-50 border border-blue-100 rounded px-2 py-1">
                            <span className="font-semibold text-blue-700">Off-site laundry</span>
                        </div>
                    )}

                    {/* Time tracking indicator */}
                    {!isCompleted && (record.createdAt || record.lastUpdated) && (
                        <div
                            className="flex items-center gap-1.5 text-[10px] text-gray-500 bg-gray-50 rounded px-2 py-1 cursor-help"
                            title={`Dropoff: ${record.createdAt ? formatTimeElapsed(record.createdAt) + ' ago' : 'N/A'}\nIn current status: ${record.lastUpdated ? formatTimeElapsed(record.lastUpdated) + ' ago' : 'N/A'}`}
                        >
                            <Timer size={10} className="text-gray-400 flex-shrink-0" />
                            <span>
                                {record.lastUpdated && record.lastUpdated !== record.createdAt ? (
                                    <>
                                        <span className="font-bold text-gray-700">{formatTimeElapsed(record.lastUpdated)}</span> in status
                                        <span className="text-gray-300 mx-1">•</span>
                                        <span className="text-gray-400">Total: {formatTimeElapsed(record.createdAt) || '—'}</span>
                                    </>
                                ) : (
                                    <span>{formatTimeElapsed(record.createdAt) || '—'}</span>
                                )}
                            </span>
                        </div>
                    )}

                    {isExpanded && (
                        <div className="pt-2 mt-2 border-t border-gray-100 space-y-2">
                            <div>
                                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                                    Bag Number
                                </label>
                                {isEditingBag && !readOnly ? (
                                    <div className="flex gap-1">
                                        <input
                                            type="text"
                                            value={bagValue}
                                            onChange={(e) => setBagValue(e.target.value)}
                                            placeholder="Enter bag number"
                                            className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                                            autoFocus
                                        />
                                        <button onClick={handleSaveBag} className="px-2 py-1 bg-purple-600 text-white rounded text-[10px] font-bold">
                                            <Save size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <span className={cn("text-xs font-medium", record.bagNumber ? "text-gray-900" : "text-gray-300 italic")}>
                                            {record.bagNumber || 'No Bag #'}
                                        </span>
                                        {!readOnly && (
                                            <button onClick={() => setIsEditingBag(true)} className="text-[10px] text-blue-500 hover:underline">
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {!readOnly && (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                                            Status
                                        </label>
                                        <select
                                            value={record.status}
                                            onChange={(e) => onStatusChange(e.target.value)}
                                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                                        >
                                            {columns.map((col) => (
                                                <option key={col.id} value={col.id}>{col.title}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (confirm(`Cancel laundry booking for ${guestDetails.primaryName}?`)) {
                                                deleteLaundryRecord(record.id);
                                                toast.success('Laundry booking cancelled');
                                            }
                                        }}
                                        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded px-3 py-1.5 transition-colors"
                                    >
                                        <Trash2 size={12} />
                                        Cancel Booking
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
