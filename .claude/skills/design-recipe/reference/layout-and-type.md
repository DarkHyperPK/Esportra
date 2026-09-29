# Layout and type system

The numbers behind hierarchy and rhythm. Use these values; deviate only with a reason written in the Direction Contract.

---

## 1. Breakpoints and grids

| Breakpoint | Width | Columns | Gutter | Margin | Notes |
|---|---|---|---|---|---|
| Phone | 360-430 px (design at 390) | 4 | 16 px | 16 px | Primary action in the bottom third (thumb reach); sticky bars |
| Tablet | 768 px | 8 | 20 px | 24 px | Rails collapse to drawers |
| Laptop | 1280-1440 px (design at 1440) | 12 | 24 px | 32-56 px | Rail 240-260 px + content |
| Wide | ≥ 1600 px | 12 | 24 px | auto | Cap content at 1440 px; forms at `max-w-3xl` |

**Asymmetry is intentional.** A narrow rail beside wide content, a hero pushed to one side with dark rest opposite. Centred symmetry is reserved for the Verdict and the Face-off, where the axis *is* the meaning.

## 2. The space ladder

Each step roughly doubles; the unevenness is what groups things.

| Relationship | px | Tailwind |
|---|---|---|
| Caption ↔ its value; label ↔ control | 4-8 | `gap-1`, `space-y-2` |
| Items inside a group; fields in a section | 16-20 | `gap-4`, `space-y-5` |
| Group ↔ group; section ↔ section (with hairline) | 32 | `py-8` (`py-6` in dialogs) |
| Region ↔ region | 40-48 | `mt-10`, `mt-12` |
| Hero ↔ everything else | 64-128+ | as the direction allows |
| Panel padding | 20-24 | `px-5 sm:px-6` |

Command Console uses ~0.75×; Community and Editorial ~1.25×; Cinematic uses as much rest as the frame affords.

## 3. Type scale

| Step | Product (Broadcast) | Console | Editorial | Cinematic | Leading | Tracking |
|---|---|---|---|---|---|---|
| Display | 30-48 px / 900 | - | 40-64 px / 800-900 | 96-200 px / 900 | 0.9-1.05 | -2% to -3% |
| Title | 18-20 px / 700 | 16-24 px / 700 | 22-24 px / 700 | 24-32 px / 700 | 1.2 | -1% |
| Body | 14-15 px / 400 | 13-14 px / 400 | 17-19 px / 400 | 18-22 px / 400-500 | 1.5 (1.65 editorial) | 0 |
| Label | 13 px / 500 | 12-13 px / 500 | - | - | 1.3 | 0 |
| Hint | 12 px / 400 | 12 px / 400 | 14 px / 400 | - | 1.5 | 0 |
| Caption (mono caps) | 10-11 px / 700 | 11 px / 500 (sparingly) | 11 px / 700 | 11-12 px / 700 | 1.2 | +28% |

Families: display/titles Poppins (`font-heading`), text Inter (`font-body`), captions monospace.

**Hierarchy by contrast of scale:** the display step is at least 2× body in product and 6-10× the caption in campaigns. One display element per screen.

## 4. Measure

- Reading text: 60-70 characters (`max-w-prose`/`max-w-xl`).
- Hints and descriptions: ≤ 65 characters (`max-w-xl`).
- Forms: `FORM_MEASURE_CLASS` (`max-w-3xl`). Short related fields pair in two columns ≥ 768 px; long fields or fields with hints take the full row.

## 5. Numbers

- `tabular-nums` always where numbers change or align.
- Value in display weight, unit at ~30% size in `zinc-500`: `PKR` + `150,000`; `12` + `min left`.
- Caption above the value, never beside it.
- Exact for money and time; rounded only to show scale ("1.2k watching").
- Scores with an en dash `13–7`; winner side white, other side `zinc-400`.

## 6. Alignment

Left-align text in product and editorial. Centre only in verdict/face-off compositions and short cinematic lines. Numbers in tables right-aligned; identity (names) left-aligned.

## 7. Checks

- Does the eye know where to start within one second? (one display element)
- Can you draw the groups with a pencil by looking only at the gaps? (space ladder working)
- Any line of reading text longer than ~75 characters? (fix measure)
- Any size outside this table without a reason? (remove or justify)
