import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

// Use the existing TypeScript compiler; no additional test dependency.
const url = new URL('../src/lib/referenceRunner.ts', import.meta.url);
const compiled = ts.transpileModule(readFileSync(url, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;
const context = { exports: {}, require: createRequire(url), Uint8Array };
vm.runInNewContext(compiled, context);
const { decodeRunner, frameAt, FRAME_SAMPLES, LOOP_MS, POSTER_FRAME } = context.exports;
const metadata = JSON.parse(readFileSync(new URL('../src/assets/runner.json', import.meta.url)));
const packed = new Uint8Array(readFileSync(new URL('../src/assets/runner.bin', import.meta.url)));

test('the shipped asset contains distinct populated frames, including the poster', () => {
  const frames = decodeRunner(packed);
  assert.equal(frames.length, FRAME_SAMPLES * metadata.durations.length);
  const signatures = new Set();
  const exposure = [];
  for (let i = 0; i < metadata.durations.length; i++) {
    const frame = frames.subarray(i * FRAME_SAMPLES, (i + 1) * FRAME_SAMPLES);
    assert.ok(frame.some(value => value > 0), `Frame ${i} must not be blank`);
    exposure.push(frame.reduce((total, value) => total + value, 0));
    signatures.add(Buffer.from(frame).toString('base64'));
  }
  assert.equal(signatures.size, metadata.durations.length);
  assert.ok(Math.min(...exposure) / Math.max(...exposure) > .5,
    'Alternating sparse GIF frames must not make the runner flash');
  assert.ok(POSTER_FRAME >= 0 && POSTER_FRAME < metadata.durations.length);
});

test('source frame boundaries and the last-to-first loop preserve GIF timing', () => {
  let elapsed = 0;
  metadata.durations.forEach((duration, frame) => {
    assert.equal(frameAt(elapsed), frame);
    assert.equal(frameAt(elapsed + duration - .01), frame);
    elapsed += duration;
  });
  assert.equal(LOOP_MS, 720);
  assert.equal(frameAt(LOOP_MS), 0);
  assert.equal(frameAt(LOOP_MS * 1000 + 30), 1);
  assert.equal(frameAt(-1), metadata.durations.length - 1);
});

test('empty, truncated and oversized assets fail instead of rendering bad frames', () => {
  assert.throws(() => decodeRunner(new Uint8Array()), /Incomplete/);
  assert.throws(() => decodeRunner(new Uint8Array([255, 1])), /Truncated/);
  assert.throws(() => decodeRunner(packed.subarray(0, packed.length - 2)));
  const oversized = new Uint8Array(packed.length + 1);
  oversized.set(packed);
  assert.throws(() => decodeRunner(oversized), /Invalid runner frame length/);
});
