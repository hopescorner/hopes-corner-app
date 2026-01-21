'use client';

import React, { useState, useMemo } from 'react';
import {
    Save,
    Trash2,
    Pencil,
    ChevronLeft,
    ChevronRight,
    Store,
    Utensils,
    Copy,
    ChevronDown,
    ChevronUp,
    Clock,
    Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDonationsStore, DonationRecord } from '@/stores/useDonationsStore';
import { DonationTypeEnum, LaPlazaCategoryEnum } from '@/types/database';
import {
    calculateServings,
    deriveDonationDateKey,
    formatProteinAndCarbsClipboardText,
    DENSITY_SERVINGS
} from '@/lib/utils/donationUtils';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';

// Helper to safely format a date string (YYYY-MM-DD) for display
const formatDisplayDate = (dateString: string) => {
    // Parse as local date by appending time to avoid UTC issues
    const date = new Date(dateString + 'T12:00:00');
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

// Helper to safely format record time
const formatRecordTime = (record: DonationRecord) => {
    const timestamp = record.createdAt || record.donatedAt;
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const DONATION_TYPES: DonationTypeEnum[] = [
    'Protein', 'Carbs', 'Vegetables', 'Fruit',
    'Veggie Protein', 'Deli Foods', 'Pastries', 'School Lunch'
];

const LA_PLAZA_CATEGORIES: LaPlazaCategoryEnum[] = [
    'Bakery', 'Beverages', 'Dairy', 'Meat',
    'Mix', 'Nonfood', 'Prepared/Perishable', 'Produce'
];

type ViewMode = 'general' | 'laplaza';

// Interface for grouped donation items
export interface GroupedDonation {
    key: string; // "type|itemName" for grouping
    type: string;
    itemName: string;
    entries: DonationRecord[];
    totalTrays: number;
    totalWeight: number;
    totalServings: number;
}

// Group donations by type and item name
export const groupDonationsByItem = (records: DonationRecord[]): GroupedDonation[] => {
    const groups = new Map<string, GroupedDonation>();

    for (const record of records) {
        const itemName = (record.itemName || '').trim().toLowerCase();
        const type = record.type || '';
        const key = `${type}|${itemName}`;

        if (!groups.has(key)) {
            groups.set(key, {
                key,
                type,
                itemName: record.itemName || '',
                entries: [],
                totalTrays: 0,
                totalWeight: 0,
                totalServings: 0
            });
        }

        const group = groups.get(key)!;
        group.entries.push(record);
        group.totalTrays += Number(record.trays) || 0;
        group.totalWeight += Number(record.weightLbs) || 0;
        group.totalServings += Number(record.servings) || 0;
    }

    // Sort groups by type then by item name
    return Array.from(groups.values()).sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.itemName.localeCompare(b.itemName);
    });
};

// Get unique recent item names for quick selection
export const getRecentItemNames = (records: DonationRecord[], limit = 5): string[] => {
    const seen = new Set<string>();
    const recent: string[] = [];

    // Sort by most recent first
    const sorted = [...records].sort((a, b) => {
        const aTime = new Date(a.donatedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.donatedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
    });

    for (const record of sorted) {
        const name = (record.itemName || '').trim();
        if (name && !seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase());
            recent.push(name);
            if (recent.length >= limit) break;
        }
    }

    return recent;
};

