'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isTurkeySeason } from '@/lib/seasonal';

const RUN_DURATION_MS = 4200;

const TAIL_ANGLES = [-54, -39, -24, -10, 4, 18, 33];

/**
 * Wild-turkey Easter egg for the check-in page.
 *
 * Season-gated by {@link isTurkeySeason}: Nov 15 through the last
 * Thursday of November, every year. The sentinel at the bottom of the
 * check-in content triggers one left-to-right run across the viewport
 * per scroll-to-bottom. Purely decorative: `pointer-events-none`,
 * `aria-hidden`, no controls — it never intercepts interaction.
 */
export function RunningTurkey({ active }: { active?: boolean }) {
    const seasonalActive = useMemo(() => isTurkeySeason(), []);
    const isActive = active ?? seasonalActive;

    const sentinelRef = useRef<HTMLDivElement>(null);
    const isRunningRef = useRef(false);
    const canTriggerRef = useRef(true);
    const timeoutRef = useRef<number | null>(null);
    const [isRunning, setIsRunning] = useState(false);

    const finishRun = useCallback(() => {
        isRunningRef.current = false;
        if (timeoutRef.current !== null) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsRunning(false);
    }, []);

    const startRun = useCallback(() => {
        if (isRunningRef.current || !canTriggerRef.current) return;
        canTriggerRef.current = false;
        isRunningRef.current = true;
        setIsRunning(true);
        timeoutRef.current = window.setTimeout(() => finishRun(), RUN_DURATION_MS + 400);
    }, [finishRun]);

    useEffect(() => {
        if (!isActive) return;
        const el = sentinelRef.current;
        if (!el) return;

        let observer: IntersectionObserver | null = null;
        let fallbackCleanup: (() => void) | null = null;

        if (typeof IntersectionObserver !== 'undefined') {
            observer = new IntersectionObserver(
                (entries) => {
                    for (const entry of entries) {
                        if (entry.isIntersecting) {
                            startRun();
                        } else {
                            // Re-arm once the user scrolls away from the bottom,
                            // so a later scroll-to-bottom runs the turkey again.
                            canTriggerRef.current = true;
                        }
                    }
                },
                { root: null, rootMargin: '0px 0px 120px 0px', threshold: 0 }
            );
            observer.observe(el);
        } else {
            const check = () => {
                const rect = el.getBoundingClientRect();
                if (rect.top <= window.innerHeight + 120) {
                    startRun();
                } else {
                    canTriggerRef.current = true;
                }
            };
            window.addEventListener('scroll', check, { passive: true });
            window.addEventListener('resize', check);
            check();
            fallbackCleanup = () => {
                window.removeEventListener('scroll', check);
                window.removeEventListener('resize', check);
            };
        }

        return () => {
            observer?.disconnect();
            fallbackCleanup?.();
            if (timeoutRef.current !== null) {
                window.clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [isActive, startRun]);

    if (!isActive) return null;

    return (
        <>
            {/* Scroll sentinel: sits at the very bottom of the check-in page. */}
            <div
                ref={sentinelRef}
                data-testid="running-turkey-sentinel"
                aria-hidden="true"
                className="h-px w-full shrink-0"
            />
            {isRunning && (
                <div
                    data-testid="running-turkey-overlay"
                    aria-hidden="true"
                    className="pointer-events-none fixed inset-x-0 bottom-[9.5rem] z-20 select-none overflow-hidden md:bottom-6"
                >
                    <div
                        data-testid="running-turkey-runner"
                        onAnimationEnd={finishRun}
                        className="turkey-run-across w-[220px] sm:w-[280px] md:w-[340px]"
                    >
                        <svg
                            data-testid="running-turkey-svg"
                            viewBox="0 0 380 260"
                            className="block h-auto w-full"
                            role="presentation"
                            aria-hidden="true"
                        >
                            <style>
                                {`
                                /* Wide running stride: each leg pivots from a fixed hip under
                                   the body (origin tuned to the hip, no hip translation so the
                                   leg can never detach). Feet sweep front→back in a wide arc,
                                   crossing past each other mid-cycle with the near (front) leg
                                   always drawn over the far (back) leg. Opposite phase per leg. */
                                .turkey-leg { transform-box: fill-box; will-change: transform; }
                                .turkey-leg-front { transform-origin: 34% 0%; animation: turkeyLegStride 0.34s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                                .turkey-leg-back { transform-origin: 64% 0%; animation: turkeyLegStride 0.34s cubic-bezier(0.4, 0, 0.6, 1) infinite reverse; }
                                @keyframes turkeyLegStride {
                                    0%, 100% { transform: rotate(-42deg); }
                                    50% { transform: rotate(40deg); }
                                }
                                .turkey-upper { animation: turkeyUpperBob 0.36s ease-in-out infinite; }
                                @keyframes turkeyUpperBob {
                                    0%, 100% { transform: translate(2px, 0) rotate(-1.5deg); }
                                    25% { transform: translate(0, -5px) rotate(0deg); }
                                    50% { transform: translate(-3px, 0) rotate(1.5deg); }
                                    75% { transform: translate(0, -5px) rotate(0deg); }
                                }
                                .turkey-head { animation: turkeyHeadBob 0.36s ease-in-out infinite; transform-box: fill-box; transform-origin: 20% 80%; }
                                @keyframes turkeyHeadBob { 0%,100% { transform: translate(5px, -2px) rotate(3deg); } 50% { transform: translate(-3px, 1px) rotate(-2deg); } }
                                .turkey-tail { animation: turkeyTailSway 0.72s ease-in-out infinite; transform-box: fill-box; transform-origin: 90% 100%; }
                                @keyframes turkeyTailSway { 0%,100% { transform: translateX(3px) rotate(2deg); } 50% { transform: translateX(-3px) rotate(-3.5deg); } }
                                .turkey-wing { animation: turkeyWingTuck 0.36s ease-in-out infinite; transform-box: fill-box; transform-origin: 20% 20%; }
                                @keyframes turkeyWingTuck { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(1.5deg); } }
                                .turkey-dust { animation: turkeyDust 0.72s ease-out infinite; transform-box: fill-box; }
                                .turkey-dust-late { animation-delay: 0.18s; }
                                @keyframes turkeyDust { 0% { opacity: 0.7; transform: translateX(0) scale(0.6); } 100% { opacity: 0; transform: translateX(-22px) translateY(-4px) scale(1.4); } }
                                .turkey-leaf { animation: turkeyLeafKick 0.72s ease-out infinite; transform-box: fill-box; }
                                @keyframes turkeyLeafKick { 0% { opacity: 0; transform: translate(0,0) rotate(0deg); } 25% { opacity: 1; } 100% { opacity: 0; transform: translate(-26px,-14px) rotate(-40deg); } }
                                @media (prefers-reduced-motion: reduce) {
                                    .turkey-upper, .turkey-leg-front, .turkey-leg-back, .turkey-head, .turkey-tail, .turkey-wing, .turkey-dust, .turkey-leaf { animation: none; }
                                }
                                `}
                            </style>
                            <defs>
                                {/* All plumage shares one bronze/iridescent palette so
                                    tail, wing, chest and back read as the same bird. */}
                                <radialGradient id="turkey-body" cx="35%" cy="25%" r="80%">
                                    <stop offset="0%" stopColor="#B8863C" />
                                    <stop offset="35%" stopColor="#8E5A2B" />
                                    <stop offset="70%" stopColor="#6B4226" />
                                    <stop offset="100%" stopColor="#3E2723" />
                                </radialGradient>
                                <linearGradient id="turkey-chest" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#B8863C" />
                                    <stop offset="55%" stopColor="#8E5A2B" />
                                    <stop offset="100%" stopColor="#5D4037" />
                                </linearGradient>
                                <linearGradient id="turkey-wing" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6B4226" />
                                    <stop offset="100%" stopColor="#3E2723" />
                                </linearGradient>
                                <linearGradient id="turkey-tailgrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3E2723" />
                                    <stop offset="45%" stopColor="#6B4226" />
                                    <stop offset="100%" stopColor="#8E5A2B" />
                                </linearGradient>
                                <linearGradient id="turkey-head" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6D97D8" />
                                    <stop offset="60%" stopColor="#3E5FA3" />
                                    <stop offset="100%" stopColor="#2C4A7A" />
                                </linearGradient>
                                <linearGradient id="turkey-beak" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#F5B544" />
                                    <stop offset="100%" stopColor="#D48806" />
                                </linearGradient>
                                <linearGradient id="turkey-wattle" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#D64541" />
                                    <stop offset="100%" stopColor="#922B21" />
                                </linearGradient>
                            </defs>

                            {/* Ground shadow */}
                            <ellipse cx="205" cy="240" rx="105" ry="11" fill="#1f2937" opacity="0.16" />

                            {/* Fallen leaves kicked up behind the legs */}
                            <g className="turkey-leaf">
                                <ellipse cx="150" cy="226" rx="9" ry="5" fill="#C67C2E" transform="rotate(-24 150 226)" />
                                <path d="M150 226 L162 221" stroke="#7C4A03" strokeWidth="1.2" strokeLinecap="round" />
                            </g>
                            <g className="turkey-leaf" style={{ animationDelay: '0.24s' }}>
                                <ellipse cx="140" cy="234" rx="7" ry="4" fill="#8D5A2B" transform="rotate(18 140 234)" />
                            </g>

                            {/* Dust puffs at the feet */}
                            <ellipse className="turkey-dust" cx="162" cy="234" rx="11" ry="4.5" fill="#D8C4A5" opacity="0.7" />
                            <ellipse className="turkey-dust turkey-dust-late" cx="268" cy="236" rx="9" ry="4" fill="#D8C4A5" opacity="0.7" />

                            {/* Legs first (behind the body) so hips stay hidden under
                                the belly and can never look detached. Near (front) leg
                                is drawn over the far (back) leg, so when the stride
                                crosses they overlap like a real side view. Vertical
                                rest pose keeps each hip pivot at the top of its
                                group — rotation alone sweeps the feet front→back. */}
                            <g className="turkey-leg turkey-leg-back">
                                <path d="M188 166 L200 166 L199 204 L187 204 Z" fill="#5D4037" stroke="#2E1F18" strokeWidth="0.8" />
                                <line x1="193" y1="204" x2="188" y2="228" stroke="#9C8A82" strokeWidth="5" strokeLinecap="round" />
                                <path d="M188 228 L208 234 M188 228 L198 238 M188 228 L168 232" fill="none" stroke="#9C8A82" strokeWidth="3.2" strokeLinecap="round" />
                                <circle cx="193" cy="204" r="4" fill="#8D6E63" />
                            </g>
                            <g className="turkey-leg turkey-leg-front">
                                <path d="M228 166 L240 166 L243 204 L231 204 Z" fill="#6D4C2F" stroke="#2E1F18" strokeWidth="0.8" />
                                <line x1="237" y1="204" x2="242" y2="228" stroke="#A1887F" strokeWidth="5" strokeLinecap="round" />
                                <path d="M242 228 L262 234 M242 228 L252 238 M242 228 L222 232" fill="none" stroke="#A1887F" strokeWidth="3.2" strokeLinecap="round" />
                                <circle cx="237" cy="204" r="4" fill="#8D6E63" />
                            </g>

                            {/* Upper body: tail + body + wing bob together */}
                            <g className="turkey-upper">
                                <g className="turkey-tail">
                                    {TAIL_ANGLES.map((angle) => (
                                        <g key={angle} transform={`translate(148 140) rotate(${angle})`}>
                                            <path
                                                d="M0 0 C -13 -30 -14 -75 0 -122 C 14 -75 13 -30 0 0 Z"
                                                fill="url(#turkey-tailgrad)"
                                                stroke="#2E1F18"
                                                strokeWidth="1.1"
                                            />
                                            <path
                                                d="M0 -16 C -6 -44 -6 -84 0 -106 C 6 -84 6 -44 0 -16 Z"
                                                fill="#8E5A2B"
                                                opacity="0.8"
                                            />
                                            {/* Sub-banded tail: alternating dark/light
                                                bands + bronze tips, matching the body's
                                                iridescence rather than looking painted on. */}
                                            <path d="M-7 -58 C -3 -56 3 -56 7 -58 M-6 -76 C -2 -74 2 -74 6 -76" fill="none" stroke="#2E1F18" strokeWidth="2.2" opacity="0.75" />
                                            <ellipse cx="0" cy="-100" rx="7.5" ry="9" fill="#8E5A2B" opacity="0.95" />
                                            <ellipse cx="0" cy="-115" rx="5.5" ry="7" fill="#1E1B18" />
                                            <line x1="0" y1="-10" x2="0" y2="-110" stroke="#C67C3C" strokeWidth="1.3" opacity="0.7" />
                                        </g>
                                    ))}
                                    {/* Tail base cover */}
                                    <path
                                        d="M132 132 C 148 118 172 118 182 134 C 188 146 180 158 162 160 C 144 162 130 148 132 132 Z"
                                        fill="#4E342E"
                                        stroke="#2E1F18"
                                        strokeWidth="1"
                                    />
                                </g>

                                <g className="turkey-body">
                                    <ellipse cx="205" cy="145" rx="72" ry="44" transform="rotate(-10 205 145)" fill="url(#turkey-body)" stroke="#2E1F18" strokeWidth="1.2" />
                                    {/* Bronze sheen along the back */}
                                    <ellipse cx="205" cy="132" rx="58" ry="22" fill="#D79A4E" opacity="0.35" />
                                    <ellipse cx="245" cy="152" rx="32" ry="30" fill="url(#turkey-chest)" />
                                    {/* Iridescent chest patch */}
                                    <ellipse cx="252" cy="146" rx="15" ry="17" fill="#2F6B3C" opacity="0.55" />
                                    <ellipse cx="252" cy="146" rx="15" ry="17" fill="none" stroke="#C67C3C" strokeWidth="1.6" opacity="0.8" />
                                    <ellipse cx="247" cy="138" rx="5" ry="4" fill="#E8DCC3" opacity="0.5" />
                                    {/* Individual feather tips on the chest */}
                                    <g fill="#3E2723" opacity="0.5">
                                        <ellipse cx="236" cy="160" rx="4.5" ry="7" />
                                        <ellipse cx="252" cy="166" rx="4.5" ry="7" />
                                        <ellipse cx="268" cy="160" rx="4.5" ry="7" />
                                        <ellipse cx="244" cy="174" rx="4.5" ry="6" />
                                        <ellipse cx="260" cy="174" rx="4.5" ry="6" />
                                    </g>
                                    {/* Back feather scallops (soft, layered) */}
                                    <path d="M150 122 C 165 112 185 110 200 116" fill="none" stroke="#E8DCC3" strokeWidth="1.6" opacity="0.45" strokeLinecap="round" />
                                    <path d="M148 134 C 163 125 183 123 198 129" fill="none" stroke="#E8DCC3" strokeWidth="1.6" opacity="0.35" strokeLinecap="round" />
                                    <path d="M150 147 C 164 139 183 136 198 141" fill="none" stroke="#E8DCC3" strokeWidth="1.6" opacity="0.28" strokeLinecap="round" />
                                    <path d="M152 158 C 166 151 184 148 198 152" fill="none" stroke="#E8DCC3" strokeWidth="1.4" opacity="0.2" strokeLinecap="round" />
                                </g>

                                {/* Wing tucked over the flank: darker bronze with
                                    pale covert edging, same family as the body. */}
                                <g className="turkey-wing">
                                    <path
                                        d="M168 112 C 195 96 238 102 250 128 C 256 148 244 168 214 172 C 188 175 164 160 160 140 C 158 128 160 118 168 112 Z"
                                        fill="url(#turkey-wing)"
                                        stroke="#2E1F18"
                                        strokeWidth="1.2"
                                    />
                                    <path d="M176 122 C 190 112 215 110 232 120" fill="none" stroke="#E9DDC0" strokeWidth="2" opacity="0.7" strokeLinecap="round" />
                                    <path d="M172 136 C 188 127 214 125 234 133" fill="none" stroke="#E9DDC0" strokeWidth="2" opacity="0.55" strokeLinecap="round" />
                                    <path d="M176 150 C 190 142 212 140 230 146" fill="none" stroke="#E9DDC0" strokeWidth="2" opacity="0.42" strokeLinecap="round" />
                                    <path d="M184 162 C 196 155 214 152 226 155" fill="none" stroke="#E9DDC0" strokeWidth="1.6" opacity="0.3" strokeLinecap="round" />
                                    <ellipse cx="214" cy="158" rx="10" ry="5" fill="#6B4226" opacity="0.6" />
                                    <g fill="#2E1F18" opacity="0.55">
                                        <ellipse cx="170" cy="166" rx="3.5" ry="8" transform="rotate(20 170 166)" />
                                        <ellipse cx="182" cy="170" rx="3.5" ry="7" transform="rotate(8 182 170)" />
                                    </g>
                                </g>
                            </g>

                            {/* Head, neck, beak, snood and wattle */}
                            <g className="turkey-head">
                                <path d="M252 122 C 270 110 284 96 292 80 C 296 72 304 70 310 76 L 302 92 C 292 112 276 128 258 138 Z" fill="url(#turkey-head)" stroke="#1E2A44" strokeWidth="1" />
                                <ellipse cx="312" cy="78" rx="24" ry="20" transform="rotate(-8 312 78)" fill="url(#turkey-head)" stroke="#1E2A44" strokeWidth="1.2" />
                                <ellipse cx="304" cy="70" rx="8" ry="6" fill="#FFFFFF" opacity="0.22" />
                                {/* Snood over the beak */}
                                <path d="M326 68 C 334 60 342 62 344 68 C 340 72 332 74 328 72 Z" fill="#C0392B" opacity="0.95" />
                                {/* Wattle hanging under the beak */}
                                <path d="M332 88 C 338 96 338 106 332 112 C 326 106 325 96 328 90 Z" fill="url(#turkey-wattle)" stroke="#922B21" strokeWidth="0.8" />
                                {/* Beak */}
                                <polygon points="332,70 360,78 332,88" fill="url(#turkey-beak)" stroke="#7C4A03" strokeWidth="1" />
                                <ellipse cx="342" cy="76" rx="2.5" ry="1.2" fill="#7C4A03" opacity="0.8" />
                                {/* Eye */}
                                <circle cx="316" cy="72" r="5.5" fill="#111111" stroke="#FFFFFF" strokeWidth="1" />
                                <circle cx="317.5" cy="70.5" r="1.8" fill="#FFFFFF" />
                                <path d="M308 62 C 312 58 320 58 324 62" fill="none" stroke="#1E2A44" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
                            </g>
                        </svg>
                    </div>
                </div>
            )}
        </>
    );
}
