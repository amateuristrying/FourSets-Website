import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/runnerLandscape.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const { landscapeLayout, landscapeX, drawLandscape } = context.exports;

test('runner remains centred and grounded at desktop, phone and very short sizes', () => {
  for (const [width, height] of [[1555, 510], [390, 600], [844, 120], [1, 1]]) {
    const layout = landscapeLayout(width, height);
    assert.ok(layout.size > 0);
    assert.ok(layout.top >= 0);
    assert.ok(layout.left >= 0);
    assert.ok(Math.abs(layout.left + layout.size / 2 - width / 2) < 1e-9);
    assert.equal(layout.top + layout.size, layout.groundY);
    assert.ok(layout.groundY <= height);
  }
});

test('world-space motion moves left and loops without accumulating position drift', () => {
  assert.equal(landscapeX(100, 20, 1, 500), 80);
  for (const time of [0, .016, 100, 1000000]) {
    const x = landscapeX(100, 20, time, 500);
    assert.ok(x >= 0 && x < 500);
    assert.ok(Math.abs(x - landscapeX(100, 20, time + 25, 500)) < 1e-6);
  }
});

function draw(time, width = 1280) {
  const rects = [], paths = [];
  const ctx = {
    clearRect() {}, beginPath() { paths.push([]); },
    moveTo(x, y) { paths.at(-1).push([x, y]); },
    lineTo(x, y) { paths.at(-1).push([x, y]); }, stroke() {},
    fillRect(...rect) { rects.push(rect); },
  };
  drawLandscape(ctx, width, 430, time);
  return { rects, paths };
}

test('ground repeats seamlessly while outline clouds drift at a slower rate', () => {
  const initial = draw(0), later = draw(.1);
  const speed = landscapeLayout(1280, 430).size * .72;
  const wrapped = draw(336 / speed);
  assert.deepEqual(initial.rects, wrapped.rects);
  assert.deepEqual(initial.rects[0], later.rects[0], 'Horizon stays level');
  assert.equal(initial.paths.length, 3);
  assert.equal(draw(0, 390).paths.length, 2);
  for (let i = 0; i < 3; i++) {
    const distance = initial.paths[i][0][0] - later.paths[i][0][0];
    assert.ok(distance > 0 && distance < speed * .1 * .1);
  }
  assert.deepEqual(initial, draw(0), 'Reduced-motion scenery is deterministic');
});
