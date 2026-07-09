import React from 'react';

interface BackpackIconProps {
    size?: number;
    className?: string;
    strokeWidth?: number;
}

/**
 * Custom backpack icon used in shower essentials.
 *
 * Drawn from scratch to read clearly as a real backpack at small
 * sizes: a top carry handle, a rounded main body, two shoulder
 * straps hooking over the sides, and a front pocket with a zipper.
 */
export function BackpackIcon({ size = 24, className = '', strokeWidth = 0.75 }: BackpackIconProps) {
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
            {/* Top carry handle */}
            <path d="M10.8 6 Q12 3.4 13.2 6" />

            {/* Main body — flat bottom, rounded top corners */}
            <path d="M6 19 V8 a2 2 0 0 1 2-2 h8 a2 2 0 0 1 2 2 v11 a2 2 0 0 1-2 2 h-8 a2 2 0 0 1-2-2 z" />

            {/* Left shoulder strap hooking over the side */}
            <path d="M7.5 6 C 5 6.5 4 10 5 14" />

            {/* Right shoulder strap hooking over the side */}
            <path d="M16.5 6 C 19 6.5 20 10 19 14" />

            {/* Front pocket */}
            <path d="M8.5 14 h7 a1 1 0 0 1 1 1 v3.5 a1 1 0 0 1-1 1 h-7 a1 1 0 0 1-1-1 V15 a1 1 0 0 1 1-1 z" />

            {/* Pocket zipper */}
            <path d="M9 15.5 H15" />
        </svg>
    );
}

export default BackpackIcon;
