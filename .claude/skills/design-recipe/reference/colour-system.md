# Colour system

Colour is a language with a small vocabulary. Every colour on a surface must be able to answer "what do you mean?" in five words. If it can't, it is grey.

---

## 1. Role tokens (dark ground)

| Role | Hex | Tailwind / kit | Meaning | Never |
|---|---|---|---|---|
| Stage | #09090B | `bg-background`, `bg-matte-black` | The arena | - |
| Panel | #111114 | `bg-card` | A raised surface | Emphasis |
| Inset / hover / pressed | white 2 / 4 / 6% | `bg-white/[0.02/0.04/0.06]` | Depth, interaction | - |
| Ink (primary text) | #FAFAFA | `text-white` | What to read; primary action fill | Decoration |
| Label | #E4E4E7 | `text-zinc-200` | Field labels, readable body | - |
| Secondary | #A1A1AA | `text-zinc-400` | Descriptions, metadata that matters | - |
| Hint / caption | #71717A | `text-zinc-500` | Hints, captions, eyebrows | Body copy |
| Disabled / separators | #52525B | `text-zinc-600` | Disabled, `·` `→` | Anything that must be read |
| **Cue (rose)** | #F43F5E | `rose-500`, `TONE_*.accent` | You are here · live · selected · the one moment | Error, danger, decoration, headings |
| Success | #34D399 | `emerald-400` / text `emerald-300` | Done, paid, checked in | Brand, celebration |
| Warning | #FBBF24 | `amber-400` / text `amber-200` | Needs attention soon; unsaved | Danger |
| Critical | #EF4444 | `red-500` / text `red-300` | Failed, blocked, destructive | Brand |
| Hairline | white 7% | `border-white/[0.07]` | Division | - |

Kit tokens: `TONE_DOT`, `TONE_TEXT`, `TONE_SURFACE` (neutral / accent / success / warning / critical), `PANEL_CLASS`, `EYEBROW_CLASS`, `LABEL_CLASS`, `HINT_CLASS`, `CONTROL_CLASS`, `CONTROL_ERROR_CLASS` in `src/components/ui/kit/tone.ts`.

## 2. Daylight ground (print, documents, email)

Paper #FAFAF9 · ink #09090B · secondary #52525B · hint #71717A · hairline #E4E4E7 · cue rose #E11D48 · success #047857 · warning #B45309 · critical #B91C1C. (Darker signal variants keep AA contrast on paper.)

## 3. Contrast pairs

| Foreground on background | Ratio (approx.) | Use |
|---|---|---|
| #FAFAFA on #09090B | 19.6:1 | Everything that must be read |
| #E4E4E7 on #111114 | 14.8:1 | Labels, body on panels |
| #A1A1AA on #111114 | 7.4:1 | Secondary text (AA/AAA) |
| #71717A on #111114 | 4.1:1 | Hints and captions - **AA only for ≥ 14 px bold or large; keep hints short and never essential** |
| #52525B on #111114 | 2.6:1 | Disabled / decorative separators only - never essential text |
| #F43F5E on #09090B | 5.1:1 | Cue marks and short labels (AA) |
| #09090B on #FAFAFA (primary button) | 19.6:1 | Primary action |

Meaning is never carried by colour alone: every state also has a word (pill label), an icon or a position.

## 4. The signal usage matrix

| Situation | Colour | Pairing |
|---|---|---|
| Checked in / paid / approved | Success | Pill word "Checked in", "Paid" |
| Deadline soon / unsaved / review needed | Warning | Pill word + time or count |
| Failed / rejected / blocked | Critical | Word + what to do |
| Live now / current step / selected | Cue (rose) | Dot or 2 px mark + word "Live" |
| Everything else | Neutral | - |

A result's losing side is **neutral grey**, never critical red.

## 5. Ratios by direction

| Direction | Black/charcoal | White/greys | Cue | Signals | Other |
|---|---|---|---|---|---|
| Broadcast | ~70% | ~25% | < 5% | as states need | team/game colour inside frames |
| Command Console | ~75% | ~22% | < 2% | more (state-heavy) | - |
| Editorial | ~60% | ~25% | < 2% | rare | photography |
| Cinematic | ~80% | ~15% | < 3% | none | one light source |
| Community | ~60% (warmer) | ~25% | < 5% | as needed | team colours more present |
| Daylight | paper ~80% | ink ~17% | < 3% | darker variants | - |
| Trophy | ~65% | ~20% | < 5% | none | champion's colours |

## 6. Team, game and partner colour

Team colours are sacred to their fans and live **inside their frames** (crests, jerseys, the champion moment). Game art is a window, darkened toward edges. Partner colours follow the co-brand relationship. None of them tint Esportra's chrome, headlines or controls.

## 7. Checks

Squint test (is rose a sliver?) · every colour named with its meaning · signals only on states · no rose on buttons' borders/rings (`check:buttons`) · AA for all essential text · colour never the only carrier of meaning.
