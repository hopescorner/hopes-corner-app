import React from 'react';

interface SleepingBagIconProps {
    size?: number;
    className?: string;
    strokeWidth?: number;
}

/**
 * Custom sleeping bag icon used in shower essentials.
 *
 * Mummy-bag silhouette with hood opening and zipper so it reads
 * clearly at small sizes in the amenity grid.
 */
export function SleepingBagIcon({ size = 24, className = '', strokeWidth = 2 }: SleepingBagIconProps) {
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
            data-testid="sleeping-bag-icon"
            aria-hidden="true"
        >
            {/* Bag body — elongated mummy shape */}
            <path d="M8 6.5C8 4.01 9.79 2 12 2s4 2.01 4 4.5v12a2.5 2.5 0 0 1-2.5 2.5h-3A2.5 2.5 0 0 1 8 18.5z" />
            {/* Hood / head opening */}
            <path d="M9.5 6.2c0-1.1 1.12-1.9 2.5-1.9s2.5.8 2.5 1.9" />
            {/* Center zipper */}
            <path d="M12 8v10" />
            {/* Zipper pulls */}
            <path d="M12 10.5h1.4" />
            <path d="M12 13.5h1.4" />
            <path d="M12 16.5h1.4" />
        </svg>
    );
}

export default SleepingBagIcon;
