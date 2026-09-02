'use client';

import { useMemo, useSyncExternalStore } from 'react';
import Image from 'next/image';
import {
    Gift,
    Circle,
    Clock,
    RotateCcw,
    Sparkles,
    ShoppingBag,
    Check,
} from 'lucide-react';
import { HolidayShopperPayload } from '@/lib/holiday/shopperToken';
import { formatAgeGroupLabel, isTeen14Plus } from '@/lib/holiday/ageGroups';

interface ShopperChecklistClientProps {
    data: HolidayShopperPayload;
}

function useChecklistStore(storageKey: string) {
    const subscribe = (callback: () => void) => {
        window.addEventListener('storage', callback);
        window.addEventListener(`local_${storageKey}`, callback);
        return () => {
            window.removeEventListener('storage', callback);
            window.removeEventListener(`local_${storageKey}`, callback);
        };
    };

    const getSnapshot = () => {
        return localStorage.getItem(storageKey) || '{}';
    };

    const getServerSnapshot = () => '{}';

    const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const checkedMap: Record<string, boolean> = useMemo(() => {
        try {
            return JSON.parse(raw);
        } catch {
            return {};
        }
    }, [raw]);

    const toggleChild = (childId: string) => {
        const next = { ...checkedMap, [childId]: !checkedMap[childId] };
        try {
            localStorage.setItem(storageKey, JSON.stringify(next));
            window.dispatchEvent(new Event(`local_${storageKey}`));
        } catch {}
    };

    const resetChecklist = () => {
        try {
            localStorage.removeItem(storageKey);
            window.dispatchEvent(new Event(`local_${storageKey}`));
        } catch {}
    };

    return { checkedMap, toggleChild, resetChecklist };
}

export default function ShopperChecklistClient({ data }: ShopperChecklistClientProps) {
    const { ticketNumber, timeSlot, children } = data;
    const storageKey = `hopes_holiday_shopper_${ticketNumber}`;
    const { checkedMap, toggleChild, resetChecklist } = useChecklistStore(storageKey);

    const checkedCount = children.filter((c) => checkedMap[c.id]).length;
    const totalCount = children.length;
    const isComplete = totalCount > 0 && checkedCount === totalCount;
    const percent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

    return (
        <div data-testid="shopper-checklist-page" className="min-h-screen bg-slate-50 text-slate-900 px-4 py-6 sm:px-6 sm:py-10">
            <div className="mx-auto max-w-lg space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <Image
                        src="/hope-corner-logo-v2.svg"
                        alt="Hope's Corner"
                        width={130}
                        height={75}
                        className="h-10 w-auto"
                        priority
                    />
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                        <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Volunteer Shopper</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                                Guest Ticket
                            </span>
                            <h1 className="font-mono text-3xl sm:text-4xl font-black text-slate-950 mt-0.5">
                                #{ticketNumber}
                            </h1>
                        </div>
                        {timeSlot && (
                            <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span>{timeSlot}</span>
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-700">Shopping Progress</span>
                            <span className="text-emerald-700">{checkedCount} of {totalCount} Items ({percent}%)</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                                className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                    </div>
                </div>

                {isComplete && (
                    <div
                        data-testid="shopper-complete-card"
                        className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 shadow-sm text-center space-y-2 animate-in fade-in zoom-in duration-200"
                    >
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
                            <Sparkles className="h-6 w-6" />
                        </div>
                        <h2 className="text-lg font-bold text-emerald-950">
                            All Gifts Selected for Ticket #{ticketNumber}!
                        </h2>
                        <p className="text-xs text-emerald-800 max-w-sm mx-auto leading-relaxed">
                            Thank you! Please guide the family or deliver the selected toys to the wrapping and checkout station.
                        </p>
                    </div>
                )}

                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                            Children Gift Checklist ({totalCount})
                        </h2>
                        {checkedCount > 0 && (
                            <button
                                type="button"
                                onClick={resetChecklist}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors"
                            >
                                <RotateCcw className="w-3 h-3" />
                                <span>Reset</span>
                            </button>
                        )}
                    </div>

                    <div className="space-y-2.5">
                        {children.map((child, index) => {
                            const isChecked = Boolean(checkedMap[child.id]);
                            const isTeen = isTeen14Plus(child.age);

                            return (
                                <button
                                    key={child.id || index}
                                    type="button"
                                    onClick={() => toggleChild(child.id)}
                                    aria-label={`Child ${index + 1}, Age ${child.age}, ${formatAgeGroupLabel(child.ageGroup)}. Status: ${isChecked ? 'shopped' : 'not shopped'}`}
                                    className={`w-full text-left rounded-2xl border p-4 transition-all flex items-start gap-3.5 shadow-2xs select-none ${
                                        isChecked
                                            ? 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50'
                                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                                    }`}
                                >
                                    <div className="pt-0.5 shrink-0">
                                        {isChecked ? (
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                                                <Check className="h-4 w-4 stroke-[3]" />
                                            </div>
                                        ) : (
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-300 text-transparent">
                                                <Circle className="h-3 w-3" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`text-sm font-bold ${isChecked ? 'text-slate-600 line-through' : 'text-slate-950'}`}>
                                                Child {index + 1}
                                            </span>
                                            <span className="font-mono text-xs font-black text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                                                Age {child.age}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                                {formatAgeGroupLabel(child.ageGroup)}
                                            </span>
                                            {child.gender && (
                                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 capitalize">
                                                    {child.gender}
                                                </span>
                                            )}
                                            {isTeen && (
                                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 border border-amber-200">
                                                    <Gift className="h-3 w-3 text-amber-700" />
                                                    <span>Teen Gift Card (14–18)</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-100/70 p-3.5 text-center text-xs text-slate-500 space-y-1">
                    <p className="font-medium text-slate-600">Confidential Volunteer Shopping Checklist</p>
                    <p className="text-[11px] text-slate-400">Personal information is protected. Check off gifts as you select them.</p>
                </div>
            </div>
        </div>
    );
}
