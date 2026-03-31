'use client';

import { useMemo, useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { UserPlus, UserCheck, Users } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils/cn';

const MONTH_SPAN_OPTIONS = [
    { value: 6, label: '6 Months' },
    { value: 12, label: '12 Months' },
] as const;

function monthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
    const [y, m] = key.split('-');
    const d = new Date(Number(y), Number(m) - 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

interface Props {
    isMounted?: boolean;
}

export function GuestRetentionChart({ isMounted = true }: Props) {
    const [monthSpan, setMonthSpan] = useState<number>(6);
    const mobile = useIsMobile();

    const guests = useGuestsStore((s) => s.guests);

    const {
        mealRecords,
        rvMealRecords,
        extraMealRecords,
        dayWorkerMealRecords,
        shelterMealRecords,
        unitedEffortMealRecords,
        lunchBagRecords,
    } = useMealsStore(
        useShallow((s) => ({
            mealRecords: s.mealRecords,
            rvMealRecords: s.rvMealRecords,
            extraMealRecords: s.extraMealRecords,
            dayWorkerMealRecords: s.dayWorkerMealRecords,
            shelterMealRecords: s.shelterMealRecords,
            unitedEffortMealRecords: s.unitedEffortMealRecords,
            lunchBagRecords: s.lunchBagRecords,
        }))
    );

    const { showerRecords, laundryRecords, bicycleRecords, haircutRecords } = useServicesStore(
        useShallow((s) => ({
            showerRecords: s.showerRecords,
            laundryRecords: s.laundryRecords,
            bicycleRecords: s.bicycleRecords,
            haircutRecords: s.haircutRecords,
        }))
    );

    const { data, totalNew, totalReturning } = useMemo(() => {
        // Build a map of guestId → first-seen month from guest.createdAt
        const guestFirstMonth = new Map<string, string>();
        for (const g of guests) {
            if (g.createdAt) {
                const d = new Date(g.createdAt);
                if (!isNaN(d.getTime())) {
                    guestFirstMonth.set(g.id, monthKey(d));
                }
            }
        }

        // Build a map of month → Set<guestId> from all activity records
        const monthActivity = new Map<string, Set<string>>();

        const addActivity = (guestId: string | undefined, dateStr: string | undefined) => {
            if (!guestId || !dateStr) return;
            const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00'));
            if (isNaN(d.getTime())) return;
            const mk = monthKey(d);
            let s = monthActivity.get(mk);
            if (!s) { s = new Set(); monthActivity.set(mk, s); }
            s.add(guestId);
        };

        const allMeals = [
            ...mealRecords, ...rvMealRecords, ...extraMealRecords,
            ...dayWorkerMealRecords, ...shelterMealRecords,
            ...unitedEffortMealRecords, ...lunchBagRecords,
        ];
        for (const r of allMeals) addActivity(r.guestId, r.dateKey || r.date);
        for (const r of showerRecords) {
            if (r.status === 'done') addActivity(r.guestId, r.date);
        }
        for (const r of laundryRecords) addActivity(r.guestId, r.date);
        for (const r of bicycleRecords) {
            if (r.status !== 'cancelled') addActivity(r.guestId as string | undefined, (r as any).dateKey || (r as any).date || (r as any).requestedAt);
        }
        if (haircutRecords) {
            for (const r of haircutRecords) addActivity((r as any).guestId, (r as any).dateKey || (r as any).date);
        }

        // Generate month labels for the selected span
        const now = new Date();
        const months: string[] = [];
        for (let i = monthSpan - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(monthKey(d));
        }

        // Calculate new vs returning per month
        let sumNew = 0;
        let sumReturning = 0;
        const chartData = months.map(mk => {
            const active = monthActivity.get(mk) || new Set<string>();
            let newGuests = 0;
            let returningGuests = 0;

            for (const gid of active) {
                const firstMonth = guestFirstMonth.get(gid);
                if (firstMonth && firstMonth === mk) {
                    newGuests++;
                } else {
                    returningGuests++;
                }
            }

            sumNew += newGuests;
            sumReturning += returningGuests;

            return {
                month: monthLabel(mk),
                monthKey: mk,
                new: newGuests,
                returning: returningGuests,
                total: newGuests + returningGuests,
            };
        });

        return { data: chartData, totalNew: sumNew, totalReturning: sumReturning };
    }, [guests, mealRecords, rvMealRecords, extraMealRecords, dayWorkerMealRecords, shelterMealRecords, unitedEffortMealRecords, lunchBagRecords, showerRecords, laundryRecords, bicycleRecords, haircutRecords, monthSpan]);

    const hasData = data.some(d => d.total > 0);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-sm">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl">
                        <Users size={18} className="text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                            Guest Retention
                        </h3>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                            New vs returning guests each month
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {MONTH_SPAN_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setMonthSpan(opt.value)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                                monthSpan === opt.value
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary pills */}
            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <UserPlus size={20} className="text-emerald-600" />
                    <div>
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">New Guests</p>
                        <p className="text-xl font-black text-emerald-900">{totalNew.toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 rounded-xl border border-blue-100">
                    <UserCheck size={20} className="text-blue-600" />
                    <div>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Returning</p>
                        <p className="text-xl font-black text-blue-900">{totalReturning.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="h-[280px] sm:h-[340px] w-full">
                {isMounted && hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} barGap={2}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: mobile ? 9 : 11, fontWeight: 600, fill: '#9ca3af' }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: mobile ? 9 : 11, fontWeight: 600, fill: '#9ca3af' }}
                                width={mobile ? 28 : 40}
                                allowDecimals={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                                content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null;
                                    const newVal = payload.find(p => p.dataKey === 'new')?.value ?? 0;
                                    const retVal = payload.find(p => p.dataKey === 'returning')?.value ?? 0;
                                    return (
                                        <div className="bg-white p-3 border border-gray-200 shadow-xl rounded-xl text-sm min-w-[160px]">
                                            <p className="font-bold text-gray-800 mb-2">{label}</p>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                                <span className="text-gray-600">New:</span>
                                                <span className="font-semibold">{newVal}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                                <span className="text-gray-600">Returning:</span>
                                                <span className="font-semibold">{retVal}</span>
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                            <Legend
                                iconType="circle"
                                wrapperStyle={{ fontSize: 12, fontWeight: 700 }}
                            />
                            <Bar
                                dataKey="new"
                                name="New Guests"
                                fill="#10b981"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={32}
                            />
                            <Bar
                                dataKey="returning"
                                name="Returning Guests"
                                fill="#3b82f6"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={32}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                ) : !hasData ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <Users size={48} className="mb-3 opacity-30" />
                        <p className="font-medium text-sm">No guest activity data available yet.</p>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center bg-gray-50 rounded-xl animate-pulse">
                        <span className="text-gray-400">Loading chart...</span>
                    </div>
                )}
            </div>
        </div>
    );
}
