# Assets for the Scrim feature reel

Everything the motion piece uses. Nothing here is redrawn: UI is captured from the real app code, the logo is traced from the real raster.

## Source note

esportra.com and the Supabase storage host are blocked by this cloud environment's network policy, and the scrim pages sit behind sign-in.
So the screens were captured from **the real scrim pages and components in this repo** (`src/pages/competitive/...`, unmodified),
rendered by `motion/harness/` with fictional sample data served through a fetch interceptor, a signed-in captain, a fixed clock
(Wed 20:47 PKT) and `prefers-reduced-motion` so each state is settled. Every state change was produced by a real click or hover in that UI
(`motion/capture/capture.cjs`). Team names and crests are the house samples (Night Owls, Crimson Five, plus four more), not real teams.

## Logo (`logo/`)

| File | What |
|---|---|
| `esportra-icon-512.png`, `esportra-og.png` | Real brand rasters from `public/brand/` |
| `esportra-mark.png` | Real white mark from `public/proposals/` |
| `esportra-lockup.svg`, `esportra-mark.svg`, `esportra-wordmark.svg` | Vector trace (potrace) of the 512 icon: crisp at any size |
| `esportra-lockup-white.png` | White-on-transparent cut of the 512 icon |

## Colours (`palette/palette.json`)

Stage black `#09090B`, panel `#111114`, ink `#FAFAFA`, secondary `#A1A1AA`, hint `#71717A`, cue rose `#F43F5E` (one cue, used sparingly),
success `#34D399`, warning `#FBBF24`. From `DESIGN.md`.

## Fonts (`fonts/`)

