'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bike, Clock, CheckCircle, Wrench, Trash2, ChevronDown, ChevronUp,
    ChevronLeft, ChevronRight, GripVertical, LayoutGrid, List
} from 'lucide-react';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';
import { CompactWaiverIndicator } from '@/components/ui/CompactWaiverIndicator';
import { ReminderIndicator } from '@/components/ui/ReminderIndicator';

const BICYCLE_REPAIR_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    DONE: 'done',
};

const STATUS_COLUMNS = [
    {
        id: BICYCLE_REPAIR_STATUS.PENDING,
        title: 'Pending',
        icon: Clock,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        badgeClass: 'bg-amber-100 text-amber-700'
    },
    {
        id: BICYCLE_REPAIR_STATUS.IN_PROGRESS,
        title: 'In Progress',
        icon: Wrench,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        badgeClass: 'bg-blue-100 text-blue-700'
    },
    {
        id: BICYCLE_REPAIR_STATUS.DONE,
        title: 'Done',
        icon: CheckCircle,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        badgeClass: 'bg-emerald-100 text-emerald-700'
    },
];

export function BicycleSection() {
    const { bicycleRecords, updateBicycleRecord, deleteBicycleRecord } = useServicesStore();
    const { guests } = useGuestsStore();

    // View mode state
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

    // Date navigation state
    const today = todayPacificDateString();
    const [viewDate, setViewDate] = useState(today);
    const isViewingToday = viewDate === today;
    const isViewingPast = viewDate < today;

    // Drag state
    const [draggedItem, setDraggedItem] = useState<any>(null);
    const draggedItemRef = useRef<any>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

    // Expanded cards state
    const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

    // Guest lookup map
    const guestMap = useMemo(() => {
        const map = new Map();
        (guests || []).forEach(g => map.set(g.id, g));
        return map;
    }, [guests]);

    // Filter records by date
    const dateFilteredRecords = useMemo(() => {
        return (bicycleRecords || []).filter(
            r => pacificDateStringFrom(r.date) === viewDate
        );
    }, [bicycleRecords, viewDate]);

    // Group records by status
    const groupedRecords = useMemo(() => ({
        [BICYCLE_REPAIR_STATUS.PENDING]: dateFilteredRecords.filter(r => r.status === BICYCLE_REPAIR_STATUS.PENDING),
        [BICYCLE_REPAIR_STATUS.IN_PROGRESS]: dateFilteredRecords.filter(r => r.status === BICYCLE_REPAIR_STATUS.IN_PROGRESS),
        [BICYCLE_REPAIR_STATUS.DONE]: dateFilteredRecords.filter(r => r.status === BICYCLE_REPAIR_STATUS.DONE),
    }), [dateFilteredRecords]);

    // Get guest details
    const getGuestDetails = useCallback((guestId: string) => {
        const guest = guestMap.get(guestId);
        if (!guest) return { name: 'Unknown Guest', bicycleDescription: null };
        const name = guest.preferredName || guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Unknown Guest';
        return {
            name,
            legalName: guest.name,
            hasPreferred: Boolean(guest.preferredName && guest.preferredName !== guest.name),
            bicycleDescription: guest.bicycleDescription?.trim() || null
        };
    }, [guestMap]);

    // Toggle card expansion
    const toggleCard = useCallback((recordId: string) => {
        setExpandedCards(prev => ({ ...prev, [recordId]: !prev[recordId] }));
    }, []);

    // Status change handler
    const handleStatusChange = useCallback(async (recordId: string, newStatus: string) => {
        try {
            await updateBicycleRecord(recordId, { status: newStatus as any });
            toast.success('Status updated');
        } catch {
            toast.error('Failed to update status');
        }
    }, [updateBicycleRecord]);

    // Update completed repairs
    const handleRepairToggle = useCallback(async (record: any, repairType: string) => {
        const currentCompleted = record.completedRepairs || [];
        const isCompleted = currentCompleted.includes(repairType);
        const newCompleted = isCompleted
            ? currentCompleted.filter((t: string) => t !== repairType)
            : [...currentCompleted, repairType];

        // Determine new status based on completion
        const repairTypes = record.repairTypes || [record.repairType];
        let newStatus = record.status;
        if (newCompleted.length === 0) {
            newStatus = BICYCLE_REPAIR_STATUS.PENDING;
        } else if (newCompleted.length === repairTypes.length) {
            newStatus = BICYCLE_REPAIR_STATUS.DONE;
        } else {
            newStatus = BICYCLE_REPAIR_STATUS.IN_PROGRESS;
        }

        try {
            await updateBicycleRecord(record.id, {
                completedRepairs: newCompleted,
                ...(newStatus !== record.status ? { status: newStatus } : {})
            });
        } catch {
            toast.error('Failed to update repair');
        }
    }, [updateBicycleRecord]);

    // Drag handlers
    const handleDragStart = useCallback((e: React.DragEvent, record: any) => {
        draggedItemRef.current = record;
        setDraggedItem(record);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDragEnter = useCallback((e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        setDragOverColumn(columnId);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        // Only clear if leaving the column itself, not entering a child
        if (e.currentTarget && !e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverColumn(null);
        }
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        setDragOverColumn(null);
        const item = draggedItemRef.current;
        if (item && item.status !== newStatus) {
            await handleStatusChange(item.id, newStatus);
        }
        draggedItemRef.current = null;
        setDraggedItem(null);
    }, [handleStatusChange]);

    const handleDragEnd = useCallback(() => {
        draggedItemRef.current = null;
        setDraggedItem(null);
        setDragOverColumn(null);
    }, []);

    // Date navigation
    const navigateDate = useCallback((direction: 'prev' | 'next') => {
        const [y, m, d] = viewDate.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
        const newDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (newDate <= today) {
            setViewDate(newDate);
        }
    }, [viewDate, today]);

    // Format date label
    const formatDateLabel = (dateStr: string) => {
        if (dateStr === today) return 'Today';
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
                        <Bike className="text-amber-600" /> Bicycle Repairs
                    </h2>
                    <p className="text-sm text-gray-500 font-medium mt-1">
                        {dateFilteredRecords.length} repair{dateFilteredRecords.length !== 1 ? 's' : ''} {isViewingToday ? 'today' : 'on this day'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Date Navigation */}
                    <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-2 py-1">
                        <button
                            onClick={() => navigateDate('prev')}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className={cn(
                            "text-sm font-bold min-w-[100px] text-center",
                            isViewingPast ? "text-amber-600" : "text-gray-700"
                        )}>
                            {formatDateLabel(viewDate)}
                            {isViewingPast && (
                                <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Past</span>
                            )}
                        </span>
                        <button
                            onClick={() => navigateDate('next')}
                            disabled={isViewingToday}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-30"
                        >
                            <ChevronRight size={16} />
                        </button>
                        {isViewingPast && (
                            <button
                                onClick={() => setViewDate(today)}
                                className="text-xs font-bold text-sky-600 hover:text-sky-700 ml-1"
                            >
                                Today
                            </button>
                        )}
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={cn(
                                'p-2 rounded-lg transition-all',
                                viewMode === 'kanban' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            )}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                'p-2 rounded-lg transition-all',
                                viewMode === 'list' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            )}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Kanban View */}
            {viewMode === 'kanban' ? (
                <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
                    {STATUS_COLUMNS.map((column) => {
                        const records = groupedRecords[column.id] || [];
                        const Icon = column.icon;

                        return (
                            <div
                                key={column.id}
                                onDragOver={handleDragOver}
                                onDragEnter={(e) => handleDragEnter(e, column.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, column.id)}
                                className={cn(
                                    "flex-shrink-0 w-72 lg:flex-1 lg:min-w-[280px] rounded-2xl border-2 p-4 min-h-[450px] flex flex-col transition-colors",
                                    column.bg,
                                    column.border,
                                    draggedItem && dragOverColumn === column.id && draggedItem.status !== column.id && "ring-2 ring-offset-2 ring-blue-200 bg-blue-50/40"
                                )}
                            >
                                {/* Column Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Icon size={18} className={column.color} />
                                        <h3 className={cn("font-bold text-sm", column.color)}>{column.title}</h3>
                                    </div>
                                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold", column.badgeClass)}>
                                        {records.length}
                                    </span>
                                </div>

                                {/* Cards */}
                                <div className="space-y-3 flex-1">
                                    <AnimatePresence mode="popLayout">
                                        {records.map((record) => (
                                            <BicycleCard
                                                key={record.id}
                                                record={record}
                                                guestDetails={getGuestDetails(record.guestId)}
                                                isExpanded={expandedCards[record.id]}
                                                isDragging={draggedItem?.id === record.id}
                                                onToggle={() => toggleCard(record.id)}
                                                onDragStart={(e) => handleDragStart(e, record)}
                                                onDragEnd={handleDragEnd}
                                                onRepairToggle={(type) => handleRepairToggle(record, type)}
                                                onStatusChange={(status) => handleStatusChange(record.id, status)}
                                                onDelete={() => deleteBicycleRecord(record.id)}
                                            />
                                        ))}
                                        {records.length === 0 && (
                                            <div className="py-12 text-center">
                                                <Icon size={32} className="mx-auto text-gray-200/50 mb-2" />
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No repairs</p>
                                                <p className="text-[9px] text-gray-300 mt-1">Drag cards here</p>
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* List View */
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="space-y-3">
                        {dateFilteredRecords.length === 0 ? (
                            <div className="py-16 text-center">
                                <Bike size={48} className="mx-auto text-gray-200 mb-4" />
                                <p className="text-gray-400 font-bold">No repairs logged {isViewingToday ? 'today' : 'on this day'}</p>
                            </div>
                        ) : (
                            dateFilteredRecords.map((record) => (
                                <BicycleCard
                                    key={record.id}
                                    record={record}
                                    guestDetails={getGuestDetails(record.guestId)}
                                    isExpanded={expandedCards[record.id]}
                                    isDragging={false}
                                    isListView
                                    onToggle={() => toggleCard(record.id)}
                                    onDragStart={() => { }}
                                    onDragEnd={() => { }}
                                    onRepairToggle={(type) => handleRepairToggle(record, type)}
                                    onStatusChange={(status) => handleStatusChange(record.id, status)}
                                    onDelete={() => deleteBicycleRecord(record.id)}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

interface BicycleCardProps {
    record: any;
    guestDetails: { name: string; legalName?: string; hasPreferred?: boolean; bicycleDescription: string | null };
    isExpanded: boolean;
    isDragging: boolean;
    isListView?: boolean;
    onToggle: () => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    onRepairToggle: (type: string) => void;
    onStatusChange: (status: string) => void;
    onDelete: () => void;
}

function BicycleCard({
    record,
    guestDetails,
    isExpanded,
    isDragging,
    isListView,
    onToggle,
    onDragStart,
    onDragEnd,
    onRepairToggle,
    onStatusChange,
    onDelete
}: BicycleCardProps) {
    const repairTypes = record.repairTypes || [record.repairType].filter(Boolean);
    const completedRepairs = record.completedRepairs || [];
    const isDone = record.status === BICYCLE_REPAIR_STATUS.DONE;

    return (
        <div
            draggable={!isListView}
            onDragStart={!isListView ? onDragStart as any : undefined}
            onDragEnd={!isListView ? onDragEnd : undefined}
            className={!isListView ? "cursor-move" : ""}
        >
            <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                    "bg-white rounded-xl border-2 shadow-sm p-4 transition-all",
                    isDragging ? "opacity-50" : "hover:shadow-md",
                    isDone ? "border-emerald-200" : "border-gray-200"
                )}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                        {!isListView && <GripVertical size={16} className="text-gray-300 flex-shrink-0 mt-1" />}
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-gray-900 truncate">{guestDetails.name}</div>
                            {guestDetails.hasPreferred && (
                                <div className="text-[10px] text-gray-500 truncate">Legal: {guestDetails.legalName}</div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {!isDone && <ReminderIndicator guestId={record.guestId} serviceType="bicycle" compact />}
                        {!isDone && <CompactWaiverIndicator guestId={record.guestId} serviceType="bicycle" />}
                        <button onClick={onToggle} className="text-gray-400 hover:text-gray-600 transition-colors">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                </div>

                {/* Bicycle Description */}
                {guestDetails.bicycleDescription && (
                    <div className="flex items-start gap-1.5 text-xs text-gray-600 bg-sky-50 border border-sky-100 rounded-lg px-2 py-1.5 mb-3">
                        <Bike size={12} className="text-sky-600 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{guestDetails.bicycleDescription}</span>
                    </div>
                )}

                {/* Repair Types Checklist */}
                {repairTypes.length > 0 && (
                    <div className="space-y-0.5 bg-gray-50 rounded-lg p-2 border border-gray-200 mb-3">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide px-1.5 mb-1">
                            Repairs ({completedRepairs.length}/{repairTypes.length})
                        </div>
                        {repairTypes.map((type: string, index: number) => {
                            const isCompleted = completedRepairs.includes(type);
                            return (
                                <label
                                    key={`${record.id}-${type}-${index}`}
                                    className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white px-2 py-1.5 rounded transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRepairToggle(type);
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isCompleted}
                                        onChange={() => { }}
                                        className="w-3.5 h-3.5 text-sky-600 border-gray-300 rounded flex-shrink-0"
                                    />
                                    <span className={isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}>
                                        {type}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                )}

                {/* Notes */}
                {record.notes && (
                    <div className="text-xs mb-3">
                        <span className="font-bold text-gray-700">Notes: </span>
                        <span className="text-gray-600 line-clamp-2">{record.notes}</span>
                    </div>
                )}

                {/* Expanded Section */}
                {isExpanded && (
                    <div className="pt-3 mt-3 border-t border-gray-100 space-y-3">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wide">Status</label>
                            <select
                                value={record.status || BICYCLE_REPAIR_STATUS.PENDING}
                                onChange={(e) => onStatusChange(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                            >
                                <option value={BICYCLE_REPAIR_STATUS.PENDING}>Pending</option>
                                <option value={BICYCLE_REPAIR_STATUS.IN_PROGRESS}>In Progress</option>
                                <option value={BICYCLE_REPAIR_STATUS.DONE}>Done</option>
                            </select>
                        </div>

                        <button
                            onClick={() => {
                                if (window.confirm(`Delete repair record for ${guestDetails.name}?`)) {
                                    onDelete();
                                    toast.success('Repair record deleted');
                                }
                            }}
                            className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-3 py-2 transition-colors"
                        >
                            <Trash2 size={12} />
                            Delete
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
