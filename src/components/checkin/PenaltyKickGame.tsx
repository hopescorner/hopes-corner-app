'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

// --- Types ---
type Phase = 'aim' | 'flying' | 'result';
type Outcome = 'goal' | 'saved' | 'post' | 'miss';

interface Keeper {
  x: number; // current x (goal-line plane)
  diveTarget: number; // dive destination x
  diveDir: -1 | 0 | 1;
  progress: number; // 0..1 dive animation progress
  delay: number; // frames before the dive starts (reaction time)
  diveFrames: number; // frames to fully extend
}

interface Flight {
  t: number; // frames elapsed
  duration: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  outcome: Outcome;
  spin: number; // visual ball rotation speed
}

interface LooseBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  size: number;
  gravity: number;
}

interface LevelParams {
  readProb: number; // chance the keeper reads the shot side/placement
  noise: number; // px error in the keeper's read of the target
  reactDelay: number; // frames before he starts moving
  diveFrames: number; // frames to fully extend
  reach: number; // max px he can cover from center
  saveR: number; // glove save radius
  sway: number; // idle sway amplitude (distraction)
  wobble: number; // aim reticle sway amplitude (nerves)
  chargeRate: number; // power meter oscillation speed
}

// --- Constants ---
const WIDTH = 360;
const HEIGHT = 540;

// Goal geometry (behind-the-ball view)
const POST_LEFT = 70;
const POST_RIGHT = 290;
const BAR_Y = 170;
const LINE_Y = 250;
const GOAL_CENTER_X = (POST_LEFT + POST_RIGHT) / 2;
const NET_DEPTH = 20; // visual depth of the net behind the frame

// Penalty spot + ball
const SPOT_X = GOAL_CENTER_X;
const SPOT_Y = 440;
const BALL_R = 11;

// Aim limits (deliberately larger than the goal so shots can miss)
const AIM_MIN_X = 30;
const AIM_MAX_X = WIDTH - 30;
const AIM_MIN_Y = 90;
const AIM_MAX_Y = 330;

// Keeper + shot tuning
const GLOVE_OFFSET = 6;
const POST_MARGIN = 12;
const RESULT_FRAMES = 78;
const MAX_LEVEL = 10;
const GOALS_PER_LEVEL = 2;

// Power meter
const POWER_MIN = 0.15;
const SWEET_LO = 0.55;
const SWEET_HI = 0.88;
const OVERHIT = 0.93;

// --- Helpers ---
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

/** Difficulty curve: level 1 (t=0) .. level 10 (t=1). */
function levelParams(level: number): LevelParams {
  const t = clamp(level - 1, 0, MAX_LEVEL - 1) / (MAX_LEVEL - 1);
  return {
    readProb: 0.52 + t * 0.34, // 0.52 → 0.86
    noise: 30 - t * 20, // 30 → 10 px
    reactDelay: Math.round(6 - t * 4), // 6 → 2 frames
    diveFrames: Math.round(18 - t * 6), // 18 → 12 frames
    reach: 84 + t * 12, // 84 → 96 px
    saveR: 22 + t * 6, // 22 → 28 px
    sway: 3 + t * 6, // idle sway grows (distraction)
    wobble: clamp(level - 1, 0, 9) * 0.7, // 0 → ~6.3 px aim sway
    chargeRate: 0.02 + t * 0.012, // meter oscillates faster at high level
  };
}

interface DivePlan {
  diveDir: -1 | 0 | 1;
  diveTarget: number;
}

/**
 * Computer goalkeeper. When he "reads" the shot he dives where the ball is
 * actually going (± noise); otherwise he guesses a side or stays home.
 * Timing is honest: saves are checked against where his gloves actually are
 * when the ball arrives, so a powerful shot into the corner beats him even
 * when he reads it — especially at low levels where his dive is slow.
 */
function planDive(shotX: number, params: LevelParams): DivePlan {
  const roll = Math.random();
  if (roll < params.readProb) {
    const read = shotX + (Math.random() * 2 - 1) * params.noise;
    const diveTarget = clamp(read, GOAL_CENTER_X - params.reach, GOAL_CENTER_X + params.reach);
    const dir = diveTarget < GOAL_CENTER_X - 8 ? -1 : diveTarget > GOAL_CENTER_X + 8 ? 1 : 0;
    return { diveDir: dir, diveTarget };
  }
  if (roll < params.readProb + (1 - params.readProb) * 0.6) {
    // Guesses a side (wrong one, since he didn't read it)
    const shotSide: -1 | 1 = shotX < GOAL_CENTER_X ? -1 : 1;
    const wrong = Math.random() < 0.75 ? (-shotSide as -1 | 1) : shotSide;
    return { diveDir: wrong, diveTarget: GOAL_CENTER_X + wrong * params.reach * 0.9 };
  }
  return { diveDir: 0, diveTarget: GOAL_CENTER_X + (Math.random() * 2 - 1) * 10 };
}

function classifyShot(x: number, y: number): Outcome {
  const inMouth =
    x > POST_LEFT + BALL_R &&
    x < POST_RIGHT - BALL_R &&
    y > BAR_Y + BALL_R &&
    y < LINE_Y;
  if (inMouth) return 'goal';
  const nearPost =
    Math.abs(x - POST_LEFT) < POST_MARGIN ||
    Math.abs(x - POST_RIGHT) < POST_MARGIN ||
    Math.abs(y - BAR_Y) < POST_MARGIN;
  if (nearPost) return 'post';
  return 'miss';
}

