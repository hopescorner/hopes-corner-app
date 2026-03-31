'use client';

import { useMemo } from 'react';
import { Clock, Flame } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useMealsStore } from '@/stores/useMealsStore';
import { useShallow } from 'zustand/react/shallow';

// Hope's Corner operates Monday, Wednesday, Saturday
const SERVICE_DAYS = [
    { key: 1, label: 'Monday', short: 'Mon' },
    { key: 3, label: 'Wednesday', short: 'Wed' },
    { key: 6, label: 'Saturday', short: 'Sat' },
] as const;

// Time slots: hourly outside 8–10 AM, 30-minute intervals within 8–10 AM
interface TimeSlot {
    id: string;       // unique key e.g. "7" or "8.5"
    label: string;    // header label e.g. "7AM" or "8:30"
    hourStart: number;
    minuteStart: number;
    hourEnd: number;
    minuteEnd: number;
}

function buildTimeSlots(): TimeSlot[] {
    const slots: TimeSlot[] = [];
    // 7 AM (hourly)
    slots.push({ id: '7', label: '7AM', hourStart: 7, minuteStart: 0, hourEnd: 7, minuteEnd: 59 });
    // 8:00–8:29
    slots.push({ id: '8.0', label: '8:00', hourStart: 8, minuteStart: 0, hourEnd: 8, minuteEnd: 29 });
    // 8:30–8:59
    slots.push({ id: '8.5', label: '8:30', hourStart: 8, minuteStart: 30, hourEnd: 8, minuteEnd: 59 });
    // 9:00–9:29
    slots.push({ id: '9.0', label: '9:00', hourStart: 9, minuteStart: 0, hourEnd: 9, minuteEnd: 29 });
    // 9:30–9:59
    slots.push({ id: '9.5', label: '9:30', hourStart: 9, minuteStart: 30, hourEnd: 9, minuteEnd: 59 });
    // 10 AM – 2 PM (hourly)
    for (let h = 10; h <= 14; h++) {
        const period = h >= 12 ? 'PM' : 'AM';
        const display = h > 12 ? h - 12 : h;
        slots.push({ id: String(h), label: `${display}${period}`, hourStart: h, minuteStart: 0, hourEnd: h, minuteEnd: 59 });
    }
    return slots;
}

const TIME_SLOTS = buildTimeSlots();

/** Return the slot id a given hour+minute falls into, or null if outside range. */
function slotIdFor(hour: number, minute: number): string | null {
    if (hour < 7 || hour > 14) return null;
    if (hour === 8) return minute < 30 ? '8.0' : '8.5';
    if (hour === 9) return minute < 30 ? '9.0' : '9.5';
    return String(hour);
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
    // Only guest meals and extra meals — no RV, shelter, or other bulk types
    const { mealRecords, extraMealRecords } = useMealsStore(
        useShallow((s) => ({
            mealRecords: s.mealRecords,
            extraMealRecords: s.extraMealRecords,
        }))
    );

    const { grid, maxCount, peakSlotLabel, peakDay } = useMemo(() => {
        // Map of "dayOfWeek-slotId" → total meals served
        const counts = new Map<string, number>();
        const cellKey = (dow: number, slotId: string) => `${dow}-${slotId}`;

        const allMeals = [...mealRecords, ...extraMealRecords];

        for (const r of allMeals) {
            const ts = r.createdAt;
            if (!ts) continue;
            const d = new Date(ts);
            if (isNaN(d.getTime())) continue;

            // Date range filter
            const dateKey = r.dateKey || r.date;
            if (startDate && dateKey < startDate) continue;
            if (endDate && dateKey > endDate) continue;

            const dow = d.getDay(); // 0=Sun … 6=Sat
            if (dow !== 1 && dow !== 3 && dow !== 6) continue;

            const sid = slotIdFor(d.getHours(), d.getMinutes());
            if (!sid) continue;

            const key = cellKey(dow, sid);
            counts.set(key, (counts.get(key) || 0) + (r.count || 1));
        }

        // Build grid
        let maxVal = 0;
        let peakSLabel = TIME_SLOTS[0].label;
        let peakD: string = SERVICE_DAYS[0].label;

        const gridData = SERVICE_DAYS.map(day => {
            const cells = TIME_SLOTS.map(slot => {
                const count = counts.get(cellKey(day.key, slot.id)) || 0;
                if (count > maxVal) {
                    maxVal = count;
                    peakSLabel = slot.label;
                    peakD = day.label;
                }
                return { slot, count };
            });
            return { day, cells };
        });

        return { grid: gridData, maxCount: maxVal, peakSlotLabel: peakSLabel, peakDay: peakD };
    }, [mealRecords, extraMealRecords, startDate, endDate]);

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
                            Peak Meal Activity
                        </h3>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                            Meals served — Mon, Wed &amp; Sat · 30-min detail 8–10 AM
                        </p>
                    </div>
                </div>
                {hasData && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-xl border border-orange-200">
                        <Clock size={14} className="text-orange-600" />
                        <span className="text-xs font-bold text-orange-700">
                            Peak: {peakDay} {peakSlotLabel}
                        </span>
                    </div>
                )}
            </div>

            {!hasData ? (
                <div className="text-center py-12 text-gray-400">
                    <Flame size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-sm">No meal data available for heatmap.</p>
                    <p className="text-xs mt-1">Meal activity will appear here as records accumulate.</p>
                </div>
            ) : (
                <>
                    {/* Heatmap grid */}
                    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                        <div className="min-w-[560px]">
                            {/* Slot labels */}
                            <div className="flex items-end mb-2 pl-20 sm:pl-28">
                                {TIME_SLOTS.map(slot => (
                                    <div
                                        key={slot.id}
                                        className="flex-1 text-center text-[10px] sm:text-xs font-bold text-gray-400"
                                    >
                                        {slot.label}
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
                                        {cells.map(({ slot, count }) => {
                                            const ratio = maxCount > 0 ? count / maxCount : 0;
                                            const bg = count === 0 ? '#f9fafb' : heatColor(ratio);
                                            const textColor = ratio > 0.5 ? 'text-white' : 'text-gray-600';
                                            return (
                                                <div
                                                    key={slot.id}
                                                    className={cn(
                                                        'flex-1 aspect-[1.6] rounded-lg flex items-center justify-center transition-colors',
                                                        'hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 cursor-default',
                                                        count === 0 && 'border border-gray-100',
                                                    )}
                                                    style={{ backgroundColor: bg }}
                                                    title={`${day.label} ${slot.label}: ${count} meals`}
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
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Meals served</span>
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
