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
 * Shows prominent unavailable-supply badges with a bold red slash for every
 * shower amenity the guest is currently ineligible for (cooldown not yet expired).
 * Renders nothing when the guest can receive everything, so staff can see
 * at a glance which supplies can still be handed out without opening the
 * amenities panel.
 */
export function ShowerIneligibleSupplies({ guestId, className }: Props) {
    const checkAvailability = useItemsStore((s) => s.checkAvailability);
    // Subscribe to the underlying history: the availability function
    // reference never changes, so without this the badges compute once on
    // mount (while history is still loading) and never update when the
    // fetch resolves.
    const distributedItems = useItemsStore((s) => s.distributedItems);

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
    }, [checkAvailability, guestId, distributedItems]);

    if (ineligible.length === 0) return null;

    return (
        <span
            className={cn('inline-flex items-center gap-2 flex-wrap', className)}
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
                        className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 border-2 border-red-300 shadow-sm"
                    >
                        <Icon
                            size={item.size ? 22 : 20}
                            strokeWidth={item.strokeWidth ?? 2}
                            className="text-gray-900"
                            aria-hidden="true"
                        />
                        <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <span className="block w-[135%] h-[3px] bg-red-600 -rotate-[30deg] rounded-full shadow-[0_0_0_1px_white]" />
                        </span>
                    </span>
                );
            })}
        </span>
    );
}

export default ShowerIneligibleSupplies;
