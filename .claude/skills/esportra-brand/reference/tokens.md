# Token map: brand → code

Every brand decision has a home in code. Use these; never hard-code hex in components. If a token you need doesn't exist, add it to `src/components/ui/kit/tone.ts` (or Tailwind config) with the Creative Lead's approval rather than inlining a value.

---

## Colour

| Brand word | Value | Tailwind / CSS | Kit export |
|---|---|---|---|
| Stage black | #09090B | `bg-background`, `bg-matte-black`, `--background: 240 10% 3.9%` | - |
| Panel | #111114 | `bg-card` | `PANEL_CLASS` (`border border-white/[0.07] bg-card/70 backdrop-blur-sm`) |
| Inset / hover / pressed | white 2/4/6% | `bg-white/[0.02]`, `bg-white/[0.04]`, `bg-white/[0.06]` | - |
| Ink | #FAFAFA | `text-white` | - |
| Label | #E4E4E7 | `text-zinc-200` | `LABEL_CLASS` (`text-[13px] font-medium text-zinc-200`) |
| Secondary | #A1A1AA | `text-zinc-400` | - |
| Hint / caption | #71717A | `text-zinc-500` | `HINT_CLASS`, `EYEBROW_CLASS` |
| Disabled | #52525B | `text-zinc-600` | - |
| Cue | #F43F5E | `rose-500` | `TONE_DOT.accent`, `TONE_TEXT.accent` (`text-rose-300`), `TONE_SURFACE.accent` |
| Success | #34D399 | `emerald-400` / `emerald-300` | `TONE_*.success` |
| Warning | #FBBF24 | `amber-400` / `amber-200` | `TONE_*.warning` |
| Critical | #EF4444 | `red-500` / `red-300` | `TONE_*.critical` |
| Neutral state | zinc | `zinc-500` / `zinc-300` | `TONE_*.neutral` |
| Hairline | white 7% | `border-white/[0.07]` | - |
| Card outline (rest/hover/selected) | white 8% / 16% / rose 70% | `shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]` etc. | used in `ChoiceCard` |

Note: the app's shadcn `--primary` variable (violet) is legacy; brand surfaces use the tokens above, not `bg-primary`.

## Controls

| Token | Value |
|---|---|
| `CONTROL_CLASS` | `h-11 rounded-none border-white/10 bg-black/30 text-[15px] text-white placeholder:text-zinc-600 hover:border-white/20 focus-visible:border-rose-400/60 focus-visible:ring-0 …` |
| `CONTROL_ERROR_CLASS` | `border-red-500/70 hover:border-red-500/70` |
| `FORM_MEASURE_CLASS` | `max-w-3xl` |
| Focus ring (buttons, cards) | `focus-visible:ring-2 focus-visible:ring-white/40` (never rose rings on buttons - `check:buttons` fails the build) |

## Buttons (`CommandButton` in `src/components/management/CommandSurface.tsx`)

| Variant | Base | Hover fill | Use |
|---|---|---|---|
| `primary` | `border-white bg-white text-matte-black` | rose-500 slide, text white | The one main action per view |
| `secondary` | `border-white/15 bg-matte-black text-white` | rose-500 slide | Supporting actions |
| `ghost` | `border-white/10 bg-white/[0.03] text-white` | rose-500 slide | Back, Cancel, Discard |
| `danger` | `border-red-500/35 bg-red-950/20 text-red-100` | rose-600 slide | Destructive, behind confirmation |
| `success` / `warning` | emerald / amber tinted | rose-500 slide | Rare state-change actions |

Sizes: `icon` h-9 w-9 · `sm` h-9 px-3 11 px · `md` h-11 px-5 12 px · `lg` h-14 px-7 14 px. Labels are mono caps (scorebug voice).

## Type

| Role | Family | Tailwind |
|---|---|---|
| Display / titles | Poppins (`--font-heading`) | `font-heading font-black tracking-tight` (display), `font-bold` (titles) |
| Text | Inter (`--font-body`) | default body |
| Captions | Monospace | `font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500` = `EYEBROW_CLASS` |
| Numbers | Poppins | `font-heading font-black tabular-nums` |

## Shape, space, motion

- Corners: `rounded-none` everywhere except avatars (`rounded-full`) and status dots.
- Space ladder: `space-y-2` (label/control), `space-y-5` / `gap-5` (fields), `py-8` (sections, `py-6` in dialogs), `mt-10`/`mt-12` (regions), `px-5 sm:px-6` (panel padding), `px-4` (phone gutter).
- Motion: see `design-recipe/reference/motion-spec.md` (arrive 180 ms `[0.2,0,0,1]`, etc.).

## Kit components

`StatusPill`, `PageIntro`, `FormSection`, `Field` (+ `fieldErrorId`, `fieldHintId`), `ChoiceCard`, `ChoiceGroup`, `ChipGroup`, `InlineNotice`, `StepProgress`, `ActionBar`, `SummaryCard`, `ToggleRow`, `Timeline` - all from `@/components/ui/kit`. Dashboard primitives: `CommandHeader`, `CommandSection`, `CommandActionBar`, `CommandButton` from `@/components/management/CommandSurface`; `PanelSaveBar` in `tournament-manage/`.
