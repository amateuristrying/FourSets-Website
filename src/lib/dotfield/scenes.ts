import { clamp, smoothstep, valueNoise } from './math';
import { runnerJoints, strikePhase, warpPhase, type Joints } from './gait';
import type { LimbList, Scene, SceneContext } from './types';

/** Limb thicknesses in stature units: [start radius, end radius]. */
const R = {
  torso: [0.048, 0.062],
  /* Thin neck: the head has to read as a separate mass above the shoulders. */
  neck: [0.02, 0.026],
  head: 0.055,
  thigh: [0.04, 0.03],
  shin: [0.03, 0.021],
  foot: [0.02, 0.012],
  upper: [0.034, 0.026],
  fore: [0.026, 0.02],
  hand: 0.026,
} as const;

/** Emits one skeleton into the limb buffer, mapped from stature units to canvas. */
function emitFigure(
  out: LimbList,
  j: Joints,
  cx: number,
  groundY: number,
  S: number,
  farScale = 0.88,
) {
  const X = (v: number) => cx + v * S;
  const Y = (v: number) => groundY - v * S;

  // Far side first so the near side wins wherever they overlap.
  for (let i = 1; i >= 0; i--) {
    const s = j.side[i];
    const k = s.depth === 1 ? 1 : farScale;
    const d = s.depth;
    out.add(X(s.hipX), Y(s.hipY), X(s.kneeX), Y(s.kneeY), R.thigh[0] * S * k, R.thigh[1] * S * k, d);
    out.add(X(s.kneeX), Y(s.kneeY), X(s.ankleX), Y(s.ankleY), R.shin[0] * S * k, R.shin[1] * S * k, d);
    out.add(X(s.ankleX), Y(s.ankleY), X(s.toeX), Y(s.toeY), R.foot[0] * S * k, R.foot[1] * S * k, d);

    if (i === 1) {
      // Trunk sits between the two limb pairs.
      out.add(X(j.hipX), Y(j.hipY), X(j.shoulderX), Y(j.shoulderY), R.torso[0] * S, R.torso[1] * S, 1);
      out.add(X(j.shoulderX), Y(j.shoulderY), X(j.neckX), Y(j.neckY), R.neck[0] * S, R.neck[1] * S, 1);
      out.circle(X(j.headX), Y(j.headY), R.head * S, 1);
    }

    out.add(
      X(s.shoulderX),
      Y(s.shoulderY),
      X(s.elbowX),
      Y(s.elbowY),
      R.upper[0] * S * k,
      R.upper[1] * S * k,
      d,
    );
    out.add(X(s.elbowX), Y(s.elbowY), X(s.wristX), Y(s.wristY), R.fore[0] * S * k, R.fore[1] * S * k, d);
    out.circle(X(s.handX), Y(s.handY), R.hand * S * k, d);
  }
}

export interface RunnerSceneOptions {
  /** Stride cycles per second at rest. */
  cadence?: number;
  /** Stature as a fraction of canvas height / width, whichever binds first. */
  heightRatio?: number;
  widthRatio?: number;
  /** Width fraction used on narrow viewports, where height is plentiful. */
  narrowWidthRatio?: number;
  /** Lattice pitch as a fraction of viewport width, then clamped. */
  pitch?: [divisor: number, min: number, max: number];
  /** Freezes the stride at this phase. Used by the gait harness. */
  phase?: number;
}

/**
 * The hero: a single runner, continuously striding, dissolved into the lattice.
 * The figure itself holds position while the density field streams past, so the
 * runner reads as travelling through space rather than sliding across a poster.
 */
