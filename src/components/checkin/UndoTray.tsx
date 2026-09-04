'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { useActionHistoryStore, type ActionType } from '@/stores/useActionHistoryStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useCheckInStore } from '@/stores/useCheckInStore';
import toast from 'react-hot-toast';

const AUTO_DISMISS_MS = 6000;
const FRESH_MS = 8000;

const ACTION_LABELS: Record<ActionType, string> = {
    MEAL_ADDED: 'Meal',
    EXTRA_MEALS_ADDED: 'Extra meal',
    SHOWER_BOOKED: 'Shower',
    LAUNDRY_BOOKED: 'Laundry',
    BICYCLE_LOGGED: 'Bicycle',
    HAIRCUT_LOGGED: 'Haircut',
    HOLIDAY_LOGGED: 'Holiday',
};

function getGuestName(guest: { preferredName?: string; name?: string; firstName?: string; lastName?: string } | undefined): string {
    if (!guest) return 'Guest';
    return guest.preferredName?.trim()
        || guest.name?.trim()
        || `${guest.firstName || ''} ${guest.lastName || ''}`.trim()
        || 'Guest';
}

export function UndoTray() {
    const latestAction = useActionHistoryStore((s) => s.actionHistory[0]);
    const undoAction = useActionHistoryStore((s) => s.undoAction);
    const guests = useGuestsStore((s) => s.guests);
    const snapshotReady = useCheckInStore((s) => s.isReady);
    const applySnapshotUndo = useCheckInStore((s) => s.applyUndo);
    const [dismissedId, setDismissedId] = useState<string | null>(null);
    const [isUndoing, setIsUndoing] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isFresh = latestAction
        ? Date.now() - new Date(latestAction.timestamp).getTime() < FRESH_MS
        : false;
    const visible = Boolean(latestAction && isFresh) && latestAction.id !== dismissedId;

    useEffect(() => {
        if (!latestAction || !isFresh || latestAction.id === dismissedId) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            setDismissedId(latestAction.id);
        }, AUTO_DISMISS_MS);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [latestAction, isFresh, dismissedId]);

    if (!visible) return null;

    const guest = guests.find((g) => g.id === latestAction.data.guestId);
    const label = ACTION_LABELS[latestAction.type] ?? 'Action';
    const guestName = getGuestName(guest);

    const handleUndo = async () => {
        if (isUndoing) return;
        setIsUndoing(true);
        try {
            const success = await undoAction(latestAction.id);
            if (success) {
                if (snapshotReady) {
                    applySnapshotUndo({
                        type: latestAction.type,
                        guestId: latestAction.data.guestId,
                        recordId: latestAction.data.recordId,
                        quantity: latestAction.data.quantity,
                    });
                }
                toast.success(`${label} undone`);
            } else {
                toast.error('Failed to undo action');
            }
        } finally {
            setIsUndoing(false);
            setDismissedId(latestAction.id);
        }
    };

    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed bottom-28 md:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-xl"
        >
            <span className="text-sm font-bold text-gray-900">
                {label} · {guestName}
            </span>
            <button
                type="button"
                onClick={handleUndo}
                disabled={isUndoing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-100 border border-orange-200 px-3 py-1.5 text-sm font-bold text-orange-700 hover:bg-orange-200 active:scale-95 transition-all touch-manipulation disabled:opacity-50"
            >
                <RotateCcw size={14} />
                Undo
            </button>
            <button
                type="button"
                onClick={() => setDismissedId(latestAction.id)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors touch-manipulation"
                aria-label="Dismiss"
            >
                <X size={16} />
            </button>
        </div>
    );
}
