import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const {
    mounts,
    unmounts,
    dynamicComponentNames,
    dynamicState,
} = vi.hoisted(() => ({
    mounts: {} as Record<string, number>,
    unmounts: {} as Record<string, number>,
    dynamicComponentNames: [
        'AnalyticsSection',
        'DataExportSection',
        'MealReport',
        'MonthlySummaryReport',
        'MonthlyReportGenerator',
    ],
    dynamicState: { index: 0 },
}));

vi.mock('next/dynamic', () => ({
    default: () => {
        const componentName = dynamicComponentNames[dynamicState.index] ?? `Dynamic${dynamicState.index}`;
        dynamicState.index += 1;
        const MockDynamicComponent = () => {
            useEffect(() => {
                mounts[componentName] = (mounts[componentName] ?? 0) + 1;
                return () => {
                    unmounts[componentName] = (unmounts[componentName] ?? 0) + 1;
                };
            }, []);
            return <div data-testid={`dynamic:${componentName}`}>{componentName}</div>;
        };
        return MockDynamicComponent;
    },
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, initial: _initial, animate: _animate, transition: _transition, ...rest }: React.HTMLAttributes<HTMLDivElement> & { initial?: unknown; animate?: unknown; transition?: unknown }) => <div {...rest}>{children}</div>,
        span: ({ children, initial: _initial, animate: _animate, transition: _transition, ...rest }: React.HTMLAttributes<HTMLSpanElement> & { initial?: unknown; animate?: unknown; transition?: unknown }) => <span {...rest}>{children}</span>,
    },
}));

vi.mock('@/hooks/useReducedMotion', () => ({
    useReducedMotion: () => true,
}));

const loadSettings = vi.fn();
const ensureMealsLoaded = vi.fn(async () => undefined);
const ensureServicesLoaded = vi.fn(async () => undefined);
const ensureGuestsLoaded = vi.fn(async () => undefined);

vi.mock('@/stores/useSettingsStore', () => ({
    useSettingsStore: () => ({ loadSettings }),
}));

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: (selector: (state: { ensureLoaded: typeof ensureMealsLoaded }) => unknown) =>
        selector({ ensureLoaded: ensureMealsLoaded }),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: (selector: (state: { ensureLoaded: typeof ensureServicesLoaded }) => unknown) =>
        selector({ ensureLoaded: ensureServicesLoaded }),
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: (selector: (state: { ensureLoaded: typeof ensureGuestsLoaded }) => unknown) =>
        selector({ ensureLoaded: ensureGuestsLoaded }),
}));

import DashboardPage from '../(protected)/dashboard/page';

describe('Dashboard tab switching performance', () => {
    beforeEach(() => {
        Object.keys(mounts).forEach((key) => delete mounts[key]);
        Object.keys(unmounts).forEach((key) => delete unmounts[key]);
        loadSettings.mockClear();
        ensureMealsLoaded.mockClear();
        ensureServicesLoaded.mockClear();
        ensureGuestsLoaded.mockClear();
    });

    it('keeps previously opened report tabs mounted when switching between report views', async () => {
        render(<DashboardPage />);

        fireEvent.click(screen.getAllByRole('button', { name: /monthly report/i })[0]);

        await waitFor(() => expect(screen.getByTestId('dynamic:MonthlyReportGenerator')).toBeDefined());

        fireEvent.click(screen.getAllByRole('button', { name: /meal report/i })[0]);

        await waitFor(() => expect(screen.getByTestId('dynamic:MealReport')).toBeDefined());

        fireEvent.click(screen.getAllByRole('button', { name: /monthly report/i })[0]);

        await waitFor(() => expect(screen.getByTestId('dynamic:MonthlyReportGenerator')).toBeDefined());

        expect(mounts.MonthlyReportGenerator).toBe(1);
        expect(unmounts.MonthlyReportGenerator ?? 0).toBe(0);
    });
});
