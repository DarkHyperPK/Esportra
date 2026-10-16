# PROJ-061 — Web broadcast workflow redesign

Date: 16 October 2026. State: implemented and locally tested; user acceptance and deployment pending.

## Operator path

1. Open the tournament Broadcast tab or Broadcasts. Resume an existing broadcast, or explicitly create one.
2. Pair the production PC, choose an eligible match, preview its HUD and choose broadcast screens.
3. Optionally add sponsors, talent and crew; review and send the setup to Air.
4. On the production PC, confirm the match loaded in Air, preview/customize screens, then Send to OBS and open production controls. Start streaming in OBS Studio.

## Implemented decisions

- No global top navigation in Broadcast, independent Air projects or the tournament Broadcast tab. One persistent left sidebar; keyboard-accessible left drawer on small screens.
- Match-led composition, official Esportra branding, charcoal hierarchy and one next action; advanced planning remains secondary.
- Explicit eligible-match choice and session-scoped resume; never silently select the first match. Played/unavailable prior selections require recovery.
- HUD settings visible, with footer save and an unsaved-edit guard for setup-step changes.
- Existing broadcasts precede new creation. All create/duplicate/resume paths converge on canonical setup.
- Successful publication immediately shows the desktop handoff; no claim that OBS is ready or that a heartbeat proves configuration receipt.

## Evidence

Full frontend tests: 651/651 in 111 files. Final focused navigation/setup: 15/15. Full lint/build and chunk/button/JSX checks passed. Full TypeScript still has existing unrelated failures; affected-scope diagnostics were empty. Browser/reference: 181 screens across 26 groups, zero renderer errors/overflow; all 25 setup-action checks in viewport; drawer keyboard/focus and gallery search/filter checks passed. Six bracket presentations passed with synthetic fixture data.

Audit: `docs/audits/2026-10-16-broadcast-web-ux.md`.
Single implemented reference: `D:/Esportra-Air/design/implemented/index.html`.

## Outstanding gates

- User visual and operational acceptance, authenticated account/staging rehearsal and live desktop/OBS/GEP integration.
- Final desktop evolving-match-desk design is not delivered by this web scope.
- Commit/push/deployment are separate; none performed for this redesign. Existing dirty work was preserved.
- Obsidian pending: connector unavailable after initial retrieval. On reconnection, read current Frontend/Air and Current-Work notes, save a distinct dated session, link Session-Index and read back edits. Include the evidence and remaining gates above. Do not write vault files through a filesystem workaround.
