import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ServiceWorkerRegistration } from '../ServiceWorkerRegistration';

describe('ServiceWorkerRegistration Component', () => {
    const originalEnv = process.env;
    let swMessageListeners: Map<string, ((...args: any[]) => void)[]>;
    let registrationResult: any;
    let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
    let reloadMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
        swMessageListeners = new Map();

        registrationResult = {
            scope: 'test-scope',
            update: vi.fn(),
            waiting: null,
            installing: null,
            addEventListener: vi.fn(),
        };

        // Spy on window.addEventListener — invoke 'load' callbacks immediately
        addEventListenerSpy = vi.spyOn(window, 'addEventListener').mockImplementation((event: string, cb: any) => {
            if (event === 'load') cb();
        });

        // Mock location.reload
        reloadMock = vi.fn();
        Object.defineProperty(window, 'location', {
            value: { ...window.location, reload: reloadMock },
            writable: true,
            configurable: true,
        });

        Object.defineProperty(global, 'navigator', {
            value: {
                serviceWorker: {
                    register: vi.fn().mockResolvedValue(registrationResult),
                    addEventListener: vi.fn((event: string, cb: (...args: any[]) => void) => {
                        if (!swMessageListeners.has(event)) {
                            swMessageListeners.set(event, []);
                        }
                        swMessageListeners.get(event)!.push(cb);
                    }),
                },
            },
            writable: true,
            configurable: true,
        });
    });

    afterEach(() => {
        process.env = originalEnv;
        addEventListenerSpy.mockRestore();
    });

    it('registers service worker in production', () => {
        process.env.NODE_ENV = 'production';

        render(<ServiceWorkerRegistration />);

        expect(addEventListenerSpy).toHaveBeenCalledWith('load', expect.any(Function));
        expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    });

    it('does not register service worker in development', () => {
        process.env.NODE_ENV = 'development';

        render(<ServiceWorkerRegistration />);

        expect(navigator.serviceWorker.register).not.toHaveBeenCalled();
    });

    it('does not show update banner initially', () => {
        process.env.NODE_ENV = 'production';

        render(<ServiceWorkerRegistration />);

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('checks for updates periodically', async () => {
        vi.useFakeTimers();
        process.env.NODE_ENV = 'production';
        const updateMock = vi.fn();
        registrationResult.update = updateMock;

        render(<ServiceWorkerRegistration />);

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        vi.advanceTimersByTime(61 * 60 * 1000);

        expect(updateMock).toHaveBeenCalled();

        vi.useRealTimers();
    });

    it('shows update banner when SW_UPDATED message received', async () => {
        process.env.NODE_ENV = 'production';

        render(<ServiceWorkerRegistration />);

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        const messageHandlers = swMessageListeners.get('message') || [];
        act(() => {
            messageHandlers.forEach(handler => handler({ data: { type: 'SW_UPDATED' } }));
        });

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('A new version of the app is available')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Refresh Now' })).toBeInTheDocument();
    });

    it('shows update banner on controllerchange', async () => {
        process.env.NODE_ENV = 'production';

        render(<ServiceWorkerRegistration />);

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        const controllerHandlers = swMessageListeners.get('controllerchange') || [];
        act(() => {
            controllerHandlers.forEach(handler => handler());
        });

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('A new version of the app is available')).toBeInTheDocument();
    });

    it('shows update banner when registration.waiting exists', async () => {
        process.env.NODE_ENV = 'production';
        registrationResult.waiting = { state: 'installed' };

        render(<ServiceWorkerRegistration />);

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('reloads page when Refresh Now is clicked', async () => {
        process.env.NODE_ENV = 'production';
        const user = userEvent.setup();

        render(<ServiceWorkerRegistration />);

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        const messageHandlers = swMessageListeners.get('message') || [];
        act(() => {
            messageHandlers.forEach(handler => handler({ data: { type: 'SW_UPDATED' } }));
        });

        const refreshBtn = screen.getByRole('button', { name: 'Refresh Now' });
        await user.click(refreshBtn);

        expect(reloadMock).toHaveBeenCalled();
    });

    it('ignores non SW_UPDATED messages', async () => {
        process.env.NODE_ENV = 'production';

        render(<ServiceWorkerRegistration />);

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        const messageHandlers = swMessageListeners.get('message') || [];
        act(() => {
            messageHandlers.forEach(handler => handler({ data: { type: 'SOME_OTHER_MESSAGE' } }));
        });

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('handles registration failure', async () => {
        process.env.NODE_ENV = 'production';
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        Object.defineProperty(global, 'navigator', {
            value: {
                serviceWorker: {
                    register: vi.fn().mockRejectedValue(new Error('Reg failed')),
                    addEventListener: vi.fn(),
                },
            },
            writable: true,
            configurable: true,
        });

        render(<ServiceWorkerRegistration />);

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });

    it('detects update via updatefound event', async () => {
        process.env.NODE_ENV = 'production';
        let updateFoundCb: (() => void) | null = null;

        registrationResult.addEventListener = vi.fn((event: string, cb: () => void) => {
            if (event === 'updatefound') updateFoundCb = cb;
        });

        const newWorker = {
            state: 'installing',
            addEventListener: vi.fn((event: string, cb: () => void) => {
                if (event === 'statechange') {
                    setTimeout(() => {
                        newWorker.state = 'activated';
                        cb();
                    }, 0);
                }
            }),
        };

        render(<ServiceWorkerRegistration />);

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        registrationResult.installing = newWorker;
        act(() => {
            updateFoundCb?.();
        });

        await act(async () => {
            await new Promise(r => setTimeout(r, 10));
        });

        expect(screen.getByRole('alert')).toBeInTheDocument();
    });
});
