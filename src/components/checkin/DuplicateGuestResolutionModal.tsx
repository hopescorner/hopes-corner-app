'use client';

import { useState } from 'react';
import { AlertTriangle, ArrowRight, Loader2, X } from 'lucide-react';
import type { PotentialDuplicatePair } from '@/lib/utils/duplicateDetection';

type MergeSelection = { keepGuestId: string; duplicateGuestId: string };
type DismissSelection = { firstGuestId: string; secondGuestId: string };

const displayId = (guest: PotentialDuplicatePair['first']) => guest.guestId || guest.id.slice(0, 8);
const displayName = (guest: PotentialDuplicatePair['first']) =>
    guest.preferredName || `${guest.firstName || ''} ${guest.lastName || ''}`.trim();

export function DuplicateGuestResolutionModal({
    pair,
    onClose,
    onMerge,
    onDismiss,
}: {
    pair: PotentialDuplicatePair;
    onClose: () => void;
    onMerge: (selection: MergeSelection) => Promise<void>;
    onDismiss: (selection: DismissSelection) => Promise<void>;
}) {
    const [selection, setSelection] = useState<MergeSelection | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const [isPending, setIsPending] = useState(false);

    const chooseKeeper = (keepFirst: boolean) => {
        setSelection({
            keepGuestId: keepFirst ? pair.first.id : pair.second.id,
            duplicateGuestId: keepFirst ? pair.second.id : pair.first.id,
        });
        setConfirmed(false);
    };

    const handleMerge = async () => {
        if (!selection || !confirmed || isPending) return;
        setIsPending(true);
        try {
            await onMerge(selection);
        } finally {
            setIsPending(false);
        }
    };

    const handleDismiss = async () => {
        if (isPending) return;
        setIsPending(true);
        try {
            await onDismiss({ firstGuestId: pair.first.id, secondGuestId: pair.second.id });
        } finally {
            setIsPending(false);
        }
    };

    const keepGuest = selection?.keepGuestId === pair.first.id ? pair.first : pair.second;
    const duplicateGuest = selection?.duplicateGuestId === pair.first.id ? pair.first : pair.second;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="duplicate-resolution-title">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-start gap-4 border-b border-amber-200 bg-amber-50 p-6">
                    <div className="rounded-full bg-amber-100 p-3 text-amber-700"><AlertTriangle size={24} /></div>
                    <div className="flex-1">
                        <h2 id="duplicate-resolution-title" className="text-xl font-black text-gray-900">Resolve duplicate guest profiles</h2>
                        <p className="mt-1 text-sm text-gray-600">{pair.reason}. Choose the one profile that should remain.</p>
                    </div>
                    <button type="button" onClick={onClose} disabled={isPending} aria-label="Close duplicate review" className="rounded-lg p-2 text-gray-500 hover:bg-white disabled:opacity-50"><X size={20} /></button>
                </div>

                <div className="space-y-5 p-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                        {[pair.first, pair.second].map((guest, index) => (
                            <div key={guest.id} className="rounded-xl border-2 border-gray-200 p-4">
                                <p className="text-lg font-black text-gray-900">{displayName(guest)}</p>
                                <p className="mt-1 text-sm font-semibold text-gray-600">ID: {displayId(guest)}</p>
                                <p className="mt-2 text-xs text-gray-600">
                                    {[guest.location, guest.age, guest.gender, guest.housingStatus].filter(Boolean).join(' · ') || 'No demographic details'}
                                </p>
                                {'createdAt' in guest && typeof guest.createdAt === 'string' && guest.createdAt && (
                                    <p className="mt-1 text-xs text-gray-500">Created {new Date(guest.createdAt).toLocaleDateString()}</p>
                                )}
                                <button
                                    type="button"
                                    onClick={() => chooseKeeper(index === 0)}
                                    className="mt-4 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                                >
                                    Keep {displayId(guest)}
                                </button>
                            </div>
                        ))}
                    </div>

                    {selection && keepGuest && duplicateGuest && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-red-800">
                                <span>{displayId(duplicateGuest)}</span><ArrowRight size={16} /><span>{displayId(keepGuest)}</span>
                            </div>
                            <p className="mt-2 text-sm text-red-700">Records from {displayId(duplicateGuest)} will transfer to {displayId(keepGuest)}, then {displayId(duplicateGuest)} will be permanently deleted.</p>
                            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-semibold text-gray-800">
                                <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4" />
                                <span>I understand that the duplicate profile will be deleted after its history is consolidated.</span>
                            </label>
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={handleDismiss} disabled={isPending} className="mr-auto rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 font-bold text-amber-900 disabled:opacity-50">These are different people</button>
                        <button type="button" onClick={onClose} disabled={isPending} className="rounded-xl border border-gray-300 px-4 py-2.5 font-bold text-gray-700 disabled:opacity-50">Cancel</button>
                        <button type="button" onClick={handleMerge} disabled={!selection || !confirmed || isPending} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
                            {isPending && <Loader2 size={17} className="animate-spin" />}
                            Merge profiles
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
