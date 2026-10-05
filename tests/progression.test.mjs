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
  vm.runInNewContext(code, { exports, Uint8Array, Float32Array,
    require: id => load(resolve(dirname(path), id)) });
  return exports;
}

const { decodeRunner, runnerSilhouettes, sampleRunnerFrame, runnerPose, FRAME_SAMPLES } =
  load(resolve(root, 'src/lib/referenceRunner.ts'));
const { progressionScene } = load(resolve(root, 'src/lib/dotfield/scenes.ts'));
const { LimbList } = load(resolve(root, 'src/lib/dotfield/types.ts'));
const packed = new Uint8Array(readFileSync(resolve(root, 'src/assets/runner.bin')));
const fields = runnerSilhouettes(decodeRunner(packed));

test('circle silhouettes have finite bounded coverage, preserve all poses and reject incomplete data', () => {
  assert.throws(() => runnerSilhouettes(new Uint8Array(1)), /Invalid/);
  for (const value of fields) assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
  for (let frame = 0; frame < fields.length / FRAME_SAMPLES; frame++) {
    assert.ok(fields.subarray(frame * FRAME_SAMPLES, (frame + 1) * FRAME_SAMPLES).some(v => v > .9));
  }
  assert.equal(sampleRunnerFrame(fields, 0, -.01, .5), 0);
  assert.equal(sampleRunnerFrame(fields, 0, 1.01, .5), 0);
  assert.equal(sampleRunnerFrame(fields, 0, .5, 1.01), 0);
  assert.ok(Number.isFinite(sampleRunnerFrame(fields, 0, 1, 1)));
});

test('interpolation crosses the last-to-first reference frame without a jump', () => {
  const before = runnerPose(719.999), after = runnerPose(720.001);
  assert.equal(before.next, after.frame);
  for (let y = 0; y < 1; y += .025) {
    for (let x = 0; x < 1; x += .025) {
      const sample = pose => sampleRunnerFrame(fields, pose.frame, x, y) * (1 - pose.blend)
        + sampleRunnerFrame(fields, pose.next, x, y) * pose.blend;
      assert.ok(Math.abs(sample(before) - sample(after)) < .001);
    }
  }
});

function snapshot(scene, { t = .2, progress = 0, w = 1200, h = 340 } = {}) {
  const ctx = { t, dt: 1 / 60, progress, velocity: 0, w, h, spacing: scene.spacing(w, h) };
  const limbs = new LimbList();
  scene.build(limbs, ctx);
  const energy = [];
  for (let y = 0; y < h; y += ctx.spacing) {
    for (let x = 0; x < w; x += ctx.spacing) energy.push(scene.energy(x, y, ctx));
  }
  return { energy, limbs };
}

test('the progression runs independently of scroll and retains filled/outlined circles', () => {
  const scene = progressionScene({ silhouettes: fields });
  const first = snapshot(scene), later = snapshot(scene, { t: .4 });
  assert.deepEqual(first.energy, snapshot(scene, { progress: 1 }).energy);
  assert.notDeepEqual(first.energy, later.energy);
  assert.ok(first.limbs.count > 0, 'The held W01 stance stays present');
  assert.ok(first.energy.filter(v => v > .5).length > 100);
  assert.ok(scene.style.fillMax > 0 && scene.style.fillMax < .5);
  assert.ok(scene.style.outlineAlpha > 0 && scene.style.outlineR > 0);
});

test('mobile has one reference runner and reduced-motion time produces a stable pose', () => {
  const scene = progressionScene({ stages: [1], silhouettes: fields });
  const dimensions = { t: 1.2, w: 342, h: 371 };
  const first = snapshot(scene, dimensions);
  assert.equal(first.limbs.count, 0);
  assert.ok(first.energy.filter(v => v > .5).length > 50);
  assert.deepEqual(first.energy, snapshot(scene, dimensions).energy);
});
