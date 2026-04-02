// User roles for the application
export type UserRole = 'admin' | 'staff' | 'board' | 'checkin' | 'bicycle';

// User type extending NextAuth user
export interface AppUser {
    id: string;
    email: string;
    name: string;
    role: UserRole;
}

// Session user type
export interface SessionUser extends AppUser {
    accessToken?: string;
}

// Role-based access configuration
export const ROLE_ACCESS = {
    admin: ['check-in', 'services', 'dashboard'],
    staff: ['check-in', 'services', 'dashboard'],
    board: ['dashboard'],
    checkin: ['check-in'],
    bicycle: ['check-in', 'services'],
} as const;

// Infer role from email prefix (matching current app behavior)
export function inferRole(email: string | null | undefined): UserRole {
    const base = (email || '').toLowerCase();
    if (base.startsWith('admin')) return 'admin';
    if (base.startsWith('board')) return 'board';
    if (base.startsWith('checkin')) return 'checkin';
    if (base.startsWith('bicycle')) return 'bicycle';
    return 'staff';
}

// Check if a role can access a specific route
export function canAccessRoute(role: UserRole, route: string): boolean {
    const allowedRoutes = ROLE_ACCESS[role];
    return allowedRoutes.some((r) => route.startsWith(`/${r}`));
}

// Get the default route for a role
export function getDefaultRoute(role: UserRole): string {
    if (role === 'board') return '/dashboard';
    if (role === 'checkin') return '/check-in';
    return '/check-in';
}

// Get role display label
export function getRoleLabel(role: UserRole): string {
    switch (role) {
        case 'admin':
            return 'Admin';
        case 'board':
            return 'Board (read-only)';
        case 'staff':
            return 'Staff';
        case 'checkin':
            return 'Check-in';
        case 'bicycle':
            return 'Bicycle';
        default:
            return role;
    }
}
