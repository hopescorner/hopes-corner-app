export interface GenerateTicketImageOptions {
    ticketNumber: number;
    timeSlot: string;
    parentName: string;
    phone: string;
    city: string;
    qrCodeDataUrl?: string | null;
    childrenCount: number;
}

function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
) {
    if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        return;
    }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || typeof window.Image === 'undefined') {
            reject(new Error('Image constructor not available'));
            return;
        }
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = src;
        if (img.complete) {
            resolve(img);
        }
    });
}

export async function createTicketCanvas(
    options: GenerateTicketImageOptions
): Promise<HTMLCanvasElement | null> {
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 800, 1000);

    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, 30, 30, 740, 940, 24);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();

    ctx.save();
    drawRoundedRect(ctx, 30, 30, 740, 130, 24);
    ctx.clip();
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(30, 30, 740, 130);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("HOPE'S CORNER • HOLIDAY TOY & GIFT PROGRAM 2026", 400, 75);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Official Event Guest Ticket', 400, 115);
    ctx.restore();

    ctx.fillStyle = '#ecfdf5';
    drawRoundedRect(ctx, 70, 190, 660, 130, 20);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#a7f3d0';
    ctx.stroke();

    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('YOUR TICKET NUMBER', 400, 225);

    ctx.fillStyle = '#022c22';
    ctx.font = '900 64px -apple-system, BlinkMacSystemFont, monospace';
    ctx.fillText(`#${options.ticketNumber}`, 400, 292);

    ctx.fillStyle = '#047857';
    drawRoundedRect(ctx, 220, 340, 360, 48, 14);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(options.timeSlot, 400, 372);

    if (options.qrCodeDataUrl) {
        try {
            const qrImg = await loadImage(options.qrCodeDataUrl);
            ctx.fillStyle = '#ffffff';
            drawRoundedRect(ctx, 260, 415, 280, 280, 16);
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#cbd5e1';
            ctx.stroke();

            ctx.drawImage(qrImg, 280, 435, 240, 240);
        } catch {
            // Proceed without QR code image if load fails
        }
    }

    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SHOW THIS QR CODE AT CHECK-IN', 400, 722);

    ctx.beginPath();
    ctx.moveTo(80, 745);
    ctx.lineTo(720, 745);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(`Parent: ${options.parentName}`, 90, 780);
    ctx.fillText(`Phone: ${options.phone}`, 90, 810);

    ctx.textAlign = 'right';
    ctx.fillText(`City: ${options.city}`, 710, 780);
    ctx.fillText(`Children: ${options.childrenCount} Registered`, 710, 810);

    ctx.fillStyle = '#f1f5f9';
    drawRoundedRect(ctx, 70, 840, 660, 95, 14);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("Event Location: Hope's Corner • 748 Mercy St, Mountain View, CA", 400, 872);

    ctx.fillStyle = '#475569';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Please arrive 10 minutes before your assigned time slot with this ticket.', 400, 902);

    return canvas;
}

export async function downloadTicketImage(
    options: GenerateTicketImageOptions,
    flags?: { auto?: boolean }
): Promise<boolean> {
    try {
        const canvas = await createTicketCanvas(options);
        if (!canvas) return false;

        const fileName = `HopesCorner-Ticket-#${options.ticketNumber}.png`;

        if (!flags?.auto && typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && typeof canvas.toBlob === 'function') {
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
            if (blob && typeof File !== 'undefined') {
                const file = new File([blob], fileName, { type: 'image/png' });
                if (navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: `Hope's Corner Ticket #${options.ticketNumber}`,
                            text: `Ticket #${options.ticketNumber} for Hope's Corner Holiday Gift Program`,
                        });
                        return true;
                    } catch (err: unknown) {
                        if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
                            return true;
                        }
                    }
                }
            }
        }

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return true;
    } catch {
        return false;
    }
}

export async function downloadTicketPdf(
    options: GenerateTicketImageOptions
): Promise<boolean> {
    try {
        const canvas = await createTicketCanvas(options);
        if (!canvas) return false;

        const dataUrl = canvas.toDataURL('image/png');
        const { default: jsPDF } = await import('jspdf');

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a5',
        });

        pdf.addImage(dataUrl, 'PNG', 0, 0, 148, 210);
        pdf.save(`HopesCorner-Ticket-#${options.ticketNumber}.pdf`);
        return true;
    } catch {
        return false;
    }
}
