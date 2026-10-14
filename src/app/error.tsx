'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error('Unhandled application error:', error);
    }, [error]);

    return (
        <main className="min-h-screen bg-neutral-50 px-4 py-16 flex items-center justify-center">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm border border-neutral-200 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <AlertCircle className="h-8 w-8" aria-hidden="true" />
                </div>
                <h1 className="text-xl font-bold text-neutral-900">Something went wrong</h1>
                <p className="mt-2 text-sm text-neutral-600">
                    An unexpected error occurred. Please try again or return to the main check-in page.
                </p>
                {error?.message && (
                    <div className="mt-3 rounded-lg bg-neutral-100 p-2.5 text-xs text-neutral-700 font-mono text-left break-words max-h-24 overflow-y-auto">
                        {error.message}
                    </div>
                )}
                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        type="button"
                        onClick={() => reset()}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 active:bg-emerald-700 transition-colors"
                    >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        Try again
                    </button>
                    <Link
                        href="/check-in"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                        <Home className="h-4 w-4" aria-hidden="true" />
                        Go to Check-In
                    </Link>
                </div>
            </div>
        </main>
    );
}
