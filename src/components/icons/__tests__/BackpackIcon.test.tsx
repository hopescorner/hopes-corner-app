import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BackpackIcon } from '../BackpackIcon';

describe('BackpackIcon', () => {
    it('uses a thinner default stroke so the straps stay readable', () => {
        render(<BackpackIcon />);
        const svg = screen.getByTestId('backpack-icon');
        expect(svg.getAttribute('stroke-width') || svg.getAttribute('strokeWidth')).toBe('0.5');
    });
});
