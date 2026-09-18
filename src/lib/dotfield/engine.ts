import { approach, clamp, hash2, smoothstep } from './math';
import { sdRoundCone } from './sdf';
import { LimbList, defaultStyle, type DotStyle, type Scene, type SceneContext } from './types';

const FILL_BUCKETS = 12;
const STROKE_BUCKETS = 6;
const MAX_DPR = 2;

/**
 * Lattice-based dot renderer.
 *
 * A fixed grid of cells samples the signed distance to the scene's shapes each
 * frame. Cells inside a shape charge up quickly and discharge slowly, so motion
 * leaves a wake: dots appear to be assembled by the body sweeping through them.
 * Energy is also advected against the direction of travel, which smears the
 * wake behind the subject and reads as movement through space.
 */
export class DotField {
  private ctx: CanvasRenderingContext2D;
  private scene: Scene;
  private style: DotStyle;

  private w = 0;
  private h = 0;
  private dpr = 1;
  private spacing = 24;
  private cols = 0;
  private rows = 0;
  private originX = 0;
  private originY = 0;

  private energy = new Float32Array(0);
  private next = new Float32Array(0);
  private seed = new Float32Array(0);

  private limbs = new LimbList();
  private raf = 0;
  private last = 0;
  private time = 0;
  private running = false;
  private visible = true;

  progress = 0;
  velocity = 0;

  private fillPaths: Path2D[] = [];
  private strokePaths: Path2D[] = [];
  private bounds = new Float32Array(0);

  constructor(
    private canvas: HTMLCanvasElement,
    scene: Scene,
  ) {
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('2d context unavailable');
    this.ctx = ctx;
    this.scene = scene;
    this.style = { ...defaultStyle, ...scene.style };
  }

  setScene(scene: Scene) {
    this.scene = scene;
    this.style = { ...defaultStyle, ...scene.style };
    this.resize();
  }

