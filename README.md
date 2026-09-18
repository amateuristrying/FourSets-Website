# FourSets

A responsive brand site for a fictional movement-training product, built around a
dot-matrix runner that is generated rather than drawn: a skeletal running cycle
is sampled onto a fixed lattice of circles every frame.

Black ground, one chartreuse ink, geometric type, and a lot of negative space.

## Run it

```bash
npm install
npm run dev
```

`npm run build` type-checks and emits a production bundle to `dist/`.

## How the hero works

The runner is not an image or a keyframed animation. Three layers stack up:

1. **`lib/dotfield/gait.ts`** — an art-directed running cycle. Every channel
   (thigh, shin, foot, upper arm, forearm) is an absolute segment angle measured
   from the downward vertical, stored as eight keys per stride and read back
   through a periodic Catmull-Rom spline. Absolute angles keep knee and elbow
   bends anatomically valid while staying tunable by eye. `warpPhase` eases the
   cycle so it lingers on the two split poses, which is what makes the figure
   legible as a runner at ~20 dots tall. A `amp` parameter blends the whole
   cycle towards a standing pose, which is what drives the Transformations row.

2. **`lib/dotfield/scenes.ts`** — turns a skeleton into tapered capsules in
   canvas space, and describes the surrounding density field. The runner holds
   position while the field's noise streams leftward, so the figure reads as
   travelling through space rather than sliding across a poster.

3. **`lib/dotfield/engine.ts`** — the renderer. Each lattice cell samples the
   signed distance to the scene's shapes (`sdf.ts`), charges quickly when the
   body covers it and discharges slowly, so movement leaves a wake of dots that
   decay back into outline circles. Energy is also advected against the
   direction of travel, smearing that wake behind the runner. Shapes are dilated
   by a fraction of the lattice pitch before sampling — without that, a limb
   thinner than the pitch can slip between cells and vanish.

Dots are batched into a dozen alpha buckets and filled as two `Path2D` passes
per frame, which keeps the hero field at roughly 0.4 ms/frame for ~1800 cells.

The same engine serves the Mission lattice (a scan bar crossing a quiet grid),
the editorial washes, and the Transformations progression.

## Notes

- `lib/wordmark.ts` draws the FourSets wordmark as SVG paths from a small
  modular alphabet — vertical stems, horizontal bars, quarter-ring bowls and 45°
  sheared terminals on a 100-unit cap height. The header logo, hero mark and
  footer all render the same geometry, and glyphs are separate paths so the mark
  can reveal letter by letter.
- One rAF scroll loop (`lib/scroll.ts`) drives reveals, nav state, canvas
  visibility and parallax. It idles itself when the page settles.
- `prefers-reduced-motion` is respected: reveals resolve immediately and each
  dot field renders a single settled frame instead of animating.
- App Store / Google Play links are inert placeholders.
