# Esportra UI Style Guide

> **Version 3.0** — Last Updated: January 2026  
> A comprehensive design system for the Esportra esports platform.

---

## Table of Contents
1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Components](#5-components)
6. [Effects & Animations](#6-effects--animations)
7. [Tournament Cards](#7-tournament-cards)
8. [Player Cards](#8-player-cards)
9. [Buttons](#9-buttons)
10. [Forms & Inputs](#10-forms--inputs)
11. [Accessibility](#11-accessibility)

---

## 1. Design Philosophy

### Core Aesthetic: "Clean & Premium"
The interface is designed to feel **high-end, immersive, and refined**. It uses a **dark base with rose accents** for a sophisticated, modern look that avoids overly "gamery" neon aesthetics.

### Guiding Principles
| Principle        | Description                                                                 |
|------------------|-----------------------------------------------------------------------------|
| **Immersive**    | Deep blacks (#050505), subtle grid patterns, atmospheric blur effects       |
| **Premium**      | Rose-500 accents, zinc surfaces, refined typography                         |
| **Responsive**   | Fluid animations, smooth transitions, micro-interactions                    |
| **Accessible**   | High contrast ratios, reduced motion support, semantic markup               |

---

## 2. Color System

### Core Palette
```
┌─────────────────────────────────────────────────────────────────┐
│ BACKGROUNDS                                                     │
├─────────────────────────────────────────────────────────────────┤
│ Deepest Black     #050505   rgb(5, 5, 5)        bg-[#050505]    │
│ Card Dark         #0a0a0c   rgb(10, 10, 12)     bg-[#0a0a0c]    │
│ Surface           #121214   rgb(18, 18, 20)     bg-[#121214]    │
│ Zinc-900          #18181b   Zinc dark           bg-zinc-900     │
│ Zinc-800          #27272a   Zinc medium         bg-zinc-800     │
├─────────────────────────────────────────────────────────────────┤
│ PRIMARY ACCENT                                                  │
├─────────────────────────────────────────────────────────────────┤
│ Rose-500 (Primary)#f43f5e   rgb(244, 63, 94)    text-rose-500   │
│ Rose-400          #fb7185   Hover state         hover:text-rose-400│
│ Rose-600          #e11d48   Active/pressed      bg-rose-600     │
│ Rose-500/10       rgba      Subtle backgrounds  bg-rose-500/10  │
├─────────────────────────────────────────────────────────────────┤
│ SECONDARY ACCENTS (Semantic)                                    │
├─────────────────────────────────────────────────────────────────┤
│ Emerald Green     #10b981   Success states      text-green-500  │
│ Amber             #f59e0b   Warning states      text-amber-500  │
│ Red               #ef4444   Error/danger        text-red-500    │
│ Indigo            #6366f1   Secondary accent    bg-indigo-600/5 │
├─────────────────────────────────────────────────────────────────┤
│ TEXT                                                            │
├─────────────────────────────────────────────────────────────────┤
│ Primary           #ffffff   rgb(255, 255, 255)  text-white      │
│ Secondary         #a1a1aa   Zinc-400            text-zinc-400   │
│ Muted             #71717a   Zinc-500            text-zinc-500   │
│ Disabled          #52525b   Zinc-600            text-zinc-600   │
└─────────────────────────────────────────────────────────────────┘
```

### Semantic Colors
| Purpose           | Color                     | Usage                              |
|-------------------|---------------------------|------------------------------------|
| **Success**       | `#10b981` (Emerald)       | Registrations, confirmations       |
| **Warning**       | `#f59e0b` (Amber)         | Cautions, pending states           |
| **Error**         | `#ef4444` (Red)           | Validation errors, destructive     |
| **Info**          | `#3b82f6` (Blue)          | Informational banners              |
| **Live**          | `#dc2626` (Red-600)       | Live tournaments, active streams   |

### CSS Variables (from `index.css`)
```css
:root {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 259 94% 60%;        /* Purple accent */
  --secondary: 240 5.9% 14%;
  --destructive: 0 84.2% 60.2%;
  --border: 240 5.9% 14%;
  --ring: 259 94% 60%;
  --radius: 0.5rem;
}
```

---

## 3. Typography

### Font Families
| Role           | Font        | Weights       | CSS Class       |
|----------------|-------------|---------------|-----------------|
| **Headings**   | Poppins     | 600, 700, 800 | `font-heading`  |
| **Body**       | Inter       | 400, 500      | `font-body`     |
| **Monospace**  | System      | 400           | `font-mono`     |

### Type Scale
| Class           | Size         | Weight | Use Case                        |
|-----------------|--------------|--------|---------------------------------|
| `text-9xl`      | 8rem         | 800    | Hero/Editorial (About Page)     |
| `text-6xl`      | 3.75rem      | 700    | Page Titles                     |
| `text-4xl`      | 2.25rem      | 700    | Section Headers                 |
| `text-2xl`      | 1.5rem       | 600    | Card Titles, Subheadings        |
| `text-xl`       | 1.25rem      | 600    | Minor Headers                   |
| `text-base`     | 1rem         | 400    | Body Text                       |
| `text-sm`       | 0.875rem     | 400    | Secondary Info, Metadata        |
| `text-xs`       | 0.75rem      | 500    | Labels, Badges, Timestamps      |

### Utility Classes
```css
.h1-elegant { @apply font-heading text-3xl md:text-4xl font-extrabold tracking-tight; }
.h2-elegant { @apply font-heading text-2xl md:text-3xl font-bold; }
.text-gradient { @apply text-transparent bg-clip-text bg-gradient-to-r from-esports-accent to-esports-blue; }
```

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

### Spacing Scale (Tailwind Default)
| Token | Value   | Usage                     |
|-------|---------|---------------------------|
| `1`   | 0.25rem | Tight gaps                |
| `2`   | 0.5rem  | Icon spacing              |
| `4`   | 1rem    | Standard padding          |
| `6`   | 1.5rem  | Card padding              |
| `8`   | 2rem    | Section gaps              |
| `12`  | 3rem    | Large section margins     |
| `20`  | 5rem    | Hero/Page top padding     |

### Border Radius
| Class         | Value        | Usage                     |
|---------------|--------------|---------------------------|
| `rounded-sm`  | 0.125rem     | Small badges              |
| `rounded-lg`  | 0.5rem       | Buttons, inputs           |
| `rounded-xl`  | 0.75rem      | Small cards               |
| `rounded-2xl` | 1rem         | Medium cards              |
| `rounded-3xl` | 1.5rem       | Large cards, modals       |

---

## 5. Components

### Glassmorphism Recipe
```css
/* Standard Glass */
.glass {
  backdrop-filter: blur(20px) saturate(180%);
  background: linear-gradient(135deg, rgba(255,255,255,.1), rgba(255,255,255,.05));
  border: 1px solid rgba(255,255,255,.2);
  box-shadow: 0 8px 32px rgba(0,0,0,.3);
}

/* Dark Glass */
.glass-dark {
  backdrop-filter: blur(20px) saturate(180%);
  background: linear-gradient(135deg, rgba(0,0,0,.4), rgba(0,0,0,.2));
  border: 1px solid rgba(255,255,255,.1);
}

/* Premium Glass */
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
| Style                | Class                      | Notes                    |
|----------------------|----------------------------|--------------------------|
| Subtle               | `border-white/5`           | Default card borders     |
| Standard             | `border-white/10`          | Interactive elements     |
| Gradient             | `.gradient-border`         | Premium accents          |

---

## 6. Effects & Animations

### Animation Philosophy
- **Driver**: `framer-motion` for React components
- **Physics**: Smooth, damped springs. No abrupt linear tweens.
- **Duration**: `300ms` minimum for visibility; `500ms` for emphasis.

### Keyframe Animations
| Animation            | Duration | Use Case                    |
|----------------------|----------|-----------------------------|
| `fadeIn`             | 0.6s     | Page content entry          |
| `slideIn`            | 0.6s     | Side panel entry            |
| `pulse`              | 2s       | Live indicators             |
| `shimmer`            | 2s       | Loading skeletons           |
| `premium-drift`      | 45s      | Background movement         |
| `blob`               | 7s       | Decorative blobs            |

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

---

## 7. Tournament Cards

**File**: `src/components/TournamentCard.tsx`

### Specifications
| Property       | Value                               |
|----------------|-------------------------------------|
| Height         | `380px` (Fixed)                     |
| Shape          | `rounded-3xl`                       |
| Background     | `bg-[#0a0a0c]` + `border-white/5`   |

### Layer Structure
```
┌─────────────────────────────────────────┐
│ 1. Background Image (z-0)               │  ← Custom banner OR RAWG API
├─────────────────────────────────────────┤
│ 2. Gradient Overlay (z-5)               │  ← from-[#050507] to transparent
├─────────────────────────────────────────┤
│ 3. Top Bar (z-10)                       │  ← Status badges, participant count
├─────────────────────────────────────────┤
│ 4. Bottom Glass Pane (z-20)             │  ← Title, metadata, action button
└─────────────────────────────────────────┘
```

### Status Badge Variants
| Status      | Class                                       |
|-------------|---------------------------------------------|
| LIVE NOW    | `bg-red-600 animate-pulse`                  |
| STARTING    | `bg-amber-500`                              |
| COMPLETED   | `bg-emerald-600`                            |
| CHECK-IN    | `bg-yellow-500 text-black`                  |
| UPCOMING    | `bg-blue-600/80`                            |

### Hover Effects
- Card: `whileHover: { y: -8, scale: 1.01 }`
- Background: `scale: 1.05`
- Content: `-translate-y-2`

---

## 8. Player Cards

**File**: `src/components/player/PlayerProfile.tsx`

### Profile Card
| Property       | Value                               |
|----------------|-------------------------------------|
| Shape          | `rounded-xl`                        |
| Background     | `bg-gaming-dark`                    |
| Border         | `border-gaming-gray/30`             |

### Avatar
- Component: `<Avatar>` from `shadcn/ui`
- Size: `h-24 w-24` (96px)
- Fallback: First 2 chars of username, uppercase

### Mini Player Card (Rosters)
| Property | Value                               |
|----------|-------------------------------------|
| Height   | `~64px`                             |
| Layout   | `flex items-center gap-4`           |
| Avatar   | `h-10 w-10` (40px)                  |
| Hover    | `hover:bg-white/5`                  |

---

## 9. Buttons

### Gradient Button Classes
| Class               | Gradient                            |
|---------------------|-------------------------------------|
| `.btn-esports-blue` | `#3b82f6` → `#2563eb`               |
| `.btn-esports-green`| `#10b981` → `#059669`               |
| `.btn-esports-orange`| `#f59e0b` → `#d97706`              |
| `.btn-esports-red`  | `#ef4444` → `#dc2626`               |
| `.btn-esports-purple`| `#8b5cf6` → `#7c3aed`              |

### Button States
- **Hover**: `translateY(-1px)`, glow shadow
- **Active/Tap**: `scale(0.98)`
- **Disabled**: `opacity-50`, `cursor-not-allowed`

---

## 10. Forms & Inputs

### Input Styling
```css
input, select, textarea {
  background: hsl(var(--input));        /* Dark surface */
  border: 1px solid hsl(var(--border)); /* Subtle border */
  border-radius: var(--radius);
  transition: all 0.3s ease;
}

input:focus {
  border-color: hsl(var(--ring));       /* Purple ring */
  box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
}
```

### Form Layout
- Use `space-y-4` for vertical form groups
- Labels: `text-sm text-gray-400 mb-1`
- Error text: `text-sm text-red-400 mt-1`

---

## 11. Accessibility

### Color Contrast
- Text on dark backgrounds: minimum `4.5:1` ratio
- UI components: minimum `3:1` ratio

### Focus States
All interactive elements must have visible focus indicators:
```css
:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

### Touch Targets
- Minimum size: `44px × 44px` for mobile
- Use `p-3` or larger for buttons

### Screen Reader Support
- Use semantic HTML (`<button>`, `<nav>`, `<main>`)
- Add `aria-label` for icon-only buttons
- Use `sr-only` class for visually hidden text

---

## Quick Reference: CSS Class Cheatsheet

```
┌──────────────────────────────────────────────────────────────┐
│ BACKGROUNDS                                                  │
│ bg-esports-dark      Radial gradient, deepest black          │
│ bg-esports-card      Elevated card surface                   │
│ glass-dark           Dark glassmorphism                      │
│ glass-premium        Premium heavy blur                      │
├──────────────────────────────────────────────────────────────┤
│ TEXT                                                         │
│ text-gradient        Cyan→Blue gradient text                 │
│ font-heading         Poppins                                 │
│ font-body            Inter                                   │
├──────────────────────────────────────────────────────────────┤
│ EFFECTS                                                      │
│ hover-lift           Lift + shadow on hover                  │
│ animate-pulse        Pulsing (live indicators)               │
│ animate-shimmer      Loading skeleton                        │
│ animate-premium-drift 45s background animation               │
├──────────────────────────────────────────────────────────────┤
│ CARDS                                                        │
│ card-esports         Full premium card styling               │
│ rounded-3xl          Large radius                            │
│ border-white/5       Subtle border                           │
└──────────────────────────────────────────────────────────────┘
```

---

*This guide is synced with `tailwind.config.ts` and `src/index.css`.*
