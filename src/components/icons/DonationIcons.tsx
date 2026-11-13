import React from 'react';

interface DonationIconProps {
    size?: number;
    className?: string;
}

/**
 * Colored produce/lunch icons for the donations quick-add row. These are
 * intentionally filled (unlike the mostly-outline lucide set) so the five
 * items stay distinguishable at a glance during a busy distribution.
 */

export function AppleIcon({ size = 24, className = '' }: DonationIconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={className}
            aria-hidden="true"
            data-testid="apple-icon"
        >
            <path
                d="M12 7.6c-1.3-1.5-3.6-1.9-5.3-.6C4.3 8.5 3.9 11.7 4.9 14.6c.8 2.4 2.5 5.3 4.4 5.7 1 .2 1.8-.5 2.7-.5s1.7.7 2.7.5c1.9-.4 3.6-3.3 4.4-5.7 1-2.9.6-6.1-1.8-7.6-1.7-1.3-4-.9-5.3.6Z"
                fill="#E0463C"
            />
            <path
                d="M8.2 9.2c-1 .7-1.5 1.9-1.4 3.1"
                stroke="#FFFFFF"
                strokeOpacity="0.4"
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M12 7.7c0-1.9.6-3.3 1.8-4.3"
                stroke="#7A4F2B"
                strokeWidth="1.7"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M13.7 3.5c1-1.1 2.7-1.4 3.9-1 .2 1.2-.4 2.7-1.6 3.4-.9.5-2 .6-2.8.3.1-1 .2-1.9.5-2.7Z"
                fill="#4C9A4F"
            />
        </svg>
    );
}

export function BananaIcon({ size = 24, className = '' }: DonationIconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={className}
            aria-hidden="true"
            data-testid="banana-icon"
        >
            {/* Silhouette adapted from Lucide's banana icon (ISC license, lucide.dev) */}
            <path
                d="M5.15 17.89c5.52-1.52 8.65-6.89 7-12C11.55 4 11.5 2 13 2c3.22 0 5 5.5 5 8 0 6.5-4.2 12-10.49 12C5.11 22 2 22 2 20c0-1.5 1.14-1.55 3.15-2.11Z"
                fill="#F6C445"
            />
            <path
                d="M6.85 16.7c5.4-1.5 8.35-6.6 7-11.1"
                stroke="#D9A62E"
                strokeWidth="1.3"
                strokeLinecap="round"
                fill="none"
                opacity="0.8"
            />
            <circle cx="13" cy="2.4" r="0.75" fill="#7A5A2E" />
            <circle cx="3" cy="19.4" r="0.7" fill="#7A5A2E" opacity="0.9" />
        </svg>
    );
}

export function PearIcon({ size = 24, className = '' }: DonationIconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={className}
            aria-hidden="true"
            data-testid="pear-icon"
        >
            <path
                d="M12 6.4c-1 0-1.8 1-1.8 2.3 0 .9.4 1.7.4 2.5-2.1 1-3.6 3-3.6 5.5 0 3.2 2.2 5.4 5 5.4s5-2.2 5-5.4c0-2.5-1.5-4.5-3.6-5.5 0-.8.4-1.6.4-2.5 0-1.3-.8-2.3-1.8-2.3Z"
                fill="#A3C94A"
            />
            <path
                d="M9.1 13.5c-.9 1.2-1.3 2.7-1 4"
                stroke="#FFFFFF"
                strokeOpacity="0.45"
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M12 6.4c0-1.3.4-2.3 1.1-3.1"
                stroke="#7A4F2B"
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M13.1 4.1c.9-1.2 2.5-1.7 3.7-1.4.2 1.2-.3 2.7-1.5 3.5-.8.5-1.9.6-2.7.4 0-.9.1-1.8.5-2.5Z"
                fill="#4C9A4F"
            />
        </svg>
    );
}

export function PeachIcon({ size = 24, className = '' }: DonationIconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={className}
            aria-hidden="true"
            data-testid="peach-icon"
        >
            <path
                d="M12 7.3c-1.5-1.5-4-1.6-5.5 0-2 1.9-2.1 5.4-.9 8.1.9 2.1 2.7 4.5 4.6 4.7.9.1 1.4-.5 1.8-.5s.9.6 1.8.5c1.9-.2 3.7-2.6 4.6-4.7 1.2-2.7 1.1-6.2-.9-8.1-1.5-1.6-4-1.5-5.5 0Z"
                fill="#F79B72"
            />
            <path
                d="M12 8.8c.7 2.4.7 5.2.1 7.8"
                stroke="#D9744B"
                strokeWidth="1.2"
                strokeLinecap="round"
                fill="none"
                opacity="0.6"
            />
            <path
                d="M12 7.3c0-1.3.2-2.4.9-3.3"
                stroke="#7A4F2B"
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M13.1 4.2c.9-1.2 2.5-1.7 3.7-1.4.2 1.2-.3 2.7-1.5 3.5-.8.5-1.9.6-2.7.4 0-.9.1-1.8.5-2.5Z"
                fill="#4C9A4F"
            />
        </svg>
    );
}

