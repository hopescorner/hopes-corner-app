import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { auth } from '@/lib/auth/config';
import { canAccessRoute, getDefaultRoute, type UserRole } from '@/lib/auth/types';

export async function proxy(request: NextRequest) {
    // Update Supabase session
    const response = await updateSession(request);

    const pathname = request.nextUrl.pathname;

    // Public routes and API handlers manage their own auth behavior.
    const publicRoutes = ['/login', '/api', '/sw.js'];
    const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

    if (isPublicRoute) {
        return response;
    }

    // Get NextAuth session
    const session = await auth();

    // If no session and trying to access protected route, redirect to login
    if (!session) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Role-based access control
    const role = (session.user?.role as UserRole) || 'checkin';

    // Check if user can access this route
    if (!canAccessRoute(role, pathname)) {
        const defaultRoute = getDefaultRoute(role);
        return NextResponse.redirect(new URL(defaultRoute, request.url));
    }

    // If accessing root, redirect to default route for role
    if (pathname === '/') {
        const defaultRoute = getDefaultRoute(role);
        return NextResponse.redirect(new URL(defaultRoute, request.url));
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder static assets
         */
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|ico)$).*)',
    ],
};
