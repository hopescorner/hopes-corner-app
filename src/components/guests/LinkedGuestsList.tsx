'use client';

import { useId, useState, useMemo } from 'react';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { useActionHistoryStore } from '@/stores/useActionHistoryStore';
import { useCheckInStore } from '@/stores/useCheckInStore';
import { useTodayMealStatusMap, useTodayActionStatusMap } from '@/stores/selectors/todayStatusSelectors';
import { Link, Unlink, Search, X, Loader2, RotateCcw, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import type { MealStatusMap } from '@/stores/selectors/todayStatusSelectors';

interface LinkedGuestsListProps {
    guestId: string;
    className?: string;
    mealStatusMap?: MealStatusMap;
    addMealRecord?: (guestId: string, quantity?: number, pickedUpByGuestId?: string | null, serviceDate?: string) => Promise<any>;
    disabled?: boolean;
}

export default function LinkedGuestsList({ guestId, className = '', mealStatusMap: passedMealStatusMap, addMealRecord: passedAddMealRecord, disabled = false }: LinkedGuestsListProps) {
    const { getLinkedGuests, linkGuests, unlinkGuests, guests: allGuests } = useGuestsStore();
    const { addMealRecord } = useMealsStore();
    const { addAction } = useActionHistoryStore();
    const storeMealStatusMap = useTodayMealStatusMap();
    const effectiveMealStatusMap = passedMealStatusMap || storeMealStatusMap;
    const actionStatusMap = useTodayActionStatusMap();
    const [isLinking, setIsLinking] = useState(false);
    const [isManaging, setIsManaging] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isPending, setIsPending] = useState(false);
    const searchId = useId();
    const busy = isPending || disabled;
    const linkedGuests = getLinkedGuests(guestId).filter(Boolean);

    const handleLinkGuest = async (proxyId: string) => {
        if (busy) return;
        setIsPending(true);
        try {
            await linkGuests(guestId, proxyId);
            toast.success('Guest linked successfully');
            setIsLinking(false);
            setSearchTerm('');
        } catch {
            toast.error('Failed to link guest');
        } finally { setIsPending(false); }
    };

    const handleUnlinkGuest = async (proxyId: string, name: string) => {
        if (busy || !confirm(`Unlink ${name}? Their meal records will be kept.`)) return;
        setIsPending(true);
        try {
            await unlinkGuests(guestId, proxyId);
            toast.success('Guest unlinked');
        } catch { toast.error('Failed to unlink guest'); }
        finally { setIsPending(false); }
    };

    const handleQuickMeal = async (linkedGuestId: string, name: string, quantity: number) => {
        if (busy) return;
        setIsPending(true);
        try {
            const record = await (passedAddMealRecord || addMealRecord)(linkedGuestId, quantity, guestId);
            if (record?.id) addAction('MEAL_ADDED', { recordId: record.id, guestId: linkedGuestId, count: quantity });
            toast.success(`${quantity} meal${quantity > 1 ? 's' : ''} logged for ${name}`);
        } catch (error: any) { toast.error(error.message || 'Failed to log meal'); }
        finally { setIsPending(false); }
    };

    const handleUndo = async (linkedGuestId: string, actionId: string) => {
        if (busy) return;
        setIsPending(true);
        try {
            const history = useActionHistoryStore.getState();
            const action = history.actionHistory?.find((entry) => entry.id === actionId);
            const success = await history.undoAction(actionId);
            if (success) {
                if (action && useCheckInStore.getState().isReady) {
                    useCheckInStore.getState().applyUndo({ type: 'MEAL_ADDED', guestId: linkedGuestId, recordId: action.data.recordId });
                }
                toast.success('Meal undone');
            } else { toast.error('Failed to undo meal'); }
        } finally { setIsPending(false); }
    };

    const filteredCandidates = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (term.length < 2) return [];
        const linkedIds = new Set(linkedGuests.map((guest) => guest.id));
        linkedIds.add(guestId);
        return allGuests.filter((guest) => guest && !linkedIds.has(guest.id) &&
            `${guest.preferredName || ''} ${guest.firstName || ''} ${guest.lastName || ''}`.toLowerCase().includes(term)).slice(0, 5);
    }, [searchTerm, allGuests, linkedGuests, guestId]);

    const buttonClass = 'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 touch-manipulation';

    if (linkedGuests.length === 0 && !isLinking) return (
        <div className={`mt-3 ${className}`}>
            <button type="button" onClick={() => setIsLinking(true)} className={`${buttonClass} text-emerald-800 hover:bg-emerald-50`}><Link size={16} />Link Guest</button>
        </div>
    );

    return (
        <div className={`mt-3 border-t border-gray-200 pt-3 ${className}`}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-gray-800">Linked Guests ({linkedGuests.length})</h4>
                {linkedGuests.length > 0 && <button type="button" aria-pressed={isManaging} onClick={() => setIsManaging(!isManaging)} className={`${buttonClass} text-gray-600 hover:bg-gray-100`}>{isManaging ? 'Done managing' : 'Manage links'}</button>}
            </div>
            <ul className="space-y-2">
                {linkedGuests.map((guest) => {
                    const status = effectiveMealStatusMap.get(guest.id);
                    const name = guest.preferredName || `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Unknown Guest';
                    const mealActionId = actionStatusMap.get(guest.id)?.mealActionId;
                    return (
                        <li key={guest.id} className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <div className="min-w-0">
                                <p className="break-words text-sm font-semibold text-gray-900">{name}</p>
                                <p className={`mt-1 flex items-center gap-1 text-xs ${status?.hasMeal ? 'text-emerald-700' : 'text-gray-600'}`}>
                                    {status?.hasMeal ? <><Check size={14} /><span>Served</span>{status.mealCount ? ` · ${status.mealCount} meal${status.mealCount === 1 ? '' : 's'}` : ''}</> : 'No meal yet today'}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                                {isManaging ? (
                                    <button type="button" disabled={busy} onClick={() => handleUnlinkGuest(guest.id, name)} title="Unlink Guest" aria-label={`Unlink ${name}`} className={`${buttonClass} border border-red-200 text-red-700 hover:bg-red-50`}><Unlink size={16} />Unlink</button>
                                ) : status?.hasMeal ? (
                                    mealActionId && <button type="button" disabled={busy} onClick={() => handleUndo(guest.id, mealActionId)} title="Undo Meal" aria-label={`Undo meal for ${name}`} className={`${buttonClass} border border-orange-200 text-orange-800 hover:bg-orange-50`}><RotateCcw size={16} />Undo meal</button>
                                ) : [1, 2].map((quantity) => (
                                    <button key={quantity} type="button" disabled={busy} onClick={() => handleQuickMeal(guest.id, name, quantity)} title={`${quantity} Meal${quantity === 1 ? '' : 's'}`} aria-label={`${quantity} meal${quantity === 1 ? '' : 's'} for ${name}`} className={`${buttonClass} flex-1 border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 sm:flex-none`}>
                                        {isPending && <Loader2 size={14} className="animate-spin" />}{quantity} meal{quantity === 1 ? '' : 's'}
                                    </button>
                                ))}
                            </div>
                        </li>
                    );
                })}
            </ul>
            {isManaging && !isLinking && (
                linkedGuests.length < 3 ? <button type="button" onClick={() => setIsLinking(true)} className={`${buttonClass} mt-2 text-emerald-800 hover:bg-emerald-50`}><Link size={16} />Link Guest</button> : <p className="mt-3 text-sm text-gray-600">Maximum of 3 linked guests reached.</p>
            )}
            {isLinking && (
                <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <label htmlFor={searchId} className="text-sm font-semibold text-gray-800">Find a guest to link</label>
                        <button type="button" aria-label="Cancel linking" onClick={() => setIsLinking(false)} className={`${buttonClass} text-gray-600 hover:bg-gray-100`}><X size={18} /></button>
                    </div>
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-3.5 text-gray-400" aria-hidden="true" />
                        <input id={searchId} type="search" placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setIsLinking(false); }} className="min-h-11 w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-base focus:outline-2 focus:outline-emerald-600" autoFocus />
                    </div>
                    {searchTerm.trim().length < 2 ? <p className="mt-2 text-xs text-gray-600">Type at least 2 letters. Up to 3 guests can be linked.</p> : (
                        <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                            {filteredCandidates.length === 0 ? <p role="status" className="p-3 text-sm text-gray-600">No guests found</p> : filteredCandidates.map((candidate) => (
                                <button type="button" key={candidate.id} disabled={busy} onClick={() => handleLinkGuest(candidate.id)} className={`${buttonClass} w-full justify-between gap-3 text-left text-gray-800 hover:bg-emerald-50`}>
                                    <span className="min-w-0 break-words">{candidate.preferredName ? `${candidate.preferredName} (${candidate.firstName} ${candidate.lastName})` : `${candidate.firstName} ${candidate.lastName}`}</span>
                                    <span className="shrink-0 text-emerald-700">Link</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