export function runnerScene(opts: RunnerSceneOptions = {}): Scene {
  const cadence = opts.cadence ?? 0.85;
  const heightRatio = opts.heightRatio ?? 0.82;
  const widthRatio = opts.widthRatio ?? 0.62;
  const narrowWidthRatio = opts.narrowWidthRatio ?? 0.84;
  const pitch = opts.pitch ?? ([62, 12, 25] as const);

  let phase = 0.25;
  let lastStrike = -1;
  const impact = { x: 0, y: 0, age: 9 };
  const joints = runnerJoints(phase);

  const stature = (w: number, h: number) =>
    Math.min(h * heightRatio, w * (w < 760 ? narrowWidthRatio : widthRatio));

  return {
    spacing(w) {
      // Pitch tracks the viewport, so dots stay the same physical size while
      // the figure's dot count adapts to the space available.
      return clamp(w / pitch[0], pitch[1], pitch[2]);
    },

    build(out, ctx) {
      const S = stature(ctx.w, ctx.h);
      if (opts.phase === undefined) {
        // Scroll gives the stride a touch more urgency without breaking the loop.
        phase += ctx.dt * cadence * (1 + ctx.velocity * 0.55);
        if (phase > 1) phase -= Math.floor(phase);
      } else {
        phase = opts.phase;
      }

      runnerJoints(warpPhase(phase), 1, joints);

      const cx = ctx.w * 0.485 + Math.sin(ctx.t * 0.11) * ctx.w * 0.012;
      const groundY = ctx.h * 0.5 + S * 0.43;
      emitFigure(out, joints, cx, groundY, S);

      // Ground-impact ring, fired once per foot strike.
      const idx = Math.floor(phase * 2) % 2;
      if (strikePhase(phase) > 0.85 && idx !== lastStrike) {
        lastStrike = idx;
        const s = joints.side[idx];
        impact.x = cx + s.ankleX * S;
        impact.y = groundY - s.ankleY * S * 0.35;
        impact.age = 0;
      }
      impact.age += ctx.dt;
    },

    energy(x, y, ctx) {
      const age = impact.age;
      if (age > 0.75) return 0;
      const life = age / 0.75;
      const radius = life * ctx.spacing * 7.5;
      const dx = x - impact.x;
      const dy = (y - impact.y) * 1.9;
      const d = Math.abs(Math.hypot(dx, dy) - radius);
      return smoothstep(ctx.spacing * 1.1, 0, d) * (1 - life) * 0.42;
    },

    mask(gx, gy, nx, ny, seed, ctx) {
      // The field is an ellipse measured against the figure, not the canvas, so
      // the composition holds its proportions at every viewport size.
      const S = stature(ctx.w, ctx.h);
      const dx = (nx * ctx.w) / (2.3 * S);
      const dy = (ny * ctx.h) / (1.25 * S);
      let m = 1 - smoothstep(0.48, 1.0, Math.hypot(dx, dy));
      if (m <= 0.002) return 0;
      // Density pattern streams leftward: the space moves, the runner holds.
      const n = valueNoise(gx * 0.18 - ctx.t * 0.24, gy * 0.18 + 3.1);
      m = clamp(m * (0.62 + 0.76 * n));
      return m > seed * 0.6 ? m : 0;
    },

    style: {
      dilate: 0.22,
      rim: 0.5,
      attack: 0.52,
      advect: 0.55,
      decay: 0.1,
      outlineAlpha: 0.46,
      fillMax: 0.47,
      fillMin: 0.16,
      outlineR: 0.43,
      sparkle: 0.045,
      drift: 0.04,
    },
  };
}

export interface ProgressionSceneOptions {
  /** Stride amplitude for each figure, left to right. */
  stages?: number[];
}

/**
 * Transformations: the same skeleton at rising stride amplitude and cadence.
 * Scroll progress drives the whole row from held stillness into full flight.
 */
export function progressionScene(opts: ProgressionSceneOptions = {}): Scene {
  const stages = opts.stages ?? [0.08, 0.52, 1];
  const phases = stages.map((_, i) => 0.25 + i * 0.25);
  const joints = stages.map(() => runnerJoints(0));

  const stature = (w: number, h: number) => Math.min(h * 0.68, (w / stages.length) * 0.62);

  return {
    spacing(w) {
      return clamp(w / 78, 11, 18);
    },

    build(out, ctx) {
      const S = stature(ctx.w, ctx.h);
      const slot = ctx.w / stages.length;
      const drive = 0.25 + 0.75 * smoothstep(0.05, 0.75, ctx.progress);

      for (let i = 0; i < stages.length; i++) {
        const amp = stages[i] * drive;
        phases[i] += ctx.dt * (0.2 + stages[i] * 0.72) * drive;
        if (phases[i] > 1) phases[i] -= Math.floor(phases[i]);
        runnerJoints(warpPhase(phases[i]), amp, joints[i]);
        const cx = slot * (i + 0.5);
        emitFigure(out, joints[i], cx, ctx.h * 0.5 + S * 0.46, S, 0.8);
      }
    },

    mask(gx, gy, nx, ny, seed, ctx) {
      const r = Math.hypot(nx * 0.92, ny * 1.02);
      let m = 1 - smoothstep(0.42, 1.04, r);
      if (m <= 0.002) return 0;
      const n = valueNoise(gx * 0.22 + ctx.t * 0.1, gy * 0.22 + 11.7);
      m = clamp(m * (0.3 + 1.1 * n));
      return m > seed * 1.15 ? m * 0.8 : 0;
    },

    style: {
      dilate: 0.28,
      rim: 0.5,
      advect: 0.58,
      decay: 0.085,
      outlineAlpha: 0.3,
      fillMax: 0.42,
      fillMin: 0.14,
      outlineR: 0.4,
      sparkle: 0.03,
      drift: 0.03,
      opacity: 0.92,
    },
  };
}

