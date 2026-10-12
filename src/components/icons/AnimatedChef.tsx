import React from 'react';

export default function AnimatedChef({ className = '' }: { className?: string }) {
    return (
        <svg
            className={`w-full h-full ${className}`}
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
            shapeRendering="crispEdges"
            style={{ imageRendering: 'pixelated' }}
            role="img"
            aria-label="Blocky volunteer chef stirring a pot"
        >
            <title>Volunteer chef stirring a pot</title>
            <style>
                {`
                    .chef-bob {
                        animation: chefBob 1.2s steps(1, end) infinite;
                        transform-box: fill-box;
                    }
                    @keyframes chefBob {
                        0%, 30% { transform: translateY(0); }
                        35%, 65% { transform: translateY(-2px); }
                        70%, 100% { transform: translateY(0); }
                    }
                    .chef-arm-stir {
                        animation: chefStir 1.2s steps(1, end) infinite;
                        transform-box: fill-box;
                        transform-origin: 50% 0%;
                    }
                    @keyframes chefStir {
                        0%, 30% { transform: rotate(0deg); }
                        35%, 65% { transform: rotate(-12deg); }
                        70%, 100% { transform: rotate(0deg); }
                    }
                    .chef-bubble-a {
                        animation: chefBubbleA 1.2s steps(1, end) infinite;
                        transform-box: fill-box;
                    }
                    @keyframes chefBubbleA {
                        0%, 30% { transform: translateY(0); opacity: 1; }
                        35%, 65% { transform: translateY(-6px); opacity: 1; }
                        70%, 100% { transform: translateY(0); opacity: 1; }
                    }
                    .chef-bubble-b {
                        animation: chefBubbleB 1.2s steps(1, end) infinite;
                        transform-box: fill-box;
                    }
                    @keyframes chefBubbleB {
                        0%, 30% { transform: translateY(-6px); opacity: 1; }
                        35%, 65% { transform: translateY(0); opacity: 1; }
                        70%, 100% { transform: translateY(-6px); opacity: 1; }
                    }
                    .chef-steam {
                        transform-box: fill-box;
                    }
                    .chef-steam-1 { animation: chefSteam 1.8s steps(2, end) infinite 0s; }
                    .chef-steam-2 { animation: chefSteam 1.8s steps(2, end) infinite 0.6s; }
                    .chef-steam-3 { animation: chefSteam 1.8s steps(2, end) infinite 1.2s; }
                    @keyframes chefSteam {
                        0% { transform: translateY(0); opacity: 1; }
                        50% { transform: translateY(-10px); opacity: 1; }
                        100% { transform: translateY(-20px); opacity: 0; }
                    }
                    @media (prefers-reduced-motion: reduce) {
                        .chef-bob, .chef-arm-stir, .chef-bubble-a, .chef-bubble-b,
                        .chef-steam-1, .chef-steam-2, .chef-steam-3 {
                            animation: none;
                        }
                    }
                `}
            </style>

            <defs>
                <clipPath id="chef-clip">
                    <rect x="0" y="0" width="200" height="200" />
                </clipPath>
            </defs>

            <g clipPath="url(#chef-clip)">
                {/* Stone-brick kitchen wall */}
                <rect x="0" y="0" width="200" height="160" fill="#8f9aa6" />
                <g fill="#6b7280">
                    <rect x="0" y="24" width="200" height="2" />
                    <rect x="0" y="48" width="200" height="2" />
                    <rect x="0" y="72" width="200" height="2" />
                    <rect x="0" y="96" width="200" height="2" />
                    <rect x="0" y="120" width="200" height="2" />
                    <rect x="50" y="0" width="2" height="24" />
                    <rect x="100" y="0" width="2" height="24" />
                    <rect x="150" y="0" width="2" height="24" />
                    <rect x="25" y="26" width="2" height="22" />
                    <rect x="75" y="26" width="2" height="22" />
                    <rect x="125" y="26" width="2" height="22" />
                    <rect x="175" y="26" width="2" height="22" />
                    <rect x="50" y="50" width="2" height="22" />
                    <rect x="100" y="50" width="2" height="22" />
                    <rect x="150" y="50" width="2" height="22" />
                    <rect x="25" y="74" width="2" height="22" />
                    <rect x="75" y="74" width="2" height="22" />
                    <rect x="125" y="74" width="2" height="22" />
                    <rect x="175" y="74" width="2" height="22" />
                    <rect x="50" y="98" width="2" height="22" />
                    <rect x="100" y="98" width="2" height="22" />
                    <rect x="150" y="98" width="2" height="22" />
                </g>

                {/* Oak shelf with jars */}
                <rect x="14" y="12" width="12" height="4" fill="#94a3b8" />
                <rect x="14" y="16" width="12" height="10" fill="#f8fafc" />
                <rect x="30" y="14" width="12" height="4" fill="#94a3b8" />
                <rect x="30" y="18" width="12" height="8" fill="#dc2626" />
                <rect x="46" y="12" width="12" height="4" fill="#94a3b8" />
                <rect x="46" y="16" width="12" height="10" fill="#16a34a" />
                <rect x="8" y="26" width="72" height="10" fill="#b45309" />
                <rect x="8" y="26" width="72" height="3" fill="#d97706" />
                <rect x="12" y="36" width="6" height="10" fill="#78350f" />
                <rect x="70" y="36" width="6" height="10" fill="#78350f" />

                {/* Glass-pane window */}
                <rect x="126" y="10" width="66" height="68" fill="#4b5563" />
                <rect x="131" y="15" width="56" height="58" fill="#bfdbfe" />
                <rect x="136" y="24" width="16" height="6" fill="#ffffff" />
                <rect x="172" y="20" width="12" height="12" fill="#fde047" />
                <rect x="156" y="15" width="4" height="58" fill="#f8fafc" />
                <rect x="131" y="41" width="56" height="4" fill="#f8fafc" />

                {/* Chef: whole upper body bobs as one rigid voxel */}
                <g className="chef-bob">
                    {/* Torso with side shade for cube depth */}
                    <rect x="66" y="98" width="56" height="54" fill="#059669" />
                    <rect x="110" y="98" width="12" height="54" fill="#047857" />
                    {/* Apron straps + apron */}
                    <rect x="78" y="98" width="8" height="14" fill="#f8fafc" />
                    <rect x="102" y="98" width="8" height="14" fill="#f8fafc" />
                    <rect x="78" y="112" width="32" height="40" fill="#f8fafc" />
                    <rect x="104" y="112" width="6" height="40" fill="#cbd5e1" />
                    <rect x="83" y="130" width="22" height="10" fill="#e2e8f0" />

                    {/* Head cube */}
                    <rect x="72" y="58" width="44" height="40" fill="#eab68c" />
                    <rect x="106" y="58" width="10" height="40" fill="#c98f61" />
                    {/* Pixel eyes */}
                    <rect x="80" y="72" width="10" height="8" fill="#ffffff" />
                    <rect x="98" y="72" width="10" height="8" fill="#ffffff" />
                    <rect x="84" y="74" width="4" height="6" fill="#1e3a8a" />
                    <rect x="102" y="74" width="4" height="6" fill="#1e3a8a" />
                    <rect x="90" y="88" width="12" height="4" fill="#4b5563" />

                    {/* Chef hat: stacked blocks */}
                    <rect x="70" y="28" width="48" height="22" fill="#f8fafc" />
                    <rect x="108" y="28" width="10" height="22" fill="#e2e8f0" />
                    <rect x="70" y="44" width="48" height="6" fill="#e2e8f0" />
                    <rect x="64" y="50" width="60" height="10" fill="#f8fafc" />
                    <rect x="114" y="50" width="10" height="10" fill="#cbd5e1" />

                    {/* Left arm: static block flush with torso */}
                    <rect x="52" y="98" width="16" height="30" fill="#059669" />
                    <rect x="52" y="98" width="4" height="30" fill="#047857" />
                    <rect x="52" y="128" width="16" height="14" fill="#eab68c" />

                    {/* Right arm: ONE group pivoted at the shoulder so it can never detach.
                        Sleeve + hand + spoon all live inside and rotate together. */}
                    <g className="chef-arm-stir">
                        <rect x="118" y="98" width="16" height="30" fill="#059669" />
                        <rect x="130" y="98" width="4" height="30" fill="#047857" />
                        <rect x="118" y="128" width="16" height="14" fill="#eab68c" />
                        <rect x="124" y="114" width="6" height="28" fill="#78350f" />
                    </g>
                </g>

                {/* Oak counter (foreground, covers torso base) */}
                <rect x="0" y="152" width="200" height="12" fill="#b45309" />
                <rect x="0" y="152" width="200" height="3" fill="#d97706" />
                <rect x="20" y="157" width="24" height="2" fill="#78350f" />
                <rect x="90" y="157" width="30" height="2" fill="#78350f" />
                <rect x="0" y="164" width="200" height="36" fill="#6b7280" />
                <rect x="0" y="176" width="200" height="2" fill="#4b5563" />
                {/* Furnace with pixel fire */}
                <rect x="14" y="168" width="46" height="28" fill="#374151" />
                <rect x="20" y="174" width="34" height="16" fill="#1f2937" />
                <rect x="24" y="178" width="8" height="8" fill="#f97316" />
                <rect x="34" y="178" width="8" height="8" fill="#fbbf24" />
                <rect x="44" y="178" width="6" height="8" fill="#f97316" />

                {/* Cutting board with bread */}
                <rect x="14" y="144" width="46" height="8" fill="#d6a35c" />
                <rect x="20" y="136" width="18" height="8" fill="#b45309" />
                <rect x="40" y="136" width="14" height="8" fill="#d97706" />

                {/* Cauldron pot in front of chef; spoon tip lands in the stew */}
                <rect x="108" y="118" width="52" height="34" fill="#374151" />
                <rect x="150" y="118" width="10" height="34" fill="#1f2937" />
                <rect x="104" y="112" width="60" height="8" fill="#1f2937" />
                <rect x="110" y="114" width="48" height="6" fill="#f59e0b" />
                <rect x="110" y="114" width="48" height="2" fill="#fbbf24" />

                {/* Stew bubbles hopping in discrete steps (no spinning) */}
                <rect className="chef-bubble-a" x="126" y="104" width="6" height="6" fill="#fbbf24" />
                <rect className="chef-bubble-b" x="144" y="100" width="6" height="6" fill="#fde047" />

                {/* Square steam puffs rising in steps */}
                <rect className="chef-steam chef-steam-1" x="122" y="88" width="6" height="6" fill="#e5e7eb" />
                <rect className="chef-steam chef-steam-2" x="140" y="80" width="6" height="6" fill="#e5e7eb" />
                <rect className="chef-steam chef-steam-3" x="132" y="92" width="6" height="6" fill="#d1d5db" />
            </g>

            {/* Crisp pixel frame instead of a rounded border */}
            <rect x="2" y="2" width="196" height="196" fill="none" stroke="#1f2937" strokeWidth="4" />
        </svg>
    );
}
