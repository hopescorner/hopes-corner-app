'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, StickyNote, Loader2, CalendarDays, Trash2, User, Clock, CalendarRange } from 'lucide-react';
import { useModalStore } from '@/stores/useModalStore';
import { useDailyNotesStore } from '@/stores/useDailyNotesStore';
import { DailyNoteServiceType } from '@/types/database';
import { todayPacificDateString } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

// Simple date formatters
const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (isoStr: string) => {
    const date = new Date(isoStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
        ' at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const SERVICE_TYPE_CONFIG: Record<DailyNoteServiceType, { label: string; color: string; bgColor: string; borderColor: string }> = {
    meals: { label: 'Meals', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
    showers: { label: 'Showers', color: 'text-sky-600', bgColor: 'bg-sky-50', borderColor: 'border-sky-200' },
    laundry: { label: 'Laundry', color: 'text-violet-600', bgColor: 'bg-violet-50', borderColor: 'border-violet-200' },
    general: { label: 'General', color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
};

const MAX_NOTE_LENGTH = 2000;

export function DailyNoteModal() {
    const { notePickerContext, setNotePickerContext } = useModalStore();
    const { getNoteForDateAndService, addOrUpdateNote, deleteNote } = useDailyNotesStore();
    const { data: session } = useSession();
    const userEmail = session?.user?.email || 'Unknown';

    const [selectedDate, setSelectedDate] = useState<string>(todayPacificDateString());
    const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
    const [isMultiDay, setIsMultiDay] = useState(false);
    const [selectedServiceType, setSelectedServiceType] = useState<DailyNoteServiceType>('general');
    const [noteText, setNoteText] = useState('');
    const [isPending, setIsPending] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (notePickerContext) {
            setSelectedDate(notePickerContext.date);
            setSelectedServiceType(notePickerContext.serviceType);

            const existingNote = getNoteForDateAndService(notePickerContext.date, notePickerContext.serviceType);
            setNoteText(existingNote?.noteText || '');
            if (existingNote?.noteEndDate) {
                setIsMultiDay(true);
                setSelectedEndDate(existingNote.noteEndDate);
            } else {
                setIsMultiDay(false);
                setSelectedEndDate(null);
            }
        }
    }, [notePickerContext, getNoteForDateAndService]);

    useEffect(() => {
        const existingNote = getNoteForDateAndService(selectedDate, selectedServiceType);
        setNoteText(existingNote?.noteText || '');
        if (existingNote?.noteEndDate) {
            setIsMultiDay(true);
            setSelectedEndDate(existingNote.noteEndDate);
        } else {
            setIsMultiDay(false);
            setSelectedEndDate(null);
        }
    }, [selectedDate, selectedServiceType, getNoteForDateAndService]);

    const existingNote = useMemo(() => {
        return getNoteForDateAndService(selectedDate, selectedServiceType);
    }, [selectedDate, selectedServiceType, getNoteForDateAndService]);

    const isEditMode = !!existingNote;
    const config = SERVICE_TYPE_CONFIG[selectedServiceType];

    const handleSave = async () => {
        if (isPending || isDeleting) return;

        const trimmed = noteText.trim();
        if (!trimmed) {
            toast.error('Please enter a note');
            return;
        }

        if (isMultiDay && selectedEndDate && selectedEndDate < selectedDate) {
            toast.error('End date must be on or after start date');
            return;
        }

        setIsPending(true);
        try {
            const endDate = isMultiDay ? (selectedEndDate || null) : null;
            await addOrUpdateNote(selectedDate, selectedServiceType, trimmed, userEmail, endDate);
            toast.success(isEditMode ? 'Note updated' : 'Note added');
            setNotePickerContext(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to save note');
        } finally {
            setIsPending(false);
        }
    };

    const handleDelete = async () => {
        if (!existingNote || isPending || isDeleting) return;

        setIsDeleting(true);
        try {
            const success = await deleteNote(existingNote.id);
            if (success) {
                toast.success('Note deleted');
                setNotePickerContext(null);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete note');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleClose = () => {
        setNotePickerContext(null);
    };

    if (!notePickerContext) return null;

    const formattedDate = formatFullDate(selectedDate);
    const charCount = noteText.length;
    const isNearLimit = charCount >= MAX_NOTE_LENGTH - 200;
    const isAtLimit = charCount >= MAX_NOTE_LENGTH;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className={cn("p-6 border-b flex items-center justify-between", config.bgColor, config.borderColor)}>
                    <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", 
                            selectedServiceType === 'meals' && 'bg-orange-500 shadow-orange-200',
                            selectedServiceType === 'showers' && 'bg-sky-500 shadow-sky-200',
                            selectedServiceType === 'laundry' && 'bg-violet-500 shadow-violet-200',
                            selectedServiceType === 'general' && 'bg-gray-500 shadow-gray-200',
                        )}>
                            <StickyNote size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                                {isEditMode ? 'Edit Note' : 'Add Note'}
                            </h2>
                            <p className="text-sm text-gray-500 font-medium">
                                {isMultiDay && selectedEndDate
                                    ? `${formattedDate} — ${formatFullDate(selectedEndDate)}`
                                    : formattedDate}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Date Picker */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            <CalendarDays size={14} className="inline mr-1.5" />
                            {isMultiDay ? 'Start Date' : 'Date'}
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Multi-Day Toggle */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            role="switch"
                            aria-checked={isMultiDay}
                            onClick={() => {
                                const next = !isMultiDay;
                                setIsMultiDay(next);
                                if (!next) setSelectedEndDate(null);
                            }}
                            className={cn(
                                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                                isMultiDay ? "bg-sky-500" : "bg-gray-200"
                            )}
                        >
                            <span
                                className={cn(
                                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                                    isMultiDay ? "translate-x-5" : "translate-x-0"
                                )}
                            />
                        </button>
                        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                            <CalendarRange size={14} className="text-gray-400" />
                            Multi-day note
                        </div>
                    </div>

                    {/* End Date Picker */}
                    {isMultiDay && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                <CalendarDays size={14} className="inline mr-1.5" />
                                End Date
                            </label>
                            <input
                                type="date"
                                value={selectedEndDate || ''}
                                min={selectedDate}
                                onChange={(e) => setSelectedEndDate(e.target.value || null)}
                                className={cn(
                                    "w-full px-4 py-3 border rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all",
                                    selectedEndDate && selectedEndDate < selectedDate ? "border-red-300" : "border-gray-200"
                                )}
                            />
                            {selectedEndDate && selectedEndDate < selectedDate && (
                                <p className="mt-1 text-xs text-red-500 font-medium">End date must be on or after start date</p>
                            )}
                        </div>
                    )}

                    {/* Service Type Selector */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Service Type
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {(Object.keys(SERVICE_TYPE_CONFIG) as DailyNoteServiceType[]).map((type) => {
                                const typeConfig = SERVICE_TYPE_CONFIG[type];
                                const isSelected = selectedServiceType === type;
                                return (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedServiceType(type)}
                                        className={cn(
                                            "px-4 py-3 rounded-xl font-bold text-sm transition-all border-2",
                                            isSelected
                                                ? cn(typeConfig.bgColor, typeConfig.borderColor, typeConfig.color)
                                                : "bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100"
                                        )}
                                    >
                                        {typeConfig.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Note Text */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Note
                        </label>
                        <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value.slice(0, MAX_NOTE_LENGTH))}
                            placeholder="Enter operational context for this day (e.g., weather conditions, staffing issues, events)..."
                            rows={6}
                            className={cn(
                                "w-full px-4 py-3 border rounded-xl text-gray-900 font-medium resize-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all",
                                isAtLimit ? "border-red-300" : "border-gray-200"
                            )}
                        />
                        <div className={cn(
                            "mt-1 text-xs font-medium text-right",
                            isAtLimit ? "text-red-500" : isNearLimit ? "text-amber-500" : "text-gray-400"
                        )}>
                            {charCount} / {MAX_NOTE_LENGTH}
                        </div>
                    </div>

                    {/* Audit Trail (for existing notes) */}
                    {existingNote && (
                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Audit Trail</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <User size={14} className="text-gray-400" />
                                <span>Created by <strong>{existingNote.createdBy || 'Unknown'}</strong></span>
                            </div>
                            {existingNote.createdAt && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Clock size={14} className="text-gray-400" />
                                    <span>on {formatDateTime(existingNote.createdAt)}</span>
                                </div>
                            )}
                            {existingNote.updatedBy && existingNote.updatedBy !== existingNote.createdBy && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t border-gray-200">
                                    <User size={14} className="text-gray-400" />
                                    <span>Last updated by <strong>{existingNote.updatedBy}</strong></span>
                                    {existingNote.updatedAt && (
                                        <span className="text-gray-400">
                                            on {formatDateTime(existingNote.updatedAt)}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div>
                        {isEditMode && (
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting || isPending}
                                className="px-4 py-2 rounded-xl text-red-600 font-bold hover:bg-red-50 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                Delete Note
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleClose}
                            className="px-6 py-3 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isPending || isDeleting || !noteText.trim()}
                            className="px-6 py-3 rounded-xl bg-sky-500 text-white font-bold hover:bg-sky-600 shadow-lg shadow-sky-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isPending ? <Loader2 size={16} className="animate-spin" /> : <StickyNote size={16} />}
                            {isEditMode ? 'Update Note' : 'Save Note'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
