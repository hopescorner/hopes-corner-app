'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, User, Loader2, Bike, Trash2, Users } from 'lucide-react';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { GuestDeleteWithTransferModal } from './GuestDeleteWithTransferModal';
import toast from 'react-hot-toast';

interface GuestEditModalProps {
    guest: any;
    onClose: () => void;
}

import { HOUSING_STATUSES, AGE_GROUPS, GENDERS } from '@/lib/constants/constants';
const BAY_AREA_CITIES = [
    'Campbell', 'Cupertino', 'Gilroy', 'Los Altos Hills', 'Los Altos', 'Los Gatos',
    'Milpitas', 'Monte Sereno', 'Morgan Hill', 'Mountain View', 'Palo Alto',
    'San Jose', 'Santa Clara', 'Saratoga', 'Sunnyvale', 'Outside Santa Clara County'
];

const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

export function GuestEditModal({ guest, onClose }: GuestEditModalProps) {
    const {
        updateGuest,
        guests,
        guestFamilies,
        guestFamilyMembers,
        createFamilyForPrimary,
        addGuestToFamily,
        setFamilyEnrollment,
    } = useGuestsStore();
    const currentMembership = useMemo(
        () => (guestFamilyMembers || []).find((member) => member.guestId === guest.id),
        [guestFamilyMembers, guest.id],
    );
    const currentFamily = useMemo(
        () => (guestFamilies || []).find((family) => family.id === currentMembership?.familyId || family.primaryGuestId === guest.id),
        [guestFamilies, currentMembership?.familyId, guest.id],
    );
    const familyOptions = useMemo(() => {
        return (guestFamilies || [])
            .filter((family) => family.enrolledInFamilyMeal || family.id === currentFamily?.id)
            .map((family) => {
                const primaryGuest = guests.find((candidate) => candidate.id === family.primaryGuestId);
                const name = primaryGuest
                    ? (primaryGuest.preferredName || primaryGuest.name || `${primaryGuest.firstName || ''} ${primaryGuest.lastName || ''}`.trim())
                    : 'Unknown Primary';
                return { id: family.id, name };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [guestFamilies, guests, currentFamily?.id]);
    const [isPending, setIsPending] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [familyEnrolled, setFamilyEnrolled] = useState(currentFamily?.enrolledInFamilyMeal === true);
    const [familyMode, setFamilyMode] = useState<'primary' | 'member'>(
        currentFamily && currentFamily.primaryGuestId !== guest.id ? 'member' : 'primary'
    );
    const [selectedFamilyId, setSelectedFamilyId] = useState(currentFamily?.id || '');
    const [formData, setFormData] = useState({
        firstName: guest.firstName || '',
        lastName: guest.lastName || '',
        preferredName: guest.preferredName || '',
        housingStatus: guest.housingStatus || 'Unhoused',
        location: guest.location || '',
        age: guest.age || '',
        gender: guest.gender || '',
        notes: guest.notes || '',
        bicycleDescription: guest.bicycleDescription || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const transformed =
            name === 'firstName' || name === 'lastName' || name === 'preferredName'
                ? toTitleCase(value)
                : value;
        setFormData((prev) => ({ ...prev, [name]: transformed }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            toast.error('Please enter both first and last name');
            return;
        }
        if (!formData.age || !formData.gender) {
            toast.error('Please select age and gender');
            return;
        }
        if (familyEnrolled && familyMode === 'member' && !selectedFamilyId) {
            toast.error('Please select a family household');
            return;
        }

        setIsPending(true);
        try {
            const updates = {
                ...formData,
                firstName: toTitleCase(formData.firstName.trim()),
                lastName: toTitleCase(formData.lastName.trim()),
                preferredName: formData.preferredName?.trim() || '',
                bicycleDescription: formData.bicycleDescription?.trim() || '',
                name: `${toTitleCase(formData.firstName.trim())} ${toTitleCase(formData.lastName.trim())}`.trim(),
            };
            await updateGuest(guest.id, updates);
            if (familyEnrolled) {
                if (familyMode === 'member') {
                    await addGuestToFamily(selectedFamilyId, guest.id);
                    await setFamilyEnrollment(selectedFamilyId, true);
                } else {
                    const family = currentFamily?.primaryGuestId === guest.id
                        ? currentFamily
                        : await createFamilyForPrimary(guest.id, true);
                    if (!family?.id) throw new Error('Unable to create family household');
                    await setFamilyEnrollment(family.id, true);
                }
            } else if (currentFamily) {
                await setFamilyEnrollment(currentFamily.id, false);
            }
            toast.success('Guest updated');
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update guest');
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 bg-blue-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                            <User size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Edit Guest</h2>
                            <p className="text-sm text-gray-500 font-medium">
                                Editing <span className="text-blue-600 font-bold">{guest.preferredName || guest.name}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isPending}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Name Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">First Name *</label>
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-lg font-bold outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Last Name *</label>
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-lg font-bold outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Preferred Name</label>
                        <input
                            type="text"
                            name="preferredName"
                            value={formData.preferredName}
                            onChange={handleChange}
                            placeholder="Nickname or name they go by"
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium outline-none"
                        />
                    </div>

                    {/* Demographics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Age Group *</label>
                            <select
                                name="age"
                                value={formData.age}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold outline-none bg-white"
                            >
                                <option value="">Select age group</option>
                                {AGE_GROUPS.map((age) => (
                                    <option key={age} value={age}>{age}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Gender *</label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold outline-none bg-white"
                            >
                                <option value="">Select gender</option>
                                {GENDERS.map((g) => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Housing & Location */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Housing Status</label>
                            <select
                                name="housingStatus"
                                value={formData.housingStatus}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold outline-none bg-white"
                            >
                                {HOUSING_STATUSES.map((status) => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Location</label>
                            <select
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold outline-none bg-white"
                            >
                                <option value="">Select city</option>
                                {BAY_AREA_CITIES.map((city) => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4 space-y-3">
                        <h3 className="text-xs font-black text-teal-700 uppercase tracking-wider flex items-center gap-2">
                            <Users size={14} />
                            Family Meal Program
                        </h3>
                        <label className="flex items-start gap-3 text-sm font-semibold text-gray-800">
                            <input
                                type="checkbox"
                                checked={familyEnrolled}
                                onChange={(event) => setFamilyEnrolled(event.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-teal-300 text-teal-600"
                            />
                            <span>
                                Enroll household in Family Meal Program
                                <span className="block text-xs font-medium text-gray-500">Separate from check-in buddies and regular guest meals.</span>
                            </span>
                        </label>

                        {familyEnrolled && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFamilyMode('primary')}
                                        className={`rounded-xl border px-3 py-2 text-left text-xs font-black uppercase tracking-wider transition-all ${familyMode === 'primary' ? 'border-teal-500 bg-white text-teal-700' : 'border-teal-100 bg-white/70 text-gray-500'}`}
                                    >
                                        Primary Household Member
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFamilyMode('member')}
                                        className={`rounded-xl border px-3 py-2 text-left text-xs font-black uppercase tracking-wider transition-all ${familyMode === 'member' ? 'border-teal-500 bg-white text-teal-700' : 'border-teal-100 bg-white/70 text-gray-500'}`}
                                    >
                                        Member of Existing Family
                                    </button>
                                </div>

                                {familyMode === 'member' && (
                                    <select
                                        value={selectedFamilyId}
                                        onChange={(event) => setSelectedFamilyId(event.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border-2 border-teal-100 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all font-bold outline-none bg-white"
                                        aria-label="Family household"
                                    >
                                        <option value="">Select household</option>
                                        {familyOptions.map((family) => (
                                            <option key={family.id} value={family.id}>{family.name} Household</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Notes</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Any special notes about this guest..."
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium outline-none resize-none"
                        />
                    </div>

                    {/* Bicycle Description */}
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Bike size={14} />
                            Bicycle Description
                        </label>
                        <input
                            type="text"
                            name="bicycleDescription"
                            value={formData.bicycleDescription}
                            onChange={handleChange}
                            placeholder="Color, brand, distinguishing features..."
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium outline-none"
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        disabled={isPending}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 border-2 border-red-200 hover:border-red-300 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        <Trash2 size={16} />
                        Delete Guest
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isPending}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={isPending}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {isPending && <Loader2 size={16} className="animate-spin" />}
                            Save Changes
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Delete Modal */}
            {showDeleteModal && (
                <GuestDeleteWithTransferModal
                    guest={guest}
                    onClose={() => setShowDeleteModal(false)}
                    onDeleted={onClose}
                />
            )}
        </div>
    );
}
