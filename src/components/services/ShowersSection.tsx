'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShowerHead, Clock, CheckCircle, XCircle, ChevronRight, User, AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';
import { formatSlotLabel } from '@/lib/utils/serviceSlots';
import { generateShowerSlots } from '@/lib/utils/serviceSlots';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';
import { CompactWaiverIndicator } from '@/components/ui/CompactWaiverIndicator';
import CompactShowerList from './CompactShowerList';
import { ShowerDetailModal } from './ShowerDetailModal';
import { SlotBlockModal } from '../admin/SlotBlockModal';
import { EndServiceDayPanel } from './EndServiceDayPanel';
import { ServiceDatePicker } from './ServiceDatePicker';
import { LayoutGrid, List, Settings } from 'lucide-react';
import { useSession } from 'next-auth/react';

export function ShowersSection() {
    const showerRecords = useServicesStore((s) => s.showerRecords);
    const cancelMultipleShowers = useServicesStore((s) => s.cancelMultipleShowers);
    const addShowerRecord = useServicesStore((s) => s.addShowerRecord);
    const addShowerWaitlist = useServicesStore((s) => s.addShowerWaitlist);
    const guests = useGuestsStore((s) => s.guests);
    const { data: session } = useSession();

    const today = todayPacificDateString();
    const [selectedDate, setSelectedDate] = useState(today);
    const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'waitlist' | 'cancelled'>('active');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedShower, setSelectedShower] = useState<any>(null);
    const [showSlotManager, setShowSlotManager] = useState(false);
    const [backfillGuestId, setBackfillGuestId] = useState('');
    const [backfillSlotTime, setBackfillSlotTime] = useState('');
    const [isAddingBackfill, setIsAddingBackfill] = useState(false);

    // Check if user is admin/staff
    const userRole = (session?.user as any)?.role || '';
    const isAdmin = ['admin', 'board', 'staff'].includes(userRole);

    // Check if viewing historical data
    const isViewingPast = selectedDate !== today;

    const getRecordDateKey = useCallback(
        (record: any) => record?.dateKey || pacificDateStringFrom(record?.date),
        []
    );

    const selectedDateRecords = useMemo(() => {
        return showerRecords.filter((r) => getRecordDateKey(r) === selectedDate);
    }, [showerRecords, selectedDate, getRecordDateKey]);

    const activeShowers = useMemo(
        () => selectedDateRecords.filter((r) => r.status === 'booked' || r.status === 'awaiting'),
        [selectedDateRecords]
    );
    const completedShowers = useMemo(
        () => selectedDateRecords.filter((r) => r.status === 'done'),
        [selectedDateRecords]
    );
    const waitlistedShowers = useMemo(
        () => selectedDateRecords.filter((r) => r.status === 'waitlisted'),
        [selectedDateRecords]
    );
    const cancelledShowers = useMemo(
        () => selectedDateRecords.filter((r) => r.status === 'cancelled' || r.status === 'no_show'),
        [selectedDateRecords]
    );

    const pendingShowers = useMemo(() => {
        // For today only - pending showers for end-of-day cancellation
        const todaysRecords = showerRecords.filter((r) => getRecordDateKey(r) === today);
        return todaysRecords.filter((r) => r.status !== 'done' && r.status !== 'cancelled');
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
                return activeShowers;
            case 'completed':
                return completedShowers;
            case 'waitlist':
                return waitlistedShowers;
            case 'cancelled':
                return cancelledShowers;
        }
    }, [activeTab, activeShowers, completedShowers, waitlistedShowers, cancelledShowers]);

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
        const record = showerRecords.find(r => r.id === recordId);
        const guest = guests.find(g => g.id === guestId);
        if (record && guest) {
            setSelectedShower({ record, guest });
        }
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
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-[11px] text-gray-500 mb-3" title="Entries added here save to the date currently selected above.">
                        Entries save to selected date: {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                        <div className="flex-1">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Add Individual Shower Record</p>
                            <select
                                value={backfillGuestId}
                                onChange={(event) => setBackfillGuestId(event.target.value)}
                                className="w-full p-2.5 rounded-lg border border-gray-200 bg-white text-sm"
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
                                className="w-full p-2.5 rounded-lg border border-gray-200 bg-white text-sm"
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

            <div className="flex items-center justify-between flex-wrap gap-4">
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
                                    'px-6 py-2.5 rounded-xl text-sm font-black transition-all capitalize',
                                    activeTab === tab
                                        ? 'bg-white text-sky-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                )}
                            >
                                {tab}
                                <span className="ml-2 text-[10px] opacity-60">
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
                                    'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-black transition-all capitalize border',
                                    activeTab === tab
                                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                                        : 'bg-white text-gray-500 border-gray-200'
                                )}
                            >
                                {tab}
                                <span className="ml-1.5 text-[10px] opacity-75">
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
                        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                        Manage Slots
                    </button>

                    {/* View Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'grid' ? "bg-white shadow text-sky-600" : "text-gray-500 hover:text-gray-700"
                            )}
                            title="Grid View"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'list' ? "bg-white shadow text-sky-600" : "text-gray-500 hover:text-gray-700"
                            )}
                            title="List View"
                        >
                            <List size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {viewMode === 'list' ? (
                <CompactShowerList
                    records={currentList}
                    onGuestClick={handleGuestClick}
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
                                    guest={guests.find(g => g.id === record.guestId)}
                                    onClick={() => handleGuestClick(record.guestId, record.id)}
                                    readOnly={isViewingPast}
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
            {selectedShower && (
                <ShowerDetailModal
                    isOpen={!!selectedShower}
                    onClose={() => setSelectedShower(null)}
                    record={selectedShower.record}
                    guest={selectedShower.guest}
                />
            )}

            {/* Slot Manager Modal */}
            <SlotBlockModal
                isOpen={showSlotManager}
                onClose={() => setShowSlotManager(false)}
                serviceType="shower"
            />
        </div>
    );
}

