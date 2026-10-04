import metadata from '../assets/runner.json';

export const RUN_SIZE = metadata.size;
export const FRAME_SAMPLES = RUN_SIZE * RUN_SIZE;
export const LOOP_MS = metadata.durations.reduce((sum, duration) => sum + duration, 0);
export const POSTER_FRAME = metadata.posterFrame;

/** Decode the zero-run encoding emitted by scripts/sample-runner.py. */
export function decodeRunner(packed: Uint8Array): Uint8Array {
  const frames = new Uint8Array(FRAME_SAMPLES * metadata.durations.length);
  let input = 0;
  let output = 0;
  while (input < packed.length) {
    const token = packed[input++];
    const count = token < 128 ? token + 1 : token - 127;
    if (output + count > frames.length) throw new Error('Invalid runner frame length');
    if (token >= 128) {
      if (input + count > packed.length) throw new Error('Truncated runner frame');
      frames.set(packed.subarray(input, input + count), output);
      input += count;
    }
    output += count;
  }
  if (output !== frames.length) throw new Error('Incomplete runner animation');
  return frames;
}

/** Keep the source timing, including the wrap from the last frame to the first. */
export function frameAt(elapsed: number): number {
  let time = ((elapsed % LOOP_MS) + LOOP_MS) % LOOP_MS;
  for (let frame = 0; frame < metadata.durations.length; frame++) {
    if (time < metadata.durations[frame]) return frame;
    time -= metadata.durations[frame];
  }
  return 0;
}

/** Draw the actual reference silhouette on a fine grid of lime particles. */
export function drawRunner(
  ctx: CanvasRenderingContext2D,
  frames: Uint8Array,
  frame: number,
  width: number,
  height: number,
) {
  ctx.clearRect(0, 0, width, height);
  const size = Math.min(height * .98, width * .98);
  const pitch = size / RUN_SIZE;
  const left = (width - size) / 2;
  const top = (height - size) / 2;
  const buckets = Array.from({ length: 12 }, () => new Path2D());
  const offset = frame * FRAME_SAMPLES;

  for (let y = 0; y < RUN_SIZE; y++) {
    for (let x = 0; x < RUN_SIZE; x++) {
      const light = frames[offset + y * RUN_SIZE + x];
      if (!light) continue;
      const energy = light / 255;
      const radius = pitch * (.24 + .23 * Math.sqrt(energy));
      const px = left + (x + .5) * pitch;
      const py = top + (y + .5) * pitch;
      const bucket = Math.min(11, Math.floor(energy * 1.75 * 12));
      buckets[bucket].moveTo(px + radius, py);
      buckets[bucket].arc(px, py, radius, 0, Math.PI * 2);
    }
  }
  for (let i = 0; i < buckets.length; i++) {
    ctx.fillStyle = `rgba(232,255,107,${(i + 1) / buckets.length})`;
    ctx.fill(buckets[i]);
  }
}