/** Keeper glove position at a given frame of the dive (easeInOutQuad). */
function gloveAt(
  frame: number,
  plan: DivePlan,
  params: LevelParams
): { x: number; y: number } {
  const p = clamp((frame - params.reactDelay) / params.diveFrames, 0, 1);
  const k = easeInOutQuad(p);
  return {
    x: GOAL_CENTER_X + (plan.diveTarget - GOAL_CENTER_X) * k + plan.diveDir * GLOVE_OFFSET * k,
    y: 208 - 18 * k,
  };
}

// --- Component ---
interface PenaltyKickGameProps {
  onClose: () => void;
  /** Backdrop dismiss grace period in ms (prevents accidental close from trigger taps). 0 = instant. */
  graceMs?: number;
}

export function PenaltyKickGame({ onClose, graceMs = 500 }: PenaltyKickGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const frameRef = useRef(0);
  const phaseRef = useRef<Phase>('aim');
  const aimRef = useRef({ x: GOAL_CENTER_X, y: (BAR_Y + LINE_Y) / 2 });
  const keeperRef = useRef<Keeper>({
    x: GOAL_CENTER_X,
    diveTarget: GOAL_CENTER_X,
    diveDir: 0,
    progress: 1,
    delay: 0,
    diveFrames: 18,
  });
  const flightRef = useRef<Flight | null>(null);
  const looseBallRef = useRef<LooseBall | null>(null);
  const resultRef = useRef<{ outcome: Outcome; t: number; toY: number } | null>(null);
  const goalsRef = useRef(0);
  const kicksRef = useRef(0);
  const streakRef = useRef(0);
  const levelRef = useRef(MAX_LEVEL); // keeper starts at max difficulty
  const powerRef = useRef<{ charging: boolean; value: number; dir: 1 | -1 }>({
    charging: false,
    value: 0.3,
    dir: 1,
  });
  const spaceHeldRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);
  const trailRef = useRef<Array<{ x: number; y: number; r: number }>>([]);
  const levelFlashRef = useRef<{ t: number; level: number } | null>(null);
  const shakeRef = useRef(0);
  const rippleRef = useRef(0);
  const cheerRef = useRef(0);
  const frameWobbleRef = useRef(0);
  const [canDismiss, setCanDismiss] = useState(graceMs <= 0);
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const spawnBurst = useCallback(
    (x: number, y: number, colors: string[], count: number, speed: number, gravity = 0.12) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const s = speed * (0.4 + Math.random() * 0.9);
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * s,
          vy: Math.sin(angle) * s - 1.2,
          color: colors[i % colors.length],
          life: 1.0,
          size: 2 + Math.random() * 3,
          gravity,
        });
      }
    },
    []
  );

  // After graceMs, allow backdrop dismiss (prevents momentum taps from the trigger)
  useEffect(() => {
    if (graceMs <= 0) return;
    const timer = setTimeout(() => setCanDismiss(true), graceMs);
    return () => clearTimeout(timer);
  }, [graceMs]);

  // Lock body scroll while the game is open — on mobile a swipe starting on
  // the backdrop would otherwise scroll the check-in page behind the modal.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Backdrop dismiss — only after grace period
  const safeClose = useCallback(() => {
    if (canDismiss) onClose();
  }, [canDismiss, onClose]);

  // Escape to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  /** Aim point including the level-based "nerves" sway at the current frame. */
  const effAim = useCallback(() => {
    const aim = aimRef.current;
    const { wobble } = levelParams(levelRef.current);
    const f = frameRef.current;
    return {
      x: clamp(
        aim.x + Math.sin(f * 0.09) * wobble + Math.sin(f * 0.023) * wobble * 0.6,
        AIM_MIN_X,
        AIM_MAX_X
      ),
      y: clamp(aim.y + Math.cos(f * 0.075) * wobble * 0.8, AIM_MIN_Y, AIM_MAX_Y),
    };
  }, []);

  const shoot = useCallback(
    (power: number) => {
      if (phaseRef.current !== 'aim') return;
      powerRef.current.charging = false;
      spaceHeldRef.current = false;

      const params = levelParams(levelRef.current);
      const target = effAim();

      // Power-driven inaccuracy: sweet zone is tight, overhitting balloons it
      let spread = 2 + power * power * 16;
      if (power > OVERHIT) spread += (power - OVERHIT) * 170;
      let tx = target.x + (Math.random() + Math.random() - 1) * spread;
      let ty = target.y + (Math.random() + Math.random() - 1) * spread;
      if (power > OVERHIT) ty -= Math.random() * (power - OVERHIT) * 260;
      tx = clamp(tx, 6, WIDTH - 6);
      ty = clamp(ty, 30, SPOT_Y - 30);

      let outcome = classifyShot(tx, ty);
      const plan = planDive(tx, params);
      const duration = Math.round(26 - power * 17); // 25 (weak) → 9 (full power)

      // Honest save check: where are the gloves when the ball arrives?
      if (outcome === 'goal') {
        const glove = gloveAt(duration, plan, params);
        if (Math.hypot(tx - glove.x, ty - glove.y) < params.saveR) {
          outcome = 'saved';
        }
      }

      keeperRef.current = {
        x: GOAL_CENTER_X,
        diveTarget: plan.diveTarget,
        diveDir: plan.diveDir,
        progress: 0,
        delay: params.reactDelay,
        diveFrames: params.diveFrames,
      };

      kicksRef.current += 1;
      if (outcome === 'goal') {
        goalsRef.current += 1;
        streakRef.current += 1;
        spawnBurst(tx, BAR_Y + 40, ['#22c55e', '#ffffff', '#fbbf24', '#38bdf8'], 46, 4);
        rippleRef.current = 44;
        cheerRef.current = 110;
        shakeRef.current = Math.max(shakeRef.current, 6);
        // Level up every GOALS_PER_LEVEL goals
        const newLevel = Math.min(MAX_LEVEL, 1 + Math.floor(goalsRef.current / GOALS_PER_LEVEL));
        if (newLevel > levelRef.current) {
          levelRef.current = newLevel;
          levelFlashRef.current = { t: 0, level: newLevel };
        }
      } else {
        streakRef.current = 0;
        if (outcome === 'saved') {
          const glove = gloveAt(duration, plan, params);
          spawnBurst(glove.x, glove.y, ['#38bdf8', '#e0f2fe', '#ffffff'], 22, 3, 0.08);
        } else if (outcome === 'post') {
          spawnBurst(tx, ty, ['#fbbf24', '#f97316', '#ffffff'], 24, 3.5, 0.1);
          frameWobbleRef.current = 34;
          shakeRef.current = Math.max(shakeRef.current, 8);
        } else {
          spawnBurst(tx, ty, ['#cbd5e1'], 10, 2, 0.08);
        }
      }

      flightRef.current = {
        t: 0,
        duration,
        fromX: SPOT_X,
        fromY: SPOT_Y,
        toX: tx,
        toY: ty,
        outcome,
        spin: (tx >= SPOT_X ? 1 : -1) * (0.15 + power * 0.25),
      };
      trailRef.current = [];
      phaseRef.current = 'flying';
    },
    [effAim, spawnBurst]
  );

  const startCharge = useCallback(() => {
    if (phaseRef.current !== 'aim') return;
    if (powerRef.current.charging) return;
    powerRef.current = { charging: true, value: 0.3, dir: 1 };
  }, []);

  const releaseCharge = useCallback(() => {
    if (!powerRef.current.charging) return;
    shoot(powerRef.current.value);
  }, [shoot]);

  /** Fixed-power shot for the Kick button / Enter key (sweet-zone power). */
  const quickShot = useCallback(() => {
    if (phaseRef.current !== 'aim' || powerRef.current.charging) return;
    shoot(0.62);
  }, [shoot]);

  // Keyboard: arrows/WASD aim, hold Space to charge + release to shoot, Enter = quick shot
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const aim = aimRef.current;
      const step = e.shiftKey ? 24 : 10;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        aim.x = clamp(aim.x - step, AIM_MIN_X, AIM_MAX_X);
        e.preventDefault();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        aim.x = clamp(aim.x + step, AIM_MIN_X, AIM_MAX_X);
        e.preventDefault();
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        aim.y = clamp(aim.y - step, AIM_MIN_Y, AIM_MAX_Y);
        e.preventDefault();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        aim.y = clamp(aim.y + step, AIM_MIN_Y, AIM_MAX_Y);
        e.preventDefault();
      } else if (e.key === ' ') {
        e.preventDefault();
        if (!e.repeat) {
          spaceHeldRef.current = true;
          startCharge();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (!e.repeat) quickShot();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        if (spaceHeldRef.current) {
          spaceHeldRef.current = false;
          releaseCharge();
        }
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [startCharge, releaseCharge, quickShot]);

  const canvasPos = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: ((e.clientX - rect.left) / rect.width) * WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Capture the pointer so a release outside the canvas still shoots
      // (common with touch drags that slide off the canvas edge).
      e.currentTarget.setPointerCapture?.(e.pointerId);
      const p = canvasPos(e);
      if (!p || phaseRef.current !== 'aim') return;
      aimRef.current = {
        x: clamp(p.x, AIM_MIN_X, AIM_MAX_X),
        y: clamp(p.y, AIM_MIN_Y, AIM_MAX_Y),
      };
      startCharge();
    },
    [canvasPos, startCharge]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      // Hover/drag aiming (touch only fires while pressed; desktop fires on hover)
      if (phaseRef.current !== 'aim') return;
      const p = canvasPos(e);
      if (!p) return;
      aimRef.current = {
        x: clamp(p.x, AIM_MIN_X, AIM_MAX_X),
        y: clamp(p.y, AIM_MIN_Y, AIM_MAX_Y),
      };
    },
    [canvasPos]
  );

  const handlePointerUp = useCallback(() => {
    releaseCharge();
  }, [releaseCharge]);

  // --- Main game loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crisp rendering on high-DPI screens (display size is controlled by CSS
    // so the canvas scales down on narrow phones; input mapping uses the
    // bounding rect, so it stays correct at any scale)
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    // Static gradients, hoisted out of the frame loop (allocating several
    // gradients per frame is a known drain on mobile GPUs)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 170);
    skyGrad.addColorStop(0, '#020617');
    skyGrad.addColorStop(1, '#172554');
    const boardGrad = ctx.createLinearGradient(0, 146, 0, 170);
    boardGrad.addColorStop(0, '#065f46');
    boardGrad.addColorStop(0.5, '#047857');
    boardGrad.addColorStop(1, '#064e3b');
    const pitchGrad = ctx.createLinearGradient(0, 170, 0, HEIGHT);
    pitchGrad.addColorStop(0, '#16a34a');
    pitchGrad.addColorStop(0.35, '#15803d');
    pitchGrad.addColorStop(1, '#14532d');
    const vigGrad = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, HEIGHT * 0.35, WIDTH / 2, HEIGHT / 2, HEIGHT * 0.75);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.35)');

    // Static crowd (generated once per mount) — two tiers with per-fan bob phase
    const crowd: Array<{ x: number; y: number; c: string; phase: number }> = [];
    const crowdColors = ['#f87171', '#fbbf24', '#60a5fa', '#f472b6', '#e2e8f0', '#34d399'];
    for (let tier = 0; tier < 2; tier++) {
      const baseY = tier === 0 ? 66 : 106;
      const rows = tier === 0 ? 3 : 4;
      for (let i = 0; i < 150; i++) {
        crowd.push({
          x: 6 + Math.random() * (WIDTH - 12),
          y: baseY + Math.random() * rows * 9,
          c: crowdColors[(i + tier * 3) % crowdColors.length],
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    // Stadium skyline silhouette (generated once)
    const skyline: Array<{ x: number; w: number; h: number }> = [];
    for (let x = 0; x < WIDTH; ) {
      const w = 18 + Math.random() * 30;
      skyline.push({ x, w, h: 14 + Math.random() * 26 });
      x += w + 4;
    }

    const drawKeeper = (kx: number, diveDir: -1 | 0 | 1, progress: number) => {
      const ky = LINE_Y;
      const e = easeInOutQuad(progress);
      const lean = diveDir * e * 16;
      const lift = Math.sin(e * Math.PI) * 10; // arcs upward mid-dive
      ctx.save();

      // Ground shadow (stays on the line)
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(kx - diveDir * e * 6, ky + 5, 16 + e * 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(kx, ky - lift);
      ctx.rotate(diveDir * e * 0.85);

      // Legs + boots
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(-7 - lean * 0.4, 0);
      ctx.moveTo(0, -22);
      ctx.lineTo(7 - lean * 0.4, 0);
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(-7 - lean * 0.4, 0, 3.5, 0, Math.PI * 2);
      ctx.arc(7 - lean * 0.4, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Torso (keeper jersey)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-9, -52, 18, 32, 6);
      ctx.fill();
      ctx.stroke();

      // Arms + gloves: spread wide, extending toward the dive side
      const spread = 14 + e * 18;
      const reachL = diveDir === 1 ? 6 : spread;
      const reachR = diveDir === -1 ? 6 : spread;
      const gloveLX = -6 - reachL - lean * 0.5;
      const gloveRX = 6 + reachR - lean * 0.5;
      const gloveY = -52 - e * 10;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-6, -46);
      ctx.lineTo(gloveLX, gloveY);
      ctx.moveTo(6, -46);
      ctx.lineTo(gloveRX, gloveY);
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(gloveLX, gloveY, 5.5, 0, Math.PI * 2);
      ctx.arc(gloveRX, gloveY, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Head
      ctx.fillStyle = '#fcd9b8';
      ctx.beginPath();
      ctx.arc(lean * 0.3, -60, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(lean * 0.3, -68, 8, Math.PI, 0);
      ctx.fill();

      ctx.restore();
    };

    const drawBall = (x: number, y: number, r: number, rot: number) => {
      // Ground shadow (fades/shrinks as the ball recedes)
      const shadowT = clamp(r / BALL_R, 0.5, 1);
      ctx.fillStyle = `rgba(0,0,0,${0.25 * shadowT})`;
      ctx.beginPath();
      ctx.ellipse(x, y + r + 3, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      // Ball body
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Patches
      ctx.fillStyle = '#1e293b';
      const pr = r * 0.22;
      ctx.beginPath();
      ctx.arc(0, 0, pr, 0, Math.PI * 2);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, pr * 0.8, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    };

    const loop = () => {
      frameRef.current += 1;
      const frame = frameRef.current;
      const phase = phaseRef.current;
      const keeper = keeperRef.current;
      const particles = particlesRef.current;
      const params = levelParams(levelRef.current);

      // --- Power meter oscillation ---
      const pw = powerRef.current;
      if (pw.charging && phase === 'aim') {
        pw.value += pw.dir * params.chargeRate;
        if (pw.value >= 1) {
          pw.value = 1;
          pw.dir = -1;
        } else if (pw.value <= POWER_MIN) {
          pw.value = POWER_MIN;
          pw.dir = 1;
        }
      }

      // --- Update ---
      let ballX = SPOT_X;
      let ballY = SPOT_Y;
      let ballScale = 1;
      let ballRot = 0;
      let ballVisible = true;

      if (phase === 'flying' && flightRef.current) {
        const f = flightRef.current;
        f.t += 1;
        const t = clamp(f.t / f.duration, 0, 1);
        const e = t * t * (3 - 2 * t); // smoothstep
        ballX = f.fromX + (f.toX - f.fromX) * e;
        ballY = f.fromY + (f.toY - f.fromY) * e;
        ballScale = 1 - t * 0.4;
        ballRot = f.spin * f.t;
        trailRef.current.push({ x: ballX, y: ballY, r: BALL_R * ballScale });
        if (trailRef.current.length > 7) trailRef.current.shift();
        if (f.t >= f.duration) {
          phaseRef.current = 'result';
          resultRef.current = { outcome: f.outcome, t: 0, toY: f.toY };
          flightRef.current = null;
          trailRef.current = [];
          // Loose-ball physics per outcome
          if (f.outcome === 'goal') {
            ballVisible = false;
            looseBallRef.current = null;
          } else if (f.outcome === 'post') {
            const reboundDir = f.toX >= GOAL_CENTER_X ? 1 : -1;
            looseBallRef.current = {
              x: f.toX,
              y: f.toY,
              vx: reboundDir * (1.5 + Math.random() * 2) * -1,
              vy: 1.5 + Math.random() * 1.5,
              scale: 0.6,
            };
          } else if (f.outcome === 'saved') {
            looseBallRef.current = {
              x: f.toX,
              y: f.toY,
              vx: -keeper.diveDir * (1 + Math.random() * 1.5) || (Math.random() - 0.5) * 2,
              vy: 2,
              scale: 0.6,
            };
          } else {
            // Miss: carries through, then drops
            looseBallRef.current = {
              x: f.toX,
              y: f.toY,
              vx: clamp((f.toX - f.fromX) / f.duration, -3, 3) * 0.5,
              vy: f.toY < BAR_Y ? -1.5 : 0,
              scale: 0.6,
            };
          }
        }
      } else if (phase === 'result' && resultRef.current) {
        const r = resultRef.current;
        r.t += 1;
        if (r.outcome === 'goal') {
          ballVisible = false;
        } else if (looseBallRef.current) {
          const lb = looseBallRef.current;
          lb.x += lb.vx;
          lb.y += lb.vy;
          lb.vy += 0.22;
          lb.vx *= 0.985;
          // Bounce toward the camera, then settle
          if (lb.y > SPOT_Y - 10 && lb.vy > 0) {
            lb.y = SPOT_Y - 10;
            lb.vy *= -0.45;
            lb.vx *= 0.7;
          }
          ballX = lb.x;
          ballY = lb.y;
          ballScale = lb.scale;
          ballRot = lb.x * 0.05;
        }
        if (r.t >= RESULT_FRAMES) {
          resultRef.current = null;
          looseBallRef.current = null;
          phaseRef.current = 'aim';
          keeperRef.current = {
            x: GOAL_CENTER_X,
            diveTarget: GOAL_CENTER_X,
            diveDir: 0,
            progress: 1,
            delay: 0,
            diveFrames: params.diveFrames,
          };
          ballVisible = true;
        }
      }

      // Keeper dive animation (delayed reaction, then ease in-out)
      if (phase === 'flying' || phase === 'result') {
        if (keeper.delay > 0) {
          keeper.delay -= 1;
        } else if (keeper.progress < 1) {
          keeper.progress = clamp(keeper.progress + 1 / keeper.diveFrames, 0, 1);
          const e = easeInOutQuad(keeper.progress);
          keeper.x = GOAL_CENTER_X + (keeper.diveTarget - GOAL_CENTER_X) * e;
        }
      } else {
        // Idle sway while aiming — grows with level to distract
        keeper.x = GOAL_CENTER_X + Math.sin(frame * 0.045) * params.sway;
      }

      // FX timers
      if (shakeRef.current > 0) shakeRef.current -= 1;
      if (rippleRef.current > 0) rippleRef.current -= 1;
      if (cheerRef.current > 0) cheerRef.current -= 1;
      if (frameWobbleRef.current > 0) frameWobbleRef.current -= 1;

      // ===================== DRAW =====================
      ctx.save();
      if (shakeRef.current > 0) {
        const s = (shakeRef.current / 10) * 3;
        ctx.translate((Math.random() - 0.5) * s * 2, (Math.random() - 0.5) * s * 2);
      }

      // Night sky
      ctx.fillStyle = skyGrad;
      ctx.fillRect(-8, -8, WIDTH + 16, 180);

      // Stars
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 24; i++) {
        const sx = (i * 97.3) % WIDTH;
        const sy = (i * 41.7) % 48;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(frame * 0.02 + i));
        ctx.globalAlpha = tw * 0.7;
        ctx.fillRect(sx, sy, 1.4, 1.4);
      }
      ctx.globalAlpha = 1;

      // Skyline silhouette
      ctx.fillStyle = '#0b1226';
      for (const b of skyline) {
        ctx.fillRect(b.x, 58 - b.h, b.w, b.h);
      }

      // Stadium roof over upper tier
      ctx.fillStyle = '#111c33';
      ctx.fillRect(0, 56, WIDTH, 10);
      ctx.fillStyle = '#0d1730';
      ctx.fillRect(0, 64, WIDTH, 3);

      // Floodlight pylons + glow + animated light cones
      for (const side of [0, 1] as const) {
        const px = side === 0 ? 40 : WIDTH - 40;
        ctx.fillStyle = '#334155';
        ctx.fillRect(px - 2, 10, 4, 48);
        // Lamp head
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(px - 16, 6, 32, 10, 3);
        ctx.fill();
        // Lamp bulbs
        ctx.fillStyle = '#fef08a';
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(px - 13 + i * 7.5, 8, 4, 6);
        }
        // Glow
        const glow = ctx.createRadialGradient(px, 12, 2, px, 12, 40);
        glow.addColorStop(0, 'rgba(254,240,138,0.5)');
        glow.addColorStop(1, 'rgba(254,240,138,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, 12, 40, 0, Math.PI * 2);
        ctx.fill();
        // Light cone
        const flicker = 0.05 + 0.015 * Math.sin(frame * 0.03 + side * 2);
        ctx.fillStyle = `rgba(255,255,220,${flicker})`;
        ctx.beginPath();
        ctx.moveTo(px - 14, 16);
        ctx.lineTo(side === 0 ? -10 : WIDTH + 10, 170);
        ctx.lineTo(side === 0 ? 130 : WIDTH - 130, 170);
        ctx.lineTo(px + 14, 16);
        ctx.fill();
      }

      // Crowd (two tiers, animated bob; big bounce while cheering)
      ctx.fillStyle = '#16213c';
      ctx.fillRect(0, 66, WIDTH, 34);
      ctx.fillStyle = '#1a2a4a';
      ctx.fillRect(0, 100, WIDTH, 46);
      const cheerAmp = cheerRef.current > 0 ? 2.2 : 0.7;
      for (const fan of crowd) {
        const bob = Math.abs(Math.sin(frame * 0.06 + fan.phase)) * cheerAmp;
        ctx.fillStyle = fan.c;
        ctx.globalAlpha = cheerRef.current > 0 ? 0.85 + 0.15 * Math.sin(frame * 0.2 + fan.phase) : 0.9;
        ctx.fillRect(fan.x, fan.y - bob, 3, 4);
      }
      ctx.globalAlpha = 1;

      // LED ad boards
      ctx.fillStyle = boardGrad;
      ctx.fillRect(0, 146, WIDTH, 24);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, 146, WIDTH, 3);
      ctx.fillStyle = '#ecfdf5';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 6;
      ctx.fillText("HOPE'S CORNER FC  ★  PENALTY SHOOTOUT", WIDTH / 2, 162);
      ctx.shadowBlur = 0;

      // Pitch
      ctx.fillStyle = pitchGrad;
      ctx.fillRect(-8, 170, WIDTH + 16, HEIGHT - 162);

      // Perspective mow stripes (converge toward the goal line)
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let i = 0; i < 4; i++) {
        const yTop = 190 + i * 82;
        const yBot = yTop + 41;
        const insetTop = 8 + i * 3;
        ctx.beginPath();
        ctx.moveTo(insetTop, yTop);
        ctx.lineTo(WIDTH - insetTop, yTop);
        ctx.lineTo(WIDTH, yBot);
        ctx.lineTo(0, yBot);
        ctx.closePath();
        ctx.fill();
      }

      // Penalty box lines (perspective)
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(60, 300);
      ctx.lineTo(40, 430);
      ctx.moveTo(300, 300);
      ctx.lineTo(320, 430);
      ctx.moveTo(40, 430);
      ctx.lineTo(320, 430);
      ctx.stroke();
      // Six-yard box
      ctx.beginPath();
      ctx.moveTo(120, 262);
      ctx.lineTo(112, 330);
      ctx.moveTo(240, 262);
      ctx.lineTo(248, 330);
      ctx.moveTo(112, 330);
      ctx.lineTo(248, 330);
      ctx.stroke();
      // Penalty arc
      ctx.beginPath();
      ctx.arc(SPOT_X, 432, 52, Math.PI * 1.18, Math.PI * 1.82);
      ctx.stroke();

      // Goal: back/side nets (depth), then frame
      const wob = frameWobbleRef.current > 0 ? Math.sin(frame * 0.9) * (frameWobbleRef.current / 34) * 3 : 0;
      ctx.save();
      ctx.translate(wob, 0);

      // Side net panels
      ctx.fillStyle = 'rgba(226,232,240,0.10)';
      ctx.beginPath();
      ctx.moveTo(POST_LEFT, BAR_Y);
      ctx.lineTo(POST_LEFT + 14, BAR_Y - NET_DEPTH);
      ctx.lineTo(POST_LEFT + 14, LINE_Y - NET_DEPTH);
      ctx.lineTo(POST_LEFT, LINE_Y);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(POST_RIGHT, BAR_Y);
      ctx.lineTo(POST_RIGHT - 14, BAR_Y - NET_DEPTH);
      ctx.lineTo(POST_RIGHT - 14, LINE_Y - NET_DEPTH);
      ctx.lineTo(POST_RIGHT, LINE_Y);
      ctx.closePath();
      ctx.fill();
      // Back net panel
      ctx.fillStyle = 'rgba(226,232,240,0.13)';
      ctx.fillRect(POST_LEFT + 14, BAR_Y - NET_DEPTH, POST_RIGHT - POST_LEFT - 28, LINE_Y - BAR_Y);
      // Back net mesh
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1;
      for (let nx = POST_LEFT + 14; nx <= POST_RIGHT - 14; nx += 11) {
        ctx.beginPath();
        ctx.moveTo(nx, BAR_Y - NET_DEPTH);
        ctx.lineTo(nx, LINE_Y - NET_DEPTH);
        ctx.stroke();
      }
      for (let ny = BAR_Y - NET_DEPTH; ny <= LINE_Y - NET_DEPTH; ny += 9) {
        ctx.beginPath();
        ctx.moveTo(POST_LEFT + 14, ny);
        ctx.lineTo(POST_RIGHT - 14, ny);
        ctx.stroke();
      }
      // Front net mesh (ripples on goal)
      const rippleAmp = (rippleRef.current / 44) * 5;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      for (let nx = POST_LEFT; nx <= POST_RIGHT; nx += 12) {
        ctx.beginPath();
        ctx.moveTo(nx, BAR_Y);
        for (let ny = BAR_Y; ny <= LINE_Y; ny += 8) {
          const dx = rippleAmp > 0.1 ? Math.sin(ny * 0.35 + frame * 0.5 + nx * 0.1) * rippleAmp * ((ny - BAR_Y) / (LINE_Y - BAR_Y)) : 0;
          ctx.lineTo(nx + dx, ny);
        }
        ctx.stroke();
      }
      for (let ny = BAR_Y; ny <= LINE_Y; ny += 10) {
        ctx.beginPath();
        ctx.moveTo(POST_LEFT, ny);
        ctx.lineTo(POST_RIGHT, ny);
        ctx.stroke();
      }
      // Frame with glow
      const postGrad = ctx.createLinearGradient(POST_LEFT, BAR_Y, POST_RIGHT, BAR_Y);
      postGrad.addColorStop(0, '#e2e8f0');
      postGrad.addColorStop(0.5, '#ffffff');
      postGrad.addColorStop(1, '#e2e8f0');
      ctx.strokeStyle = postGrad;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(POST_LEFT, LINE_Y + 4);
      ctx.lineTo(POST_LEFT, BAR_Y);
      ctx.lineTo(POST_RIGHT, BAR_Y);
      ctx.lineTo(POST_RIGHT, LINE_Y + 4);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Keeper
      drawKeeper(keeper.x, keeper.diveDir, phase === 'aim' ? 0 : keeper.progress);

      // Penalty spot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(SPOT_X, SPOT_Y + BALL_R + 4, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Aim guide + crosshair (aim phase only)
      if (phase === 'aim') {
        const aim = effAim();
        // Guide line
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(SPOT_X, SPOT_Y);
        ctx.lineTo(aim.x, aim.y);
        ctx.stroke();
        ctx.setLineDash([]);
        // Crosshair colored by current power zone while charging
        const power = pw.charging ? pw.value : 0;
        const chColor = !pw.charging
          ? '#fbbf24'
          : power > OVERHIT
            ? '#ef4444'
            : power >= SWEET_LO && power <= SWEET_HI
              ? '#22c55e'
              : '#fbbf24';
        ctx.strokeStyle = chColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = chColor;
        ctx.shadowBlur = 8;
        const cr = pw.charging ? 10 + Math.sin(frame * 0.3) * 2 : 10;
        ctx.beginPath();
        ctx.arc(aim.x, aim.y, cr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(aim.x - 15, aim.y);
        ctx.lineTo(aim.x + 15, aim.y);
        ctx.moveTo(aim.x, aim.y - 15);
        ctx.lineTo(aim.x, aim.y + 15);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Power meter (right edge)
        const mx = WIDTH - 28;
        const my = 356;
        const mh = 120;
        const mw = 14;
        ctx.fillStyle = 'rgba(2,6,23,0.75)';
        ctx.beginPath();
        ctx.roundRect(mx - 8, my - 24, mw + 16, mh + 34, 8);
        ctx.fill();
        // Zone track
        const zoneY = (v: number) => my + mh - v * mh;
        // Low zone (gray)
        ctx.fillStyle = 'rgba(148,163,184,0.35)';
        ctx.fillRect(mx, zoneY(SWEET_LO), mw, SWEET_LO * mh);
        // Sweet zone (green)
        ctx.fillStyle = 'rgba(34,197,94,0.55)';
        ctx.fillRect(mx, zoneY(SWEET_HI), mw, (SWEET_HI - SWEET_LO) * mh);
        // Amber zones
        ctx.fillStyle = 'rgba(251,191,36,0.45)';
        ctx.fillRect(mx, zoneY(OVERHIT), mw, (OVERHIT - SWEET_HI) * mh);
        // Overhit zone (red)
        ctx.fillStyle = 'rgba(239,68,68,0.55)';
        ctx.fillRect(mx, zoneY(1), mw, (1 - OVERHIT) * mh);
        // Fill to current power
        if (pw.charging) {
          const fillH = pw.value * mh;
          const fg = ctx.createLinearGradient(0, my + mh, 0, my);
          fg.addColorStop(0, '#22c55e');
          fg.addColorStop(0.8, '#fbbf24');
          fg.addColorStop(1, '#ef4444');
          ctx.fillStyle = fg;
          ctx.globalAlpha = 0.9;
          ctx.fillRect(mx, my + mh - fillH, mw, fillH);
          ctx.globalAlpha = 1;
          // Marker line
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(mx - 4, my + mh - fillH);
          ctx.lineTo(mx + mw + 4, my + mh - fillH);
          ctx.stroke();
        }
        // Track border
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(mx, my, mw, mh);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PWR', mx + mw / 2, my - 10);
      }

      // Ball trail (flight only)
      if (phase === 'flying') {
        const trail = trailRef.current;
        for (let i = 0; i < trail.length - 1; i++) {
          const tp = trail[i];
          ctx.globalAlpha = (i / trail.length) * 0.25;
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, tp.r * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Ball
      if (ballVisible) {
        drawBall(ballX, ballY, BALL_R * ballScale, ballRot);
      }

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.98;
        p.life -= 0.02;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Vignette
      ctx.fillStyle = vigGrad;
      ctx.fillRect(-8, -8, WIDTH + 16, HEIGHT + 16);

      // Result banner (pops in)
      if (phase === 'result' && resultRef.current) {
        const outcome = resultRef.current.outcome;
        const t = clamp(resultRef.current.t / 12, 0, 1);
        const pop = easeOutBack(t);
        const text =
          outcome === 'goal'
            ? 'GOAL!'
            : outcome === 'saved'
              ? 'SAVED!'
              : outcome === 'post'
                ? 'OFF THE POST!'
                : resultRef.current.toY < BAR_Y
                  ? 'OVER THE BAR!'
                  : 'WIDE!';
        const sub =
          outcome === 'goal'
            ? streakRef.current >= 3
              ? `${streakRef.current} in a row — unstoppable!`
              : 'What a finish!'
            : outcome === 'saved'
              ? 'The keeper read it…'
              : outcome === 'post'
                ? 'Inches away!'
                : 'That one stays row Z.';
        const color = outcome === 'goal' ? '#22c55e' : outcome === 'saved' ? '#38bdf8' : '#fbbf24';
        ctx.save();
        ctx.translate(WIDTH / 2, 362);
        ctx.scale(pop, pop);
        ctx.fillStyle = 'rgba(2,6,23,0.78)';
        ctx.beginPath();
        ctx.roundRect(-130, -34, 260, 68, 14);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.font = '900 32px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(text, 0, 4);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '600 12px system-ui, sans-serif';
        ctx.fillText(sub, 0, 24);
        ctx.restore();
      }

      // Level-up flash (top center)
      if (levelFlashRef.current) {
        const lf = levelFlashRef.current;
        lf.t += 1;
        const alpha = lf.t < 70 ? 1 : clamp(1 - (lf.t - 70) / 20, 0, 1);
        const pop = easeOutBack(clamp(lf.t / 10, 0, 1));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(WIDTH / 2, 210);
        ctx.scale(pop, pop);
        ctx.fillStyle = 'rgba(2,6,23,0.8)';
        ctx.beginPath();
        ctx.roundRect(-110, -18, 220, 36, 10);
        ctx.fill();
        ctx.fillStyle = '#f472b6';
        ctx.shadowColor = '#f472b6';
        ctx.shadowBlur = 10;
        ctx.font = '900 16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`LEVEL ${lf.level} — KEEPER GETS SHARPER`, 0, 6);
        ctx.restore();
        if (lf.t >= 92) levelFlashRef.current = null;
      }

      // Score HUD (bottom)
      ctx.fillStyle = 'rgba(2,6,23,0.85)';
      ctx.beginPath();
      ctx.roundRect(10, HEIGHT - 36, WIDTH - 20, 28, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = 'bold 13px "Courier New", Courier, monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#4ade80';
      ctx.fillText(`GOALS ${goalsRef.current}`, 22, HEIGHT - 17);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(`KICKS ${kicksRef.current}`, 118, HEIGHT - 17);
      ctx.fillStyle = '#f472b6';
      ctx.fillText(`LV ${levelRef.current}`, 208, HEIGHT - 17);
      ctx.textAlign = 'right';
      ctx.fillStyle = streakRef.current >= 3 ? '#fbbf24' : '#94a3b8';
      ctx.fillText(
        streakRef.current > 0 ? `STREAK x${streakRef.current}` : 'STREAK –',
        WIDTH - 22,
        HEIGHT - 17
      );

      ctx.restore(); // screen shake
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [effAim]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto p-2 select-none"
      data-testid="penalty-overlay"
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={safeClose}
        data-testid="penalty-backdrop"
      />

      {/* Game container */}
      <motion.div
        className="relative z-30 w-full max-w-[360px] my-auto rounded-2xl shadow-2xl overflow-hidden bg-slate-900 border border-slate-700"
        onContextMenu={(e) => e.preventDefault()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
      >
        {/* Close bar — large touch target for quick dismiss */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-800/80">
          <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">Penalty Kick</span>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 min-h-[44px] rounded-lg bg-red-600/80 hover:bg-red-500 active:bg-red-400 text-white text-xs font-semibold transition-colors touch-manipulation"
            aria-label="Close penalty game"
            data-testid="penalty-close"
          >
            <X size={14} />
            <span>{isTouchDevice ? 'Close' : 'ESC'}</span>
          </button>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block touch-none w-full h-auto"
          data-testid="penalty-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            powerRef.current.charging = false;
          }}
        />

        {/* Kick button + hint */}
        <div className="px-3 py-2 bg-slate-800/60 space-y-1.5">
          <button
            type="button"
            onClick={quickShot}
            className="w-full py-2.5 min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 text-white text-sm font-black tracking-widest uppercase transition-colors touch-manipulation"
            data-testid="penalty-kick"
          >
            Kick
          </button>
          <div className="text-center">
            <span className="text-[10px] text-slate-500">
              {isTouchDevice
                ? 'Hold & drag to aim, release to shoot — green zone is the sweet spot'
                : 'Move to aim · hold click or Space to charge, release to shoot · ESC to close'}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
