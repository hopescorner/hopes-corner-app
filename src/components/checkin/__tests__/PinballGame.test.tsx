import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PinballGame } from '../PinballGame';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react X icon
vi.mock('lucide-react', () => ({
  X: (props: any) => <svg data-testid="x-icon" {...props} />,
}));

describe('PinballGame', () => {
  let onClose: () => void;

  beforeEach(() => {
    onClose = vi.fn();
    // Simulate desktop environment — jsdom registers ontouchstart by default
    delete (window as any).ontouchstart;
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true });
  });

  it('renders the pinball overlay with canvas', () => {
    render(<PinballGame onClose={onClose} graceMs={0} />);
    expect(screen.getByTestId('pinball-overlay')).toBeDefined();
    expect(screen.getByTestId('pinball-canvas')).toBeDefined();
  });

  it('renders title text', () => {
    render(<PinballGame onClose={onClose} graceMs={0} />);
    expect(screen.getByText('Pinball')).toBeDefined();
  });

  it('calls onClose when Escape key is pressed', () => {
    render(<PinballGame onClose={onClose} graceMs={0} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked after grace period', () => {
    render(<PinballGame onClose={onClose} graceMs={0} />);
    fireEvent.click(screen.getByTestId('pinball-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked (always, no grace period)', () => {
    render(<PinballGame onClose={onClose} graceMs={0} />);
    fireEvent.click(screen.getByTestId('pinball-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has accessible close button label', () => {
    render(<PinballGame onClose={onClose} graceMs={0} />);
    expect(screen.getByLabelText('Close pinball game')).toBeDefined();
  });

  it('renders controls hint text for desktop', () => {
    render(<PinballGame onClose={onClose} graceMs={0} />);
    expect(screen.getByText(/to flip/)).toBeDefined();
  });

  it('ignores backdrop clicks during the grace period', () => {
    // Large graceMs means canDismiss stays false
    render(<PinballGame onClose={onClose} graceMs={99999} />);
    fireEvent.click(screen.getByTestId('pinball-backdrop'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
