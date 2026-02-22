'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Utensils,
    Users,
    History,
    ChevronLeft,
    ChevronRight,
    Plus,
    Minus,
    Filter,
    User,
    Heart,
    Truck,
    Home,
    Package,
    Building2,
    HandHeart,
    Trash2,
    Check
} from 'lucide-react';
import { useMealsStore } from '@/stores/useMealsStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { todayPacificDateString, pacificDateStringFrom, formatTimeInPacific } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import { MealServiceTimer } from '@/components/checkin/MealServiceTimer';
import toast from 'react-hot-toast';
import { useShallow } from 'zustand/react/shallow';

// Meal category configurations
const MEAL_CATEGORIES = [
    { id: 'extra', label: 'Extra Meals', icon: Plus, color: 'orange', description: 'Surplus meals not tied to a guest' },
    { id: 'rv', label: 'RV Meals', icon: Truck, color: 'purple', description: 'RV deliveries' },
    { id: 'day_worker', label: 'Day Worker', icon: Building2, color: 'blue', description: 'Day worker center' },
    { id: 'shelter', label: 'Shelter', icon: Home, color: 'amber', description: 'Shelter meals' },
    { id: 'lunch_bag', label: 'Lunch Bags', icon: Package, color: 'emerald', description: 'To-go lunch bags' },
    { id: 'united_effort', label: 'United Effort', icon: HandHeart, color: 'rose', description: 'Partner organization' },
];

