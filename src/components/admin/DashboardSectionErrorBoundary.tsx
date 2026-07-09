'use client';

import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, Activity } from 'lucide-react';

interface Props {
    children: ReactNode;
    /** Label shown in the fallback header describing which section failed. */
    sectionLabel?: string;
    /** Optional render-prop used by tests to assert the fallback was shown. */
    onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorKey: string;
}

/**
 * Error boundary that isolates a single dashboard section (charts, reports,
 * analytics) so a client-side render error in one section — most notably the
 * recharts ResponsiveContainer infinite-render loop (React error #185) that
 * resurfaces when the board role lands directly on the dashboard on a fresh
 * full-page load — renders a graceful fallback instead of crashing the whole
 * page with Next.js's "Application error: a client-side exception has
 * occurred" overlay.
 *
 * React's "Maximum update depth exceeded" is thrown as an uncaught render
 * error, so a class error boundary catches it here. Changing `errorKey`
 * (driven by `children` identity) resets the boundary when the section is
 * re-mounted, e.g. on tab switch.
 */
export class DashboardSectionErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorKey: '' };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        // Surface the loop/error in the console for staff debugging without
        // taking down the dashboard.
        console.error('[DashboardSectionErrorBoundary]', this.props.sectionLabel ?? 'Dashboard section', error, info.componentStack);
        this.props.onError?.(error, info);
    }

    render() {
        if (this.state.hasError) {
            const label = this.props.sectionLabel ?? 'This section';
            return (
                <div
                    role="alert"
                    data-testid="dashboard-section-error-fallback"
                    className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 text-center"
                >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                        <AlertTriangle size={22} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-black text-amber-900">
                            {label} couldn&apos;t load right now.
                        </p>
                        <p className="text-xs font-medium text-amber-700">
                            Other tabs still work — try switching tabs and coming back.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                    >
                        <Activity size={13} /> Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default DashboardSectionErrorBoundary;