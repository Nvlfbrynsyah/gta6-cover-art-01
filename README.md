# After Hours — Cover Studio

[![make.fun competition](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Nvlfbrynsyah/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Nvlfbrynsyah/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn your camera roll into an original, GTA-inspired multi-panel poster. After Hours combines slanted comic panels, illustrated photo treatment, sunset or neon colour, and large outlined lettering. Everything runs locally with static files and system fonts.

## Run

Use Node 22.18 or newer, run `node serve.ts` from this entry directory, and open `http://localhost:8080`. There is no install or build step. You can also serve `app/` with any static HTTP server.

1. Choose Collage, Hero, Triptych or Grid.
2. Select a numbered panel or click it in the preview. Add one or several photos, pick a bundled sample, or use the selected photo in all panels. Photos are read with FileReader and never uploaded. Drag and drop photos onto the preview also works.
3. Drag to pan, scroll or use Crop zoom to zoom. Every panel remembers its photo, crop, colour preset, intensity and illustration ink. Use Apply grade to all for a unified look.
4. Edit the headline, its size and vertical position. Literal line breaks work. Toggle Poster details to remove the original palm, sun and editorial accents.
5. Choose **1080 × 1080**, **1080 × 1350**, or **1920 × 1080**, then Export cover. The downloaded PNG uses the exact canvas shown in the preview, without selection guides.

The sample photos, `app/samples/boulevard.jpg` and `app/samples/pier.jpg`, were generated with an image model for the competition kit and are free to use. They are bundled locally. The studio starts with a completed example so no upload is necessary.

## Screenshot hooks

Wait for `document.documentElement.dataset.ready === 'true'` before capturing. Both hooks load their photos automatically:

- `/?shot=cover&photo=boulevard&caption=VICE%5CnAFTER%20HOURS&size=1920x1080` shows only the finished cover, fitted inside the viewport.
- `/?shot=editor&photo=pier&caption=OCEAN%5CnDRIVE` shows the editor with the sample loaded.

`photo` accepts `boulevard`, `pier`, or the matching `.jpg` filename. `caption` accepts URL-encoded line breaks or a literal `\n`. `size` accepts the three export dimensions. The cover hook preserves its aspect ratio; match the viewport ratio for a full-frame image.

## Package

`MAKEFUN_OUTPUT_DIR=out node main.ts` copies the static application and screenshots and builds the official dossier using the unchanged kit library. Rendering uses fixed geometry and pixel processing, without time or random inputs. Identical inputs in the same browser produce identical PNG bytes.

The four screenshots show a wide exported cover, the editor with a sample photo loaded, a portrait cover and a square cover. From the workspace parent, run `node shots/gca-shots.mjs` to regenerate them using `capture.mjs` and `shots.json`. The script serves the static app on a free port, waits for the canvas, checks actual PNG exports against the preview, and checks the default page for browser errors and external requests. Playwright comes from the workspace's `shots/node_modules`.

All branding, lettering treatment, panel geometry and decorative canvas artwork are original. No game artwork, logo or game font is included.
