---
name: Esportra
description: Scene-native command centre for esports tournaments and venue bookings. Broadcast at rest, direction chosen per surface.
colors:
  stage-black: "#09090B"
  panel: "#111114"
  ink: "#FAFAFA"
  label: "#E4E4E7"
  secondary: "#A1A1AA"
  hint: "#71717A"
  disabled: "#52525B"
  cue-rose: "#F43F5E"
  success: "#34D399"
  warning: "#FBBF24"
  critical: "#EF4444"
typography:
  display:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  eyebrow:
    fontFamily: "ui-monospace, SFMono-Regular, monospace"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.28em"
rounded:
  none: "0px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "20px"
  lg: "32px"
  xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.stage-black}"
    rounded: "{rounded.none}"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.cue-rose}"
    textColor: "{colors.ink}"
  button-secondary:
    backgroundColor: "{colors.stage-black}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 20px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "20px 24px"
---

<!-- esportra-canonical: company-v2 -->

# Esportra Design System

> This file summarises the canonical system for design tools. The authority is `.claude/skills/esportra-brand/` (the invariants and tokens) and `.claude/skills/design-recipe/` (how to choose a direction per surface). Code tokens live in `src/components/ui/kit/tone.ts`. If this file disagrees with them, they win; fix this file. Do not regenerate it with `impeccable document`, and do not let any tool invent a new visual world for Esportra.

## Overview

Esportra's resting look is **Broadcast**: a stage-black ground, precise hairlines, Poppins display type, mono-caps captions and one rose cue. It reads like a tournament broadcast control room. It is a resting look, **not a single house style**. Each surface picks a direction from the `design-recipe` library by reading its context signals (moment, audience, stakes, emotion, density, device, brand latitude, lifespan):

| Direction | Typical surfaces |
|---|---|
| Broadcast | Default product surfaces, public tournament pages |
| Command Console | Organizer operations: dense tables, live check-in, match control |
| Editorial | Announcements, recaps, long reads |
| Cinematic | Launches, trailers, finals hype |
| Community | Team pages, player profiles, social share cards |
| Daylight | Outdoor and LAN-hall use, printed material, bright grounds |
| Trophy | Winners, champions, payouts completed |
| Co-brand | Partner and sponsor events, within partner latitude |
| Themed event | Seasonal or IP-themed tournaments, bounded by a Direction Contract |

The invariants (logo, cue colour discipline, square corners, type families, tabular numbers, voice) hold in every direction.

Visual references for every direction, the identity, templates and UI states live in `design/` (see `design/INDEX.md`).

## Colors

- **Stage black** is the ground; **panel** lifts content one layer. Inset, hover and pressed states use white at 2%, 4% and 6%. Hairlines are white at 7%.
- **Ink, label, secondary, hint and disabled** form the text ladder. Never go below hint for readable copy.
- **Cue rose** marks the one thing that matters now: the live dot, the primary hover, the selected card. Never use it as a large fill, never as a button border or ring (the build fails), and never for errors.
- **Success, warning and critical** are semantic only. Critical is red, not rose.
- The app's shadcn `--primary` (violet) is legacy. Do not use it on brand surfaces.
- Daylight and contrast pairs are defined in `design-recipe/reference/colour-system.md`.

## Typography

- **Poppins Black** for display and scores (`font-heading font-black tracking-tight`). **Poppins Bold** for titles.
- **Inter** for all running text at 15 px, and for labels at 13 px.
- **Monospace caps** at 10 px with 0.28em tracking for eyebrows and captions. Mono caps at 11–14 px for button labels (the scorebug voice).
- Numbers are always `tabular-nums`.
- Per-direction type scales are in `design-recipe/reference/layout-and-type.md`.

## Layout

- The space ladder: 8 px (label to control), 20 px (between fields), 32 px (sections, 24 px in dialogs), 40–48 px (regions), 20–24 px panel padding, 16 px phone gutter.
- Design at 390 px first, then 1280 px. Forms are capped at `max-w-3xl`.
- Hierarchy comes from scale contrast and rhythm, not uniform grids. See the archetypes in `design-recipe/reference/archetypes.md`.

## Elevation & Depth

Depth comes from tone layering (stage black → panel → inset), hairlines, `backdrop-blur-sm` on panels and inset outlines on cards (white 8% at rest, 16% on hover, rose 70% when selected). Drop shadows are rare. Cinematic and Trophy may use light and glow within their dossiers.

## Shapes

Square corners (`rounded-none`) everywhere. The only exceptions are avatars and status dots (`rounded-full`).

## Components

Use the kit (`@/components/ui/kit`):

- `StatusPill`, `PageIntro`, `FormSection`, `Field`
- `ChoiceCard`, `ChoiceGroup`, `ChipGroup`
- `InlineNotice`, `StepProgress`, `ActionBar`, `SummaryCard`, `ToggleRow`, `Timeline`

For dashboards, use `CommandHeader`, `CommandSection`, `CommandActionBar` and `CommandButton`.

`CommandButton` variants:

| Variant | Use |
|---|---|
| `primary` | One per view. White fill; a rose slide on hover. |
| `secondary` | Supporting actions. |
| `ghost` | Back and cancel. |
| `danger` | Destructive actions, always behind confirmation. |
| `success`, `warning` | Rare state-change actions. |

Every component needs its designed states: rest, hover, focus (white ring), pressed, loading, empty, error, disabled.

## Do's and Don'ts

**Do**
- Choose a direction per surface with `design-recipe` and record it in a Direction Contract.
- Keep one rose cue per view. Use semantic colours only for state.
- Write copy that says what happened, what it means and what to do next.
- Honour reduced motion. Motion clarifies; it doesn't decorate. See `motion-spec.md`.

**Don't**
- Apply Anthropic's brand (`brand-guidelines`) or `theme-factory` presets to Esportra, except as a sanctioned Themed-event direction.
- Treat the pinned signatures (Poppins, stage black, rose cue) as "generic defaults" to be replaced. They are brand commitments.
- Use default card grids with no hierarchy, stock hero sections or rounded SaaS styling.
- Put rose on button borders or rings, or use rose for errors.
