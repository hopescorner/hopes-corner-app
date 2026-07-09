import React from 'react';

interface JacketIconProps {
    size?: number;
    className?: string;
    strokeWidth?: number;
}

/**
 * Custom jacket icon used in shower essentials.
 *
 * Drawn as a hooded rain jacket: a rounded hood with a visible
 * opening on top, sleeves extending out past the torso, two
 * drawstrings hanging from the collar, and a center front zipper.
 * Reads clearly at small sizes in the amenity grid.
 */
export function JacketIcon({ size = 24, className = '', strokeWidth = 0.75 }: JacketIconProps) {
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
            {/* Body silhouette: neck notch, shoulders, sleeves extending out, cuffs, armpits, straight hem */}
            <path d="M9.5 6 Q12 5.4 14.5 6 L15.6 6.5 L19 8 L19 20 L16.5 20 L16 13 L16 21 L8 21 L8 13 L7.5 20 L4.5 20 L4.5 8 L8.4 6.5 Z" />

            {/* Hood — outer top arch */}
            <path d="M8.5 6 C8.5 2 15.5 2 15.5 6" />

            {/* Hood opening — inner arch (the face hole) */}
            <path d="M10 6 C10 4 14 4 14 6" />

            {/* Left hoodie drawstring hanging from the collar */}
            <path d="M10.5 6.5 L10.3 10" />

            {/* Right hoodie drawstring hanging from the collar */}
            <path d="M13.5 6.5 L13.7 10" />

            {/* Center front zipper running from collar to hem */}
            <path d="M12 6.5 V20" />
        </svg>
    );
}

export default JacketIcon;
