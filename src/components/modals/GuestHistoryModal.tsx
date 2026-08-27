'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, History, Loader2, X } from 'lucide-react';

export interface GuestHistoryEvent {
    id: string;
    type: string;
    occurredAt: string;
    title: string;
    detail?: string | null;
    status?: string | null;
}

interface GuestHistoryModalProps {
    guest: {
        id: string;
        preferredName?: string;
        firstName?: string;
        name?: string;
    };
    onClose: () => void;
}

export function GuestHistoryModal({ guest, onClose }: GuestHistoryModalProps) {
    const guestName = guest.preferredName || guest.firstName || guest.name || 'guest';
    const [events, setEvents] = useState<GuestHistoryEvent[]>([]);
    const [range, setRange] = useState<'30' | '90' | 'all'>('90');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const loadHistory = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(`/api/check-in/guests/${guest.id}/history`);
            const body = await response.json() as { events?: GuestHistoryEvent[]; error?: string };
            if (!response.ok) throw new Error(body.error || 'Unable to load guest history');
            setEvents(Array.isArray(body.events) ? body.events : []);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Unable to load guest history');
        } finally {
            setIsLoading(false);
        }
    }, [guest.id]);

    useEffect(() => {
        void loadHistory();
    }, [loadHistory]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const visibleEvents = useMemo(() => {
        const cutoff = range === 'all'
            ? Number.NEGATIVE_INFINITY
            : Date.now() - Number(range) * 24 * 60 * 60 * 1000;
        return [...events]
            .filter((event) => Date.parse(event.occurredAt) >= cutoff)
            .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
    }, [events, range]);

    const formatDate = (value: string) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Date unavailable';
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(date);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <section
                role="dialog"
                aria-modal="true"
                aria-label={`History for ${guestName}`}
                className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="flex items-center justify-between border-b border-gray-100 p-5">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Guest history</p>
                        <h2 className="text-xl font-bold text-gray-900">{guestName}</h2>
                    </div>
                    <button
                        type="button"
                        aria-label="Close history"
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    >
                        <X size={20} />
                    </button>
                </header>

                <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/70 px-5 py-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <CalendarDays size={16} className="text-gray-500" />
                        <span className="sr-only">History range</span>
                        <select
                            aria-label="History range"
                            value={range}
                            onChange={(event) => setRange(event.target.value as '30' | '90' | 'all')}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                        >
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 90 days</option>
                            <option value="all">All time</option>
                        </select>
                    </label>
                    {!isLoading && !error && (
                        <span className="text-xs font-medium text-gray-500">
                            {visibleEvents.length} {visibleEvents.length === 1 ? 'activity' : 'activities'}
                        </span>
                    )}
                </div>

                <div className="min-h-52 overflow-y-auto p-5">
                    {isLoading ? (
                        <div role="status" className="flex min-h-40 items-center justify-center gap-2 text-sm text-gray-500">
                            <Loader2 size={18} className="animate-spin" />
                            Loading history…
                        </div>
                    ) : error ? (
                        <div role="alert" className="flex min-h-40 flex-col items-center justify-center gap-3 text-center">
                            <AlertCircle size={28} className="text-red-500" />
                            <p className="text-sm font-medium text-red-700">{error}</p>
                            <button
                                type="button"
                                onClick={() => void loadHistory()}
                                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700"
                            >
                                Retry
                            </button>
                        </div>
                    ) : visibleEvents.length === 0 ? (
                        <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center text-gray-500">
                            <History size={28} />
                            <p className="text-sm font-medium">No activity in this date range.</p>
                        </div>
                    ) : (
                        <ol className="relative space-y-1 border-l-2 border-emerald-100 pl-6">
                            {visibleEvents.map((event) => (
                                <li key={`${event.type}-${event.id}`} className="relative pb-5">
                                    <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 ring-2 ring-emerald-100" />
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="font-bold text-gray-900">{event.title}</p>
                                            {event.detail && <p className="mt-0.5 text-sm text-gray-600">{event.detail}</p>}
                                        </div>
                                        <time dateTime={event.occurredAt} className="text-xs font-medium text-gray-500">
                                            {formatDate(event.occurredAt)}
                                        </time>
                                    </div>
                                    {event.status && (
                                        <span className="mt-2 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-gray-600">
                                            {event.status}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            </section>
        </div>
    );
}
