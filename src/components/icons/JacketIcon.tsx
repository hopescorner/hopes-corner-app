import React from 'react';

interface JacketIconProps {
    size?: number;
    className?: string;
    strokeWidth?: number;
}

/**
 * Custom jacket icon used in shower essentials.
 *
 * Drawn as a hooded zip-up jacket: a rounded hood with a visible
 * face opening on top, shoulders flowing into long sleeves with cuff
 * bands, a center front zipper with a pull tab, two drawstrings
 * hanging from the collar, and slanted pocket welts above a straight
 * hem. Thick outlines match the lucide icon style.
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
            data-testid="jacket-icon"
            aria-hidden="true"
        >
            {/* Hood — outer arch */}
            <path d="M8.6 7.6 C8.6 3.8 15.4 3.8 15.4 7.6" />

            {/* Hood opening — inner arch (the face hole) */}
            <path d="M10.2 7.6 C10.2 5.8 13.8 5.8 13.8 7.6" />

            {/* Body silhouette: neck, shoulders, sleeves, cuffs, straight hem */}
            <path d="M9.4 7.8 L7.6 8.5 L4.8 9.8 L4.2 18.6 L7.2 18.6 L7.7 13.4 L7.7 20.8 L16.3 20.8 L16.3 13.4 L16.8 18.6 L19.8 18.6 L19.2 9.8 L16.4 8.5 L14.6 7.8" />

            {/* Center front zipper running from collar to hem */}
            <path d="M12 8.6 V20" />

            {/* Zipper pull tab on the chest */}
            <path d="M11.4 12.2 h1.2 v2 h-1.2 z" />

            {/* Left hoodie drawstring hanging from the collar */}
            <path d="M10.2 8.4 L9.9 10.6" />

            {/* Right hoodie drawstring hanging from the collar */}
            <path d="M13.8 8.4 L14.1 10.6" />

            {/* Slanted front pocket welts */}
            <path d="M8.6 17 L10.4 16" />
            <path d="M15.4 17 L13.6 16" />

            {/* Sleeve cuff bands */}
            <path d="M4.36 16.2 H7.43" />
            <path d="M16.57 16.2 H19.64" />
        </svg>
    );
}

export default JacketIcon;
