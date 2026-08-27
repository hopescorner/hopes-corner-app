import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import MainLayout from '@/components/layouts/MainLayout';
import NextAuthProvider from '@/components/providers/NextAuthProvider';
import { ProtectedOverlays } from '@/components/providers/ProtectedOverlays';

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (!session) {
        redirect('/login');
    }

    return (
        <NextAuthProvider session={session}>
            <MainLayout>{children}</MainLayout>
            <ProtectedOverlays />
        </NextAuthProvider>
    );
}
