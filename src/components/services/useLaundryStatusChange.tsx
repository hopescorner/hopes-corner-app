'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { useServicesStore } from '@/stores/useServicesStore';
import { laundryBagRequired, type LaundryBagGateRecord } from '@/lib/utils/laundryBag';
import toast from 'react-hot-toast';

type Booking = LaundryBagGateRecord & { id: string; guestId?: string };

export const LAUNDRY_NEXT_ACTION: Record<string, { status: string; label: string }> = {
    waiting: { status: 'washer', label: 'Start washer' },
    washer: { status: 'dryer', label: 'Move to dryer' },
    dryer: { status: 'done', label: 'Ready for pickup' },
    done: { status: 'picked_up', label: 'Mark picked up' },
    pending: { status: 'transported', label: 'Mark transported' },
    transported: { status: 'returned', label: 'Mark returned' },
    returned: { status: 'offsite_picked_up', label: 'Mark picked up' },
};

export function useLaundryStatusChange(readOnly: boolean) {
    const { updateLaundryStatus, updateLaundryBagNumber } = useServicesStore(useShallow((s) => ({
        updateLaundryStatus: s.updateLaundryStatus,
        updateLaundryBagNumber: s.updateLaundryBagNumber,
    })));
    const busy = useRef(new Set<string>());
    const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
    const [pending, setPending] = useState<{ record: Booking; status: string; name: string } | null>(null);
    const [bag, setBag] = useState('');
    const [error, setError] = useState('');

    const save = useCallback(async (record: Booking, status: string, bagNumber?: string) => {
        if (readOnly || busy.current.has(record.id)) return;
        busy.current.add(record.id);
        setUpdatingIds(new Set(busy.current));
        setError('');
        try {
            if (bagNumber !== undefined && await updateLaundryBagNumber(record.id, bagNumber) === false) {
                throw new Error('Failed to save bag number');
            }
            const ok = await updateLaundryStatus(record.id, status);
            if (!ok) throw new Error('Failed to update status');
            setPending(null);
            toast.success('Status updated');
        } catch (cause) {
            const message = cause instanceof Error ? cause.message : 'Failed to update status';
            setError(message);
            toast.error(message);
        } finally {
            busy.current.delete(record.id);
            setUpdatingIds(new Set(busy.current));
        }
    }, [readOnly, updateLaundryBagNumber, updateLaundryStatus]);

    const changeStatus = useCallback(async (record: Booking, status: string, name = 'Guest') => {
        if (readOnly || busy.current.has(record.id)) return;
        const fresh = useServicesStore.getState?.().laundryRecords?.find((r) => r.id === record.id) ?? record;
        if (laundryBagRequired(fresh, status)) {
            setBag('');
            setError('');
            setPending({ record: fresh, status, name });
            return;
        }
        await save(fresh, status);
    }, [readOnly, save]);

    const bagDialog = pending ? <BagNumberDialog
        name={pending.name}
        bag={bag}
        error={error}
        busy={updatingIds.has(pending.record.id)}
        onChange={setBag}
        onCancel={() => setPending(null)}
        onSave={() => {
            if (!bag.trim()) { setError('Enter a bag number to continue'); return; }
            void save(pending.record, pending.status, bag.trim());
        }}
    /> : null;

    return { changeStatus, updatingIds, bagDialog };
}

function BagNumberDialog({ name, bag, error, busy, onChange, onCancel, onSave }: {
    name: string; bag: string; error: string; busy: boolean;
    onChange: (value: string) => void; onCancel: () => void; onSave: () => void;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const previousFocus = document.activeElement as HTMLElement | null;
        if (typeof dialog.current?.showModal === 'function') dialog.current.showModal();
        else dialog.current?.setAttribute('open', '');
        return () => previousFocus?.focus();
    }, []);
    return createPortal(
        <dialog ref={dialog} role="dialog" aria-modal="true" aria-labelledby="bag-dialog-title"
            onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}
            className="fixed inset-x-4 top-[10dvh] bottom-auto m-auto w-auto max-w-md max-h-[70dvh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl backdrop:bg-black/50 z-[120]">
            <form onSubmit={(event) => { event.preventDefault(); onSave(); }} className="space-y-4">
                <h2 id="bag-dialog-title" className="text-xl font-bold text-gray-900">Bag number required</h2>
                <p className="text-base text-gray-700">{name}</p>
                <p className="text-sm text-gray-600">Enter the bag number before changing this load&apos;s status.</p>
                <label className="block text-base font-medium text-gray-900">
                    Bag number
                    <input autoFocus value={bag} onChange={(event) => onChange(event.target.value)} disabled={busy}
                        autoComplete="off" className="mt-2 block min-h-11 w-full rounded-lg border border-gray-300 px-3 text-base" />
                </label>
                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                <div className="flex flex-wrap justify-end gap-3">
                    <button type="button" disabled={busy} onClick={onCancel} className="min-h-11 rounded-lg border px-4 text-base">Cancel</button>
                    <button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-purple-600 px-4 text-base font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save and continue'}</button>
                </div>
            </form>
        </dialog>, document.body,
    );
}
