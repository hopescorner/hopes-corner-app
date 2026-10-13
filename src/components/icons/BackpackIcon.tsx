import React from 'react';

interface BackpackIconProps {
    size?: number;
    className?: string;
    strokeWidth?: number;
}

/**
 * Custom backpack icon used in shower essentials.
 *
 * Drawn as a real front-facing backpack: a rounded grab handle on
 * top, a domed main body with rounded bottom corners, a lid seam,
 * and a front pocket with a zipper and pull. Thick outlines match
 * the lucide icon style.
 */
export function BackpackIcon({ size = 24, className = '', strokeWidth = 2 }: BackpackIconProps) {
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
            data-testid="backpack-icon"
            aria-hidden="true"
        >
            {/* Top grab handle */}
            <path d="M9.8 7.2 V6 a2.2 2.2 0 0 1 4.4 0 v1.2" />

            {/* Main body — domed top, rounded bottom corners */}
            <path d="M7 19.5 v-7.3 a5 5 0 0 1 10 0 v7.3 a2.5 2.5 0 0 1-2.5 2.5 h-5 A2.5 2.5 0 0 1 7 19.5 z" />

            {/* Lid seam */}
            <path d="M8.5 11.6 h7" />

            {/* Front pocket */}
            <path d="M9.2 15 h5.6 a1 1 0 0 1 1 1 v2.2 a1.4 1.4 0 0 1-1.4 1.4 H9.6 A1.4 1.4 0 0 1 8.2 18 v-2 a1 1 0 0 1 1-1 z" />

            {/* Pocket zipper */}
            <path d="M9.4 16.2 h5.2" />

            {/* Zipper pull */}
            <path d="M12 16.2 v1.3" />
        </svg>
    );
}

export default BackpackIcon;
