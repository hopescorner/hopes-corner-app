'use client';

import { useRealtimeSync } from '@/hooks/useRealtimeSync';

export function RealtimeSyncProvider() {
    useRealtimeSync();
    return null;
}
