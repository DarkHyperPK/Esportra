# Esportra design dataset

<!-- esportra-canonical: company-v2 -->

A visual reference set for everyone who designs or builds for Esportra, human or agent. It shows what the brand looks like in practice: the identity, nine design directions, production templates and the UI states every flow needs.

**Full list with previews:** [`INDEX.md`](INDEX.md) · **Machine-readable:** [`manifest.json`](manifest.json)

<img src="directions/broadcast.png" width="49%"> <img src="directions/trophy.png" width="49%">

---

## Where this sits

This dataset **illustrates** the rules; it does not make them. When something here disagrees with the canonical sources, the sources win and this dataset gets rebuilt.

| Order | Source | Holds |
|---|---|---|
| 1 | `CLAUDE.md` → Company Agents & Design Authority | Who decides and the order of authority |
| 2 | `.claude/skills/esportra-brand/` | Invariants, tokens, voice, imagery |
| 3 | `.claude/skills/design-recipe/` | How to choose a direction per surface; the direction specs |
| 4 | `src/components/ui/kit/tone.ts` | Tokens as code |
| 5 | **This dataset** | What it looks like, composed |

## How to use it

**Designing something new (agents: Creative Lead, UI/UX Designer, CMO):**
1. Run `discovery-first`, then read the context signals and choose a direction with `design-recipe`.
2. Open that direction's board in `directions/` and the matching template in `templates/`.
3. Check the identity boards for the invariants you must keep (`identity/`).
4. Write the Direction Contract, then design. Score it with the tasting rubric.

**Building UI (Senior Frontend Engineer, Frontend QA):**
- `ui/components-and-states.png` and `ui/check-in-states.png` show the states that must exist.
- Use the kit components and tokens. **Never copy pixel values from a PNG**; the tokens are the source.

**Making social, stream or venue assets:**
- Start from the template's HTML in `source/html/templates/…`, replace the sample data, and render it (see "Rebuilding").
- Stream overlays (`templates/stream/scorebug.png`, `lower-third.png`) are transparent PNGs for OBS.

**Looking for a background:** `textures/` has PNGs and matching SVGs; the SVGs scale to any size.

## What's inside

| Folder | Contents |
|---|---|
| `identity/` | Palette, contrast pairs (computed WCAG ratios), Daylight palette, type specimen, type scale by direction, signature moves, motion verbs with plotted curves, space and shape, logo usage |
| `textures/` | Streak shards (plain, cue, portrait), spotlight, trophy light, hairline grid, scoreboard field, grain overlay, cut-edge frame, paper |
| `directions/` | Broadcast, Command Console, Editorial, Cinematic, Community, Daylight, Trophy, Co-brand, Themed event |
| `templates/` | Fixture, result, champion, registration, check-in story, OG image, channel banner, video thumbnail, reminder email, scorebug, lower-third, starting-soon, venue station board |
| `ui/` | Components × states, the six check-in states, empty / error / loading |
| `photography/` | Shooting brief: per-direction guidance, shot list, specs, consent, fallbacks |
| `source/` | The generator: `build.mjs`, shared `lib.mjs`, asset modules, editable HTML, fonts (OFL) |

## Rules for this dataset

- **Sample data is fictional.** The teams, players, crests, amounts, dates and venues are layout samples: Night Owls, Crimson Five, "Karachi Valorant Open", PKR figures and so on. Never publish them as real results, and never present them as testimonials or statistics.
- **The logo is a slot until the real mark is added.** See [`identity/logo/README.md`](identity/logo/README.md). The old React placeholder `public/logo.svg` has been deleted; never reintroduce it.
- **No stock or generated photos of people.** Image slots expect real event photography; see [`photography/art-direction.md`](photography/art-direction.md).
- **Crests are placeholders.** Real teams upload their own; show them in dark wells, never recoloured.
- **Partner marks** are shown as a monochrome "PARTNER" well. Use a partner's real mark only under their guidelines.
- **Game logos and key art** belong to their publishers. Use them only where Esportra has the right to.

## Rebuilding

Everything is generated from code, so the set can be regenerated whenever a token changes.

```bash
npm i --no-save playwright        # once; uses Playwright's Chromium (or set CHROMIUM_PATH)
node design/source/build.mjs      # everything
node design/source/build.mjs templates/social   # only ids containing this text
```

The build writes:
- the editable HTML to `source/html/`
- the PNGs, plus SVGs for textures
- `manifest.json` and `INDEX.md`

### Adding an asset

1. Add an entry to the right module in `source/assets/` (`identity`, `textures`, `directions`, `templates` or `ui`). Give it an `id`, `out`, `w`, `h`, `html`, `description`, `tags` and, where relevant, `direction`, `use` and `transparent`.
2. Build and look at the PNG. Check it against the direction's do/don't list and the tasting rubric.
3. Commit the PNG, the HTML source, `manifest.json` and `INDEX.md` together.

### Changing a token

Update `src/components/ui/kit/tone.ts` and `.claude/skills/esportra-brand/reference/tokens.md` first. Then mirror the change in `source/lib.mjs` (`C`, `TONES`) and rebuild everything.
