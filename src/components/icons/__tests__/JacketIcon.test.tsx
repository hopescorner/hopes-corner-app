import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { JacketIcon } from '../JacketIcon';

describe('JacketIcon', () => {
    it('renders an SVG with the jacket test id', () => {
        render(<JacketIcon />);
        const svg = screen.getByTestId('jacket-icon');
        expect(svg.tagName.toLowerCase()).toBe('svg');
        expect(svg.getAttribute('aria-hidden')).toBe('true');
    });

    it('uses default size of 24 when size is not provided', () => {
        render(<JacketIcon />);
        const svg = screen.getByTestId('jacket-icon');
        expect(svg.getAttribute('width')).toBe('24');
        expect(svg.getAttribute('height')).toBe('24');
    });

    it('applies custom size', () => {
        render(<JacketIcon size={32} />);
        const svg = screen.getByTestId('jacket-icon');
        expect(svg.getAttribute('width')).toBe('32');
        expect(svg.getAttribute('height')).toBe('32');
    });

    it('applies custom className', () => {
        render(<JacketIcon className="text-purple-600 mb-1" />);
        const svg = screen.getByTestId('jacket-icon');
        expect(svg.className.baseVal || svg.getAttribute('class')).toContain('text-purple-600');
        expect(svg.className.baseVal || svg.getAttribute('class')).toContain('mb-1');
    });

    it('uses default stroke width of 2', () => {
        render(<JacketIcon />);
        const svg = screen.getByTestId('jacket-icon');
        expect(svg.getAttribute('stroke-width') || svg.getAttribute('strokeWidth')).toBe('2');
    });

    it('applies custom strokeWidth', () => {
        render(<JacketIcon strokeWidth={1.5} />);
        const svg = screen.getByTestId('jacket-icon');
        expect(svg.getAttribute('stroke-width') || svg.getAttribute('strokeWidth')).toBe('1.5');
    });

    it('renders body silhouette, hood, drawstrings, and zipper paths', () => {
        const { container } = render(<JacketIcon />);
        const paths = container.querySelectorAll('path');
        // Body silhouette, hood outer, hood inner, left drawstring, right drawstring, zipper
        expect(paths.length).toBeGreaterThanOrEqual(6);
    });

    it('uses currentColor stroke so parent text color controls the icon', () => {
        render(<JacketIcon />);
        const svg = screen.getByTestId('jacket-icon');
        expect(svg.getAttribute('stroke')).toBe('currentColor');
        expect(svg.getAttribute('fill')).toBe('none');
    });
});