Poppins 400–900 (+ 800/900 italic), Inter variable, JetBrains Mono variable (stand-in for the app's `ui-monospace` captions), Rajdhani. Downloaded from Google Fonts (the families `index.html` loads).

## Textures (`textures/`)

Brand backgrounds from `design/textures/`: hairline grid, streak shards (landscape + portrait), cue shard, grain, spotlight, scoreboard field.

## Game art (not stored)

Valorant map splashes, player-card art and agent portraits load from the public `media.valorant-api.com` CDN exactly as the product does; rank icons from `public/game-assets/valorant/ranks/`.

## Screens (`screens/`)

Two widths: 540 px (mobile layout, fills a 1080-wide frame at 2x) and 1440 px (desktop). `screens/manifest.json` holds each state's element boxes (CSS px) used to crop, place the cursor and assemble pieces.

| File | Capture | State | Boxes |
|---|---|---|---|
| `screens/540/discovery-base.png` | 540px @2x | discovery-base | title, myScrims, upNext, count, card0, card1, card2, card3, card4, card5, request, filters |
| `screens/540/discovery-hover.png` | 540px @2x | discovery-hover | request, card0 |
| `screens/540/discovery-modal.png` | 540px @2x | discovery-modal | dialog, slot, requestScrim, pick |
| `screens/540/discovery-slot-hover.png` | 540px @2x | discovery-slot-hover | dialog |
| `screens/540/discovery-slot.png` | 540px @2x | discovery-slot | dialog, slot, requestScrim |
| `screens/540/discovery-request-hover.png` | 540px @2x | discovery-request-hover | dialog |
| `screens/540/discovery-offer.png` | 540px @2x | discovery-offer | dialog, send |
| `screens/540/discovery-send-hover.png` | 540px @2x | discovery-send-hover | dialog |
| `screens/540/discovery-sent.png` | 540px @2x | discovery-sent | dialog |
| `screens/540/room-time-base.png` | 540px @2x | room-time-base | back, faceoff, rail, next, schedule, veto, lobby, accept |
| `screens/540/room-time-hover.png` | 540px @2x | room-time-hover | back, faceoff, rail, next, schedule, veto, lobby |
| `screens/540/room-time-accepted.png` | 540px @2x | room-time-accepted | back, faceoff, rail, next, schedule, checkin, veto, lobby |
| `screens/540/room-checkin-base.png` | 540px @2x | room-checkin-base | back, faceoff, rail, next, schedule, checkin, veto, lobby, chat, checkinBtn |
| `screens/540/room-checkin-hover.png` | 540px @2x | room-checkin-hover | back, faceoff, rail, next, schedule, checkin, veto, lobby, chat |
| `screens/540/room-checkin-checked.png` | 540px @2x | room-checkin-checked | back, faceoff, rail, next, schedule, checkin, veto, result, lobby, chat |
| `screens/540/room-veto-base.png` | 540px @2x | room-veto-base | back, faceoff, rail, next, schedule, checkin, veto, result, lobby, chat, openVeto |
| `screens/540/room-veto-dialog.png` | 540px @2x | room-veto-dialog | dialog, haven, pool |
| `screens/540/room-veto-hover.png` | 540px @2x | room-veto-hover | dialog |
| `screens/540/room-veto-banned.png` | 540px @2x | room-veto-banned | dialog |
| `screens/540/room-report-base.png` | 540px @2x | room-report-base | back, faceoff, rail, next, schedule, checkin, veto, result, lobby, chat, fetch |
| `screens/540/room-report-hover.png` | 540px @2x | room-report-hover | back, faceoff, rail, next, schedule, checkin, veto, result, lobby, chat |
| `screens/540/room-report-fetched.png` | 540px @2x | room-report-fetched | back, faceoff, rail, next, schedule, checkin, veto, result, lobby, chat, candidate |
| `screens/540/room-report-candidate-hover.png` | 540px @2x | room-report-candidate-hover | back, faceoff, rail, next, schedule, checkin, veto, result, lobby, chat |
| `screens/540/room-report-reported.png` | 540px @2x | room-report-reported | back, faceoff, rail, next, schedule, checkin, veto, result, lobby, chat |
| `screens/540/insights-base.png` | 540px @2x | insights-base | title, hero, tabs, roster0, roster1, rosterRow, mapBars, rating |
| `screens/540/insights-hover.png` | 540px @2x | insights-hover | rosterRow, roster0 |
| `screens/1440/discovery-base.png` | 1440px @2x | discovery-base | title, myScrims, aside, upNext, count, card0, card1, card2, card3, card4, card5, request |
| `screens/1440/discovery-hover.png` | 1440px @2x | discovery-hover | request, card0 |
| `screens/1440/discovery-modal.png` | 1440px @2x | discovery-modal | dialog, slot, requestScrim, pick |
| `screens/1440/discovery-slot-hover.png` | 1440px @2x | discovery-slot-hover | dialog |
| `screens/1440/discovery-slot.png` | 1440px @2x | discovery-slot | dialog, slot, requestScrim |
| `screens/1440/discovery-request-hover.png` | 1440px @2x | discovery-request-hover | dialog |
| `screens/1440/discovery-offer.png` | 1440px @2x | discovery-offer | dialog, send |
| `screens/1440/discovery-send-hover.png` | 1440px @2x | discovery-send-hover | dialog |
| `screens/1440/discovery-sent.png` | 1440px @2x | discovery-sent | dialog |
| `screens/1440/room-time-base.png` | 1440px @2x | room-time-base | back, faceoff, rail, next, schedule, veto, lobby, accept |
| `screens/1440/room-time-hover.png` | 1440px @2x | room-time-hover | back, faceoff, rail, next, schedule, veto, lobby |
| `screens/1440/room-time-accepted.png` | 1440px @2x | room-time-accepted | back, faceoff, rail, next, schedule, checkin, veto, lobby |
| `screens/1440/room-checkin-base.png` | 1440px @2x | room-checkin-base | back, faceoff, rail, next, schedule, checkin, veto, lobby, chat, checkinBtn |
| `screens/1440/room-checkin-hover.png` | 1440px @2x | room-checkin-hover | back, faceoff, rail, next, schedule, checkin, veto, lobby, chat |
| `screens/1440/room-checkin-checked.png` | 1440px @2x | room-checkin-checked | back, faceoff, rail, next, schedule, checkin, veto, result, lobby, chat |
| `screens/1440/room-veto-base.png` | 1440px @2x | room-veto-base | back, faceoff, rail, next, schedule, checkin, veto, result, lobby, chat, openVeto |
| `screens/1440/room-veto-dialog.png` | 1440px @2x | room-veto-dialog | dialog, haven, pool |
| `screens/1440/room-veto-hover.png` | 1440px @2x | room-veto-hover | dialog |
| `screens/1440/room-veto-banned.png` | 1440px @2x | room-veto-banned | dialog |
| `screens/1440/room-report-base.png` | 1440px @2x | room-report-base | back, faceoff, rail, next, schedule, checkin, veto, result, lobby, chat, fetch |
| `screens/1440/room-report-hover.png` | 1440px @2x | room-report-hover | back, faceoff, rail, next, schedule, checkin, veto, result, lobby, chat |
| `screens/1440/room-report-fetched.png` | 1440px @2x | room-report-fetched | back, faceoff, rail, next, schedule, checkin, veto, result, lobby, chat, candidate |
| `screens/1440/room-report-candidate-hover.png` | 1440px @2x | room-report-candidate-hover | back, faceoff, rail, next, schedule, checkin, veto, result, lobby, chat |
| `screens/1440/room-report-reported.png` | 1440px @2x | room-report-reported | back, faceoff, rail, next, schedule, checkin, veto, result, lobby, chat |
| `screens/1440/insights-base.png` | 1440px @2x | insights-base | title, hero, tabs, roster0, roster1, rosterRow, mapBars, rating |
| `screens/1440/insights-hover.png` | 1440px @2x | insights-hover | rosterRow, roster0 |