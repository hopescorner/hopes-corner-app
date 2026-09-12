'use client';

import { useEffect, useState, Fragment } from 'react';

interface KeyboardShortcutsBarProps {
    className?: string;
}

interface ShortcutHint {
    keys: string[];
    label: string;
}

// Shown by default: the hints a volunteer needs in the first hour.
const ESSENTIAL_SHORTCUTS: ShortcutHint[] = [
    { keys: ['Ctrl+K'], label: 'Search' },
    { keys: ['1', '2'], label: 'Log meals' },
    { keys: ['Esc'], label: 'Clear' },
];

// The full set, revealed via the "?" toggle (or pressing "?").
const ALL_SHORTCUTS: ShortcutHint[] = [
    { keys: ['Ctrl+K'], label: 'Search' },
    { keys: ['↑↓'], label: 'Navigate' },
    { keys: ['Enter'], label: 'Expand' },
    { keys: ['1', '2'], label: 'Log meals' },
    { keys: ['S'], label: 'Shower' },
    { keys: ['L'], label: 'Laundry' },
    { keys: ['B'], label: 'Bike' },
    { keys: ['H'], label: 'History' },
    { keys: ['U'], label: 'Undo' },
    { keys: ['Esc'], label: 'Clear' },
];

function KbdHint({ keys, label }: ShortcutHint) {
    return (
        <div className="flex items-center gap-1.5">
            {keys.map((key) => (
                <kbd key={key} className="px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded border border-gray-200">{key}</kbd>
            ))}
            <span className="font-medium text-gray-400">{label}</span>
        </div>
    );
}

export function KeyboardShortcutsBar({ className = '' }: KeyboardShortcutsBarProps) {
    const [expanded, setExpanded] = useState(false);
    const hints = expanded ? ALL_SHORTCUTS : ESSENTIAL_SHORTCUTS;

    // "?" toggles the full list (ignored while typing in an editable field)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key !== '?') return;
            const target = e.target as HTMLElement | null;
            if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
            setExpanded((value) => !value);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    return (
        // Hidden on small/touch screens: keyboard shortcuts require a physical keyboard.
        <div className={`${className} hidden sm:block`}>
            <div
                id="all-keyboard-shortcuts"
                className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500"
            >
                {hints.map((hint, index) => (
                    <Fragment key={hint.label}>
                        {index > 0 && <span className="text-gray-200">·</span>}
                        <KbdHint {...hint} />
                    </Fragment>
                ))}
                <span className="text-gray-200">·</span>
                <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    aria-expanded={expanded}
                    aria-controls="all-keyboard-shortcuts"
                    className="flex items-center gap-1.5 rounded-md px-1 py-0.5 -my-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                    <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded border border-gray-200">?</kbd>
                    <span className="font-medium">{expanded ? 'Fewer shortcuts' : 'All shortcuts'}</span>
                </button>
            </div>
        </div>
    );
}
