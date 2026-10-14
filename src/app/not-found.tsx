import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
    return (
        <main className="min-h-screen bg-neutral-50 px-4 py-16 flex items-center justify-center">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm border border-neutral-200 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                    <FileQuestion className="h-8 w-8" aria-hidden="true" />
                </div>
                <h1 className="text-xl font-bold text-neutral-900">Page not found</h1>
                <p className="mt-2 text-sm text-neutral-600">
                    The page you are looking for does not exist or has been moved.
                </p>
                <div className="mt-6 flex justify-center">
                    <Link
                        href="/check-in"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 active:bg-emerald-700 transition-colors"
                    >
                        <Home className="h-4 w-4" aria-hidden="true" />
                        Return to Check-In
                    </Link>
                </div>
            </div>
        </main>
    );
}
