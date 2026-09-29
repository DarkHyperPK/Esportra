# Critique protocol

How to review design work so that feedback improves the piece instead of decorating it with opinions. Used by the Creative Lead in reviews, the CMO in brand checks, Frontend QA for fidelity, and any agent reviewing its own work.

---

## 1. Rules of a good critique

1. **Judge against agreements, not taste.** The brief, the Direction Contract, the acceptance criteria, the rubric. "I don't like the green" is not feedback; "Q6: green is used on a non-state element" is.
2. **Evidence first.** Screenshots at 1440 px and 390 px with realistic data, every state. No evidence, no critique.
3. **Causes, not symptoms.** "Two heroes are fighting (Q3)" not "make the title smaller". Fixes aimed at causes solve families of problems.
4. **Order matters.** Idea and direction before layout; layout before craft; craft before polish. Never polish a piece whose idea fails.
5. **Name the fix, not just the fault.** Every finding carries a proposed direction for the fix.
6. **Separate blocking from nits.** Material fixes block approval; nits never do.
7. **Credit what works.** One line on what must be kept prevents it being "fixed" away.

## 2. The order of questions

Walk this order; stop and send back at the first level that fails.

| Level | Questions | If it fails |
|---|---|---|
| **1. Idea** | Is there one idea? Does it answer the audience's truth? Is it ours (could a competitor say it)? | Back to the brief (recipe steps 1-3) |
| **2. Direction** | Do the signals support this direction? Is the contract being followed? Sameness check vs design log? | Back to direction (steps 5-7) |
| **3. Hierarchy** | One hero? Reading order matches the archetype? Three-second test? | Recompose (step 8) |
| **4. System** | Colour as meaning, cue once, two voices, space ladder, kit usage, signature moves present | Craft fixes |
| **5. Words** | Specific, calm, player-first, exact time/money, verbs on buttons | Copy fixes |
| **6. States & formats** | Every state designed; both breakpoints; all formats recomposed | Completion fixes |
| **7. Motion & a11y** | Verbs only, stillness at rest, reduced motion; contrast, labels, focus, meaning without colour | Craft fixes |
| **8. Polish** | Alignment, optical adjustments, consistency | Nits |

## 3. Writing a finding

```
[BLOCKING|NIT] Level · Rubric Q# / Contract line
Where: surface › region › element (screenshot ref)
What: the observable problem, in one sentence
Why it matters: the effect on the user or the brand
Fix direction: what to change, aimed at the cause
```

Example:

```
[BLOCKING] Hierarchy · Q3
Where: Tournament page › header (desktop.png)
What: The prize pool (48 px) and the tournament name (44 px) compete as heroes.
Why it matters: The first glance lands on neither; the three-second test fails.
Fix direction: The brief's hero is the start time; demote the prize to a caption-over-number tile in the facts band.
```

## 4. Verdicts

- **APPROVED** - rubric passes (22+/26, no zeros, Q1-4 = 2), no blocking findings.
- **NEEDS_REVISION** - any blocking finding. List material fixes in the order above.
- **REDIRECT** - level 1 or 2 fails. Do not list craft fixes; send back to the brief or direction with the reason.

## 5. Self-critique (before asking anyone)

Put the piece away for a moment, then look at it as the audience in their moment (the captain with four minutes left, the parent reading on a phone). Run levels 1-3 honestly. Then remove one thing.

## 6. Anti-patterns in critique

Taste as feedback · polishing a piece that fails its idea · 40 nits and no priority · "make it pop" · "can we try it in blue" without a reason · fixes that treat symptoms · critique without screenshots · rewriting the designer's work instead of naming the cause.
