'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

// --- Types ---
interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

interface Bumper {
  x: number;
  y: number;
  r: number;
  flash: number; // animation timer (decrements per frame)
}

interface Flipper {
  x: number;
  y: number;
  length: number;
  angle: number;
  targetAngle: number;
  side: 'left' | 'right';
}

// --- Constants ---
const WIDTH = 320;
const HEIGHT = 520;
const GRAVITY = 0.15;
const BALL_RADIUS = 8;
const FLIPPER_LENGTH = 55;
const FLIPPER_REST_LEFT = Math.PI / 6; // 30° down
const FLIPPER_REST_RIGHT = Math.PI - Math.PI / 6;
const FLIPPER_UP_LEFT = -Math.PI / 4; // 45° up
const FLIPPER_UP_RIGHT = Math.PI + Math.PI / 4;
const FLIPPER_SPEED = 0.3;
const BUMPER_BOUNCE = 6;
const WALL_LEFT = 20;
const WALL_RIGHT = WIDTH - 20;
const DRAIN_Y = HEIGHT - 30;

// --- Helpers ---
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function createBumpers(): Bumper[] {
  return [
    { x: 100, y: 150, r: 18, flash: 0 },
    { x: 220, y: 150, r: 18, flash: 0 },
    { x: 160, y: 220, r: 22, flash: 0 },
    { x: 80, y: 290, r: 16, flash: 0 },
    { x: 240, y: 290, r: 16, flash: 0 },
  ];
}

function createFlippers(): [Flipper, Flipper] {
  return [
    { x: 95, y: DRAIN_Y - 20, length: FLIPPER_LENGTH, angle: FLIPPER_REST_LEFT, targetAngle: FLIPPER_REST_LEFT, side: 'left' },
    { x: 225, y: DRAIN_Y - 20, length: FLIPPER_LENGTH, angle: FLIPPER_REST_RIGHT, targetAngle: FLIPPER_REST_RIGHT, side: 'right' },
  ];
}

function resetBall(): Ball {
  // Drop from center-top with slight random drift so it bounces through bumpers
  return {
    x: WIDTH / 2 + (Math.random() - 0.5) * 80,
    y: 30,
    vx: (Math.random() - 0.5) * 2,
    vy: 2,
    r: BALL_RADIUS,
  };
}

// --- Component ---
interface PinballGameProps {
  onClose: () => void;
  /** Backdrop dismiss grace period in ms (prevents accidental close from trigger taps). 0 = instant. */
  graceMs?: number;
}

