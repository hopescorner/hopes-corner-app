'use client';

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
    Save,
    Trash2,
    Pencil,
    ChevronLeft,
    ChevronRight,
    Utensils,
    Copy,
    ChevronDown,
    ChevronUp,
    Clock,
    Plus,
    Search,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDonationsStore, DonationRecord } from '@/stores/useDonationsStore';
import { DonationTypeEnum } from '@/types/database';
import {
    calculateServings,
    calculateDonationValue,
    deriveDonationDateKey,
    formatDonationCurrency,
    formatProteinAndCarbsClipboardText,
    formatDonationsClipboardText,
    DENSITY_SERVINGS,
} from '@/lib/utils/donationUtils';
import { todayPacificDateString, pacificDateStringFrom, formatTimeInPacific } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import { useShallow } from 'zustand/react/shallow';

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
    return formatTimeInPacific(timestamp, { hour: '2-digit', minute: '2-digit' });
};

const DONATION_TYPES: DonationTypeEnum[] = [
    'Protein', 'Carbs', 'Vegetables', 'Fruit',
    'Veggie Protein', 'Deli Foods', 'Pastries', 'School Lunch'
];

const TYPE_BADGE_STYLES: Record<string, string> = {
    Protein: 'bg-rose-50 text-rose-700',
    Carbs: 'bg-amber-50 text-amber-700',
    Vegetables: 'bg-emerald-50 text-emerald-700',
    Fruit: 'bg-orange-50 text-orange-700',
    'Veggie Protein': 'bg-lime-50 text-lime-700',
    'Deli Foods': 'bg-sky-50 text-sky-700',
    Pastries: 'bg-purple-50 text-purple-700',
    'School Lunch': 'bg-blue-50 text-blue-700',
};

const typeBadgeClass = (type: string) =>
    TYPE_BADGE_STYLES[type] ?? 'bg-emerald-50 text-emerald-700';

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

// Quick select item with associated donor info
export interface QuickSelectItem {
    itemName: string;
    donor: string;
}

// Interface for donor-level grouping
export interface DonorGroup {
    donor: string;
    entries: DonationRecord[];
    itemGroups: GroupedDonation[];
    totalWeight: number;
    totalTrays: number;
    totalServings: number;
}

// Group donations by donor, then by type+itemName within each donor
export const groupDonationsByDonor = (records: DonationRecord[]): DonorGroup[] => {
    const donorMap = new Map<string, DonationRecord[]>();

    for (const record of records) {
        const donorKey = (record.donor || '').trim().toLowerCase() || '__no_donor__';
        if (!donorMap.has(donorKey)) {
            donorMap.set(donorKey, []);
        }
        donorMap.get(donorKey)!.push(record);
    }

    const groups: DonorGroup[] = [];
    for (const [, donorRecords] of donorMap) {
        const displayDonor = donorRecords[0].donor?.trim() || '';
        const itemGroups = groupDonationsByItem(donorRecords);

        groups.push({
            donor: displayDonor,
            entries: donorRecords,
            itemGroups,
            totalWeight: donorRecords.reduce((sum, r) => sum + (Number(r.weightLbs) || 0), 0),
            totalTrays: donorRecords.reduce((sum, r) => sum + (Number(r.trays) || 0), 0),
            totalServings: donorRecords.reduce((sum, r) => sum + (Number(r.servings) || 0), 0),
        });
    }

    // Sort: named donors first (alphabetically), then unnamed
    return groups.sort((a, b) => {
        if (!a.donor && b.donor) return 1;
        if (a.donor && !b.donor) return -1;
        return a.donor.localeCompare(b.donor);
    });
};

// Get unique recent item names (with most-recent donor) for quick selection.
// Precomputes timestamps once so sorting is O(n log n) on numbers instead of
// re-parsing date strings on every comparison.
export const getRecentItemNames = (records: DonationRecord[], limit = 5): QuickSelectItem[] => {
    const seen = new Set<string>();
    const recent: QuickSelectItem[] = [];

    const withTime = records.map((record) => ({
        record,
        time: new Date(record.donatedAt || record.createdAt || 0).getTime(),
    }));
    withTime.sort((a, b) => b.time - a.time);

    for (const { record } of withTime) {
        const name = (record.itemName || '').trim();
        if (name && !seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase());
            recent.push({ itemName: name, donor: (record.donor || '').trim() });
            if (recent.length >= limit) break;
        }
    }

    return recent;
};

