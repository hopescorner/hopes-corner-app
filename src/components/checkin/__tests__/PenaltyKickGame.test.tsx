import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PenaltyKickGame, planDive, zoneIndexForShot, zoneCenterForIndex, hottestZone, levelParams } from '../PenaltyKickGame';

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

  it('ignores saved and missed shots when building heat', () => {
    const savedShots = Array.from({ length: 6 }, () => ({ x: 250, y: 200, outcome: 'saved' as const }));
    expect(hottestZone(savedShots)).toBeNull();
    const mixed = [
      ...Array.from({ length: 3 }, () => ({ x: 250, y: 200, outcome: 'goal' as const })),
      ...Array.from({ length: 6 }, () => ({ x: 100, y: 200, outcome: 'saved' as const })),
    ];
    const heat = hottestZone(mixed)!;
    expect(heat).not.toBeNull();
    expect(heat.shots).toBe(3);
    expect(heat.x).toBeCloseTo(zoneCenterForIndex(3).x, 5);
  });

  it('camps the hot column when anticipating (p = 1)', () => {
    const heat = hottestZone(Array.from({ length: 6 }, () => ({ x: 250, y: 200 })))!;
    const plan = planDive(250, params, { ...heat, p: 1 });
    expect(plan.anticipated).toBe(true);
    expect(plan.diveTarget).toBeGreaterThan(200);
  });

  it('falls back to an honest read when the shot goes away from the hot column', () => {
    const heat = hottestZone(Array.from({ length: 6 }, () => ({ x: 250, y: 200 })))!;
    const plan = planDive(100, params, { ...heat, p: 1 });
    expect(plan.anticipated).toBe(false);
    expect(plan.diveTarget).toBe(100);
  });

  it('reads the shot honestly when there is nothing to anticipate (p = 0)', () => {
    const plan = planDive(200, params, { x: 262.5, y: 210, shots: 5, p: 0 });
    expect(plan.anticipated).toBe(false);
    expect(plan.diveTarget).toBe(200);
  });

  it('maps 2D shots across rows and columns', () => {
    expect(zoneIndexForShot(80, 180)).toBe(0);
    expect(zoneIndexForShot(280, 180)).toBe(3);
    expect(zoneIndexForShot(80, 240)).toBe(4);
    expect(zoneIndexForShot(280, 240)).toBe(7);
  });

  it('scales keeper parameters to lockdown mode on streak >= 1', () => {
    const normal = levelParams(5, 0);
    const lockdown = levelParams(5, 1);
    expect(lockdown.readProb).toBeGreaterThan(normal.readProb);
    expect(lockdown.reach).toBeGreaterThan(normal.reach);
    expect(lockdown.saveR).toBeGreaterThan(normal.saveR);
    expect(lockdown.reactDelay).toBe(0);
    expect(lockdown.diveFrames).toBeLessThan(normal.diveFrames);
  });

  it('anticipates side switch after scoring on streak >= 1', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const plan = planDive(100, params, null, {
      streak: 1,
      lastGoalSide: 1,
      postGoalSwitchRatio: 0.8,
    });
    randomSpy.mockRestore();
    expect(plan.anticipated).toBe(true);
    expect(plan.diveDir).toBe(-1);
    expect(plan.diveTarget).toBeLessThan(180);
  });

  it('anticipates side repeat when user history favors repeating', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const plan = planDive(260, params, null, {
      streak: 1,
      lastGoalSide: 1,
      postGoalSwitchRatio: 0.2,
    });
    randomSpy.mockRestore();
    expect(plan.anticipated).toBe(true);
    expect(plan.diveDir).toBe(1);
    expect(plan.diveTarget).toBeGreaterThan(180);
  });

  it('reads the shot when the lockdown roll fires during a streak', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const plan = planDive(100, params, null, {
      streak: 3,
      lastGoalSide: 1,
      postGoalSwitchRatio: 0.8,
    });
    randomSpy.mockRestore();
    expect(plan.anticipated).toBe(false);
    expect(plan.diveTarget).toBe(100);
    expect(plan.diveDir).toBe(-1);
  });

  it('reads the shot directly when a streak exists but no last goal side is known', () => {
    const plan = planDive(240, params, null, { streak: 2 });
    expect(plan.anticipated).toBe(false);
    expect(plan.diveTarget).toBe(240);
  });

  it('escalates shot-reading as the streak grows', () => {
    const readsFor = (streak: number) => {
      const randomSpy = vi.spyOn(Math, 'random');
      let reads = 0;
      for (let i = 0; i < 200; i++) {
        randomSpy.mockReturnValueOnce(i / 200);
        const plan = planDive(100, params, null, {
          streak,
          lastGoalSide: 1,
          postGoalSwitchRatio: 0.8,
        });
        if (!plan.anticipated) reads++;
      }
      randomSpy.mockRestore();
      return reads;
    };
    const readsAtStreak1 = readsFor(1);
    const readsAtStreak4 = readsFor(4);
    expect(readsAtStreak1).toBeGreaterThan(50);
    expect(readsAtStreak1).toBeLessThan(130);
    expect(readsAtStreak4).toBeGreaterThan(165);
  });
});

