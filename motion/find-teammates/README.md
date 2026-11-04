# Find Teammates reel

A 30-second, 120 BPM motion piece for Esportra's Find Teammates (LFG) feature. It's one deterministic timeline framed three ways: 9:16, 1:1 and 16:9. Every product pixel is a crop of a real screenshot in `../../assets/screens` (see `../../assets/ASSETS.md`).

| File | Role |
|---|---|
| `reel.html` / `reel.js` | The timeline. `window.renderAt(t)` draws the frame for time `t`. `?fmt=9x16\|1x1\|16x9` picks the framing. |
| `audio.py` | Original soundtrack synthesized in code (F minor, 120 BPM). Cues come from `sfx.json`, which is exported from the timeline, so UI clicks and keystrokes land on the picture's frames. |
| `capture/` | Playwright capture of the real app (`npm run dev`) with sample backend data. It regenerates `assets/screens/desktop` and `assets/screens/mobile`. These PNGs are git-ignored, like the scrim screens. |
| `frames.cjs`, `contact.html` | Single-frame renders and the contact sheet. |
| `render.cjs` | Full render to `build/find-teammates-<fmt>.mp4`. `build/` is generated and git-ignored. |

## Run

Serve the repo root first: `python3 -m http.server 8765 --bind 127.0.0.1`. Then:

```bash
node dump-sfx.cjs && python3 audio.py
```

```bash
node frames.cjs 9x16 build/contact 3.3 9.2
```

```bash
node render.cjs 9x16 60
```

To recapture the screens, start Vite with placeholder env vars, then run the capture for each layout:

```bash
VITE_API_URL=https://api.esportra.test VITE_SUPABASE_URL=https://sb.esportra.test VITE_SUPABASE_ANON_KEY=anon npx vite --port 5173
```

```bash
OUT=out node capture/capture.cjs desktop
```

```bash
OUT=out node capture/capture.cjs mobile
```
