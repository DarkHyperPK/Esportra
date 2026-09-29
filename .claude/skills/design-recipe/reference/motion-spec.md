# Motion specification

Motion is a sentence, not a soundtrack. Every movement must be nameable with one verb, must clarify a change the user would otherwise miss or find abrupt, and must stop. This reference gives the verbs exact values so that designers can specify and engineers can build without guessing.

---

## 1. The five verbs

| Verb | It says | Property | Duration | Easing | Distance |
|---|---|---|---|---|---|
| **Arrive** | "This is new, and here is where it lives" | opacity 0→1, translateY 6→0 (product) / 16-24 px (marketing) | 180 ms product · 300-500 ms marketing | `cubic-bezier(0.2, 0, 0, 1)` (decisive decelerate) | 6 px product, up to 24 px marketing |
| **Move** | "The same thing is now over there" | transform via shared layout (framer `layoutId`) | 220 ms | `cubic-bezier(0.2, 0, 0, 1)` | as measured |
| **Confirm** | "Yes, that one" | background fill slide (rose under white), outline strength, dot colour | 150-200 ms | `cubic-bezier(0.3, 0, 0, 1)` | full element width |
| **Reveal** | "Here is the answer" | mask wipe / clip-path, preceded by stillness | stillness 500-800 ms, then 400-500 ms reveal, hold ≥ 2 s | `cubic-bezier(0.7, 0, 0.2, 1)` (anticipate, then land) | - |
| **Alert** | "Something changed that needs you" | new item arrives at the top; optional one-time background flash on the changed cell | 180 ms arrive · 600 ms flash fade | decelerate | 6 px |

**Exit** is always faster than entry: roughly 60% of the entry duration, with an accelerating curve `cubic-bezier(0.4, 0, 1, 1)`. Users care about what arrives, not what leaves.

**No overshoot, no spring bounce** in product or brand motion. Precision is a pillar; wobble is imprecision. (Physics-based springs are allowed only for direct manipulation - dragging a card, pulling a sheet - where the finger drives the motion; use critically damped springs, e.g. framer `{ type: 'spring', stiffness: 400, damping: 40 }`.)

---

## 2. Staggers and sequences

- Lists arriving together: stagger 30-40 ms per item, cap at 6 items (the rest arrive with the 6th).
- Marketing sequences: 60-120 ms between elements; order follows the reading order of the archetype (caption → hero → supporting → action).
- Never stagger on every re-render or scroll; only on first arrival of a view or a meaningful change.

## 3. At rest

Nothing moves on an idle surface. No pulsing dots, shimmer placeholders, rotating icons, breathing glows, marquee text. **The only continuous motion allowed** is a genuinely live value (a match clock, a viewer count) - one per view - updating in place without decorative animation.

## 4. Reduced motion

`prefers-reduced-motion: reduce` → all translate/scale/clip animations become instant; opacity transitions ≤ 100 ms may remain; auto-playing video pauses on its first frame with a play control. Meaning must survive: position, colour and words carry it; motion only clarifies.

## 5. Implementation notes (framer-motion)

```tsx
// Arrive (product)
const arrive = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.2, 0, 0, 1] } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.11, ease: [0.4, 0, 1, 1] } },
};
// Respect reduced motion
const reduce = useReducedMotion();
<motion.div {...(reduce ? {} : arrive)} />
// Move: shared marker
<motion.span layoutId="nav-marker" transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }} />
```

Tailwind for simple cases: `transition-colors duration-150`, `transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.2,0,0,1)]`.

## 6. Motion by direction

| Direction | Energy | Notes |
|---|---|---|
| Broadcast | Low-medium | Wipes and arrivals; one reveal at the peak |
| Command Console | Minimal | Confirm and alert only; cell flash on update |
| Editorial | Near zero | Images may fade in (opacity only) |
| Cinematic | High, but singular | Stillness → one reveal → long hold; slow push-in |
| Community | Low, softer | 220-260 ms, `cubic-bezier(0.25, 0.1, 0.25, 1)`; one welcome moment |
| Daylight | None | Print/email |
| Trophy | Peak | Silence → reveal → hold; cue sound |

## 7. Spec template (for briefs)

```
MOTION SPEC - [surface]
| Element | Verb | Trigger | Property | Duration | Easing | Reduced-motion |
|---|---|---|---|---|---|---|
| Panel body | Arrive | Section change | opacity, y 6→0 | 180 ms | (0.2,0,0,1) | instant |
| Rail marker | Move | Section change | layoutId | 220 ms | (0.2,0,0,1) | instant |
| Save button | Confirm | Hover/press | rose fill slide | 180 ms | (0.3,0,0,1) | colour change only |
| "Needs you" item | Alert | New item | arrive at top | 180 ms | (0.2,0,0,1) | instant |
```

## 8. Anti-patterns

Fade-and-slide on every section on scroll · hover animations on every card · skeleton shimmer · spinners for layout-shaped loads · bouncy springs on UI state · animating text people are reading · motion as the only signal of a state change.
