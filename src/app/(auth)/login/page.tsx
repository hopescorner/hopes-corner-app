'use client';

import { useState, Suspense } from 'react';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import AnimatedChef from '@/components/icons/AnimatedChef';
import AnimatedGuest from '@/components/icons/AnimatedGuest';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/check-in';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError('Invalid email or password. Please try again.');
            } else if (result?.ok) {
                router.push(callbackUrl);
                router.refresh();
            }
        } catch {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                Sign In
            </h2>

            {error && (
                <div className="flex items-start gap-3 p-4 mb-6 rounded-lg bg-red-50 border border-red-200">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        placeholder="email@hopes-corner.org"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    />
                </div>

                <div>
                    <label
                        htmlFor="password"
                        className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                        Password
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            placeholder="••••••••"
                            className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? (
                                <EyeOff className="w-5 h-5" />
                            ) : (
                                <Eye className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Signing in...</span>
                        </>
                    ) : (
                        <>
                            <LogIn className="w-5 h-5" />
                            <span>Sign In</span>
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}

function LoginFormFallback() {
    return (
        <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                Sign In
            </h2>
            <div className="space-y-5">
                <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                <div className="h-12 bg-emerald-100 rounded-lg animate-pulse" />
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4 overflow-hidden relative">

            {/* Background Animations */}
            <div className="absolute top-1/2 left-[5%] -translate-y-1/2 w-48 h-48 hidden lg:block opacity-80 hover:opacity-100 transition-opacity">
                <AnimatedChef />
            </div>
            <div className="absolute top-1/2 right-[5%] -translate-y-1/2 w-48 h-48 hidden lg:block opacity-80 hover:opacity-100 transition-opacity">
                <AnimatedGuest />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo and Title */}
                <div className="text-center mb-8">
                    <div className="flex justify-center items-center gap-4 mb-6">
                        <div className="w-20 h-20 lg:hidden hover:scale-105 transition-transform">
                            <AnimatedChef />
                        </div>
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-100 shadow-sm border border-emerald-200">
                            <Image
                                src="/hope-corner-logo-v2.svg"
                                alt="Hope's Corner"
                                width={48}
                                height={48}
                                className="w-12 h-12"
                            />
                        </div>
                        <div className="w-20 h-20 lg:hidden hover:scale-105 transition-transform">
                            <AnimatedGuest />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 font-heading">
                        Hope&apos;s Corner
                    </h1>
                    <p className="text-emerald-600 text-sm mt-1">
                        Guest Check-In System
                    </p>
                </div>

                {/* Login Form with Suspense */}
                <Suspense fallback={<LoginFormFallback />}>
                    <LoginForm />
                </Suspense>

                {/* Footer */}
                <p className="text-center text-sm text-gray-500 mt-6 font-medium">
                    Building community one meal and shower at a time
                </p>
            </div>
        </div>
    );
}
