'use client';

import { useMemo } from 'react';
import { Clock, Flame } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useShallow } from 'zustand/react/shallow';

// Hope's Corner operates Monday, Wednesday, Saturday
const SERVICE_DAYS = [
    { key: 1, label: 'Monday', short: 'Mon' },
    { key: 3, label: 'Wednesday', short: 'Wed' },
    { key: 6, label: 'Saturday', short: 'Sat' },
] as const;

// Service hours: 7 AM to 2 PM (covering breakfast and lunch)
const HOUR_START = 7;
const HOUR_END = 14;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

function formatHour(hour: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${h}${period}`;
}

/** Interpolate between two hex colors based on t [0, 1]. */
function lerpColor(a: string, b: string, t: number): string {
    const parse = (hex: string) => [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
    ];
    const [r1, g1, b1] = parse(a);
    const [r2, g2, b2] = parse(b);
    const ch = (v: number) => Math.round(v).toString(16).padStart(2, '0');
    return `#${ch(r1 + (r2 - r1) * t)}${ch(g1 + (g2 - g1) * t)}${ch(b1 + (b2 - b1) * t)}`;
}

/** 5-stop gradient from cool → warm → hot. */
function heatColor(ratio: number): string {
    const stops: [number, string][] = [
        [0, '#f0f4ff'],    // near-white blue
        [0.25, '#93c5fd'], // light blue
        [0.5, '#3b82f6'],  // blue
        [0.75, '#f97316'], // orange
        [1, '#dc2626'],    // red
    ];
    if (ratio <= 0) return stops[0][1];
    if (ratio >= 1) return stops[stops.length - 1][1];
    for (let i = 0; i < stops.length - 1; i++) {
        const [t0, c0] = stops[i];
        const [t1, c1] = stops[i + 1];
        if (ratio >= t0 && ratio <= t1) {
            return lerpColor(c0, c1, (ratio - t0) / (t1 - t0));
        }
    }
    return stops[stops.length - 1][1];
}

interface Props {
    /** Optional YYYY-MM-DD start bound (inclusive). If omitted, uses all data. */
    startDate?: string;
    /** Optional YYYY-MM-DD end bound (inclusive). If omitted, uses today. */
    endDate?: string;
}

