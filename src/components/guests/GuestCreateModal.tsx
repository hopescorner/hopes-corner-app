'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { X, UserPlus, Loader2, Home, MapPin, User, Users, Info, AlertCircle } from 'lucide-react';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { HOUSING_STATUSES, AGE_GROUPS, GENDERS } from '@/lib/constants/constants';
import toast from 'react-hot-toast';
import { findPotentialDuplicates } from '@/lib/utils/duplicateDetection';

interface GuestCreateModalProps {
    onClose: () => void;
    initialName?: string;
    defaultLocation?: string;
}

const BAY_AREA_CITIES = [
    'Campbell', 'Cupertino', 'Gilroy', 'Los Altos Hills', 'Los Altos', 'Los Gatos',
    'Milpitas', 'Monte Sereno', 'Morgan Hill', 'Mountain View', 'Palo Alto',
    'San Jose', 'Santa Clara', 'Saratoga', 'Sunnyvale', 'Outside Santa Clara County'
];

export function GuestCreateModal({ onClose, initialName = '', defaultLocation = '' }: GuestCreateModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [duplicateWarning, setDuplicateWarning] = useState('');
    const prefersReducedMotion = useReducedMotion();

    const { guests, addGuest } = useGuestsStore();

    const nameParts = useMemo(() => initialName.trim().split(/\s+/), [initialName]);
    const initialFirstName = nameParts[0] || '';
    const initialLastName = nameParts.slice(1).join(' ') || '';

    const [formData, setFormData] = useState({
        firstName: initialFirstName,
        lastName: initialLastName,
        preferredName: '',
        housingStatus: 'Unhoused',
        age: 'Adult 18-59',
        gender: 'Unknown',
        location: defaultLocation || '',
        notes: '',
        bicycleDescription: '',
    });

    const toTitleCase = (str: string) => {
        return str.replace(/\b\w/g, char => char.toUpperCase());
    };

    // Check for duplicates
    useEffect(() => {
        const { firstName, lastName } = formData;
        if (!firstName || !lastName || firstName.length < 2 || lastName.length < 2) {
            setDuplicateWarning('');
            return;
        }

        const timer = setTimeout(() => {
            const duplicates = findPotentialDuplicates(firstName, lastName, guests);
            if (duplicates.length > 0) {
                const topMatch = duplicates[0];
                const matchName = `${topMatch.guest.firstName} ${topMatch.guest.lastName}`;
                const preferred = topMatch.guest.preferredName ? ` "${topMatch.guest.preferredName}"` : "";
                setDuplicateWarning(`Possible duplicate: ${matchName}${preferred} (${topMatch.reason})`);
            } else {
                setDuplicateWarning('');
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.firstName, formData.lastName, guests]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            await addGuest(formData);
            toast.success('Guest added successfully');
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to add guest');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={prefersReducedMotion ? false : { scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={prefersReducedMotion ? undefined : { scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 bg-emerald-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <UserPlus size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Add New Guest</h2>
                            <p className="text-sm text-gray-500">Create a new guest record in the system</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Name Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <User size={14} /> Name Information
                            </h3>

                            {duplicateWarning && (
                                <div className="flex items-center gap-2 p-3 text-sm text-amber-800 bg-amber-50 rounded-xl border border-amber-200">
                                    <AlertCircle size={18} className="flex-shrink-0" />
                                    <span>{duplicateWarning}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 ml-1">First Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: toTitleCase(e.target.value) })}
                                        placeholder="e.g. John"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 ml-1">Last Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: toTitleCase(e.target.value) })}
                                        placeholder="e.g. Smith"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 ml-1">Preferred Name</label>
                                <input
                                    type="text"
                                    value={formData.preferredName}
                                    onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                                    placeholder="The name they want us to call them"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                />
                            </div>
                        </div>

                        {/* Status Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Home size={14} /> Status & Background
                            </h3>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 ml-1">Housing Status</label>
                                <select
                                    value={formData.housingStatus}
                                    onChange={(e) => setFormData({ ...formData, housingStatus: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none bg-white"
                                >
                                    {HOUSING_STATUSES.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 ml-1">Age Group</label>
                                    <select
                                        value={formData.age}
                                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none bg-white"
                                    >
                                        {AGE_GROUPS.map(group => (
                                            <option key={group} value={group}>{group}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 ml-1">Gender</label>
                                    <select
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none bg-white"
                                    >
                                        {GENDERS.map(gender => (
                                            <option key={gender} value={gender}>{gender}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Location & Utilities */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <MapPin size={14} /> Location
                            </h3>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 ml-1">Primary Location</label>
                                <select
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none bg-white"
                                >
                                    <option value="">Select city</option>
                                    {BAY_AREA_CITIES.map((city) => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Info size={14} /> Other Details
                            </h3>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 ml-1">Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Any important information staff should know..."
                                    rows={2}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none resize-none"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 ml-1">Bicycle Description</label>
                                <input
                                    type="text"
                                    value={formData.bicycleDescription}
                                    onChange={(e) => setFormData({ ...formData, bicycleDescription: e.target.value })}
                                    placeholder="Color, brand, distinguishing features..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-8 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:shadow-emerald-300 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                        Create Guest
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
