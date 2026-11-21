# After Hours — Cover Studio
[![make.fun competition](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Nvlfbrynsyah/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Nvlfbrynsyah/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn local photos into original neon cover art. Round 5 features dominant hero photography, smaller supporting scenes, bold outlined headlines and a unified magenta–orange sunset grade with subtle halftone and seeded film grain.

## Run

```sh
node serve.ts
```

Open localhost:8080. Choose a layout, select a panel, load a bundled photo or add your own, then drag to crop and scroll to zoom. Adjust captions, typography and panel grades; apply a grade across the cover. Export the exact preview as a PNG at 1080 × 1080, 1080 × 1350 or 1920 × 1080. All processing stays in your browser and works offline.

## Screenshots

From the makefun workspace directory:

```sh
node shots/gca-shots.mjs
```

The four captures in `shots.json` show Sunset Syndicate in wide format, the working portrait editor, Golden Outlaws in the Hero layout and Saltwater Renegades in the Triptych layout. The cover and editor query hooks wait for `document.documentElement.dataset.ready === 'true'`. Captures check local requests, browser errors and exported PNG fidelity.

## Verify

With the server running:

```sh
node verify.mjs
```

Verification exercises layouts, photo import, crop zoom and dragging, grading, captions, mobile sizing, all three exports and identical repeated PNG downloads.

For deterministic packaging:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
MAKEFUN_OUTPUT_DIR=out2 node main.ts
diff -r out out2
```

## Source outline

- `app/src/poster.js`: shared preview/export renderer, asymmetric panels, photo treatment, original vignette accent, lettering and seeded texture.
- `app/src/main.js`: local image loading, studio controls, crop interaction, query hooks and PNG downloads.
- `app/index.html` and `app/style.css`: responsive studio interface.
- `app/samples/`: the two bundled sample photos; each appears at most once in a preset cover.
- `capture.mjs` and `shots.json`: reproducible screenshots and export checks.
- `serve.ts`, `verify.mjs` and `main.ts`: static serving, end-to-end verification and deterministic packaging.

Original studio artwork and system typography; no game artwork, logos or proprietary fonts.
