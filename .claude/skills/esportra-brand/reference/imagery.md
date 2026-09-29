# Imagery

We photograph the real scene - cafes, LAN centres, bedrooms, small stages - and light and frame it as if it were a world final. The gap between the real place and the respect in the image is the brand promise made visible.

---

## 1. Photography direction

| Principle | Do | Don't |
|---|---|---|
| Real people | Actual players, hosts, venues from our community, with written consent | Stock models "gaming", AI-generated people |
| One light source | The monitor's glow on a face; a single stage spot; window light in a venue | Multicolour RGB washes, rim lights, lens flares |
| Focus, not celebration | The half-second before the decisive click: eyes locked, jaw set | Arms-up poses except the champion's moment |
| Details | Worn keycaps, a taped mouse cable, a headset round a neck, a strat on paper | Product-shot peripherals |
| Grade | Crushed blacks, desaturated environment, natural skin tones | Teal-orange blockbuster grades, heavy filters |
| Crop | Tight, off-centre, dark space on one side for type | Centred mid-shots with type pasted over faces |
| Consent & dignity | Minors only with guardian consent; no humiliating moments (a player crying after a loss) without explicit permission | Candid shots of losers for drama |

Shot list for any event: establishing wide (venue before doors open) · hands on keys · faces lit by screens · the captain's call · the crowd's reaction · the champion's lift · the runners-up's handshake · organizers at work.

## 2. The community's art

Crests, avatars, game art and banners arrive in every quality. Make every one of them look good.

- **Frame, don't compete.** Neutral dark well with padding: square for teams, circle for people, 16:9 for games. `object-contain` on `bg-white/[0.04]`.
- **Designed absence.** No crest → a quiet monogram or people icon in grey; no game art → the game's first letters in Poppins 900 at 20% white. Always handle `onError`; a broken-image icon is never acceptable.
- **Equal dignity.** A cafe team's crest and a sponsored org's crest get the same frame and size.
- **Never recolour, stretch or crop a mark.** Adjust the frame, not the mark.

## 3. Game art

A **window**, not a wallpaper: crop to 16:9, darken toward the edges (a subtle inner vignette) so our type and cue stay legible, credit the game. Never let publisher art become the background of a whole piece - the brand dissolves into theirs. Respect publisher guidelines (co-brand rules apply).

## 4. Iconography

- One family (`lucide-react`), consistent stroke; two sizes (16 px in controls/rows, 24 px on feature cards).
- Quiet by default (`zinc-500`), take the text colour when active.
- Icons clarify, not decorate: nav, choices, states, notices. Not on every heading.
- `↗` means "opens another page" - never decorative.
- No weapons, skulls or flames as brand icons.

## 5. Illustration and generated imagery

We don't use decorative illustration, mascots or abstract 3D blobs. Generated imagery is not used to depict people or events that didn't happen. Diagrams and data visualisations are welcome when they explain something real (a bracket, a format) and follow the colour system.

## 6. Fallback ladder

Real photo of the moment → real photo of the community/venue → team crest at hero scale → type alone. Type alone, done well, beats a weak photo every time.
