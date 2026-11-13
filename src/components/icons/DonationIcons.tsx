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
            <path
                d="M5.6 4.6C3.7 9.9 6 16.4 11.5 19c3 1.4 6.3 1.2 8.8-.4.5-.3.6-1 .2-1.4l-1.3-1.5c-2 .9-4.4.9-6.4-.1C8.6 13.4 6.9 9.5 7.6 5.7c.1-.6-.5-1.1-1-.8L5.6 4.6Z"
                fill="#F4C542"
            />
            <path
                d="M7.9 6.8c-.3 3.4 1.4 6.8 4.8 8.6 1.9 1 4.1 1.1 6 .4"
                stroke="#D9A62E"
                strokeWidth="1.3"
                strokeLinecap="round"
                fill="none"
                opacity="0.75"
            />
            <path
                d="M18.7 16.9l1.9 1.3"
                stroke="#7A5A2E"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M4.8 5.5l1.5-.7"
                stroke="#7A5A2E"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
            />
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
