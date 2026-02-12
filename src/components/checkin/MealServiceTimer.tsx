'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { getMealServiceStatus, MealServiceStatus, isSundayBrunch } from '@/lib/utils/mealServiceTime';
import { cn } from '@/lib/utils/cn';

export function MealServiceTimer() {
    const [status, setStatus] = useState<MealServiceStatus | null>(null);

    useEffect(() => {
        // Initial set
        const timer = setTimeout(() => {
            setStatus(getMealServiceStatus());
        }, 0);

        // Update every minute (or 30s)
        const interval = setInterval(() => {
            setStatus(getMealServiceStatus());
        }, 30 * 1000);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, []);

    if (!status || status.type === 'no-service') return null;

    const getStatusColor = () => {
        // Sunday Brunch uses red color scheme
        if (isSundayBrunch()) {
            switch (status.type) {
                case 'before-service':
                    return 'text-red-600 bg-red-50 border-red-200';
                case 'during-service':
                    if ((status.timeRemaining || 0) <= 10) {
                        return 'text-red-700 bg-red-100 border-red-300';
                    }
                    if ((status.timeRemaining || 0) <= 20) {
                        return 'text-red-600 bg-red-50 border-red-200';
                    }
                    return 'text-red-600 bg-red-50 border-red-200';
                case 'ended':
                    return 'text-red-500 bg-red-50 border-red-200';
                default:
                    return 'text-red-500 bg-red-50 border-red-200';
            }
        }

        // Default colors for other days
        switch (status.type) {
            case 'before-service':
                return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'during-service':
                if ((status.timeRemaining || 0) <= 10) {
                    return 'text-red-700 bg-red-50 border-red-200';
                }
                if ((status.timeRemaining || 0) <= 20) {
                    return 'text-orange-700 bg-orange-50 border-orange-200';
                }
                return 'text-emerald-700 bg-emerald-50 border-emerald-200';
            case 'ended':
                return 'text-gray-500 bg-gray-50 border-gray-200';
            default:
                return 'text-gray-500 bg-gray-50 border-gray-200';
        }
    };

    const getProgressWidth = () => {
        if (status.type === 'during-service' && status.totalDuration && status.elapsed !== undefined) {
            const progress = (status.elapsed / status.totalDuration) * 100;
            return Math.min(100, Math.max(0, progress));
        }
        return 0;
    };

    const getProgressBarColor = () => {
        // Sunday Brunch uses red progress bar
        if (isSundayBrunch()) {
            return 'bg-red-400';
        }

        // Default colors for other days
        const remaining = status.timeRemaining || 0;
        if (remaining <= 10) return 'bg-red-400';
        if (remaining <= 20) return 'bg-orange-400';
        return 'bg-emerald-400';
    };

    return (
        <div
            className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors duration-300",
                getStatusColor()
            )}
        >
            <Clock size={13} className="shrink-0" />
            <span className="whitespace-nowrap">{status.message}</span>

            {status.type === 'during-service' && (
                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden ml-1">
                    <div
                        className={cn("h-full transition-all duration-500", getProgressBarColor())}
                        style={{ width: `${getProgressWidth()}%` }}
                    />
                </div>
            )}
        </div>
    );
}
