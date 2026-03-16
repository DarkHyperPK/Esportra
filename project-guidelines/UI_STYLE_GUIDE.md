# Esportra UI Style Guide

> **Version 4.0** — Last Updated: March 2026
> The design system for the Esportra esports platform.

---

## Table of Contents
1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Components](#5-components)
6. [Effects & Animations](#6-effects--animations)
7. [Component Specs](#7-component-specs)
8. [Forms & Inputs](#8-forms--inputs)
9. [Icons & Media](#9-icons--media)
10. [Responsive Design](#10-responsive-design)
11. [Accessibility](#11-accessibility)
12. [Rules](#12-rules)

---

## 1. Design Philosophy

### Core Aesthetic: "Clean & Premium"

High-end, immersive, and refined. Dark base with rose accents. Sophisticated without being "gamery neon."

| Principle | Description |
|-----------|-------------|
| **Immersive** | Deep blacks (#050505), subtle grid patterns, atmospheric blur |
| **Premium** | Rose-500 accents, zinc surfaces, refined typography |
| **Responsive** | Fluid animations, smooth transitions, micro-interactions |
| **Accessible** | High contrast, reduced motion support, semantic markup |

### Do's and Don'ts

| Do | Don't |
|----|-------|
| Use the established color palette | Introduce new colors without updating this guide |
| Follow the glassmorphism patterns | Use plain white or gray backgrounds |
| Animate with Framer Motion | Use CSS transitions for complex sequences |
| Use `shadcn/ui` components as base | Import competing component libraries |
| Match existing card patterns | Create inconsistent card styles per page |

---

## 2. Color System

### Core Palette
```
BACKGROUNDS
  #050505  Deepest Black       bg-[#050505]      Page backgrounds
  #0a0a0c  Card Dark           bg-[#0a0a0c]      Card surfaces
  #121214  Surface             bg-[#121214]      Elevated surfaces
  #18181b  Zinc-900            bg-zinc-900        Secondary surfaces
  #27272a  Zinc-800            bg-zinc-800        Tertiary surfaces

PRIMARY ACCENT
  #f43f5e  Rose-500 (Primary)  text-rose-500      Primary actions, links
  #fb7185  Rose-400            hover:text-rose-400 Hover states
  #e11d48  Rose-600            bg-rose-600         Active/pressed
  Rose-500/10                  bg-rose-500/10      Subtle tinted backgrounds

SEMANTIC
  #10b981  Emerald             text-green-500      Success, confirmations
  #f59e0b  Amber               text-amber-500      Warnings, pending
  #ef4444  Red                 text-red-500        Errors, destructive
  #3b82f6  Blue                text-blue-500       Info banners
  #dc2626  Red-600             text-red-600        Live indicators
  #6366f1  Indigo              bg-indigo-600/5     Secondary accent

TEXT
  #ffffff  White               text-white          Primary text
  #a1a1aa  Zinc-400            text-zinc-400       Secondary text
  #71717a  Zinc-500            text-zinc-500       Muted text
  #52525b  Zinc-600            text-zinc-600       Disabled text
```

### CSS Variables (from `index.css`)
```css
:root {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 259 94% 60%;
  --secondary: 240 5.9% 14%;
  --destructive: 0 84.2% 60.2%;
  --border: 240 5.9% 14%;
  --ring: 259 94% 60%;
  --radius: 0.5rem;
}
```

### Color usage rules
- **Never use pure white (#fff) backgrounds.** The darkest background is #050505.
- **Rose-500 is the primary accent.** Use it for CTAs, active states, and emphasis.
- **Semantic colors are strict.** Green = success, amber = warning, red = error/danger. Don't mix them.
- **Opacity for layering.** Use `bg-white/5`, `bg-white/10`, `border-white/5` for subtle depth.

---

## 3. Typography

### Font Families
| Role | Font | Weights | CSS Class |
|------|------|---------|-----------|
| **Headings** | Poppins | 600, 700, 800 | `font-heading` |
| **Body** | Inter | 400, 500 | `font-body` |
| **Monospace** | System | 400 | `font-mono` |

### Type Scale
| Class | Size | Weight | Use Case |
|-------|------|--------|----------|
| `text-9xl` | 8rem | 800 | Hero editorial (About page only) |
| `text-6xl` | 3.75rem | 700 | Page titles |
| `text-4xl` | 2.25rem | 700 | Section headers |
| `text-2xl` | 1.5rem | 600 | Card titles, subheadings |
| `text-xl` | 1.25rem | 600 | Minor headers |
| `text-base` | 1rem | 400 | Body text |
| `text-sm` | 0.875rem | 400 | Secondary info, metadata |
| `text-xs` | 0.75rem | 500 | Labels, badges, timestamps |

### Utility Classes
```css
.h1-elegant { @apply font-heading text-3xl md:text-4xl font-extrabold tracking-tight; }
.h2-elegant { @apply font-heading text-2xl md:text-3xl font-bold; }
.text-gradient { @apply text-transparent bg-clip-text bg-gradient-to-r from-esports-accent to-esports-blue; }
```

### Typography rules
- **Headings always use Poppins.** Body always uses Inter.
- **Don't mix weights arbitrarily.** Headings: 600-800. Body: 400-500.
- **Line height**: 1.2 for headings, 1.5 for body text.
- **Max line length**: ~75 characters for readability.

---

## 4. Spacing & Layout

### Container
```typescript
container: {
  center: true,
  padding: '2rem',
  screens: { '2xl': '1400px' }
}
```

### Spacing Scale
| Token | Value | Usage |
|-------|-------|-------|
| `1` | 0.25rem | Tight gaps |
| `2` | 0.5rem | Icon spacing |
| `4` | 1rem | Standard padding |
| `6` | 1.5rem | Card padding |
| `8` | 2rem | Section gaps |
| `12` | 3rem | Large section margins |
| `20` | 5rem | Hero/page top padding |

### Border Radius
| Class | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 0.125rem | Small badges |
| `rounded-lg` | 0.5rem | Buttons, inputs |
| `rounded-xl` | 0.75rem | Small cards |
| `rounded-2xl` | 1rem | Medium cards |
| `rounded-3xl` | 1.5rem | Large cards, modals |

### Layout rules
- **Consistent padding within card types.** All tournament cards use `p-6`. All dialog content uses `p-6`.
- **Section spacing uses multiples of 4.** `gap-4`, `gap-8`, `gap-12` — not arbitrary pixel values.
- **Max width is 1400px** (`2xl` breakpoint). Content doesn't stretch beyond this.

---

## 5. Components

### Glassmorphism Recipes

**Standard Glass**
```css
.glass {
  backdrop-filter: blur(20px) saturate(180%);
  background: linear-gradient(135deg, rgba(255,255,255,.1), rgba(255,255,255,.05));
  border: 1px solid rgba(255,255,255,.2);
  box-shadow: 0 8px 32px rgba(0,0,0,.3);
}
```

**Dark Glass**
```css
.glass-dark {
  backdrop-filter: blur(20px) saturate(180%);
  background: linear-gradient(135deg, rgba(0,0,0,.4), rgba(0,0,0,.2));
  border: 1px solid rgba(255,255,255,.1);
}
```

**Premium Glass**
```css
.glass-premium {
  backdrop-filter: blur(24px) saturate(200%);
  background: linear-gradient(180deg, rgba(8,8,12,0.92), rgba(5,5,8,0.95));
  border: 1px solid rgba(255,255,255,0.04);
}
```

### Card Styling
```css
.card-esports {
  background: linear-gradient(145deg, rgba(16,18,28,.95), rgba(4,5,10,.92));
  border: 1px solid rgba(255,255,255,.05);
  box-shadow: 0 20px 45px rgba(0,0,0,.55);
  backdrop-filter: blur(18px);
  border-radius: 26px;
  padding: 28px;
}

.card-esports:hover {
  transform: translateY(-4px);
  box-shadow: 0 30px 60px rgba(0,0,0,.6);
  border-color: rgba(248,113,113,.35);
}
```

### Borders
| Style | Class | Notes |
|-------|-------|-------|
| Subtle | `border-white/5` | Default card borders |
| Standard | `border-white/10` | Interactive elements |
| Gradient | `.gradient-border` | Premium accents |

### Buttons

**Gradient Button Classes**
| Class | Gradient |
|-------|---------|
| `.btn-esports-blue` | `#3b82f6` → `#2563eb` |
| `.btn-esports-green` | `#10b981` → `#059669` |
| `.btn-esports-orange` | `#f59e0b` → `#d97706` |
| `.btn-esports-red` | `#ef4444` → `#dc2626` |
| `.btn-esports-purple` | `#8b5cf6` → `#7c3aed` |

**Button States**
- **Hover**: `translateY(-1px)`, glow shadow
- **Active/Tap**: `scale(0.98)`
- **Disabled**: `opacity-50`, `cursor-not-allowed`

---

## 6. Effects & Animations

### Animation driver
`framer-motion` for all React component animations. CSS keyframes for background effects.

### Physics
Smooth, damped springs. No abrupt linear tweens. Duration: 300ms minimum for visibility, 500ms for emphasis.

### Keyframe Animations
| Animation | Duration | Use Case |
|-----------|----------|----------|
| `fadeIn` | 0.6s | Page content entry |
| `slideIn` | 0.6s | Side panel entry |
| `pulse` | 2s | Live indicators |
| `shimmer` | 2s | Loading skeletons |
| `premium-drift` | 45s | Background movement |
| `blob` | 7s | Decorative blobs |

### Hover Effects
```css
.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0,0,0,.3);
}

.hover-subtle:hover {
  background-color: #1e1e1e;
  border-color: #3a3a3a;
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

All Framer Motion animations must respect `prefers-reduced-motion`.

---

## 7. Component Specs

### Tournament Cards
**File**: `src/components/TournamentCard.tsx`

| Property | Value |
|----------|-------|
| Height | `380px` (Fixed) |
| Shape | `rounded-3xl` |
| Background | `bg-[#0a0a0c]` + `border-white/5` |

**Layer Structure**
```
┌─────────────────────────────────────┐
│ 1. Background Image (z-0)          │ ← Custom banner OR RAWG API
├─────────────────────────────────────┤
│ 2. Gradient Overlay (z-5)          │ ← from-[#050507] to transparent
├─────────────────────────────────────┤
│ 3. Top Bar (z-10)                  │ ← Status badges, participant count
├─────────────────────────────────────┤
│ 4. Bottom Glass Pane (z-20)        │ ← Title, metadata, action button
└─────────────────────────────────────┘
```

**Status Badge Variants**
| Status | Class |
|--------|-------|
| LIVE NOW | `bg-red-600 animate-pulse` |
| STARTING | `bg-amber-500` |
| COMPLETED | `bg-emerald-600` |
| CHECK-IN | `bg-yellow-500 text-black` |
| UPCOMING | `bg-blue-600/80` |

**Hover**: `whileHover: { y: -8, scale: 1.01 }`, background scales to 1.05.

### Player Cards
**File**: `src/components/player/PlayerProfile.tsx`

| Property | Value |
|----------|-------|
| Shape | `rounded-xl` |
| Background | `bg-gaming-dark` |
| Border | `border-gaming-gray/30` |
| Avatar | `h-24 w-24` (96px), fallback: first 2 chars uppercase |

**Mini Player Card (Rosters)**
| Property | Value |
|----------|-------|
| Height | ~64px |
| Layout | `flex items-center gap-4` |
| Avatar | `h-10 w-10` (40px) |
| Hover | `hover:bg-white/5` |

---

## 8. Forms & Inputs

### Input Styling
```css
input, select, textarea {
  background: hsl(var(--input));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  transition: all 0.3s ease;
}

input:focus {
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
}
```

### Form Layout
- `space-y-4` for vertical form groups
- Labels: `text-sm text-gray-400 mb-1`
- Error text: `text-sm text-red-400 mt-1`
- Always use `react-hook-form` + `zod` for validation
- Validate on blur, re-validate on submit

---

## 9. Icons & Media

### Icon system
- **Library**: `lucide-react` — use this for all icons.
- **Size**: Default `h-4 w-4` for inline, `h-5 w-5` for buttons, `h-6 w-6` for headers.
- **Color**: Inherit from text color. Don't hardcode icon colors.
- **Don't mix icon libraries.** No Font Awesome, no Heroicons. Lucide only.

### Images & Media
- Avatars: Use `<Avatar>` from shadcn/ui with text fallback.
- Banners: Serve from Supabase Storage. Use `object-cover` for aspect ratio.
- Game images: Cache from RAWG API. Show placeholder on failure.
- Videos: Use `<video>` with `muted autoPlay loop playsInline` for background loops.

---

## 10. Responsive Design

### Breakpoints
| Name | Width | Context |
|------|-------|---------|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

### Mobile patterns
- **Cards**: Stack vertically. Full width on mobile.
- **Tables**: Collapse into card stacks. No horizontal scroll.
- **Modals**: Become full-screen bottom sheets on mobile.
- **Navigation**: Bottom nav on mobile for primary actions.
- **Touch targets**: Minimum 44x44px.

### Tailwind responsive pattern
Always mobile-first:
```html
<!-- Mobile: stack, Tablet: 2 columns, Desktop: 3 columns -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

---

## 11. Accessibility

### Color Contrast
- Text on dark backgrounds: minimum **4.5:1** ratio.
- UI components: minimum **3:1** ratio.
- Don't rely on color alone — always pair with icons or text labels.

### Focus States
```css
:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```
All interactive elements must have visible focus indicators.

### Touch Targets
- Minimum: `44px × 44px` for mobile.
- Use `p-3` or larger for buttons.

### Screen Reader Support
- Semantic HTML: `<button>`, `<nav>`, `<main>`, `<article>`.
- `aria-label` on icon-only buttons.
- `sr-only` class for visually hidden labels.
- `aria-live` regions for dynamic content updates (notifications, scores).

---

## 12. Rules

1. **Dark base, always.** #050505 is the page background. No light modes, no white sections.
2. **Rose-500 is the primary accent.** Don't introduce competing accent colors.
3. **Glassmorphism for elevated surfaces.** Use the recipes defined above. Don't improvise.
4. **Framer Motion for component animations.** CSS for background effects. No other animation libraries.
5. **Poppins for headings, Inter for body.** No other fonts.
6. **Lucide for all icons.** No mixing icon libraries.
7. **shadcn/ui as the component base.** Extend it, don't replace it.
8. **Mobile-first responsive.** Write mobile styles first, layer up with breakpoints.
9. **44px minimum touch targets** on all interactive elements.
10. **4.5:1 contrast minimum** for all text.
11. **Respect reduced motion.** Every animation must degrade gracefully.
12. **Consistent card patterns.** Tournament cards, player cards, venue cards — each has a defined spec. Follow it.

---

## Quick Reference: CSS Class Cheatsheet
```
BACKGROUNDS
  bg-esports-dark       Radial gradient, deepest black
  bg-esports-card       Elevated card surface
  glass-dark            Dark glassmorphism
  glass-premium         Premium heavy blur

TEXT
  text-gradient         Accent gradient text
  font-heading          Poppins
  font-body             Inter

EFFECTS
  hover-lift            Lift + shadow on hover
  animate-pulse         Pulsing (live indicators)
  animate-shimmer       Loading skeleton
  animate-premium-drift 45s background animation

CARDS
  card-esports          Full premium card styling
  rounded-3xl           Large radius
  border-white/5        Subtle border
```

---

## Related Documents
- [UX Guidelines](./UX_GUIDELINES.md) — User experience patterns
- [Coding Guidelines](./CODING_GUIDELINES.md) — Code standards
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md) — E2E development protocol
- [Code Quality Guidelines](./CODE_QUALITY_GUIDELINES.md) — Quality standards
- [Features Guidelines](./FEATURES_GUIDELINES.md) — Feature scoping and delivery

*This guide is synced with `tailwind.config.ts` and `src/index.css`.*
