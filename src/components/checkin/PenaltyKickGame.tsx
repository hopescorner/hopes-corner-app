'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

type Phase = 'aim' | 'flying' | 'result';
type Outcome = 'goal' | 'saved' | 'post' | 'miss';

interface Keeper {
  x: number;
  diveTarget: number;
  diveDir: -1 | 0 | 1;
  progress: number;
  delay: number;
  diveFrames: number;
  saveAnim: number;
}

interface Flight {
  t: number;
  duration: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  outcome: Outcome;
  spin: number;
  curve: number;
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
  maxLife: number;
  size: number;
  gravity: number;
  rot?: number;
  vRot?: number;
  shape?: 'circle' | 'square' | 'spark';
}

interface NetRipple {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  amp: number;
}

export interface LevelParams {
  readProb: number;
  noise: number;
  reactDelay: number;
  diveFrames: number;
  reach: number;
  saveR: number;
  sway: number;
  wobble: number;
  chargeRate: number;
}

const WIDTH = 360;
const HEIGHT = 540;

const POST_LEFT = 70;
const POST_RIGHT = 290;
const BAR_Y = 170;
const LINE_Y = 250;
const GOAL_CENTER_X = (POST_LEFT + POST_RIGHT) / 2;
const NET_DEPTH = 24;

const SPOT_X = GOAL_CENTER_X;
const SPOT_Y = 440;
const BALL_R = 11;

const AIM_MIN_X = 30;
const AIM_MAX_X = WIDTH - 30;
const AIM_MIN_Y = 90;
const AIM_MAX_Y = 330;

const GLOVE_OFFSET = 8;
const POST_MARGIN = 12;
const RESULT_FRAMES = 82;
const MAX_LEVEL = 10;
const GOALS_PER_LEVEL = 2;

const POWER_MIN = 0.15;
const SWEET_LO = 0.72;
const SWEET_HI = 0.78;
const OVERHIT = 0.83;

const MEMORY_WINDOW = 20;
const LEARN_ZONES = 4;
const HOT_ZONE_MIN = 3;
const MEMORY_KEY = 'pk-keeper-memory-v2';

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

export function levelParams(level: number, streak = 0): LevelParams {
  const t = clamp(level - 1, 0, MAX_LEVEL - 1) / (MAX_LEVEL - 1);
  const base: LevelParams = {
    readProb: 0.65 + t * 0.3,
    noise: 24 - t * 20,
    reactDelay: Math.max(0, Math.round(5 - t * 4)),
    diveFrames: Math.round(16 - t * 7),
    reach: 90 + t * 18,
    saveR: 24 + t * 10,
    sway: 4 + t * 6,
    wobble: clamp(level - 1, 0, 9) * 0.75,
    chargeRate: 0.022 + t * 0.013,
  };

  if (streak >= 1) {
    base.readProb = 0.99;
    base.noise = 0;
    base.reactDelay = 0;
    base.diveFrames = 6;
    base.reach = 125;
    base.saveR = 48;
    base.wobble = Math.max(base.wobble, 7.5) + streak * 1.5;
    base.chargeRate = 0.04 + streak * 0.006;
  }

  return base;
}

export interface ShotMemory {
  x: number;
  y: number;
  outcome?: Outcome;
  postGoal?: boolean;
}

export interface HeatTarget {
  x: number;
  y: number;
  shots: number;
  p: number;
}

export function zoneIndexForShot(x: number, y?: number): number {
  const mouthWidth = POST_RIGHT - POST_LEFT;
  const col = clamp(Math.floor(((x - POST_LEFT) / mouthWidth) * LEARN_ZONES), 0, LEARN_ZONES - 1);
  if (y === undefined) return col;
  const row = y < (BAR_Y + LINE_Y) / 2 ? 0 : 1;
  return row * LEARN_ZONES + col;
}

export function zoneCenterForIndex(index: number): { x: number; y: number } {
  const mouthWidth = POST_RIGHT - POST_LEFT;
  const col = index % LEARN_ZONES;
  const isTop = index < LEARN_ZONES;
  return {
    x: POST_LEFT + (mouthWidth * (clamp(col, 0, LEARN_ZONES - 1) + 0.5)) / LEARN_ZONES,
    y: isTop ? BAR_Y + (LINE_Y - BAR_Y) * 0.35 : BAR_Y + (LINE_Y - BAR_Y) * 0.75,
  };
}

export function hottestZone(shots: ShotMemory[]): HeatTarget | null {
  if (shots.length < HOT_ZONE_MIN + 1) return null;
  const counts = new Array<number>(LEARN_ZONES).fill(0);
  for (const s of shots) {
    if (s.outcome !== undefined && s.outcome !== 'goal') continue;
    counts[zoneIndexForShot(s.x)] += 1;
  }
  let best = 0;
  for (let i = 1; i < counts.length; i++) {
    if (counts[i] > counts[best]) best = i;
  }
  if (counts[best] < HOT_ZONE_MIN) return null;
  const center = zoneCenterForIndex(best);
  return {
    ...center,
    shots: counts[best],
    p: Math.min(0.4 + 0.1 * (counts[best] - HOT_ZONE_MIN), 0.85),
  };
}

function loadKeeperMemory(): ShotMemory[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(MEMORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (s): s is ShotMemory =>
          typeof s === 'object' &&
          s !== null &&
          typeof (s as ShotMemory).x === 'number' &&
          typeof (s as ShotMemory).y === 'number'
      )
      .slice(-MEMORY_WINDOW);
  } catch {
    return [];
  }
}

export interface DiveOptions {
  streak?: number;
  lastGoalSide?: -1 | 0 | 1;
  postGoalSwitchRatio?: number;
  shotY?: number;
}

