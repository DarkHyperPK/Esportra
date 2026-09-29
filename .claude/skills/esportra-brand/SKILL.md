---
name: esportra-brand
description: Esportra's brand identity - the essence, the promise, the pillars, the palette as a language, type, signature moves, voice and the lines we never cross. Use for ANY Esportra-branded output (product UI, landing pages, social, video, decks, venue screens, emails, docs). This replaces the generic `brand-guidelines` skill, which describes Anthropic's brand and must never be applied to Esportra work.
---

# Esportra Brand

> **Esportra is the referee's booth: dark, quiet and exact, and when something needs you, one light comes on.**

This skill is the brand's constitution. It tells you what must never change (the invariants) and what may flex per occasion (the variables). The full long-form recipe, with visual boards, lives in the Esportra Design Recipe doc; this skill is its operational core. For *how to design with it* (choosing a direction, composing, tasting), load `design-recipe`.

> **Warning:** `.claude/skills/brand-guidelines` is Anthropic's brand (orange `#d97757`, Lora body text). Never apply it to Esportra work.

---

## 1. Who we are

- **Category:** the competitive platform for the grassroots-to-pro esports scene - tournaments, matches, and the venues they happen in.
- **Insight:** talent is everywhere; a stage that takes you seriously is not.
- **Promise:** *Every match, official.* Eight teams or eight hundred, it runs like a real event, looks like one and is remembered like one.
- **Enemy:** chaos (spreadsheet brackets, Discord ping storms, disputed scores, late starts) and its visual twin, noise (RGB clichés and hype design that make grassroots events look smaller).
- **Borrowed world:** esports broadcast graphics - the scorebug, the lower-third, the caster desk - not SaaS dashboards and not game trailers.

### The cast

| Who | Wants | Fears | We give them |
|---|---|---|---|
| Competitors (players, captains) | To prove themselves on a real stage | Chaos, unfair results, being ignored | A match that feels official and a record that is theirs |
| Hosts (organizers, staff) | An event people respect | Starting late, disputes, looking amateur | Calm control; tools that make them look professional |
| Fans | A story to follow | Not knowing when, where, who | Clear stakes, clear schedule, shareable moments |
| Venues | Full stations, a reputation | Empty seats, messy bookings | A place on the scene's map |
| Partners | Credible association | Chaos or cringe beside their name | A premium, trustworthy frame |

### The arc of competition

Every piece sits somewhere on this arc, and the brand's volume follows it:

| Beat | They feel | The brand |
|---|---|---|
| Anticipation | Hope, hype | Sets the stage, shows the stakes - loudest here |
| Nerves | Doubt, admin stress | Removes chaos, one clear step at a time |
| The match | Total focus | Steps back, near silent - the players are the show |
| Outcome | Joy or the sting | Records it with dignity |
| Belonging | A story to tell | Makes it worth sharing |
| Trouble (any time) | Anxiety, distrust | Plain facts, one apology, what happens next |

---

## 2. Pillars and personality

| Pillar | Means | Looks like | Sounds like |
|---|---|---|---|
| **Composure** | Calm under pressure | Dark, uncluttered, one light on | Short sentences, no exclamation marks |
| **Precision** | Exactness as respect | Hairlines, grids, tabular numbers | "Starts 8:00 PM PKT", never "starting soon" |
| **The stage** | Everyone who competes deserves to look pro | Broadcast devices, cinematic framing of real players | Players and teams are the subject |
| **Belonging** | A community of tribes, cities, teams | Team colours framed with respect, local places shown with pride | Warm, specific, local; never "gamers" |

**Character:** the *referee* (fair, exact, unflappable) and the *caster* (knows the story, gives it words, warm, never louder than the play). The referee speaks most of the time; the caster comes forward before and after the match.

**Resting dials** (moments may turn a dial, never past the far end):

| Dial | Rest position |
|---|---|
| Serious ↔ Playful | 70 / 30 |
| Quiet ↔ Loud | 75 / 25 |
| Premium ↔ Accessible | 60 / 40 |
| Technical ↔ Human | 50 / 50 |
| Global ↔ Local | 35 / 65 |

---

## 3. Invariants (never change, in any direction or occasion)

