import QRCode from 'qrcode';

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
