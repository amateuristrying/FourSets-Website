export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** Frame-rate independent exponential approach factor. */
export function approach(rate: number, dt: number) {
  return 1 - Math.pow(1 - rate, dt * 60);
}

/** Deterministic 2D hash -> [0,1). */
export function hash2(x: number, y: number) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise on a 2D lattice. */
export function valueNoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

/**
 * Periodic Catmull-Rom interpolation across an evenly spaced keyframe ring.
 * `phase` is normalised 0..1 and wraps.
 */
export function cyclicSpline(keys: number[], phase: number) {
  const n = keys.length;
  const p = ((phase % 1) + 1) % 1;
  const f = p * n;
  const i = Math.floor(f);
  const t = f - i;
  const k = (j: number) => keys[((j % n) + n) % n];
  const p0 = k(i - 1);
  const p1 = k(i);
  const p2 = k(i + 1);
  const p3 = k(i + 2);
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}
