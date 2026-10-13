'use client';

import { Shirt, Tent, Footprints } from 'lucide-react';
import { JacketIcon } from '@/components/icons/JacketIcon';
import { SleepingBagIcon } from '@/components/icons/SleepingBagIcon';
import { SweatpantsIcon } from '@/components/icons/SweatpantsIcon';
import { BackpackIcon } from '@/components/icons/BackpackIcon';

export interface ShowerAmenityItem {
    key: string;
    label: string;
    // Lucide and custom icons differ slightly on strokeWidth (number vs string|number),
    // so keep this loose — both render with size/className/strokeWidth.
    icon: React.ComponentType<any>;
    limit: string;
    size?: number;
    strokeWidth?: number;
}

// Items with cooldown limits - socks and underwear are unlimited/always available
// so they are not shown here (guests can get them anytime without tracking).
// Shared between ShowerDetailModal (amenities grid) and CompactShowerList
// (ineligible-supply icons) so both views stay in agreement.
export const SHOWER_AMENITY_ITEMS: ShowerAmenityItem[] = [
    { key: 'tshirt', label: 'T-Shirt', icon: Shirt, limit: 'Weekly (Mon)' },
    { key: 'jacket', label: 'Jacket', icon: JacketIcon, limit: '15 Days', size: 36, strokeWidth: 2 },
    { key: 'tent', label: 'Tent', icon: Tent, limit: '30 Days' },
    { key: 'sleeping_bag', label: 'Sleeping Bag', icon: SleepingBagIcon, limit: '30 Days' },
    { key: 'backpack', label: 'Backpack', icon: BackpackIcon, limit: '30 Days', size: 36, strokeWidth: 2 },
    { key: 'flipflops', label: 'Flip Flops', icon: Footprints, limit: '30 Days' },
    { key: 'sweatpants', label: 'Sweatpants', icon: SweatpantsIcon, limit: '30 Days' },
];
