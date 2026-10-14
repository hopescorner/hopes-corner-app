import React from 'react';

interface JacketIconProps {
    size?: number;
    className?: string;
    strokeWidth?: number;
}

/**
 * Custom jacket icon used in shower essentials.
 *
 * Drawn as a bomber-style jacket: a stand-up collar band, a yoke
 * seam across the chest, a center front zipper, two slanted chest
 * pocket zippers, long sleeves with ribbed cuff bands, and a ribbed
 * hem. Outline only (no fills) with thick strokes matching the
 * lucide icon style. Coordinates are adapted from the reference
 * parka artwork, scaled onto the 24-unit grid.
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
            {/* Inset the artwork slightly so the thick strokes never clip
                at the viewBox edges (collar crown and cuff bottoms). */}
            <g transform="translate(1.08,1.08) scale(0.91)">
            {/* Outer silhouette: collar hump, shoulders, sleeves, cuffs, hem */}
            <path d="M19.12,3.94c-0.03-0.04-0.81-0.9-2.17-1.27C16.82,1.07,14.87,0.0,12.0,0.0 s-4.82,1.07-4.95,2.68C5.68,3.04,4.91,3.91,4.88,3.94c-0.01,0.01-1.14,1.98-2.0,5.15 C2.1,12.01,1.35,16.62,2.29,22.06c0.0,0.0,0.25,1.68,0.25,1.68c0.02,0.15,0.15,0.25,0.3,0.25h2.04 c0.15,0.0,0.27-0.11,0.3-0.26l0.23-1.65l0.25-0.52l0.07,0.31c0.03,0.14,0.15,0.23,0.29,0.23h11.99 c0.14,0.0,0.26-0.1,0.29-0.23l0.07-0.31l0.25,0.52l0.23,1.65c0.02,0.15,0.15,0.26,0.3,0.26h2.04 c0.15,0.0,0.27-0.11,0.3-0.25c0.0,0.0,0.25-1.68,0.25-1.68c0.93-5.44,0.19-10.06-0.6-12.97 C20.26,5.92,19.14,3.96,19.12,3.94z" />

            {/* Left sleeve */}
            <path d="M4.91,21.72H2.83c-0.85-5.21-0.14-9.64,0.62-12.45 c0.53-1.97,1.15-3.44,1.54-4.26l0.56,2.45c-1.46,5.61-0.32,12.17-0.24,12.64 c0.0,0.01,0.12,0.54,0.12,0.54L4.91,21.72z" />

            {/* Right sleeve */}
            <path d="M21.17,21.72 h-2.08l-0.52-1.07c0.0,0.0,0.12-0.52,0.12-0.54c0.08-0.47,1.22-7.04-0.24-12.64l0.56-2.45 c0.38,0.81,1.0,2.27,1.53,4.24C21.3,12.06,22.02,16.49,21.17,21.72z" />

            {/* Stand-up collar band */}
            <path d="M8.95,6.21 C8.95,3.94 10.26,3.1 11.99,3.1 C13.73,3.1 15.04,3.94 15.04,6.21 C15.04,6.68 14.68,6.92 14.2,6.8 L9.79,6.8 C9.31,6.92 8.95,6.68 8.95,6.21 Z" />

            {/* Yoke seam across the chest */}
            <path d="M5.97,7.28H18.02" />

            {/* Center front zipper */}
            <path d="M11.99,7.46V20.89" />

            {/* Slanted chest pocket zippers */}
            <path d="M7.58,12.59L6.68,17.25" />
            <path d="M16.41,12.59L17.31,17.25" />

            {/* Ribbed cuff bands */}
            <path d="M3.07,22.86H4.62" />
            <path d="M19.36,22.86H20.92" />

            {/* Ribbed hem band */}
            <path d="M5.37,20.59H18.62" />
            </g>
        </svg>
    );
}
