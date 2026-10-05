import metadata from '../assets/exercises.json';

export const EXERCISE_WIDTH = metadata.width;
export const EXERCISE_HEIGHT = metadata.height;
export const EXERCISE_SAMPLES = EXERCISE_WIDTH * EXERCISE_HEIGHT;
export const EXERCISE_FRAMES = metadata.durations.length;
export const EXERCISE_LOOP_MS = metadata.durations.reduce((sum, duration) => sum + duration, 0);
export type Exercise = 0 | 1 | 2;

/** Expand the value/count runs written by scripts/sample-exercises.py. */
export function decodeExercises(
  packed: Uint8Array,
  length = EXERCISE_SAMPLES * EXERCISE_FRAMES * metadata.names.length,
): Uint8Array {
  if (packed.length % 2) throw new Error('Truncated exercise data');
  const fields = new Uint8Array(length);
  let offset = 0;
  for (let i = 0; i < packed.length; i += 2) {
    const value = packed[i], count = packed[i + 1];
    if (!count || offset + count > length) throw new Error('Invalid exercise run');
    fields.fill(value, offset, offset + count);
    offset += count;
  }
  if (offset !== length) throw new Error('Incomplete exercise data');
  return fields;
}

const posters = metadata.posters.map(packed => decodeExercises(new Uint8Array(packed), EXERCISE_SAMPLES));

export function exercisePose(elapsed: number) {
  let time = ((elapsed % EXERCISE_LOOP_MS) + EXERCISE_LOOP_MS) % EXERCISE_LOOP_MS;
  for (let frame = 0; frame < EXERCISE_FRAMES; frame++) {
    const duration = metadata.durations[frame];
    if (time < duration) return { frame, next: (frame + 1) % EXERCISE_FRAMES, blend: time / duration };
    time -= duration;
  }
  return { frame: 0, next: 1, blend: 0 };
}

/** Sample a reference pose without changing its proportions or body contacts. */
export function sampleExercise(
  fields: Uint8Array | undefined, exercise: Exercise, frame: number, u: number, v: number,
): number {
  if (u < 0 || v < 0 || u > 1 || v > 1) return 0;
  const data = fields ?? posters[exercise];
  const offset = fields ? (exercise * EXERCISE_FRAMES + frame) * EXERCISE_SAMPLES : 0;
  const x = u * (EXERCISE_WIDTH - 1), y = v * (EXERCISE_HEIGHT - 1);
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(EXERCISE_WIDTH - 1, x0 + 1), y1 = Math.min(EXERCISE_HEIGHT - 1, y0 + 1);
  const at = (xx: number, yy: number) => data[offset + yy * EXERCISE_WIDTH + xx];
  const top = at(x0, y0) * (1 - x + x0) + at(x1, y0) * (x - x0);
  const bottom = at(x0, y1) * (1 - x + x0) + at(x1, y1) * (x - x0);
  return (top * (1 - y + y0) + bottom * (y - y0)) / 255;
}
