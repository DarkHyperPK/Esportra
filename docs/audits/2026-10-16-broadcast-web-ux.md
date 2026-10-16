# Broadcast web workflow audit — 16 October 2026

## Brief and direction

The organizer must know what to do next and where web preparation ends. Existing tournament identity, matches, HUD, screens, sponsors and people remain the source of truth. The user rejected generic styling and requested an audit followed by implementation. Their selected direction is an evolving match workspace; web prepares the broadcast and hands it to the desktop for OBS operation.

Direction: Esportra Broadcast with Command Console density. Hero: the selected real match or tournament. Structural signatures: an ordered task spine, persistent fixture and explicit web-to-Air-to-OBS handoff. Expressive signatures: versus typography and one rose current-task cue. Use canonical white primary actions, Poppins/Inter, square framing and charcoal luminance. A metrics dashboard was rejected because counts do not explain the next task. An OBS-style web control room was rejected because this web application does not operate OBS.

## Findings from source and actual component captures

| Priority | Before | Required result | Source |
| --- | --- | --- | --- |
| High | Home, Shows, Get started and Show flow compete as starting points | Preparation entries lead to the eight-step setup; advanced planning stays secondary | BroadcastHomePage, BroadcastShowsPage, BroadcastGetStartedPage, TournamentBroadcastShows |
| High | The first eligible match appears selected without an operator choice | Explicit selection, resumable context and invalid/completed-match recovery | ShowPreparation slots[0] fallback |
| High | Create/duplicate navigate to a legacy route while Open bypasses setup | Consistent create/resume path and clearly named advanced/history routes | BroadcastShowsPage |
| High | Primary-looking buttons compete with Continue; disabled Next has no nearby reason | One primary next action and visible recovery | ShowPreparation, PreparationStepContent |
| High | Publication is presented as desktop/OBS readiness | Distinguish publication from receipt and explicit Send to OBS | SetupReview |
| Medium | Repeated headings, boxed tabs, tiny captions and black surfaces flatten hierarchy | Shared branded shell, match emphasis, task spine and restrained dividers | A01/E02 captures, BroadcastNavigation, broadcast-setup.css |
| Medium | HUD appearance is hidden in a collapsed help section | Visible preview and appearance controls | HudAppearanceSetup |
| Medium | Advanced plan is a separate unframed room with ambiguous live status | Shared navigation and accurate web-status labels | BroadcastShowDetailPage |
| Medium | A new-broadcast form precedes existing tournament broadcasts on every visit | Resume existing work first; reveal creation intentionally | BroadcastPanel |

## Verification contract

Check tournament entry, first use, saved broadcasts, unknown/offline/online connections, explicit/resumed/expired match selection, completed-match exclusion, preview isolation, screen import, optional steps, publication failure/success and desktop handoff. Verify keyboard, long names, mobile 390 px and desktop 1440 px, reduced motion and overflow. Run relevant tests, full lint/test/build and actual-component captures. Preserve existing dirty work and permissions. Local verification, real account/desktop acceptance and deployment remain separate.

## Delivery state

Implemented locally. No new backend contract is required. Broadcast routes, independent Air projects and the tournament Broadcast tab use sidebar navigation without the global top navbar. Public pages and other tournament tabs retain their existing navigation. Mobile uses an accessible left drawer, not a top navigation bar.

| Before | Implemented |
| --- | --- |
| Competing navigation and entry routes | One shared branded sidebar; create, duplicate and resume lead to setup |
| Automatically chosen match | Explicit match selection, session resume and completed-match recovery |
| Unclear disabled action | A persistent next action with a reason or connection recovery |
| Hidden HUD settings and lost edits | Visible settings, footer save and an unsaved-edit step guard |
| Resume hidden behind creation | Existing tournament broadcasts first; creation revealed on request |
| Publication confused with production readiness | Immediate publication confirmation followed by explicit Air / preview / Send to OBS instructions |

The shell uses the official mark/wordmark, charcoal surfaces, Poppins headings, Inter body, white primary actions and a restrained rose current-step cue. Existing APIs, authorization, pairing and production commands remain in place. The desktop match-desk redesign is a separate scope and is not implemented by this web change.

### Evidence and limits

- Full frontend suite: 651 tests across 111 files passed locally. Following the final publication/focus fixes, the 15 focused navigation/setup tests also passed.
- Full lint and production build passed, including chunk, button and JSX-symbol checks.
- Full TypeScript still reports previously known bracket/payment/tournament errors outside the changed Broadcast/Air/App scope. No changed-scope diagnostics were found; do not report a clean full typecheck.
- Browser capture: 181 screens across all 26 A–Z groups, zero renderer errors or horizontal overflow. All 25 setup-action checks stayed in the viewport. Mobile drawer keyboard navigation, Escape/focus return, gallery search/filter and six real-data bracket presentations passed using synthetic fixtures.
- The sole screen reference is `D:/Esportra-Air/design/implemented/index.html`. Actual components use synthetic accounts, backend responses and desktop IPC; this does not certify live OBS, GEP, authenticated staging or operator acceptance.
- No new commit, push or deployment. The prior deployed frontend release remains `11ccfa81`; this redesign is local.

### Pending shared-memory handoff

The Obsidian connector became unavailable during this task (no callable Obsidian tools). Startup context was retrieved earlier; this completed redesign has **not** been saved to Obsidian. Consolidate this audit and the canonical PROJ-061 handoff into Frontend/Air, Current-Work and a dated Session-Index entry when the connector returns. Do not bypass the connector by writing protected vault files directly.
