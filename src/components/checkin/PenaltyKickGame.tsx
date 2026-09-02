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
}

interface Flight {
  t: number; // frames elapsed
  duration: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  outcome: Outcome;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  size: number;
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

// Penalty spot + ball
const SPOT_X = GOAL_CENTER_X;
const SPOT_Y = 440;
const BALL_R = 11;

// Aim limits (deliberately larger than the goal so shots can miss)
const AIM_MIN_X = 30;
const AIM_MAX_X = WIDTH - 30;
const AIM_MIN_Y = 90;
const AIM_MAX_Y = 330;

// Flight + keeper tuning
const FLIGHT_FRAMES = 26;
const KEEPER_DELAY = 7;
const KEEPER_DIVE_FRAMES = 18;
const KEEPER_REACH = 75;
const GLOVE_OFFSET = 12;
const SAVE_RADIUS = 30;
const POST_MARGIN = 12;
const RESULT_FRAMES = 70;

// --- Helpers ---
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

interface DivePlan {
  diveDir: -1 | 0 | 1;
  diveTarget: number;
}

/** Computer goalkeeper: guesses a side, usually (but not always) the shot side. */
function planDive(shotX: number): DivePlan {
  const shotSide: -1 | 0 | 1 =
    shotX < GOAL_CENTER_X - 30 ? -1 : shotX > GOAL_CENTER_X + 30 ? 1 : 0;
  const roll = Math.random();
  let diveDir: -1 | 0 | 1;
  if (roll < 0.55) {
    diveDir = shotSide; // reads the shot
  } else if (roll < 0.8) {
    // guesses wrong
    diveDir = shotSide === -1 ? 1 : shotSide === 1 ? -1 : Math.random() < 0.5 ? -1 : 1;
  } else {
    diveDir = 0; // stays home
  }
  const weak = Math.random() < 0.1; // occasional slow reaction
  const distance = diveDir === 0 ? 0 : KEEPER_REACH * (weak ? 0.55 : 1);
  return { diveDir, diveTarget: GOAL_CENTER_X + diveDir * distance };
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

// --- Component ---
interface PenaltyKickGameProps {
  onClose: () => void;
  /** Backdrop dismiss grace period in ms (prevents accidental close from trigger taps). 0 = instant. */
  graceMs?: number;
}

export function PenaltyKickGame({ onClose, graceMs = 500 }: PenaltyKickGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const phaseRef = useRef<Phase>('aim');
  const aimRef = useRef({ x: GOAL_CENTER_X, y: (BAR_Y + LINE_Y) / 2 });
  const keeperRef = useRef<Keeper>({
    x: GOAL_CENTER_X,
    diveTarget: GOAL_CENTER_X,
    diveDir: 0,
    progress: 1,
    delay: 0,
  });
  const flightRef = useRef<Flight | null>(null);
  const resultRef = useRef<{ outcome: Outcome; t: number } | null>(null);
  const goalsRef = useRef(0);
  const kicksRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [canDismiss, setCanDismiss] = useState(graceMs <= 0);
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const spawnConfetti = useCallback((x: number, y: number) => {
    const colors = ['#22c55e', '#ffffff', '#fbbf24', '#38bdf8'];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        color: colors[i % colors.length],
        life: 1.0,
        size: 2 + Math.random() * 3,
      });
    }
  }, []);

  // After graceMs, allow backdrop dismiss (prevents momentum taps from the trigger)
  useEffect(() => {
    if (graceMs <= 0) return;
    const timer = setTimeout(() => setCanDismiss(true), graceMs);
    return () => clearTimeout(timer);
  }, [graceMs]);

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

  const shoot = useCallback(() => {
    if (phaseRef.current !== 'aim') return;
    const aim = aimRef.current;
    let outcome = classifyShot(aim.x, aim.y);

    // Keeper dive plan
    const { diveDir, diveTarget } = planDive(aim.x);
    keeperRef.current = {
      x: GOAL_CENTER_X,
      diveTarget,
      diveDir,
      progress: 0,
      delay: KEEPER_DELAY,
    };

    // Save check: glove covers the crossing point at arrival
    if (outcome === 'goal') {
      const gloveX = diveTarget + diveDir * GLOVE_OFFSET;
      const dx = aim.x - gloveX;
      const dy = aim.y - 205;
      if (Math.sqrt(dx * dx + dy * dy) < SAVE_RADIUS) {
        outcome = 'saved';
      }
    }

    kicksRef.current += 1;
    if (outcome === 'goal') {
      goalsRef.current += 1;
      spawnConfetti(aim.x, BAR_Y + 40);
    }

    flightRef.current = {
      t: 0,
      duration: FLIGHT_FRAMES,
      fromX: SPOT_X,
      fromY: SPOT_Y,
      toX: aim.x,
      toY: aim.y,
      outcome,
    };
    phaseRef.current = 'flying';
  }, [spawnConfetti]);

  // Keyboard: arrows/WASD aim, Space/Enter shoots
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
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        shoot();
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [shoot]);

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
      const p = canvasPos(e);
      if (!p || phaseRef.current !== 'aim') return;
      aimRef.current = {
        x: clamp(p.x, AIM_MIN_X, AIM_MAX_X),
        y: clamp(p.y, AIM_MIN_Y, AIM_MAX_Y),
      };
      dragRef.current = { x: p.x, y: p.y };
    },
    [canvasPos]
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

  // Tap (no drag) shoots; drag only re-aims
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = dragRef.current;
      dragRef.current = null;
      if (!start || phaseRef.current !== 'aim') return;
      const p = canvasPos(e);
      if (!p) return;
      const moved = Math.hypot(p.x - start.x, p.y - start.y);
      if (moved < 12) shoot();
    },
    [canvasPos, shoot]
  );

  // --- Drawing helpers (defined inside loop effect via refs where stateful) ---

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Static crowd dots (generated once per mount)
    const crowd: Array<{ x: number; y: number; c: string }> = [];
    const crowdColors = ['#f87171', '#fbbf24', '#60a5fa', '#f472b6', '#e2e8f0', '#34d399'];
    for (let i = 0; i < 220; i++) {
      crowd.push({
        x: Math.random() * WIDTH,
        y: 96 + Math.random() * 52,
        c: crowdColors[i % crowdColors.length],
      });
    }

    const drawKeeper = (kx: number, diveDir: -1 | 0 | 1, progress: number) => {
      const ky = LINE_Y;
      const lean = diveDir * progress * 14; // body tilt while diving
      ctx.save();
      ctx.translate(kx, ky);
      ctx.rotate(diveDir * progress * 0.5);

      // Legs
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(-7 - lean * 0.4, 0);
      ctx.moveTo(0, -22);
      ctx.lineTo(7 - lean * 0.4, 0);
      ctx.stroke();

      // Torso (keeper jersey)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-9, -52, 18, 32, 6);
      ctx.fill();
      ctx.stroke();

      // Arms + gloves: spread wide, extending toward the dive side
      const spread = 14 + progress * 16;
      const reachL = diveDir === 1 ? 6 : spread;
      const reachR = diveDir === -1 ? 6 : spread;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-6, -46);
      ctx.lineTo(-6 - reachL - lean * 0.5, -52 - progress * 8);
      ctx.moveTo(6, -46);
      ctx.lineTo(6 + reachR - lean * 0.5, -52 - progress * 8);
      ctx.stroke();
      // Gloves
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(-6 - reachL - lean * 0.5, -52 - progress * 8, 5, 0, Math.PI * 2);
      ctx.arc(6 + reachR - lean * 0.5, -52 - progress * 8, 5, 0, Math.PI * 2);
      ctx.fill();

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

    const drawBall = (x: number, y: number, r: number) => {
      // Ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(x, y + r + 3, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Ball body
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Patches
      ctx.fillStyle = '#1e293b';
      const pr = r * 0.22;
      ctx.beginPath();
      ctx.arc(x, y, pr, 0, Math.PI * 2);
      ctx.arc(x - r * 0.45, y - r * 0.3, pr * 0.8, 0, Math.PI * 2);
      ctx.arc(x + r * 0.45, y - r * 0.3, pr * 0.8, 0, Math.PI * 2);
      ctx.arc(x - r * 0.3, y + r * 0.4, pr * 0.8, 0, Math.PI * 2);
      ctx.arc(x + r * 0.3, y + r * 0.4, pr * 0.8, 0, Math.PI * 2);
      ctx.fill();
    };

    const loop = () => {
      const phase = phaseRef.current;
      const keeper = keeperRef.current;
      const particles = particlesRef.current;

      // --- Update ---
      let ballX = SPOT_X;
      let ballY = SPOT_Y;
      let ballScale = 1;
      let ballVisible = true;

      if (phase === 'flying' && flightRef.current) {
        const f = flightRef.current;
        f.t += 1;
        const t = clamp(f.t / f.duration, 0, 1);
        const e = t * t * (3 - 2 * t); // smoothstep
        ballX = f.fromX + (f.toX - f.fromX) * e;
        ballY = f.fromY + (f.toY - f.fromY) * e;
        ballScale = 1 - t * 0.4;
        if (f.t >= f.duration) {
          phaseRef.current = 'result';
          resultRef.current = { outcome: f.outcome, t: 0 };
          flightRef.current = null;
          // Keeper holds the dive pose; hide ball into the net on goals
          if (f.outcome === 'goal') ballVisible = false;
        }
      } else if (phase === 'result' && resultRef.current) {
        const r = resultRef.current;
        r.t += 1;
        if (r.outcome === 'goal') {
          ballVisible = false;
        } else {
          // Saved/missed ball stays where it ended
          ballX = aimRef.current.x;
          ballY = aimRef.current.y;
          ballScale = 0.6;
        }
        if (r.t >= RESULT_FRAMES) {
          resultRef.current = null;
          phaseRef.current = 'aim';
          keeperRef.current = {
            x: GOAL_CENTER_X,
            diveTarget: GOAL_CENTER_X,
            diveDir: 0,
            progress: 1,
            delay: 0,
          };
          ballVisible = true;
        }
      }

      // Keeper dive animation (delayed reaction, then ease out)
      if (phase === 'flying' || phase === 'result') {
        if (keeper.delay > 0) {
          keeper.delay -= 1;
        } else if (keeper.progress < 1) {
          keeper.progress = clamp(keeper.progress + 1 / KEEPER_DIVE_FRAMES, 0, 1);
          const e = easeOutCubic(keeper.progress);
          keeper.x = GOAL_CENTER_X + (keeper.diveTarget - GOAL_CENTER_X) * e;
        }
      } else {
        // Idle sway while aiming
        keeper.x = GOAL_CENTER_X + Math.sin(Date.now() / 500) * 4;
      }

      // --- Draw ---
      // Night sky
      const sky = ctx.createLinearGradient(0, 0, 0, 170);
      sky.addColorStop(0, '#020617');
      sky.addColorStop(1, '#0f172a');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, WIDTH, 170);

      // Floodlights
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(28, 18, 26, 10);
      ctx.fillRect(WIDTH - 54, 18, 26, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.moveTo(28, 28);
      ctx.lineTo(0, 170);
      ctx.lineTo(120, 170);
      ctx.lineTo(54, 28);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(WIDTH - 28, 28);
      ctx.lineTo(WIDTH, 170);
      ctx.lineTo(WIDTH - 120, 170);
      ctx.lineTo(WIDTH - 54, 28);
      ctx.fill();

      // Stands + crowd
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 92, WIDTH, 60);
      for (const fan of crowd) {
        ctx.fillStyle = fan.c;
        ctx.fillRect(fan.x, fan.y, 3, 4);
      }

      // Ad boards
      ctx.fillStyle = '#047857';
      ctx.fillRect(0, 152, WIDTH, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("HOPE'S CORNER FC  ★  PENALTY SHOOTOUT", WIDTH / 2, 165);

      // Pitch
      const pitch = ctx.createLinearGradient(0, 170, 0, HEIGHT);
      pitch.addColorStop(0, '#15803d');
      pitch.addColorStop(1, '#14532d');
      ctx.fillStyle = pitch;
      ctx.fillRect(0, 170, WIDTH, HEIGHT - 170);
      // Mow stripes
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(0, 190 + i * 72, WIDTH, 36);
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

      // Goal: net + frame
      ctx.fillStyle = 'rgba(226,232,240,0.16)';
      ctx.fillRect(POST_LEFT, BAR_Y, POST_RIGHT - POST_LEFT, LINE_Y - BAR_Y);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      for (let nx = POST_LEFT; nx <= POST_RIGHT; nx += 12) {
        ctx.beginPath();
        ctx.moveTo(nx, BAR_Y);
        ctx.lineTo(nx, LINE_Y);
        ctx.stroke();
      }
      for (let ny = BAR_Y; ny <= LINE_Y; ny += 10) {
        ctx.beginPath();
        ctx.moveTo(POST_LEFT, ny);
        ctx.lineTo(POST_RIGHT, ny);
        ctx.stroke();
      }
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(POST_LEFT, LINE_Y + 4);
      ctx.lineTo(POST_LEFT, BAR_Y);
      ctx.lineTo(POST_RIGHT, BAR_Y);
      ctx.lineTo(POST_RIGHT, LINE_Y + 4);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Keeper
      drawKeeper(keeper.x, keeper.diveDir, phase === 'aim' ? 0 : easeOutCubic(keeper.progress));

      // Penalty spot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(SPOT_X, SPOT_Y + BALL_R + 4, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Aim crosshair + guide (aim phase only)
      if (phaseRef.current === 'aim') {
        const aim = aimRef.current;
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(SPOT_X, SPOT_Y);
        ctx.lineTo(aim.x, aim.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(aim.x, aim.y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(aim.x - 15, aim.y);
        ctx.lineTo(aim.x + 15, aim.y);
        ctx.moveTo(aim.x, aim.y - 15);
        ctx.lineTo(aim.x, aim.y + 15);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Ball
      if (ballVisible) {
        drawBall(ballX, ballY, BALL_R * ballScale);
      }

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
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

      // Result banner
      if (phaseRef.current === 'result' && resultRef.current) {
        const outcome = resultRef.current.outcome;
        const text =
          outcome === 'goal' ? 'GOAL!' : outcome === 'saved' ? 'SAVED!' : outcome === 'post' ? 'OFF THE POST!' : aimRef.current.y < BAR_Y ? 'OVER THE BAR!' : 'WIDE!';
        const color =
          outcome === 'goal' ? '#22c55e' : outcome === 'saved' ? '#38bdf8' : '#fbbf24';
        ctx.fillStyle = 'rgba(2,6,23,0.72)';
        const bw = 250;
        ctx.beginPath();
        ctx.roundRect(WIDTH / 2 - bw / 2, 330, bw, 64, 14);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.font = 'black 34px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(text, WIDTH / 2, 368);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '600 13px system-ui, sans-serif';
        ctx.fillText(
          outcome === 'goal' ? 'What a finish!' : 'Line up the next one…',
          WIDTH / 2,
          386
        );
      }

      // Score HUD
      ctx.fillStyle = 'rgba(2,6,23,0.85)';
      ctx.beginPath();
      ctx.roundRect(10, HEIGHT - 34, WIDTH - 20, 26, 8);
      ctx.fill();
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 14px "Courier New", Courier, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`GOALS: ${goalsRef.current}`, 22, HEIGHT - 16);
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'right';
      ctx.fillText(`KICKS: ${kicksRef.current}`, WIDTH - 22, HEIGHT - 16);

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
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
        className="relative z-30 rounded-2xl shadow-2xl overflow-hidden bg-slate-900 border border-slate-700"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-500 active:bg-red-400 text-white text-xs font-semibold transition-colors"
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
          className="block touch-none"
          data-testid="penalty-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        />

        {/* Kick button + hint */}
        <div className="px-3 py-2 bg-slate-800/60 space-y-1.5">
          <button
            type="button"
            onClick={shoot}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 text-white text-sm font-black tracking-widest uppercase transition-colors"
            data-testid="penalty-kick"
          >
            Kick
          </button>
          <div className="text-center">
            <span className="text-[10px] text-slate-500">
              {isTouchDevice
                ? 'Drag to aim · tap or KICK to shoot'
                : 'Move to aim · click or Space to shoot · ESC to close'}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
