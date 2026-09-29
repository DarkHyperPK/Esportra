# Product UI: the recipe applied to the Esportra app

The product is where the brand is used, not just seen. Most product surfaces are **Operate** mode, latitude **L0-L1**, and lead with **Broadcast** or **Command Console** (see `direction-engine.md`). The rules here make the recipe concrete in code. They are not a template: the anatomies are starting points, and the direction engine still decides density and emphasis per surface.

---

## The pantry (reuse before inventing)

All in `src/components/ui/kit` (import from `@/components/ui/kit`) and `src/components/management/CommandSurface.tsx`. Each already encodes the brand's decisions; using it is how you inherit taste. The last column matters most.

| Component | For | Wrong when |
|---|---|---|
| `tone.ts` tokens (`TONE_*`, `PANEL_CLASS`, `EYEBROW_CLASS`, `LABEL_CLASS`, `HINT_CLASS`, `CONTROL_CLASS`, `FORM_MEASURE_CLASS`) | Every colour, label, hint and control style | Hard-coding hex or mixing shadcn defaults beside them |
| `PageIntro` | A full page opening: eyebrow, display title, description, aside | Inside a panel or dialog |
| `CommandHeader` / `CommandSection` / `CommandActionBar` | Panel header, padded band, sticky action bar in the dashboard | Adding actions to the header |
| `FormSection` | A titled group of fields: one question per section | Two-field forms; one-field sections |
| `Field` (+ `fieldIds`) | Label, control, hint-or-error, a11y wiring, `lockedReason`, `review` dot | Never skipped |
| `ChoiceCard` / `ChoiceGroup` | 2-4 options whose consequences need explaining (`mode='radio'` or `'action'`) | Many or self-explanatory options |
| `ChipGroup` | Short values picked often (8/16/32, best-of) | Options needing a sentence |
| `ToggleRow` | On/off with consequence, can nest dependent settings | Choosing between two named alternatives |
| `StatusPill` | The state of a thing in a list | Decorating headings |
| `InlineNotice` | Something to know on this screen before acting; load failures with Try again | Post-action confirmation (toast); blocking (disable + reason) |
| `StepProgress` | Linear flows of 5+ steps | 3 steps or fewer (an eyebrow "Step 2 of 3" is enough) |
| `ActionBar` / `PanelSaveBar` | Sticky primary action; explicit-save state ("Unsaved changes" / "Everything is saved") | Short screens; auto-saving controls |
| `SummaryCard` / `Timeline` | Review steps; dates leading to one moment | Editing in place; unordered data |
| `CommandButton` (`primary`, `secondary`, `ghost`, `danger`, `success`, `warning`) | One primary per view; ghost for back/cancel; danger behind confirmation | Rose borders/rings on buttons (fails `check:buttons`) |

A new component is a new word in the language: it must earn its place, then go into the kit for everyone.

---

## Anatomies

### Settings panel (Configure)
1. `CommandHeader`: nav group as eyebrow, panel name as title, the screen's question as description.
2. `FormSection`s ordered by the order the user decides things, each one question.
3. Dependents nest inside the `ToggleRow` they depend on.
4. Sticky `PanelSaveBar`; Save disabled until changed; Discard only while changed.
5. Locked fields show a lock and the reason.

### Dashboard page
Header (identity, phase, actions) · rail grouped by intent (Run / Community / Configure) and cut by permission · Overview as an action queue ("Needs you" first, blocking items first), numbers second · one Publish location per breakpoint.

### Wizard
Progress (StepProgress for 5+, eyebrow for fewer, none when editing) · one question per step as the title · defaults filled and marked · Back (ghost) left, next (primary) right · final review reads as a sentence with exactly what the primary will do · each step opens at the top.

### Fork (choice screen)
Two or three `ChoiceCard`s (`action`, `stack`) with icon, verb-phrase title, what-happens-next description, meta line; the faster path first; one badge at most; no footer.

### List
Summary strip (3-4 numbers that matter) · toolbar (search, filters, view toggle; bulk actions only when rows are selected) · rows: identity → state → metadata → actions with `aria-label`s · cards when identity is visual and count is small, table when comparing many · pagination with "Showing 1-20 of 64".

### Empty, loading, error, no permission
| State | Anatomy |
|---|---|
| Empty (first use) | Title stating the absence, why it matters, the one action that fills it |
| Empty (filtered) | What was searched, the way out |
| Loading | Skeleton in the real layout's shape - never a full-screen spinner |
| Error | `InlineNotice` critical: what failed, what to try, Try again |
| No permission | Hide the entry point; if reached by link, say who can do it |

