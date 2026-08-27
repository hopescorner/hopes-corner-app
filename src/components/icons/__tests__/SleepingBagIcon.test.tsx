import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SleepingBagIcon } from '../SleepingBagIcon';

describe('SleepingBagIcon', () => {
    it('renders an SVG with the sleeping bag test id', () => {
        render(<SleepingBagIcon />);
        const svg = screen.getByTestId('sleeping-bag-icon');
        expect(svg.tagName.toLowerCase()).toBe('svg');
        expect(svg.getAttribute('aria-hidden')).toBe('true');
    });

    it('uses default size of 24 when size is not provided', () => {
        render(<SleepingBagIcon />);
        const svg = screen.getByTestId('sleeping-bag-icon');
        expect(svg.getAttribute('width')).toBe('24');
        expect(svg.getAttribute('height')).toBe('24');
    });

    it('applies custom size', () => {
        render(<SleepingBagIcon size={32} />);
        const svg = screen.getByTestId('sleeping-bag-icon');
        expect(svg.getAttribute('width')).toBe('32');
        expect(svg.getAttribute('height')).toBe('32');
    });

    it('applies custom className', () => {
        render(<SleepingBagIcon className="text-purple-600 mb-1" />);
        const svg = screen.getByTestId('sleeping-bag-icon');
        expect(svg.className.baseVal || svg.getAttribute('class')).toContain('text-purple-600');
        expect(svg.className.baseVal || svg.getAttribute('class')).toContain('mb-1');
    });

    it('uses the 512x512 viewBox from the upstream silhouette', () => {
        render(<SleepingBagIcon />);
        const svg = screen.getByTestId('sleeping-bag-icon');
        expect(svg.getAttribute('viewBox')).toBe('0 0 512 512');
    });

    it('renders the sleeping bag silhouette path', () => {
        const { container } = render(<SleepingBagIcon />);
        const paths = container.querySelectorAll('path');
        expect(paths.length).toBeGreaterThanOrEqual(1);
    });

    it('uses currentColor fill so parent text color controls the icon', () => {
        render(<SleepingBagIcon />);
        const svg = screen.getByTestId('sleeping-bag-icon');
        expect(svg.getAttribute('fill')).toBe('currentColor');
    });
});