export function PinballGame({ onClose, graceMs = 500 }: PinballGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const touchRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const ballRef = useRef<Ball>(resetBall());
  const bumpersRef = useRef<Bumper[]>(createBumpers());
  const flippersRef = useRef<[Flipper, Flipper]>(createFlippers());
  const scoreRef = useRef(0);
  const ballsLeftRef = useRef(3);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [canDismiss, setCanDismiss] = useState(graceMs <= 0);
  const [leftActive, setLeftActive] = useState(false);
  const [rightActive, setRightActive] = useState(false);
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

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

  // Keyboard input for flippers
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'z', 'Z', '/', 'Slash'].includes(e.key)) {
        keysRef.current.add(e.key);
      }
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // Touch input — full-overlay side zones for iPad/mobile
  const handleSideTouchStart = useCallback((side: 'left' | 'right') => {
    touchRef.current[side] = true;
    if (side === 'left') setLeftActive(true);
    else setRightActive(true);
  }, []);

  const handleSideTouchEnd = useCallback((side: 'left' | 'right') => {
    touchRef.current[side] = false;
    if (side === 'left') setLeftActive(false);
    else setRightActive(false);
  }, []);

  // Restart game
  const restartGame = useCallback(() => {
    scoreRef.current = 0;
    ballsLeftRef.current = 3;
    ballRef.current = resetBall();
    bumpersRef.current = createBumpers();
    flippersRef.current = createFlippers();
    setFinalScore(0);
    setGameOver(false);
  }, []);

  // Main game loop
  useEffect(() => {
    if (gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const ball = ballRef.current;
      const bumpers = bumpersRef.current;
      const flippers = flippersRef.current;
      const keys = keysRef.current;
      const touch = touchRef.current;

      // --- Input ---
      const leftActive = keys.has('ArrowLeft') || keys.has('z') || keys.has('Z') || touch.left;
      const rightActive = keys.has('ArrowRight') || keys.has('/') || keys.has('Slash') || touch.right;

      flippers[0].targetAngle = leftActive ? FLIPPER_UP_LEFT : FLIPPER_REST_LEFT;
      flippers[1].targetAngle = rightActive ? FLIPPER_UP_RIGHT : FLIPPER_REST_RIGHT;

      // --- Update flippers ---
      for (const f of flippers) {
        const diff = f.targetAngle - f.angle;
        if (Math.abs(diff) < FLIPPER_SPEED) {
          f.angle = f.targetAngle;
        } else {
          f.angle += Math.sign(diff) * FLIPPER_SPEED;
        }
      }

      // --- Physics ---
      ball.vy += GRAVITY;
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Wall collisions
      if (ball.x - ball.r < WALL_LEFT) {
        ball.x = WALL_LEFT + ball.r;
        ball.vx = Math.abs(ball.vx) * 0.8;
      }
      if (ball.x + ball.r > WALL_RIGHT) {
        ball.x = WALL_RIGHT - ball.r;
        ball.vx = -Math.abs(ball.vx) * 0.8;
      }
      // Top wall
      if (ball.y - ball.r < 10) {
        ball.y = 10 + ball.r;
        ball.vy = Math.abs(ball.vy) * 0.8;
      }

      // Guide wall collisions (angled walls that funnel ball toward flippers)
      const guideWalls = [
        // Left guide: from (WALL_LEFT, DRAIN_Y-80) to (WALL_LEFT+40, DRAIN_Y-20)
        { x1: WALL_LEFT, y1: DRAIN_Y - 80, x2: WALL_LEFT + 40, y2: DRAIN_Y - 20 },
        // Right guide: from (WALL_RIGHT, DRAIN_Y-80) to (WALL_RIGHT-40, DRAIN_Y-20)
        { x1: WALL_RIGHT, y1: DRAIN_Y - 80, x2: WALL_RIGHT - 40, y2: DRAIN_Y - 20 },
      ];
      for (const w of guideWalls) {
        const wdx = w.x2 - w.x1;
        const wdy = w.y2 - w.y1;
        const wlen2 = wdx * wdx + wdy * wdy;
        let wt = ((ball.x - w.x1) * wdx + (ball.y - w.y1) * wdy) / wlen2;
        wt = clamp(wt, 0, 1);
        const cx = w.x1 + wt * wdx;
        const cy = w.y1 + wt * wdy;
        const wd = dist(ball.x, ball.y, cx, cy);
        if (wd < ball.r + 3) {
          const wnx = (ball.x - cx) / (wd || 1);
          const wny = (ball.y - cy) / (wd || 1);
          ball.x = cx + wnx * (ball.r + 4);
          ball.y = cy + wny * (ball.r + 4);
          const wdot = ball.vx * wnx + ball.vy * wny;
          ball.vx -= 2 * wdot * wnx;
          ball.vy -= 2 * wdot * wny;
          ball.vx *= 0.85;
          ball.vy *= 0.85;
        }
      }

      // Bumper collisions
      for (const b of bumpers) {
        const d = dist(ball.x, ball.y, b.x, b.y);
        if (d < ball.r + b.r) {
          const angle = Math.atan2(ball.y - b.y, ball.x - b.x);
          ball.vx = Math.cos(angle) * BUMPER_BOUNCE;
          ball.vy = Math.sin(angle) * BUMPER_BOUNCE;
          ball.x = b.x + Math.cos(angle) * (ball.r + b.r + 1);
          ball.y = b.y + Math.sin(angle) * (ball.r + b.r + 1);
          b.flash = 10;
          scoreRef.current += 100;
        }
        if (b.flash > 0) b.flash--;
      }

      // Flipper collisions (simplified line segment)
      for (const f of flippers) {
        const endX = f.x + Math.cos(f.angle) * f.length;
        const endY = f.y + Math.sin(f.angle) * f.length;

        // Project ball onto flipper line
        const dx = endX - f.x;
        const dy = endY - f.y;
        const len2 = dx * dx + dy * dy;
        let t = ((ball.x - f.x) * dx + (ball.y - f.y) * dy) / len2;
        t = clamp(t, 0, 1);
        const closestX = f.x + t * dx;
        const closestY = f.y + t * dy;
        const d = dist(ball.x, ball.y, closestX, closestY);

        if (d < ball.r + 5) {
          // Push ball away from flipper
          const nx = (ball.x - closestX) / (d || 1);
          const ny = (ball.y - closestY) / (d || 1);
          ball.x = closestX + nx * (ball.r + 6);
          ball.y = closestY + ny * (ball.r + 6);

          // Reflect velocity + flipper boost
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx -= 2 * dot * nx;
          ball.vy -= 2 * dot * ny;

          // Add upward boost when flipper is active
          const isActive = (f.side === 'left' && leftActive) || (f.side === 'right' && rightActive);
          if (isActive) {
            ball.vy -= 4;
            ball.vx += f.side === 'left' ? 2 : -2;
          }
          scoreRef.current += 10;
        }
      }

      // Drain detection
      if (ball.y > DRAIN_Y + 30) {
        ballsLeftRef.current--;
        if (ballsLeftRef.current <= 0) {
          setFinalScore(scoreRef.current);
          setGameOver(true);
        } else {
          ballRef.current = resetBall();
        }
      }

      // Clamp velocity
      ball.vx = clamp(ball.vx, -12, 12);
      ball.vy = clamp(ball.vy, -12, 12);

      // --- Draw ---
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Background
      const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Walls
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(WALL_LEFT, 10);
      ctx.lineTo(WALL_LEFT, DRAIN_Y + 10);
      ctx.moveTo(WALL_RIGHT, 10);
      ctx.lineTo(WALL_RIGHT, DRAIN_Y + 10);
      ctx.moveTo(WALL_LEFT, 10);
      ctx.lineTo(WALL_RIGHT, 10);
      ctx.stroke();

      // Guide walls (funnel toward flippers)
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      // Left guide: angled wall from lower-left toward left flipper
      ctx.beginPath();
      ctx.moveTo(WALL_LEFT, DRAIN_Y - 80);
      ctx.lineTo(WALL_LEFT + 40, DRAIN_Y - 20);
      ctx.stroke();
      // Right guide: angled wall from lower-right toward right flipper
      ctx.beginPath();
      ctx.moveTo(WALL_RIGHT, DRAIN_Y - 80);
      ctx.lineTo(WALL_RIGHT - 40, DRAIN_Y - 20);
      ctx.stroke();

      // Bumpers
      for (const b of bumpers) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        if (b.flash > 0) {
          ctx.fillStyle = '#fbbf24';
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 15;
        } else {
          ctx.fillStyle = '#10b981';
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 8;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Flippers
      for (const f of flippers) {
        const endX = f.x + Math.cos(f.angle) * f.length;
        const endY = f.y + Math.sin(f.angle) * f.length;
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.stroke();
        // Pivot dot
        ctx.beginPath();
        ctx.arc(f.x, f.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fb923c';
        ctx.fill();
      }

      // Ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fillStyle = '#e2e8f0';
      ctx.shadowColor = '#e2e8f0';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Score + balls left
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${scoreRef.current}`, WALL_LEFT + 8, HEIGHT - 8);
      ctx.textAlign = 'right';
      ctx.fillText(`Balls: ${ballsLeftRef.current}`, WALL_RIGHT - 8, HEIGHT - 8);

      // Drain line (subtle)
      ctx.strokeStyle = '#ef444440';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(WALL_LEFT, DRAIN_Y);
      ctx.lineTo(WALL_RIGHT, DRAIN_Y);
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [gameOver]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      data-testid="pinball-overlay"
    >
      {/* Backdrop — NOT clickable on touch devices (side zones handle input) */}
      <motion.div
        className="absolute inset-0 bg-black/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={isTouchDevice ? undefined : safeClose}
        data-testid="pinball-backdrop"
      />

      {/* Full-screen touch zones for iPad/mobile — span entire left/right halves */}
      {isTouchDevice && !gameOver && (
        <>
          <div
            className="absolute left-0 top-0 w-1/2 h-full z-20"
            data-testid="pinball-touch-left"
            onTouchStart={(e) => { e.preventDefault(); handleSideTouchStart('left'); }}
            onTouchEnd={() => handleSideTouchEnd('left')}
            onTouchCancel={() => handleSideTouchEnd('left')}
          />
          <div
            className="absolute right-0 top-0 w-1/2 h-full z-20"
            data-testid="pinball-touch-right"
            onTouchStart={(e) => { e.preventDefault(); handleSideTouchStart('right'); }}
            onTouchEnd={() => handleSideTouchEnd('right')}
            onTouchCancel={() => handleSideTouchEnd('right')}
          />
        </>
      )}

      {/* Visual flipper indicators for touch (glow on sides) */}
      {isTouchDevice && !gameOver && (
        <>
          <div
            className={`absolute left-0 top-0 w-8 h-full z-10 transition-opacity duration-100 pointer-events-none ${
              leftActive ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ background: 'linear-gradient(to right, rgba(249,115,22,0.3), transparent)' }}
          />
          <div
            className={`absolute right-0 top-0 w-8 h-full z-10 transition-opacity duration-100 pointer-events-none ${
              rightActive ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ background: 'linear-gradient(to left, rgba(249,115,22,0.3), transparent)' }}
          />
        </>
      )}

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
          <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">Pinball</span>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-500 active:bg-red-400 text-white text-xs font-semibold transition-colors"
            aria-label="Close pinball game"
            data-testid="pinball-close"
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
          data-testid="pinball-canvas"
        />

        {/* Controls hint — adapts to input method */}
        <div className="text-center py-2 bg-slate-800/60">
          <span className="text-[10px] text-slate-500">
            {isTouchDevice
              ? 'Tap left/right side of screen to flip'
              : '← → or Z / to flip \u00B7 ESC to close'}
          </span>
        </div>

        {/* Game Over overlay */}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-30">
            <p className="text-2xl font-bold text-white mb-1">Game Over</p>
            <p className="text-lg text-emerald-400 mb-4">Score: {finalScore}</p>
            <div className="flex gap-3">
              <button
                onClick={restartGame}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