// Grouped Donation Card Component
const GroupedDonationCard = ({
    group,
    onEdit,
    onDelete,
    viewMode
}: {
    group: GroupedDonation;
    onEdit: (record: DonationRecord) => void;
    onDelete: (id: string) => void;
    viewMode: ViewMode;
}) => {
    const [isExpanded, setIsExpanded] = useState(group.entries.length === 1);
    const hasMultipleEntries = group.entries.length > 1;

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Group Header - always visible */}
            <div
                className={cn(
                    "p-4 flex justify-between items-start",
                    hasMultipleEntries && "cursor-pointer hover:bg-gray-50 transition-colors"
                )}
                onClick={() => hasMultipleEntries && setIsExpanded(!isExpanded)}
            >
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                            viewMode === 'general' ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
                        )}>
                            {group.type}
                        </span>
                        {hasMultipleEntries && (
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold">
                                {group.entries.length} entries
                            </span>
                        )}
                    </div>
                    <h4 className="font-bold text-gray-900 mt-1 text-lg">{group.itemName}</h4>
                    <div className="text-sm text-gray-600 mt-1 flex gap-4 flex-wrap">
                        <span className="font-semibold">{group.totalWeight.toFixed(1)} lbs total</span>
                        {group.totalTrays > 0 && (
                            <span className="font-semibold">{group.totalTrays} trays total</span>
                        )}
                        {group.totalServings > 0 && (
                            <span className="text-emerald-600 font-semibold">~{group.totalServings} servings</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {hasMultipleEntries && (
                        <button
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
                            aria-label={isExpanded ? 'Collapse entries' : 'Expand entries'}
                        >
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                    )}
                    {!hasMultipleEntries && (
                        <div className="flex gap-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(group.entries[0]); }}
                                className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                aria-label="Edit entry"
                            >
                                <Pencil size={16} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(group.entries[0].id); }}
                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                aria-label="Delete entry"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Expanded Individual Entries */}
            {isExpanded && hasMultipleEntries && (
                <div className="border-t border-gray-100 bg-gray-50/50">
                    {group.entries.map((entry, idx) => (
                        <div
                            key={entry.id}
                            className={cn(
                                "px-4 py-3 flex justify-between items-center group hover:bg-white transition-colors",
                                idx !== group.entries.length - 1 && "border-b border-gray-100"
                            )}
                        >
                            <div className="flex items-center gap-4 flex-wrap">
                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <Clock size={12} />
                                    {formatRecordTime(entry)}
                                </div>
                                <div className="text-sm text-gray-700">
                                    <span className="font-medium">{Number(entry.weightLbs || 0).toFixed(1)} lbs</span>
                                    {Number(entry.trays) > 0 && (
                                        <span className="ml-3">{entry.trays} {entry.trays === 1 ? 'tray' : 'trays'}</span>
                                    )}
                                </div>
                                {entry.donor && (
                                    <span className="text-xs text-gray-400">• {entry.donor}</span>
                                )}
                                {entry.temperature && (
                                    <span className="text-xs text-gray-400">• {entry.temperature}</span>
                                )}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => onEdit(entry)}
                                    className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                    aria-label="Edit entry"
                                >
                                    <Pencil size={14} />
                                </button>
                                <button
                                    onClick={() => onDelete(entry.id)}
                                    className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                    aria-label="Delete entry"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Quick Select Buttons Component
const QuickSelectItems = ({
    recentItems,
    onSelect,
    currentValue
}: {
    recentItems: string[];
    onSelect: (name: string) => void;
    currentValue: string;
}) => {
    if (recentItems.length === 0) return null;

    return (
        <div className="mt-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Quick Select</p>
            <div className="flex flex-wrap gap-1.5">
                {recentItems.map((name) => (
                    <button
                        key={name}
                        type="button"
                        onClick={() => onSelect(name)}
                        className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
                            currentValue.toLowerCase() === name.toLowerCase()
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                        )}
                    >
                        {name}
                    </button>
                ))}
            </div>
        </div>
    );
};

export const DonationsSection = () => {
    const {
        donationRecords,
        laPlazaRecords,
        addDonation,
        updateDonation,
        deleteDonation,
        addLaPlazaDonation,
        updateLaPlazaDonation,
        deleteLaPlazaDonation
    } = useDonationsStore();

    const [viewMode, setViewMode] = useState<ViewMode>('general');
    const [selectedDate, setSelectedDate] = useState(todayPacificDateString());
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form States
    const [generalForm, setGeneralForm] = useState({
        type: 'Protein' as DonationTypeEnum,
        itemName: '',
        trays: '',
        weightLbs: '',
        density: 'medium' as 'medium' | 'high' | 'light',
        donor: '',
        temperature: ''
    });

    const [laPlazaForm, setLaPlazaForm] = useState({
        category: 'Produce' as LaPlazaCategoryEnum,
        weightLbs: '',
        notes: ''
    });

    // Filtering
    const displayedRecords = useMemo(() => {
        if (viewMode === 'general') {
            return donationRecords.filter(r => deriveDonationDateKey(r) === selectedDate);
        } else {
            return laPlazaRecords.filter(r => deriveDonationDateKey(r) === selectedDate);
        }
    }, [donationRecords, laPlazaRecords, viewMode, selectedDate]);

    // Grouped records for general donations
    const groupedRecords = useMemo(() => {
        if (viewMode === 'general') {
            return groupDonationsByItem(displayedRecords as DonationRecord[]);
        }
        return [];
    }, [displayedRecords, viewMode]);

    // Recent item names for quick select (from all records, not just today)
    const recentItemNames = useMemo(() => {
        return getRecentItemNames(donationRecords, 5);
    }, [donationRecords]);

    // Calculate daily totals
    const dailyTotals = useMemo(() => {
        if (viewMode === 'general') {
            return {
                totalWeight: (displayedRecords as DonationRecord[]).reduce((sum, r) => sum + (Number(r.weightLbs) || 0), 0),
                totalTrays: (displayedRecords as DonationRecord[]).reduce((sum, r) => sum + (Number(r.trays) || 0), 0),
                totalServings: (displayedRecords as DonationRecord[]).reduce((sum, r) => sum + (Number(r.servings) || 0), 0),
                uniqueItems: groupedRecords.length
            };
        }
        return {
            totalWeight: displayedRecords.reduce((sum, r) => sum + (Number((r as any).weightLbs) || 0), 0),
            totalTrays: 0,
            totalServings: 0,
            uniqueItems: displayedRecords.length
        };
    }, [displayedRecords, groupedRecords, viewMode]);

    // Helpers
    const shiftDate = (offset: number) => {
        // Parse as local date by appending noon time to avoid UTC timezone issues
        const date = new Date(selectedDate + 'T12:00:00');
        date.setDate(date.getDate() + offset);
        setSelectedDate(pacificDateStringFrom(date));
    };

    // Handlers
    const handleGeneralSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const trays = Number(generalForm.trays) || 0;
            const weight = Number(generalForm.weightLbs) || 0;
            const servings = calculateServings(generalForm.type, weight, trays, generalForm.density);

            if (editingId) {
                await updateDonation(editingId, {
                    donation_type: generalForm.type,
                    item_name: generalForm.itemName,
                    trays,
                    weight_lbs: weight,
                    density: generalForm.density,
                    donor: generalForm.donor,
                    temperature: generalForm.temperature,
                    servings,
                    date_key: selectedDate, // Keep original date or move? Usually keep.
                    donated_at: new Date().toISOString()
                });
                toast.success('Updated donation');
                setEditingId(null);
            } else {
                await addDonation({
                    donation_type: generalForm.type,
                    item_name: generalForm.itemName,
                    trays,
                    weight_lbs: weight,
                    density: generalForm.density,
                    donor: generalForm.donor,
                    temperature: generalForm.temperature,
                    servings,
                    date_key: selectedDate,
                    donated_at: new Date().toISOString() // Or match selected date time?
                });
                toast.success('Logged donation');
            }

            // Reset crucial fields only
            setGeneralForm(prev => ({ ...prev, itemName: '', trays: '', weightLbs: '', temperature: '' }));
        } catch (err) {
            console.error(err);
            toast.error('Failed to save');
        } finally {
            setLoading(false);
        }
    };

    const handleLaPlazaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const weight = Number(laPlazaForm.weightLbs) || 0;

            if (editingId) {
                await updateLaPlazaDonation(editingId, {
                    category: laPlazaForm.category,
                    weight_lbs: weight,
                    notes: laPlazaForm.notes,
                    date_key: selectedDate
                });
                toast.success('Updated La Plaza record');
                setEditingId(null);
            } else {
                await addLaPlazaDonation({
                    category: laPlazaForm.category,
                    weight_lbs: weight,
                    notes: laPlazaForm.notes,
                    date_key: selectedDate
                });
                toast.success('Logged La Plaza donation');
            }
            setLaPlazaForm(prev => ({ ...prev, weightLbs: '', notes: '' }));
        } catch (err) {
            console.error(err);
            toast.error('Failed to save');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this record?')) return;
        try {
            if (viewMode === 'general') await deleteDonation(id);
            else await deleteLaPlazaDonation(id);
            toast.success('Deleted');
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const handleEdit = (record: any) => {
        setEditingId(record.id);
        if (viewMode === 'general') {
            setGeneralForm({
                type: record.type || record.donation_type,
                itemName: record.itemName || record.item_name,
                trays: record.trays?.toString() || '',
                weightLbs: record.weightLbs?.toString() || record.weight_lbs?.toString() || '',
                density: record.density || 'medium',
                donor: record.donor || '',
                temperature: record.temperature || ''
            });
        } else {
            setLaPlazaForm({
                category: record.category,
                weightLbs: record.weightLbs?.toString() || record.weight_lbs?.toString() || '',
                notes: record.notes || ''
            });
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        // Reset forms
        setGeneralForm(prev => ({ ...prev, itemName: '', trays: '', weightLbs: '', temperature: '' }));
    };

    // Copy to clipboard logic
    const handleCopySummary = async () => {
        const text = formatProteinAndCarbsClipboardText(displayedRecords as DonationRecord[]);
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied summary to clipboard');
        } catch (err) {
            toast.error('Failed to copy');
        }
    };

    // Quick select handler
    const handleQuickSelect = (itemName: string) => {
        setGeneralForm(prev => ({ ...prev, itemName }));
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header / Date Nav */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-xl", viewMode === 'general' ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600")}>
                        {viewMode === 'general' ? <Utensils size={24} /> : <Store size={24} />}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            {viewMode === 'general' ? 'General Donations' : 'La Plaza Donations'}
                        </h2>
                        <p className="text-gray-500 text-sm">
                            {viewMode === 'general' ? 'Track trays and prepared food' : 'Track raw ingredients and grocery items'}
                        </p>
                    </div>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('general')}
                        className={cn("px-4 py-2 rounded-md text-sm font-medium transition-all", viewMode === 'general' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}
                    >
                        General
                    </button>
                    <button
                        onClick={() => setViewMode('laplaza')}
                        className={cn("px-4 py-2 rounded-md text-sm font-medium transition-all", viewMode === 'laplaza' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}
                    >
                        La Plaza
                    </button>
                </div>
            </div>

            {/* Date Selector */}
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                <button onClick={() => shiftDate(-1)} className="p-2 hover:bg-white rounded-lg transition-colors" title="Previous day"><ChevronLeft size={20} /></button>
                <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">{formatDisplayDate(selectedDate)}</span>
                    {selectedDate !== todayPacificDateString() && (
                        <button
                            onClick={() => setSelectedDate(todayPacificDateString())}
                            className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                        >
                            Today
                        </button>
                    )}
                </div>
                <button onClick={() => shiftDate(1)} className="p-2 hover:bg-white rounded-lg transition-colors" title="Next day"><ChevronRight size={20} /></button>
            </div>

            {/* Daily Summary */}
            {displayedRecords.length > 0 && (
                <div className={cn(
                    "rounded-xl p-4 flex flex-wrap gap-6 items-center justify-center",
                    viewMode === 'general' ? "bg-emerald-50 border border-emerald-200" : "bg-orange-50 border border-orange-200"
                )}>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{dailyTotals.totalWeight.toFixed(1)}</p>
                        <p className="text-xs font-medium text-gray-500 uppercase">lbs total</p>
                    </div>
                    {viewMode === 'general' && dailyTotals.totalTrays > 0 && (
                        <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">{dailyTotals.totalTrays}</p>
                            <p className="text-xs font-medium text-gray-500 uppercase">trays</p>
                        </div>
                    )}
                    {viewMode === 'general' && dailyTotals.totalServings > 0 && (
                        <div className="text-center">
                            <p className="text-2xl font-bold text-emerald-600">~{dailyTotals.totalServings}</p>
                            <p className="text-xs font-medium text-gray-500 uppercase">servings</p>
                        </div>
                    )}
                    <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{dailyTotals.uniqueItems}</p>
                        <p className="text-xs font-medium text-gray-500 uppercase">{viewMode === 'general' ? 'unique items' : 'entries'}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Side */}
                <div className="lg:col-span-1 space-y-6">
                    <form onSubmit={viewMode === 'general' ? handleGeneralSubmit : handleLaPlazaSubmit} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-gray-900">
                                {editingId ? 'Edit Record' : 'Log New Item'}
                            </h3>
                            {editingId && (
                                <button type="button" onClick={cancelEdit} className="text-xs text-red-600 hover:underline">Cancel</button>
                            )}
                        </div>

                        {viewMode === 'general' ? (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                                    <select
                                        className="w-full p-2 rounded-lg border border-gray-200 bg-gray-50 font-medium"
                                        value={generalForm.type}
                                        onChange={e => setGeneralForm({ ...generalForm, type: e.target.value as DonationTypeEnum })}
                                    >
                                        {DONATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Item Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={generalForm.itemName}
                                        onChange={e => setGeneralForm({ ...generalForm, itemName: e.target.value })}
                                        placeholder="e.g. Chicken breast"
                                    />
                                    {/* Quick Select for Recent Items */}
                                    <QuickSelectItems
                                        recentItems={recentItemNames}
                                        onSelect={handleQuickSelect}
                                        currentValue={generalForm.itemName}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Trays</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                                            value={generalForm.trays}
                                            onChange={e => setGeneralForm({ ...generalForm, trays: e.target.value })}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Weight (lbs)</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                                            value={generalForm.weightLbs}
                                            onChange={e => setGeneralForm({ ...generalForm, weightLbs: e.target.value })}
                                            placeholder="0.0"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Density</label>
                                    <select
                                        className="w-full p-2 rounded-lg border border-gray-200 bg-gray-50 font-medium"
                                        value={generalForm.density}
                                        onChange={e => setGeneralForm({ ...generalForm, density: e.target.value as 'light' | 'medium' | 'high' })}
                                    >
                                        <option value="light">Light ({DENSITY_SERVINGS.light} servings)</option>
                                        <option value="medium">Medium ({DENSITY_SERVINGS.medium} servings)</option>
                                        <option value="high">High ({DENSITY_SERVINGS.high} servings)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Donor / Source</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={generalForm.donor}
                                        onChange={e => setGeneralForm({ ...generalForm, donor: e.target.value })}
                                        placeholder="e.g., Waymo, LinkedIn, Anonymous"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Temperature (Optional)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                                            value={generalForm.temperature}
                                            onChange={e => setGeneralForm({ ...generalForm, temperature: e.target.value })}
                                            placeholder="e.g., 165°F, Hot, Cold, Room temp"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setGeneralForm({ ...generalForm, temperature: generalForm.temperature + '°F' })}
                                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-600 transition-colors"
                                            title="Add °F symbol"
                                        >
                                            °F
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Tip: Click °F button to add the symbol</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                                    <select
                                        className="w-full p-2 rounded-lg border border-gray-200 bg-gray-50 font-medium"
                                        value={laPlazaForm.category}
                                        onChange={e => setLaPlazaForm({ ...laPlazaForm, category: e.target.value as LaPlazaCategoryEnum })}
                                    >
                                        {LA_PLAZA_CATEGORIES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Weight (lbs)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none"
                                        value={laPlazaForm.weightLbs}
                                        onChange={e => setLaPlazaForm({ ...laPlazaForm, weightLbs: e.target.value })}
                                        placeholder="0.0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes</label>
                                    <textarea
                                        className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none h-24 resize-none"
                                        value={laPlazaForm.notes}
                                        onChange={e => setLaPlazaForm({ ...laPlazaForm, notes: e.target.value })}
                                        placeholder="Optional details..."
                                    />
                                </div>
                            </>
                        )}

                        <button
                            disabled={loading}
                            type="submit"
                            className={cn(
                                "w-full py-3 rounded-xl font-bold text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2",
                                viewMode === 'general'
                                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                                    : "bg-orange-600 hover:bg-orange-700 shadow-orange-200"
                            )}
                        >
                            {editingId ? <Pencil size={18} /> : <Save size={18} />}
                            {editingId ? 'Update Record' : 'Save Record'}
                        </button>
                    </form>
                </div>

                {/* List Side */}
                <div className="lg:col-span-2 space-y-4">
                    {viewMode === 'general' && displayedRecords.length > 0 && (
                        <div className="flex justify-end">
                            <button onClick={handleCopySummary} className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:bg-emerald-50 px-2 py-1 rounded-md transition-colors">
                                <Copy size={14} /> Copy Summary
                            </button>
                        </div>
                    )}

                    <div className="space-y-3">
                        {displayedRecords.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 border-dashed">
                                <Plus size={32} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-gray-400 font-medium">No records for this date</p>
                                <p className="text-xs text-gray-300 mt-1">Add donations using the form on the left</p>
                            </div>
                        ) : viewMode === 'general' ? (
                            // Grouped view for general donations
                            groupedRecords.map((group) => (
                                <GroupedDonationCard
                                    key={group.key}
                                    group={group}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    viewMode={viewMode}
                                />
                            ))
                        ) : (
                            // Flat list for La Plaza donations
                            displayedRecords.map((record: any) => (
                                <div key={record.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-start group">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700">
                                                {record.category}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {formatRecordTime(record)}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-gray-900 mt-1">
                                            {record.notes || 'No description'}
                                        </h4>
                                        <div className="text-sm text-gray-600 mt-1">
                                            <span>{record.weightLbs} lbs</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(record)}
                                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(record.id)}
                                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
