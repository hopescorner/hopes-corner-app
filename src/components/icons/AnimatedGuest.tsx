import React from 'react';

export default function AnimatedGuest({ className = '' }: { className?: string }) {
    return (
        <svg
            className={`w-full h-full ${className}`}
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
            shapeRendering="crispEdges"
            style={{ imageRendering: 'pixelated' }}
            role="img"
            aria-label="Blocky guest taking a bite of food"
        >
            <title>Guest taking a bite of food</title>
            <style>
                {`
                    .guest-bob {
                        animation: guestBob 1.6s steps(1, end) infinite;
                        transform-box: fill-box;
                    }
                    @keyframes guestBob {
                        0%, 32% { transform: translateY(0); }
                        38%, 62% { transform: translateY(-3px); }
                        68%, 100% { transform: translateY(0); }
                    }
                    .eating-arm {
                        animation: eatSwing 1.6s steps(1, end) infinite;
                        transform-box: fill-box;
                        transform-origin: 50% 0%;
                    }
                    @keyframes eatSwing {
                        0%, 32% { transform: rotate(0deg); }
                        38%, 62% { transform: rotate(-104deg); }
                        68%, 100% { transform: rotate(0deg); }
                    }
                    .mouth-closed { animation: mouthClosed 1.6s steps(1, end) infinite; }
                    @keyframes mouthClosed {
                        0%, 32% { opacity: 1; }
                        38%, 62% { opacity: 0; }
                        68%, 100% { opacity: 1; }
                    }
                    .mouth-open { animation: mouthOpen 1.6s steps(1, end) infinite; }
                    @keyframes mouthOpen {
                        0%, 32% { opacity: 0; }
                        38%, 62% { opacity: 1; }
                        68%, 100% { opacity: 0; }
                    }
                    .food-bite { animation: foodBite 1.6s steps(1, end) infinite; }
                    @keyframes foodBite {
                        0%, 32% { opacity: 1; }
                        38%, 100% { opacity: 0; }
                    }
                    .crumb { animation: crumbPop 1.6s steps(1, end) infinite; transform-box: fill-box; }
                    @keyframes crumbPop {
                        0%, 32% { opacity: 0; transform: translateY(0); }
                        38%, 62% { opacity: 1; transform: translateY(4px); }
                        68%, 100% { opacity: 0; transform: translateY(4px); }
                    }
                    @media (prefers-reduced-motion: reduce) {
                        .guest-bob, .eating-arm, .mouth-closed, .mouth-open,
                        .food-bite, .crumb {
                            animation: none;
                        }
                        .mouth-open, .crumb { opacity: 0; }
                    }
                `}
            </style>

            <defs>
                <clipPath id="guest-clip">
                    <rect x="0" y="0" width="200" height="200" />
                </clipPath>
            </defs>

            <g clipPath="url(#guest-clip)">
                {/* Dirt-block wall with grass cap */}
                <rect x="0" y="0" width="200" height="162" fill="#96613a" />
                <rect x="0" y="0" width="200" height="16" fill="#65a30d" />
                <rect x="0" y="0" width="200" height="4" fill="#84cc16" />
                <g fill="#65a30d">
                    <rect x="0" y="16" width="8" height="8" />
                    <rect x="32" y="16" width="8" height="8" />
                    <rect x="64" y="16" width="8" height="8" />
                    <rect x="96" y="16" width="8" height="8" />
                    <rect x="128" y="16" width="8" height="8" />
                    <rect x="160" y="16" width="8" height="8" />
                    <rect x="192" y="16" width="8" height="8" />
                </g>
                {/* Dirt speckle */}
                <g fill="#7c4f2e">
                    <rect x="14" y="40" width="6" height="6" />
                    <rect x="52" y="60" width="6" height="6" />
                    <rect x="90" y="36" width="6" height="6" />
                    <rect x="112" y="96" width="6" height="6" />
                    <rect x="30" y="110" width="6" height="6" />
                    <rect x="70" y="130" width="6" height="6" />
                    <rect x="150" y="120" width="6" height="6" />
                    <rect x="180" y="60" width="6" height="6" />
                </g>
                <g fill="#ab7648">
                    <rect x="34" y="52" width="6" height="6" />
                    <rect x="72" y="80" width="6" height="6" />
                    <rect x="100" y="130" width="6" height="6" />
                    <rect x="132" y="60" width="6" height="6" />
                    <rect x="166" y="100" width="6" height="6" />
                    <rect x="10" y="88" width="6" height="6" />
                </g>

                {/* Creeper painting */}
                <rect x="18" y="26" width="54" height="58" fill="#78350f" />
                <rect x="23" y="31" width="44" height="48" fill="#22c55e" />
                <rect x="30" y="44" width="10" height="10" fill="#14532d" />
                <rect x="50" y="44" width="10" height="10" fill="#14532d" />
                <rect x="38" y="56" width="14" height="14" fill="#14532d" />
                <rect x="34" y="60" width="4" height="8" fill="#14532d" />
                <rect x="52" y="60" width="4" height="8" fill="#14532d" />

                {/* Glass-pane window */}
                <rect x="130" y="14" width="58" height="70" fill="#4b5563" />
                <rect x="135" y="19" width="48" height="60" fill="#bfdbfe" />
                <rect x="168" y="24" width="10" height="10" fill="#fde047" />
                <rect x="140" y="32" width="14" height="6" fill="#ffffff" />
                <rect x="156" y="19" width="4" height="60" fill="#f8fafc" />
                <rect x="135" y="46" width="48" height="4" fill="#f8fafc" />

                {/* Oak plank floor */}
                <rect x="0" y="160" width="200" height="40" fill="#a06a35" />
                <rect x="0" y="160" width="200" height="3" fill="#c08a4d" />
                <rect x="0" y="176" width="200" height="2" fill="#7c4f2e" />
                <rect x="40" y="163" width="2" height="13" fill="#7c4f2e" />
                <rect x="100" y="163" width="2" height="13" fill="#7c4f2e" />
                <rect x="160" y="163" width="2" height="13" fill="#7c4f2e" />
                <rect x="70" y="178" width="2" height="22" fill="#7c4f2e" />
                <rect x="130" y="178" width="2" height="22" fill="#7c4f2e" />

                {/* Guest: head + torso + arms bob as one rigid voxel */}
                <g className="guest-bob">
                    {/* Neck + torso with cube side shade */}
                    <rect x="92" y="94" width="16" height="8" fill="#cf9a6b" />
                    <rect x="60" y="102" width="80" height="56" fill="#0ea5e9" />
                    <rect x="126" y="102" width="14" height="56" fill="#0284c7" />
                    <rect x="92" y="102" width="16" height="6" fill="#e0f2fe" />
                    <rect x="98" y="116" width="4" height="4" fill="#075985" />
                    <rect x="98" y="128" width="4" height="4" fill="#075985" />

                    {/* Head cube with block hair */}
                    <rect x="72" y="46" width="56" height="48" fill="#eec39a" />
                    <rect x="120" y="46" width="8" height="48" fill="#cf9a6b" />
                    <rect x="72" y="36" width="56" height="10" fill="#4a2c17" />
                    <rect x="72" y="46" width="8" height="24" fill="#4a2c17" />
                    <rect x="120" y="46" width="8" height="24" fill="#4a2c17" />
                    {/* Pixel eyes + cheeks */}
                    <rect x="82" y="62" width="10" height="8" fill="#ffffff" />
                    <rect x="108" y="62" width="10" height="8" fill="#ffffff" />
                    <rect x="86" y="64" width="4" height="6" fill="#1d4ed8" />
                    <rect x="112" y="64" width="4" height="6" fill="#1d4ed8" />
                    <rect x="78" y="74" width="6" height="6" fill="#f9a8d4" opacity="0.8" />
                    <rect x="116" y="74" width="6" height="6" fill="#f9a8d4" opacity="0.8" />
                    {/* Two-frame chew: closed swaps with open exactly on the bite frames */}
                    <rect className="mouth-closed" x="92" y="84" width="16" height="4" fill="#4b5563" />
                    <g className="mouth-open">
                        <rect x="92" y="82" width="16" height="8" fill="#4b5563" />
                        <rect x="95" y="86" width="10" height="4" fill="#dc2626" />
                    </g>

                    {/* Left arm: static block flush with torso, hand resting by the plate */}
                    <rect x="46" y="102" width="16" height="34" fill="#0ea5e9" />
                    <rect x="46" y="102" width="4" height="34" fill="#0284c7" />
                    <rect x="46" y="136" width="16" height="14" fill="#eec39a" />

                    {/* Right arm: ONE group pivoted at the shoulder (top center).
                        Sleeve + hand + held food rotate together, so the joint
                        never separates. Snaps up to the mouth on bite frames. */}
                    <g className="eating-arm">
                        <rect x="136" y="102" width="16" height="34" fill="#0ea5e9" />
                        <rect x="148" y="102" width="4" height="34" fill="#0284c7" />
                        <rect x="136" y="136" width="16" height="14" fill="#eec39a" />
                        <rect className="food-bite" x="136" y="130" width="16" height="12" fill="#7c2d12" />
                        <rect className="food-bite" x="136" y="130" width="16" height="3" fill="#b45309" />
                    </g>
                </g>

                {/* Oak slab table (foreground) */}
                <rect x="16" y="158" width="168" height="12" fill="#7c4a21" />
                <rect x="16" y="158" width="168" height="3" fill="#a16207" />
                <rect x="28" y="170" width="12" height="22" fill="#5b3416" />
                <rect x="160" y="170" width="12" height="22" fill="#5b3416" />

                {/* Stone plate with pixel food */}
                <rect x="62" y="150" width="76" height="8" fill="#e5e7eb" />
                <rect x="68" y="150" width="64" height="3" fill="#f8fafc" />
                <rect x="76" y="142" width="18" height="8" fill="#7c2d12" />
                <rect x="76" y="142" width="18" height="2" fill="#b45309" />
                <rect x="100" y="142" width="12" height="8" fill="#16a34a" />
                <rect x="114" y="144" width="8" height="6" fill="#22c55e" />
                {/* Fork standing in the plate as static table dressing */}
                <rect x="81" y="118" width="6" height="20" fill="#9ca3af" />
                <rect x="75" y="134" width="18" height="4" fill="#9ca3af" />
                <rect x="75" y="138" width="4" height="8" fill="#9ca3af" />
                <rect x="81" y="138" width="4" height="8" fill="#9ca3af" />
                <rect x="87" y="138" width="4" height="8" fill="#9ca3af" />

                {/* Crumbs that pop exactly on the bite frames */}
                <rect className="crumb" x="86" y="94" width="4" height="4" fill="#b45309" />
                <rect className="crumb" x="110" y="94" width="4" height="4" fill="#7c2d12" />
            </g>

            {/* Crisp pixel frame instead of a rounded border */}
            <rect x="2" y="2" width="196" height="196" fill="none" stroke="#1f2937" strokeWidth="4" />
        </svg>
    );
}
