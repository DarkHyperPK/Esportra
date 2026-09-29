# Direction dossier: Broadcast

> The arena. A dark stage, one cue of light, captions like a scorebug. The brand at rest.

Broadcast is where Esportra *rests*, not where it must always be. It is borrowed from esports broadcast graphics: the scorebug in the corner, the lower-third with a player's name, the caster desk between maps. It is calm, exact and competitive. It is the right answer for most core product surfaces and many announcements - and the wrong answer when a surface needs to be read at length, run at high density, welcome a newcomer, or celebrate a peak. Choose it from the signals, never by habit.

---

## 1. Signal profile

| Signal | Fits when | Doesn't fit when |
|---|---|---|
| S1 Surface | Product screens, match rooms, announcements, fixtures, results cards, venue screens | Long reading (→ Editorial), print/documents (→ Daylight) |
| S2 Mode | Operate (players, captains, organizers doing a task) · Persuade on owned channels | Read-heavy, Experience-led |
| S3 Arc | Anticipation, nerves, match, outcome | Trouble (use the surface's direction, stripped) |
| S4 Audience | Players, captains, organizers - fluent in broadcast language | Newcomers/parents who need warmth first (→ Community) |
| S5 Density | One fact to a moderate table | Hundreds of rows (→ Command Console) |
| S6 Emotion | Calm confidence, anticipation, focus | Pure celebration (→ Trophy), warmth (→ Community) |
| S7 Latitude | L0-L1 | L3 |

**Anti-signal check:** if you picked Broadcast and the piece is a 2,000-word recap, a staff console with 400 rows, a printed payout statement or a charity cup - stop and re-read the room.

---

## 2. Ingredients

### Ground and surfaces
| Layer | Value | Class |
|---|---|---|
| Stage | #09090B | `bg-background` / `bg-matte-black` |
| Panel | #111114 | `bg-card` |
| Inset | white 2% | `bg-white/[0.02]` |
| Hover | white 4% | `bg-white/[0.04]` |
| Pressed / neutral selected | white 6% | `bg-white/[0.06]` |
| Accent selected | rose 6-7% | `bg-rose-500/[0.06]` |
| Control well | black 30% | `bg-black/30` (in `CONTROL_CLASS`) |
| Floating bars | background 90% + blur | `bg-background/90 backdrop-blur-md` |

Two luminance steps separate anything. Shadows only on true overlays (menus, dialogs).

### Light (colour)
Bone white (`text-white`) carries what must be read and the primary action. Greys (`zinc-400` secondary, `zinc-500` hints/captions, `zinc-600` disabled/separators). **One rose cue** per view: the rail marker, the live state, the selected choice, the champion's underline. Semantic tones (`TONE_*`) only for states.

### Type
| Step | Spec |
|---|---|
| Display | Poppins 900, 30-48 px product / up to 96 px campaign, tracking -2%, leading 1.0 |
| Title | Poppins 700, 18-20 px, leading 1.2 |
| Body | Inter 400, 14-15 px, leading 1.5 |
| Label | Inter 500, 13 px, `zinc-200` (`LABEL_CLASS`) |
| Hint | Inter 400, 12 px, `zinc-500`, relaxed (`HINT_CLASS`) |
| Caption / eyebrow | Mono 700, 10-11 px, uppercase, tracking 0.28em, `zinc-500` (`EYEBROW_CLASS`) |
| Numbers | Poppins 900, `tabular-nums`, unit at ~30% of the value's size in `zinc-500` |

### Shape and line
Square corners (`rounded-none`) on panels, buttons, inputs, pills. Round only for avatars and status dots. Hairlines `border-white/[0.07]`; card outlines as inset shadow `shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]` → hover `0.16` → selected `rgba(244,63,94,0.7)`. The gap-px scoreboard grid (`grid gap-px bg-white/[0.06]` with `bg-card` tiles). The 2 px rose cue line.

### Space
4 px base. Label→control 8 px · fields 20 px · sections 32 px (hairline) · regions 40-48 px · panel padding 20-24 px · phone gutter 16 px.

### Imagery
Team crests in dark wells (`bg-white/[0.04]`, padded, `object-contain`); game art cropped 16:9 as a window; players lit by the monitor's glow. Designed fallbacks for every missing image.

### Motion
Broadcast wipe. Arrive: opacity 0→1 + y 6→0, 180 ms, `cubic-bezier(0.2, 0, 0, 1)`. Move: shared layout (framer `layoutId`) 220 ms. Confirm: rose fill slides under the white primary, 200 ms. Replace: exit 150 ms / enter 250 ms. Nothing loops at rest.

### Voice
The referee most of the time; the caster before and after the match. Short, exact, calm; mono caps captions for states and context.

---

## 3. Signature moves that belong here

All eight are native to Broadcast. The most characteristic pairs: **caption over hero number + scoreboard grid** (stats, schedules), **versus lockup + cue light** (fixtures, live matches), **lower-third + cut edge** (people).

---

## 4. Composition patterns

- **Product view:** header (identity, state pill, one primary action) → the question the view answers → the content in its archetype → sticky action bar if the task is long.
- **Announcement (4:5):** caption at top-left → hero (date/prize/name) at 40% of the frame → scoreboard band for facts → white action bottom-right.
- **Match card:** caption (round, format) → versus lockup on a centre axis → live state on the axis in rose → time in mono.

---

## 5. Do / don't

| Do | Don't |
|---|---|
| One rose cue per view | Rose borders on buttons, rose headings, rose icons |
| Caps only in mono captions and pills | Caps headlines or caps sentences |
| Winner white, other side grey | Red for the loser |
| Skeleton in the real layout's shape | Full-screen spinner |
| Eyebrows where they orient | An eyebrow on every block as decoration |

---

## 6. Copy samples

- Caption: `ROUND OF 16 · BEST OF 3 · STATION 4`
- Title: "Check-in closes at 7:59 PM"
- Empty: "No matches yet. The bracket appears here when check-in closes."
- Error: "Couldn't load the bracket. Check your connection and try again."
- Action: "Check in your team"

---

## 7. Worked example: captain's check-in view (phone, nerves)

Signals: S1 product · S2 operate · S3 nerves · S4 captain · S5 one fact + a short list · S6 reassurance · S7 L0.

```
┌───────────────────────────────┐
│ KARACHI VALORANT OPEN · CHECK-IN │  ← caption
│                               │
│ 12:40                         │  ← hero number (time left), Poppins 900
│ minutes left                  │  ← unit, zinc-500
│ ▔▔ (2px rose cue under timer) │
│                               │
│ Night Owls · 3 of 5 checked in│  ← state, body
│ ┌───┬───────────────┬───────┐ │
│ │ ● │ Hamza "Viper" │ In    │ │  ← scoreboard grid rows, StatusPill
│ │ ○ │ Ali           │ Not in│ │
│ └───┴───────────────┴───────┘ │
│                               │
│ [ CHECK IN YOUR TEAM ]        │  ← one white primary, thumb reach, sticky
└───────────────────────────────┘
```

Why Broadcast: a fluent audience under time pressure needs the scorebug's clarity - one number, one state, one action. Why not Community: warmth would slow the one decision that matters.
