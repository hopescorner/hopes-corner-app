'use client';

import { useEffect, useMemo } from 'react';
import { CalendarDays, Cloud, CloudFog, CloudRain, CloudSnow, CloudSun, Sun, UtensilsCrossed } from 'lucide-react';
import { useWeatherStore } from '@/stores/useWeatherStore';
import type { DailyWeather, WeatherConditionCategory } from '@/types/database';
import { cn } from '@/lib/utils/cn';

export interface DailyMealsWeatherRow {
    /** Pacific calendar date (YYYY-MM-DD) - matches `daily_weather.date`. */
    fullDate: string;
    /** Display label, e.g. "Sep 23 (Tue)". Falls back to the full date. */
    dateLabel?: string;
    meals: number;
    uniqueGuests?: number;
}

interface DailyMealsWeatherTableProps {
    rows: DailyMealsWeatherRow[];
    title: string;
    subtitle?: string;
}

const CATEGORY_ICON: Record<WeatherConditionCategory, typeof Sun> = {
    sunny: Sun,
    cloudy: Cloud,
    rain: CloudRain,
    fog: CloudFog,
    snow: CloudSnow,
    other: CloudSun,
};

function WeatherCell({ weather }: { weather: DailyWeather | null }) {
    if (!weather) {
        return <span className="text-xs text-gray-300">—</span>;
    }
    const Icon = CATEGORY_ICON[weather.conditionCategory] ?? CloudSun;
    return (
        <span className="inline-flex items-center gap-1.5 text-xs">
            <Icon size={15} className={weather.conditionCategory === 'sunny' ? 'text-amber-500' : 'text-sky-500'} aria-hidden="true" />
            <span className="font-semibold text-gray-700">{weather.condition}</span>
            <span className="font-medium text-sky-600">
                {Math.round(weather.tempHigh)}° / {Math.round(weather.tempLow)}°F
            </span>
            {weather.hasRain && weather.precipitationSum > 0 && (
                <span className="font-semibold text-blue-600">({weather.precipitationSum}&quot; rain)</span>
            )}
        </span>
    );
}

export function DailyMealsWeatherTable({ rows, title, subtitle }: DailyMealsWeatherTableProps) {
    const weatherByDate = useWeatherStore((s) => s.weatherByDate);
    const ensureLoaded = useWeatherStore((s) => s.ensureLoaded);

    const serviceDays = useMemo(
        () =>
            rows
                .filter((row) => row.meals > 0)
                .slice()
                .sort((a, b) => (a.fullDate < b.fullDate ? 1 : a.fullDate > b.fullDate ? -1 : 0)),
        [rows]
    );

    useEffect(() => {
        if (serviceDays.length === 0) return;
        const dates = serviceDays.map((row) => row.fullDate).sort();
        void ensureLoaded({ startDate: dates[0], endDate: dates[dates.length - 1] });
    }, [serviceDays, ensureLoaded]);

    const showGuests = serviceDays.some((row) => row.uniqueGuests !== undefined);
    const daysWithWeather = serviceDays.filter((row) => weatherByDate[row.fullDate]).length;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <UtensilsCrossed size={20} className="text-orange-500" />
                {title}
            </h3>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            {serviceDays.length === 0 ? (
                <p className="text-sm text-gray-400 mt-4">No meal service days in this period.</p>
            ) : (
                <>
                    <div className="mt-4 max-h-96 overflow-y-auto rounded-xl border border-gray-100">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-gray-50">
                                <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                                    <th className="px-4 py-2.5 font-bold">
                                        <span className="inline-flex items-center gap-1.5">
                                            <CalendarDays size={13} /> Date
                                        </span>
                                    </th>
                                    <th className="px-4 py-2.5 font-bold text-right">Meals</th>
                                    {showGuests && <th className="px-4 py-2.5 font-bold text-right">Guests</th>}
                                    <th className="px-4 py-2.5 font-bold">Weather · Mountain View</th>
                                </tr>
                            </thead>
                            <tbody>
                                {serviceDays.map((row) => (
                                    <tr key={row.fullDate} className="border-t border-gray-100 hover:bg-gray-50/60">
                                        <td className="px-4 py-2.5 font-semibold text-gray-900 whitespace-nowrap">
                                            {row.dateLabel || row.fullDate}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-bold text-gray-900 tabular-nums">
                                            {row.meals.toLocaleString()}
                                        </td>
                                        {showGuests && (
                                            <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">
                                                {row.uniqueGuests ?? '—'}
                                            </td>
                                        )}
                                        <td className="px-4 py-2.5">
                                            <WeatherCell weather={weatherByDate[row.fullDate] || null} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {daysWithWeather === 0 && (
                        <p className={cn('text-xs text-gray-400 mt-3')}>
                            No weather recorded for these days yet — rows appear as service days are saved.
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
