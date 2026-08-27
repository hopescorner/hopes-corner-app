import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { HandshakeIcon } from '../HandshakeIcon';

describe('HandshakeIcon', () => {
    it('renders an SVG with the handshake test id', () => {
        render(<HandshakeIcon />);
        const svg = screen.getByTestId('handshake-icon');
        expect(svg.tagName.toLowerCase()).toBe('svg');
        expect(svg.getAttribute('aria-hidden')).toBe('true');
    });

    it('uses default size of 24 when size is not provided', () => {
        render(<HandshakeIcon />);
        const svg = screen.getByTestId('handshake-icon');
        expect(svg.getAttribute('width')).toBe('24');
        expect(svg.getAttribute('height')).toBe('24');
    });

    it('applies custom size', () => {
        render(<HandshakeIcon size={32} />);
        const svg = screen.getByTestId('handshake-icon');
        expect(svg.getAttribute('width')).toBe('32');
        expect(svg.getAttribute('height')).toBe('32');
    });

    it('applies custom className', () => {
        render(<HandshakeIcon className="text-indigo-600" />);
        const svg = screen.getByTestId('handshake-icon');
        expect(svg.className.baseVal || svg.getAttribute('class')).toContain('text-indigo-600');
    });

    it('uses the 512 viewBox from the source glyph', () => {
        render(<HandshakeIcon />);
        const svg = screen.getByTestId('handshake-icon');
        expect(svg.getAttribute('viewBox')).toBe('0 0 512 512');
    });

    it('uses currentColor fill so parent text color controls the icon', () => {
        render(<HandshakeIcon />);
        const svg = screen.getByTestId('handshake-icon');
        expect(svg.getAttribute('fill')).toBe('currentColor');
    });

    it('renders the three handshake glyph paths (hands + two cuffs)', () => {
        const { container } = render(<HandshakeIcon />);
        const paths = container.querySelectorAll('path');
        expect(paths.length).toBe(3);
    });

    it('accepts aria-hidden prop without crashing', () => {
        render(<HandshakeIcon aria-hidden={true} />);
        const svg = screen.getByTestId('handshake-icon');
        expect(svg).toBeDefined();
    });
});