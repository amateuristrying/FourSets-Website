# FourSets

A responsive brand site for a fictional movement-training product, built around a
particle runner sampled from the supplied running reference, rendered in lime
on a fine canvas grid. The original procedural engine powers the other sections.

Black ground, one chartreuse ink, geometric type, and a lot of negative space.

## Run it

```bash
npm install
npm run dev
```

`npm run build` type-checks and emits a production bundle to `dist/`.
`npm test` checks the sampled animation data, source timing and decoder failures.

## How the hero works

`HeroRunner.tsx` plays the 24-frame, 720 ms stride from `reference/run.gif` as
fine lime particles. It preserves the reference's bent-knee recovery, opposing
arm swing, flight phases and point-cloud texture. Near-empty alternating frames
are blended with their neighbours to prevent flicker. A fixed sampling grid keeps
individual dots stable while the silhouette moves through them.

- `scripts/sample-runner.py` samples the original GIF into a 144 × 144 luminance
  grid per frame and packs empty space into zero runs. Regenerate with
  `python3 scripts/sample-runner.py` (requires Pillow).
- `src/assets/runner.bin` is the generated ~118 KB animation data;
  `runner.json` records dimensions, frame durations and the still poster frame.
  The original GIF is a development reference and is not shipped in the bundle.
- `lib/referenceRunner.ts` validates and decodes the data, maps elapsed time to
  source frames and draws circles in twelve opacity batches. The runner layer
  repaints only when the source frame changes, with display resolution capped at 2×.
- The canvas resizes without resetting the stride, stops requesting animation
  frames offscreen or in a hidden tab, and shows one still pose for Reduce
  Motion. The procedural runner remains a fallback if the asset cannot load.

## Endless-running landscape

`lib/runnerLandscape.ts` adds the reference-inspired black sky, stepped lime
cloud outlines, a level ground line and tiny terrain dashes. A shared layout
anchors the runner's source-frame floor to the horizon, including on phones.
Terrain moves left quickly while differently sized clouds drift more slowly.
Both wrap outside the visible area; the terrain tile repeats without a seam.

A second canvas lets the scenery move at the display frame rate while the runner
retains its source-frame cadence. Both use the same paused clock, stop offscreen
or in hidden tabs, and freeze together when Reduce Motion is enabled. Mobile
uses two clouds to leave more negative space around the athlete.

## Transformations exercise loops

The W01, W12 and W24 panels now show a push-up, seated dumbbell press and pull-up,
respectively. Their poses come from `reference/motion.gif`, with its full 4.74 s
loop and relative exercise timing preserved. Lime circles trace each athlete,
clothing interiors stay dim, and a faint outlined-circle field sits behind them.
A shared dotted floor and a fixed pull-up bar keep the equipment grounded.

- Regenerate with `python3 scripts/sample-exercises.py` (requires Pillow). It
  isolates the three athletes, removes the source background and shadows, and
  retains 79 poses per exercise at 60 ms intervals.
- `exercises.bin` contains ~545 KB of run-length encoded coverage; the 4 MB source
  GIF is a development reference and is not included in the website bundle.
- `lib/referenceExercises.ts` validates the data and interpolates the poses;
  `lib/dotfield/exercises.ts` samples them onto the existing circle renderer.
- Inline poster poses keep all three figures visible while loading or if the
  asset fails. Reduce Motion skips the animation download and shows stills.
- Desktop uses one row with a continuous dotted floor. Phones stack all three
  exercises, keeping each movement legible. Repetitions are independent of scroll;
  offscreen fields pause their animation clocks.

The hero retains its fine-particle runner and moving landscape. The Mission
lattice and editorial washes continue to use the original procedural engine.

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