export interface DivePlan {
  diveDir: -1 | 0 | 1;
  diveTarget: number;
  diveTargetY?: number;
  anticipated: boolean;
}

export function planDive(
  shotX: number,
  params: LevelParams,
  heat: HeatTarget | null,
  options?: DiveOptions
): DivePlan {
  const streak = options?.streak ?? 0;
  const lastGoalSide = options?.lastGoalSide;
  const switchRatio = options?.postGoalSwitchRatio ?? 0.75;

  if (streak >= 1) {
    const readChance = Math.min(0.45 + (streak - 1) * 0.15, 0.95);
    if (!lastGoalSide || Math.random() < readChance) {
      const readTarget = clamp(shotX, GOAL_CENTER_X - params.reach, GOAL_CENTER_X + params.reach);
      const readDir: -1 | 0 | 1 =
        readTarget < GOAL_CENTER_X - 8 ? -1 : readTarget > GOAL_CENTER_X + 8 ? 1 : 0;
      return {
        diveDir: readDir,
        diveTarget: readTarget,
        diveTargetY: options?.shotY ?? 200,
        anticipated: false,
      };
    }

    const anticipatedTargetSide: -1 | 1 =
      lastGoalSide === 1
        ? switchRatio >= 0.5 ? -1 : 1
        : lastGoalSide === -1
          ? switchRatio >= 0.5 ? 1 : -1
          : shotX < GOAL_CENTER_X ? -1 : 1;

    const shotSide: -1 | 1 = shotX < GOAL_CENTER_X ? -1 : 1;
    const isMatchingSide = shotSide === anticipatedTargetSide;

    const diveTarget = isMatchingSide
      ? clamp(shotX, GOAL_CENTER_X - params.reach, GOAL_CENTER_X + params.reach)
      : clamp(
          GOAL_CENTER_X + anticipatedTargetSide * params.reach * 0.96,
          GOAL_CENTER_X - params.reach,
          GOAL_CENTER_X + params.reach
        );

    return {
      diveDir: anticipatedTargetSide,
      diveTarget,
      diveTargetY: isMatchingSide ? (options?.shotY ?? 200) : 200,
      anticipated: true,
    };
  }

  if (heat && Math.random() < heat.p) {
    if (Math.abs(shotX - heat.x) <= 30) {
      const diveTarget = clamp(
        heat.x + (Math.random() * 2 - 1) * 6,
        GOAL_CENTER_X - params.reach,
        GOAL_CENTER_X + params.reach
      );
      const dir = diveTarget < GOAL_CENTER_X - 8 ? -1 : diveTarget > GOAL_CENTER_X + 8 ? 1 : 0;
      return { diveDir: dir, diveTarget, diveTargetY: options?.shotY ?? heat.y, anticipated: true };
    }
  }

  const roll = Math.random();
  if (roll < params.readProb) {
    const read = shotX + (Math.random() * 2 - 1) * params.noise;
    const diveTarget = clamp(read, GOAL_CENTER_X - params.reach, GOAL_CENTER_X + params.reach);
    const dir = diveTarget < GOAL_CENTER_X - 8 ? -1 : diveTarget > GOAL_CENTER_X + 8 ? 1 : 0;
    return { diveDir: dir, diveTarget, diveTargetY: options?.shotY ?? 200, anticipated: false };
  }

  if (roll < params.readProb + (1 - params.readProb) * 0.7) {
    const shotSide: -1 | 1 = shotX < GOAL_CENTER_X ? -1 : 1;
    const wrong = Math.random() < 0.8 ? (-shotSide as -1 | 1) : shotSide;
    return { diveDir: wrong, diveTarget: GOAL_CENTER_X + wrong * params.reach * 0.9, diveTargetY: 200, anticipated: false };
  }

  return { diveDir: 0, diveTarget: GOAL_CENTER_X + (Math.random() * 2 - 1) * 8, diveTargetY: 200, anticipated: false };
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

function gloveAt(
  frame: number,
  plan: DivePlan,
  params: LevelParams
): { x: number; y: number } {
  const p = clamp((frame - params.reactDelay) / Math.max(params.diveFrames, 1), 0, 1);
  const k = easeInOutQuad(p);
  const targetY = plan.diveTargetY ?? 208;
  return {
    x: GOAL_CENTER_X + (plan.diveTarget - GOAL_CENTER_X) * k + plan.diveDir * GLOVE_OFFSET * k,
    y: 208 + (targetY - 208) * k,
  };
}

interface PenaltyKickGameProps {
  onClose: () => void;
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
    diveFrames: 14,
    saveAnim: 0,
  });
  const flightRef = useRef<Flight | null>(null);
  const looseBallRef = useRef<LooseBall | null>(null);
  const resultRef = useRef<{ outcome: Outcome; t: number; toX: number; toY: number } | null>(null);
  const goalsRef = useRef(0);
  const kicksRef = useRef(0);
  const streakRef = useRef(0);
  const levelRef = useRef(MAX_LEVEL);
  const memoryRef = useRef<Array<ShotMemory>>(loadKeeperMemory());
  const anticipatedRef = useRef(false);
  const lastGoalSideRef = useRef<-1 | 0 | 1>(0);
  const postGoalHistoryRef = useRef<{ switches: number; repeats: number }>({ switches: 0, repeats: 0 });

  const powerRef = useRef<{ charging: boolean; value: number; dir: 1 | -1 }>({
    charging: false,
    value: 0.3,
    dir: 1,
  });
  const spaceHeldRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);
  const netRipplesRef = useRef<NetRipple[]>([]);
  const trailRef = useRef<Array<{ x: number; y: number; r: number; alpha: number }>>([]);
  const levelFlashRef = useRef<{ t: number; level: number } | null>(null);
  const shakeRef = useRef(0);
  const cheerRef = useRef(0);
  const frameWobbleRef = useRef(0);
  const [canDismiss, setCanDismiss] = useState(graceMs <= 0);
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const spawnBurst = useCallback(
    (
      x: number,
      y: number,
      colors: string[],
      count: number,
      speed: number,
      gravity = 0.12,
      shape: 'circle' | 'square' | 'spark' = 'circle'
    ) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const s = speed * (0.3 + Math.random() * 0.9);
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * s,
          vy: Math.sin(angle) * s - (shape === 'spark' ? 0.5 : 1.5),
          color: colors[i % colors.length],
          life: 1.0,
          maxLife: 1.0,
          size: shape === 'spark' ? 1.5 + Math.random() * 2 : 2.5 + Math.random() * 3.5,
          gravity,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.2,
          shape,
        });
      }
    },
    []
  );

  useEffect(() => {
    if (graceMs <= 0) return;
    const timer = setTimeout(() => setCanDismiss(true), graceMs);
    return () => clearTimeout(timer);
  }, [graceMs]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const safeClose = useCallback(() => {
    if (canDismiss) onClose();
  }, [canDismiss, onClose]);

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

  const effAim = useCallback(() => {
    const aim = aimRef.current;
    const { wobble } = levelParams(levelRef.current, streakRef.current);
    const f = frameRef.current;
    const streakPressure = streakRef.current >= 1 ? Math.sin(f * 0.18) * 2.8 : 0;
    return {
      x: clamp(
        aim.x + Math.sin(f * 0.08) * wobble + Math.sin(f * 0.024) * wobble * 0.5 + streakPressure,
        AIM_MIN_X,
        AIM_MAX_X
      ),
      y: clamp(
        aim.y + Math.cos(f * 0.07) * wobble * 0.7 + (streakRef.current >= 1 ? Math.cos(f * 0.14) * 2 : 0),
        AIM_MIN_Y,
        AIM_MAX_Y
      ),
    };
  }, []);

  const recordShot = useCallback((x: number, y: number, outcome: Outcome) => {
    const postGoal = streakRef.current >= 1;
    const mem = [...memoryRef.current, { x, y, outcome, postGoal }].slice(-MEMORY_WINDOW);
    memoryRef.current = mem;
    try {
      window.localStorage.setItem(MEMORY_KEY, JSON.stringify(mem));
    } catch {
      // Memory fails gracefully in private mode
    }
  }, []);

  const shoot = useCallback(
    (power: number) => {
      if (phaseRef.current !== 'aim') return;
      powerRef.current.charging = false;
      spaceHeldRef.current = false;

      const currentStreak = streakRef.current;
      const params = levelParams(levelRef.current, currentStreak);
      const target = effAim();

      spawnBurst(SPOT_X, SPOT_Y + 12, ['#ffffff', '#e2e8f0', '#cbd5e1'], 16, 2.2, 0.05, 'spark');

      const sweetLo = currentStreak >= 1 ? 0.74 : SWEET_LO;
      const sweetHi = currentStreak >= 1 ? 0.78 : SWEET_HI;
      const isSweet = power >= sweetLo && power <= sweetHi;

      let spread = 2;
      if (isSweet) {
        spread = 2.5 + (currentStreak >= 1 ? 2.5 : 0);
      } else if (power < sweetLo) {
        spread = 6 + (1 - power / sweetLo) * 16;
      } else if (power > OVERHIT) {
        spread = 16 + (power - OVERHIT) * 240;
      } else {
        spread = 6 + (power - sweetHi) * 40;
      }

      let tx = target.x + (Math.random() + Math.random() - 1) * spread;
      let ty = target.y + (Math.random() + Math.random() - 1) * spread;
      if (power > OVERHIT) {
        ty -= (power - OVERHIT) * 340 + Math.random() * 40;
      }
      tx = clamp(tx, 6, WIDTH - 6);
      ty = clamp(ty, 25, SPOT_Y - 30);

      let outcome = classifyShot(tx, ty);
      recordShot(tx, ty, outcome);

      const heat = hottestZone(memoryRef.current);
      const switches = postGoalHistoryRef.current.switches;
      const repeats = postGoalHistoryRef.current.repeats;

      const mem = memoryRef.current;
      let leftCount = 0;
      let rightCount = 0;
      for (const s of mem) {
        if (s.x < GOAL_CENTER_X - 10) leftCount++;
        else if (s.x > GOAL_CENTER_X + 10) rightCount++;
      }

      let switchRatio = switches + repeats > 0 ? switches / (switches + repeats) : 0.5;
      if (lastGoalSideRef.current === 1) {
        switchRatio = rightCount > leftCount ? 0.15 : 0.85;
      } else if (lastGoalSideRef.current === -1) {
        switchRatio = leftCount > rightCount ? 0.15 : 0.85;
      }

      const plan = planDive(tx, params, heat, {
        shotY: ty,
        streak: currentStreak,
        lastGoalSide: lastGoalSideRef.current,
        postGoalSwitchRatio: switchRatio,
      });

      anticipatedRef.current = plan.anticipated;
      const duration = isSweet
        ? Math.max(9, Math.round(22 - power * 15))
        : Math.max(13, Math.round(27 - power * 16));

      if (outcome === 'goal') {
        const glove = gloveAt(duration, plan, params);
        const distToGlove = Math.hypot(tx - glove.x, ty - glove.y);
        const shotSide = tx < GOAL_CENTER_X ? -1 : 1;
        const isDiveToShotSide = plan.diveDir === shotSide;
        if (distToGlove < params.saveR || (isDiveToShotSide && !isSweet) || (currentStreak >= 1 && isDiveToShotSide && power < 0.82)) {
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
        saveAnim: 0,
      };

      kicksRef.current += 1;
      const shotSide: -1 | 1 = tx < GOAL_CENTER_X ? -1 : 1;

      if (outcome === 'goal') {
        if (currentStreak >= 1) {
          if (shotSide === lastGoalSideRef.current) {
            postGoalHistoryRef.current.repeats += 1;
          } else {
            postGoalHistoryRef.current.switches += 1;
          }
        }
        lastGoalSideRef.current = shotSide;
        goalsRef.current += 1;
        streakRef.current += 1;

        netRipplesRef.current.push({
          x: tx,
          y: ty,
          life: 0,
          maxLife: 48,
          amp: 1.0,
        });

        const goalColors =
          streakRef.current >= 2
            ? ['#fbbf24', '#f59e0b', '#ec4899', '#38bdf8', '#ffffff', '#22c55e']
            : ['#22c55e', '#ffffff', '#38bdf8', '#fbbf24'];
        spawnBurst(tx, BAR_Y + 36, goalColors, streakRef.current >= 2 ? 65 : 45, 4.8, 0.1, 'square');
        cheerRef.current = 130;
        shakeRef.current = streakRef.current >= 2 ? 14 : 8;

        const newLevel = Math.min(MAX_LEVEL, 1 + Math.floor(goalsRef.current / GOALS_PER_LEVEL));
        if (newLevel > levelRef.current) {
          levelRef.current = newLevel;
          levelFlashRef.current = { t: 0, level: newLevel };
        }
      } else {
        streakRef.current = 0;
        if (outcome === 'saved') {
          keeperRef.current.saveAnim = 30;
          const glove = gloveAt(duration, plan, params);
          spawnBurst(glove.x, glove.y, ['#38bdf8', '#93c5fd', '#ffffff', '#67e8f9'], 28, 3.8, 0.08, 'spark');
          shakeRef.current = 6;
        } else if (outcome === 'post') {
          spawnBurst(tx, ty, ['#fbbf24', '#f59e0b', '#ffffff', '#ea580c'], 30, 4.2, 0.09, 'spark');
          frameWobbleRef.current = 40;
          shakeRef.current = 11;
        } else {
          spawnBurst(tx, ty, ['#94a3b8', '#cbd5e1'], 12, 2.2, 0.08);
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
        spin: (tx >= SPOT_X ? 1 : -1) * (0.2 + power * 0.35),
        curve: (tx - SPOT_X) * 0.08,
      };
      trailRef.current = [];
      phaseRef.current = 'flying';
    },
    [effAim, spawnBurst, recordShot]
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

  const quickShot = useCallback(() => {
    if (phaseRef.current !== 'aim' || powerRef.current.charging) return;
    shoot(0.52);
  }, [shoot]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const aim = aimRef.current;
      const step = e.shiftKey ? 26 : 12;
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    const skyGrad = ctx.createLinearGradient(0, 0, 0, 175);
    skyGrad.addColorStop(0, '#030712');
    skyGrad.addColorStop(0.5, '#0b132b');
    skyGrad.addColorStop(1, '#1e1b4b');

    const boardGrad = ctx.createLinearGradient(0, 144, 0, 170);
    boardGrad.addColorStop(0, '#042f2e');
    boardGrad.addColorStop(0.5, '#0d9488');
    boardGrad.addColorStop(1, '#115e59');

    const pitchGrad = ctx.createLinearGradient(0, 170, 0, HEIGHT);
    pitchGrad.addColorStop(0, '#15803d');
    pitchGrad.addColorStop(0.4, '#166534');
    pitchGrad.addColorStop(1, '#14532d');

    const vigGrad = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, HEIGHT * 0.35, WIDTH / 2, HEIGHT / 2, HEIGHT * 0.78);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(3,7,18,0.55)');

    const crowd: Array<{ x: number; y: number; c: string; phase: number; row: number }> = [];
    const crowdColors = ['#ef4444', '#f59e0b', '#38bdf8', '#ec4899', '#f8fafc', '#10b981', '#a855f7'];
    for (let tier = 0; tier < 3; tier++) {
      const baseY = 68 + tier * 24;
      for (let i = 0; i < 90; i++) {
        crowd.push({
          x: 4 + Math.random() * (WIDTH - 8),
          y: baseY + Math.random() * 20,
          c: crowdColors[(i + tier * 4) % crowdColors.length],
          phase: Math.random() * Math.PI * 2,
          row: tier,
        });
      }
    }

    const cameraFlashes: Array<{ x: number; y: number; life: number }> = [];

    const drawSoccerBall = (x: number, y: number, r: number, rot: number) => {
      ctx.save();
      ctx.translate(x, y);

      const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.75, '#e2e8f0');
      g.addColorStop(1, '#94a3b8');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.rotate(rot);

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      const pr = r * 0.32;
      ctx.arc(0, 0, pr, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const px = Math.cos(a) * r * 0.68;
        const py = Math.sin(a) * r * 0.68;
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(px, py, pr * 0.72, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * pr, Math.sin(a) * pr);
        ctx.lineTo(px, py);
        ctx.stroke();
      }

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    };

    const drawKeeper = (kx: number, diveDir: -1 | 0 | 1, progress: number) => {
      const ky = LINE_Y;
      const e = easeInOutQuad(progress);
      const lift = Math.sin(e * Math.PI) * 16;
      const isLockdown = streakRef.current >= 1;

      ctx.save();

      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(kx - diveDir * e * 12, ky + 4, 18 + e * 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(kx, ky - lift);
      ctx.rotate(diveDir * e * 0.95);

      const kitColor = '#fbbf24';
      const kitTrim = '#b45309';

      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const legSpread = 8 + e * 12;
      ctx.moveTo(-4, -26);
      ctx.lineTo(-legSpread, 0);
      ctx.moveTo(4, -26);
      ctx.lineTo(legSpread, 0);
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(-legSpread, 0, 4, 0, Math.PI * 2);
      ctx.arc(legSpread, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-10, -32, 20, 12, 3);
      ctx.fill();

      ctx.fillStyle = kitColor;
      ctx.strokeStyle = kitTrim;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-11, -58, 22, 30, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = kitTrim;
      ctx.fillRect(-11, -44, 22, 4);

      const extend = 16 + e * 24;
      const reachL = diveDir === 1 ? 8 : extend;
      const reachR = diveDir === -1 ? 8 : extend;
      const gloveLX = -8 - reachL;
      const gloveRX = 8 + reachR;
      const gloveY = -54 - e * 14;

      ctx.strokeStyle = kitColor;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-7, -50);
      ctx.lineTo(gloveLX, gloveY);
      ctx.moveTo(7, -50);
      ctx.lineTo(gloveRX, gloveY);
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(gloveLX, gloveY, 6.5, 0, Math.PI * 2);
      ctx.arc(gloveRX, gloveY, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fcd9b8';
      ctx.beginPath();
      ctx.arc(0, -66, 8.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, -73, 8.5, Math.PI, 0);
      ctx.fill();

      ctx.restore();
    };

    const loop = () => {
      frameRef.current += 1;
      const frame = frameRef.current;
      const phase = phaseRef.current;
      const keeper = keeperRef.current;
      const particles = particlesRef.current;
      const netRipples = netRipplesRef.current;
      const currentStreak = streakRef.current;
      const params = levelParams(levelRef.current, currentStreak);

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

      let ballX = SPOT_X;
      let ballY = SPOT_Y;
      let ballScale = 1;
      let ballRot = 0;
      let ballVisible = true;

      if (phase === 'flying' && flightRef.current) {
        const f = flightRef.current;
        f.t += 1;
        const t = clamp(f.t / f.duration, 0, 1);
        const e = easeOutCubic(t);
        ballX = f.fromX + (f.toX - f.fromX) * e;
        ballY = f.fromY + (f.toY - f.fromY) * e;
        ballScale = 1 - t * 0.42;
        ballRot = f.spin * f.t;

        trailRef.current.push({
          x: ballX,
          y: ballY,
          r: BALL_R * ballScale,
          alpha: currentStreak >= 1 ? 0.7 : 0.4,
        });
        if (trailRef.current.length > 9) trailRef.current.shift();

        if (f.t >= f.duration) {
          phaseRef.current = 'result';
          resultRef.current = { outcome: f.outcome, t: 0, toX: f.toX, toY: f.toY };
          flightRef.current = null;
          trailRef.current = [];

          if (f.outcome === 'goal') {
            ballVisible = false;
            looseBallRef.current = null;
          } else if (f.outcome === 'post') {
            const reboundDir = f.toX >= GOAL_CENTER_X ? 1 : -1;
            looseBallRef.current = {
              x: f.toX,
              y: f.toY,
              vx: reboundDir * (2 + Math.random() * 2.5) * -1,
              vy: 2 + Math.random() * 2,
              scale: 0.58,
            };
          } else if (f.outcome === 'saved') {
            looseBallRef.current = {
              x: f.toX,
              y: f.toY,
              vx: -keeper.diveDir * (1.8 + Math.random() * 2) || (Math.random() - 0.5) * 3,
              vy: 2.5,
              scale: 0.58,
            };
          } else {
            looseBallRef.current = {
              x: f.toX,
              y: f.toY,
              vx: clamp((f.toX - f.fromX) / f.duration, -3.5, 3.5) * 0.5,
              vy: f.toY < BAR_Y ? -2 : 0.5,
              scale: 0.58,
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
          lb.vy += 0.24;
          lb.vx *= 0.985;
          if (lb.y > SPOT_Y - 8 && lb.vy > 0) {
            lb.y = SPOT_Y - 8;
            lb.vy *= -0.45;
            lb.vx *= 0.7;
          }
          ballX = lb.x;
          ballY = lb.y;
          ballScale = lb.scale;
          ballRot = lb.x * 0.06;
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
            saveAnim: 0,
          };
          ballVisible = true;
        }
      }

      if (phase === 'flying' || phase === 'result') {
        if (keeper.delay > 0) {
          keeper.delay -= 1;
        } else if (keeper.progress < 1) {
          keeper.progress = clamp(keeper.progress + 1 / Math.max(keeper.diveFrames, 1), 0, 1);
          const e = easeInOutQuad(keeper.progress);
          keeper.x = GOAL_CENTER_X + (keeper.diveTarget - GOAL_CENTER_X) * e;
        }
      } else {
        const mem = memoryRef.current;
        let leftCount = 0;
        let rightCount = 0;
        for (const s of mem) {
          if (s.x < GOAL_CENTER_X - 10) leftCount++;
          else if (s.x > GOAL_CENTER_X + 10) rightCount++;
        }
        const userBias = rightCount > leftCount + 1 ? 1 : leftCount > rightCount + 1 ? -1 : 0;
        const swayAmp = currentStreak >= 1 ? params.sway * 1.5 : params.sway;
        keeper.x = GOAL_CENTER_X + Math.sin(frame * 0.055) * swayAmp + userBias * 8;
      }

      if (shakeRef.current > 0) shakeRef.current -= 1;
      if (cheerRef.current > 0) cheerRef.current -= 1;
      if (frameWobbleRef.current > 0) frameWobbleRef.current -= 1;

      if (Math.random() < 0.08) {
        cameraFlashes.push({
          x: 10 + Math.random() * (WIDTH - 20),
          y: 70 + Math.random() * 60,
          life: 4,
        });
      }

      ctx.save();
      if (shakeRef.current > 0) {
        const s = (shakeRef.current / 12) * 4;
        ctx.translate((Math.random() - 0.5) * s * 2, (Math.random() - 0.5) * s * 2);
      }

      ctx.fillStyle = skyGrad;
      ctx.fillRect(-8, -8, WIDTH + 16, 185);

      for (const side of [0, 1] as const) {
        const px = side === 0 ? 32 : WIDTH - 32;

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(px - 3, 8, 6, 54);

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(px - 18, 4, 36, 14, 3);
        ctx.fill();

        for (let b = 0; b < 4; b++) {
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(px - 12 + b * 8, 11, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        const glow = ctx.createRadialGradient(px, 11, 2, px, 11, 55);
        glow.addColorStop(0, 'rgba(254,240,138,0.55)');
        glow.addColorStop(1, 'rgba(254,240,138,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, 11, 55, 0, Math.PI * 2);
        ctx.fill();

        const beam = ctx.createLinearGradient(px, 14, side === 0 ? 110 : WIDTH - 110, 175);
        beam.addColorStop(0, 'rgba(254,240,138,0.18)');
        beam.addColorStop(1, 'rgba(254,240,138,0)');
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(px - 16, 14);
        ctx.lineTo(side === 0 ? -20 : WIDTH + 20, 175);
        ctx.lineTo(side === 0 ? 150 : WIDTH - 150, 175);
        ctx.lineTo(px + 16, 14);
        ctx.fill();
      }

      ctx.fillStyle = '#0b1329';
      ctx.fillRect(0, 62, WIDTH, 8);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      for (let tx = 0; tx < WIDTH; tx += 28) {
        ctx.beginPath();
        ctx.moveTo(tx, 62);
        ctx.lineTo(tx + 14, 70);
        ctx.lineTo(tx + 28, 62);
        ctx.stroke();
      }

      ctx.fillStyle = '#0a1024';
      ctx.fillRect(0, 70, WIDTH, 74);

      const cheerActive = cheerRef.current > 0;
      for (const fan of crowd) {
        const bob = Math.abs(Math.sin(frame * 0.08 + fan.phase)) * (cheerActive ? 3.5 : 0.8);
        ctx.fillStyle = fan.c;
        ctx.globalAlpha = cheerActive ? 0.95 : 0.85;
        ctx.fillRect(fan.x, fan.y - bob, 3.2, 4.2);
      }
      ctx.globalAlpha = 1;

      for (let fIdx = cameraFlashes.length - 1; fIdx >= 0; fIdx--) {
        const flash = cameraFlashes[fIdx];
        ctx.fillStyle = `rgba(255,255,255,${flash.life / 4})`;
        ctx.beginPath();
        ctx.arc(flash.x, flash.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        flash.life -= 1;
        if (flash.life <= 0) cameraFlashes.splice(fIdx, 1);
      }

      ctx.fillStyle = boardGrad;
      ctx.fillRect(0, 144, WIDTH, 26);
      ctx.fillStyle = '#042f2e';
      ctx.fillRect(0, 144, WIDTH, 2);

      const adText = "HOPE'S CORNER FC  ★  PENALTY SHOOTOUT";
      ctx.fillStyle = '#a7f3d0';
      ctx.font = 'bold 10.5px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 7;
      ctx.fillText(adText, WIDTH / 2, 161);
      ctx.shadowBlur = 0;

      ctx.fillStyle = pitchGrad;
      ctx.fillRect(-8, 170, WIDTH + 16, HEIGHT - 162);

      for (let i = 0; i < 5; i++) {
        const yTop = 180 + i * 72;
        const yBot = yTop + 36;
        const insetTop = 10 + i * 4;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
        ctx.beginPath();
        ctx.moveTo(insetTop, yTop);
        ctx.lineTo(WIDTH - insetTop, yTop);
        ctx.lineTo(WIDTH, yBot);
        ctx.lineTo(0, yBot);
        ctx.closePath();
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 290);
      ctx.lineTo(30, 430);
      ctx.moveTo(310, 290);
      ctx.lineTo(330, 430);
      ctx.moveTo(30, 430);
      ctx.lineTo(330, 430);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(115, 256);
      ctx.lineTo(105, 320);
      ctx.moveTo(245, 256);
      ctx.lineTo(255, 320);
      ctx.moveTo(105, 320);
      ctx.lineTo(255, 320);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(SPOT_X, 430, 50, Math.PI * 1.18, Math.PI * 1.82);
      ctx.stroke();

      const wob =
        frameWobbleRef.current > 0
          ? Math.sin(frame * 0.95) * (frameWobbleRef.current / 40) * 4
          : 0;
      ctx.save();
      ctx.translate(wob, 0);

      ctx.fillStyle = 'rgba(241,245,249,0.12)';
      ctx.beginPath();
      ctx.moveTo(POST_LEFT, BAR_Y);
      ctx.lineTo(POST_LEFT + 16, BAR_Y - NET_DEPTH);
      ctx.lineTo(POST_LEFT + 16, LINE_Y - NET_DEPTH);
      ctx.lineTo(POST_LEFT, LINE_Y);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(POST_RIGHT, BAR_Y);
      ctx.lineTo(POST_RIGHT - 16, BAR_Y - NET_DEPTH);
      ctx.lineTo(POST_RIGHT - 16, LINE_Y - NET_DEPTH);
      ctx.lineTo(POST_RIGHT, LINE_Y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(241,245,249,0.14)';
      ctx.fillRect(POST_LEFT + 16, BAR_Y - NET_DEPTH, POST_RIGHT - POST_LEFT - 32, LINE_Y - BAR_Y);

      for (let rIdx = netRipples.length - 1; rIdx >= 0; rIdx--) {
        netRipples[rIdx].life += 1;
        if (netRipples[rIdx].life >= netRipples[rIdx].maxLife) {
          netRipples.splice(rIdx, 1);
        }
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      for (let nx = POST_LEFT + 16; nx <= POST_RIGHT - 16; nx += 10) {
        ctx.beginPath();
        ctx.moveTo(nx, BAR_Y - NET_DEPTH);
        ctx.lineTo(nx, LINE_Y - NET_DEPTH);
        ctx.stroke();
      }
      for (let ny = BAR_Y - NET_DEPTH; ny <= LINE_Y - NET_DEPTH; ny += 8) {
        ctx.beginPath();
        ctx.moveTo(POST_LEFT + 16, ny);
        ctx.lineTo(POST_RIGHT - 16, ny);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.36)';
      for (let nx = POST_LEFT; nx <= POST_RIGHT; nx += 11) {
        ctx.beginPath();
        ctx.moveTo(nx, BAR_Y);
        for (let ny = BAR_Y; ny <= LINE_Y; ny += 7) {
          let waveOffset = 0;
          for (const rip of netRipples) {
            const dist = Math.hypot(nx - rip.x, ny - rip.y);
            const waveProgress = rip.life / rip.maxLife;
            waveOffset +=
              Math.sin(dist * 0.18 - waveProgress * 6) * (1 - waveProgress) * rip.amp * 6;
          }
          ctx.lineTo(nx + waveOffset, ny);
        }
        ctx.stroke();
      }
      for (let ny = BAR_Y; ny <= LINE_Y; ny += 9) {
        ctx.beginPath();
        ctx.moveTo(POST_LEFT, ny);
        ctx.lineTo(POST_RIGHT, ny);
        ctx.stroke();
      }

      const postGrad = ctx.createLinearGradient(POST_LEFT, BAR_Y, POST_RIGHT, BAR_Y);
      postGrad.addColorStop(0, '#cbd5e1');
      postGrad.addColorStop(0.5, '#ffffff');
      postGrad.addColorStop(1, '#cbd5e1');
      ctx.strokeStyle = postGrad;
      ctx.lineWidth = 6;
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
      ctx.restore();

      drawKeeper(keeper.x, keeper.diveDir, phase === 'aim' ? 0 : keeper.progress);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(SPOT_X, SPOT_Y + BALL_R + 3, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      if (phase === 'aim') {
        const aim = effAim();

        ctx.strokeStyle = currentStreak >= 1 ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(SPOT_X, SPOT_Y);
        ctx.lineTo(aim.x, aim.y);
        ctx.stroke();
        ctx.setLineDash([]);

        const power = pw.charging ? pw.value : 0;
        const sweetLo = currentStreak >= 1 ? 0.74 : SWEET_LO;
        const sweetHi = currentStreak >= 1 ? 0.78 : SWEET_HI;
        const chColor = !pw.charging
          ? '#fbbf24'
          : power > OVERHIT
            ? '#ef4444'
            : power >= sweetLo && power <= sweetHi
              ? '#22c55e'
              : power > sweetHi
                ? '#f59e0b'
                : '#94a3b8';

        ctx.strokeStyle = chColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = chColor;
        ctx.shadowBlur = 10;
        const cr = pw.charging ? 11 + Math.sin(frame * 0.35) * 2 : 11;
        ctx.beginPath();
        ctx.arc(aim.x, aim.y, cr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(aim.x - 16, aim.y);
        ctx.lineTo(aim.x + 16, aim.y);
        ctx.moveTo(aim.x, aim.y - 16);
        ctx.lineTo(aim.x, aim.y + 16);
        ctx.stroke();
        ctx.shadowBlur = 0;

        const mx = WIDTH - 26;
        const my = 350;
        const mh = 126;
        const mw = 14;
        ctx.fillStyle = 'rgba(2,6,23,0.85)';
        ctx.beginPath();
        ctx.roundRect(mx - 8, my - 26, mw + 16, mh + 36, 8);
        ctx.fill();

        const zoneY = (v: number) => my + mh - v * mh;

        ctx.fillStyle = 'rgba(148,163,184,0.3)';
        ctx.fillRect(mx, zoneY(sweetLo), mw, sweetLo * mh);

        ctx.fillStyle = 'rgba(34,197,94,0.85)';
        ctx.fillRect(mx, zoneY(sweetHi), mw, (sweetHi - sweetLo) * mh);

        ctx.fillStyle = 'rgba(251,191,36,0.6)';
        ctx.fillRect(mx, zoneY(OVERHIT), mw, (OVERHIT - sweetHi) * mh);

        ctx.fillStyle = 'rgba(239,68,68,0.7)';
        ctx.fillRect(mx, zoneY(1), mw, (1 - OVERHIT) * mh);

        if (pw.charging) {
          const fillH = pw.value * mh;
          const fg = ctx.createLinearGradient(0, my + mh, 0, my);
          fg.addColorStop(0, '#22c55e');
          fg.addColorStop(0.75, '#fbbf24');
          fg.addColorStop(1, '#ef4444');
          ctx.fillStyle = fg;
          ctx.globalAlpha = 0.95;
          ctx.fillRect(mx, my + mh - fillH, mw, fillH);
          ctx.globalAlpha = 1;

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(mx - 4, my + mh - fillH);
          ctx.lineTo(mx + mw + 4, my + mh - fillH);
          ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(mx, my, mw, mh);
        ctx.fillStyle = currentStreak >= 1 ? '#f87171' : '#cbd5e1';
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('POWER', mx + mw / 2, my - 10);
      }

      if (phase === 'flying') {
        const trail = trailRef.current;
        for (let i = 0; i < trail.length; i++) {
          const tp = trail[i];
          const trColor = currentStreak >= 1 ? 'rgba(244,63,94,' : 'rgba(226,232,240,';
          ctx.fillStyle = `${trColor}${(i / trail.length) * tp.alpha})`;
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, tp.r * 0.85, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (ballVisible) {
        const heightAboveGround = Math.max(0, LINE_Y - ballY);
        const shadowScale = clamp(1 - heightAboveGround / 280, 0.35, 1);
        ctx.fillStyle = `rgba(0,0,0,${0.3 * shadowScale})`;
        ctx.beginPath();
        ctx.ellipse(
          ballX,
          ballY + BALL_R * ballScale + 3 + (1 - shadowScale) * 10,
          BALL_R * ballScale * shadowScale * 1.1,
          BALL_R * ballScale * shadowScale * 0.35,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();

        drawSoccerBall(ballX, ballY, BALL_R * ballScale, ballRot);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.98;
        p.life -= 0.02;
        if (p.vRot) p.rot = (p.rot || 0) + p.vRot;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.color;

        if (p.shape === 'square') {
          ctx.save();
          ctx.translate(p.x, p.y);
          if (p.rot) ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = vigGrad;
      ctx.fillRect(-8, -8, WIDTH + 16, HEIGHT + 16);

      if (phase === 'result' && resultRef.current) {
        const outcome = resultRef.current.outcome;
        const t = clamp(resultRef.current.t / 12, 0, 1);
        const pop = easeOutBack(t);
        const isConsecutiveGoal = outcome === 'goal' && streakRef.current >= 2;
        const text =
          outcome === 'goal'
            ? isConsecutiveGoal
              ? 'STREAK GOAL!'
              : 'GOAL!'
            : outcome === 'saved'
              ? 'DENIED!'
              : outcome === 'post'
                ? 'OFF THE POST!'
                : resultRef.current.toY < BAR_Y
                  ? 'OVER THE BAR!'
                  : 'WIDE!';
        const sub =
          outcome === 'goal'
            ? isConsecutiveGoal
              ? 'UNREAL! 2 IN A ROW!'
              : 'What a strike!'
            : outcome === 'saved'
              ? anticipatedRef.current
                ? 'He anticipated your shot!'
                : 'Superhuman fingertip save!'
              : outcome === 'post'
                ? 'Inches away!'
                : 'Ballooned into the crowd.';

        const color =
          outcome === 'goal' ? '#22c55e' : outcome === 'saved' ? '#38bdf8' : '#fbbf24';

        ctx.save();
        ctx.translate(WIDTH / 2, 355);
        ctx.scale(pop, pop);
        ctx.fillStyle = 'rgba(2,6,23,0.88)';
        ctx.beginPath();
        ctx.roundRect(-135, -36, 270, 72, 14);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.font = '900 30px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(text, 0, 4);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '600 12px system-ui, sans-serif';
        ctx.fillText(sub, 0, 24);
        ctx.restore();
      }

      if (levelFlashRef.current) {
        const lf = levelFlashRef.current;
        lf.t += 1;
        const alpha = lf.t < 65 ? 1 : clamp(1 - (lf.t - 65) / 20, 0, 1);
        const pop = easeOutBack(clamp(lf.t / 10, 0, 1));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(WIDTH / 2, 205);
        ctx.scale(pop, pop);
        ctx.fillStyle = 'rgba(2,6,23,0.85)';
        ctx.beginPath();
        ctx.roundRect(-115, -18, 230, 36, 10);
        ctx.fill();
        ctx.fillStyle = '#f472b6';
        ctx.shadowColor = '#f472b6';
        ctx.shadowBlur = 10;
        ctx.font = '900 15px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`LEVEL ${lf.level} — KEEPER SPEED UP`, 0, 6);
        ctx.restore();
        if (lf.t >= 88) levelFlashRef.current = null;
      }

      ctx.fillStyle = 'rgba(2,6,23,0.88)';
      ctx.beginPath();
      ctx.roundRect(10, HEIGHT - 38, WIDTH - 20, 30, 8);
      ctx.fill();
      ctx.strokeStyle = currentStreak >= 1 ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = 'bold 12px "Courier New", Courier, monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#4ade80';
      ctx.fillText(`GOALS ${goalsRef.current}`, 20, HEIGHT - 18);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(`KICKS ${kicksRef.current}`, 102, HEIGHT - 18);

      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`LV ${levelRef.current}`, 182, HEIGHT - 18);

      ctx.textAlign = 'right';
      ctx.fillStyle = currentStreak >= 2 ? '#fbbf24' : '#94a3b8';
      ctx.fillText(
        currentStreak > 0 ? `STREAK x${currentStreak}` : 'STREAK 0',
        WIDTH - 20,
        HEIGHT - 18
      );

      ctx.restore();
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
      <motion.div
        className="absolute inset-0 bg-black/85"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={safeClose}
        data-testid="penalty-backdrop"
      />

      <motion.div
        className="relative z-30 w-full max-w-[360px] my-auto rounded-2xl shadow-2xl overflow-hidden bg-slate-950 border border-slate-700"
        onContextMenu={(e) => e.preventDefault()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800">
          <span className="text-xs font-black tracking-widest text-emerald-400 uppercase">Penalty Kick</span>
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

        <div className="px-3 py-2.5 bg-slate-900/80 border-t border-slate-800 space-y-1.5">
          <button
            type="button"
            onClick={quickShot}
            className="w-full py-2.5 min-h-[48px] rounded-xl text-white text-sm font-black tracking-widest uppercase transition-all touch-manipulation bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400"
            data-testid="penalty-kick"
          >
            Kick
          </button>
          <div className="text-center">
            <span className="text-[10px] text-slate-400">
              {isTouchDevice
                ? 'Hold & drag to aim, release to shoot · Green zone = sweet spot'
                : 'Aim with mouse/arrows · Hold Space/click to charge, release to shoot · Green = sweet spot'}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
