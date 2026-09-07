'use client';

import { useState, useMemo } from 'react';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { useActionHistoryStore } from '@/stores/useActionHistoryStore';
import { useTodayMealStatusMap, useTodayActionStatusMap } from '@/stores/selectors/todayStatusSelectors';
import { UserRole } from '@/lib/auth/types';
import { useSession } from 'next-auth/react';
import { Link, Unlink, Utensils, Search, X, Loader2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { pacificDateStringFrom, todayPacificDateString } from '@/lib/utils/date';

import type { MealStatusMap } from '@/stores/selectors/todayStatusSelectors';

interface LinkedGuestsListProps {
    guestId: string;
    className?: string;
    mealStatusMap?: MealStatusMap;
    addMealRecord?: (guestId: string, quantity?: number, pickedUpByGuestId?: string | null, serviceDate?: string) => Promise<any>;
}

export default function LinkedGuestsList({
    guestId,
    className = '',
    mealStatusMap: passedMealStatusMap,
    addMealRecord: passedAddMealRecord,
}: LinkedGuestsListProps) {
    const { data: session } = useSession();
    // Assuming 'checkin' users can also see/use this feature as it helps with speed
    // const role = session?.user?.role as UserRole; 

    const {
        getLinkedGuests,
        linkGuests,
        unlinkGuests,
        guests: allGuests
    } = useGuestsStore();

    const { addMealRecord, mealRecords } = useMealsStore();
    const { addAction, getActionsForGuestToday } = useActionHistoryStore();

    // Use precomputed maps for efficient lookups (prefer passed snapshot map)
    const storeMealStatusMap = useTodayMealStatusMap();
    const effectiveMealStatusMap = passedMealStatusMap || storeMealStatusMap;
    const actionStatusMap = useTodayActionStatusMap();

    const [isLinking, setIsLinking] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isPending, setIsPending] = useState(false);

    const linkedGuests = getLinkedGuests(guestId);
    const today = todayPacificDateString();

    const handleLinkGuest = async (proxyId: string) => {
        if (isPending) return;
        setIsPending(true);
        try {
            await linkGuests(guestId, proxyId);
            toast.success('Guest linked successfully');
            setIsLinking(false);
            setSearchTerm('');
        } catch (error) {
            toast.error('Failed to link guest');
        } finally {
            setIsPending(false);
        }
    };

    const handleUnlinkGuest = async (proxyId: string) => {
        if (!confirm('Are you sure you want to unlink this guest?')) return;

        try {
            await unlinkGuests(guestId, proxyId);
            toast.success('Guest unlinked');
        } catch (error) {
            toast.error('Failed to unlink guest');
        }
    };

    const handleQuickMeal = async (linkedGuestId: string, linkedGuestName: string, quantity: number) => {
        if (isPending) return;
        setIsPending(true);
        try {
            // guestId (prop) is the Guest currently at the window (Proxy)
            // linkedGuestId is the Guest receiving the meal
            const executeAddMeal = passedAddMealRecord || addMealRecord;
            const record = await executeAddMeal(linkedGuestId, quantity, guestId);
            if (record?.id) {
                addAction('MEAL_ADDED', { recordId: record.id, guestId: linkedGuestId, count: quantity });
            }
            toast.success(`${quantity} Meal${quantity > 1 ? 's' : ''} logged for ${linkedGuestName}`);
        } catch (error: any) {
            // Check if it's just a duplicate warning or actual error
            if (error.message?.includes('already received')) {
                toast.error(`${linkedGuestName} already received a meal today`);
            } else {
                toast.error('Failed to log meal');
            }
        } finally {
            setIsPending(false);
        }
    };

    const filteredCandidates = useMemo(() => {
        if (searchTerm.length < 2) return [];
        const lowerTerm = searchTerm.toLowerCase();
        const linkedIds = new Set(linkedGuests.map(g => g.id));
        linkedIds.add(guestId); // Exclude self

        return allGuests
            .filter(g =>
                g && !linkedIds.has(g.id) &&
                ((g.preferredName || '').toLowerCase().includes(lowerTerm) ||
                    (g.firstName || '').toLowerCase().includes(lowerTerm) ||
                    (g.lastName || '').toLowerCase().includes(lowerTerm))
            )
            .slice(0, 5); // Limit to 5 results
    }, [searchTerm, allGuests, linkedGuests, guestId]);

    // Use precomputed map instead of scanning mealRecords per guest
    const getLinkedGuestStatus = (id: string) => {
        const status = effectiveMealStatusMap.get(id);
        return { hasMeal: status?.hasMeal || false };
    };

    // Helper to get action ID for a linked guest from precomputed map
    const getLinkedGuestMealActionId = (id: string) => {
        const actions = actionStatusMap.get(id);
        return actions?.mealActionId;
    };

    if (linkedGuests.length === 0 && !isLinking) {
        return (
            <div className={`mt-4 ${className}`}>
                <button
                    onClick={() => setIsLinking(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5"
                >
                    <Link size={14} />
                    Link Guest
                </button>
            </div>
        );
    }

    return (
        <div className={`mt-4 pt-4 border-t border-gray-100 ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Link size={12} />
                    Linked Guests ({linkedGuests.length})
                </h4>
                {!isLinking && (
                    <button
                        onClick={() => setIsLinking(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                        + Add Check-in Buddy
                    </button>
                )}
            </div>

            <div className="space-y-2">
                {linkedGuests.filter(g => !!g).map(g => {
                    const status = getLinkedGuestStatus(g.id);
                    const displayName = g.preferredName || `${g.firstName || ''} ${g.lastName || ''}`.trim() || 'Unknown Guest';

                    // Use precomputed action ID instead of scanning actions per guest
                    const mealActionId = getLinkedGuestMealActionId(g.id);

                    return (
                        <div key={g.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100 group">
                            <div className="flex items-center gap-2 max-w-[50%]">
                                <span className={`text-sm font-medium ${status.hasMeal ? 'text-gray-400' : 'text-gray-700'}`}>
                                    {displayName}
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                {status.hasMeal ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold">
                                            Served
                                        </span>
                                        {mealActionId && (
                                            <button
                                                onClick={async () => {
                                                    if (confirm(`Undo meal for ${displayName}?`)) {
                                                        const success = await useActionHistoryStore.getState().undoAction(mealActionId);
                                                        if (success) toast.success('Meal undone');
                                                    }
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-all"
                                                title="Undo Meal"
                                            >
                                                <RotateCcw size={14} />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                                        <button
                                            onClick={() => handleQuickMeal(g.id, displayName, 1)}
                                            disabled={isPending}
                                            className="px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-r border-gray-100 transition-colors"
                                            title="1 Meal"
                                        >
                                            1
                                        </button>
                                        <button
                                            onClick={() => handleQuickMeal(g.id, displayName, 2)}
                                            disabled={isPending}
                                            className="px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                            title="2 Meals"
                                        >
                                            2
                                        </button>
                                    </div>
                                )}

                                <div className="w-px h-4 bg-gray-200 mx-1"></div>

                                <button
                                    onClick={() => handleUnlinkGuest(g.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                    title="Unlink Guest"
                                >
                                    <Unlink size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isLinking && (
                <div className="mt-3 bg-white p-3 rounded-lg border border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-gray-700">Link New Guest</label>
                        <button onClick={() => setIsLinking(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={14} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                        />
                    </div>

                    {searchTerm.length >= 2 && (
                        <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                            {filteredCandidates.length === 0 ? (
                                <p className="text-xs text-gray-500 p-2 text-center italic">No guests found</p>
                            ) : (
                                filteredCandidates.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => handleLinkGuest(c.id)}
                                        disabled={isPending}
                                        className="w-full text-left flex items-center justify-between p-2 hover:bg-blue-50 rounded text-sm group"
                                    >
                                        <span className="font-medium text-gray-700">
                                            {c.preferredName ? `${c.preferredName} (${c.firstName} ${c.lastName})` : `${c.firstName} ${c.lastName}`}
                                        </span>
                                        <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 font-medium">Link</span>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
