import { exercisePose, sampleExercise, type Exercise } from '../referenceExercises';
import { smoothstep, valueNoise } from './math';
import type { Scene } from './types';

/** Shared stage coordinates keep the floor, stool and pull-up bar stationary. */
export function exerciseLayout(w: number, h: number) {
  const scale = Math.min(w / 360, h / 320);
  const left = (w - 360 * scale) / 2;
  const top = (h - 320 * scale) / 2;
  return { scale, left, top, ground: top + 300 * scale, bar: top + 50 * scale };
}

export function exerciseScene(exercise: Exercise, fields?: Uint8Array): Scene {
  let layout = exerciseLayout(360, 320);
  let pose = exercisePose(0);
  return {
    spacing(w, h) { return Math.max(4, exerciseLayout(w, h).scale * 7); },
    build(_out, ctx) {
      layout = exerciseLayout(ctx.w, ctx.h);
      const rows = Math.ceil(ctx.h / ctx.spacing) + 2;
      const origin = (ctx.h - (rows - 1) * ctx.spacing) / 2;
      const snap = (y: number) => origin + Math.round((y - origin) / ctx.spacing) * ctx.spacing;
      layout.ground = snap(layout.ground);
      layout.bar = snap(layout.bar);
      pose = exercisePose(ctx.t * 1000);
    },
    energy(x, y, ctx) {
      const { scale, left, top, ground, bar } = layout;
      const u = (x - left) / (360 * scale), v = (y - top) / (320 * scale);
      const a = sampleExercise(fields, exercise, pose.frame, u, v);
      const b = sampleExercise(fields, exercise, pose.next, u, v);
      let light = a + (b - a) * pose.blend;
      // A single row of circles joins each panel into one continuous baseline.
      if (Math.abs(y - ground) < ctx.spacing * .45) light = Math.max(light, .85);
      if (exercise === 2 && u > .13 && u < .87 && Math.abs(y - bar) < ctx.spacing * .45) {
        light = 1;
      }
      return light;
    },
    mask(gx, gy, nx, ny, seed) {
      const radius = Math.hypot(nx * .94, (ny + .08) * .97);
      const edge = 1 - smoothstep(.42, 1.22, radius);
      const density = edge * (.55 + .65 * valueNoise(gx * .17 + exercise * 8, gy * .19));
      return seed < density ? density * .8 : 0;
    },
    style: {
      attack: .92, decay: .68, advect: 0,
      fillMin: .29, fillMax: .44, outlineR: .37,
      outlineAlpha: .19, lineWidth: .8,
      sparkle: .025, drift: .025, opacity: 1,
    },
  };
}
