# Esportra — UI Design Guide

The platform UI follows a single, opinionated visual language. The reference
implementation lives on the **Create Tournament wizard**
(`@/pages/tournaments/Create.tsx` → `@/components/tournament/wizard/WizardContainer.tsx`)
and on the **JACK IN button** in the About page CTA
(`@/pages/About.tsx`). Every new screen should match those two surfaces.

## 1. Color system

Only three primary colors are used across the platform.

| Token            | Hex / Tailwind             | Used for |
| ---------------- | -------------------------- | -------- |
| **Matte black**  | `#000000` / `bg-black`     | Default surface, navbar pill, dropdown panels, command surfaces. |
| **White**        | `#ffffff` / `bg-white`     | Primary CTA fill, foreground text on dark, button surface. |
| **Rose pink**    | `#f43f5e` / `rose-500`     | Sole accent. Hover fills, active rails, focus rings, single status accents. |

### Allowed neutrals

For contrast and depth — never as decoration:

| Token                  | Tailwind                | Notes |
| ---------------------- | ----------------------- | ----- |
| Deep matte             | `bg-[#0a0a0c]`          | Section bands above black. |
| Low-contrast text      | `text-zinc-400`         | Secondary text. |
| Borders                | `border-white/10`       | Default container border. |
| Strong border          | `border-white/25`       | Outlined ghost buttons. |
| Subtle veil            | `bg-white/[0.02–0.05]`  | Card surface tint over black. |

### Hard rules

- **Never** introduce a fourth accent color (no greens, blues, ambers as primary
  status). Use rose for active/positive accents and `text-red-300` only when the
  semantic is *destructive*.
- **No gradients** for surfaces. Allowed only as transparency falloffs (e.g.
  hero video darken layer, footer fade).
- **No glow shadows** on buttons. Drop shadows are reserved for floating
  surfaces (navbar pill, dropdown panels).

## 2. Typography

| Role           | Tailwind                                                 |
| -------------- | -------------------------------------------------------- |
| Display H1     | `font-heading text-5xl md:text-7xl font-black uppercase tracking-tight` |
| Section H2     | `font-heading text-3xl md:text-5xl font-black uppercase tracking-tight` |
| Eyebrow        | `font-mono text-[10px] font-bold uppercase tracking-[0.45em] text-rose-400` |
| Body           | `text-sm md:text-base text-white/75 leading-relaxed`      |
| Button label   | `font-mono text-xs font-bold uppercase tracking-wider`    |
| Metric value   | `font-heading text-3xl font-black text-white`             |

## 3. Buttons

There is **one** primary button pattern: **JackButton**.

Source: `@/components/ui/JackButton.tsx`.

```tsx
import { JackButton } from "@/components/ui/JackButton";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

// Primary CTA (renders <button>):
<JackButton onClick={handleSubmit}>
  Continue <ChevronRight className="h-4 w-4" />
</JackButton>

// Polymorphic: render as Link, anchor, etc.
<JackButton as={Link} to="/auth/signup">
  Jack In <ChevronRight className="h-4 w-4" />
</JackButton>
```

### Variants

| Variant   | Surface          | Text   | Hover                                |
| --------- | ---------------- | ------ | ------------------------------------ |
| `primary` | `bg-white`       | black  | Rose-pink panel slides up from below |
| `invert`  | `bg-black`       | white  | Rose-pink panel slides up from below |
| `ghost`   | `bg-white/5` + border | white | Rose-pink panel slides up from below |

### Sizes

| Size | Height | Padding |
| ---- | ------ | ------- |
| `sm` | `h-10` | `px-4`  |
| `md` | `h-12` | `px-6`  |
| `lg` | `h-14` | `px-10` |

### Migration

- Replace ad-hoc `bg-rose-500 hover:bg-rose-600` buttons with `<JackButton>`.
- Replace shadcn `<Button>` *primary* CTAs on landing/marketing surfaces with `<JackButton>`.
- Forms inside `CommandShell` (wizards, settings panels) keep using `CommandButton`
  from `@/components/management/CommandSurface.tsx` — that primitive already
  follows the same slide-up rules.

### Anti-patterns

- `rounded-full`, `rounded-2xl` buttons (only the navbar pill itself is rounded).
- `shadow-[0_*]` glow halos on CTAs.
- Color-only variants (e.g. red destructive bg). Use the `invert` variant +
  inline `bg-red-950/20` only on settings → danger zone.

## 4. Surfaces

### Command surface

The canonical "page chrome". See `@/components/management/CommandSurface.tsx`.
- `CommandShell` — page wrapper with the dot-grid background.
- `CommandHeader` — page eyebrow + title + actions row.
- `CommandSection` — bordered black panel for grouped content.
- `CommandTabs`, `CommandMetric` — paired primitives.

All new dashboards/pages should compose these.

### Cards

Outside command surfaces:

```tsx
<div className="border border-white/10 bg-black/60 p-5 md:p-7">
  ...
</div>
```

No rounded corners. No gradients. Optional `shadow-[0_20px_60px_rgba(0,0,0,0.45)]`
only when floating (modals, dropdowns).

### Navbar pill

`@/components/Navbar.tsx`. Floating pill: `rounded-full border border-white/10
bg-black/80 backdrop-blur-xl`. The only rounded surface allowed.

### Dropdowns

`@/components/ui/FramerDropdown.tsx` with `borderRadius={0}`,
`backgroundColor="#000000"`, `borderColor="rgba(244,63,94,0.4)"`. Items use the
JACK IN treatment (white tile, rose slide-up).

## 5. Inputs

Inputs follow the wizard surface (`@/components/tournament/wizard/StepBasicInfo.tsx`):

```tsx
<input
  className="w-full border border-white/10 bg-black/60 px-4 py-3 text-sm text-white
             placeholder:text-zinc-500 outline-none transition-colors
             focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
/>
```

- Border `white/10` resting → `rose-500` focused.
- No rounded corners on standalone inputs (let `Input` component handle if
  needed — but prefer raw classes for new forms).

## 6. Motion

| Use case                 | Spec                                               |
| ------------------------ | -------------------------------------------------- |
| Button slide-up hover    | `transition-transform duration-300`                |
| Color hover              | `transition-colors`                                |
| Page reveal              | `framer-motion`, ease `[0.22, 1, 0.36, 1]`         |
| Dropdown open            | `framer-motion` opacity + 4px Y, `0.2s ease-out`   |

No bounce easings. No long durations (>500 ms) for interactive feedback.

## 7. Iconography

- Source: **lucide-react**.
- Default size in buttons: `h-4 w-4`.
- Tone: inherit `currentColor`. Rose only when standing alone as accent
  (e.g. eyebrow dots, status indicators).

## 8. Spacing & layout

- Page max width: `max-w-[1400px]` (command surfaces) / `max-w-5xl` (marketing).
- Section paddings: `px-4 sm:px-6 lg:px-8`, `py-12 md:py-20`.
- Stack rhythm: `space-y-8` between sections, `gap-4` between buttons,
  `gap-2` inside button content.

## 9. Hard "do not"

1. Do not introduce new accent colors.
2. Do not add gradient surfaces beyond the documented falloffs.
3. Do not use rounded corners except on the navbar pill.
4. Do not ship a CTA outside the JACK IN pattern (`JackButton` or `CommandButton`).
5. Do not stack glow shadows on top of glow shadows.
6. Do not center-align long body copy — left-align for readability.
