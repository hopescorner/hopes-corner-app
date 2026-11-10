'use client';

import { CircleHelp } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { HOUSING_STATUS_ICONS, normalizeHousingStatusLabel } from '@/components/ui/housingStatus';

type HousingBadgeTone = {
    container: string;
    icon: string;
};

const HOUSING_STATUS_STYLES: Record<string, HousingBadgeTone> = {
    'Unhoused': {
        container: 'bg-sky-50 text-sky-700 border-sky-200',
        icon: 'text-sky-500',
    },
    'Housed': {
        container: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: 'text-emerald-500',
    },
    'Temp. shelter': {
        container: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: 'text-amber-500',
    },
    'RV or vehicle': {
        container: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        icon: 'text-indigo-500',
    },
    Unknown: {
        container: 'bg-gray-100 text-gray-600 border-gray-200',
        icon: 'text-gray-400',
    },
};

interface HousingStatusBadgeProps {
    housingStatus?: string | null;
    className?: string;
}

export function HousingStatusBadge({ housingStatus, className }: HousingStatusBadgeProps) {
    const normalizedStatus = normalizeHousingStatusLabel(housingStatus);
    const tone = HOUSING_STATUS_STYLES[normalizedStatus] || HOUSING_STATUS_STYLES.Unknown;
    const Icon = HOUSING_STATUS_ICONS[normalizedStatus] ?? CircleHelp;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
                tone.container,
                className,
            )}
        >
            <Icon size={10} className={tone.icon} aria-hidden="true" />
            {normalizedStatus}
        </span>
    );
}
