import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    createTicketCanvas,
    downloadTicketImage,
    downloadTicketPdf,
    GenerateTicketImageOptions,
} from '../ticketImage';

vi.mock('jspdf', () => {
    return {
        default: class MockJsPDF {
            addImage = vi.fn();
            save = vi.fn();
        },
    };
});

describe('ticketImage helper', () => {
    const defaultOptions: GenerateTicketImageOptions = {
        ticketNumber: 42,
        timeSlot: '09:00 AM - 09:20 AM',
        parentName: 'Jane Doe',
        phone: '(650) 555-0100',
        city: 'Mountain View',
        childrenCount: 2,
        qrCodeDataUrl: 'data:image/png;base64,mockqrcode',
    };

    const mockContext = {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        font: '',
        textAlign: '',
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arcTo: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        clip: vi.fn(),
        fillText: vi.fn(),
        drawImage: vi.fn(),
        roundRect: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockContext as unknown as CanvasRenderingContext2D);
        vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,mockpng');
        vi.spyOn(window, 'Image').mockImplementation(function (this: unknown) {
            const img = {
                src: '',
                crossOrigin: '',
                onload: null as (() => void) | null,
                onerror: null as (() => void) | null,
                complete: true,
            };
            setTimeout(() => {
                if (img.onload) img.onload();
            }, 0);
            return img as unknown as HTMLImageElement;
        });
    });

    it('creates a canvas with expected dimensions', async () => {
        const canvas = await createTicketCanvas(defaultOptions);
        if (canvas) {
            expect(canvas.width).toBe(800);
            expect(canvas.height).toBe(1000);
        }
    });

    it('prints the ticket in Spanish when the family registered in Spanish', async () => {
        await createTicketCanvas({ ...defaultOptions, language: 'es' });

        expect(mockContext.fillText).toHaveBeenCalledWith('SU NÚMERO DE BOLETO', 400, 225);
        expect(mockContext.fillText).toHaveBeenCalledWith('Boleto Oficial del Evento', 400, 115);
        expect(mockContext.fillText).toHaveBeenCalledWith('Padre/Tutor: Jane Doe', 90, 780);
        expect(mockContext.fillText).toHaveBeenCalledWith('Niños: 2 registrados', 710, 810);
        expect(mockContext.fillText).not.toHaveBeenCalledWith('YOUR TICKET NUMBER', 400, 225);
    });

    it('prints the ticket in Mandarin when the family registered in Mandarin', async () => {
        await createTicketCanvas({ ...defaultOptions, language: 'zh' });

        expect(mockContext.fillText).toHaveBeenCalledWith('您的票号', 400, 225);
        expect(mockContext.fillText).toHaveBeenCalledWith('官方活动入场凭证', 400, 115);
        expect(mockContext.fillText).toHaveBeenCalledWith('家长: Jane Doe', 90, 780);
    });

    it('handles downloadTicketImage via anchor click fallback', async () => {
        const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        const result = await downloadTicketImage(defaultOptions, { auto: true });
        expect(result).toBe(true);
        expect(clickSpy).toHaveBeenCalled();
        clickSpy.mockRestore();
    });

    it('uses a blob URL for automatic downloads when the browser supports it', async () => {
        const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

        const originalToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = vi.fn((callback: BlobCallback) => {
            callback(new Blob(['fake-png'], { type: 'image/png' }));
        }) as unknown as typeof HTMLCanvasElement.prototype.toBlob;

        const originalCreateObjectURL = (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
        const originalRevokeObjectURL = (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
        const createObjectURL = vi.fn(() => 'blob:mock-ticket');
        const revokeObjectURL = vi.fn();
        (URL as unknown as { createObjectURL: unknown }).createObjectURL = createObjectURL;
        (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = revokeObjectURL;

        const result = await downloadTicketImage(defaultOptions, { auto: true });

        expect(result).toBe(true);
        expect(createObjectURL).toHaveBeenCalled();
        expect(clickSpy).toHaveBeenCalled();

        HTMLCanvasElement.prototype.toBlob = originalToBlob;
        if (originalCreateObjectURL) {
            (URL as unknown as { createObjectURL: unknown }).createObjectURL = originalCreateObjectURL;
        } else {
            delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
        }
        if (originalRevokeObjectURL) {
            (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = originalRevokeObjectURL;
        } else {
            delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
        }
        clickSpy.mockRestore();
    });

    it('handles downloadTicketImage with native share if available and file shareable', async () => {
        const shareSpy = vi.fn().mockResolvedValue(undefined);
        const canShareSpy = vi.fn().mockReturnValue(true);

        const originalNavigator = global.navigator;
        Object.defineProperty(global, 'navigator', {
            value: {
                ...originalNavigator,
                share: shareSpy,
                canShare: canShareSpy,
            },
            configurable: true,
        });

        // Mock canvas.toBlob
        const originalToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
            callback(new Blob(['fake-png'], { type: 'image/png' }));
        });

        const result = await downloadTicketImage(defaultOptions, { auto: false });
        expect(result).toBe(true);
        expect(shareSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                title: expect.stringContaining('#42'),
            })
        );

        HTMLCanvasElement.prototype.toBlob = originalToBlob;
        Object.defineProperty(global, 'navigator', {
            value: originalNavigator,
            configurable: true,
        });
    });

    it('handles downloadTicketPdf successfully', async () => {
        const result = await downloadTicketPdf(defaultOptions);
        expect(result).toBe(true);
    });
});
