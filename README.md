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
  source frames and draws circles in twelve opacity batches. It repaints only
  when the source frame changes, with display resolution capped at 2×.
- The canvas resizes without resetting the stride, stops requesting animation
  frames offscreen or in a hidden tab, and shows one still pose for Reduce
  Motion. The procedural runner remains a fallback if the asset cannot load.

The original `lib/dotfield/` engine still serves the Mission lattice, editorial
washes and Transformations progression, with its own skeletal gait and density
fields. These sections retain their existing appearance.

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
