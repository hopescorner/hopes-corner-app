import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PenaltyKickGame } from '../PenaltyKickGame';

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

describe('PenaltyKickGame', () => {
  let onClose: () => void;

  beforeEach(() => {
    onClose = vi.fn();
    // Simulate desktop environment — jsdom registers ontouchstart by default
    delete (window as any).ontouchstart;
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true });
  });

  it('renders the penalty overlay with canvas', () => {
    render(<PenaltyKickGame onClose={onClose} graceMs={0} />);
    expect(screen.getByTestId('penalty-overlay')).toBeDefined();
    expect(screen.getByTestId('penalty-canvas')).toBeDefined();
  });

  it('renders title text', () => {
    render(<PenaltyKickGame onClose={onClose} graceMs={0} />);
    expect(screen.getByText('Penalty Kick')).toBeDefined();
  });

  it('renders a kick button', () => {
    render(<PenaltyKickGame onClose={onClose} graceMs={0} />);
    expect(screen.getByTestId('penalty-kick')).toBeDefined();
  });

  it('calls onClose when Escape key is pressed', () => {
    render(<PenaltyKickGame onClose={onClose} graceMs={0} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked after grace period', () => {
    render(<PenaltyKickGame onClose={onClose} graceMs={0} />);
    fireEvent.click(screen.getByTestId('penalty-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked (always, no grace period)', () => {
    render(<PenaltyKickGame onClose={onClose} graceMs={0} />);
    fireEvent.click(screen.getByTestId('penalty-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has accessible close button label', () => {
    render(<PenaltyKickGame onClose={onClose} graceMs={0} />);
    expect(screen.getByLabelText('Close penalty game')).toBeDefined();
  });

  it('renders controls hint text for desktop', () => {
    render(<PenaltyKickGame onClose={onClose} graceMs={0} />);
    expect(screen.getByText(/to shoot/)).toBeDefined();
  });

  it('ignores backdrop clicks during the grace period', () => {
    // Large graceMs means canDismiss stays false
    render(<PenaltyKickGame onClose={onClose} graceMs={99999} />);
    fireEvent.click(screen.getByTestId('penalty-backdrop'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not dismiss when kicking (kick button is not a close path)', () => {
    render(<PenaltyKickGame onClose={onClose} graceMs={0} />);
    fireEvent.click(screen.getByTestId('penalty-kick'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
