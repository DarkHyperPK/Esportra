# Tasting rubric

Score every piece before it ships: **0** = no, **1** = partly, **2** = yes. Write the score *and one line of evidence* for each question. A rubric filled in from memory is a formality, not a tasting.

---

## The thirteen questions

| # | Question | 0 looks like | 1 looks like | 2 looks like |
|---|---|---|---|---|
| 1 | **Three-second test.** Does a stranger know what it is, the state of play, and what is theirs to do? | Must read everything | Two of three | All three at a glance |
| 2 | **One idea.** Can you say its idea in one sentence without "and"? | Several messages compete | One idea, blurred by extras | One sentence, one feeling |
| 3 | **One hero.** Exactly one element clearly biggest and first? | Two or more fight | One wins, barely | One, unmistakable |
| 4 | **Right direction for the moment.** Direction fits the signals and the contract says why | Default look applied regardless | Plausible but unjustified | Chosen from signals, rejected alternatives named |
| 5 | **Cue light spent once.** | Accent on several things | Two cues | One cue, right place |
| 6 | **Colour as meaning.** | Decorative colour, signals misused | One unexplained colour | Every colour has a job |
| 7 | **Two voices.** Sentence case for humans, mono caps for captions | Shouting headlines or chatty captions | One slip | Both voices clean |
| 8 | **Signature.** ≥ 2 signature moves, not all eight | Could be any brand | One move | Unmistakably ours, not a specimen |
| 9 | **Rest and rhythm.** Space ladder groups things; rest to breathe | Uniform spacing, crammed | Grouping unclear in one area | Clear groups, real rest |
| 10 | **Words.** Specific, calm, player-first, exact, no clichés | Hype, vague or cute | One weak line | Every word earns its place |
| 11 | **Motion** (if any) | Things move for no reason | One unjustified movement | Every movement has a verb; still at rest |
| 12 | **Every format.** Hero survives each required format | Breaks outside one size | One format weak | Recomposed for each |
| 13 | **Everyone can use it.** Contrast, size, meaning without colour, reduced motion, keyboard, screen reader | Fails for some people | Minor gaps | Works for all |

**Pass:** 22+ / 26, **no zero anywhere**, and **Q1-Q4 each = 2**.

- A zero or one on Q1-4 → the *idea or direction* is wrong. Go back to understand/direct, not to the pixels.
- A zero on Q5-13 → a craft fix. Fix and re-score.

**Final question, out loud:** *does this make the scene feel more official, or more chaotic?* Hesitation = not ready.

**Sameness check:** compare with the last entries in `.claude/company/memory/design-log.md`. Would this look the same if the brief had been different? If yes, the direction was chosen by habit.

**Last move:** when it passes, remove one more thing.

---

## Product-UI additions (Operate surfaces) - evidence required

- [ ] Every state designed: empty, loading (skeleton in the real shape), partial, error (plain words + recovery), locked (with reason), permission-limited (hidden, not disabled), saving/saved, success.
- [ ] One primary action per view; destructive actions confirmed and never beside the primary.
- [ ] Screenshots at 1440 px and 390 px with realistic data (long names, zero, many, a failure).
- [ ] Keyboard path complete; focus visible; icon buttons labelled.
- [ ] Build gates pass (`npm run lint`, `npm run test`, `npm run build` incl. `check:buttons`).

---

## Worked scoring example

**Piece:** tournament announcement, 4:5, first draft.

| # | Score | Evidence |
|---|---|---|
| 1 | 1 | Event and date clear; action ("Register") low contrast, easy to miss |
| 2 | 2 | "Karachi's biggest Valorant night" - one idea |
| 3 | 0 | Prize (PKR 150,000) and date (Sat 8 PM) both at ~90 px |
| 4 | 2 | Broadcast; S3 anticipation, S7 L1; Cinematic rejected (not a launch) |
| 5 | 1 | Rose on the date *and* the register button border |
| 6 | 2 | - |
| 7 | 1 | Headline in caps |
| 8 | 2 | Caption over number, scoreboard facts |
| 9 | 1 | Facts band crammed against the hero |
| 10 | 1 | "Biggest" is an unprovable superlative |
| 11 | n/a | static |
| 12 | 1 | 9:16 crops the date |
| 13 | 2 | - |

**Total 16/24 (motion n/a) - FAIL** (zero on Q3; Q1 and Q3 < 2). Fixes, in order: choose one hero (the date; prize to the facts band) → sentence-case headline → drop "biggest" for "32 teams, one night" → rose only under the date; white button → recompose 9:16 → re-score. Second draft: 24/24.
