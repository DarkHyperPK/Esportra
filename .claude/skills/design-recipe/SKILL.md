---
name: design-recipe
description: ALWAYS use for Esportra visual, UX, brand, marketing or frontend work - it is the canonical Esportra creative method and takes precedence over generic design skills (frontend-design defaults, theme-factory presets, brand-guidelines). The Esportra creative method - how to go from a brief to a design that fits its audience, moment and medium, instead of repeating one look. Covers reading the room, choosing a design direction from a library (Broadcast, Command Console, Editorial, Cinematic, Community, Daylight, Trophy, Co-brand, Themed event), composing with archetypes and signature moves, writing the words, and tasting with a scored rubric. Use for ANY visual, UX, brand, marketing or frontend work - product screens, landing pages, campaigns, social, video, decks, emails, venue screens - and whenever someone must choose or justify a visual direction.
---

<!-- esportra-canonical: company-v2 -->
# Design Recipe

> Ingredients make a cuisine. The recipe makes a meal. Knowing *when* to cook *which* dish makes a chef.

This skill is the company's creative method. It sits on top of two others:

- `esportra-brand` - the ingredients and the invariants (what never changes).
- `discovery-first` - the habit of understanding before building.

The central idea of this skill: **there is no single Esportra design.** There is one brand, many directions. A live match centre, a staff console with 400 rows, a champion's trophy card, a charity cup for a hospital and a launch film all carry the same invariants, but they are not the same dish. A designer who applies one favourite look to every brief is a cook with one recipe. We want chefs.

---

## The method at a glance

```
UNDERSTAND   1. Discovery      Run discovery-first. Who, what moment, what medium, what success.
             2. Truth          What the audience feels or fears right now, in their words.
             3. Idea           One sentence, no "and". Could a competitor say it? Sharpen.
             4. Hero           The one element that carries the idea.
DIRECT       5. Read the room  Score the context signals (reference/direction-engine.md).
             6. Choose         Pick the direction(s) that fit; generate 2-3 routes that differ in kind.
             7. Contract       Write the Direction Contract; get it approved when the brief is open.
COMPOSE      8. Archetype      Pick the shape of attention (reference/archetypes.md).
             9. Dress          Ingredients + 2+ signature moves, per the chosen direction.
            10. Words          Headline, caption, action, in the brand voice.
            11. Light & motion Cue light once; motion verbs only; stillness at rest.
            12. Formats        Recompose for every size; the hero survives every crop.
FINISH      13. Taste          Score the rubric (reference/tasting-rubric.md). Pass or go back.
            14. Remove one     Take one more thing away. Ship.
```

Steps 1-4 decide most of the quality. If a piece fails the tasting on questions 1-4, the fix is almost always a sharper truth, idea or hero, never more polish.

---

## 1-4. Understand

Run `discovery-first` completely. Then write:

- **Moment:** where on the arc (anticipation, nerves, match, outcome, belonging, trouble) and who exactly.
- **Truth:** the specific, slightly uncomfortable thing they feel. *"Most local cups start late and end in a Discord argument."*
- **Idea:** the brand's answer to that truth in one sentence. *"This one runs like a final."*
- **Hero:** the one element that carries it - a number, a name, a face, a date, a state.

If you cannot choose a hero, the idea is not sharp enough. Go back.

## 5-7. Direct: choose the dish, don't default to it

This is where most generated design goes wrong: the look is chosen by habit, not by the brief. Load **`reference/direction-engine.md`** and do it properly:

1. **Read the room.** Score the eight context signals: surface & medium, mode (persuade / operate / read / experience), moment on the arc, audience & literacy, information density, emotional target, brand latitude (L0-L3), hard constraints.
2. **Match directions.** The engine maps signals to a library of directions, each a coherent world with its own ingredients:

| Direction | In one line | Typical surfaces |
|---|---|---|
| **Broadcast** (default) | The arena: dark stage, one cue light, scorebug captions | Live, match rooms, results, announcements, core product |
| **Command Console** | Dense, calm, tabular tools for people who work fast | Staff/admin, dashboards with many rows, moderation |
| **Editorial** | A magazine for the scene: reading first | Stories, recaps, guides, help, academy, long posts |
| **Cinematic** | Key art: one huge idea, full-bleed, one action | Launches, landing pages, campaign heroes, trailers |
| **Community** | Human, warm, welcoming, people first | Onboarding, profiles, grassroots and social moments |
| **Daylight** | The stage with the lights up: light ground, ink and one cue | Print, documents, receipts, payouts, daylight venues, email |
| **Trophy** | The single peak: champions take the stage | Victory, awards, season finales |
| **Co-brand** | Shared stage with a partner's system | Publisher and sponsor collaborations |
| **Themed event** | A sub-brand world framed by our invariants | Seasonal, league, charity, retro or collab events |

