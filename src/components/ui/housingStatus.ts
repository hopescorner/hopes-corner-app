import {
    Caravan,
    CircleHelp,
    House,
    Hotel,
    Tent,
    type LucideIcon,
} from 'lucide-react';
import { normalizeHousingStatus } from '@/lib/utils/normalizers';

/**
 * Icons for the four housing status categories (plus Unknown).
 * Kept in one place so every surface agrees:
 *   Unhoused      → tent (living outdoors)
 *   Housed        → house
 *   Temp. shelter → hotel (temporary lodging, e.g. motel or shelter)
 *   RV or vehicle → caravan (RV / travel trailer)
 */
export const HOUSING_STATUS_ICONS: Record<string, LucideIcon> = {
    Unhoused: Tent,
    Housed: House,
    'Temp. shelter': Hotel,
    'RV or vehicle': Caravan,
    Unknown: CircleHelp,
};

/** Normalize a raw housing status to one of: Unhoused, Housed, Temp. shelter, RV or vehicle, Unknown. */
export function normalizeHousingStatusLabel(housingStatus?: string | null): string {
    const trimmed = housingStatus?.trim();
    if (!trimmed) return 'Unknown';
    return /^unknown$/i.test(trimmed) ? 'Unknown' : normalizeHousingStatus(trimmed);
}
