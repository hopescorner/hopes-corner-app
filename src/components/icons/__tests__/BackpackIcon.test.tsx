import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BackpackIcon } from '../BackpackIcon';

describe('BackpackIcon', () => {
    it('uses a bold default stroke matching lucide icons for prominence', () => {
        render(<BackpackIcon />);
        const svg = screen.getByTestId('backpack-icon');
        expect(svg.getAttribute('stroke-width') || svg.getAttribute('strokeWidth')).toBe('2');
    });
});
