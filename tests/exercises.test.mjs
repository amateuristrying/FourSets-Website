import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const root = fileURLToPath(new URL('..', import.meta.url));
const cache = new Map();
function load(path) {
  if (path.endsWith('.json')) return JSON.parse(readFileSync(path, 'utf8'));
  if (!path.endsWith('.ts')) path += '.ts';
  if (cache.has(path)) return cache.get(path);
  const exports = {};
  cache.set(path, exports);
  const code = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, Uint8Array,
    require: id => load(resolve(dirname(path), id)) });
  return exports;
}

const { decodeExercises, exercisePose, sampleExercise, EXERCISE_SAMPLES,
  EXERCISE_FRAMES, EXERCISE_LOOP_MS } = load(resolve(root, 'src/lib/referenceExercises.ts'));
const { exerciseScene, exerciseLayout } = load(resolve(root, 'src/lib/dotfield/exercises.ts'));
const packed = new Uint8Array(readFileSync(resolve(root, 'src/assets/exercises.bin')));
const fields = decodeExercises(packed);

test('all three reference exercises retain every pose and their shared source timing', () => {
  assert.equal(EXERCISE_LOOP_MS, 4740);
  assert.equal(EXERCISE_FRAMES, 79);
  assert.equal(fields.length, 3 * EXERCISE_FRAMES * EXERCISE_SAMPLES);
  for (let i = 0; i < 3 * EXERCISE_FRAMES; i++) {
    const frame = fields.subarray(i * EXERCISE_SAMPLES, (i + 1) * EXERCISE_SAMPLES);
    assert.ok(frame.filter(v => v > 170).length > 400, `Pose ${i} has a complete figure`);
    assert.ok(frame.filter(v => v > 0 && v < 100).length > 100, `Pose ${i} retains dim clothing`);
  }
  assert.throws(() => decodeExercises(packed.subarray(0, packed.length - 1)), /Truncated/);
  assert.throws(() => decodeExercises(new Uint8Array([255, 0])), /Invalid/);
  assert.throws(() => decodeExercises(new Uint8Array([255, 1])), /Incomplete/);
});

function poseSamples(exercise, elapsed, data = fields) {
  const pose = exercisePose(elapsed), result = [];
  for (let y = 0; y <= 1; y += .025) {
    for (let x = 0; x <= 1; x += .025) {
      const a = sampleExercise(data, exercise, pose.frame, x, y);
      const b = sampleExercise(data, exercise, pose.next, x, y);
      result.push(a + (b - a) * pose.blend);
    }
  }
  return result;
}

test('each movement changes pose, loops continuously and has a complete offline poster', () => {
  for (let exercise = 0; exercise < 3; exercise++) {
    const start = poseSamples(exercise, 0);
    assert.notDeepEqual(start, poseSamples(exercise, 600));
    assert.deepEqual(start, poseSamples(exercise, EXERCISE_LOOP_MS));
    const before = poseSamples(exercise, EXERCISE_LOOP_MS - .001);
    const after = poseSamples(exercise, .001);
    assert.ok(before.every((value, i) => Math.abs(value - after[i]) < .001));
    // Null is used to request the inline poster while keeping the helper default.
    const poster = poseSamples(exercise, 0, null);
    assert.ok(poster.some(v => v > .9));
    assert.deepEqual(poster, poseSamples(exercise, 1200, null));
    assert.equal(sampleExercise(fields, exercise, 0, -.1, .5), 0);
  }
});

function snapshot(exercise, w, h, t = .6, progress = 0) {
  const scene = exerciseScene(exercise, fields);
  const spacing = scene.spacing(w, h);
  const ctx = { w, h, t, progress, dt: 1 / 60, spacing, velocity: 0 };
  scene.build({}, ctx);
  const rows = Math.ceil(h / spacing) + 2;
  const origin = (h - (rows - 1) * spacing) / 2;
  return { scene, ctx, origin, rows };
}

test('desktop and phone panels have one grounded dot row and a stationary pull-up bar', () => {
  for (const [w, h] of [[475, 422], [390, 347], [205, 182], [342, 304]]) {
    for (let exercise = 0; exercise < 3; exercise++) {
      const { scene, ctx, origin, rows } = snapshot(exercise, w, h);
      const litAtEdge = [];
      for (let row = 0; row < rows; row++) {
        const y = origin + row * ctx.spacing;
        if (scene.energy(w * .03, y, ctx) > .8) litAtEdge.push(y);
      }
      assert.equal(litAtEdge.length, 1);
      assert.ok(Math.abs(litAtEdge[0] - exerciseLayout(w, h).ground) <= ctx.spacing / 2 + 1e-9);
    }
    const first = snapshot(2, w, h, 0), later = snapshot(2, w, h, 1);
    const bar = [];
    for (let row = 0; row < first.rows; row++) {
      const y = first.origin + row * first.ctx.spacing;
      const a = first.scene.energy(w * .2, y, first.ctx);
      const b = later.scene.energy(w * .2, y, later.ctx);
      assert.equal(a, b, 'The pull-up bar does not travel with the body');
      if (a > .99) bar.push(y);
    }
    assert.equal(bar.length, 1);
  }
});

test('fixed time is deterministic for reduced motion and scroll does not drive repetitions', () => {
  for (let exercise = 0; exercise < 3; exercise++) {
    const a = snapshot(exercise, 342, 304, 1.2);
    const b = snapshot(exercise, 342, 304, 1.2, 1);
    for (let y = 0; y < 304; y += 7) {
      for (let x = 0; x < 342; x += 7) {
        assert.equal(a.scene.energy(x, y, a.ctx), b.scene.energy(x, y, b.ctx));
      }
    }
  }
});