/**
 * Mission: a measurement lattice. A slow scan bar crosses the four columns of
 * the method grid and leaves a decaying trace, which is the whole idea of the
 * section rendered as texture. Deliberately quiet — it sits under type.
 */
export function latticeScene(): Scene {
  return {
    spacing(w) {
      return clamp(w / 54, 16, 28);
    },

    build() {
      /* No subject here: the scan bar in energy() is the whole event. */
    },

    energy(x, y, ctx) {
      const sweep = ((ctx.t * 0.1) % 1.5) - 0.25;
      const bar = smoothstep(ctx.spacing * 2.2, 0, Math.abs(x - sweep * ctx.w));
      if (bar <= 0) return 0;
      // The bar reads strongest across the middle of the band, and fades into
      // the field's own edges rather than lighting a hard line at the boundary.
      const fall = 1 - smoothstep(0.25, 0.95, Math.abs(y / ctx.h - 0.5) * 2);
      const edge = 1 - smoothstep(0.74, 1, Math.abs((x / ctx.w) * 2 - 1));
      return bar * fall * edge * 0.42;
    },

    mask(gx, gy, nx, ny, seed, ctx) {
      const edge =
        (1 - smoothstep(0.84, 1.02, Math.abs(nx))) * (1 - smoothstep(0.62, 1.02, Math.abs(ny)));
      const n = valueNoise(gx * 0.13 + ctx.t * 0.04, gy * 0.13 + 22.3);
      const m = clamp(edge * (0.34 + 0.9 * n));
      return m > seed * 1.05 ? m * 0.8 : 0;
    },

    style: {
      dilate: 0.2,
      rim: 0.45,
      advect: 0.5,
      decay: 0.045,
      outlineAlpha: 0.26,
      fillMax: 0.34,
      fillMin: 0.1,
      outlineR: 0.4,
      sparkle: 0.015,
      drift: 0.02,
    },
  };
}

/**
 * Ambient wash for editorial sections: no figure at all, just the lattice
 * breathing through a slow travelling swell. Pure texture, never a subject.
 */
export function driftScene(opts: { density?: number } = {}): Scene {
  const density = opts.density ?? 1;
  return {
    spacing(w) {
      return clamp(w / 34, 20, 34);
    },

    build() {
      /* intentionally empty: the wash is mask-driven */
    },

    mask(gx, gy, nx, ny, seed, ctx) {
      const edge =
        (1 - smoothstep(0.32, 1.04, Math.abs(nx))) * (1 - smoothstep(0.28, 1.04, Math.abs(ny)));
      if (edge <= 0.002) return 0;
      const swell = 0.5 + 0.5 * Math.sin(ctx.t * 0.22 - gx * 0.24 + gy * 0.12);
      const n = valueNoise(gx * 0.15 - ctx.t * 0.06, gy * 0.15 + 41.5);
      const m = clamp(edge * (0.18 + 0.9 * n) * (0.55 + 0.7 * swell) * density);
      return m > seed * 1.45 ? m * 0.7 : 0;
    },

    style: {
      dilate: 0.2,
      rim: 0.6,
      decay: 0.04,
      outlineAlpha: 0.3,
      fillMax: 0.3,
      sparkle: 0.05,
      drift: 0.06,
      outlineR: 0.38,
    },
  };
}

export type { Scene, SceneContext };
