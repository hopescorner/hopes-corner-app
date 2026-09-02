import { createHmac, timingSafeEqual } from 'node:crypto';
import QRCode from 'qrcode';
import { HolidayAgeGroup } from '@/types/holiday';

export interface HolidayShopperChild {
    id: string;
    age: number;
    ageGroup: HolidayAgeGroup;
    gender?: string;
}

export interface HolidayShopperPayload {
    v: 1;
    ticketNumber: number;
    timeSlot: string;
    children: HolidayShopperChild[];
    iat: number;
}

function getSecretKey(): string {
    return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'hopes-corner-holiday-token-secret-2026';
}

export function generateHolidayShopperToken(payload: {
    ticketNumber: number;
    timeSlot: string;
    children: HolidayShopperChild[];
}): string {
    const fullPayload: HolidayShopperPayload = {
        v: 1,
        ticketNumber: payload.ticketNumber,
        timeSlot: payload.timeSlot,
        children: payload.children.map((c) => ({
            id: c.id,
            age: c.age,
            ageGroup: c.ageGroup,
            ...(c.gender ? { gender: c.gender } : {}),
        })),
        iat: Math.floor(Date.now() / 1000),
    };
    const jsonStr = JSON.stringify(fullPayload);
    const encodedPayload = Buffer.from(jsonStr, 'utf-8').toString('base64url');
    const secret = getSecretKey();
    const signature = createHmac('sha256', secret).update(encodedPayload).digest('hex');
    return `HCS1.${encodedPayload}.${signature}`;
}

export function verifyHolidayShopperToken(
    token: string
): { valid: true; payload: HolidayShopperPayload } | { valid: false; error: string } {
    if (!token || typeof token !== 'string') {
        return { valid: false, error: 'Empty or invalid token format' };
    }
    const parts = token.trim().split('.');
    if (parts.length !== 3 || parts[0] !== 'HCS1') {
        return { valid: false, error: 'Invalid shopper token header' };
    }
    const [, encodedPayload, providedSignature] = parts;
    const secret = getSecretKey();
    const expectedSignature = createHmac('sha256', secret).update(encodedPayload).digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
    const providedBuf = Buffer.from(providedSignature, 'utf-8');
    if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
        return { valid: false, error: 'Invalid signature - token has been tampered with' };
    }

    try {
        const decoded = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
        const payload = JSON.parse(decoded) as HolidayShopperPayload;
        if (!payload.ticketNumber || !Array.isArray(payload.children)) {
            return { valid: false, error: 'Malformed shopper token payload' };
        }
        return { valid: true, payload };
    } catch {
        return { valid: false, error: 'Failed to decode shopper payload' };
    }
}

export async function generateShopperQRCodeDataUrl(shopperUrl: string): Promise<string> {
    return QRCode.toDataURL(shopperUrl, {
        width: 320,
        margin: 1.5,
        color: {
            dark: '#064e3b',
            light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
    });
}
