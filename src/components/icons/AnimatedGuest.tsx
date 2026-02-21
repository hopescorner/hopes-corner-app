import React from 'react';

export default function AnimatedGuest({ className = '' }: { className?: string }) {
    return (
        <svg
            className={`w-full h-full ${className}`}
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
        >
            <style>
                {`
                    @keyframes eatMove {
                        0%, 100% { transform: rotate(0deg); }
                        40%, 60% { transform: rotate(-35deg) translate(0px, -15px); }
                    }
                    @keyframes chew {
                        0%, 100% { transform: scaleY(1); }
                        45%, 55% { transform: scaleY(0.8); }
                    }
                    @keyframes foodDisappear {
                        0%, 39% { opacity: 1; }
                        40%, 100% { opacity: 0; }
                    }
                    .eating-arm {
                        animation: eatMove 2s ease-in-out infinite;
                        transform-origin: 110px 145px;
                    }
                    .mouth {
                        animation: chew 2s ease-in-out infinite;
                        transform-origin: 100px 92px;
                    }
                    .food {
                        animation: foodDisappear 2s ease-in-out infinite;
                        transform-origin: 130px 130px;
                    }
                `}
            </style>

            <defs>
                <clipPath id="guest-clip">
                    <rect x="0" y="0" width="200" height="200" rx="32" />
                </clipPath>
            </defs>

            <g clipPath="url(#guest-clip)">
                {/* Background Base */}
                <rect x="0" y="0" width="200" height="200" fill="#fffbeb" />

                {/* Wallpaper Pattern */}
                <g stroke="#fef3c7" strokeWidth="12">
                    <line x1="20" y1="0" x2="20" y2="160" />
                    <line x1="60" y1="0" x2="60" y2="160" />
                    <line x1="100" y1="0" x2="100" y2="160" />
                    <line x1="140" y1="0" x2="140" y2="160" />
                    <line x1="180" y1="0" x2="180" y2="160" />
                </g>

                {/* Painting */}
                <rect x="25" y="30" width="50" height="60" fill="#e2e8f0" stroke="#b45309" strokeWidth="4" />
                <circle cx="50" cy="55" r="14" fill="#10b981" />
                <circle cx="40" cy="70" r="10" fill="#3b82f6" opacity="0.8" />
                <circle cx="65" cy="70" r="8" fill="#f59e0b" opacity="0.8" />

                {/* Window */}
                <rect x="135" y="20" width="50" height="80" fill="#e0f2fe" stroke="#ffffff" strokeWidth="6" />
                <line x1="160" y1="20" x2="160" y2="100" stroke="#ffffff" strokeWidth="4" />
                <line x1="135" y1="60" x2="185" y2="60" stroke="#ffffff" strokeWidth="4" />

                {/* Baseboard */}
                <rect x="0" y="155" width="200" height="5" fill="#fcd34d" />

                {/* Floor */}
                <rect x="0" y="160" width="200" height="40" fill="#fef3c7" />
                <line x1="0" y1="160" x2="200" y2="160" stroke="#f59e0b" strokeWidth="2" opacity="0.2" />
                <line x1="0" y1="180" x2="200" y2="180" stroke="#f59e0b" strokeWidth="2" opacity="0.1" />

                <g transform="translate(10, 10)">
                    {/* Body */}
                    <rect x="60" y="104" width="80" height="76" fill="#0ea5e9" /> {/* Sky 500 Shirt */}

                    {/* Head */}
                    <rect x="76" y="56" width="48" height="48" fill="#fcd34d" /> {/* Face */}

                    {/* Hair */}
                    <rect x="72" y="48" width="56" height="16" fill="#78350f" />
                    <rect x="72" y="64" width="8" height="24" fill="#78350f" />
                    <rect x="120" y="64" width="8" height="24" fill="#78350f" />

                    {/* Face details */}
                    <rect x="86" y="72" width="6" height="6" fill="#4b5563" />
                    <rect x="108" y="72" width="6" height="6" fill="#4b5563" />

                    {/* Cheeks */}
                    <rect x="80" y="82" width="6" height="6" fill="#fbbf24" opacity="0.5" />
                    <rect x="114" y="82" width="6" height="6" fill="#fbbf24" opacity="0.5" />

                    {/* Mouth animated wrapper */}
                    <g className="mouth">
                        <rect x="92" y="88" width="16" height="6" fill="#4b5563" />
                        <rect x="94" y="90" width="12" height="4" fill="#dc2626" opacity="0.8" />
                    </g>

                    {/* Table */}
                    <rect x="20" y="160" width="160" height="15" fill="#92400e" rx="0" />
                    <rect x="40" y="175" width="10" height="15" fill="#78350f" />
                    <rect x="150" y="175" width="10" height="15" fill="#78350f" />

                    {/* Plate */}
                    <rect x="65" y="152" width="70" height="8" fill="#e5e7eb" rx="2" />
                    <rect x="70" y="150" width="60" height="4" fill="#ffffff" />

                    {/* Food on plate */}
                    <rect x="80" y="146" width="16" height="8" fill="#b45309" />
                    <rect x="105" y="146" width="10" height="8" fill="#10b981" />
                    <rect x="115" y="148" width="8" height="6" fill="#10b981" opacity="0.8" />

                    {/* Eating Arm wrapper */}
                    <g className="eating-arm">
                        {/* Fork */}
                        <g transform="translate(-2, 5)">
                            <line x1="110" y1="120" x2="110" y2="140" stroke="#9ca3af" strokeWidth="4" strokeLinecap="square" />
                            <rect x="102" y="112" width="16" height="8" fill="none" stroke="#9ca3af" strokeWidth="3" />
                            <rect x="102" y="106" width="4" height="6" fill="#9ca3af" />
                            <rect x="108" y="106" width="4" height="6" fill="#9ca3af" />
                            <rect x="114" y="106" width="4" height="6" fill="#9ca3af" />

                            {/* Food on Fork */}
                            <rect x="104" y="100" width="10" height="8" fill="#b45309" className="food" />
                        </g>

                        {/* Arm */}
                        <path d="M140 110 L140 145 L115 145" stroke="#0ea5e9" strokeWidth="16" strokeLinecap="square" strokeLinejoin="miter" fill="none" />
                        <rect x="105" y="138" width="14" height="14" fill="#fcd34d" /> {/* Hand */}
                    </g>

                    {/* Other Arm holding knife or resting */}
                    <path d="M60 110 L60 150 L80 150" stroke="#0ea5e9" strokeWidth="16" strokeLinecap="square" strokeLinejoin="miter" fill="none" />
                    <rect x="80" y="143" width="14" height="14" fill="#fcd34d" />
                </g>
            </g>

            {/* Border */}
            <rect x="1" y="1" width="198" height="198" rx="31" fill="none" stroke="#e2e8f0" strokeWidth="2" />
        </svg>
    );
}
