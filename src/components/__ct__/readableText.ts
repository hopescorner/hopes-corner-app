import { expect, type Locator } from '@playwright/test';

/** Check actual browser colors and ancestor opacity, including Tailwind's OKLCH colors. */
export async function expectReadableText(locator: Locator) {
    const result = await locator.evaluate((element) => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const context = canvas.getContext('2d')!;
        const rgba = (color: string) => {
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
            return Array.from(context.getImageData(0, 0, 1, 1).data);
        };
        let opacity = 1;
        const layers: number[][] = [];
        for (let node: Element | null = element; node; node = node.parentElement) {
            const style = getComputedStyle(node);
            opacity *= Number(style.opacity);
            layers.push(rgba(style.backgroundColor));
        }
        let background = [255, 255, 255];
        for (const layer of layers.reverse()) {
            const alpha = layer[3] / 255;
            background = background.map((channel, index) => layer[index] * alpha + channel * (1 - alpha));
        }
        const color = rgba(getComputedStyle(element).color);
        const alpha = color[3] / 255;
        const foreground = background.map((channel, index) => color[index] * alpha + channel * (1 - alpha));
        const luminance = (rgb: number[]) => rgb.map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
        const light = luminance(foreground), dark = luminance(background);
        return { opacity, contrast: (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05) };
    });
    expect(result.opacity, 'Text must not be washed out by a card fade').toBe(1);
    expect(result.contrast, 'Text contrast must be at least 4.5:1').toBeGreaterThanOrEqual(4.5);
}