export function PeakTimesHeatmap({ startDate, endDate }: Props) {
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

    const { showerRecords, laundryRecords } = useServicesStore(
        useShallow((s) => ({
            showerRecords: s.showerRecords,
            laundryRecords: s.laundryRecords,
        }))
    );

    const { grid, maxCount, peakHour, peakDay } = useMemo(() => {
        // Build a map of [dayOfWeek][hour] → count
        const counts = new Map<string, number>();
        const dayHourKey = (dow: number, h: number) => `${dow}-${h}`;

        const allMeals = [
            ...mealRecords,
            ...rvMealRecords,
            ...extraMealRecords,
            ...dayWorkerMealRecords,
            ...shelterMealRecords,
            ...unitedEffortMealRecords,
            ...lunchBagRecords,
        ];

        const processTimestamp = (ts: string | null | undefined, dateStr?: string) => {
            if (!ts) return;
            const d = new Date(ts);
            if (isNaN(d.getTime())) return;

            // Date range filter
            const dateKey = dateStr || d.toISOString().split('T')[0];
            if (startDate && dateKey < startDate) return;
            if (endDate && dateKey > endDate) return;

            const dow = d.getDay(); // 0=Sun ... 6=Sat
            // Only Mon(1), Wed(3), Sat(6)
            if (dow !== 1 && dow !== 3 && dow !== 6) return;
            const hour = d.getHours();
            if (hour < HOUR_START || hour > HOUR_END) return;

            const key = dayHourKey(dow, hour);
            counts.set(key, (counts.get(key) || 0) + 1);
        };

        // Process meal records by createdAt timestamp
        for (const r of allMeals) {
            processTimestamp(r.createdAt, r.dateKey || r.date);
        }

        // Process shower records
        for (const r of showerRecords) {
            if (r.status === 'done' || r.status === 'booked') {
                processTimestamp((r as any).createdAt || (r as any).created_at, (r as any).dateKey || r.date);
            }
        }

        // Process laundry records
        for (const r of laundryRecords) {
            processTimestamp((r as any).createdAt || (r as any).created_at, (r as any).dateKey || r.date);
        }

        // Build grid data
        let maxVal = 0;
        let peakH = HOUR_START;
        let peakD: string = SERVICE_DAYS[0].label;

        const gridData = SERVICE_DAYS.map(day => {
            const cells = HOURS.map(hour => {
                const count = counts.get(dayHourKey(day.key, hour)) || 0;
                if (count > maxVal) {
                    maxVal = count;
                    peakH = hour;
                    peakD = day.label;
                }
                return { hour, count };
            });
            return { day, cells };
        });

        return { grid: gridData, maxCount: maxVal, peakHour: peakH, peakDay: peakD };
    }, [mealRecords, rvMealRecords, extraMealRecords, dayWorkerMealRecords, shelterMealRecords, unitedEffortMealRecords, lunchBagRecords, showerRecords, laundryRecords, startDate, endDate]);

    const hasData = maxCount > 0;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-sm">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-gradient-to-br from-orange-100 to-red-100 rounded-xl">
                        <Flame size={18} className="text-orange-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                            Peak Activity Heatmap
                        </h3>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                            Service day activity — Monday, Wednesday &amp; Saturday
                        </p>
                    </div>
                </div>
                {hasData && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-xl border border-orange-200">
                        <Clock size={14} className="text-orange-600" />
                        <span className="text-xs font-bold text-orange-700">
                            Peak: {peakDay} {formatHour(peakHour)}
                        </span>
                    </div>
                )}
            </div>

            {!hasData ? (
                <div className="text-center py-12 text-gray-400">
                    <Flame size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-sm">No timestamped activity data available for heatmap.</p>
                    <p className="text-xs mt-1">Activity will appear here as records accumulate.</p>
                </div>
            ) : (
                <>
                    {/* Heatmap grid */}
                    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                        <div className="min-w-[480px]">
                            {/* Hour labels */}
                            <div className="flex items-end mb-2 pl-20 sm:pl-28">
                                {HOURS.map(h => (
                                    <div
                                        key={h}
                                        className="flex-1 text-center text-[10px] sm:text-xs font-bold text-gray-400"
                                    >
                                        {formatHour(h)}
                                    </div>
                                ))}
                            </div>

                            {/* Rows */}
                            {grid.map(({ day, cells }) => (
                                <div key={day.key} className="flex items-center gap-1.5 mb-1.5">
                                    {/* Day label */}
                                    <div className="w-16 sm:w-24 text-right pr-2">
                                        <span className="hidden sm:inline text-xs font-black text-gray-700 uppercase tracking-wider">
                                            {day.label}
                                        </span>
                                        <span className="sm:hidden text-xs font-black text-gray-700 uppercase tracking-wider">
                                            {day.short}
                                        </span>
                                    </div>

                                    {/* Heat cells */}
                                    <div className="flex-1 flex gap-1">
                                        {cells.map(({ hour, count }) => {
                                            const ratio = maxCount > 0 ? count / maxCount : 0;
                                            const bg = count === 0 ? '#f9fafb' : heatColor(ratio);
                                            const textColor = ratio > 0.5 ? 'text-white' : 'text-gray-600';
                                            return (
                                                <div
                                                    key={hour}
                                                    className={cn(
                                                        'flex-1 aspect-[1.6] rounded-lg flex items-center justify-center transition-colors',
                                                        'hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 cursor-default',
                                                        count === 0 && 'border border-gray-100',
                                                    )}
                                                    style={{ backgroundColor: bg }}
                                                    title={`${day.label} ${formatHour(hour)}: ${count} activities`}
                                                >
                                                    <span className={cn('text-[10px] sm:text-xs font-bold', textColor)}>
                                                        {count > 0 ? count : ''}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Intensity</span>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400 font-medium mr-1">Low</span>
                            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                                <div
                                    key={t}
                                    className="w-5 h-3 rounded-sm"
                                    style={{ backgroundColor: heatColor(t) }}
                                />
                            ))}
                            <span className="text-[10px] text-gray-400 font-medium ml-1">High</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
