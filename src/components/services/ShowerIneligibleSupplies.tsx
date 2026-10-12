'use client';

import React, { useMemo } from 'react';
import { useItemsStore } from '@/stores/useItemsStore';
import { SHOWER_AMENITY_ITEMS } from './showerAmenityItems';
import { cn } from '@/lib/utils/cn';

interface Props {
    guestId: string;
    className?: string;
}

/**
 * Shows grayed-out supply icons with a red slash for every shower amenity
 * the guest is currently ineligible for (cooldown not yet expired).
 * Renders nothing when the guest can receive everything, so staff can see
 * at a glance which supplies can still be handed out without opening the
 * amenities panel.
 */
export function ShowerIneligibleSupplies({ guestId, className }: Props) {
    const checkAvailability = useItemsStore((s) => s.checkAvailability);

    const ineligible = useMemo(() => {
        if (typeof checkAvailability !== 'function' || !guestId) return [];
        const result: { item: (typeof SHOWER_AMENITY_ITEMS)[number]; daysRemaining?: number }[] = [];
        for (const item of SHOWER_AMENITY_ITEMS) {
            let availability: { available: boolean; daysRemaining?: number };
            try {
                availability = checkAvailability(guestId, item.key);
            } catch {
                continue;
            }
            if (availability?.available) continue;
            result.push({ item, daysRemaining: availability?.daysRemaining });
        }
        return result;
    }, [checkAvailability, guestId]);

    if (ineligible.length === 0) return null;

    return (
        <span
            className={cn('inline-flex items-center gap-1.5 flex-wrap', className)}
            aria-label="Unavailable supplies"
            data-testid={`ineligible-supplies-${guestId}`}
        >
            {ineligible.map(({ item, daysRemaining }) => {
                const Icon = item.icon;
                const label =
                    daysRemaining !== undefined
                        ? `${item.label} unavailable, ${daysRemaining}d left`
                        : `${item.label} unavailable`;
                return (
                    <span
                        key={item.key}
                        role="img"
                        aria-label={label}
                        title={label}
                        data-testid={`ineligible-supply-${item.key}`}
                        className="relative inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 border border-gray-200"
                    >
                        <Icon size={16} className="text-gray-400" aria-hidden="true" />
                        <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <span className="block w-[140%] h-[2px] bg-red-500 -rotate-[30deg] rounded-full" />
                        </span>
                    </span>
                );
            })}
        </span>
    );
}

export default ShowerIneligibleSupplies;
