'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Loader2,
    Plus,
    Search,
    Trash2,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { useGuestsStore, type Guest } from '@/stores/useGuestsStore';
import { AGE_GROUPS, GENDERS, HOUSING_STATUSES } from '@/lib/constants/constants';
import { findPotentialDuplicates, type PotentialDuplicate } from '@/lib/utils/duplicateDetection';
import { flexibleNameSearch } from '@/lib/utils/flexibleNameSearch';
import toast from 'react-hot-toast';

interface AddFamilyMembersModalProps {
    familyId: string;
    onClose: () => void;
    onAdded?: (guests: Guest[]) => void;
}

interface MemberRow {
    id: string;
    firstName: string;
    lastName: string;
    preferredName: string;
    age: string;
    gender: string;
    housingStatus: string;
    location: string;
    notes: string;
    showDetails: boolean;
}

const makeRowId = () => `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const titleCase = (value: string) => value.replace(/\b\w/g, (char) => char.toUpperCase());

const displayGuest = (guest: {
    preferredName?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
} | null | undefined) => {
    if (!guest) return 'Guest';
    return guest.preferredName
        || guest.name
        || `${guest.firstName || ''} ${guest.lastName || ''}`.trim()
        || 'Guest';
};

const makeRow = (primary?: Guest): MemberRow => ({
    id: makeRowId(),
    firstName: '',
    lastName: primary?.lastName || '',
    preferredName: '',
    age: 'Child 0-17',
    gender: 'Unknown',
    housingStatus: primary?.housingStatus || 'Unhoused',
    location: primary?.location || 'Mountain View',
    notes: '',
    showDetails: false,
});

export function AddFamilyMembersModal({ familyId, onClose, onAdded }: AddFamilyMembersModalProps) {
    const {
        guests,
        guestFamilies,
        guestFamilyMembers,
        addFamilyMembers,
        addGuestToFamily,
        setFamilyEnrollment,
    } = useGuestsStore();

    const family = useMemo(
        () => guestFamilies.find((item) => item.id === familyId),
        [guestFamilies, familyId],
    );
    const primary = useMemo(
        () => guests.find((guest) => guest.id === family?.primaryGuestId),
        [guests, family?.primaryGuestId],
    );
    const memberIds = useMemo(() => {
        const ids = new Set(
            guestFamilyMembers
                .filter((member) => member.familyId === familyId)
                .map((member) => member.guestId),
        );
        if (family?.primaryGuestId) ids.add(family.primaryGuestId);
        return ids;
    }, [guestFamilyMembers, familyId, family?.primaryGuestId]);
    const memberCount = memberIds.size;
    const primaryName = displayGuest(primary);

    const [rows, setRows] = useState<MemberRow[]>(() => [makeRow(primary)]);
    const [mode, setMode] = useState<'new' | 'existing'>('new');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [existingError, setExistingError] = useState('');
    const [addingExistingId, setAddingExistingId] = useState<string | null>(null);
    const [addedCount, setAddedCount] = useState(0);

    useEffect(() => {
        if (!primary) return;
        setRows((prev) => prev.map((row) => ({
            ...row,
            lastName: row.lastName || primary.lastName || '',
            housingStatus: row.housingStatus || primary.housingStatus || 'Unhoused',
            location: row.location || primary.location || 'Mountain View',
        })));
    }, [primary]);

    const duplicatesByRow = useMemo(() => {
        const result: Record<string, PotentialDuplicate[]> = {};
        for (const row of rows) {
            if (row.firstName.trim().length < 2 || row.lastName.trim().length < 2) continue;
            const matches = findPotentialDuplicates(row.firstName, row.lastName, guests)
                .filter((match) => !memberIds.has(match.guest.id) && match.guest.id !== family?.primaryGuestId)
                .slice(0, 2);
            if (matches.length > 0) result[row.id] = matches;
        }
        return result;
    }, [rows, guests, memberIds, family?.primaryGuestId]);

    const searchResults = useMemo(() => {
        const query = searchQuery.trim();
        if (query.length < 2) return [];
        return flexibleNameSearch(query, guests)
            .filter((guest) => !memberIds.has(guest.id))
            .slice(0, 12);
    }, [searchQuery, guests, memberIds]);

    const updateRow = (id: string, field: keyof MemberRow, value: string | boolean) => {
        setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
    };

    const addRow = () => {
        setRows((prev) => [...prev, makeRow(primary)]);
    };

    const removeRow = (id: string) => {
        setRows((prev) => (prev.length === 1 ? [makeRow(primary)] : prev.filter((row) => row.id !== id)));
    };

    const handleAddExisting = async (guest: Guest): Promise<boolean> => {
        setExistingError('');
        setAddingExistingId(guest.id);
        try {
            await addGuestToFamily(familyId, guest.id);
            if (!await setFamilyEnrollment(familyId, true)) {
                throw new Error('Member added, but household enrollment did not save. Please try again.');
            }
            toast.success(`${displayGuest(guest)} added to the household`);
            setSearchQuery('');
            return true;
        } catch (err) {
            setExistingError(err instanceof Error ? err.message : 'Unable to add this guest.');
            return false;
        } finally {
            setAddingExistingId(null);
        }
    };

    const handleUseExisting = async (rowId: string, match: PotentialDuplicate) => {
        const guest = guests.find((item) => item.id === match.guest.id);
        if (!guest) return;
        if (!await handleAddExisting(guest)) return;
        setRows((prev) => (prev.length === 1 ? [makeRow(primary)] : prev.filter((row) => row.id !== rowId)));
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');

        const filledRows = rows.filter(
            (row) => row.firstName.trim() || row.lastName.trim() || row.preferredName.trim(),
        );
        if (filledRows.length === 0) {
            setError('Add at least one person.');
            return;
        }
        if (filledRows.some((row) => !row.firstName.trim() || !row.lastName.trim())) {
            setError('Each person needs a first and last name.');
            return;
        }

        setIsSubmitting(true);
        try {
            const created = await addFamilyMembers(
                familyId,
                filledRows.map((row) => ({
                    firstName: row.firstName,
                    lastName: row.lastName,
                    preferredName: row.preferredName,
                    age: row.age,
                    gender: row.gender,
                    housingStatus: row.housingStatus,
                    location: row.location,
                    notes: row.notes,
                })),
            );
            setAddedCount(created.length);
            setRows([makeRow(primary)]);
            toast.success(`Added ${created.length} family member${created.length === 1 ? '' : 's'}`);
            onAdded?.(created);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to add family members.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const readyCount = rows.filter((row) => row.firstName.trim() && row.lastName.trim()).length;

    if (!family) {
        return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
                    <p className="text-sm font-semibold text-gray-700">This household could not be found.</p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.97, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <header className="flex items-start justify-between gap-3 border-b border-teal-100 bg-teal-50/70 p-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                            <Users size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tight text-gray-900">Add family members</h2>
                            <p className="mt-0.5 text-sm font-medium text-gray-600">
                                {primaryName}&apos;s household · {memberCount} member{memberCount === 1 ? '' : 's'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white hover:text-gray-600"
                        aria-label="Close add family members"
                    >
                        <X size={20} />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-5">
                    {!family.enrolledInFamilyMeal && (
                        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-900">
                            Adding a member enrolls this household in the Family Meal Program.
                        </div>
                    )}

                    {addedCount > 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <CheckCircle2 size={44} className="text-emerald-600" />
                            <h3 className="mt-3 text-lg font-black text-gray-900">
                                Added {addedCount} family member{addedCount === 1 ? '' : 's'}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {primaryName}&apos;s household now has {memberCount} member{memberCount === 1 ? '' : 's'}.
                            </p>
                            <div className="mt-5 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAddedCount(0);
                                        setRows([makeRow(primary)]);
                                    }}
                                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                                >
                                    Add more
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
                                <button
                                    type="button"
                                    onClick={() => setMode('new')}
                                    className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider transition-all ${mode === 'new' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'}`}
                                >
                                    New person
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('existing')}
                                    className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider transition-all ${mode === 'existing' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Existing guest
                                </button>
                            </div>

                            {mode === 'new' ? (
                                <form id="add-family-members-form" onSubmit={handleSubmit} className="space-y-4">
                                    {rows.map((row, index) => (
                                        <div key={row.id} className="rounded-2xl border border-teal-100 bg-teal-50/30 p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-teal-700">
                                                    Person {index + 1}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeRow(row.id)}
                                                    className="rounded-lg p-1 text-gray-400 hover:bg-white hover:text-rose-600"
                                                    aria-label={`Remove person ${index + 1}`}
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                                <input
                                                    value={row.firstName}
                                                    onChange={(event) => updateRow(row.id, 'firstName', titleCase(event.target.value))}
                                                    placeholder="First name"
                                                    aria-label={`First name ${index + 1}`}
                                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                />
                                                <input
                                                    value={row.lastName}
                                                    onChange={(event) => updateRow(row.id, 'lastName', titleCase(event.target.value))}
                                                    placeholder="Last name"
                                                    aria-label={`Last name ${index + 1}`}
                                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                />
                                                <input
                                                    value={row.preferredName}
                                                    onChange={(event) => updateRow(row.id, 'preferredName', titleCase(event.target.value))}
                                                    placeholder="Preferred name (optional)"
                                                    aria-label={`Preferred name ${index + 1}`}
                                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                />
                                                <select
                                                    value={row.age}
                                                    onChange={(event) => updateRow(row.id, 'age', event.target.value)}
                                                    aria-label={`Age group ${index + 1}`}
                                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                >
                                                    {AGE_GROUPS.map((group) => (
                                                        <option key={group} value={group}>{group}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => updateRow(row.id, 'showDetails', !row.showDetails)}
                                                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-800"
                                            >
                                                {row.showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                {row.showDetails ? 'Hide details' : 'More details'}
                                            </button>

                                            {row.showDetails && (
                                                <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                                    <select
                                                        value={row.gender}
                                                        onChange={(event) => updateRow(row.id, 'gender', event.target.value)}
                                                        aria-label={`Gender ${index + 1}`}
                                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                    >
                                                        {GENDERS.map((gender) => (
                                                            <option key={gender} value={gender}>{gender}</option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        value={row.housingStatus}
                                                        onChange={(event) => updateRow(row.id, 'housingStatus', event.target.value)}
                                                        aria-label={`Housing status ${index + 1}`}
                                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                                    >
                                                        {HOUSING_STATUSES.map((status) => (
                                                            <option key={status} value={status}>{status}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        value={row.location}
                                                        onChange={(event) => updateRow(row.id, 'location', event.target.value)}
                                                        placeholder="Location"
                                                        aria-label={`Location ${index + 1}`}
                                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 sm:col-span-2"
                                                    />
                                                    <textarea
                                                        value={row.notes}
                                                        onChange={(event) => updateRow(row.id, 'notes', event.target.value)}
                                                        placeholder="Notes (optional)"
                                                        aria-label={`Notes ${index + 1}`}
                                                        rows={2}
                                                        className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 sm:col-span-2"
                                                    />
                                                </div>
                                            )}

                                            {duplicatesByRow[row.id]?.length > 0 && (
                                                <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                                                    <p className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-amber-900">
                                                        <AlertCircle size={13} /> Possible existing guest
                                                    </p>
                                                    {duplicatesByRow[row.id].map((match) => (
                                                        <div key={match.guest.id} className="mt-1.5 flex items-center justify-between gap-2">
                                                            <span className="min-w-0 truncate text-xs font-medium text-amber-900">
                                                                {displayGuest(match.guest)} · {match.reason}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => void handleUseExisting(row.id, match)}
                                                                disabled={Boolean(addingExistingId)}
                                                                className="shrink-0 rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                                                            >
                                                                Use existing
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={addRow}
                                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-teal-300 bg-white py-2.5 text-xs font-black uppercase tracking-wider text-teal-700 hover:bg-teal-50"
                                    >
                                        <Plus size={14} /> Add another person
                                    </button>

                                    {error && (
                                        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
                                            {error}
                                        </p>
                                    )}
                                </form>
                            ) : (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            value={searchQuery}
                                            onChange={(event) => setSearchQuery(event.target.value)}
                                            placeholder="Search by name to add an existing guest"
                                            aria-label="Search existing guests"
                                            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                        />
                                    </div>

                                    {existingError && (
                                        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
                                            {existingError}
                                        </p>
                                    )}

                                    {searchQuery.trim().length < 2 ? (
                                        <p className="py-8 text-center text-xs font-semibold text-gray-400">
                                            Type at least two characters to find someone already in the system.
                                        </p>
                                    ) : searchResults.length === 0 ? (
                                        <p className="py-8 text-center text-xs font-semibold text-gray-400">
                                            No guests found outside this household.
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {searchResults.map((guest) => {
                                                const membership = guestFamilyMembers.find((member) => member.guestId === guest.id);
                                                const otherFamily = guestFamilies.find(
                                                    (item) => item.id === membership?.familyId || item.primaryGuestId === guest.id,
                                                );
                                                const otherPrimary = otherFamily
                                                    ? guests.find((item) => item.id === otherFamily.primaryGuestId)
                                                    : null;
                                                return (
                                                    <div
                                                        key={guest.id}
                                                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-bold text-gray-900">{displayGuest(guest)}</p>
                                                            <p className="mt-0.5 truncate text-xs text-gray-500">
                                                                {guest.age || 'Unknown age'} · {guest.housingStatus || 'Unknown housing'} · {guest.location || 'Unknown location'}
                                                            </p>
                                                            {otherFamily && (
                                                                <p className="mt-0.5 truncate text-[11px] font-semibold text-amber-700">
                                                                    Already in {displayGuest(otherPrimary)}&apos;s household
                                                                </p>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleAddExisting(guest)}
                                                            disabled={addingExistingId === guest.id}
                                                            aria-label={`Add ${displayGuest(guest)} to household`}
                                                            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                                        >
                                                            {addingExistingId === guest.id
                                                                ? <Loader2 size={13} className="animate-spin" />
                                                                : <UserPlus size={13} />}
                                                            Add
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {addedCount === 0 && mode === 'new' && (
                    <footer className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 p-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="add-family-members-form"
                            disabled={isSubmitting || readyCount === 0}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                            Add {readyCount > 0 ? `${readyCount} ` : ''}family member{readyCount === 1 ? '' : 's'}
                        </button>
                    </footer>
                )}
            </motion.div>
        </div>
    );
}
