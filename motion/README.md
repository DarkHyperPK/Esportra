# Scrim feature reel

20 s, 120 BPM motion piece for the Scrim feature, in 9:16, 1:1 and 16:9 from one timeline.
The UI in it is the real product: the scrim pages in `src/` rendered with sample data, never redrawn.

| Step | Command | Output |
|---|---|---|
| 1. Harness (real pages + fixture data) | `npx vite --config motion/harness/vite.config.ts` | http://localhost:5199/?scene=discovery |
| 2. Capture every UI state (real clicks) | `node motion/capture/capture.cjs` | `assets/screens/` (+ `manifest.json` boxes) |
| 3. Score + sound design | `python3 -I motion/audio/score.py motion/comp/timeline.json motion/out/score.wav` | `motion/out/score.wav` |
| 4. Serve the composition | `python3 -m http.server 5300` (repo root) | http://localhost:5300/motion/comp/index.html?fmt=9x16&t=4.95 |
| 5. Stills / contact sheet | `node motion/capture/still.cjs 9x16 motion/out/stills 4.95` · `node motion/capture/contact.cjs 9x16 <frames> <out.png>` | PNGs |
| 6. Full render | `node motion/capture/render.cjs 9x16 motion/out/esportra-scrims-9x16.mp4` | H.264 + AAC, 60 fps |

- `motion/comp/timeline.json` is the single source of timing: beats and the click / whoosh / hit events the picture and the score both read.
- `motion/harness/fixtures/` holds the fictional sample data (house sample teams Night Owls and Crimson Five, plus four more). Mutations advance a small state machine, so a real click produces the real next state.
- `assets/screens/` and `motion/out/` are generated and git-ignored; step 2 regenerates the screens exactly (fixed clock, reduced motion).
- `motion/tools/vectorize_logo.py` traced `assets/logo/*.svg` from `public/brand/esportra-icon-512.png`.
