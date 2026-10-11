'use client';

import { useState, useCallback, useMemo, useDeferredValue, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShowerHead, Clock, CheckCircle, XCircle, ChevronRight, User, AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useBlockedSlotsStore } from '@/stores/useBlockedSlotsStore';
import { MAX_GUESTS_PER_SHOWER_SLOT, SHOWER_SLOT_OCCUPYING_STATUSES } from '@/lib/constants/constants';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';
import { isShowerPendingForEndOfDay } from '@/lib/utils/serviceStatus';
import { formatSlotLabel } from '@/lib/utils/serviceSlots';
import { generateShowerSlots } from '@/lib/utils/serviceSlots';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';
import { CompactWaiverIndicator } from '@/components/ui/CompactWaiverIndicator';
import { HousingStatusBadge } from '@/components/ui/HousingStatusBadge';
import CompactShowerList from './CompactShowerList';
import { ShowerDetailModal } from './ShowerDetailModal';
import { SlotBlockModal } from '../admin/SlotBlockModal';
import { EndServiceDayPanel } from './EndServiceDayPanel';
import { ServiceDatePicker } from './ServiceDatePicker';
import { ServiceDayNote } from './ServiceDayNote';
import { LayoutGrid, List, Settings, ChevronDown } from 'lucide-react';
import { useServiceViewState } from '@/hooks/useServiceViewState';
import { useServiceScrollPosition } from '@/hooks/useServiceScrollPosition';
import { useServiceClock } from '@/hooks/useServiceClock';
import { useSession } from 'next-auth/react';