export const appendFahrenheit = (value: string): string => {
    const trimmed = (value || '').trim();
    if (!trimmed) return trimmed;
    if (trimmed.includes('°')) return value;
    return `${trimmed}°F`;
};

// Grouped Donation Card Component
const GroupedDonationCard = memo(function GroupedDonationCard({
    group,
    onEdit,
    onDelete,
}: {
    group: GroupedDonation;
    onEdit: (record: DonationRecord) => void;
    onDelete: (record: DonationRecord) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(group.entries.length === 1);
    const hasMultipleEntries = group.entries.length > 1;
    const expandId = `donation-entries-${group.key.replace(/[^a-zA-Z0-9]/g, '-')}`;

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Group Header - always visible */}
            <div className="p-4 flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider', typeBadgeClass(group.type))}>
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
                <div className="flex items-center gap-1 shrink-0">
                    {hasMultipleEntries && (
                        <button
                            type="button"
                            onClick={() => setIsExpanded((v) => !v)}
                            aria-expanded={isExpanded}
                            aria-controls={expandId}
                            aria-label={isExpanded ? 'Collapse entries' : 'Expand entries'}
                            className="min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors text-gray-500 focus-visible:outline-2 focus-visible:outline-emerald-600"
                        >
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                    )}
                    {!hasMultipleEntries && (
                        <>
                            <button
                                type="button"
                                onClick={() => onEdit(group.entries[0])}
                                className="min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-blue-50 text-blue-600 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
                                aria-label="Edit entry"
                            >
                                <Pencil size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => onDelete(group.entries[0])}
                                className="min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-red-50 text-red-600 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-red-600"
                                aria-label="Delete entry"
                            >
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Expanded Individual Entries */}
            {isExpanded && hasMultipleEntries && (
                <div id={expandId} className="border-t border-gray-100 bg-gray-50/50">
                    {group.entries.map((entry, idx) => (
                        <div
                            key={entry.id}
                            className={cn(
                                'px-4 py-3 flex justify-between items-center gap-3 hover:bg-white transition-colors',
                                idx !== group.entries.length - 1 && 'border-b border-gray-100'
                            )}
                        >
                            <div className="flex items-center gap-4 flex-wrap min-w-0">
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
                            <div className="flex gap-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => onEdit(entry)}
                                    className="min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-blue-50 text-blue-600 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
                                    aria-label="Edit entry"
                                >
                                    <Pencil size={14} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDelete(entry)}
                                    className="min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-red-50 text-red-600 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-red-600"
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
});

// Donor Group Card Component — groups all items from the same donor
const DonorGroupCard = memo(function DonorGroupCard({
    donorGroup,
    expanded,
    onToggle,
    onEdit,
    onDelete,
}: {
    donorGroup: DonorGroup;
    expanded: boolean;
    onToggle: () => void;
    onEdit: (record: DonationRecord) => void;
    onDelete: (record: DonationRecord) => void;
}) {
    const donorLabel = donorGroup.donor || 'Unknown Donor';
    const regionId = `donor-items-${(donorGroup.donor || 'unknown').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

    return (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Donor Header */}
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={expanded}
                aria-controls={regionId}
                aria-label={expanded ? 'Collapse donor group' : 'Expand donor group'}
                className="w-full px-5 py-4 flex justify-between items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
                <span className="flex items-center gap-3 min-w-0">
                    <span aria-hidden="true" className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-sm uppercase shrink-0">
                        {donorLabel.charAt(0)}
                    </span>
                    <span className="min-w-0">
                        <span className="block font-bold text-gray-900 text-base truncate">{donorLabel}</span>
                        <span className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                            <span>{donorGroup.entries.length} item{donorGroup.entries.length !== 1 ? 's' : ''}</span>
                            <span className="font-semibold">{donorGroup.totalWeight.toFixed(1)} lbs</span>
                            {donorGroup.totalTrays > 0 && <span>{donorGroup.totalTrays} trays</span>}
                            {donorGroup.totalServings > 0 && (
                                <span className="text-emerald-600 font-semibold">~{donorGroup.totalServings} servings</span>
                            )}
                        </span>
                    </span>
                </span>
                <span aria-hidden="true" className="text-gray-400 shrink-0">
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
            </button>

            {/* Donor Items */}
            {expanded && (
                <div id={regionId} className="p-3 space-y-2 bg-gray-50/30">
                    {donorGroup.itemGroups.map((group) => (
                        <GroupedDonationCard
                            key={group.key}
                            group={group}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

// Quick Select Buttons Component
const QuickSelectItems = memo(function QuickSelectItems({
    recentItems,
    onSelect,
    currentValue
}: {
    recentItems: QuickSelectItem[];
    onSelect: (item: QuickSelectItem) => void;
    currentValue: string;
}) {
    if (recentItems.length === 0) return null;

    return (
        <div className="mt-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Quick Select</p>
            <div className="flex flex-wrap gap-1.5">
                {recentItems.map((item) => (
                    <button
                        key={item.itemName}
                        type="button"
                        onClick={() => onSelect(item)}
                        title={item.donor ? `Donor: ${item.donor}` : undefined}
                        className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-medium transition-all border',
                            currentValue.toLowerCase() === item.itemName.toLowerCase()
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'
                        )}
                    >
                        {item.itemName}
                    </button>
                ))}
            </div>
        </div>
    );
});

interface DonationFormData {
    type: DonationTypeEnum;
    itemName: string;
    trays: string;
    weightLbs: string;
    density: 'medium' | 'high' | 'light';
    donor: string;
    temperature: string;
}

const EMPTY_FORM: DonationFormData = {
    type: 'Protein',
    itemName: '',
    trays: '',
    weightLbs: '',
    density: 'medium',
    donor: '',
    temperature: '',
};

function formDataFromRecord(record: DonationRecord | null): DonationFormData {
    if (!record) return { ...EMPTY_FORM };
    return {
        type: (record.type || 'Protein') as DonationTypeEnum,
        itemName: record.itemName || (record as any).item_name || '',
        trays: record.trays != null && record.trays !== '' ? String(record.trays) : '',
        weightLbs: record.weightLbs != null && (record as any).weightLbs !== ''
            ? String(record.weightLbs)
            : ((record as any).weight_lbs != null ? String((record as any).weight_lbs) : ''),
        density: (record.density as DonationFormData['density']) || 'medium',
        donor: record.donor || '',
        temperature: record.temperature || '',
    };
}

// Isolated form so typing does not re-render the donation list.
const DonationForm = memo(function DonationForm({
    editingRecord,
    recentItems,
    donorSuggestions,
    saving,
    onSubmit,
    onCancelEdit,
}: {
    editingRecord: DonationRecord | null;
    recentItems: QuickSelectItem[];
    donorSuggestions: string[];
    saving: boolean;
    onSubmit: (data: { type: DonationTypeEnum; itemName: string; trays: number; weightLbs: number; density: 'light' | 'medium' | 'high'; donor: string; temperature: string }) => Promise<void>;
    onCancelEdit: () => void;
}) {
    const [form, setForm] = useState<DonationFormData>(() => formDataFromRecord(editingRecord));
    const [error, setError] = useState<string | null>(null);
    const isEditing = editingRecord != null;

    const handleQuickSelect = useCallback((item: QuickSelectItem) => {
        setForm((prev) => ({
            ...prev,
            itemName: item.itemName,
            ...(item.donor ? { donor: item.donor } : {}),
        }));
    }, []);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const itemName = form.itemName.trim();
        if (!itemName) {
            setError('Item name is required.');
            return;
        }
        const trays = Number(form.trays);
        const weight = Number(form.weightLbs);
        const safeTrays = Number.isFinite(trays) && trays > 0 ? trays : 0;
        const safeWeight = Number.isFinite(weight) && weight > 0 ? weight : 0;
        if (Number(form.trays) < 0 || Number(form.weightLbs) < 0) {
            setError('Trays and weight cannot be negative.');
            return;
        }
        if (safeTrays === 0 && safeWeight === 0) {
            setError('Enter trays or weight (at least one must be greater than 0).');
            return;
        }
        setError(null);
        await onSubmit({
            type: form.type,
            itemName,
            trays: safeTrays,
            weightLbs: safeWeight,
            density: form.density,
            donor: form.donor.trim(),
            temperature: form.temperature.trim(),
        });
        if (!isEditing) {
            setForm((prev) => ({ ...prev, itemName: '', trays: '', weightLbs: '', temperature: '' }));
        }
    }, [form, isEditing, onSubmit]);

    return (
        <form onSubmit={handleSubmit} noValidate className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900">
                    {isEditing ? 'Edit Record' : 'Log New Item'}
                </h3>
                {isEditing && (
                    <button
                        type="button"
                        onClick={onCancelEdit}
                        className="min-h-[40px] px-3 text-xs font-bold text-red-600 hover:underline focus-visible:outline-2 focus-visible:outline-red-600 rounded-lg"
                    >
                        Cancel
                    </button>
                )}
            </div>

            {error && (
                <p role="alert" className="text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                </p>
            )}

            <div>
                <label htmlFor="donation-type" className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                <select
                    id="donation-type"
                    className="w-full p-2 rounded-lg border border-gray-200 bg-gray-50 font-medium focus-visible:outline-2 focus-visible:outline-emerald-600"
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value as DonationTypeEnum })}
                >
                    {DONATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="donation-item" className="block text-xs font-bold text-gray-500 uppercase mb-1">Item Name</label>
                <input
                    id="donation-item"
                    type="text"
                    required
                    className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={form.itemName}
                    onChange={e => setForm({ ...form, itemName: e.target.value })}
                    placeholder="e.g. Chicken breast"
                />
                {/* Quick Select for Recent Items */}
                <QuickSelectItems
                    recentItems={recentItems}
                    onSelect={handleQuickSelect}
                    currentValue={form.itemName}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="donation-trays" className="block text-xs font-bold text-gray-500 uppercase mb-1">Trays</label>
                    <input
                        id="donation-trays"
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={form.trays}
                        onChange={e => setForm({ ...form, trays: e.target.value })}
                        placeholder="0"
                    />
                </div>
                <div>
                    <label htmlFor="donation-weight" className="block text-xs font-bold text-gray-500 uppercase mb-1">Weight (lbs)</label>
                    <input
                        id="donation-weight"
                        type="number"
                        min="0"
                        step="0.1"
                        inputMode="decimal"
                        className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={form.weightLbs}
                        onChange={e => setForm({ ...form, weightLbs: e.target.value })}
                        placeholder="0.0"
                    />
                </div>
            </div>
            <div>
                <label htmlFor="donation-density" className="block text-xs font-bold text-gray-500 uppercase mb-1">Density</label>
                <select
                    id="donation-density"
                    className="w-full p-2 rounded-lg border border-gray-200 bg-gray-50 font-medium focus-visible:outline-2 focus-visible:outline-emerald-600"
                    value={form.density}
                    onChange={e => setForm({ ...form, density: e.target.value as 'light' | 'medium' | 'high' })}
                >
                    <option value="light">Light ({DENSITY_SERVINGS.light} servings)</option>
                    <option value="medium">Medium ({DENSITY_SERVINGS.medium} servings)</option>
                    <option value="high">High ({DENSITY_SERVINGS.high} servings)</option>
                </select>
            </div>
            <div>
                <label htmlFor="donation-donor" className="block text-xs font-bold text-gray-500 uppercase mb-1">Donor / Source</label>
                <input
                    id="donation-donor"
                    type="text"
                    list="donation-donor-list"
                    className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={form.donor}
                    onChange={e => setForm({ ...form, donor: e.target.value })}
                    placeholder="e.g., Waymo, LinkedIn, Anonymous"
                />
                <datalist id="donation-donor-list">
                    {donorSuggestions.map((d) => (
                        <option key={d} value={d} />
                    ))}
                </datalist>
            </div>
            <div>
                <label htmlFor="donation-temperature" className="block text-xs font-bold text-gray-500 uppercase mb-1">Temperature (Optional)</label>
                <div className="flex gap-2">
                    <input
                        id="donation-temperature"
                        type="text"
                        className="flex-1 p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={form.temperature}
                        onChange={e => setForm({ ...form, temperature: e.target.value })}
                        placeholder="e.g., 165°F, Hot, Cold, Room temp"
                    />
                    <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, temperature: appendFahrenheit(prev.temperature) }))}
                        className="min-h-[40px] px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-600 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600"
                        title="Add °F symbol"
                    >
                        °F
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Tip: Click °F button to add the symbol</p>
            </div>

            <button
                disabled={saving}
                type="submit"
                className="w-full min-h-[48px] py-3 rounded-xl font-bold text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-emerald-800"
            >
                {isEditing ? <Pencil size={18} /> : <Save size={18} />}
                {saving ? 'Saving…' : isEditing ? 'Update Record' : 'Save Record'}
            </button>
        </form>
    );
});

const DeleteDonationDialog = memo(function DeleteDonationDialog({
    record,
    deleting,
    onCancel,
    onConfirm,
}: {
    record: DonationRecord;
    deleting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onCancel]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Close dialog"
                onClick={onCancel}
                className="absolute inset-0 bg-gray-900/50"
            />
            <div role="dialog" aria-modal="true" aria-labelledby="delete-donation-title" className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
                <h3 id="delete-donation-title" className="font-bold text-gray-900 text-lg">Delete donation?</h3>
                <p className="text-sm text-gray-600">
                    Delete <span className="font-semibold text-gray-900">{record.itemName || 'this record'}</span>
                    {record.donor ? <> from <span className="font-semibold text-gray-900">{record.donor}</span></> : null}
                    {Number(record.weightLbs) > 0 ? <> ({Number(record.weightLbs).toFixed(1)} lbs)</> : null}?
                    This cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={deleting}
                        className="flex-1 min-h-[44px] py-2.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-gray-500"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={deleting}
                        className="flex-1 min-h-[44px] py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-red-800"
                    >
                        {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
});

export const DonationsSection = () => {
    // Single shallow-selected subscription: form keystrokes (local state) no
    // longer re-render the list, and unrelated store flags don't either.
    const {
        donationRecords,
        addDonation,
        updateDonation,
        deleteDonation,
        storeIsLoaded,
        storeIsLoading,
    } = useDonationsStore(
        useShallow((s) => ({
            donationRecords: s.donationRecords,
            addDonation: s.addDonation,
            updateDonation: s.updateDonation,
            deleteDonation: s.deleteDonation,
            storeIsLoaded: s.isLoaded,
            storeIsLoading: s.isLoading,
        }))
    ) as {
        donationRecords: DonationRecord[];
        addDonation: ReturnType<typeof useDonationsStore.getState>['addDonation'];
        updateDonation: ReturnType<typeof useDonationsStore.getState>['updateDonation'];
        deleteDonation: ReturnType<typeof useDonationsStore.getState>['deleteDonation'];
        storeIsLoaded?: boolean;
        storeIsLoading?: boolean;
    };
    const records = donationRecords ?? [];
    // Unit-test mocks omit load flags; default to loaded so the list renders.
    const isLoaded = storeIsLoaded ?? true;
    const isLoadingList = (storeIsLoading ?? false) || !isLoaded;

    const [todayKey] = useState(() => todayPacificDateString());
    const [selectedDate, setSelectedDate] = useState(todayKey);
    const [donorQuery, setDonorQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'All' | DonationTypeEnum>('All');
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DonationRecord | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [collapsedDonors, setCollapsedDonors] = useState<Set<string>>(() => new Set());
    const isToday = selectedDate === todayKey;

    // Single memo pipeline: one pass filters + totals, then grouping. Replaces
    // the previous four separate iterations over the day's records.
    const pipeline = useMemo(() => {
        const displayed: DonationRecord[] = [];
        let totalWeight = 0;
        let totalTrays = 0;
        let totalServings = 0;
        const donorKeys = new Set<string>();
        for (const r of records) {
            if (deriveDonationDateKey(r) !== selectedDate) continue;
            displayed.push(r as DonationRecord);
            totalWeight += Number((r as DonationRecord).weightLbs) || 0;
            totalTrays += Number((r as DonationRecord).trays) || 0;
            totalServings += Number((r as DonationRecord).servings) || 0;
            donorKeys.add(((r as DonationRecord).donor || '').trim().toLowerCase());
        }

        const q = donorQuery.trim().toLowerCase();
        const filtered = displayed.filter((r) => {
            if (typeFilter !== 'All' && r.type !== typeFilter) return false;
            if (!q) return true;
            return (
                (r.donor || '').toLowerCase().includes(q)
                || (r.itemName || '').toLowerCase().includes(q)
                || (r.type || '').toLowerCase().includes(q)
            );
        });

        const donorGroups = groupDonationsByDonor(filtered);
        const itemGroups = groupDonationsByItem(displayed);
        const recentItems = getRecentItemNames(records, 5);

        const donorTotals = new Map<string, number>();
        for (const r of records) {
            const d = (r.donor || '').trim();
            if (!d) continue;
            donorTotals.set(d, (donorTotals.get(d) ?? 0) + 1);
        }
        const donorSuggestions = Array.from(donorTotals.entries())
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .slice(0, 10)
            .map(([d]) => d);

        return {
            displayed,
            filtered,
            donorGroups,
            recentItems,
            donorSuggestions,
            totals: {
                totalWeight,
                donationValue: calculateDonationValue(displayed as DonationRecord[]),
                totalTrays,
                totalServings,
                uniqueItems: itemGroups.length,
                uniqueDonors: donorKeys.size,
            },
        };
    }, [records, selectedDate, donorQuery, typeFilter]);

    const { displayed, filtered, donorGroups, recentItems, donorSuggestions, totals } = pipeline;
    const isFiltering = donorQuery.trim() !== '' || typeFilter !== 'All';

    const editingRecord = useMemo(
        () => records.find((r) => r.id === editingId) ?? null,
        [records, editingId]
    );

    // Helpers
    const shiftDate = useCallback((offset: number) => {
        // Parse as local date by appending noon time to avoid UTC timezone issues
        setSelectedDate((prev) => {
            const date = new Date(prev + 'T12:00:00');
            date.setDate(date.getDate() + offset);
            return pacificDateStringFrom(date);
        });
    }, []);

    const goToday = useCallback(() => setSelectedDate(todayKey), [todayKey]);

    // Handlers
    const handleFormSubmit = useCallback(async (data: {
        type: DonationTypeEnum;
        itemName: string;
        trays: number;
        weightLbs: number;
        density: 'light' | 'medium' | 'high';
        donor: string;
        temperature: string;
    }) => {
        setSaving(true);
        try {
            const servings = calculateServings(data.type, data.weightLbs, data.trays, data.density);

            if (editingId) {
                await updateDonation(editingId, {
                    donation_type: data.type,
                    item_name: data.itemName,
                    trays: data.trays,
                    weight_lbs: data.weightLbs,
                    density: data.density,
                    donor: data.donor,
                    temperature: data.temperature,
                    servings,
                    date_key: selectedDate,
                    donated_at: new Date().toISOString()
                } as any);
                toast.success('Updated donation');
                setEditingId(null);
            } else {
                await addDonation({
                    donation_type: data.type,
                    item_name: data.itemName,
                    trays: data.trays,
                    weight_lbs: data.weightLbs,
                    density: data.density,
                    donor: data.donor,
                    temperature: data.temperature,
                    servings,
                    date_key: selectedDate,
                    donated_at: new Date().toISOString()
                } as any);
                toast.success('Logged donation');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to save');
            throw err;
        } finally {
            setSaving(false);
        }
    }, [addDonation, editingId, selectedDate, updateDonation]);

    const handleDeleteRequest = useCallback((record: DonationRecord) => {
        setDeleteTarget(record);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        if (!deleteTarget) return;
        setDeletingId(deleteTarget.id);
        try {
            await deleteDonation(deleteTarget.id);
            if (editingId === deleteTarget.id) setEditingId(null);
            toast.success('Deleted');
            setDeleteTarget(null);
        } catch (err) {
            toast.error('Failed to delete');
        } finally {
            setDeletingId(null);
        }
    }, [deleteDonation, deleteTarget, editingId]);

    const handleEdit = useCallback((record: DonationRecord) => {
        setEditingId(record.id);
        setDeleteTarget((current) => (current?.id === record.id ? null : current));
        const scrollToForm = () => {
            (document.getElementById('donation-form') as unknown as { scrollIntoView?: (opts?: object) => void } | null)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        };
        if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(scrollToForm);
        else scrollToForm();
    }, []);

    const cancelEdit = useCallback(() => {
        setEditingId(null);
    }, []);

    // Copy to clipboard logic — full summary (all types + totals). Falls back
    // to the legacy protein/carbs formatter when the full one is unavailable
    // (e.g. unit-test mocks).
    const handleCopySummary = useCallback(async () => {
        const fullFormatter = formatDonationsClipboardText as unknown as
            | ((records: DonationRecord[], totals: typeof totals) => string)
            | undefined;
        const legacyFormatter = formatProteinAndCarbsClipboardText as unknown as
            | ((records: DonationRecord[]) => string)
            | undefined;
        const text = fullFormatter
            ? fullFormatter(displayed as DonationRecord[], totals)
            : legacyFormatter
                ? legacyFormatter(displayed as DonationRecord[])
                : '';
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied summary to clipboard');
        } catch (err) {
            toast.error('Failed to copy');
        }
    }, [displayed, totals]);

    const toggleDonor = useCallback((donorKey: string) => {
        setCollapsedDonors((prev) => {
            const next = new Set(prev);
            if (next.has(donorKey)) next.delete(donorKey);
            else next.add(donorKey);
            return next;
        });
    }, []);

    const expandAllDonors = useCallback(() => setCollapsedDonors(new Set()), []);
    const collapseAllDonors = useCallback(() => {
        setCollapsedDonors(new Set(donorGroups.map((g) => g.donor || '__unknown__')));
    }, [donorGroups]);

    useEffect(() => {
        // Drop collapsed keys that no longer exist after filtering.
        setCollapsedDonors((prev) => {
            if (prev.size === 0) return prev;
            const valid = new Set(donorGroups.map((g) => g.donor || '__unknown__'));
            let changed = false;
            const next = new Set<string>();
            for (const k of prev) {
                if (valid.has(k)) next.add(k);
                else changed = true;
            }
            return changed ? next : prev;
        });
    }, [donorGroups]);

    const clearFilters = useCallback(() => {
        setDonorQuery('');
        setTypeFilter('All');
    }, []);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header / Date Nav */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                        <Utensils size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            Donations
                        </h2>
                        <p className="text-gray-500 text-sm">
                            Track trays and prepared food
                        </p>
                    </div>
                </div>
            </div>

            {/* Date Selector */}
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                <button type="button" onClick={() => shiftDate(-1)} className="min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-white rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600" title="Previous day" aria-label="Previous day"><ChevronLeft size={20} /></button>
                <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">{formatDisplayDate(selectedDate)}</span>
                    {!isToday && (
                        <button
                            type="button"
                            onClick={goToday}
                            className="px-2.5 py-1 min-h-[32px] text-xs font-bold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600"
                        >
                            Today
                        </button>
                    )}
                </div>
                <button type="button" onClick={() => shiftDate(1)} className="min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-white rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600" title="Next day" aria-label="Next day"><ChevronRight size={20} /></button>
            </div>

            {/* Search + type filter */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
                <div className="relative">
                    <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="search"
                        aria-label="Search donations"
                        value={donorQuery}
                        onChange={(e) => setDonorQuery(e.target.value)}
                        placeholder="Search donors or items..."
                        className="w-full pl-9 pr-9 py-2 min-h-[44px] rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                    {donorQuery && (
                        <button
                            type="button"
                            onClick={() => setDonorQuery('')}
                            aria-label="Clear search"
                            className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[32px] min-w-[32px] flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filter by donation type">
                    {(['All', ...DONATION_TYPES] as const).map((t) => (
                        <button
                            key={t}
                            type="button"
                            aria-pressed={typeFilter === t}
                            onClick={() => setTypeFilter(t)}
                            className={cn(
                                'shrink-0 px-3 py-1.5 min-h-[36px] rounded-full text-xs font-bold border transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600',
                                typeFilter === t
                                    ? 'bg-gray-900 text-white border-gray-900'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                            )}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                {isFiltering && (
                    <div className="flex items-center justify-between gap-3 text-xs">
                        <p className="text-gray-500 font-medium" aria-live="polite">
                            Showing {filtered.length} of {displayed.length} records
                        </p>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="font-bold text-emerald-700 hover:underline min-h-[32px] px-2 focus-visible:outline-2 focus-visible:outline-emerald-600 rounded-lg"
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </div>

            {/* Daily Summary */}
            {displayed.length > 0 && (
                <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-200">
                    <div className="flex flex-wrap gap-6 items-center justify-center">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">{totals.totalWeight.toFixed(1)}</p>
                            <p className="text-xs font-medium text-gray-500 uppercase">lbs total</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-emerald-700">{formatDonationCurrency(totals.donationValue)}</p>
                            <p className="text-xs font-medium text-gray-500 uppercase">donation value</p>
                        </div>
                        {totals.totalTrays > 0 && (
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">{totals.totalTrays}</p>
                                <p className="text-xs font-medium text-gray-500 uppercase">trays</p>
                            </div>
                        )}
                        {totals.totalServings > 0 && (
                            <div className="text-center">
                                <p className="text-2xl font-bold text-emerald-600">~{totals.totalServings}</p>
                                <p className="text-xs font-medium text-gray-500 uppercase">servings</p>
                            </div>
                        )}
                        <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">{totals.uniqueItems}</p>
                            <p className="text-xs font-medium text-gray-500 uppercase">unique items</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">{totals.uniqueDonors}</p>
                            <p className="text-xs font-medium text-gray-500 uppercase">donors</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Form Side */}
                <div className="lg:col-span-1 lg:sticky lg:top-4">
                    <div id="donation-form" className="scroll-mt-4">
                        <DonationForm
                            key={editingId ?? 'new'}
                            editingRecord={editingRecord}
                            recentItems={recentItems}
                            donorSuggestions={donorSuggestions}
                            saving={saving}
                            onSubmit={handleFormSubmit}
                            onCancelEdit={cancelEdit}
                        />
                    </div>
                </div>

                {/* List Side */}
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    {displayed.length > 0 && (
                        <div className="flex justify-between items-center gap-2 flex-wrap">
                            {donorGroups.length > 1 ? (
                                <div className="flex gap-1 text-xs">
                                    <button type="button" onClick={expandAllDonors} className="font-bold text-gray-500 hover:text-gray-800 px-2 py-1 min-h-[32px] rounded-md focus-visible:outline-2 focus-visible:outline-emerald-600">
                                        Expand all
                                    </button>
                                    <span aria-hidden="true" className="text-gray-200 self-center">|</span>
                                    <button type="button" onClick={collapseAllDonors} className="font-bold text-gray-500 hover:text-gray-800 px-2 py-1 min-h-[32px] rounded-md focus-visible:outline-2 focus-visible:outline-emerald-600">
                                        Collapse all
                                    </button>
                                </div>
                            ) : <span />}
                            <button type="button" onClick={handleCopySummary} className="min-h-[36px] text-xs font-bold text-emerald-600 flex items-center gap-1 hover:bg-emerald-50 px-2 py-1 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600">
                                <Copy size={14} /> Copy Summary
                            </button>
                        </div>
                    )}

                    <div className="space-y-4">
                        {isLoadingList ? (
                            <div aria-label="Loading donations" className="space-y-4">
                                {[0, 1, 2].map((i) => (
                                    <div key={i} className="h-24 w-full animate-pulse rounded-2xl bg-gray-100" />
                                ))}
                            </div>
                        ) : displayed.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 border-dashed">
                                <Plus size={32} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-gray-400 font-medium">No records for this date</p>
                                <p className="text-xs text-gray-300 mt-1">Add donations using the form on the left</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 border-dashed">
                                <Search size={32} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-gray-500 font-medium">No donations match these filters</p>
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="mt-2 text-xs font-bold text-emerald-700 hover:underline min-h-[32px] px-3 focus-visible:outline-2 focus-visible:outline-emerald-600 rounded-lg"
                                >
                                    Clear filters
                                </button>
                            </div>
                        ) : (
                            // Donor-grouped view
                            donorGroups.map((donorGroup) => {
                                const donorKey = donorGroup.donor || '__unknown__';
                                return (
                                    <DonorGroupCard
                                        key={donorKey}
                                        donorGroup={donorGroup}
                                        expanded={!collapsedDonors.has(donorKey)}
                                        onToggle={() => toggleDonor(donorKey)}
                                        onEdit={handleEdit}
                                        onDelete={handleDeleteRequest}
                                    />
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {deleteTarget && (
                <DeleteDonationDialog
                    record={deleteTarget}
                    deleting={deletingId === deleteTarget.id}
                    onCancel={() => (deletingId ? null : setDeleteTarget(null))}
                    onConfirm={handleConfirmDelete}
                />
            )}
        </div>
    );
};
