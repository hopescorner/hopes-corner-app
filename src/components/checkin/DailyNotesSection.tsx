'use client';

import { useState, useMemo } from 'react';
import { StickyNote, ChevronDown, ChevronUp, Plus, Edit2, Utensils, ShowerHead, Shirt, FileText } from 'lucide-react';
import { useDailyNotesStore, DailyNote } from '@/stores/useDailyNotesStore';
import { useModalStore } from '@/stores/useModalStore';
import { DailyNoteServiceType } from '@/types/database';
import { todayPacificDateString } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';

// Simple date formatter
const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

const SERVICE_CONFIG: Record<DailyNoteServiceType, { icon: typeof Utensils; label: string; color: string; bgColor: string }> = {
    meals: { icon: Utensils, label: 'Meals', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    showers: { icon: ShowerHead, label: 'Showers', color: 'text-sky-600', bgColor: 'bg-sky-50' },
    laundry: { icon: Shirt, label: 'Laundry', color: 'text-violet-600', bgColor: 'bg-violet-50' },
    general: { icon: FileText, label: 'General', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

interface NoteCardProps {
    note: DailyNote;
    onEdit: () => void;
}

function NoteCard({ note, onEdit }: NoteCardProps) {
    const config = SERVICE_CONFIG[note.serviceType];
    const Icon = config.icon;

    return (
        <button
            onClick={onEdit}
            className={cn(
                "w-full p-3 rounded-xl border transition-all text-left group hover:shadow-md",
                config.bgColor,
                "border-transparent hover:border-gray-200"
            )}
        >
            <div className="flex items-start gap-2">
                <div className={cn("mt-0.5", config.color)}>
                    <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-xs font-bold", config.color)}>{config.label}</span>
                        <Edit2 size={10} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{note.noteText}</p>
                </div>
            </div>
        </button>
    );
}

interface AddNoteButtonProps {
    serviceType: DailyNoteServiceType;
    onClick: () => void;
}

function AddNoteButton({ serviceType, onClick }: AddNoteButtonProps) {
    const config = SERVICE_CONFIG[serviceType];
    const Icon = config.icon;

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed transition-all",
                "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-500 hover:text-gray-700"
            )}
        >
            <Icon size={14} />
            <span className="text-xs font-medium">{config.label}</span>
            <Plus size={12} className="ml-auto" />
        </button>
    );
}

export function DailyNotesSection() {
    const [isExpanded, setIsExpanded] = useState(false);
    const { notes, getNotesForDate } = useDailyNotesStore();
    const { openNoteModal } = useModalStore();

    const today = todayPacificDateString();
    const todaysNotes = useMemo(() => getNotesForDate(today), [notes, getNotesForDate, today]);
    const hasNotes = todaysNotes.length > 0;

    // Services without notes today
    const servicesWithoutNotes = useMemo(() => {
        const existingTypes = new Set(todaysNotes.map((n) => n.serviceType));
        return (['meals', 'showers', 'laundry', 'general'] as DailyNoteServiceType[]).filter(
            (type) => !existingTypes.has(type)
        );
    }, [todaysNotes]);

    const handleAddNote = (serviceType: DailyNoteServiceType) => {
        openNoteModal(today, serviceType);
    };

    const handleEditNote = (note: DailyNote) => {
        openNoteModal(note.noteDate, note.serviceType);
    };

    const formattedDate = formatDate(today);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header - Always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center",
                        hasNotes ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-400"
                    )}>
                        <StickyNote size={16} />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-bold text-gray-900">Daily Notes</h3>
                        <p className="text-xs text-gray-500">
                            {hasNotes ? (
                                <span>{todaysNotes.length} note{todaysNotes.length !== 1 ? 's' : ''} for {formattedDate}</span>
                            ) : (
                                <span>No notes for {formattedDate}</span>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {hasNotes && (
                        <div className="flex -space-x-1">
                            {todaysNotes.slice(0, 3).map((note) => {
                                const config = SERVICE_CONFIG[note.serviceType];
                                const Icon = config.icon;
                                return (
                                    <div
                                        key={note.id}
                                        className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center border-2 border-white",
                                            config.bgColor, config.color
                                        )}
                                    >
                                        <Icon size={10} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {isExpanded ? (
                        <ChevronUp size={18} className="text-gray-400" />
                    ) : (
                        <ChevronDown size={18} className="text-gray-400" />
                    )}
                </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-4">
                    {/* Existing Notes */}
                    {hasNotes && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Today&apos;s Notes</h4>
                            <div className="grid gap-2">
                                {todaysNotes.map((note) => (
                                    <NoteCard key={note.id} note={note} onEdit={() => handleEditNote(note)} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Add Note Buttons */}
                    {servicesWithoutNotes.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Add Note</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {servicesWithoutNotes.map((serviceType) => (
                                    <AddNoteButton
                                        key={serviceType}
                                        serviceType={serviceType}
                                        onClick={() => handleAddNote(serviceType)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All notes added - Add more link */}
                    {servicesWithoutNotes.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-2">
                            Notes added for all services today
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
