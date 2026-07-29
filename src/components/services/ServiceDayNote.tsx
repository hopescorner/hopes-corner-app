'use client';

import { useMemo } from 'react';
import { Pencil, Plus, StickyNote } from 'lucide-react';
import { useDailyNotesStore } from '@/stores/useDailyNotesStore';
import { useModalStore } from '@/stores/useModalStore';
import type { DailyNoteServiceType } from '@/types/database';
import { cn } from '@/lib/utils/cn';

interface ServiceDayNoteProps {
    date: string;
    serviceType: Extract<DailyNoteServiceType, 'meals' | 'showers' | 'laundry'>;
}

const SERVICE_NOTE_CONFIG = {
    meals: {
        label: 'Meal',
        ariaLabel: 'meal',
        accent: 'text-orange-700',
        background: 'bg-orange-50',
        border: 'border-orange-200',
        button: 'text-orange-700 hover:bg-orange-100',
    },
    showers: {
        label: 'Shower',
        ariaLabel: 'shower',
        accent: 'text-sky-700',
        background: 'bg-sky-50',
        border: 'border-sky-200',
        button: 'text-sky-700 hover:bg-sky-100',
    },
    laundry: {
        label: 'Laundry',
        ariaLabel: 'laundry',
        accent: 'text-violet-700',
        background: 'bg-violet-50',
        border: 'border-violet-200',
        button: 'text-violet-700 hover:bg-violet-100',
    },
} as const;

const formatNoteDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

export function ServiceDayNote({ date, serviceType }: ServiceDayNoteProps) {
    const notes = useDailyNotesStore((state) => state.notes);
    const openNoteModal = useModalStore((state) => state.openNoteModal);
    const config = SERVICE_NOTE_CONFIG[serviceType];

    const note = useMemo(() => {
        const serviceNotes = notes.filter((candidate) => candidate.serviceType === serviceType);
        return serviceNotes.find((candidate) => candidate.noteDate === date)
            || serviceNotes.find((candidate) => (
                !!candidate.noteEndDate
                && candidate.noteDate <= date
                && candidate.noteEndDate >= date
            ))
            || null;
    }, [date, notes, serviceType]);

    if (!note) {
        return (
            <div className={cn('flex items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3', config.border, config.background)}>
                <div className="flex min-w-0 items-center gap-3">
                    <StickyNote size={18} className={config.accent} />
                    <div>
                        <p className={cn('text-sm font-bold', config.accent)}>No {config.label.toLowerCase()} note</p>
                        <p className="text-xs text-gray-500">Add context for {formatNoteDate(date)}.</p>
                    </div>
                </div>
                <button
                    type="button"
                    aria-label={`Add ${config.ariaLabel} note`}
                    onClick={() => openNoteModal(date, serviceType)}
                    className={cn('flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors', config.button)}
                >
                    <Plus size={14} />
                    Add note
                </button>
            </div>
        );
    }

    return (
        <div className={cn('rounded-xl border px-4 py-3', config.border, config.background)}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <StickyNote size={18} className={cn('mt-0.5 shrink-0', config.accent)} />
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className={cn('text-sm font-bold', config.accent)}>{config.label} note</p>
                            {note.noteEndDate && (
                                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                                    {formatNoteDate(note.noteDate)} – {formatNoteDate(note.noteEndDate)}
                                </span>
                            )}
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{note.noteText}</p>
                    </div>
                </div>
                <button
                    type="button"
                    aria-label={`Edit ${config.ariaLabel} note`}
                    onClick={() => openNoteModal(note.noteDate, serviceType)}
                    className={cn('flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors', config.button)}
                >
                    <Pencil size={13} />
                    Edit
                </button>
            </div>
        </div>
    );
}