export function OrangeIcon({ size = 24, className = '' }: DonationIconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={className}
            aria-hidden="true"
            data-testid="orange-icon"
        >
            <circle cx="12" cy="13.4" r="6.8" fill="#F59A23" />
            <path
                d="M8.5 10.3c.5-1 1.4-1.8 2.4-2.2"
                stroke="#FFC46B"
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="none"
            />
            <circle cx="9.4" cy="16.6" r="0.7" fill="#D97D12" opacity="0.35" />
            <circle cx="13.6" cy="17.4" r="0.55" fill="#D97D12" opacity="0.3" />
            <path
                d="M12 6.6c0-1.4.3-2.5 1-3.4"
                stroke="#7A4F2B"
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M13.2 3.9c.9-1.1 2.5-1.5 3.6-1.1.1 1.1-.4 2.5-1.5 3.2"
                fill="#3E9C4C"
            />
        </svg>
    );
}

export function CarrotIcon({ size = 24, className = '' }: DonationIconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={className}
            aria-hidden="true"
            data-testid="carrot-icon"
        >
            {/* Cone silhouette adapted from Lucide's carrot icon (ISC license, lucide.dev) */}
            <path
                d="M2.27 21.7s9.87-3.5 12.73-6.36a4.5 4.5 0 0 0-6.36-6.37C5.77 11.84 2.27 21.7 2.27 21.7z"
                fill="#F07C1E"
            />
            <path
                d="M6.6 13.2c1.9 1.1 3.6 2.6 4.9 4.3"
                stroke="#FFC98A"
                strokeWidth="1.2"
                strokeLinecap="round"
                fill="none"
                opacity="0.65"
            />
            <path
                d="M22 9s-1.33-2-3.5-2C16.86 7 15 9 15 9s1.33 2 3.5 2S22 9 22 9z"
                fill="#4C9A4F"
            />
            <path
                d="M15 2s-2 1.33-2 3.5S15 9 15 9s2-1.84 2-3.5C17 3.33 15 2 15 2z"
                fill="#3E9C4C"
            />
            <path
                d="M8.64 14l-2.05-2.04M15.34 15l-2.46-2.46"
                stroke="#C9540E"
                strokeWidth="1.15"
                strokeLinecap="round"
                fill="none"
                opacity="0.7"
            />
        </svg>
    );
}

export function MixedVeggiesIcon({ size = 24, className = '' }: DonationIconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={className}
            aria-hidden="true"
            data-testid="mixed-veggies-icon"
        >
            {/* Broccoli floret cluster + stalk */}
            <path
                d="M9.7 11.9l-2.3 4.8a1 1 0 0 0 .9 1.35h2.65a1 1 0 0 0 .9-1.35l-2.15-4.8Z"
                fill="#B4DE85"
            />
            <circle cx="3.7" cy="10" r="1.8" fill="#3E9C4C" />
            <circle cx="6.9" cy="7.3" r="2.15" fill="#57A85B" />
            <circle cx="10.1" cy="10" r="1.8" fill="#3E9C4C" />
            <circle cx="5.35" cy="11.65" r="1.75" fill="#57A85B" />
            <circle cx="8.45" cy="11.65" r="1.75" fill="#57A85B" />
            {/* Edamame pod with three peas */}
            <path
                d="M13.2 14.3l6-5.5a2.2 2.2 0 0 1 2.6 1.1 2.2 2.2 0 0 1-1.1 2.6l-6 5.5a2.2 2.2 0 0 1-2.6-1.1 2.2 2.2 0 0 1 1.1-2.6Z"
                fill="#4C9A4F"
                stroke="#2F7E3D"
                strokeWidth="0.8"
                strokeLinejoin="round"
            />
            <circle cx="14.6" cy="15.1" r="0.75" fill="#9BE18B" />
            <circle cx="16.9" cy="13.2" r="0.75" fill="#9BE18B" />
            <circle cx="19.2" cy="11.3" r="0.55" fill="#9BE18B" />
        </svg>
    );
}

export function SchoolLunchIcon({ size = 24, className = '' }: DonationIconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={className}
            aria-hidden="true"
            data-testid="school-lunch-icon"
        >
            <path
                d="M9 8.2V6.9a3 3 0 0 1 6 0v1.3"
                stroke="#3C74AC"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
            />
            <rect x="3.5" y="8" width="17" height="11.6" rx="2.6" fill="#4E8FD1" />
            <path
                d="M3.5 11.4h17"
                stroke="#3C74AC"
                strokeWidth="1.2"
                opacity="0.85"
            />
            <rect x="10.7" y="10.3" width="2.6" height="3.2" rx="0.8" fill="#F4C542" />
            <path
                d="M7 15.2h3.2M7 17.4h2.2"
                stroke="#DCEBFA"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.8"
            />
            <circle cx="15.9" cy="16.2" r="1.9" fill="#F4C542" />
            <path
                d="M15.9 14.3c.2-.7.7-1.2 1.4-1.4"
                stroke="#3E9C4C"
                strokeWidth="1.1"
                strokeLinecap="round"
                fill="none"
            />
        </svg>
    );
}
