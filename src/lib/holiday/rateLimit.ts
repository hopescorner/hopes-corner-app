import { createHmac } from 'node:crypto';

/**
 * Hash a client IP for the durable holiday rate limiter. The scope keeps
 * registration, lookup, and duplicate checks in separate buckets.
 */
export function hashHolidayClientIp(ip: string, scope: string): string {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error('AUTH_SECRET or NEXTAUTH_SECRET is not configured');
    return createHmac('sha256', secret).update(`${scope}:${ip}`).digest('hex');
}

export function getHolidayClientIp(headers: Headers): string {
    return (
        headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        headers.get('x-real-ip') ||
        'unknown-client'
    );
}
