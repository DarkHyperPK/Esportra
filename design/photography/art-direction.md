# Photography art direction

<!-- esportra-canonical: company-v2 -->

This dataset contains no photographs, because none could be generated honestly. Every image slot in the templates expects a **real** photo of a real event. This brief tells a photographer, an organizer with a phone, or an agent choosing from an event's uploads what a good Esportra photo looks like, per direction.

The canonical imagery rules live in `.claude/skills/esportra-brand/reference/imagery.md`. This file is the shooting brief built from them.

---

## 1. The one idea

**Players lit by the game.** Esportra photographs look like the room at the moment it matters: dark, with the light coming from the monitors, the stage or a single spot. The player is the subject, not the platform, the sponsor or the gear.

## 2. Principles

| Principle | Why | In practice |
|---|---|---|
| One light source | It matches the brand's one cue | Monitor glow on faces, one stage spot, a window at a LAN hall. Turn off extra coloured LEDs where you can. |
| Faces before gear | People share photos of themselves, not keyboards | At least one face readable in every hero shot. |
| Tension, then release | Matches the event's emotional arc | Before: focus, hands, the empty stage. After: the lift, the hug, the handshake. |
| Real, never staged-looking | The scene can tell | Candid moments. If you pose, pose the team, not a fake celebration. |
| Room for type | Templates put captions and heroes on the image | Leave dark negative space (top-left or one side) in a third of your shots. |
| Respect | Players include minors and losing teams | Never mock a loser. Get consent. See §6. |

## 3. Per direction

| Direction | What to shoot | Light | Framing |
|---|---|---|---|
| Broadcast | Players mid-match, casters at the desk, the stage wide | Monitor glow, cool | Medium and wide; horizon level; dark top third for captions |
| Command Console | Rarely photographic. Organizer at a laptop, the admin desk | Practical desk light | Over-the-shoulder, screen content blurred or approved |
| Editorial | The story: arrival, warm-up, the key round, the lift, the aftermath | Available light, honest | A sequence of 8–12 frames with one full-bleed hero |
| Cinematic | The empty venue before doors, one spot on the stage, a silhouette | One hard light, deep shadow | Wide and still; strong negative space |
| Community | Groups, teams laughing, crowds, hands on shoulders, cafe cups | Warm, soft | Eye level, close, several faces |
| Daylight | Outdoor and LAN-hall events, signage, the venue in daylight | Natural daylight | Clean backgrounds for print |
| Trophy | The champion team lifting the trophy; the runners-up acknowledged | One warm key light | Tight on faces and trophy; also a 4:5 and 9:16 crop-safe version |
| Co-brand | Partner presence only where real: a branded stage, a prize handover | As the event | Partner marks visible but never the subject |
| Themed event | The event's truth (the cause, the city, the night) | As the theme | Motifs from the community, with their input |

## 4. Shot list for a standard event

1. **Venue before doors.** Wide, empty, one light (Cinematic key art).
2. **Check-in desk / captains arriving.** Candid (Community, recap).
3. **Setup hands.** Keyboards, headsets, jersey details (Editorial detail).
4. **Player focus.** Tight, monitor-lit, one face per frame (Broadcast social).
5. **Casters at the desk.** Medium with lower-third space bottom-left (stream, social).
6. **The crowd reacting.** Wide, several faces (Community).
7. **The deciding round.** Players and screen in one frame (Editorial hero).
8. **The lift.** Champions with the trophy, warm key light, 4:5 and 9:16 safe (Trophy).
9. **Runners-up.** Handshake or applause, with respect (recap).
10. **Team portraits.** Every team, dark background, eye level (team pages, crests fallback).

## 5. Technical spec

- **Formats:** deliver JPG (sRGB) at full resolution plus 2048 px long-edge web versions.
- **Crops:** frame so 16:9, 4:5, 1:1 and 9:16 crops keep the faces. Leave 10% safe margin.
- **Grade:** neutral to slightly cool. Blacks near `#09090B`, not crushed grey. No teal-and-orange, no heavy vignettes, no colour filters. Warm grade only for Trophy.
- **Noise:** fine grain is fine. Do not denoise faces to plastic.
- **Naming:** `<event-slug>/<yyyymmdd>-<shot-number>-<subject>.jpg`, for example `kvo-2026/20261118-08-lift-night-owls.jpg`.
- **Storage:** event photos go to the event's storage bucket via the app (validated upload), not into this repo.

## 6. Consent and safety

- Get consent for identifiable players. **For minors, get a parent's or guardian's consent** and never publish full names with the photo unless the guardian agrees.
- No photos of screens showing private information (messages, emails, payment details).
- Remove a photo on request, quickly, without argument.
- Do not photograph or publish people who asked not to be photographed.

## 7. Fallbacks when there is no photo

In order of preference:
1. The team crest at hero scale in a dark well (see `design/directions/trophy.png`).
2. The streak-shard texture (`design/textures/streak-shards.png`) with type only.
3. The spotlight texture (`design/textures/spotlight.png`) for Cinematic pieces.

Never use stock photos of generic "gamers", AI-generated people presented as real attendees, or game key art we don't have the rights to.

## 8. Do / don't

| Do | Don't |
|---|---|
| Monitor-lit faces | RGB-rainbow gear shots |
| One subject per frame | Crowded frames with no focus |
| Leave room for type | Faces under where the caption goes |
| Show the runners-up with dignity | Losers crying as content |
| Real venues, real people | Stock gamers, fake crowds |
