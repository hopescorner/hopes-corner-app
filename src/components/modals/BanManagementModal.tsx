'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Ban, Loader2, AlertTriangle, ShowerHead, WashingMachine, Utensils, Bike, Calendar } from 'lucide-react';
import { useGuestsStore } from '@/stores/useGuestsStore';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils/cn';
import { GuestBanNotice } from '@/components/guests/GuestBanNotice';

interface BanManagementModalProps {
    guest: any;
    onClose: () => void;
}

export function BanManagementModal({ guest, onClose }: BanManagementModalProps) {
    const { banGuest, clearGuestBan } = useGuestsStore();
    const [isPending, setIsPending] = useState(false);
    const [banUntil, setBanUntil] = useState(() => {
        // Default to 1 month from now
        const date = new Date();
        date.setMonth(date.getMonth() + 1);
        return date.toISOString().split('T')[0];
    });
    const [banReason, setBanReason] = useState(guest.banReason || '');

    // Program-specific bans
    const [bannedFromMeals, setBannedFromMeals] = useState(guest.bannedFromMeals || false);
    const [bannedFromShower, setBannedFromShower] = useState(guest.bannedFromShower || false);
    const [bannedFromLaundry, setBannedFromLaundry] = useState(guest.bannedFromLaundry || false);
    const [bannedFromBicycle, setBannedFromBicycle] = useState(guest.bannedFromBicycle || false);

    const isBanned = guest.isBanned;
    const hasAnyProgramBan = bannedFromMeals || bannedFromShower || bannedFromLaundry || bannedFromBicycle;

    const handleBan = async () => {
        if (!banReason.trim()) {
            toast.error('Please provide a reason for the ban');
            return;
        }

        setIsPending(true);
        try {
            await banGuest(guest.id, {
                banReason: banReason.trim(),
                bannedUntil: banUntil,
                // If specific programs selected, use them. Otherwise blanket ban.
                bannedFromMeals: hasAnyProgramBan ? bannedFromMeals : true,
                bannedFromShower: hasAnyProgramBan ? bannedFromShower : true,
                bannedFromLaundry: hasAnyProgramBan ? bannedFromLaundry : true,
                bannedFromBicycle: hasAnyProgramBan ? bannedFromBicycle : true,
            });
            toast.success(`${guest.preferredName || guest.name} has been banned`);
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to ban guest');
        } finally {
            setIsPending(false);
        }
    };

    const handleLiftBan = async () => {
        setIsPending(true);
        try {
            await clearGuestBan(guest.id);
            toast.success(`Ban lifted for ${guest.preferredName || guest.name}`);
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to lift ban');
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg",
                            isBanned ? "bg-red-500 shadow-red-200" : "bg-amber-500 shadow-amber-200"
                        )}>
                            <Ban size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                                {isBanned ? 'Manage Ban' : 'Ban Guest'}
                            </h2>
                            <p className="text-sm text-gray-500 font-medium">
                                {guest.preferredName || guest.name}
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

                {/* Content */}
                <div className="p-6 space-y-6">
                    {isBanned && (
                        <GuestBanNotice guest={guest} title="Currently Banned" />
                    )}

                    {/* Ban Until Date */}
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Calendar size={14} />
                            Ban Until
                        </label>
                        <input
                            type="date"
                            value={banUntil}
                            onChange={(e) => setBanUntil(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all font-bold outline-none"
                        />
                    </div>

                    {/* Ban Reason */}
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
                            Reason for Ban *
                        </label>
                        <textarea
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            rows={3}
                            placeholder="Describe the reason for the ban..."
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all font-medium outline-none resize-none"
                        />
                    </div>

                    {/* Program-Specific Bans */}
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-3">
                            Ban From Specific Programs (optional)
                        </label>
                        <p className="text-xs text-gray-400 mb-3">Leave all unchecked for a blanket ban from all services.</p>
                        <div className="grid grid-cols-2 gap-3">
                            <label className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                                bannedFromMeals ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"
                            )}>
                                <input
                                    type="checkbox"
                                    checked={bannedFromMeals}
                                    onChange={(e) => setBannedFromMeals(e.target.checked)}
                                    className="sr-only"
                                />
                                <Utensils size={20} className={bannedFromMeals ? "text-red-500" : "text-gray-400"} />
                                <span className={cn("font-bold text-sm", bannedFromMeals ? "text-red-700" : "text-gray-600")}>Meals</span>
                            </label>
                            <label className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                                bannedFromShower ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"
                            )}>
                                <input
                                    type="checkbox"
                                    checked={bannedFromShower}
                                    onChange={(e) => setBannedFromShower(e.target.checked)}
                                    className="sr-only"
                                />
                                <ShowerHead size={20} className={bannedFromShower ? "text-red-500" : "text-gray-400"} />
                                <span className={cn("font-bold text-sm", bannedFromShower ? "text-red-700" : "text-gray-600")}>Showers</span>
                            </label>
                            <label className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                                bannedFromLaundry ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"
                            )}>
                                <input
                                    type="checkbox"
                                    checked={bannedFromLaundry}
                                    onChange={(e) => setBannedFromLaundry(e.target.checked)}
                                    className="sr-only"
                                />
                                <WashingMachine size={20} className={bannedFromLaundry ? "text-red-500" : "text-gray-400"} />
                                <span className={cn("font-bold text-sm", bannedFromLaundry ? "text-red-700" : "text-gray-600")}>Laundry</span>
                            </label>
                            <label className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                                bannedFromBicycle ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"
                            )}>
                                <input
                                    type="checkbox"
                                    checked={bannedFromBicycle}
                                    onChange={(e) => setBannedFromBicycle(e.target.checked)}
                                    className="sr-only"
                                />
                                <Bike size={20} className={bannedFromBicycle ? "text-red-500" : "text-gray-400"} />
                                <span className={cn("font-bold text-sm", bannedFromBicycle ? "text-red-700" : "text-gray-600")}>Bicycle</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
                    {isBanned && (
                        <button
                            onClick={handleLiftBan}
                            disabled={isPending}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-all disabled:opacity-50"
                        >
                            Lift Ban
                        </button>
                    )}
                    <div className="flex items-center gap-3 ml-auto">
                        <button
                            onClick={onClose}
                            disabled={isPending}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleBan}
                            disabled={isPending}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {isPending && <Loader2 size={16} className="animate-spin" />}
                            {isBanned ? 'Update Ban' : 'Ban Guest'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
