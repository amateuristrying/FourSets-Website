/** A tapered capsule in canvas space. Circles are capsules where a == b. */
export interface Limb {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  ra: number;
  rb: number;
  /** 0 = far side of the body (renders dimmer), 1 = near side. */
  depth: number;
}

/** Growable, allocation-free limb buffer handed to scenes each frame. */
export class LimbList {
  items: Limb[] = [];
  count = 0;

  reset() {
    this.count = 0;
  }

  add(ax: number, ay: number, bx: number, by: number, ra: number, rb: number, depth = 1) {
    let it = this.items[this.count];
    if (!it) {
      it = { ax, ay, bx, by, ra, rb, depth };
      this.items.push(it);
    } else {
      it.ax = ax;
      it.ay = ay;
      it.bx = bx;
      it.by = by;
      it.ra = ra;
      it.rb = rb;
      it.depth = depth;
    }
    this.count++;
  }

  circle(x: number, y: number, r: number, depth = 1) {
    this.add(x, y, x, y, r, r, depth);
  }
}

export interface SceneContext {
  /** Seconds since the field started. */
  t: number;
  /** Delta seconds, clamped. */
  dt: number;
  /** Canvas size in CSS pixels. */
  w: number;
  h: number;
  /** Lattice pitch in CSS pixels. */
  spacing: number;
  /** 0..1 progress of the host section through the viewport. */
  progress: number;
  /** Normalised scroll velocity, 0..1. */
  velocity: number;
}

export interface DotStyle {
  /** Base ink colour as "r,g,b". */
  ink: string;
  /** Dot radius as a fraction of lattice pitch. */
  fillMin: number;
  fillMax: number;
  outlineR: number;
  lineWidth: number;
  /**
   * Shape dilation before sampling, as a fraction of the lattice pitch.
   * Without it, a limb thinner than the pitch can slip between lattice points
   * and vanish; with it, any cell the body passes close to lights up.
   */
  dilate: number;
  /** Partial-activation band beyond the dilated edge, as a fraction of pitch. */
  rim: number;
  attack: number;
  decay: number;
  /** Leftward energy smear: 0 = none, 0.9 = long trail. */
  advect: number;
  outlineAlpha: number;
  /** Fraction of field cells that render as dim solids instead of outlines. */
  sparkle: number;
  /** Lattice jitter for low-energy dots, as a fraction of pitch. */
  drift: number;
  /** Global multiplier, used for scroll-driven fades. */
  opacity: number;
}

export const defaultStyle: DotStyle = {
  ink: '232,255,107',
  fillMin: 0.2,
  fillMax: 0.46,
  outlineR: 0.36,
  lineWidth: 1,
  dilate: 0.4,
  rim: 0.55,
  attack: 0.42,
  decay: 0.07,
  advect: 0.7,
  outlineAlpha: 0.5,
  sparkle: 0.06,
  drift: 0.05,
  opacity: 1,
};

export interface Scene {
  /** Lattice pitch for the current box. */
  spacing(w: number, h: number): number;
  /** Push this frame's shapes into `out`. */
  build(out: LimbList, ctx: SceneContext): void;
  /**
   * Base field density for a lattice cell.
   * gx/gy are integer cell indices, nx/ny are -1..1 normalised positions and
   * `seed` is a stable per-cell random used to ragged-edge the field.
   */
  mask(gx: number, gy: number, nx: number, ny: number, seed: number, ctx: SceneContext): number;
  /** Optional extra activation in canvas space, e.g. impact rings or scan beams. */
  energy?(x: number, y: number, ctx: SceneContext): number;
  style?: Partial<DotStyle>;
}
