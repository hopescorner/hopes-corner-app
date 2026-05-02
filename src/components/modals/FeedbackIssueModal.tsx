'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bug, Lightbulb, Loader2, MessageSquarePlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { APP_VERSION } from '@/lib/utils/appVersion';
import { cn } from '@/lib/utils/cn';

interface FeedbackIssueModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type FeedbackCategory = 'issue' | 'feature';

function detectBrowser(userAgent: string) {
    const edge = userAgent.match(/Edg\/(\d+(?:\.\d+)?)/);
    if (edge) return `Edge ${edge[1]}`;

    const chrome = userAgent.match(/(?:Chrome|CriOS)\/(\d+(?:\.\d+)?)/);
    if (chrome) return `Chrome ${chrome[1]}`;

    const firefox = userAgent.match(/(?:Firefox|FxiOS)\/(\d+(?:\.\d+)?)/);
    if (firefox) return `Firefox ${firefox[1]}`;

    const safari = userAgent.match(/Version\/(\d+(?:\.\d+)?).*Safari/);
    if (safari) return `Safari ${safari[1]}`;

    return 'Unknown';
}

function detectOS(userAgent: string, platform: string) {
    if (/iPad|iPhone|iPod/.test(userAgent) || platform === 'MacIntel' && navigator.maxTouchPoints > 1) return 'iPadOS/iOS';
    if (/Android/.test(userAgent)) return 'Android';
    if (/Windows NT/.test(userAgent)) return 'Windows';
    if (/Mac OS X|Macintosh/.test(userAgent)) return 'macOS';
    if (/Linux/.test(userAgent)) return 'Linux';
    return platform || 'Unknown';
}

export function collectFeedbackEnvironment() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return { os: 'Unknown', browser: 'Unknown', userAgent: '', viewport: 'unknown' };
    }

    const userAgent = navigator.userAgent || '';
    const platform = navigator.platform || '';

    return {
        os: detectOS(userAgent, platform),
        browser: detectBrowser(userAgent),
        userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
    };
}

export function FeedbackIssueModal({ isOpen, onClose }: FeedbackIssueModalProps) {
    const [category, setCategory] = useState<FeedbackCategory>('issue');
    const [summary, setSummary] = useState('');
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleClose = () => {
        if (isSubmitting) return;
        onClose();
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/feedback/github-issue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category,
                    summary,
                    details,
                    environment: collectFeedbackEnvironment(),
                    path: typeof window !== 'undefined' ? window.location.pathname : undefined,
                    appVersion: APP_VERSION,
                }),
            });

            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body?.error || 'Unable to create the GitHub issue.');
            }

            toast.success(
                Array.isArray(body?.warnings) && body.warnings.length > 0
                    ? `Created GitHub issue #${body.issueNumber}; assignment or labels need review.`
                    : `Created GitHub issue #${body.issueNumber}`,
            );
            setSummary('');
            setDetails('');
            setCategory('issue');
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to create the GitHub issue.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const categoryOptions: Array<{ id: FeedbackCategory; label: string; icon: React.ElementType }> = [
        { id: 'issue', label: 'Issue', icon: Bug },
        { id: 'feature', label: 'Feature', icon: Lightbulb },
    ];

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Close feedback modal backdrop"
                onClick={handleClose}
                className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <div className="flex items-start justify-between gap-4 border-b border-emerald-100 bg-emerald-50 px-5 py-4 sm:px-6">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                            <MessageSquarePlus size={22} aria-hidden="true" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900">File Issue or Request</h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Close feedback modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                    <div>
                        <p className="mb-2 text-xs font-black uppercase tracking-widest text-gray-500">Type</p>
                        <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
                            {categoryOptions.map((option) => {
                                const Icon = option.icon;
                                const selected = category === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => setCategory(option.id)}
                                        className={cn(
                                            'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors',
                                            selected ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700',
                                        )}
                                    >
                                        <Icon size={16} aria-hidden="true" />
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="feedback-summary" className="text-xs font-black uppercase tracking-widest text-gray-500">
                            Short Summary
                        </label>
                        <input
                            id="feedback-summary"
                            value={summary}
                            onChange={(event) => setSummary(event.target.value)}
                            maxLength={140}
                            required
                            placeholder="Example: Shower waitlist does not refresh"
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="feedback-details" className="text-xs font-black uppercase tracking-widest text-gray-500">
                            What happened or what should change?
                        </label>
                        <textarea
                            id="feedback-details"
                            value={details}
                            onChange={(event) => setDetails(event.target.value)}
                            minLength={20}
                            maxLength={4000}
                            required
                            rows={7}
                            placeholder="Include the steps you took, what you expected, and what happened instead."
                            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        />
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-medium text-gray-600">
                        <span className="font-black uppercase tracking-wider text-gray-500">Captured context:</span>{' '}
                        {collectFeedbackEnvironment().os}, {collectFeedbackEnvironment().browser}, {collectFeedbackEnvironment().viewport}
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <MessageSquarePlus size={16} aria-hidden="true" />}
                            Submit
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