---

## Interaction states

Every control is designed in all its states: rest, hover, focus-visible (a visible ring, `ring-white/40`), pressed, selected, disabled (with reason where not obvious), loading (spinner only inside the button, replacing its label), success, error. Outline strength is a state ramp (rest 0.08 → hover 0.16 → selected rose 0.7) so the element responds before anything is read.

## Motion in product

Arrive (fade + 6 px rise, ~180 ms), Move (shared layout for markers), Confirm (rose slide on the primary), Replace (exit 150 ms, enter 250 ms), Alert (new item arrives at the top). Nothing loops at rest; respect reduced motion; motion is never the only signal.

## Data and logic

Rules about what to show (nav by permission, "needs you" items, validity) live in pure, tested functions (`src/services/*`, `*Rules.ts`), never in JSX. Components render; hooks fetch (per `CLAUDE.md`). A screen whose logic is tangled cannot be simplified, so clean logic is a design prerequisite.

## Verification

Screenshots at 1440 px and 390 px with realistic data (long names, zero, many, a failure) · the tasting rubric with the product-UI additions · `npm run lint`, `npm run test`, `npm run build` (including `check:buttons` and the JSX symbol audit).

---

## Component decision tree

Use this before reaching for any component. Walk top to bottom; the first match wins.

```
Is the user choosing between options?
├─ Yes → How many options?
│   ├─ 2, on/off with a consequence ............ ToggleRow
│   ├─ 2-4, consequences need a sentence ....... ChoiceCard / ChoiceGroup (mode 'radio')
│   ├─ 2-4, choosing navigates somewhere ....... ChoiceCard (mode 'action', layout 'stack')
│   ├─ 3-8 short self-explanatory values ....... ChipGroup
│   └─ 5+ or varies per game ................... Select with CONTROL_CLASS
├─ Is the user entering a value? ............... Field + Input/Textarea with CONTROL_CLASS
├─ Is it the state of a thing in a list? ....... StatusPill
├─ Must they know something before acting here?  InlineNotice (tone by meaning)
├─ Did an action just succeed or fail? ......... Toast (plain title: "Saved" / "Couldn't save")
├─ Is it a sequence of dates to one moment? .... Timeline
├─ Is it a review of choices before committing?  SummaryCard (with Edit per row)
├─ Is it a linear flow of 5+ steps? ............ StepProgress (fewer: eyebrow "Step 2 of 3")
├─ Is there a long form with explicit save? .... PanelSaveBar / ActionBar (sticky)
└─ Is it 3-4 headline numbers? ................. gap-px stat strip (caption over number)
```

If nothing fits, ask the Creative Lead before inventing. A new component needs: the need it serves, why no kit component fits, its states, its a11y behaviour, and a plan to add it to the kit.

## State copy examples

| State | Surface | Copy |
|---|---|---|
| Empty (first use) | Participants | "No teams yet. Share the tournament link or invite teams directly." [Invite teams] |
| Empty (filtered) | Participants | "No teams match "owls". Clear the search to see all 32." |
| Loading | Any | (skeleton in the real layout; no copy) |
| Error (load) | Bracket | "Couldn't load the bracket. Check your connection and try again." [Try again] |
| Error (save) | Settings panel | Toast: "Couldn't save" + the server's reason if it helps the user act |
| Locked | Team cap | Lock icon + "Locked after registration opens, so the bracket stays fair." |
| Permission-limited | Payouts | (hidden in nav); by direct link: "Only the organizer can change payouts." |
| Unsaved | Settings panel | Save bar: "Unsaved changes" · [Discard] [Save changes] |
| Saved | Settings panel | Save bar: "Everything is saved" |
| Success (commit) | Check-in | "You're checked in. First match 8:30 PM, Station 4." |
| Destructive confirm | Remove team | "Remove Night Owls? They lose their slot and are told by email." [Remove team] [Cancel] |

## Anatomy of a great product view (checklist)

- [ ] The view's one question is written as its description.
- [ ] Eyebrow names the area (nav group); title names the thing.
- [ ] Decision order, not data order.
- [ ] Rare items cut from the default view; role-inaccessible items hidden.
- [ ] One primary action; its position is predictable (header on desktop, sticky bottom on phone for long flows).
- [ ] Every state from the table above exists.
- [ ] Words written before layout; each hint explains *why*.
- [ ] Logic (what to show, validity) lives in a tested service; the component only renders.
