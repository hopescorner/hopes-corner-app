'use client';

import React from 'react';
import { RotateCcw, Ban } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface UndoButtonProps {
    title: string;
    label: string;
    onClick: (event: React.MouseEvent) => void;
    disabled?: boolean;
    className?: string;
}

export function UndoButton({
    title,
    label,
    onClick,
    disabled = false,
    className,
}: UndoButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            aria-label={label}
            className={cn(
                'flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2.5 text-orange-700 transition-all hover:bg-orange-100 active:scale-95 touch-manipulation disabled:opacity-50',
                className
            )}
        >
            <RotateCcw size={16} aria-hidden="true" />
        </button>
    );
}

export interface DisabledActionProps {
    label: string;
    reason: string;
    title?: string;
    className?: string;
}

export function DisabledAction({
    label,
    reason,
    title,
    className,
}: DisabledActionProps) {
    return (
        <div
            title={title}
            role="note"
            className={cn(
                'flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 px-3 text-gray-400 cursor-not-allowed select-none',
                className
            )}
        >
            <Ban size={15} aria-hidden="true" />
            <span className="text-[11px] font-bold leading-tight">{label}</span>
            <span className="text-[10px] font-semibold leading-tight">· {reason}</span>
        </div>
    );
}
