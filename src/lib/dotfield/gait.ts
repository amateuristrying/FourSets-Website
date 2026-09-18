import { DEG, cyclicSpline, lerp } from './math';

/**
 * Art-directed running cycle.
 *
 * Every channel is an absolute segment angle in degrees, measured from the
 * downward vertical, positive towards the direction of travel. Absolute angles
 * (rather than joint flexions) let the stride be tuned by eye while keeping
 * anatomically valid knee and elbow bends. Eight keys per cycle are read back
 * through a periodic Catmull-Rom spline, so the figure never "switches" poses —
 * it moves continuously through the whole stride.
 *
 * Cycle landmarks for the tracked leg:
 *   0.000 foot strike      0.125 mid stance     0.250 toe off
 *   0.375 trail extended   0.500 heel fold      0.625 knee drive
 *   0.750 peak drive       0.875 forward reach
 */
const THIGH = [30, 2, -34, -30, 18, 58, 72, 52];
const SHIN = [10, -14, -46, -70, -112, -30, 20, 34];
const FOOT = [102, 86, 22, -10, -30, 60, 110, 112];

/**
 * Arm channels are already phase-opposed to the leg on the same side: at foot
 * strike, when that leg is in front, its arm is at the back of its swing.
 * The elbow opens almost straight through the back of the swing and folds to
 * bring the hand up past the chest at the front.
 */
const UPPER_ARM = [-52, -64, -34, 0, 24, 10, -24, -44];
const FORE_ARM = [-25, -46, 10, 78, 118, 104, 52, 0];

/** Relaxed standing pose. Stride amplitude blends between this and the cycle. */
const REST = { thigh: 2, shin: -3, foot: 93, upper: -7, fore: 42 };

export interface Joints {
  hipX: number;
  hipY: number;
  shoulderX: number;
  shoulderY: number;
  neckX: number;
  neckY: number;
  headX: number;
  headY: number;
  side: SideJoints[];
}

export interface SideJoints {
  /** 1 = near side, 0 = far side. */
  depth: number;
  z: number;
  hipX: number;
  hipY: number;
  kneeX: number;
  kneeY: number;
  ankleX: number;
  ankleY: number;
  toeX: number;
  toeY: number;
  shoulderX: number;
  shoulderY: number;
  elbowX: number;
  elbowY: number;
  wristX: number;
  wristY: number;
  handX: number;
  handY: number;
}

/** Proportions in stature units. Sums to ~1.0 from sole to crown. */
export const PROPORTIONS = {
  torso: 0.285,
  neck: 0.052,
  headR: 0.057,
  upperArm: 0.155,
  foreArm: 0.15,
  hand: 0.05,
  thigh: 0.245,
  shin: 0.235,
  foot: 0.1,
  hipHeight: 0.52,
  /** Lateral offset between the near and far limb pairs (three-quarter view). */
  sideOffset: 0.016,
};

const dirX = (deg: number) => Math.sin(deg * DEG);
const dirY = (deg: number) => -Math.cos(deg * DEG);

/**
 * Builds the skeleton for a stride phase.
 * Output is in stature units with +y up and the origin on the ground plane.
 */
