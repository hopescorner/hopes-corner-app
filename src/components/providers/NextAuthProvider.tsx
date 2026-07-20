'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';

export default function NextAuthProvider({
    children,
    session,
}: {
    children: React.ReactNode;
    session?: Session | null;
}) {
    return (
        <SessionProvider session={session} refetchOnWindowFocus={false} refetchInterval={0}>
            {children}
        </SessionProvider>
    );
}
