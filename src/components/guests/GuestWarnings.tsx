'use client';

import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useGuestsStore } from '@/stores/useGuestsStore';

export const WARNING_SEVERITY_META: Record<number, { label: string; pill: string; dot: string }> = {
    1: { label: 'Low', pill: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500' },
    2: { label: 'Med', pill: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
    3: { label: 'High', pill: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
};

export function getActiveWarnings(warnings: any[], guestId: string) {
    return (warnings || []).filter((w: any) => w.guestId === guestId && w.active !== false);
}

export function getMaxWarningSeverity(activeWarnings: any[]): number {
    let max = 0;
    for (const w of activeWarnings) {
        const s = typeof w.severity === 'number' ? w.severity : 1;
        if (s > max) max = s;
    }
    return max;
}

export function GuestWarningBadge({
    guestId,
    fallbackCount,
    onExpand,
}: {
    guestId: string;
    fallbackCount: number;
    onExpand: () => void;
}) {
    const warnings = useGuestsStore((s) => s.warnings);
    const activeWarnings = useMemo(() => getActiveWarnings(warnings || [], guestId), [warnings, guestId]);
    const count = Math.max(activeWarnings.length, fallbackCount ?? 0);
    const maxSeverity = useMemo(() => getMaxWarningSeverity(activeWarnings), [activeWarnings]);

    if (count <= 0) return null;

    const tooltip =
        activeWarnings.length > 0
            ? activeWarnings
                  .slice(0, 3)
                  .map((w: any) => `• [${WARNING_SEVERITY_META[w.severity || 1]?.label || 'Low'}] ${w.message}`)
                  .join('\n') + (activeWarnings.length > 3 ? `\n+${activeWarnings.length - 3} more — tap to view` : '\nTap to view')
            : `${count} active warning${count === 1 ? '' : 's'} — tap to view`;

    const severityStyle =
        maxSeverity >= 3
            ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
            : maxSeverity === 2
              ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
              : 'bg-yellow-50 text-yellow-800 border-yellow-300 hover:bg-yellow-100';

    return (
        <button
            type="button"
            data-testid="warning-badge"
            title={tooltip}
            aria-label={`${count} active warning${count === 1 ? '' : 's'}${maxSeverity >= 3 ? ', includes high severity' : ''}. Activate to view warnings.`}
            onClick={(e) => {
                e.stopPropagation();
                onExpand();
            }}
            className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold transition-colors cursor-pointer',
                severityStyle,
                maxSeverity >= 3 && 'animate-pulse'
            )}
        >
            <AlertTriangle size={10} aria-hidden="true" />
            <span>{count}</span>
            <span>{count === 1 ? 'warning' : 'warnings'}</span>
            {maxSeverity >= 3 && <span className="uppercase tracking-wide">• high</span>}
        </button>
    );
}

export function GuestWarningsPanel({ guestId, onManage }: { guestId: string; onManage?: () => void }) {
    const warnings = useGuestsStore((s) => s.warnings);
    const activeWarnings = useMemo(() => getActiveWarnings(warnings || [], guestId), [warnings, guestId]);

    if (activeWarnings.length === 0) return null;

    const maxSeverity = getMaxWarningSeverity(activeWarnings);
    const containerStyle =
        maxSeverity >= 3
            ? 'bg-red-50/60 border-red-200'
            : maxSeverity === 2
              ? 'bg-amber-50/60 border-amber-200'
              : 'bg-yellow-50/60 border-yellow-200';

    return (
        <div id={`warnings-${guestId}`} data-testid="warnings-panel" className={cn('p-3 rounded-xl border mx-4 mb-3', containerStyle)}>
            <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={13} aria-hidden="true" className={maxSeverity >= 3 ? 'text-red-600' : 'text-amber-600'} />
                    Warnings ({activeWarnings.length})
                </p>
                {onManage && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onManage();
                        }}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-900 hover:underline"
                    >
                        Manage
                    </button>
                )}
            </div>
            <ul className="space-y-2">
                {activeWarnings.map((warning: any) => {
                    const meta = WARNING_SEVERITY_META[warning.severity || 1] || WARNING_SEVERITY_META[1];
                    return (
                        <li key={warning.id} className="flex items-start gap-2 rounded-lg bg-white/70 border border-black/5 px-2.5 py-2">
                            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', meta.dot)} aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={cn('rounded-full border px-1.5 py-px text-[9px] font-black uppercase', meta.pill)}>
                                        {meta.label}
                                    </span>
                                    {warning.createdAt && (
                                        <span className="text-[10px] text-gray-400">
                                            {new Date(warning.createdAt).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-800 mt-0.5 break-words">{warning.message}</p>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