function ShowerListItem({ record, guest, onClick, readOnly = false }: { record: any, guest: any, onClick?: () => void, readOnly?: boolean }) {
    const [isUpdating, setIsUpdating] = useState(false);
    const deleteShowerRecord = useServicesStore((s) => s.deleteShowerRecord);
    const updateShowerStatus = useServicesStore((s) => s.updateShowerStatus);

    const handleCancel = async () => {
        if (readOnly) return;
        if (!window.confirm('Are you sure you want to cancel this shower?')) return;
        setIsUpdating(true);
        try {
            await deleteShowerRecord(record.id);
            toast.success('Shower cancelled');
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
            await updateShowerStatus(record.id, newStatus);
            toast.success(newStatus === 'done' ? 'Shower completed' : 'Status updated');
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
                        (record.status === 'cancelled' || record.status === 'no_show') ? 'bg-gray-400' : 'bg-sky-500'
                    )}>
                        <User size={20} />
                    </div>
                    <div>
                        <h4 className={cn(
                            "font-black tracking-tight",
                            (record.status === 'cancelled' || record.status === 'no_show') ? 'text-gray-400' : 'text-gray-900'
                        )}>
                            {guest ? (guest.preferredName || guest.name) : 'Unknown Guest'}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            <Clock size={12} />
                            {record.time ? formatSlotLabel(record.time) : (record.status === 'waitlisted' ? 'Waitlisted' : 'No time')}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Waiver indicator for non-completed showers */}
                    {record.status !== 'done' && record.status !== 'cancelled' && record.status !== 'no_show' && (
                        <CompactWaiverIndicator guestId={record.guestId} serviceType="shower" />
                    )}
                    <div className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        record.status === 'done' ? 'bg-emerald-50 text-emerald-600' : 
                        (record.status === 'cancelled' || record.status === 'no_show') ? 'bg-red-50 text-red-500' : 'bg-sky-50 text-sky-600'
                    )}>
                        {record.status.replace('_', ' ')}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 mt-auto">
                {record.status !== 'done' && record.status !== 'cancelled' && record.status !== 'no_show' && !readOnly && (
                    <>
                        <button
                            disabled={isUpdating}
                            onClick={() => handleStatusUpdate('done')}
                            className="flex-1 py-2 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-2 bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-200"
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
                            className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                            <XCircle size={18} />
                        </button>
                    </>
                )}
                {record.status === 'done' && !readOnly && (
                    <button
                        disabled={isUpdating}
                        onClick={() => handleStatusUpdate('booked')}
                        className="w-full py-2 rounded-xl bg-gray-50 text-gray-500 hover:bg-amber-50 hover:text-amber-600 text-xs font-black flex items-center justify-center gap-2 transition-all"
                    >
                        {isUpdating ? <Loader2 className="animate-spin" size={14} /> : (
                            <>
                                <RotateCcw size={14} /> REOPEN
                            </>
                        )}
                    </button>
                )}
                {(record.status === 'cancelled' || record.status === 'no_show') && !readOnly && (
                    <button
                        disabled={isUpdating}
                        onClick={() => handleStatusUpdate('booked')}
                        className="w-full py-2 rounded-xl bg-gray-50 text-gray-500 hover:bg-sky-50 hover:text-sky-600 text-xs font-black flex items-center justify-center gap-2 transition-all"
                    >
                        {isUpdating ? <Loader2 className="animate-spin" size={14} /> : (
                            <>
                                <RotateCcw size={14} /> REBOOK
                            </>
                        )}
                    </button>
                )}
            </div>
        </motion.div>
    );
}