export function runnerJoints(phase: number, amp = 1, out?: Joints): Joints {
  const P = PROPORTIONS;

  // Two bounces per stride: lowest at mid stance, highest through flight.
  const bob = -0.036 * amp * Math.cos(4 * Math.PI * (phase - 0.125));
  const lean = lerp(3.5, 26 + 6 * Math.cos(4 * Math.PI * (phase - 0.05)), amp);

  const hipX = 0.012 * amp * Math.sin(4 * Math.PI * phase);
  const hipY = P.hipHeight + bob;

  const shoulderX = hipX + P.torso * dirX(180 - lean);
  const shoulderY = hipY + P.torso * dirY(180 - lean);

  const neckX = shoulderX + P.neck * dirX(180 - lean);
  const neckY = shoulderY + P.neck * dirY(180 - lean);
  // The head sits slightly ahead of the spine, as in a forward-driving runner.
  const headX = neckX + P.headR * dirX(180 - lean * 0.2) + 0.012;
  const headY = neckY + P.headR * dirY(180 - lean * 0.2);

  const j: Joints =
    out ??
    ({
      side: [makeSide(), makeSide()],
    } as Joints);

  j.hipX = hipX;
  j.hipY = hipY;
  j.shoulderX = shoulderX;
  j.shoulderY = shoulderY;
  j.neckX = neckX;
  j.neckY = neckY;
  j.headX = headX;
  j.headY = headY;

  // Near side leads by half a cycle so the two sides mirror the stride.
  buildSide(j.side[0], phase + 0.5, amp, 1, -P.sideOffset, hipX, hipY, shoulderX, shoulderY);
  buildSide(j.side[1], phase, amp, 0, P.sideOffset, hipX, hipY, shoulderX, shoulderY);
  return j;
}

function makeSide(): SideJoints {
  return {
    depth: 1,
    z: 0,
    hipX: 0,
    hipY: 0,
    kneeX: 0,
    kneeY: 0,
    ankleX: 0,
    ankleY: 0,
    toeX: 0,
    toeY: 0,
    shoulderX: 0,
    shoulderY: 0,
    elbowX: 0,
    elbowY: 0,
    wristX: 0,
    wristY: 0,
    handX: 0,
    handY: 0,
  };
}

function buildSide(
  s: SideJoints,
  phase: number,
  amp: number,
  depth: number,
  z: number,
  hipX: number,
  hipY: number,
  shoulderX: number,
  shoulderY: number,
) {
  const P = PROPORTIONS;
  s.depth = depth;
  s.z = z;

  const thigh = lerp(REST.thigh, cyclicSpline(THIGH, phase), amp);
  const shin = lerp(REST.shin, cyclicSpline(SHIN, phase), amp);
  const foot = lerp(REST.foot, cyclicSpline(FOOT, phase), amp);
  const upper = lerp(REST.upper, cyclicSpline(UPPER_ARM, phase), amp);
  const fore = lerp(REST.fore, cyclicSpline(FORE_ARM, phase), amp);

  s.hipX = hipX + z * 0.45;
  s.hipY = hipY;
  s.kneeX = s.hipX + P.thigh * dirX(thigh) + z * 0.3;
  s.kneeY = s.hipY + P.thigh * dirY(thigh);
  s.ankleX = s.kneeX + P.shin * dirX(shin);
  s.ankleY = s.kneeY + P.shin * dirY(shin);
  s.toeX = s.ankleX + P.foot * dirX(foot);
  s.toeY = s.ankleY + P.foot * dirY(foot);

  s.shoulderX = shoulderX + z;
  s.shoulderY = shoulderY - 0.01;
  s.elbowX = s.shoulderX + P.upperArm * dirX(upper) + z * 0.4;
  s.elbowY = s.shoulderY + P.upperArm * dirY(upper);
  s.wristX = s.elbowX + P.foreArm * dirX(fore);
  s.wristY = s.elbowY + P.foreArm * dirY(fore);
  s.handX = s.wristX + P.hand * dirX(fore);
  s.handY = s.wristY + P.hand * dirY(fore);
}

/**
 * Eases the cycle so it lingers on the two split poses (p = 0.25 and 0.75) and
 * passes quickly through the compressed ones. At dot-matrix resolution the
 * split is what makes the figure legible as a runner.
 */
export function warpPhase(p: number) {
  // 0.07 is just inside the monotonic limit (1/4pi): the cycle nearly holds on
  // each split and snaps through the passing poses, the way the reference
  // animation holds a drawn pose and dissolves between them.
  return p + 0.07 * Math.sin(4 * Math.PI * p);
}

/** Vertical position of the tracked foot, used to time ground-impact effects. */
export function strikePhase(phase: number) {
  // Impact energy peaks just after each foot strike and fades fast.
  const p = ((phase % 0.5) + 0.5) % 0.5;
  return Math.max(0, 1 - p / 0.16);
}
