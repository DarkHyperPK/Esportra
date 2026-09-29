# Direction dossier: Cinematic

> Key art. One enormous idea, one light source, one action. The brand at its most expressive - and most disciplined.

Cinematic is for moments that must stop people: product launches, landing-page heroes, campaign key art, trailers, the opening of a season. It is the loudest thing we do, and its power comes from restraint: one idea, one hero, huge rest areas, and nothing else competing.

---

## 1. Signal profile

| Signal | Fits when | Doesn't fit when |
|---|---|---|
| S1 Surface | Landing heroes, key art, OOH, trailers, launch posts | Task surfaces |
| S2 Mode | Persuade | Operate, Read |
| S3 Arc | Anticipation | Nerves, live, trouble |
| S4 Audience | Broad (players, organizers, fans, partners) | Staff |
| S5 Density | One fact | Anything tabular |
| S6 Emotion | Anticipation, ambition | Reassurance, certainty |
| S7 Latitude | L2 | L0 |

---

## 2. Ingredients

### Ground and light
Deep stage black with **one light source** - a stage spot, a monitor glow on a face - and one soft falloff behind the hero. No multicolour gradients, lens flares, particles or neon rims.

### Type (extreme scale)
| Step | Spec |
|---|---|
| Hero word/line | Poppins 900, 96-200 px desktop (clamp to 56-72 px on phones), tracking -3%, leading 0.9 |
| Supporting line | Inter 400-500, 18-22 px, one sentence |
| Caption | Mono 11-12 px caps, wide tracking, `zinc-400` |
| Action | `CommandButton` primary, size `lg` |

Hero-to-caption ratio: 6-10×. One grid break: the hero word may bleed off an edge or overlap the photo.

### Layout
Hero pushed off-centre (left third or bottom-left) with a large dark rest area opposite. Caption anchors top-left; action releases bottom-right. Features and details go **one scroll down**, in their own bands (scoreboard, spotlight, fork).

### Imagery
Full-bleed real photography (a player mid-focus, a venue before the doors open) or type alone. Graded dark, desaturated environment, natural skin. Never stock, never collages.

### Motion
Stillness → one decisive reveal → long hold. Hero line enters with a mask wipe (500 ms, `cubic-bezier(0.7, 0, 0.2, 1)`); image slow push-in (scale 1.0 → 1.04 over 8 s, once). In video, cut the music bed before the reveal. Reduced motion: all static.

### Voice
One line that lands. "Every match, official." · "Starts at 8:00 PM. Actually." No feature lists, no exclamation marks.

---

## 3. Signature moves

Tight display + wide caption (at maximum contrast) · white speaks, rose confirms · one cut edge or grid break · caption over hero number when the hero is a number.

---

## 4. Do / don't

| Do | Don't |
|---|---|
| One idea, one hero, one action | Three value props in the hero |
| Massive rest areas | Filling the frame |
| Real photography or type alone | Stock gamers, 3D blobs, gradient meshes |
| Details one scroll down | Cramming format, prize and schedule into the hero |
| Pass the three-second test on a phone | Designing only for the 1440 px screenshot |

---

## 5. Worked example: landing hero for organizers

Truth: "Local cups start late and end in Discord arguments." Idea: "Run your cup like a final." Hero: the word "final." at 180 px. Caption: `FOR ORGANIZERS · FREE TO START`. Supporting line: "Brackets, check-in, disputes and payouts in one place." Action: "Host a cup". Image: an empty venue minutes before doors open, one spot on the stage. Next band: a scoreboard of what they get; then a spotlight quote from a real organizer; then the fork (quick cup / full event).
