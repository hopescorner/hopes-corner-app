import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RealtimeSyncProvider } from '@/components/providers/RealtimeSyncProvider';

const useRealtimeSync = vi.fn();
vi.mock('@/hooks/useRealtimeSync', () => ({ useRealtimeSync: () => useRealtimeSync() }));

describe('RealtimeSyncProvider', () => {
    it('starts realtime only when the route-level provider mounts', () => {
        render(<RealtimeSyncProvider />);
        expect(useRealtimeSync).toHaveBeenCalledOnce();
    });
});
