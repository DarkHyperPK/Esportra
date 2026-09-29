# Direction dossier: Command Console

> The tool of people who work fast. Dense, quiet, tabular, keyboard-first. The brand shows up as precision, not decoration.

Command Console is Broadcast's working cousin. Organizers, staff, referees and admins spend hours in these surfaces - reviewing 300 registrations, resolving disputes, approving payments, moderating bans. Their success is speed and certainty. Expression gets in the way; organisation, scannability and trust in the data are everything.

---

## 1. Signal profile

| Signal | Fits when | Doesn't fit when |
|---|---|---|
| S1 Surface | Admin and staff tools, dashboards with many rows, moderation queues, payments review | Public-facing or marketing surfaces |
| S2 Mode | Operate | Persuade, Read |
| S3 Arc | Nerves and match (live operations), outcome (payouts, disputes) | Anticipation campaigns |
| S4 Audience | Expert daily users (organizers, staff, admins) | Newcomers, fans |
| S5 Density | A table to hundreds of rows | One fact |
| S6 Emotion | Calm control, certainty | Celebration, warmth |
| S7 Latitude | L0 | L2-L3 |

**Anti-signal check:** if a player (not staff) sees this surface, or if it has fewer than ~10 items, you probably want Broadcast.

---

## 2. Ingredients

### Ground and light
The Broadcast ground, quieter still. The rose cue appears almost only as the "you are here" marker in navigation and the focused row. **State colour does the work**: `TONE_*` pills for pending (amber), approved/paid (emerald), rejected/failed (red), neutral (zinc). Numbers stay white.

### Type (tighter scale)
| Step | Spec |
|---|---|
| Page title | Poppins 700, 20-24 px (no display type on work surfaces) |
| Section title | Poppins 700, 16 px |
| Table body | Inter 400, 13-14 px, leading 1.4 |
| Column headers | Inter 500, 12 px, sentence case, `zinc-400` (not mono caps - they scan poorly at density) |
| IDs, times, codes | Mono 500, 12-13 px, `tabular-nums` |
| Counts | Poppins 800, 20-28 px in summary strips only |

### Density and space
Space ladder at ~0.75×: row height 40-44 px (never below 36 px for touch), cell padding 12/16 px, section gap 24 px. **Density must be organised**: group by intent, put "needs you" first, cut by permission.

### Structure
- Summary strip of 3-4 counts that matter (gap-px tiles).
- Toolbar: search first, filters, saved views, then bulk actions (only when rows are selected).
- Table: identity → state → metadata → actions; sticky header; row hover `bg-white/[0.03]`; selected row with the 2 px rose inset.
- Detail in a side sheet or drawer, not a new page, so the queue keeps its place.

### Interaction
Keyboard-first: `/` focuses search, `j/k` move, `x` selects, `Enter` opens, `Esc` closes. Every icon action has an `aria-label` and a tooltip. Bulk actions confirm with a count ("Approve 12 payments?").

### Motion
Feedback only: confirm (150 ms), alert (new item arrives at the top, 180 ms). Row updates flash the changed cell's background once (`bg-white/[0.06]` → transparent, 600 ms). Zero decorative motion.

### Voice
Pure referee. Column names and statuses in the users' words ("Payment to review", not "PENDING_VERIFICATION"). Errors say what to do.

---

## 3. Signature moves that belong here

Scoreboard grid (tables and summary strips) · cue light (nav marker, focused row) · caption over number (summary strip only). Avoid expressive moves (versus lockup at hero scale, lower-thirds).

---

## 4. Do / don't

| Do | Don't |
|---|---|
| "Needs you" rows first, with the one action inline | Chronological dumps with no triage |
| Hide what a role can't do | Disabled buttons everywhere |
| Sentence-case column headers | Mono caps headers across a 10-column table |
| Pagination with "Showing 1-50 of 312" | Infinite scroll on a management surface |
| Side sheet for detail | Navigating away and losing the queue position |

---

## 5. Copy samples

- Summary: `REGISTERED 214 · CHECKED IN 168 · PAYMENTS TO REVIEW 7`
- Row state: "Payment to review", "Checked in", "Disputed"
- Bulk confirm: "Approve 7 payments? Teams are told immediately."
- Empty filtered: "No teams match "owls". Clear the search to see all 214."

---

## 6. Worked example: payments review queue (organizer, desktop, outcome)

Signals: S1 product · S2 operate · S3 outcome · S4 organizer · S5 hundreds · S6 certainty · S7 L0.

```
PAYMENTS                                              [Export CSV]
┌──────────┬──────────┬──────────┬──────────┐
│ TO REVIEW│ APPROVED │ REJECTED │ TOTAL PKR│   ← gap-px summary strip
│ 7        │ 201      │ 6        │ 535,000  │
└──────────┴──────────┴──────────┴──────────┘
[/ Search teams]  [Status: To review ▾]              (3 selected) [Approve] [Reject]
┌─┬──────────────┬──────────────────┬────────────┬──────────┬─────┐
│☐│ Team         │ State            │ Amount     │ Paid at  │     │
│☑│ Night Owls   │ ● Payment to rev.│ PKR 2,500  │ 18 Nov 14:20 │ ⋯ │  ← focused row: 2px rose inset
└─┴──────────────┴──────────────────┴────────────┴──────────┴─────┘
Showing 1-50 of 214
```

Why Console: an expert doing repetitive, consequential decisions needs triage, keyboard speed and certainty. Why not Broadcast: hero numbers and captions everywhere would slow scanning.
