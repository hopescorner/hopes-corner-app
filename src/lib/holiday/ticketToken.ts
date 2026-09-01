import { createHmac, timingSafeEqual } from 'node:crypto';
import QRCode from 'qrcode';

export interface HolidayTicketPayload {
    v: 1;
    id: string;
    ticketNumber: number;
    eventYear: number;
    parentName: string;
    timeSlot: string;
    childrenCount: number;
    iat: number;
}

function getSecretKey(): string {
    return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'hopes-corner-holiday-token-secret-2026';
}

export function generateHolidayTicketToken(payload: {
    id: string;
    ticketNumber: number;
    eventYear: number;
    parentName: string;
    timeSlot: string;
    childrenCount: number;
}): string {
    const fullPayload: HolidayTicketPayload = {
        v: 1,
        id: payload.id,
        ticketNumber: payload.ticketNumber,
        eventYear: payload.eventYear,
        parentName: payload.parentName,
        timeSlot: payload.timeSlot,
        childrenCount: payload.childrenCount,
        iat: Math.floor(Date.now() / 1000),
    };
    const jsonStr = JSON.stringify(fullPayload);
    const encodedPayload = Buffer.from(jsonStr, 'utf-8').toString('base64url');
    const secret = getSecretKey();
    const signature = createHmac('sha256', secret).update(encodedPayload).digest('hex');
    return `HCT1.${encodedPayload}.${signature}`;
}

export function verifyHolidayTicketToken(token: string): { valid: true; payload: HolidayTicketPayload } | { valid: false; error: string } {
    if (!token || typeof token !== 'string') {
        return { valid: false, error: 'Empty or invalid token format' };
    }
    const parts = token.trim().split('.');
    if (parts.length !== 3 || parts[0] !== 'HCT1') {
        return { valid: false, error: 'Invalid ticket header' };
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
        const payload = JSON.parse(decoded) as HolidayTicketPayload;
        if (!payload.id || !payload.ticketNumber) {
            return { valid: false, error: 'Malformed token payload' };
        }
        return { valid: true, payload };
    } catch {
        return { valid: false, error: 'Failed to decode payload' };
    }
}

export async function generateTicketQRCodeDataUrl(token: string): Promise<string> {
    return QRCode.toDataURL(token, {
        width: 320,
        margin: 1.5,
        color: {
            dark: '#064e3b',
            light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
    });
}
