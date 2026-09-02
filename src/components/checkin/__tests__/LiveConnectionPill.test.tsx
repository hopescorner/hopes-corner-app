import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveConnectionPill } from '../LiveConnectionPill';

describe('LiveConnectionPill', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('renders Live Sync status when online', () => {
        Object.defineProperty(window.navigator, 'onLine', {
            value: true,
            configurable: true,
        });

        render(<LiveConnectionPill />);
        expect(screen.getByText('Live Sync')).toBeDefined();
    });

    it('renders Offline status when navigator is offline', () => {
        Object.defineProperty(window.navigator, 'onLine', {
            value: false,
            configurable: true,
        });

        render(<LiveConnectionPill />);
        expect(screen.getByText('Offline')).toBeDefined();
    });
});
