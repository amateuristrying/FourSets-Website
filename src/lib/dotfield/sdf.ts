/**
 * Signed distance to a tapered capsule ("round cone") in 2D.
 * Adapted from Inigo Quilez's analytic round-cone distance, ported to scalars.
 * Returns negative values inside the shape.
 */
export function sdRoundCone(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  ra: number,
  rb: number,
): number {
  const bax = bx - ax;
  const bay = by - ay;
  const l2 = bax * bax + bay * bay;

  if (l2 < 1e-6) {
    const dx = px - ax;
    const dy = py - ay;
    return Math.sqrt(dx * dx + dy * dy) - Math.max(ra, rb);
  }

  const rr = ra - rb;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;

  const pax = px - ax;
  const pay = py - ay;
  const y = pax * bax + pay * bay;
  const z = y - l2;

  const cx = pax * l2 - bax * y;
  const cy = pay * l2 - bay * y;
  const x2 = cx * cx + cy * cy;
  const y2 = y * y * l2;
  const z2 = z * z * l2;

  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - rb;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - ra;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - ra;
}