export function MealsSection() {
    const [selectedDate, setSelectedDate] = useState(todayPacificDateString());
    const [showAddPanel, setShowAddPanel] = useState(false);
    const [addingType, setAddingType] = useState<string | null>(null);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [individualGuestId, setIndividualGuestId] = useState('');
    const [individualMealCount, setIndividualMealCount] = useState(1);
    const [isPendingIndividual, setIsPendingIndividual] = useState(false);
    const [activityFilter, setActivityFilter] = useState<string>('all');
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);

    const {
        mealRecords,
        rvMealRecords,
        extraMealRecords,
        dayWorkerMealRecords,
        shelterMealRecords,
        unitedEffortMealRecords,
        lunchBagRecords,
        deleteMealRecord,
        deleteExtraMealRecord,
        addBulkMealRecord,
        deleteBulkMealRecord,
        updateBulkMealRecord,
        updateMealRecord,
        checkAndAddAutomaticMeals,
        addMealRecord,
    } = useMealsStore(useShallow((s) => ({
        mealRecords: s.mealRecords,
        rvMealRecords: s.rvMealRecords,
        extraMealRecords: s.extraMealRecords,
        dayWorkerMealRecords: s.dayWorkerMealRecords,
        shelterMealRecords: s.shelterMealRecords,
        unitedEffortMealRecords: s.unitedEffortMealRecords,
        lunchBagRecords: s.lunchBagRecords,
        deleteMealRecord: s.deleteMealRecord,
        deleteExtraMealRecord: s.deleteExtraMealRecord,
        addBulkMealRecord: s.addBulkMealRecord,
        deleteBulkMealRecord: s.deleteBulkMealRecord,
        updateBulkMealRecord: s.updateBulkMealRecord,
        updateMealRecord: s.updateMealRecord,
        checkAndAddAutomaticMeals: s.checkAndAddAutomaticMeals,
        addMealRecord: s.addMealRecord,
    })));

    const guests = useGuestsStore((s) => s.guests);

    useEffect(() => {
        checkAndAddAutomaticMeals();
    }, [checkAndAddAutomaticMeals]);

    const guestMap = useMemo(() => {
        const map = new Map<string, (typeof guests)[number]>();
        for (const g of guests) {
            if (g?.id) map.set(g.id, g);
        }
        return map;
    }, [guests]);

    const isToday = selectedDate === todayPacificDateString();

    // Editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<number>(0);

    const dayMetrics = useMemo(() => {
        const filterByDate = (records: any[]) =>
            records.filter((r) => (r?.dateKey || pacificDateStringFrom(r.date)) === selectedDate);
        // ... same existing logic ...
        const guestMeals = filterByDate(mealRecords);
        const rvMeals = filterByDate(rvMealRecords);
        const extraMeals = filterByDate(extraMealRecords);
        const dayWorkerMeals = filterByDate(dayWorkerMealRecords);
        const shelterMeals = filterByDate(shelterMealRecords);
        const ueMeals = filterByDate(unitedEffortMealRecords);
        const lunchBags = filterByDate(lunchBagRecords);

        const sumCount = (arr: any[]) => arr.reduce((sum, r) => sum + (r.count || 0), 0);

        const proxyPickupCount = guestMeals.reduce((sum, r) => {
            if (r?.pickedUpByGuestId && r.pickedUpByGuestId !== r.guestId) {
                return sum + (r.count || 0);
            }
            return sum;
        }, 0);

        return {
            total: sumCount([...guestMeals, ...rvMeals, ...extraMeals, ...dayWorkerMeals, ...shelterMeals, ...ueMeals]),
            guestCount: sumCount(guestMeals),
            rvCount: sumCount(rvMeals),
            dayWorkerCount: sumCount(dayWorkerMeals),
            shelterCount: sumCount(shelterMeals),
            ueCount: sumCount(ueMeals),
            lunchBagCount: sumCount(lunchBags),
            extraCount: sumCount(extraMeals),
            proxyPickups: proxyPickupCount,
            uniqueGuests: new Set(guestMeals.map(r => r.guestId)).size
        };
    }, [selectedDate, mealRecords, rvMealRecords, extraMealRecords, dayWorkerMealRecords, shelterMealRecords, unitedEffortMealRecords, lunchBagRecords]);

    const history = useMemo(() => {
        const allRecords = [
            ...mealRecords.map(r => ({
                ...r,
                type: 'guest',
                isProxyPickup: Boolean(r?.pickedUpByGuestId && r.pickedUpByGuestId !== r.guestId),
            })),
            ...rvMealRecords.map(r => ({ ...r, type: 'rv', isProxyPickup: false })),
            ...extraMealRecords.map(r => ({ ...r, type: 'extra', isProxyPickup: false })),
            ...dayWorkerMealRecords.map(r => ({ ...r, type: 'day_worker', isProxyPickup: false })),
            ...shelterMealRecords.map(r => ({ ...r, type: 'shelter', isProxyPickup: false })),
            ...unitedEffortMealRecords.map(r => ({ ...r, type: 'united_effort', isProxyPickup: false })),
            ...lunchBagRecords.map(r => ({ ...r, type: 'lunch_bag', isProxyPickup: false })),
        ];
        return allRecords
            .filter((r) => (r?.dateKey || pacificDateStringFrom(r.date)) === selectedDate)
            .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
    }, [selectedDate, mealRecords, rvMealRecords, extraMealRecords, dayWorkerMealRecords, shelterMealRecords, unitedEffortMealRecords, lunchBagRecords]);

    const filteredHistory = useMemo(() => {
        if (activityFilter === 'all') return history;
        return history.filter((r) => r.type === activityFilter);
    }, [history, activityFilter]);

    const handleBatchDeleteLunchBags = async () => {
        const lunchBagItems = history.filter((r) => r.type === 'lunch_bag');
        if (lunchBagItems.length === 0) {
            toast.error('No lunch bag records to delete');
            return;
        }
        if (!confirm(`Delete all ${lunchBagItems.length} lunch bag record${lunchBagItems.length > 1 ? 's' : ''} for this date?`)) return;

        setIsBatchDeleting(true);
        try {
            await Promise.all(lunchBagItems.map((r) => deleteBulkMealRecord(r.id, 'lunch_bag')));
            toast.success(`Deleted ${lunchBagItems.length} lunch bag record${lunchBagItems.length > 1 ? 's' : ''}`);
        } catch (error) {
            console.error('Failed to batch delete lunch bags:', error);
            toast.error('Failed to delete some lunch bag records');
        } finally {
            setIsBatchDeleting(false);
        }
    };

    const handleEdit = (record: any) => {
        setEditingId(record.id);
        setEditValue(record.count || 0);
    };

    const handleSaveEdit = async (record: any) => {
        if (!editingId) return;

        try {
            const type = record.type;
            if (['rv', 'day_worker', 'shelter', 'lunch_bag', 'united_effort', 'extra'].includes(type)) {
                await updateBulkMealRecord(editingId, type, { count: editValue });
            } else {
                await updateMealRecord(editingId, { count: editValue });
            }
            toast.success('Record updated');
            setEditingId(null);
        } catch (error) {
            console.error('Failed to update record:', error);
            toast.error('Failed to update record');
        }
    };

    // ... handleDelete, handleAddBulkMeal, shiftDate, getDisplayName ...
    const handleDelete = async (record: any) => {
        if (!confirm('Are you sure you want to delete this meal record?')) return;

        try {
            const type = record.type;
            if (type === 'rv' || type === 'day_worker' || type === 'shelter' || type === 'lunch_bag' || type === 'united_effort') {
                await deleteBulkMealRecord(record.id, type);
            } else if (type === 'extra') {
                await deleteExtraMealRecord(record.id);
            } else {
                await deleteMealRecord(record.id);
            }
            toast.success('Meal record deleted');
        } catch (error) {
            console.error('Failed to delete record:', error);
            toast.error('Failed to delete record');
        }
    };

    const handleAddBulkMeal = async (mealType: string) => {
        const quantity = quantities[mealType] || 0;
        if (quantity <= 0) {
            toast.error('Please enter a quantity greater than 0');
            return;
        }

        setAddingType(mealType);
        try {
            const category = MEAL_CATEGORIES.find(c => c.id === mealType);
            await addBulkMealRecord(mealType, quantity, category?.label, undefined, selectedDate);
            toast.success(`Added ${quantity} ${category?.label || mealType}${!isToday ? ` for ${selectedDate}` : ''}`);
            setQuantities(prev => ({ ...prev, [mealType]: 0 }));
        } catch (error) {
            console.error('Failed to add meal record:', error);
            toast.error('Failed to add meal record');
        } finally {
            setAddingType(null);
        }
    };

    const handleAddIndividualMeal = async () => {
        if (!individualGuestId) {
            toast.error('Please select a guest');
            return;
        }

        if (individualMealCount <= 0) {
            toast.error('Meal count must be at least 1');
            return;
        }

        setIsPendingIndividual(true);
        try {
            await addMealRecord(individualGuestId, individualMealCount, null, selectedDate);
            toast.success(`Added meal record${!isToday ? ` for ${selectedDate}` : ''}`);
            setIndividualGuestId('');
            setIndividualMealCount(1);
        } catch (error) {
            console.error('Failed to add individual meal:', error);
            toast.error('Failed to add individual meal');
        } finally {
            setIsPendingIndividual(false);
        }
    };

    const shiftDate = (days: number) => {
        const d = new Date(selectedDate + 'T12:00:00');
        d.setDate(d.getDate() + days);
        setSelectedDate(pacificDateStringFrom(d));
    };

    const getDisplayName = (record: any) => {
        const type = record.type;
        if (type === 'rv') return 'RV Meal Distribution';
        if (type === 'day_worker') return 'Day Worker Center';
        if (type === 'shelter') return 'Shelter Meals';
        if (type === 'lunch_bag') return 'Lunch Bags';
        if (type === 'united_effort') return 'United Effort';
        if (type === 'extra') {
            const guest = guestMap.get(record.guestId);
            return `${guest ? (guest.preferredName || guest.firstName) : 'Guest'} (Extra)`;
        }
        const guest = guestMap.get(record.guestId);
        return guest ? (guest.preferredName || guest.firstName + ' ' + (guest.lastName || '')) : 'Unknown Guest';
    };

    const getPickedUpByName = (record: any) => {
        const pickupId = record?.pickedUpByGuestId;
        if (!pickupId) return null;
        const pickupGuest = guestMap.get(pickupId);
        if (!pickupGuest) return 'Buddy';
        const preferred = pickupGuest.preferredName || pickupGuest.firstName;
        if (preferred) return preferred;
        return pickupGuest.name || 'Buddy';
    };

    // ... getRecordIcon, getRecordColor ...

    const getRecordIcon = (type: string) => {
        const category = MEAL_CATEGORIES.find(c => c.id === type);
        if (category) return category.icon;
        return User;
    };

    const getRecordColor = (type: string) => {
        const colorMap: Record<string, string> = {
            rv: 'bg-purple-100 text-purple-600',
            day_worker: 'bg-blue-100 text-blue-600',
            shelter: 'bg-amber-100 text-amber-600',
            lunch_bag: 'bg-emerald-100 text-emerald-600',
            united_effort: 'bg-rose-100 text-rose-600',
            extra: 'bg-orange-100 text-orange-600',
            guest: 'bg-gray-100 text-gray-400 group-hover:bg-emerald-100 group-hover:text-emerald-600',
        };
        return colorMap[type] || colorMap.guest;
    };


    return (
        <div className="space-y-8">
            {/* ... Date Navigation ... */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                        <Utensils size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Daily Meal Logs</h2>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Service Distribution Tracker</p>
                    </div>
                </div>

                {/* Meal Service Timer - subtle indicator for volunteers */}
                <MealServiceTimer />

                <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                    <button
                        onClick={() => shiftDate(-1)}
                        className="p-2 hover:bg-white rounded-xl transition-all text-gray-400 hover:text-emerald-600 shadow-sm"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="text-center px-4">
                        <p className="text-sm font-black text-gray-900">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-0.5">
                            {isToday ? 'Active Service Day' : 'Archived Records'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isToday && (
                    <button
                        onClick={() => setSelectedDate(todayPacificDateString())}
                        className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                    >
                        Today
                    </button>
                )}
                <button
                    onClick={() => shiftDate(1)}
                    className="p-2 hover:bg-white rounded-xl transition-all text-gray-400 hover:text-emerald-600 shadow-sm"
                >
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>

        <button
            onClick={() => setShowAddPanel(!showAddPanel)}
            className={cn(
                "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center gap-2",
                showAddPanel
                    ? "bg-gray-200 text-gray-600 shadow-gray-100"
                    : "bg-gray-900 text-white shadow-gray-200 hover:scale-105 active:scale-95"
            )}
        >
            {showAddPanel ? 'Close' : <><Plus size={14} /> Add Bulk Meals</>}
        </button>
    </div>

            {/* Quick Add Panel */}
            <AnimatePresence>
                {/* ... Panel Content ... */}
                {showAddPanel && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Plus size={16} /> Quick Add Bulk Meals
                            </h3>
                            <p className="text-[11px] text-gray-500 mb-4" title="All entries in this panel save to the date selected above.">
                                Entries save to selected date: {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>

                            <div className="mb-5 p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40">
                                <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700 mb-3">Individual Meal Entry</p>
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_160px] gap-3">
                                    <select
                                        value={individualGuestId}
                                        onChange={(e) => setIndividualGuestId(e.target.value)}
                                        className="w-full p-2.5 rounded-xl border border-emerald-200 bg-white text-sm font-medium"
                                    >
                                        <option value="">Select guest</option>
                                        {guests
                                            .filter((guest) => guest?.id)
                                            .sort((firstGuest, secondGuest) => {
                                                const firstName = (firstGuest.preferredName || firstGuest.name || `${firstGuest.firstName || ''} ${firstGuest.lastName || ''}`).toString();
                                                const secondName = (secondGuest.preferredName || secondGuest.name || `${secondGuest.firstName || ''} ${secondGuest.lastName || ''}`).toString();
                                                return firstName.localeCompare(secondName);
                                            })
                                            .map((guest) => {
                                                const displayName = guest.preferredName || guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest';
                                                return (
                                                    <option key={guest.id} value={guest.id}>
                                                        {displayName}
                                                    </option>
                                                );
                                            })}
                                    </select>
                                    <input
                                        type="number"
                                        min={1}
                                        value={individualMealCount}
                                        onChange={(e) => setIndividualMealCount(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-full p-2.5 rounded-xl border border-emerald-200 bg-white text-sm font-bold text-center"
                                        aria-label="Individual meal quantity"
                                    />
                                    <button
                                        onClick={handleAddIndividualMeal}
                                        disabled={!individualGuestId || isPendingIndividual}
                                        className={cn(
                                            "w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                                            !individualGuestId || isPendingIndividual
                                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                                        )}
                                    >
                                        {isPendingIndividual ? 'Adding...' : `Add${!isToday ? ` for ${selectedDate}` : ''}`}
                                    </button>
                                </div>
                            </div>

                            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3">Bulk Meal Entry</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                                {MEAL_CATEGORIES.map((category) => {
                                    const Icon = category.icon;
                                    const qty = quantities[category.id] || 0;
                                    const isAdding = addingType === category.id;

                                    return (
                                        <div
                                            key={category.id}
                                            className={cn(
                                                "rounded-2xl border-2 p-4 transition-all",
                                                category.color === 'orange' && "border-orange-200 bg-orange-50",
                                                category.color === 'purple' && "border-purple-200 bg-purple-50",
                                                category.color === 'blue' && "border-blue-200 bg-blue-50",
                                                category.color === 'amber' && "border-amber-200 bg-amber-50",
                                                category.color === 'emerald' && "border-emerald-200 bg-emerald-50",
                                                category.color === 'rose' && "border-rose-200 bg-rose-50",
                                            )}
                                        >
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className={cn(
                                                    "p-2.5 rounded-xl shrink-0",
                                                    category.color === 'orange' && "bg-orange-100 text-orange-600",
                                                    category.color === 'purple' && "bg-purple-100 text-purple-600",
                                                    category.color === 'blue' && "bg-blue-100 text-blue-600",
                                                    category.color === 'amber' && "bg-amber-100 text-amber-600",
                                                    category.color === 'emerald' && "bg-emerald-100 text-emerald-600",
                                                    category.color === 'rose' && "bg-rose-100 text-rose-600",
                                                )}>
                                                    <Icon size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-gray-900 text-sm truncate">{category.label}</p>
                                                    <p className="text-[10px] text-gray-500 truncate">{category.description}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between gap-2 bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
                                                <button
                                                    onClick={() => setQuantities(prev => ({ ...prev, [category.id]: Math.max(0, qty - 10) }))}
                                                    className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition-colors shrink-0"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <input
                                                    type="number"
                                                    value={qty || ''}
                                                    onChange={(e) => setQuantities(prev => ({ ...prev, [category.id]: parseInt(e.target.value) || 0 }))}
                                                    className="w-full text-center font-black text-lg text-gray-900 focus:outline-none placeholder-gray-200"
                                                    placeholder="0"
                                                    min={0}
                                                />
                                                <button
                                                    onClick={() => setQuantities(prev => ({ ...prev, [category.id]: qty + 10 }))}
                                                    className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition-colors shrink-0"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => handleAddBulkMeal(category.id)}
                                                disabled={qty <= 0 || isAdding}
                                                className={cn(
                                                    "w-full mt-3 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all",
                                                    qty > 0
                                                        ? "bg-gray-900 text-white hover:bg-gray-800 active:scale-95 shadow-md shadow-gray-200"
                                                        : "bg-white/50 text-gray-400 cursor-not-allowed border border-gray-100"
                                                )}
                                            >
                                                {isAdding ? 'Adding...' : 'Add'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Service Summary */}
            <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label="Total Meals" value={dayMetrics.total} color="emerald" />
                    <StatCard label="Guest Meals" value={dayMetrics.guestCount} color="blue" />
                    <StatCard label="Proxy Pickups" value={dayMetrics.proxyPickups} color="indigo" />
                    <StatCard label="Lunch Bags" value={dayMetrics.lunchBagCount} color="amber" />
                </div>

                <div className="border-t border-gray-100 pt-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Distribution Details</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        <CompactStat label="Extra" value={dayMetrics.extraCount} color="amber" />
                        <CompactStat label="RV" value={dayMetrics.rvCount} color="purple" />
                        <CompactStat label="Day Worker" value={dayMetrics.dayWorkerCount} color="sky" />
                        <CompactStat label="Shelter" value={dayMetrics.shelterCount} color="rose" />
                        <CompactStat label="United Effort" value={dayMetrics.ueCount} color="rose" />
                    </div>
                </div>
            </div>

            {/* History List */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between flex-wrap gap-3">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <History size={16} /> Activity Log ({filteredHistory.length}{activityFilter !== 'all' ? ` of ${history.length}` : ''})
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-100 px-2 py-1">
                            <Filter size={12} className="text-gray-400" />
                            <select
                                value={activityFilter}
                                onChange={(e) => setActivityFilter(e.target.value)}
                                className="text-xs font-bold text-gray-700 bg-transparent border-none outline-none cursor-pointer pr-1"
                                aria-label="Filter activity log"
                            >
                                <option value="all">All Types</option>
                                <option value="guest">Guest Meals</option>
                                <option value="extra">Extra Meals</option>
                                <option value="rv">RV Meals</option>
                                <option value="day_worker">Day Worker</option>
                                <option value="shelter">Shelter</option>
                                <option value="lunch_bag">Lunch Bags</option>
                                <option value="united_effort">United Effort</option>
                            </select>
                        </div>
                        {activityFilter === 'lunch_bag' && filteredHistory.length > 0 && (
                            <button
                                onClick={handleBatchDeleteLunchBags}
                                disabled={isBatchDeleting}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                    isBatchDeleting
                                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                        : "bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200"
                                )}
                            >
                                <Trash2 size={12} />
                                {isBatchDeleting ? 'Deleting...' : `Delete All (${filteredHistory.length})`}
                            </button>
                        )}
                    </div>
                </div>

                <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                    <AnimatePresence mode="popLayout">
                        {filteredHistory.map((record) => {
                            const Icon = getRecordIcon(record.type);
                            const isEditing = editingId === record.id;

                            return (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={record.id}
                                    className="p-6 flex items-center justify-between hover:bg-gray-50 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                                            getRecordColor(record.type)
                                        )}>
                                            <Icon size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-gray-900">{getDisplayName(record)}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                                                            className="w-16 px-2 py-1 text-xs font-bold border border-gray-300 rounded focus:border-emerald-500 outline-none"
                                                            autoFocus
                                                        />
                                                        <button onClick={() => handleSaveEdit(record)} className="text-emerald-600 hover:text-emerald-700 font-bold text-xs uppercase">Save</button>
                                                        <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 font-bold text-xs uppercase">Cancel</button>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest cursor-pointer hover:text-gray-600" onClick={() => handleEdit(record)}>
                                                        {record.count} Meal{record.count > 1 ? 's' : ''} · {formatTimeInPacific(record.createdAt || record.date, { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                )}
                                            </div>

                                            {record?.isProxyPickup && (
                                                <p className="text-xs text-emerald-700 font-bold mt-1 flex items-center gap-1">
                                                    <span aria-hidden>🤝</span>
                                                    <span>Picked up by {getPickedUpByName(record)}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                            record.type === 'rv' && "bg-purple-100 text-purple-700",
                                            record.type === 'day_worker' && "bg-blue-100 text-blue-700",
                                            record.type === 'shelter' && "bg-amber-100 text-amber-700",
                                            record.type === 'lunch_bag' && "bg-emerald-100 text-emerald-700",
                                            record.type === 'united_effort' && "bg-rose-100 text-rose-700",
                                            record.type === 'extra' && "bg-orange-100 text-orange-700",
                                            record.type === 'guest' && !record?.isProxyPickup && "bg-gray-100 text-gray-700",
                                            record.type === 'guest' && record?.isProxyPickup && "bg-emerald-100 text-emerald-700",
                                        )}>
                                            {record.type === 'guest' && record?.isProxyPickup
                                                ? '🤝 Proxy Pickup'
                                                : record.type === 'day_worker'
                                                    ? 'Day Worker'
                                                    : record.type === 'lunch_bag'
                                                        ? 'Lunch Bag'
                                                        : record.type === 'united_effort'
                                                            ? 'United Effort'
                                                            : record.type === 'extra'
                                                                ? 'Extra'
                                                                : record.type === 'guest'
                                                                    ? 'Guest'
                                                                    : record.type}
                                        </span>
                                        {!isEditing && (
                                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                {/* Edit Button */}
                                                <button
                                                    onClick={() => handleEdit(record)}
                                                    className="p-2 text-gray-300 hover:text-blue-500 transition-all"
                                                    title="Edit Record"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(record)}
                                                    className="p-2 text-gray-300 hover:text-rose-500 transition-all"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {filteredHistory.length === 0 && (
                        <div className="py-20 text-center opacity-40">
                            <Utensils size={48} className="mx-auto mb-4" />
                            <p className="font-black text-sm uppercase tracking-widest">
                                {activityFilter !== 'all' ? `No ${activityFilter.replace('_', ' ')} records for this date` : 'No meals logged for this date'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string, value: number, color: 'emerald' | 'blue' | 'indigo' | 'purple' | 'sky' | 'amber' | 'rose' }) {
    const textColors: Record<string, string> = {
        emerald: 'text-emerald-600',
        blue: 'text-blue-600',
        indigo: 'text-indigo-600',
        purple: 'text-purple-600',
        sky: 'text-sky-600',
        amber: 'text-amber-600',
        rose: 'text-rose-600',
    };

    return (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={cn("text-2xl font-black tracking-tight", textColors[color])}>{value.toLocaleString()}</p>
        </div>
    );
}

function CompactStat({ label, value, color }: { label: string, value: number, color: 'emerald' | 'blue' | 'indigo' | 'purple' | 'sky' | 'amber' | 'rose' }) {
    const textColors: Record<string, string> = {
        emerald: 'text-emerald-600',
        blue: 'text-blue-600',
        indigo: 'text-indigo-600',
        purple: 'text-purple-600',
        sky: 'text-sky-600',
        amber: 'text-amber-600',
        rose: 'text-rose-600',
    };

    return (
        <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
            <span className={cn('text-sm font-black', textColors[color])}>{value.toLocaleString()}</span>
        </div>
    );
}