  setStyle(patch: Partial<DotStyle>) {
    this.style = { ...this.style, ...patch };
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    if (w === this.w && h === this.h && dpr === this.dpr) return;

    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.spacing = this.scene.spacing(w, h);
    this.cols = Math.ceil(w / this.spacing) + 2;
    this.rows = Math.ceil(h / this.spacing) + 2;

    // Centre the lattice so it stays symmetrical about the canvas.
    this.originX = (w - (this.cols - 1) * this.spacing) / 2;
    this.originY = (h - (this.rows - 1) * this.spacing) / 2;

    const n = this.cols * this.rows;
    if (this.energy.length !== n) {
      this.energy = new Float32Array(n);
      this.next = new Float32Array(n);
      this.seed = new Float32Array(n);
    }
    for (let gy = 0, i = 0; gy < this.rows; gy++) {
      for (let gx = 0; gx < this.cols; gx++, i++) {
        this.seed[i] = hash2(gx + 17, gy + 31);
      }
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const dt = clamp((now - this.last) / 1000, 0, 1 / 20);
      this.last = now;
      if (!this.visible) return;
      this.time += dt;
      this.render(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  setVisible(v: boolean) {
    if (v === this.visible) return;
    this.visible = v;
    // Only rebase the clock on an actual resume, so repeat calls from the
    // scroll loop cannot keep dt pinned at zero.
    if (v) this.last = performance.now();
  }

  /** Renders a single frame without advancing the clock (used for reduced motion). */
  renderStill(t = 1.2) {
    this.time = t;
    for (let k = 0; k < 8; k++) this.render(1 / 60);
  }

  private render(dt: number) {
    const { style, cols, rows, spacing } = this;
    const sc: SceneContext = {
      t: this.time,
      dt,
      w: this.w,
      h: this.h,
      spacing,
      progress: this.progress,
      velocity: this.velocity,
    };

    this.limbs.reset();
    this.scene.build(this.limbs, sc);
    const limbs = this.limbs.items;
    const count = this.limbs.count;

    // Per-shape bounds for cheap rejection in the sampling loop.
    if (this.bounds.length < count * 4) this.bounds = new Float32Array(count * 8);
    const bb = this.bounds;
    const pad = (style.dilate + style.rim + 1) * spacing;
    for (let s = 0; s < count; s++) {
      const L = limbs[s];
      const r = (L.ra > L.rb ? L.ra : L.rb) + pad;
      const o = s * 4;
      bb[o] = Math.min(L.ax, L.bx) - r;
      bb[o + 1] = Math.max(L.ax, L.bx) + r;
      bb[o + 2] = Math.min(L.ay, L.by) - r;
      bb[o + 3] = Math.max(L.ay, L.by) + r;
    }

    const attackK = approach(style.attack, dt);
    const decayK = approach(style.decay, dt);
    const dilate = style.dilate * spacing;
    const band = dilate + style.rim * spacing;

    const energy = this.energy;
    const next = this.next;
    const boost = this.scene.energy?.bind(this.scene);

    for (let gy = 0, i = 0; gy < rows; gy++) {
      const y = this.originY + gy * spacing;
      for (let gx = 0; gx < cols; gx++, i++) {
        const x = this.originX + gx * spacing;

        let best = 1e9;
        let depth = 1;
        for (let s = 0; s < count; s++) {
          const o = s * 4;
          if (x < bb[o] || x > bb[o + 1] || y < bb[o + 2] || y > bb[o + 3]) continue;
          const L = limbs[s];
          const d = sdRoundCone(x, y, L.ax, L.ay, L.bx, L.by, L.ra, L.rb);
          if (d < best) {
            best = d;
            depth = L.depth;
          }
        }

        let target = 0;
        if (best < band) {
          target = best <= dilate ? 1 : smoothstep(band, dilate, best) * 0.46;
          // Far-side limbs charge less, so the figure reads with depth.
          target *= 0.62 + 0.38 * depth;
        }
        if (boost) {
          const extra = boost(x, y, sc);
          if (extra > target) target = extra;
        }

        const prev = energy[i];
        // Advect from the neighbour ahead so the wake trails behind the subject.
        const ahead = gx < cols - 1 ? energy[i + 1] : 0;
        const cand = Math.max(target, ahead * style.advect);
        next[i] = prev + (cand - prev) * (cand > prev ? attackK : decayK);
      }
    }

    // Swap buffers.
    this.energy = next;
    this.next = energy;

    this.draw(sc);
  }

  private draw(sc: SceneContext) {
    const { ctx, style, cols, rows, spacing } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    if (style.opacity <= 0.002) return;

    for (let b = 0; b < FILL_BUCKETS; b++) this.fillPaths[b] = new Path2D();
    for (let b = 0; b < STROKE_BUCKETS; b++) this.strokePaths[b] = new Path2D();

    const energy = this.energy;
    const seed = this.seed;
    const halfW = (cols - 1) / 2;
    const halfH = (rows - 1) / 2;
    const drift = style.drift * spacing;
    const t = sc.t;

    for (let gy = 0, i = 0; gy < rows; gy++) {
      const ny = (gy - halfH) / halfH;
      for (let gx = 0; gx < cols; gx++, i++) {
        const nx = (gx - halfW) / halfW;
        const s = seed[i];
        const m = this.scene.mask(gx, gy, nx, ny, s, sc);
        const e = energy[i];

        if (m <= 0.001 && e <= 0.01) continue;

        let x = this.originX + gx * spacing;
        let y = this.originY + gy * spacing;

        if (drift > 0 && e < 0.4 && s > 0.55) {
          const ph = s * 6.2831853;
          x += Math.sin(t * 0.45 + ph) * drift;
          y += Math.cos(t * 0.37 + ph * 1.7) * drift;
        }

        if (e > 0.015) {
          const ease = e * e * (3 - 2 * e);
          const r = spacing * (style.fillMin + (style.fillMax - style.fillMin) * ease);
          const a = clamp(e * 1.12) * style.opacity;
          if (a > 0.02 && r > 0.1) {
            const b = Math.min(FILL_BUCKETS - 1, (a * FILL_BUCKETS) | 0);
            const p = this.fillPaths[b];
            p.moveTo(x + r, y);
            p.arc(x, y, r, 0, 6.2831853);
          }
        }

        if (m > 0.02 && e < 0.9) {
          const vis = m * (1 - e);
          if (s < style.sparkle && m > 0.55) {
            // A scatter of solid dots keeps the resting field from looking mechanical.
            const r = spacing * style.fillMin * 0.9;
            const a = clamp(vis * 0.5) * style.opacity;
            const b = Math.min(FILL_BUCKETS - 1, (a * FILL_BUCKETS) | 0);
            const p = this.fillPaths[b];
            p.moveTo(x + r, y);
            p.arc(x, y, r, 0, 6.2831853);
          } else {
            const a = clamp(vis * style.outlineAlpha) * style.opacity;
            if (a > 0.015) {
              const r = spacing * style.outlineR;
              const b = Math.min(STROKE_BUCKETS - 1, (a * STROKE_BUCKETS) | 0);
              const p = this.strokePaths[b];
              p.moveTo(x + r, y);
              p.arc(x, y, r, 0, 6.2831853);
            }
          }
        }
      }
    }

    ctx.lineWidth = style.lineWidth;
    for (let b = 0; b < STROKE_BUCKETS; b++) {
      const a = (b + 0.6) / STROKE_BUCKETS;
      ctx.strokeStyle = `rgba(${style.ink},${a.toFixed(3)})`;
      ctx.stroke(this.strokePaths[b]);
    }
    for (let b = 0; b < FILL_BUCKETS; b++) {
      const a = (b + 0.7) / FILL_BUCKETS;
      ctx.fillStyle = `rgba(${style.ink},${a.toFixed(3)})`;
      ctx.fill(this.fillPaths[b]);
    }
  }
}
