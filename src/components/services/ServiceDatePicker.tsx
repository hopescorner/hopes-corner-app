'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';

interface ServiceDatePickerProps {
    selectedDate: string; // YYYY-MM-DD format
    onDateChange: (date: string) => void;
    isAdmin: boolean;
}

/**
 * A date picker for staff/admin to view historical service data.
 * Shows "Today" by default with options to navigate to past dates.
 */
export function ServiceDatePicker({ selectedDate, onDateChange, isAdmin }: ServiceDatePickerProps) {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);
    const today = todayPacificDateString();

    // Close calendar when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setIsCalendarOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Don't render for non-admin users
    if (!isAdmin) return null;

    const isToday = selectedDate === today;
    const isPast = selectedDate < today;

    // Format the date for display
    const formatDateDisplay = (dateStr: string): string => {
        if (dateStr === today) return 'Today';
        const date = new Date(dateStr + 'T12:00:00');
        const diffDays = Math.floor((new Date(today + 'T12:00:00').getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) return 'Yesterday';
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    // Navigate to previous day
    const goToPreviousDay = () => {
        const current = new Date(selectedDate + 'T12:00:00');
        current.setDate(current.getDate() - 1);
        onDateChange(pacificDateStringFrom(current.toISOString()));
    };

    // Navigate to next day (but not past today)
    const goToNextDay = () => {
        const current = new Date(selectedDate + 'T12:00:00');
        current.setDate(current.getDate() + 1);
        const nextDate = pacificDateStringFrom(current.toISOString());
        if (nextDate <= today) {
            onDateChange(nextDate);
        }
    };

    // Jump back to today
    const goToToday = () => {
        onDateChange(today);
        setIsCalendarOpen(false);
    };

    // Generate calendar days for the selected month
    const generateCalendarDays = () => {
        const date = new Date(selectedDate + 'T12:00:00');
        const year = date.getFullYear();
        const month = date.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startPadding = firstDay.getDay();
        
        const days: { date: string; isCurrentMonth: boolean; isDisabled: boolean }[] = [];
        
        // Previous month padding
        for (let i = startPadding - 1; i >= 0; i--) {
            const d = new Date(year, month, -i);
            const dateStr = pacificDateStringFrom(d.toISOString());
            days.push({ date: dateStr, isCurrentMonth: false, isDisabled: dateStr > today });
        }
        
        // Current month days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const d = new Date(year, month, i);
            const dateStr = pacificDateStringFrom(d.toISOString());
            days.push({ date: dateStr, isCurrentMonth: true, isDisabled: dateStr > today });
        }
        
        // Next month padding (to fill 6 rows)
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            const d = new Date(year, month + 1, i);
            const dateStr = pacificDateStringFrom(d.toISOString());
            days.push({ date: dateStr, isCurrentMonth: false, isDisabled: dateStr > today });
        }
        
        return days;
    };

    const goToPreviousMonth = () => {
        const current = new Date(selectedDate + 'T12:00:00');
        current.setMonth(current.getMonth() - 1);
        onDateChange(pacificDateStringFrom(current.toISOString()));
    };

    const goToNextMonth = () => {
        const current = new Date(selectedDate + 'T12:00:00');
        current.setMonth(current.getMonth() + 1);
        const nextDate = pacificDateStringFrom(current.toISOString());
        // Only allow if the first day of next month is not in the future
        if (nextDate <= today) {
            onDateChange(nextDate);
        }
    };

    const calendarDays = generateCalendarDays();
    const monthYear = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="relative" ref={calendarRef}>
            <div className="flex items-center gap-2">
                {/* Previous Day Button */}
                <button
                    onClick={goToPreviousDay}
                    className="min-h-11 min-w-11 p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-700 transition-colors"
                    title="Previous day"
                    aria-label="Previous day"
                >
                    <ChevronLeft size={18} />
                </button>

                {/* Date Display / Calendar Toggle */}
                <button
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    className={cn(
                        "min-h-11 flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all border",
                        isPast
                            ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    )}
                    aria-label="Toggle calendar"
                >
                    {isPast ? <Clock size={16} /> : <Calendar size={16} />}
                    <span>{formatDateDisplay(selectedDate)}</span>
                </button>

                {/* Next Day Button */}
                <button
                    onClick={goToNextDay}
                    disabled={isToday}
                    className={cn(
                        "min-h-11 min-w-11 p-2 rounded-lg transition-colors",
                        isToday
                            ? "text-gray-600 cursor-not-allowed"
                            : "hover:bg-gray-100 text-gray-600 hover:text-gray-700"
                    )}
                    title="Next day"
                    aria-label="Next day"
                >
                    <ChevronRight size={18} />
                </button>

                {/* Today Button (only show when viewing past) */}
                {isPast && (
                    <button
                        onClick={goToToday}
                        className="min-h-11 min-w-11 px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-sm font-bold transition-colors"
                    >
                        Back to Today
                    </button>
                )}
            </div>

            {/* Calendar Dropdown */}
            {isCalendarOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50 w-[352px] max-w-[calc(100vw-2rem)]">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={goToPreviousMonth}
                            className="min-h-11 min-w-11 p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                            title="Previous month"
                            aria-label="Previous month"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="font-bold text-gray-900">{monthYear}</span>
                        <button
                            onClick={goToNextMonth}
                            disabled={new Date(selectedDate + 'T12:00:00').getMonth() === new Date().getMonth() &&
                                new Date(selectedDate + 'T12:00:00').getFullYear() === new Date().getFullYear()}
                            className={cn(
                                "p-1.5 rounded-lg",
                                new Date(selectedDate + 'T12:00:00').getMonth() === new Date().getMonth()
                                    ? "text-gray-600 cursor-not-allowed"
                                    : "hover:bg-gray-100 text-gray-600"
                            )}
                            title="Next month"
                            aria-label="Next month"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                            <div key={day} className="text-center text-xs font-bold text-gray-600 py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    if (!day.isDisabled) {
                                        onDateChange(day.date);
                                        setIsCalendarOpen(false);
                                    }
                                }}
                                disabled={day.isDisabled}
                                className={cn(
                                    "w-11 h-11 shrink-0 rounded-lg text-sm font-medium transition-all",
                                    day.isDisabled && "text-gray-600 cursor-not-allowed",
                                    !day.isDisabled && day.date === selectedDate && "bg-emerald-500 text-white",
                                    !day.isDisabled && day.date === today && day.date !== selectedDate && "ring-2 ring-emerald-300",
                                    !day.isDisabled && day.date !== selectedDate && "hover:bg-gray-100",
                                    !day.isCurrentMonth && "text-gray-600"
                                )}
                            >
                                {new Date(day.date + 'T12:00:00').getDate()}
                            </button>
                        ))}
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                        <button
                            onClick={goToToday}
                            className="min-h-11 min-w-11 flex-1 px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-sm font-bold transition-colors"
                        >
                            Today
                        </button>
                        <button
                            onClick={() => {
                                const yesterday = new Date();
                                yesterday.setDate(yesterday.getDate() - 1);
                                onDateChange(pacificDateStringFrom(yesterday.toISOString()));
                                setIsCalendarOpen(false);
                            }}
                            className="min-h-11 min-w-11 flex-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-bold transition-colors"
                        >
                            Yesterday
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
