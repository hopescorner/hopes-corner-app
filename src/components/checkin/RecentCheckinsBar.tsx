'use client';

import { useMemo } from 'react';
import { History, Check, Utensils, ShowerHead, WashingMachine, Bike } from 'lucide-react';
import { useActionHistoryStore } from '@/stores/useActionHistoryStore';
import { type Guest } from '@/stores/useGuestsStore';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';
import { getGuestInitials, getGuestAvatarColor } from '@/lib/utils/guestAvatar';
import { cn } from '@/lib/utils/cn';

interface RecentCheckinsBarProps {
    guests: Guest[];
    onSelectGuest: (guest: Guest) => void;
    className?: string;
}

export function RecentCheckinsBar({ guests, onSelectGuest, className = '' }: RecentCheckinsBarProps) {
    const actionHistory = useActionHistoryStore((s) => s.actionHistory);
    const today = todayPacificDateString();

    const recentGuestsWithAction = useMemo(() => {
        const guestMap = new Map<string, Guest>();
        for (const g of guests || []) {
            if (g?.id) guestMap.set(g.id, g);
        }

        const seenGuestIds = new Set<string>();
        const result: Array<{ guest: Guest; actionType: string; timestamp: string }> = [];

        for (const action of actionHistory || []) {
            if (!action?.data?.guestId) continue;
            if (pacificDateStringFrom(action.timestamp) !== today) continue;

            const guestId = action.data.guestId;
            if (seenGuestIds.has(guestId)) continue;

            const guest = guestMap.get(guestId);
            if (!guest) continue;

            seenGuestIds.add(guestId);
            result.push({ guest, actionType: action.type, timestamp: action.timestamp });

            if (result.length >= 5) break;
        }

        return result;
    }, [actionHistory, guests, today]);

    if (recentGuestsWithAction.length === 0) return null;

    const getActionBadge = (actionType: string) => {
        switch (actionType) {
            case 'MEAL_ADDED':
            case 'EXTRA_MEALS_ADDED':
                return { label: 'Meal', icon: Utensils, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
            case 'SHOWER_BOOKED':
                return { label: 'Shower', icon: ShowerHead, color: 'text-sky-700 bg-sky-50 border-sky-200' };
            case 'LAUNDRY_BOOKED':
                return { label: 'Laundry', icon: WashingMachine, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
            case 'BICYCLE_LOGGED':
                return { label: 'Bike', icon: Bike, color: 'text-amber-700 bg-amber-50 border-amber-200' };
            default:
                return { label: 'Done', icon: Check, color: 'text-gray-700 bg-gray-50 border-gray-200' };
        }
    };

    return (
        <div className={cn('bg-white/90 backdrop-blur-sm rounded-xl border border-gray-100 p-3 shadow-sm', className)}>
            <div className="flex items-center gap-2 mb-2">
                <History size={13} className="text-gray-400" />
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Recent Check-Ins
                </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {recentGuestsWithAction.map(({ guest, actionType }) => {
                    const initials = getGuestInitials(guest);
                    const color = getGuestAvatarColor(guest.id);
                    const actionInfo = getActionBadge(actionType);
                    const Icon = actionInfo.icon;
                    const displayName = guest.preferredName || guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest';

                    return (
                        <button
                            key={guest.id}
                            type="button"
                            onClick={() => onSelectGuest(guest)}
                            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-xs font-semibold shrink-0 active:scale-95 touch-manipulation shadow-xs"
                            title={`Click to view ${displayName}`}
                        >
                            <span
                                className={cn(
                                    'w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border',
                                    color.bg,
                                    color.text,
                                    color.border
                                )}
                            >
                                {initials}
                            </span>
                            <span className="font-bold text-gray-800 max-w-[120px] truncate">{displayName}</span>
                            <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold', actionInfo.color)}>
                                <Icon size={10} />
                                <span>{actionInfo.label}</span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
