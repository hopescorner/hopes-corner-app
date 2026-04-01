import React from 'react';

interface SweatpantsIconProps {
    size?: number;
    className?: string;
    strokeWidth?: number;
}

/**
 * Custom sweatpants/trousers icon used in shower essentials.
 * Designed to match the lucide-react icon style.
 */
export function SweatpantsIcon({ size = 24, className = '', strokeWidth = 2 }: SweatpantsIconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M5.5 3h13a1.5 1.5 0 0 1 1.5 1.5v15a1.5 1.5 0 0 1-1.5 1.5h-4.5a1.5 1.5 0 0 1-1.5-1.5v-8a1 1 0 0 0-2 0v8a1.5 1.5 0 0 1-1.5 1.5h-4.5a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 5.5 3z" />
            <path d="M5 8h14" />
        </svg>
    );
}

export default SweatpantsIcon;
