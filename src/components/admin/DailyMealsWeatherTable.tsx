'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Cloud, CloudFog, CloudRain, CloudSnow, CloudSun, Newspaper, Pencil, Sun, UtensilsCrossed, X } from 'lucide-react';
import { useWeatherStore } from '@/stores/useWeatherStore';
import { useHeadlinesStore } from '@/stores/useHeadlinesStore';
import { MAX_HEADLINES_PER_DAY } from '@/lib/headlines/bayArea';
import type { DailyHeadline, DailyWeather, WeatherConditionCategory } from '@/types/database';
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

function HeadlineCell({ fullDate, headlines }: { fullDate: string; headlines: DailyHeadline[] }) {
    const saveHeadlines = useHeadlinesStore((s) => s.saveHeadlines);
    const [editing, setEditing] = useState(false);
    const [drafts, setDrafts] = useState<Array<{ headline: string; source: string }>>([]);
    const [saving, setSaving] = useState(false);

    const startEditing = () => {
        setDrafts(
            Array.from({ length: MAX_HEADLINES_PER_DAY }, (_, i) => ({
                headline: headlines[i]?.headline ?? '',
                source: headlines[i]?.source ?? '',
            }))
        );
        setEditing(true);
    };

    const setDraft = (index: number, field: 'headline' | 'source', value: string) => {
        setDrafts((prev) => prev.map((draft, i) => (i === index ? { ...draft, [field]: value } : draft)));
    };

    const save = async () => {
        if (saving) return;
        setSaving(true);
        try {
            const saved = await saveHeadlines(fullDate, drafts);
            if (saved) setEditing(false);
        } finally {
            setSaving(false);
        }
    };

    if (editing) {
        const hasContent = drafts.some((draft) => draft.headline.trim().length > 0);
        return (
            <div className="flex min-w-64 flex-col gap-1.5">
                {drafts.map((draft, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                        <span className="w-4 flex-shrink-0 text-right text-xs font-bold text-gray-400">{i + 1}.</span>
                        <input
                            value={draft.headline}
                            onChange={(e) => setDraft(i, 'headline', e.target.value)}
                            placeholder={`Headline ${i + 1}`}
                            aria-label={`Headline ${i + 1} for ${fullDate}`}
                            className="w-full rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-900 focus:border-sky-500 focus:outline-none"
                        />
                        <input
                            value={draft.source}
                            onChange={(e) => setDraft(i, 'source', e.target.value)}
                            placeholder="Outlet"
                            aria-label={`Headline ${i + 1} source for ${fullDate}`}
                            className="w-24 flex-shrink-0 rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-900 focus:border-sky-500 focus:outline-none"
                        />
                    </div>
                ))}
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={save}
                        disabled={!hasContent || saving}
                        className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
                    >
                        <Check size={12} /> Save
                    </button>
                    <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-600"
                    >
                        <X size={12} /> Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <span className="group inline-flex max-w-80 items-start gap-1.5 text-xs">
            <Newspaper size={14} className="mt-0.5 flex-shrink-0 text-gray-400" aria-hidden="true" />
            {headlines.length > 0 ? (
                <ol className="flex flex-col gap-0.5">
                    {headlines.map((item) => (
                        <li key={item.rank} className="line-clamp-2">
                            <span className="font-bold text-gray-400">{item.rank}. </span>
                            {item.url ? (
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-medium text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-sky-700"
                                >
                                    {item.headline}
                                </a>
                            ) : (
                                <span className="font-medium text-gray-700">{item.headline}</span>
                            )}
                            <span className="text-gray-400"> — {item.source}</span>
                        </li>
                    ))}
                </ol>
            ) : (
                <span className="text-gray-300">—</span>
            )}
            <button
                type="button"
                onClick={startEditing}
                title={headlines.length > 0 ? 'Correct headlines' : 'Record headlines'}
                aria-label={`${headlines.length > 0 ? 'Correct' : 'Record'} headlines for ${fullDate}`}
                className="mt-0.5 flex-shrink-0 rounded p-0.5 text-gray-300 opacity-0 hover:text-sky-600 focus:opacity-100 group-hover:opacity-100"
            >
                <Pencil size={12} />
            </button>
        </span>
    );
}

export function DailyMealsWeatherTable({ rows, title, subtitle }: DailyMealsWeatherTableProps) {
    const weatherByDate = useWeatherStore((s) => s.weatherByDate);
    const ensureLoaded = useWeatherStore((s) => s.ensureLoaded);
    const headlineByDate = useHeadlinesStore((s) => s.headlineByDate);
    const ensureHeadlinesLoaded = useHeadlinesStore((s) => s.ensureLoaded);

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
        void ensureHeadlinesLoaded({ startDate: dates[0], endDate: dates[dates.length - 1] });
    }, [serviceDays, ensureLoaded, ensureHeadlinesLoaded]);

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
                                    <th className="px-4 py-2.5 font-bold">Top 5 Bay Area headlines</th>
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
                                        <td className="px-4 py-2.5">
                                            <HeadlineCell
                                                fullDate={row.fullDate}
                                                headlines={headlineByDate[row.fullDate] || []}
                                            />
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
