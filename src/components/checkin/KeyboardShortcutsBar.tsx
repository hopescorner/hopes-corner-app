'use client';

interface KeyboardShortcutsBarProps {
    className?: string;
}

const MOBILE_SHORTCUTS: Array<{ key: string; label: string }> = [
    { key: '1', label: 'Meal' },
    { key: '2', label: 'Meals' },
    { key: 'S', label: 'Shower' },
    { key: 'L', label: 'Laundry' },
    { key: 'B', label: 'Bike' },
    { key: 'H', label: 'History' },
    { key: 'U', label: 'Undo' },
    { key: 'Esc', label: 'Clear' },
];

export function KeyboardShortcutsBar({ className = '' }: KeyboardShortcutsBarProps) {
    return (
        <div className={className}>
            {/* Condensed, horizontally scrollable hints for small screens */}
            <div className="sm:hidden flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {MOBILE_SHORTCUTS.map((shortcut) => (
                    <div
                        key={shortcut.key}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-gray-200 bg-gray-50 shrink-0"
                    >
                        <kbd className="px-1 py-0.5 text-[10px] font-bold text-gray-500 bg-white rounded border border-gray-200">{shortcut.key}</kbd>
                        <span className="text-[10px] font-medium text-gray-400">{shortcut.label}</span>
                    </div>
                ))}
            </div>

            {/* Full hint bar for larger screens */}
            <div className="hidden sm:flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded border border-gray-200">Ctrl+K</kbd>
                    <span className="font-medium text-gray-400">Search</span>
                </div>
                <span className="text-gray-200">·</span>
                <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded border border-gray-200">↑↓</kbd>
                    <span className="font-medium text-gray-400">Navigate</span>
                </div>
                <span className="text-gray-200">·</span>
                <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded border border-gray-200">Enter</kbd>
                    <span className="font-medium text-gray-400">Expand</span>
                </div>
                <span className="text-gray-200">·</span>
                <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded border border-gray-200">1</kbd>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded border border-gray-200">2</kbd>
                    <span className="font-medium text-gray-400">Log meals</span>
                </div>
                <span className="text-gray-200">·</span>
                <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded border border-gray-200">S</kbd>
                    <span className="font-medium text-gray-400">Shower</span>
                </div>
                <span className="text-gray-200">·</span>
                <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded border border-gray-200">L</kbd>
                    <span className="font-medium text-gray-400">Laundry</span>
                </div>
                <span className="text-gray-200">·</span>
                <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded border border-gray-200">B</kbd>
                    <span className="font-medium text-gray-400">Bike</span>
                </div>
                <span className="text-gray-200">·</span>
                <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded border border-gray-200">H</kbd>
                    <span className="font-medium text-gray-400">History</span>
                </div>
                <span className="text-gray-200">·</span>
                <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded border border-gray-200">U</kbd>
                    <span className="font-medium text-gray-400">Undo</span>
                </div>
                <span className="text-gray-200">·</span>
                <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded border border-gray-200">Esc</kbd>
                    <span className="font-medium text-gray-400">Clear</span>
                </div>
            </div>
        </div>
    );
}
