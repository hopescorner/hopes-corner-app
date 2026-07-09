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

    it('uses default stroke width of 2', () => {
        render(<SleepingBagIcon />);
        const svg = screen.getByTestId('sleeping-bag-icon');
        expect(svg.getAttribute('stroke-width') || svg.getAttribute('strokeWidth')).toBe('2');
    });

    it('applies custom strokeWidth', () => {
        render(<SleepingBagIcon strokeWidth={1.5} />);
        const svg = screen.getByTestId('sleeping-bag-icon');
        expect(svg.getAttribute('stroke-width') || svg.getAttribute('strokeWidth')).toBe('1.5');
    });

    it('includes bag body, hood opening, and zipper paths', () => {
        const { container } = render(<SleepingBagIcon />);
        const paths = container.querySelectorAll('path');
        // Body, hood, zipper, and three zipper pulls
        expect(paths.length).toBeGreaterThanOrEqual(5);
    });

    it('uses currentColor stroke so parent text color controls the icon', () => {
        render(<SleepingBagIcon />);
        const svg = screen.getByTestId('sleeping-bag-icon');
        expect(svg.getAttribute('stroke')).toBe('currentColor');
        expect(svg.getAttribute('fill')).toBe('none');
    });
});
