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

/** Recover a continuous silhouette from the reference's fine particle texture.
 * An integral image averages small neighbourhoods once at load time. The circle
 * renderer can then sample the body at any lattice pitch without losing limbs.
 */
export function runnerSilhouettes(frames: Uint8Array): Float32Array {
  if (frames.length !== FRAME_SAMPLES * metadata.durations.length) {
    throw new Error('Invalid runner silhouette data');
  }
  const result = new Float32Array(frames.length);
  const stride = RUN_SIZE + 1;
  const sums = new Float32Array(stride * stride);
  for (let frame = 0; frame < metadata.durations.length; frame++) {
    const offset = frame * FRAME_SAMPLES;
    sums.fill(0);
    for (let y = 0; y < RUN_SIZE; y++) {
      let row = 0;
      for (let x = 0; x < RUN_SIZE; x++) {
        row += frames[offset + y * RUN_SIZE + x];
        sums[(y + 1) * stride + x + 1] = sums[y * stride + x + 1] + row;
      }
    }
    for (let y = 0; y < RUN_SIZE; y++) {
      for (let x = 0; x < RUN_SIZE; x++) {
        const x0 = Math.max(0, x - 3), x1 = Math.min(RUN_SIZE, x + 4);
        const y0 = Math.max(0, y - 3), y1 = Math.min(RUN_SIZE, y + 4);
        const total = sums[y1 * stride + x1] - sums[y0 * stride + x1]
          - sums[y1 * stride + x0] + sums[y0 * stride + x0];
        const density = total / ((x1 - x0) * (y1 - y0));
        const t = Math.max(0, Math.min(1, (density - 4) / 22));
        result[offset + y * RUN_SIZE + x] = t * t * (3 - 2 * t);
      }
    }
  }
  return result;
}

/** Bilinear sampling keeps the shape stable as the viewport/grid changes. */
export function sampleRunnerFrame(fields: Float32Array, frame: number, u: number, v: number): number {
  if (u < 0 || v < 0 || u > 1 || v > 1) return 0;
  const x = u * (RUN_SIZE - 1), y = v * (RUN_SIZE - 1);
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(RUN_SIZE - 1, x0 + 1), y1 = Math.min(RUN_SIZE - 1, y0 + 1);
  const offset = frame * FRAME_SAMPLES;
  const top = fields[offset + y0 * RUN_SIZE + x0] * (1 - (x - x0))
    + fields[offset + y0 * RUN_SIZE + x1] * (x - x0);
  const bottom = fields[offset + y1 * RUN_SIZE + x0] * (1 - (x - x0))
    + fields[offset + y1 * RUN_SIZE + x1] * (x - x0);
  return top * (1 - (y - y0)) + bottom * (y - y0);
}

/** Smooth the reference frames while retaining their original timing. */
export function runnerPose(elapsed: number) {
  const time = ((elapsed % LOOP_MS) + LOOP_MS) % LOOP_MS;
  const frame = frameAt(time);
  let start = 0;
  for (let i = 0; i < frame; i++) start += metadata.durations[i];
  return { frame, next: (frame + 1) % metadata.durations.length,
    blend: (time - start) / metadata.durations[frame] };
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
