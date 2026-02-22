import React from 'react';

export default function AnimatedChef({ className = '' }: { className?: string }) {
    return (
        <svg
            className={`w-full h-full ${className}`}
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
        >
            <style>
                {`
                    @keyframes flip {
                        0%, 100% { transform: translateY(0) rotate(0deg); }
                        40% { transform: translateY(-30px) rotate(180deg); }
                        60% { transform: translateY(-30px) rotate(180deg); }
                    }
                    @keyframes panMove {
                        0%, 100% { transform: rotate(0deg); }
                        40% { transform: rotate(-15deg); }
                        60% { transform: rotate(-15deg); }
                    }
                    @keyframes steamRise {
                        0% { transform: translateY(0) scale(1); opacity: 0; }
                        50% { transform: translateY(-20px) scale(1.2); opacity: 0.6; }
                        100% { transform: translateY(-40px) scale(1.5); opacity: 0; }
                    }
                    @keyframes armStir {
                        0%, 100% { transform: rotate(0deg); }
                        50% { transform: rotate(5deg); }
                    }
                    .flip-item {
                        animation: flip 2s ease-in-out infinite;
                        transform-origin: 140px 105px;
                    }
                    .pan {
                        animation: panMove 2s ease-in-out infinite;
                        transform-origin: 120px 115px;
                    }
                    .steam-1 {
                        animation: steamRise 3s ease-in-out infinite;
                        transform-origin: 140px 90px;
                    }
                    .steam-2 {
                        animation: steamRise 3s ease-in-out infinite 1s;
                        transform-origin: 140px 90px;
                    }
                    .steam-3 {
                        animation: steamRise 3s ease-in-out infinite 2s;
                        transform-origin: 140px 90px;
                    }
                    .arm {
                        animation: armStir 2s ease-in-out infinite;
                        transform-origin: 80px 100px;
                    }
                `}
            </style>

            <defs>
                <clipPath id="chef-clip">
                    <rect x="0" y="0" width="200" height="200" rx="32" />
                </clipPath>
            </defs>

            <g clipPath="url(#chef-clip)">
                {/* Background Base */}
                <rect x="0" y="0" width="200" height="200" fill="#f8fafc" />

                {/* Subway Tiles */}
                <g stroke="#e2e8f0" strokeWidth="1">
                    {/* Horizontal lines */}
                    <line x1="0" y1="120" x2="200" y2="120" />
                    <line x1="0" y1="140" x2="200" y2="140" />
                    <line x1="0" y1="160" x2="200" y2="160" />
                    <line x1="0" y1="180" x2="200" y2="180" />
                    {/* Vertical lines */}
                    <line x1="20" y1="120" x2="20" y2="140" />
                    <line x1="60" y1="120" x2="60" y2="140" />
                    <line x1="100" y1="120" x2="100" y2="140" />
                    <line x1="140" y1="120" x2="140" y2="140" />
                    <line x1="180" y1="120" x2="180" y2="140" />

                    <line x1="40" y1="140" x2="40" y2="160" />
                    <line x1="80" y1="140" x2="80" y2="160" />
                    <line x1="120" y1="140" x2="120" y2="160" />
                    <line x1="160" y1="140" x2="160" y2="160" />

                    <line x1="20" y1="160" x2="20" y2="180" />
                    <line x1="60" y1="160" x2="60" y2="180" />
                    <line x1="100" y1="160" x2="100" y2="180" />
                    <line x1="140" y1="160" x2="140" y2="180" />
                    <line x1="180" y1="160" x2="180" y2="180" />
                </g>

                {/* Window */}
                <rect x="130" y="20" width="60" height="70" fill="#e0f2fe" stroke="#cbd5e1" strokeWidth="4" />
                <line x1="160" y1="20" x2="160" y2="90" stroke="#cbd5e1" strokeWidth="4" />
                <line x1="130" y1="55" x2="190" y2="55" stroke="#cbd5e1" strokeWidth="4" />
                <rect x="162" y="27" width="16" height="16" fill="#fef08a" />

                {/* Cabinet */}
                <rect x="10" y="10" width="70" height="70" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
                <line x1="45" y1="10" x2="45" y2="80" stroke="#cbd5e1" strokeWidth="2" />
                <rect x="36" y="42" width="6" height="6" fill="#94a3b8" />
                <rect x="48" y="42" width="6" height="6" fill="#94a3b8" />

                {/* Countertop */}
                <rect x="0" y="180" width="200" height="20" fill="#475569" />
                <rect x="0" y="180" width="200" height="4" fill="#64748b" />

                <g transform="translate(10, 20)">
                    {/* Body */}
                    <rect x="45" y="100" width="70" height="60" fill="#059669" /> {/* Emerald 600 */}
                    <rect x="55" y="110" width="50" height="50" fill="#ffffff" opacity="0.9" /> {/* Apron */}

                    {/* Head */}
                    <rect x="60" y="60" width="40" height="40" fill="#fcd34d" /> {/* Face */}

                    {/* Chef Hat */}
                    <rect x="50" y="35" width="60" height="15" fill="#ffffff" />
                    <rect x="55" y="25" width="50" height="10" fill="#e5e7eb" />
                    <rect x="65" y="50" width="30" height="10" fill="#ffffff" />

                    {/* Face details */}
                    <rect x="66" y="72" width="8" height="8" fill="#4b5563" />
                    <rect x="86" y="72" width="8" height="8" fill="#4b5563" />
                    <rect x="74" y="86" width="12" height="4" fill="#4b5563" />

                    {/* Arm and Pan Wrapper */}
                    <g className="arm">
                        {/* Arm */}
                        <line x1="95" y1="105" x2="115" y2="114" stroke="#059669" strokeWidth="14" strokeLinecap="square" />
                        <rect x="110" y="108" width="12" height="12" fill="#fcd34d" /> {/* Hand */}

                        {/* Pan Wrapper to apply pan movement */}
                        <g className="pan">
                            <line x1="120" y1="114" x2="135" y2="108" stroke="#4b5563" strokeWidth="6" strokeLinecap="square" />
                            <rect x="133" y="100" width="28" height="10" fill="#374151" />

                            {/* Food Flipping */}
                            <g className="flip-item">
                                <rect x="142" y="95" width="12" height="5" fill="#fbbf24" />
                            </g>
                        </g>
                    </g>

                    {/* Steam container fixed relative to the pan's general area */}
                    <g>
                        <rect className="steam-1" x="140" y="80" width="6" height="6" fill="#9ca3af" opacity="0" />
                        <rect className="steam-2" x="150" y="75" width="6" height="6" fill="#9ca3af" opacity="0" />
                        <rect className="steam-3" x="145" y="85" width="6" height="6" fill="#9ca3af" opacity="0" />
                    </g>
                </g>
            </g>

            {/* Border */}
            <rect x="1" y="1" width="198" height="198" rx="31" fill="none" stroke="#e2e8f0" strokeWidth="2" />
        </svg>
    );
}
