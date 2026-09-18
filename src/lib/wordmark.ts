/**
 * The FourSets wordmark, drawn rather than typeset.
 *
 * A small modular display alphabet: vertical stems, horizontal bars and
 * quarter-ring bowls on a 100-unit cap height, with every open terminal sheared
 * at 45 degrees. Bowls are true circles; S and s are built from flat bars, so
 * the mark carries both the geometric and the angular half of the identity.
 * Glyphs are emitted as individual paths so the wordmark can be revealed
 * letter by letter.
 */

const CAP = 100;
const XH = 80;
/** Bowl geometry: circular, centred on the baseline-relative x-height. */
const R = XH / 2;
const CY = CAP - R;
const STEM = 23;
const BAR = 20;
const BOWL_STROKE = 21;
const RI = R - BOWL_STROKE;
/** Lowercase runs marginally lighter than the caps. */
const LSTEM = 21;
const LBAR = 18;

const n = (v: number) => Math.round(v * 100) / 100;

/** Axis-aligned rectangle, wound clockwise. */
const rect = (x: number, y: number, w: number, h: number) =>
  `M${n(x)},${n(y)}H${n(x + w)}V${n(y + h)}H${n(x)}Z`;

/** Horizontal bar with one end sheared at 45 degrees. `cut` is -1 left, 1 right. */
function shearBar(x: number, y: number, w: number, h: number, cut: 1 | -1) {
  return cut === 1
    ? `M${n(x)},${n(y)}H${n(x + w)}L${n(x + w - h)},${n(y + h)}H${n(x)}Z`
    : `M${n(x + h)},${n(y)}H${n(x + w)}V${n(y + h)}H${n(x)}Z`;
}

type Quad = 'tl' | 'tr' | 'bl' | 'br';

/**
 * One quarter of a ring. Quarter-rings union into bowls without needing
 * counter-winding, and can be omitted to open an aperture.
 */
function quarterRing(cx: number, cy: number, ro: number, ri: number, q: Quad) {
  const P = {
    top: [cx, cy - ro],
    right: [cx + ro, cy],
    bottom: [cx, cy + ro],
    left: [cx - ro, cy],
    iTop: [cx, cy - ri],
    iRight: [cx + ri, cy],
    iBottom: [cx, cy + ri],
    iLeft: [cx - ri, cy],
  } as const;
  const arc = (r: number, sweep: 0 | 1, p: readonly number[]) =>
    `A${n(r)},${n(r)} 0 0,${sweep} ${n(p[0])},${n(p[1])}`;

  switch (q) {
    case 'tl':
      return `M${n(P.left[0])},${n(P.left[1])}${arc(ro, 1, P.top)}L${n(P.iTop[0])},${n(P.iTop[1])}${arc(ri, 0, P.iLeft)}Z`;
    case 'tr':
      return `M${n(P.top[0])},${n(P.top[1])}${arc(ro, 1, P.right)}L${n(P.iRight[0])},${n(P.iRight[1])}${arc(ri, 0, P.iTop)}Z`;
    case 'br':
      return `M${n(P.bottom[0])},${n(P.bottom[1])}${arc(ro, 0, P.right)}L${n(P.iRight[0])},${n(P.iRight[1])}${arc(ri, 1, P.iBottom)}Z`;
    case 'bl':
      return `M${n(P.left[0])},${n(P.left[1])}${arc(ro, 0, P.bottom)}L${n(P.iBottom[0])},${n(P.iBottom[1])}${arc(ri, 1, P.iLeft)}Z`;
  }
}

/** Arc segment of a ring between two angles, with straight radial terminals. */
function ringSegment(cx: number, cy: number, ro: number, ri: number, a0: number, a1: number) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const p = (r: number, a: number) => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))];
  const o0 = p(ro, a0);
  const o1 = p(ro, a1);
  const i1 = p(ri, a1);
  const i0 = p(ri, a0);
  const sweep = a1 > a0 ? 1 : 0;
  const back: 0 | 1 = sweep === 1 ? 0 : 1;
  return (
    `M${n(o0[0])},${n(o0[1])}A${n(ro)},${n(ro)} 0 0,${sweep} ${n(o1[0])},${n(o1[1])}` +
    `L${n(i1[0])},${n(i1[1])}A${n(ri)},${n(ri)} 0 0,${back} ${n(i0[0])},${n(i0[1])}Z`
  );
}

interface Glyph {
  d: string;
  width: number;
}

const GLYPHS: Record<string, Glyph> = {
  F: {
    width: 66,
    d: [rect(0, 0, STEM, CAP), shearBar(STEM, 0, 66 - STEM, BAR, 1), shearBar(STEM, 40, 60 - STEM, BAR, 1)].join(''),
  },
  o: {
    width: XH,
    d: (['tl', 'tr', 'br', 'bl'] as Quad[]).map((q) => quarterRing(R, CY, R, RI, q)).join(''),
  },
  u: {
    width: XH,
    d: [
      rect(0, CAP - XH, STEM, R),
      rect(XH - STEM, CAP - XH, STEM, R),
      quarterRing(R, CY, R, R - STEM, 'bl'),
      quarterRing(R, CY, R, R - STEM, 'br'),
    ].join(''),
  },
  r: {
    width: 62,
    d: [rect(0, CAP - XH, STEM, XH), shearBar(STEM, CAP - XH, 62 - STEM, BAR, 1)].join(''),
  },
  S: {
    width: 70,
    d: [
      shearBar(0, 0, 70, BAR, 1),
      rect(0, 0, STEM, 48),
      rect(0, 40, 70, BAR),
      rect(70 - STEM, 52, STEM, 48),
      shearBar(0, CAP - BAR, 70, BAR, -1),
    ].join(''),
  },
  e: {
    width: XH,
    d: [
      quarterRing(R, CY, R, RI, 'tl'),
      quarterRing(R, CY, R, RI, 'tr'),
      quarterRing(R, CY, R, RI, 'bl'),
      rect(10, CY - 6, 67, 18),
      ringSegment(R, CY, R, RI, 90, 41),
    ].join(''),
  },
  t: {
    width: 70,
    d: [
      rect(20, 2, STEM, CAP - 2),
      rect(0, 26, 63, BAR),
      `M43,80H60L70,90V100H43Z`,
    ].join(''),
  },
  s: {
    width: 62,
    d: [
      shearBar(0, CAP - XH, 62, LBAR, 1),
      rect(0, CAP - XH, LSTEM, 38),
      rect(0, 51, 62, LBAR),
      rect(62 - LSTEM, 62, LSTEM, 38),
      shearBar(0, CAP - LBAR, 62, LBAR, -1),
    ].join(''),
  },
};

/** Optical corrections for specific pairs, in wordmark units. */
const KERN: Record<string, number> = {
  Fo: -3,
  rS: -2,
  ts: -3,
  ur: -1,
};

const TRACK = 10;

export interface PlacedGlyph {
  char: string;
  d: string;
  x: number;
  width: number;
}

export interface Wordmark {
  glyphs: PlacedGlyph[];
  width: number;
  height: number;
  viewBox: string;
}

export function buildWordmark(text = 'FourSets'): Wordmark {
  const glyphs: PlacedGlyph[] = [];
  let x = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const g = GLYPHS[char];
    if (!g) continue;
    if (i > 0) x += TRACK + (KERN[text[i - 1] + char] ?? 0);
    glyphs.push({ char, d: g.d, x, width: g.width });
    x += g.width;
  }
  return { glyphs, width: x, height: CAP, viewBox: `0 -2 ${x} ${CAP + 2}` };
}

export const WORDMARK = buildWordmark();
