'use client';

interface KeyboardShortcutsBarProps {
    className?: string;
}

export function KeyboardShortcutsBar({ className = '' }: KeyboardShortcutsBarProps) {
    return (
        <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 ${className}`}>
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
    );
}
