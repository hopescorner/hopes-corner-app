import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PenaltyKickGame, planDive, zoneIndexForShot, zoneCenterForIndex, hottestZone } from '../PenaltyKickGame';

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

describe('keeper learning (adaptive difficulty)', () => {
  const params = {
    readProb: 1,
    noise: 0,
    reactDelay: 1,
    diveFrames: 10,
    reach: 100,
    saveR: 32,
    sway: 9,
    wobble: 6.3,
    chargeRate: 0.032,
  };

  it('maps shots to goal-mouth columns', () => {
    expect(zoneIndexForShot(70)).toBe(0); // at the left post
    expect(zoneIndexForShot(290)).toBe(3); // at the right post
    expect(zoneIndexForShot(180)).toBe(2); // dead center falls in column 2
  });

  it('returns null until a repeated pattern emerges', () => {
    expect(hottestZone([])).toBeNull();
    expect(hottestZone([{ x: 100, y: 210 }])).toBeNull();
    // Scattered shots across columns: no hot zone
    const scattered = [80, 140, 200, 260, 100].map((x) => ({ x, y: 210 }));
    expect(hottestZone(scattered)).toBeNull();
  });

  it('flags the repeatedly targeted column with growing probability', () => {
    const repeated = Array.from({ length: 5 }, () => ({ x: 250, y: 200 }));
    const heat = hottestZone(repeated);
    expect(heat).not.toBeNull();
    expect(heat!.shots).toBe(5);
    expect(heat!.p).toBeGreaterThanOrEqual(0.3);
    expect(heat!.x).toBeCloseTo(zoneCenterForIndex(3).x, 5);
  });

  it('camps the hot column when anticipating (p = 1)', () => {
    const heat = hottestZone(Array.from({ length: 6 }, () => ({ x: 250, y: 200 })))!;
    const plan = planDive(100, params, { ...heat, p: 1 });
    expect(plan.anticipated).toBe(true);
    // Dive target camps the hot column (col 3 center ≈ 262), not the shot at x=100
    expect(plan.diveTarget).toBeGreaterThan(200);
  });

  it('reads the shot honestly when there is nothing to anticipate (p = 0)', () => {
    const plan = planDive(200, params, { x: 262.5, y: 210, shots: 5, p: 0 });
    expect(plan.anticipated).toBe(false);
    // readProb 1 + zero noise: dives exactly where the ball goes
    expect(plan.diveTarget).toBe(200);
  });
});
