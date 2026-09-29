# Tasting rubric

Score every piece before it ships: 0 = no, 1 = partly, 2 = yes. Write the scores down, per question, with one line of evidence each. A rubric filled in from memory is a formality, not a tasting.

| # | Question | 0 looks like | 2 looks like |
|---|---|---|---|
| 1 | **Three-second test.** Does a stranger know what it is, the state of play, and what is theirs to do? | They must read everything | All three at a glance |
| 2 | **One idea.** Can you say its idea in one sentence without "and"? | Several messages compete | One sentence, one feeling |
| 3 | **One hero.** Is exactly one element clearly biggest and first? | Two or more fight | One, unmistakable |
| 4 | **Right direction for the moment.** Does the direction fit the signals (audience, arc, mode, medium, latitude)? | Default look applied regardless | Direction chosen from the signals, and the contract says why |
| 5 | **Cue light spent once.** Is the accent used for one thing only? | Accent on several things | One cue, in the right place |
| 6 | **Colour as meaning.** Could you say what every colour means? | Decorative colour; signals misused | Every colour has a job |
| 7 | **Two voices.** Human sentences in sentence case; captions in mono caps; never mixed? | Shouting headlines or chatty captions | Both voices clean |
| 8 | **Signature.** At least two signature moves, not all eight? | Could be any brand | Unmistakably ours, not a specimen |
| 9 | **Rest and rhythm.** Does the space ladder group things, with rest to breathe? | Uniform spacing, crammed | Clear groups, real rest |
| 10 | **Words.** Specific, calm, player-first, no clichés or fake urgency? | Hype, vague or cute | Every word earns its place |
| 11 | **Motion** (if any). Every movement nameable by one verb; stillness at rest? | Things move for no reason | Every movement means something |
| 12 | **Every format.** Does the hero survive 16:9, 4:5, 9:16, in-product and a single line (as required)? | Breaks outside one size | Recomposed for each |
| 13 | **Everyone can use it.** Contrast, text size, meaning without colour, reduced motion, keyboard, screen reader? | Fails for some people | Works for all |

**Pass:** 22+ out of 26, **no zero anywhere**, and questions 1-4 each scoring 2.

- A zero on 1-4 means the *idea or direction* is wrong: go back to the recipe's understand/direct steps, not to the pixels.
- A zero on 5-13 is a craft fix: fix and re-score.

**The final question**, out loud, after the score: *does this make the scene feel more official, or more chaotic?* If you hesitate, it is not ready.

**Sameness check:** compare with the last entries in `.claude/company/memory/design-log.md`. Would this piece look the same if the brief had been different? If yes, the direction was chosen by habit.

**The last move:** when it passes, remove one more thing.

## Product-UI additions (Operate surfaces)

Also verify, with evidence:

- Every state designed: empty, loading (skeleton in real shape), partial, error (plain words + recovery), locked (with reason), permission-limited (hidden, not disabled), saving/saved.
- One primary action per view; destructive actions confirmed and never beside the primary.
- Screenshots at 1440 px and 390 px with realistic data (long names, zero items, many items, a failure).
- Build gates pass (`npm run lint`, `npm run test`, `npm run build` incl. `check:buttons`).
