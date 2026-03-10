import React from 'react';

interface JacketIconProps {
    size?: number;
    className?: string;
    strokeWidth?: number;
}

/**
 * Custom jacket icon used in shower essentials.
 *
 * Kept intentionally simple so it reads clearly at small sizes in the
 * amenity grid.
 */
export function JacketIcon({ size = 24, className = '', strokeWidth = 2 }: JacketIconProps) {
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
            <path d="M9.5 3.5 12 5l2.5-1.5 3 2.3-1.4 4.5-2.1-1V20h-4V9.3l-2.1 1-1.4-4.5z" />
            <path d="M10 3V2h4v1" />
            <path d="M12 5v15" />
            <path d="M10 10.5h1.1" />
            <path d="M12.9 10.5H14" />
            <path d="M9.7 14.5h1.8" />
            <path d="M12.5 14.5h1.8" />
        </svg>
    );
}

export default JacketIcon;
