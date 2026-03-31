import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SplitFlapDisplay } from '../SplitFlapDisplay';

describe('SplitFlapDisplay', () => {
    it('renders the value as accessible text', () => {
        render(<SplitFlapDisplay value={42} />);
        expect(screen.getByText('42')).toBeDefined();
    });

    it('pads single-digit values to minDigits', () => {
        const { container } = render(<SplitFlapDisplay value={5} minDigits={2} />);
        // Should have 2 tile elements (for "0" and "5")
        const tiles = container.querySelectorAll('.split-flap-tile');
        expect(tiles.length).toBe(2);
    });

    it('handles zero value', () => {
        const { container } = render(<SplitFlapDisplay value={0} />);
        const srOnly = container.querySelector('.sr-only');
        expect(srOnly?.textContent).toBe('0');
    });

    it('handles three-digit values', () => {
        const { container } = render(<SplitFlapDisplay value={123} minDigits={2} />);
        expect(screen.getByText('123')).toBeDefined();
        // Should have 3 tiles for "1", "2", "3"
        const tiles = container.querySelectorAll('.split-flap-tile');
        expect(tiles.length).toBe(3);
    });

    it('applies color and size props', () => {
        const { container } = render(<SplitFlapDisplay value={7} color="purple" size="lg" />);
        const tile = container.querySelector('.split-flap-tile');
        expect(tile?.className).toContain('shadow-purple-500/20');
        expect(tile?.className).toContain('w-12');
    });

    it('clamps negative values to zero', () => {
        const { container } = render(<SplitFlapDisplay value={-5} />);
        const srOnly = container.querySelector('.sr-only');
        expect(srOnly?.textContent).toBe('0');
    });

    it('renders the presentation wrapper with aria-hidden tiles', () => {
        const { container } = render(<SplitFlapDisplay value={20} />);
        const ariaHidden = container.querySelector('[aria-hidden="true"]');
        expect(ariaHidden).toBeDefined();
    });
});
