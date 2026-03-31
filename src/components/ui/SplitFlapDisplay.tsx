'use client';

import { useEffect, useRef, memo } from 'react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// ── Individual flap tile ──────────────────────────────────────────────
interface FlapTileProps {
  digit: string;
  color?: 'blue' | 'purple' | 'amber' | 'gray';
  size?: 'sm' | 'md' | 'lg';
}

const TILE_SIZE = {
  sm: 'w-7 h-9',
  md: 'w-9 h-12',
  lg: 'w-12 h-16',
} as const;

const FONT_SIZE = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
} as const;

const COLOR_ACCENT = {
  blue: 'shadow-blue-500/20',
  purple: 'shadow-purple-500/20',
  amber: 'shadow-amber-500/20',
  gray: 'shadow-gray-500/20',
} as const;

/**
 * A single split-flap tile that uses direct DOM manipulation
 * for the flip animation to avoid React setState-in-effect lint issues.
 */
const FlapTile = memo(function FlapTile({ digit, color = 'blue', size = 'md' }: FlapTileProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const topSpanRef = useRef<HTMLSpanElement>(null);
  const bottomSpanRef = useRef<HTMLSpanElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const prevDigitRef = useRef(digit);
  const reducedMotion = useReducedMotion();

  // Set initial digit via data attribute
  useEffect(() => {
    if (topSpanRef.current) topSpanRef.current.dataset.digit = digit;
    if (bottomSpanRef.current) bottomSpanRef.current.dataset.digit = digit;
  }, []);

  useEffect(() => {
    if (prevDigitRef.current === digit) return;
    prevDigitRef.current = digit;

    const inner = innerRef.current;
    const topSpan = topSpanRef.current;
    const bottomSpan = bottomSpanRef.current;
    const highlight = highlightRef.current;
    if (!inner || !topSpan || !bottomSpan) return;

    if (reducedMotion) {
      topSpan.dataset.digit = digit;
      bottomSpan.dataset.digit = digit;
      return;
    }

    // Add flip animation class
    inner.classList.add('split-flap-flip');
    if (highlight) highlight.style.opacity = '1';

    // Swap digit at animation midpoint
    const swapTimer = setTimeout(() => {
      topSpan.dataset.digit = digit;
      bottomSpan.dataset.digit = digit;
    }, 150);

    // Remove animation class after completion
    const endTimer = setTimeout(() => {
      inner.classList.remove('split-flap-flip');
      if (highlight) highlight.style.opacity = '0';
    }, 300);

    return () => {
      clearTimeout(swapTimer);
      clearTimeout(endTimer);
    };
  }, [digit, reducedMotion]);

  return (
    <div
      className={cn(
        'split-flap-tile relative',
        TILE_SIZE[size],
        COLOR_ACCENT[color],
      )}
      style={{ perspective: '400px' }}
    >
      {/* Tile body — animation class added/removed via ref */}
      <div
        ref={innerRef}
        className={cn(
          'split-flap-inner absolute inset-0 rounded-[4px] bg-[#1a1a2e] overflow-hidden',
          'shadow-[inset_0_1px_3px_rgba(0,0,0,0.5),0_2px_8px_rgba(0,0,0,0.3)]',
        )}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Top half */}
        <div className="absolute inset-x-0 top-0 h-1/2 overflow-hidden">
          <div className={cn(
            'absolute inset-0 flex items-end justify-center pb-[1px]',
            'bg-gradient-to-b from-[#22223b] to-[#1a1a2e]',
          )}>
            <span
              ref={topSpanRef}
              className={cn(
                'split-flap-digit',
                FONT_SIZE[size],
                'font-black text-white leading-none select-none',
                'font-[system-ui]',
              )}
            />
          </div>
        </div>

        {/* Bottom half */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden">
          <div className={cn(
            'absolute inset-0 flex items-start justify-center pt-[1px]',
            'bg-gradient-to-b from-[#1a1a2e] to-[#16162a]',
          )}>
            <span
              ref={bottomSpanRef}
              className={cn(
                'split-flap-digit',
                FONT_SIZE[size],
                'font-black text-white/90 leading-none select-none',
                'font-[system-ui]',
              )}
            />
          </div>
        </div>

        {/* Horizontal split line — the mechanical seam */}
        <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/40 z-10" />

        {/* Metallic highlight sweep during flip */}
        <div
          ref={highlightRef}
          className={cn(
            'absolute inset-0 z-20 pointer-events-none',
            'bg-gradient-to-b from-transparent via-white/10 to-transparent',
            'opacity-0 transition-opacity duration-150',
          )}
        />
      </div>
    </div>
  );
});

// ── Full split-flap display ───────────────────────────────────────────
interface SplitFlapDisplayProps {
  value: number;
  color?: 'blue' | 'purple' | 'amber' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  minDigits?: number;
  className?: string;
}

export const SplitFlapDisplay = memo(function SplitFlapDisplay({
  value,
  color = 'blue',
  size = 'md',
  minDigits = 2,
  className,
}: SplitFlapDisplayProps) {
  const clamped = Math.max(0, value);
  const valueStr = String(clamped);
  const padded = valueStr.padStart(minDigits, '0');
  const digits = padded.split('');

  return (
    <div className={cn('inline-flex items-center', className)} role="presentation">
      {/* Screen-reader accessible value */}
      <span className="sr-only">{clamped}</span>

      <div className="flex gap-[3px]" aria-hidden="true">
        {digits.map((d, i) => (
          <FlapTile key={`${i}-${digits.length}`} digit={d} color={color} size={size} />
        ))}
      </div>
    </div>
  );
});

export default SplitFlapDisplay;