3. **Generate routes that differ in kind.** Two or three routes, each a different honest answer: a different direction, archetype or hero, **not three colour variations of one layout**. Each route gets a one-line rationale tied to the truth.
4. **Write the Direction Contract** (template in the engine reference) and, whenever the brief leaves direction open, get it approved before composing. Record it in the project folder.

**Consistency rule:** direction changes happen at *surface* boundaries (the landing page vs the app, a campaign vs the product), never inside one flow. Within product UI, surfaces share the design system; they vary density and emphasis, not identity.

## 8-12. Compose

- **Archetype** (`reference/archetypes.md`): stage, face-off, scoreboard, path, spotlight, fork, verdict, pulse. One per band; long pages are sequences of archetypes.
- **Dress** with the direction's ingredients and at least two signature moves (never all eight). Pair one structural move (grid, cut edge, cue light) with one expressive one (hero number, versus lockup, lower-third).
- **Words** per `esportra-brand/reference/voice.md`. Write them before perfecting layout; if you cannot write the hint or headline, you do not understand the piece.
- **Light and motion:** cue light once; every movement nameable by one verb; stillness at rest; one reveal at the peak.
- **Formats:** recompose, never shrink. 16:9, 4:5, 9:16, in-product, single line (push/subject).

Product UI has its own anatomies, component pantry and state checklist: **`reference/product-ui.md`**. Occasion-specific recipes (launch, announcement, match day, live, victory, first run, sponsor, venue, bad news, empty states): **`reference/occasions.md`**.

## 13-14. Taste and finish

Score **`reference/tasting-rubric.md`** in writing. Pass = 22+/26, no zeros, questions 1-4 all scoring 2. Then ask out loud: *does this make the scene feel more official, or more chaotic?* Then remove one more thing.

Before calling it done, run the **sameness check**: open `.claude/company/memory/design-log.md` (create it if missing) and compare with the last pieces logged. If this piece would look the same had the brief been different, the direction was chosen by habit - go back to step 5. After shipping, append one line: date, piece, direction, archetype, hero, what was new.

---

## Working with other skills

- `impeccable` - production-grade UI craft, critique, audit, polish and its reviewer agents. Use its modes (Persuade / Operate / Read / Experience) as the "mode" signal in the direction engine. Its craft floor applies to all UI builds.
- `frontend-design` - distinctive, non-templated visual choices for new surfaces. Its warning list of generated-design defaults is required reading before choosing a direction.
- `esportra-brand` - invariants, tokens, voice. Always.
- `theme-factory`, `canvas-design`, `algorithmic-art` - for static pieces, posters, generative visuals within a chosen direction.
- `webapp-testing` - screenshot every surface at desktop and mobile before tasting.

## Reference library

| File | Use it when |
|---|---|
| `reference/direction-engine.md` | Choosing a direction: signals, library, latitude, routes, Direction Contract |
| `reference/directions/*.md` | Designing inside a direction: exact tokens, type, layout, imagery, motion, copy, worked example (broadcast, command-console, editorial, cinematic, community, daylight, trophy, co-brand, themed-event) |
| `reference/archetypes.md` | Choosing the shape of attention |
| `reference/occasions.md` | Recipes for launches, announcements, match day, live, victory, first run, sponsors, venues, money, bad news, empty states |
| `reference/layout-and-type.md` | Grids, breakpoints, space ladder, type scale per direction, numbers |
| `reference/colour-system.md` | Role tokens, contrast pairs, signal matrix, ratios per direction |
| `reference/motion-spec.md` | The five verbs with exact values; spec template |
| `reference/product-ui.md` | Kit pantry, component decision tree, anatomies, state copy |
| `reference/critique-protocol.md` | Reviewing work: order of questions, writing findings, verdicts |
| `reference/tasting-rubric.md` | Scoring before shipping; worked scoring example |
| `reference/creative-brief.md` | Brief template, filled example, hand-off contract |
| `reference/case-studies.md` | Three end-to-end cases (product, campaign, bad news) |
| `reference/anti-patterns.md` | Smells, why they fail, fixes |

If this file was loaded without the `esportra-canonical: company-v2` marker at the top (e.g. a personal skill with the same name shadowed it), read the repo copy at `.claude/skills/design-recipe/SKILL.md` instead.

## Briefs and hand-offs

Every piece starts from a filled Creative Brief and ends with the hand-off contract: **`reference/creative-brief.md`**. A brief with empty fields is a question list, not a brief - send the questions back (per `discovery-first`) instead of guessing.

## Anti-patterns

`reference/anti-patterns.md` lists gamer clichés, template smells, trust killers and process smells, each with why it fails and what to do instead. Scan it before tasting.