1. **Honest words.** Specific facts, no fake urgency, no superlatives we cannot prove, no hidden fees.
2. **One hero per piece.** One thing is clearly the biggest and first.
3. **Colour means something.** Every colour has a job; decoration is grey.
4. **The cue-light discipline.** The accent is scarce: one cue per composition.
5. **Players are the stars.** The platform stays backstage. Never mock a losing side.
6. **Accessibility.** AA contrast, meaning never carried by colour alone, reduced motion respected.
7. **Real people, real scene.** No stock "gamers"; community imagery with consent.
8. **Exact time and money.** Local time zone and local currency, written in full.

## 4. Variables (flex per direction and occasion - see `design-recipe`)

Palette temperature and ground (dark stage by default; light stage for print, daylight, some co-brands) · typeface pairing beyond the core · texture and grain · motion energy · shape language (cut edge by default) · imagery style · density · the accent hue in approved co-brand or sub-brand work.

The default expression below is where the brand *rests*. A direction may move variables; it may never break invariants.

---

## 5. Default expression

### Colour (a language, not a palette)

| Word | Value | Tailwind / token | Means | Never means |
|---|---|---|---|---|
| Stage black | #09090B | `bg-background` | The arena, calm | - |
| Charcoal | #111114-#18181B | `bg-card`, `bg-white/[0.02-0.06]` | Raised surface | Emphasis |
| Bone white | #FAFAFA | `text-white` | What to read; the main action | Decoration |
| Greys | #A1A1AA-#52525B | `zinc-400/500/600` | Context, captions | - |
| **Rose (cue light)** | #F43F5E | `rose-500`, `TONE_*.accent` | Look here. Live. You. The one moment | Error, danger, decoration |
| Emerald | #34D399 | `emerald-300/400` | Done, confirmed, paid | Brand, celebration |
| Amber | #FBBF24 | `amber-200/400` | Needs attention soon | Danger |
| Red | #EF4444 | `red-300/500` | Failed, blocked, irreversible | Brand - **rose is not red** |

Ratio at rest: ~70% black/charcoal, ~25% white/greys, <5% rose; signals only where a state must be read; team and game colour lives only inside its frames (crests, photos).

### Type

| Role | Face | Setting |
|---|---|---|
| Display | Poppins 800-900 (`font-heading`) | Sentence case, tight tracking (~-2%), tight leading |
| Text | Inter (`font-body`) | 14-18 px, generous leading |
| Caption (scorebug) | Monospace | UPPERCASE, tracking ~+28%, 10-12 px, grey |

Two voices: the **caster** (human sentences, sentence case) and the **scorebug** (mono caps nouns and numbers). Uppercase belongs only to the scorebug. Numbers are heroes: big, heavy, tabular; unit small, value large; caption above.

### Form

Square corners by default; round means a person (avatar) or a status dot; one 45° notch marks a rare hero moment. Hairlines at 6-10% white. Depth by luminance, not shadow. The scoreboard grid (tiles on 1 px gaps of light). A doubling space ladder (1× / 2.5× / 4× / 6×+).

### Motion

The broadcast wipe: slide + fade in, land without overshoot, hold, exit faster. Five verbs only: arrive, move, confirm, reveal, alert. Nothing moves at rest; only something genuinely live may move continuously, one per view.

### Signature moves (use at least two, never all eight)

1. The cue light (2 px rose mark) · 2. Caption over hero number · 3. Tight display, wide caption · 4. The versus lockup (winner white, other side grey, never red) · 5. The lower-third (rose tick, role caption, name) · 6. The scoreboard grid · 7. The cut edge · 8. White speaks, rose confirms (white primary action, rose slides in on intent).

In product code these live in `src/components/ui/kit/` (`tone.ts` tokens, `StatusPill`, `ChoiceCard`, `Field`, `FormSection`, `StepProgress`, `InlineNotice`, `Timeline`, `SummaryCard`, `ToggleRow`, `ChipGroup`, `PageIntro`, `ActionBar`) and `src/components/management/CommandSurface.tsx` (`CommandButton`, `CommandHeader`, `CommandSection`, `CommandActionBar`). Reuse them before inventing.

---

## 6. Voice

Full lexicon and tone ladder: `reference/voice.md`. The doctrine in one breath: **say the thing, be specific, talk to one person, make the players the subject, stay calm, cut a third, never fake it.**

## 7. Lines we never cross

Never mock the loser · never fake urgency · never hide money · never make the platform the hero · never use violence as decoration · never tokenise · never overclaim · never apply another brand's guidelines (including Anthropic's) to Esportra work.
