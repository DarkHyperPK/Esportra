# Product

<!-- impeccable:product-schema 1 -->
<!-- esportra-canonical: company-v2 -->

> Canonical product record for design tools (impeccable and others). The brand and design authority is `.claude/skills/esportra-brand/` and `.claude/skills/design-recipe/`; this file summarises them and never overrides them. If anything here conflicts with those skills or with `CLAUDE.md`, they win. Do not regenerate this file with `impeccable init`. Update it deliberately with the Creative Lead and CMO.

## Platform

adaptive

## Users

- **Organizers**: grassroots and semi-pro tournament organizers, plus their staff (admins, referees, casters). They create tournaments, run check-in, manage brackets and match rooms, resolve disputes, and review payments and payouts. They usually work on a laptop during setup and on a phone on event day.
- **Captains and players**: they register teams, check in against a countdown, propose match times, report results and follow brackets. They work mostly on mid-range Android phones on mobile data, often minutes before a match.
- **Venue owners and staff**: gaming venues listing stations for booking. They manage availability, bookings and payment confirmation. The desktop station agent (`esportra-desktop`) runs on their machines.
- **Spectators and the scene**: people viewing public tournament pages, brackets and results, and sharing them on social media.

## Product Purpose

Esportra runs esports tournaments and venue bookings end to end, from creating a tournament through registration, check-in, match rooms, results, disputes, payouts, and booking a station at a venue. It succeeds when an organizer can run an event day from a phone without chaos, and when players always know what to do next and by when.

## Positioning

Esportra is a scene-native command centre. It combines tournament operations, realtime match rooms (SignalR) and physical venue stations (the desktop station agent) in one product. It feels like a broadcast control room, not a generic SaaS dashboard.

## Operating Context

- **Event day is the critical moment.** Check-in windows close at exact minutes in the tournament's time zone. Match rooms update in realtime. Disputes arrive under time pressure.
- **Phones on mobile data are the baseline.** Most use happens at 390 px on a 4G connection, often in loud, dark venues.
- **Many roles share one product.** Surfaces and actions differ by role: owner, staff, captain, player, anonymous visitor, venue owner.
- **Clients:** the React web app, the Capacitor mobile apps, and the Electron desktop station agent.

## Capabilities and Constraints

- **Stack:** React 18, TypeScript, Vite, Supabase (Postgres with RLS, RPCs and triggers), TanStack Query, React Hook Form with Zod, Tailwind with shadcn/ui, Framer Motion, SignalR and Capacitor.
- **Design kit:** `src/components/ui/kit` (tokens in `tone.ts`). Dashboard primitives live in `src/components/management/CommandSurface.tsx`.
- **Build checks:** `npm run build` runs the chunk checks and `check:buttons`. Rose borders and rings on buttons fail the build.
- **Security is blocking.** RLS on every table; nothing trusted from the client. See the Security section of `CLAUDE.md`.
- **Terminology:** tournament, stage, bracket, match room, check-in, captain, roster, dispute, payout, venue, station, booking.

## Brand Commitments

- **Voice:** direct, scene-literate, calm under pressure. Say what happened, what it means and what to do next. See `.claude/skills/esportra-brand/reference/voice.md`.
- **Invariants:**
  - The stage-black ground.
  - Rose (#F43F5E) as the single cue colour, used sparingly.
  - Square corners.
  - Poppins for display, Inter for text, monospace caps for captions and button labels.
  - Tabular numbers.
- **Variables:** the direction is chosen per surface by `design-recipe`: Broadcast (resting look), Command Console, Editorial, Cinematic, Community, Daylight, Trophy, Co-brand or Themed event. One look is not repeated everywhere.
- **Never apply** Anthropic's brand (`brand-guidelines`) or an unrelated preset theme to Esportra.

## Evidence on Hand

- Real product screens exist in `src/pages` and `src/components` (tournament dashboard, create flow, stage wizard, match rooms, venue booking).
- There are no customer testimonials, press quotes, partner logos or usage statistics in the repo. Future work must not invent them. Use real data or clearly marked placeholders.

## Product Principles

1. **Event day first.** Design for the minute before a deadline on a phone, then scale up.
2. **Always the next step.** Every screen says what happened, what it means and what to do next.
3. **Read the room.** Choose the direction for the moment (calm operations, celebration, bad news) rather than one house style.
4. **Trust is enforced, not implied.** The server enforces permissions, money and eligibility, and the UI states them honestly.
5. **Scene-native, not template.** The product should look intentional and specific to esports, never like a generic admin kit.

## Accessibility & Inclusion

- WCAG 2.2 AA contrast on dark and daylight grounds. The contrast pairs are in `design-recipe/reference/colour-system.md`.
- Full keyboard and screen-reader support. Visible focus rings (white rings, never rose, on buttons).
- Honour `prefers-reduced-motion` with the fallbacks in `design-recipe/reference/motion-spec.md`.
- Touch targets of at least 44 px. Sunlight-readable Daylight direction for outdoor and LAN-hall use.
- Players can be minors: keep personal data minimal and never exposed publicly.