export function ShowersSection() {
    useServiceScrollPosition('showers');
    const showerRecords = useServicesStore((s) => s.showerRecords);
    const cancelMultipleShowers = useServicesStore((s) => s.cancelMultipleShowers);
    const addShowerRecord = useServicesStore((s) => s.addShowerRecord);
    const addShowerWaitlist = useServicesStore((s) => s.addShowerWaitlist);
    const guests = useGuestsStore((s) => s.guests);
    const { data: session } = useSession();

    const today = todayPacificDateString();
    const [selectedDate, setSelectedDate] = useServiceViewState('showers-date', today);
    const [search, setSearch] = useServiceViewState<string>('showers-search', '');
    const query = useDeferredValue(search.trim().toLowerCase());
    const now = useServiceClock();
    const guestMap = useMemo(() => new Map(guests.map((guest) => [guest.id, guest])), [guests]);
    const [activeTab, setActiveTab] = useServiceViewState<'active' | 'completed' | 'waitlist' | 'cancelled'>('showers-filter', 'active', ['active', 'completed', 'waitlist', 'cancelled']);
    const [viewMode, setViewMode] = useServiceViewState<'grid' | 'list'>('showers-view', 'list', ['grid', 'list']);
    const [selectedShowerId, setSelectedShowerId] = useState<string | null>(null);
    const selectedRecord = showerRecords.find((record) => record.id === selectedShowerId);
    const selectedGuest = selectedRecord ? guestMap.get(selectedRecord.guestId) : undefined;
    const [assignGuestId, setAssignGuestId] = useState<string | null>(null);
    const blockedSlots = useBlockedSlotsStore((s) => s.blockedSlots);
    const [showSlotManager, setShowSlotManager] = useState(false);
    const [backfillGuestId, setBackfillGuestId] = useState('');
    const [backfillSlotTime, setBackfillSlotTime] = useState('');
    const [isAddingBackfill, setIsAddingBackfill] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    // Check if user is admin/staff
    const userRole = (session?.user as any)?.role || '';
    const isAdmin = ['admin', 'board', 'staff'].includes(userRole);

    // Check if viewing historical data
    const isViewingPast = selectedDate !== today;

    const getRecordDateKey = useCallback(
        (record: any) => record?.dateKey || pacificDateStringFrom(record?.date),
        []
    );

    // Sort showers earliest to latest by slot time, then by createdAt
    const sortByTime = useCallback((a: any, b: any) => {
        const parseSlotMinutes = (t: string | null | undefined): number => {
            if (!t) return Number.POSITIVE_INFINITY;
            const [h, m] = String(t).split(':');
            return parseInt(h, 10) * 60 + parseInt(m || '0', 10);
        };
        const timeDiff = parseSlotMinutes(a.time) - parseSlotMinutes(b.time);
        if (timeDiff !== 0) return timeDiff;
        const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aCreated - bCreated;
    }, []);

    const selectedDateRecords = useMemo(() => showerRecords.filter((record) => getRecordDateKey(record) === selectedDate), [showerRecords, selectedDate, getRecordDateKey]);
    const matchesSearch = useCallback((record: any) => {
        const guest = guestMap.get(record.guestId);
        return !query || [guest?.name, guest?.preferredName, guest?.firstName, guest?.lastName].join(' ').toLowerCase().includes(query);
    }, [guestMap, query]);

    const activeShowers = useMemo(
        () => selectedDateRecords.filter((r) => r.status === 'booked' || r.status === 'awaiting').sort(sortByTime),
        [selectedDateRecords, sortByTime]
    );
    const completedShowers = useMemo(
        () => selectedDateRecords.filter((r) => r.status === 'done').sort(sortByTime),
        [selectedDateRecords, sortByTime]
    );
    const waitlistedShowers = useMemo(
        () => selectedDateRecords.filter((r) => r.status === 'waitlisted').sort((a, b) => {
            const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return aCreated - bCreated;
        }),
        [selectedDateRecords]
    );
    const cancelledShowers = useMemo(
        () => selectedDateRecords.filter((r) => r.status === 'cancelled' || r.status === 'no_show').sort(sortByTime),
        [selectedDateRecords, sortByTime]
    );

    const pendingShowers = useMemo(() => {
        // For today only - pending showers for end-of-day cancellation.
        // Matches the confirmation dialog copy (booked, awaiting, waitlisted):
        // terminal no_show rows are already closed out and must not be
        // re-cancelled.
        const todaysRecords = showerRecords.filter((r) => getRecordDateKey(r) === today);
        return todaysRecords.filter((r) => isShowerPendingForEndOfDay(r.status));
    }, [showerRecords, today, getRecordDateKey]);

    const selectedDateSlots = useMemo(() => {
        const selectedDateObject = new Date(`${selectedDate}T12:00:00`);
        return generateShowerSlots(selectedDateObject);
    }, [selectedDate]);

    const selectableGuests = useMemo(() => {
        return (guests || [])
            .filter((guest) => guest?.id)
            .sort((firstGuest, secondGuest) => {
                const firstName = (firstGuest.preferredName || firstGuest.name || `${firstGuest.firstName || ''} ${firstGuest.lastName || ''}`).toString();
                const secondName = (secondGuest.preferredName || secondGuest.name || `${secondGuest.firstName || ''} ${secondGuest.lastName || ''}`).toString();
                return firstName.localeCompare(secondName);
            });
    }, [guests]);

    const currentList = useMemo(() => {
        switch (activeTab) {
            case 'active':
                return activeShowers.filter(matchesSearch);
            case 'completed':
                return completedShowers.filter(matchesSearch);
            case 'waitlist':
                return waitlistedShowers.filter(matchesSearch);
            case 'cancelled':
                return cancelledShowers.filter(matchesSearch);
        }
    }, [activeTab, activeShowers, completedShowers, waitlistedShowers, cancelledShowers, matchesSearch]);

    const timeCues = useMemo(() => {
        const cues = new Map<string, string>();
        if (isViewingPast) return cues;
        const pacificTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
        const nextTime = activeShowers.find((record) => record.time && record.time > pacificTime)?.time;
        for (const record of activeShowers) {
            if (record.time === nextTime) cues.set(record.id, 'Next');
            else if (record.time && record.time <= pacificTime) cues.set(record.id, 'Due');
        }
        return cues;
    }, [activeShowers, isViewingPast, now]);

    // Build a map of waitlist record ID → queue position (1-based)
    const waitlistQueueMap = useMemo(() => {
        const map = new Map<string, number>();
        waitlistedShowers.forEach((r, i) => map.set(r.id, i + 1));
        return map;
    }, [waitlistedShowers]);

    const handleEndShowerDay = async () => {
        if (pendingShowers.length === 0) {
            toast.error('No pending showers to cancel.');
            return;
        }
        const success = await cancelMultipleShowers(pendingShowers.map((r) => r.id));
        if (success) {
            toast.success(`Cancelled ${pendingShowers.length} showers.`);
        } else {
            toast.error('Failed to cancel showers.');
        }
    };

    const handleGuestClick = (guestId: string, recordId: string) => {
        if (guestMap.has(guestId)) setSelectedShowerId(recordId);
    };

    const handleAddShowerRecord = async () => {
        if (!backfillGuestId) {
            toast.error('Please select a guest');
            return;
        }

        setIsAddingBackfill(true);
        try {
            await addShowerRecord(backfillGuestId, backfillSlotTime || undefined, selectedDate);
            toast.success(`Shower added for ${selectedDate}`);
            setBackfillGuestId('');
            setBackfillSlotTime('');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to add shower record');
        } finally {
            setIsAddingBackfill(false);
        }
    };

    const handleAddCompletedShower = async () => {
        if (!backfillGuestId) {
            toast.error('Please select a guest');
            return;
        }

        setIsAddingBackfill(true);
        try {
            await addShowerRecord(backfillGuestId, backfillSlotTime || undefined, selectedDate, 'done');
            toast.success(`Completed shower added for ${selectedDate}`);
            setBackfillGuestId('');
            setBackfillSlotTime('');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to add completed shower');
        } finally {
            setIsAddingBackfill(false);
        }
    };

    const handleAddShowerWaitlist = async () => {
        if (!backfillGuestId) {
            toast.error('Please select a guest');
            return;
        }

        setIsAddingBackfill(true);
        try {
            await addShowerWaitlist(backfillGuestId, selectedDate);
            toast.success(`Waitlist entry added for ${selectedDate}`);
            setBackfillGuestId('');
            setBackfillSlotTime('');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to add waitlist entry');
        } finally {
            setIsAddingBackfill(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Historical Data Warning Banner */}
            {isViewingPast && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <div>
                        <p className="text-sm font-bold text-amber-800">Viewing Historical Data</p>
                        <p className="text-xs text-amber-600">
                            You are viewing shower records from {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}. 
                            Status updates are disabled in history view.
                        </p>
                    </div>
                </div>
            )}

            {isAdmin && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="min-h-11 min-w-11 w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                        aria-expanded={showAddForm}
                    >
                        <span className="flex items-center gap-2">
                            <ShowerHead size={16} className="text-sky-600" />
                            Add Shower Record
                            <span className="text-sm font-normal text-gray-400">
                                (saves to {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
                            </span>
                        </span>
                        <ChevronDown size={16} className={cn("text-gray-400 transition-transform", showAddForm && "rotate-180")} />
                    </button>
                    {showAddForm && (
                        <div className="px-4 pb-4 border-t border-gray-100">
                            <div className="flex flex-col lg:flex-row lg:items-end gap-3 pt-3">
                                <div className="flex-1">
                                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Add Individual Shower Record</p>
                                    <select
                                        value={backfillGuestId}
                                        onChange={(event) => setBackfillGuestId(event.target.value)}
                                        className="min-h-11 min-w-11 w-full p-2.5 rounded-lg border border-gray-200 bg-white text-base"
                                    >
                                        <option value="">Select guest</option>
                                        {selectableGuests.map((guest) => {
                                            const displayName = guest.preferredName || guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest';
                                            return (
                                                <option key={guest.id} value={guest.id}>
                                                    {displayName}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                                <div className="w-full lg:w-56">
                                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Slot (Optional)</p>
                                    <select
                                        value={backfillSlotTime}
                                        onChange={(event) => setBackfillSlotTime(event.target.value)}
                                        className="min-h-11 min-w-11 w-full p-2.5 rounded-lg border border-gray-200 bg-white text-base"
                                    >
                                        <option value="">No slot time</option>
                                        {selectedDateSlots.map((slotTime) => (
                                            <option key={slotTime} value={slotTime}>
                                                {formatSlotLabel(slotTime)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAddShowerRecord}
                                        disabled={!backfillGuestId || isAddingBackfill}
                                        className={cn(
                                            "px-4 py-2.5 rounded-lg text-sm font-bold transition-colors",
                                            !backfillGuestId || isAddingBackfill
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-sky-600 text-white hover:bg-sky-700'
                                        )}
                                    >
                                        {isAddingBackfill ? 'Saving...' : 'Add Shower'}
                                    </button>
                                    <button
                                        onClick={handleAddCompletedShower}
                                        disabled={!backfillGuestId || isAddingBackfill}
                                        className={cn(
                                            "px-4 py-2.5 rounded-lg text-sm font-bold transition-colors",
                                            !backfillGuestId || isAddingBackfill
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        )}
                                    >
                                        Add Done
                                    </button>
                                    <button
                                        onClick={handleAddShowerWaitlist}
                                        disabled={!backfillGuestId || isAddingBackfill}
                                        className={cn(
                                            "px-4 py-2.5 rounded-lg text-sm font-bold transition-colors",
                                            !backfillGuestId || isAddingBackfill
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-amber-500 text-white hover:bg-amber-600'
                                        )}
                                    >
                                        Add Waitlist
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* End Service Day Panel - Only show for today */}
            {!isViewingPast && (
                <EndServiceDayPanel
                    showShower={true}
                    showLaundry={false}
                    pendingShowerCount={pendingShowers.length}
                    onEndShowerDay={handleEndShowerDay}
                    onEndLaundryDay={async () => { }}
                    isAdmin={isAdmin}
                />
            )}

            <div className="sticky top-0 z-20 space-y-2 rounded-xl bg-white/95 p-2 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4 rounded-xl border border-gray-200 bg-white/95 p-3">
                {/* Left side: Date picker + Tab Navigation */}
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Date Picker for time travel */}
                    <ServiceDatePicker
                        selectedDate={selectedDate}
                        onDateChange={setSelectedDate}
                        isAdmin={isAdmin}
                    />

                    {/* Tab Navigation - Desktop */}
                    <div className="hidden sm:flex p-1 bg-gray-100 rounded-2xl w-fit">
                        {(['active', 'completed', 'waitlist', 'cancelled'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    'min-h-11 px-4 py-2.5 rounded-xl text-sm font-black transition-all capitalize',
                                    activeTab === tab
                                        ? 'bg-white text-sky-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                )}
                            >
                                {tab}
                                <span className="ml-2 text-sm opacity-60">
                                    ({tab === 'active' ? activeShowers.length : tab === 'completed' ? completedShowers.length : tab === 'waitlist' ? waitlistedShowers.length : cancelledShowers.length})
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Tab Navigation - Mobile (horizontal scroll) */}
                    <div className="sm:hidden flex overflow-x-auto gap-2 scrollbar-hide">
                        {(['active', 'completed', 'waitlist', 'cancelled'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    'min-h-11 flex-shrink-0 px-4 py-2 rounded-xl text-sm font-black transition-all capitalize border',
                                    activeTab === tab
                                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                                        : 'bg-white text-gray-500 border-gray-200'
                                )}
                            >
                                {tab}
                                <span className="ml-1.5 text-sm opacity-75">
                                    ({tab === 'active' ? activeShowers.length : tab === 'completed' ? completedShowers.length : tab === 'waitlist' ? waitlistedShowers.length : cancelledShowers.length})
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right side actions */}
                <div className="flex items-center gap-4">
                    {/* Manage Slots Button */}
                    <button
                        onClick={() => setShowSlotManager(true)}
                        className="min-h-11 min-w-11 flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                        Manage Slots
                    </button>

                    {/* View Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "min-h-11 min-w-11 flex items-center justify-center p-2 rounded-md transition-all",
                                viewMode === 'grid' ? "bg-white shadow text-sky-600" : "text-gray-500 hover:text-gray-700"
                            )}
                            title="Grid View"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "min-h-11 min-w-11 flex items-center justify-center p-2 rounded-md transition-all",
                                viewMode === 'list' ? "bg-white shadow text-sky-600" : "text-gray-500 hover:text-gray-700"
                            )}
                            title="List View"
                        >
                            <List size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <label className="block rounded-xl border border-gray-200 bg-white/95 p-3 text-sm font-medium text-gray-700">
                Find shower guest
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Guest name" className="min-h-11 min-w-11 mt-1 w-full rounded-lg border border-gray-300 px-3 text-base" />
            </label>

            </div>

            <ServiceDayNote date={selectedDate} serviceType="showers" />

            {/* Content */}
            {viewMode === 'list' ? (
                <CompactShowerList
                    records={currentList}
                    timeCues={timeCues}
                    onGuestClick={handleGuestClick}
                    onAssignSlot={setAssignGuestId}
                    readOnly={isViewingPast}
                    waitlistQueueMap={activeTab === 'waitlist' ? waitlistQueueMap : undefined}
                />
            ) : (
                /* Grid of Shower Cards */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                        {currentList.length > 0 ? (
                            currentList.map((record) => (
                                <ShowerListItem
                                    key={record.id}
                                    record={record}
                                    guest={guestMap.get(record.guestId)}
                                    timeCue={timeCues.get(record.id)}
                                    onAssignSlot={() => setAssignGuestId(record.guestId)}
                                    onClick={() => handleGuestClick(record.guestId, record.id)}
                                    readOnly={isViewingPast}
                                    queuePosition={activeTab === 'waitlist' ? waitlistQueueMap.get(record.id) : undefined}
                                />
                            ))
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="col-span-full py-20 text-center"
                            >
                                <ShowerHead size={48} className="mx-auto text-gray-200 mb-4" />
                                <p className="text-gray-400 font-bold">No {activeTab} showers found</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Detail Modal */}
            {selectedRecord && selectedGuest && (
                <ShowerDetailModal
                    isOpen={true}
                    onClose={() => setSelectedShowerId(null)}
                    record={selectedRecord}
                    guest={selectedGuest}
                    readOnly={isViewingPast}
                />
            )}

            {assignGuestId && !isViewingPast && <ShowerSlotDialog
                guestName={guestMap.get(assignGuestId)?.preferredName || guestMap.get(assignGuestId)?.name || 'Guest'}
                slots={selectedDateSlots.map((time) => ({
                    time,
                    disabled: blockedSlots.some((slot) => slot.serviceType === 'shower' && slot.date === selectedDate && slot.slotTime === time) || selectedDateRecords.filter((record) => record.time === time && SHOWER_SLOT_OCCUPYING_STATUSES.has(record.status)).length >= MAX_GUESTS_PER_SHOWER_SLOT,
                }))}
                onClose={() => setAssignGuestId(null)}
                onAssign={async (time) => {
                    await addShowerRecord(assignGuestId, time, selectedDate);
                    toast.success(`Shower assigned for ${formatSlotLabel(time)}`);
                    setAssignGuestId(null);
                }}
            />}

            {/* Slot Manager Modal */}
            <SlotBlockModal
                isOpen={showSlotManager}
                onClose={() => setShowSlotManager(false)}
                serviceType="shower"
            />
        </div>
    );
}

function ShowerListItem({ record, guest, onClick, readOnly = false, queuePosition, timeCue, onAssignSlot }: { record: any, guest: any, onClick?: () => void, readOnly?: boolean, queuePosition?: number, timeCue?: string, onAssignSlot?: () => void }) {
    const [isUpdating, setIsUpdating] = useState(false);
    const updateShowerStatus = useServicesStore((s) => s.updateShowerStatus);

    const handleCancel = async () => {
        if (readOnly) return;
        if (!window.confirm('Are you sure you want to cancel this shower?')) return;
        setIsUpdating(true);
        try {
            const success = await updateShowerStatus(record.id, 'cancelled');
            if (success) {
                toast.success('Shower cancelled');
            } else {
                toast.error('Failed to cancel shower');
            }
        } catch (error) {
            toast.error('Failed to cancel shower');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (readOnly) return;
        setIsUpdating(true);
        try {
            const ok = await updateShowerStatus(record.id, newStatus);
            if (ok) toast.success(newStatus === 'done' ? 'Shower completed' : 'Status updated');
            else toast.error('Failed to update status');
        } catch (error) {
            toast.error('Failed to update status');
        } finally {
            setIsUpdating(false);
        }
    };



    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
                "bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all group relative",
                onClick ? "cursor-pointer hover:border-sky-100" : ""
            )}
            onClick={(e) => {
                // Prevent click when hitting buttons
                if ((e.target as HTMLElement).closest('button')) return;
                onClick?.();
            }}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-100",
                        record.status === 'done' ? 'bg-emerald-500' : 
                        (record.status === 'cancelled' || record.status === 'no_show') ? 'bg-gray-400' :
                        record.status === 'waitlisted' ? 'bg-amber-500' : 'bg-sky-500'
                    )}>
                        {queuePosition != null ? (
                            <span className="text-base font-black">#{queuePosition}</span>
                        ) : (
                            <User size={20} />
                        )}
                    </div>
                    <div>
                        <h4 className={cn(
                            "font-black tracking-tight",
                            (record.status === 'cancelled' || record.status === 'no_show') ? 'text-gray-400' : 'text-gray-900'
                        )}>
                            {guest ? (guest.preferredName || guest.name) : 'Unknown Guest'}
                        </h4>
                        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            <Clock size={16} />
                            {timeCue && <span className="font-bold text-sky-700">{timeCue}</span>}
                            {record.time ? formatSlotLabel(record.time) : (record.status === 'waitlisted' ? (queuePosition != null ? `Queue #${queuePosition}` : 'Waitlisted') : 'No time')}
                        </div>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <HousingStatusBadge housingStatus={guest?.housingStatus} />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Waiver indicator for non-completed showers */}
                    {record.status !== 'done' && record.status !== 'cancelled' && record.status !== 'no_show' && (
                        <CompactWaiverIndicator guestId={record.guestId} serviceType="shower" />
                    )}
                    <div className={cn(
                        "px-2.5 py-1 rounded-full text-sm font-black uppercase tracking-widest",
                        record.status === 'done' ? 'bg-emerald-50 text-emerald-600' : 
                        (record.status === 'cancelled' || record.status === 'no_show') ? 'bg-red-50 text-red-500' : 'bg-sky-50 text-sky-600'
                    )}>
                        {record.status.replace('_', ' ')}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-auto">
                {!readOnly && record.status === 'waitlisted' && onAssignSlot && <button type="button" onClick={onAssignSlot} className="min-h-11 rounded-lg bg-sky-600 px-4 text-sm font-bold text-white">Assign slot</button>}
                {record.status !== 'done' && record.status !== 'cancelled' && record.status !== 'no_show' && !readOnly && (
                    <>
                        <button
                            disabled={isUpdating}
                            onClick={() => handleStatusUpdate('done')}
                            className="min-h-11 min-w-11 flex-1 py-2 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-2 bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-200"
                        >
                            {isUpdating ? <Loader2 className="animate-spin" size={14} /> : (
                                <>
                                    <CheckCircle size={14} /> COMPLETE
                                </>
                            )}
                        </button>
                        <button
                            disabled={isUpdating}
                            onClick={handleCancel}
                            className="min-h-11 min-w-11 p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                            <XCircle size={18} />
                        </button>
                    </>
                )}
                {record.status === 'done' && !readOnly && (
                    <button
                        disabled={isUpdating}
                        onClick={() => handleStatusUpdate('booked')}
                        className="min-h-11 min-w-11 w-full py-2 rounded-xl bg-gray-50 text-gray-500 hover:bg-amber-50 hover:text-amber-600 text-xs font-black flex items-center justify-center gap-2 transition-all"
                    >
                        {isUpdating ? <Loader2 className="animate-spin" size={14} /> : (
                            <>
                                <RotateCcw size={14} /> REOPEN
                            </>
                        )}
                    </button>
                )}
                {(record.status === 'cancelled' || record.status === 'no_show') && !readOnly && (
                    <div className="flex items-center gap-2 w-full">
                        {record.status === 'cancelled' && (
                            <button
                                disabled={isUpdating}
                                onClick={() => handleStatusUpdate('booked')}
                                className="min-h-11 min-w-11 flex-1 py-2 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 text-xs font-black flex items-center justify-center gap-2 transition-all"
                                aria-label="Undo cancellation"
                            >
                                {isUpdating ? <Loader2 className="animate-spin" size={14} /> : (
                                    <>
                                        <RotateCcw size={14} /> UNDO CANCEL
                                    </>
                                )}
                            </button>
                        )}
                        <button
                            disabled={isUpdating}
                            onClick={() => handleStatusUpdate('done')}
                            className="min-h-11 min-w-11 flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs font-black flex items-center justify-center gap-2 transition-all"
                        >
                            {isUpdating ? <Loader2 className="animate-spin" size={14} /> : (
                                <>
                                    <CheckCircle size={14} /> MARK DONE
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function ShowerSlotDialog({ guestName, slots, onClose, onAssign }: {
    guestName: string; slots: { time: string; disabled: boolean }[];
    onClose: () => void; onAssign: (time: string) => Promise<void>;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    const saving = useRef(false);
    const [time, setTime] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        const previousFocus = document.activeElement as HTMLElement | null;
        if (typeof dialog.current?.showModal === 'function') dialog.current.showModal();
        else dialog.current?.setAttribute('open', '');
        return () => previousFocus?.focus();
    }, []);
    return createPortal(<dialog ref={dialog} role="dialog" aria-modal="true" aria-labelledby="assign-shower-title"
        onCancel={(event) => { event.preventDefault(); if (!saving.current) onClose(); }}
        className="fixed inset-x-4 top-[10dvh] bottom-auto m-auto w-auto max-w-md max-h-[70dvh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl backdrop:bg-black/50 z-[120]">
        <form className="space-y-4" onSubmit={async (event) => {
            event.preventDefault();
            if (saving.current || !time) return;
            if (slots.find((slot) => slot.time === time)?.disabled) { setError('This slot is no longer available. Choose another time.'); return; }
            saving.current = true;
            setBusy(true);
            setError('');
            try { await onAssign(time); }
            catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to assign slot'); }
            finally { saving.current = false; setBusy(false); }
        }}>
            <h2 id="assign-shower-title" className="text-xl font-bold">Assign shower slot</h2>
            <p className="text-base">{guestName}</p>
            <label className="block text-base">Shower time
                <select autoFocus required disabled={busy} value={time} onChange={(event) => setTime(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border px-3 text-base">
                    <option value="">Choose available time</option>
                    {slots.map((slot) => <option key={slot.time} value={slot.time} disabled={slot.disabled}>{formatSlotLabel(slot.time)}{slot.disabled ? ' — Unavailable' : ''}</option>)}
                </select>
            </label>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <div className="flex flex-wrap justify-end gap-3">
                <button type="button" disabled={busy} onClick={onClose} className="min-h-11 rounded-lg border px-4 text-base">Cancel</button>
                <button type="submit" disabled={busy || !time} className="min-h-11 rounded-lg bg-sky-600 px-4 text-base font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Assign slot'}</button>
            </div>
        </form>
    </dialog>, document.body);
}
