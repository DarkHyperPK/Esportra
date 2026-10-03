# Esportra Broadcast: Product Requirements Document

| | |
|---|---|
| **Product** | Esportra Broadcast (working name for the HUD tool) |
| **Document** | PRD v1.0 |
| **Status** | Draft for CEO review |
| **Date** | 3 October 2026 |
| **Owner** | Product (CPO) · Design: Creative Lead · Engineering: CTO |
| **Companion docs** | UI/UX recipe and screens: [`README.md`](README.md) and the 19 pictures in this folder · HUD codebase: `esportra-valorant-hud` |

---

## Contents

1. [Status: what we did, where we are](#1-status-what-we-did-where-we-are)
2. [Goal](#2-goal)
3. [Problem](#3-problem)
4. [Users and jobs to be done](#4-users-and-jobs-to-be-done)
5. [Product principles](#5-product-principles)
6. [Scope](#6-scope)
7. [Success metrics](#7-success-metrics)
8. [System overview](#8-system-overview)
9. [Requirements by epic](#9-requirements-by-epic)
10. [Non-functional requirements](#10-non-functional-requirements)
11. [Data model](#11-data-model)
12. [Interfaces and contracts](#12-interfaces-and-contracts)
13. [Security, privacy and compliance](#13-security-privacy-and-compliance)
14. [Release plan and milestones](#14-release-plan-and-milestones)
15. [Quality plan](#15-quality-plan)
16. [Risks and mitigations](#16-risks-and-mitigations)
17. [Packaging and pricing hypotheses](#17-packaging-and-pricing-hypotheses)
18. [Decisions log](#18-decisions-log)
19. [Open questions](#19-open-questions)
20. [What's next](#20-whats-next)
21. [Glossary](#21-glossary)
22. [Appendix: related work shipped this cycle](#22-appendix-related-work-shipped-this-cycle)

---

## 1. Status: what we did, where we are

### 1.1 Already built (before this document)

**`esportra-valorant-hud`**, a working broadcast HUD (your codebase):
- 45 browser-source graphics at 1920×1080: in-game layers, between-rounds panels, full-screen scenes, holding screens, stinger.
- An operator control panel (`control.html`).
- A real-time room server (`server/server.js`): rooms by match code, snapshot + JSON merge patch with versioning, an event log to ndjson, an HTTP API and static hosting.
- A Valorant GEP adapter (`adapters/valorant-gep.js`) with tests and a simulator, plus an Overwolf capture starter.
- Brand assets, fonts and a stinger render.

**In Esportra (web):** tournaments, brackets, map veto, match rooms, Riot-verified results, SignalR match rooms, and organizer dashboards. These are the data the broadcast tool automates from.

### 1.2 Done in this cycle

| Area | What | Where |
|---|---|---|
| Share cards | Esportra share cards made in-app from the Riot record (16:9 match, 4:5 player), downloadable by captains **and organizers** in the match room; broadcast redesign with MVP duel, team-colour lighting, angled boards | `src/components/share-cards/*`, commits `1bb540d5`, `82d4dd76` |
| OBS overlay theme | `theme=esportra` on the existing Riot OBS overlay routes, default on `/debug/riot`; old themes kept | `src/pages/debug/EsportraOverlay.tsx`, commit `5794c800` |
| Architecture decision | Hybrid: **desktop production node** (GEP, local HUD server, OBS/vMix control, autopilot, offline) + **web Broadcast section** (plan, monitor, report). Graphics Studio deferred to desktop | §18 |
| Industry research | LHM.gg, Singular.live, NodeCG, SuperConductor, community Valorant tools; our differentiators | [`README.md §3`](README.md#3-industry-today-and-how-we-are-better) |
| UI/UX | **19 high-fidelity screens**: 6 web, 8 desktop, 5 system boards, with numbered callouts | `design/hud-studio/*.png`, commits `3a3f2830`, `9f8679af` |
| UX spec | Recipe and ingredients: flows, per-screen behaviour, motion, automation model, OBS/vMix contract, data, reliability, a11y | [`README.md`](README.md) |
| Design source | Editable HTML sources and kit, rebuilt by the design pipeline | `design/source/hud-kit.mjs`, `design/source/hud/*.mjs` |
| This PRD | Goal, scope, requirements, acceptance criteria, release plan | this file |

### 1.3 Where we are

- **Design:** complete for the MVP surfaces, pending CEO review.
- **Engineering:** not started on the product. The HUD core is reusable as-is (graphics, room server, adapter).
- **Next decision needed:** approve scope and phases (§6, §14), then answer the open questions that block P0 (§19: Overwolf distribution, Riot policy).

---

## 2. Goal

**Vision:** every Esportra match can be a broadcast, produced by the tournament itself.

**Goal for v1 (GA):** an organizer links a tournament, pairs one PC, adds browser sources in OBS once, and every match on that node runs as a show with **at least 80% of on-air changes made automatically**. A producer only holds, skips or adds moments.

**Business goals:**
1. Make Esportra the default home for Pakistani and regional Valorant tournaments that stream, because production is easier here than anywhere else.
2. Open a paid tier for organizers who stream (nodes, parallel feeds, sponsor proof).
3. Raise sponsor value of Esportra events with measurable on-air time.

---

## 3. Problem

Running a Valorant tournament broadcast today needs:
- A HUD tool, set up separately from the tournament.
- Manual entry of teams, logos and scores.
- An operator clicking graphics all match.
- A producer switching OBS scenes by hand.
- Someone copying results back into the bracket.

Small and mid-size organizers either don't stream, stream a bare game feed, or burn volunteers on repetitive clicks. Mistakes are public (wrong score, wrong team name), and sponsors get no proof of exposure.

**Evidence we have:**
- The HUD we already built proves the graphics and data layer.
- LHM.gg's growth proves demand for automation (it markets "up to 80%" automated production).
- Esportra already holds the tournament data every one of those manual steps re-types.

---

## 4. Users and jobs to be done

| Persona | Context | Jobs to be done | Pain today |
|---|---|---|---|
| **Ops lead** (organizer staff) | Runs 4–16 matches a day across 1–4 streams | "Make sure every match that should be on stream is, with the right teams, without me babysitting each one" | Spreadsheets, Discord pings, re-typing |
| **Producer** | One stream, one PC, often a volunteer | "Keep the show clean and react to moments, not do busywork" | Clicks every round; misses replays; panics when OBS drops |
| **Observer** | Spectates in Valorant | "Watch the game; tell the producer when something deserves a replay" | Shouts across the room |
| **Crew** | Sets up OBS, cameras, audio | "Add the graphics once and never touch them again" | URLs change, sources break between matches |
| **Caster / talent** | On the desk | "Have my name right and the right stats on screen when I talk" | Wrong lower thirds, no stats |
| **Sponsor** (indirect) | Pays for placement | "Proof I was on screen and for how long" | Screenshots, guesses |
| **Team / creator** (indirect) | Co-streams their matches | "Show the live score on my stream" | No official overlay |

---

## 5. Product principles

1. **The tournament drives the show.** If Esportra knows it, nobody types it.
2. **Autopilot, with a visible hold.** Automation acts on its own, but always announces itself and can be stopped.
3. **Graphics never depend on OBS or the internet.** Failures pause automation; they never blank the screen.
4. **One job per surface.** Observer sends data, crew adds sources, producer decides, ops oversees.
5. **Rose means on air.** The interface tells the truth about what viewers see.
6. **Everything has a keyboard path and an audit trail.**

---

## 6. Scope

### 6.1 In scope for v1 (GA = phases P0–P4)

- Desktop production node: GEP capture (observer and optional player PCs), local HUD server serving the 45 graphics, producer console, OBS control, vMix control (basic), autopilot, Fix data, offline mode.
- Web Broadcast section: shows from tournaments, HUD pack and theme, rundown templates (Bo1, Bo3) and rules, node pairing and assignment, live monitor with remote hold/take, crew and links, post-show report.
- Results loop: map results confirmed from GEP into the bracket, corrections with source.
- Sponsor on-air proof, VOD chapters, share cards in the report.
- Onboarding checklist and one-click OBS scene build.

### 6.2 Later (post-GA)

- Phone remote (P5). Designed now, built after GA if time is tight.
- Graphics Studio, a desktop editor for custom HUDs and data binding (P6).
- Multi-game (CS2 via GSI, League) on the same node architecture.
- Cloud relay for fully remote productions.
- AI observer assistance (auto camera suggestions) and auto-highlight clips.

### 6.3 Non-goals for v1

- Encoding or streaming video (OBS/vMix keep that job).
- Replacing the Valorant observer (we don't control the game camera).
- Mac or Linux nodes (Windows only, because GEP and Valorant are Windows).
- Editing graphics layouts in v1 (themes only; layout editing is the Studio).
- Hosting VODs.

---

## 7. Success metrics

| Metric | Definition | v1 target (90 days after GA) |
|---|---|---|
| **North star: hands-free rate** | Automatic takes ÷ all takes (automatic + manual), per show | ≥ 80% median |
| Time to first show | Tournament linked → first match on air with autopilot | ≤ 30 min median for a new org |
| Shows per week | Matches produced through Broadcast | 150 / week |
| Active orgs | Orgs with ≥ 1 show in the last 30 days | 25 |
| On-air incidents | Wrong score or team name on air, per 10 shows | ≤ 1 |
| Recovery | Median time from OBS drop to resumed autopilot | ≤ 30 s |
| Results loop | Map results confirmed from GEP without manual entry | ≥ 90% of produced maps |
| Sponsor proof exports | Reports exported per sponsored show | ≥ 50% |
| Producer satisfaction | "How easy was today's show?" (1–5) after each show | ≥ 4.3 |

Guardrails: no increase in disputes on produced matches; node crash rate under 1 per 50 show-hours.

Instrumentation: every take, hold, skip, data fix and incident is already an audited event (§11), so metrics come from `broadcast_events` without extra tracking.

---

## 8. System overview

```
Esportra web (cloud) ──REST/SignalR──► Broadcast hub ◄──SignalR (outbound from node)── Production node (desktop)
                                                                                      │   │   │
                                         Observer PC (capture only) ──GEP over LAN────┘   │   └─obs-websocket / vMix API──► OBS / vMix ──► Stream
                                                                                          └─ local HUD server :5300 ──► browser sources inside OBS
```

- **Web:** plans shows, watches nodes, reports.
- **Node:** runs the show. It embeds the existing HUD server and graphics unchanged, and adds the show runner, OBS/vMix controller, console and offline queue.
- **OBS:** switches scenes on command.
- **Graphics:** follow state on their own, so rounds never switch scenes.

Full detail: [`README.md §4`](README.md#4-architecture) and picture `sys-15-how-it-works.png`.

---

## 9. Requirements by epic

Each requirement has an ID, priority (**P0** = GA blocker, **P1** = GA target, **P2** = post-GA), phase, and acceptance criteria. Screens are referenced by picture number (`README.md §1`).

### E1 · Production node and capture (phase P0)

**E1.1 Install and pair**: *as an ops lead, I pair a PC to my organization so it can run shows.* (P0, screens 7, 19)
- Given a fresh install, when the app starts, then it shows a pairing code valid for 10 minutes and single use.
- When org staff enters the code on the web, then the node appears in Production nodes within 3 s with its name and capabilities.
- Revoking the node on the web disconnects it within 5 s; it returns to the pairing screen.
- The node token is stored in the OS credential store, never in plain files.

**E1.2 Local HUD server**: *as crew, I add browser sources that never need to change between matches.* (P0, screen 12)
- The node serves all 45 graphics at stable URLs per node (`/o/<output>?k=<key>`) on This PC and LAN addresses.
- Switching matches on the node changes content, never URLs.
- Each output reports its connection count and last frame time to the console and web.
- The existing room protocol (snapshot, patch with `v`, event, resync) is unchanged; graphics from `esportra-valorant-hud` run without code changes.

**E1.3 Capture only mode**: *as an observer, I send game data without being able to change the show.* (P0, screen 11)
- Choosing Capture only hides all show controls; the window shows destination, latency, features and hotkeys.
- GEP messages reach the node over LAN with median latency ≤ 50 ms.
- F9 sends a replay marker, F10 a producer flag; both appear in the console within 300 ms.
- If the production PC is unreachable, the app buffers up to 60 s of messages and retries; it says so.

**E1.4 Capture status and fallbacks**: *as a producer, I know what data I can trust.* (P0, screen 10)
- Each GEP feature shows Live or Covered, freshness and 60 s activity.
- Spike timer derives from the plant event (45 s, with defuse markers); round timer counts locally and corrects on GEP time.
- No events for 10 s during a live round marks the feed stale (console banner, web alert, on-screen "feed paused" tag).

**E1.5 Simulator**: *as a producer, I rehearse without the game.* (P1, screen 10)
- Loads an `.ndjson` recording (from the room event log) or a scripted round; play, pause, speed 0.5–4×, scrub.
- Drives graphics and autopilot; OBS switching only when "Allow OBS" is on.

**E1.6 Player PCs**: *as a producer, I can add exact health and ability charges.* (P2)
- Installing the capture app on player PCs adds per-player health and charges; the console shows which players are covered.

### E2 · OBS and vMix control (phase P1)

**E2.1 Connect to OBS** (P0, screens 7, 9)
- The node auto-detects OBS on the same PC (obs-websocket, port 4455) and asks only for the password; a LAN OBS needs IP and password once.
- Connection state, version, Studio Mode and scene collection show on Scenes and Readiness.
- Reconnect uses backoff 1, 2, 4, 8 s (max 10 s) and pauses autopilot while disconnected.

**E2.2 One-click scene build** (P0, screens 5, 9)
- Creates scenes Holding, Gameplay, Fullscreen, Replay, Casters in a new scene collection "Esportra · <show>".
- Adds the matching browser sources at 1920×1080 with "shutdown when not visible" off.
- Adds labelled slots for game feed and caster cameras; detects when crew adds sources to them.
- Never deletes or renames existing user scenes; rebuilding only touches Esportra-owned items.

**E2.3 Segment → scene mapping** (P0, screen 9)
- Each segment maps to a scene and a transition (Cut, Fade N ms, Stinger); the scene list is read live from OBS.
- Missing scenes block Publish to that node with a clear message.

**E2.4 Takes** (P0, screen 8)
- Studio Mode on: load preview, then transition. Off: set program scene.
- Take latency ≤ 100 ms on the same PC.
- Tally on console, web and phone follows OBS events, never local assumptions.

**E2.5 Replays** (P1)
- Replay trigger saves the replay buffer, loads the clip into the Replay scene's media source, switches with stinger, and returns to the previous scene when the clip ends.
- If the replay buffer is off, the trigger is disabled with the reason.

**E2.6 vMix** (P1)
- Same mapping with inputs instead of scenes via the HTTP API; tally from the XML state; Cut, Fade and Stinger 1–4 supported.

**E2.7 Multiple switchers** (P2)
- A node can hold several OBS or vMix connections; each segment targets one.

### E3 · Autopilot, rundowns and rules (phase P2)

**E3.1 Rundown templates** (P0, screen 3)
- Ship Bo1 and Bo3 templates with the segments in README §5.3.
- Segments have trigger, graphics, scene, transition, hold window (Auto / N s / Manual) and mode.

**E3.2 Triggers** (P0)
- Supported: match room opened, check-in complete, veto step, veto complete, agent select, round phase, kill and multi-kill, spike planted or defused, map end, series decided, rescheduled, forfeit, clock time, delay, hotkey, remote command, observer flag.
- Each trigger has a test fire in the web editor and in the simulator.

**E3.3 Hold windows** (P0, screens 8, 17)
- An armed automatic take shows the Next card with a countdown equal to its hold window.
- H holds (waits for Take or Skip), S skips, Space takes now. All three work from the console, phone and web.
- Holds and skips are audited with actor and time.

**E3.4 In-round rules** (P0)
- Buy phase → economy board, round end → recap N s, spike planted → spike timer, multi-kill/clutch/flawless → banner, tech pause → pause panel.
- In-round rules never switch OBS scenes unless a rule explicitly says so (e.g. tech pause → BRB).

**E3.5 Safety** (P0)
- No automatic take during tech pause or timeout, except the pause rule itself.
- OBS disconnected → autopilot paused; queued takes are dropped, not replayed later.
- Commands carry ids; duplicates are ignored.

**E3.6 Publishing** (P1)
- Publish creates a new rundown version; nodes switch at the next segment boundary.
- Nodes show which rundown version they run; the web shows nodes on an old version.

**E3.7 Rule editor** (P1, screen 3)
- When / Only if / Then with ordered actions; actions limited to node capabilities; validation inline.

### E4 · Producer console (phases P1–P2)

**E4.1 Monitors and take bar** (P0, screen 8): PVW (amber) and PGM (rose) mirror OBS; Take / Cut / Stinger with hotkeys.
**E4.2 Now / next / coming up** (P0): the current segment, the armed next action with countdown, and the next three segments.
**E4.3 Graphic layers** (P0): every graphic grouped by layer with On / Auto / Off and a hotkey. Manual override wins until the next segment.
**E4.4 Triggers pad** (P0): F1–F8 for tech pause, timeout, replay, toast, caster lower third, poll, stinger, sponsor read. Toast and poll open a small inline form.
**E4.5 Lower thirds** (P1): one-click talent and player spotlight from the show's talent list.
**E4.6 Live data strip and event log** (P0): round, phase, score, alive, banks, spike; newest-first log of game and show events.
**E4.7 Fix data** (P0, screen 13):
- Covers score, names (Riot ID → display), sides, series and observed player.
- Applies on air immediately, and the feed doesn't overwrite fixed fields until the next round.
- A map score change asks "On air only" or "Air and bracket".
- Undo last is available, and every change is audited.
**E4.8 Keyboard** (P0): the full map in README §12; rebindable; window-focused by default.

### E5 · Web: shows and setup (phase P3)

**E5.1 Create a show from a tournament** (P0, screens 19, 2): choose tournament and stages; matches become show entries; new matches join as the bracket advances.
**E5.2 HUD pack and theme** (P0): Esportra pack selection, team colours toggle, event bug, sponsor rotation, stinger.
**E5.3 Sync from the tournament** (P0): teams, logos, colours, rosters, schedule, veto steps and series score push to nodes within 5 s of a change.
**E5.4 Brand and talent** (P1): sponsors (logo, reads, rotation), casters and talent cards, per-show overrides of team display names.
**E5.5 Node assignment** (P0): assign matches to nodes; "Needs a node" blocks only that match; drag to reassign.
**E5.6 Broadcast home** (P0, screen 1): KPIs, live cards with autopilot line, auto-queued list, nodes, alerts.

### E6 · Web: live monitor (phase P3)

**E6.1 Tiles** (P0, screen 4): per live node, PGM/PVW thumbnails (2 fps via OBS screenshots), score, tally, autopilot state, feed health.
**E6.2 Remote control** (P0): Hold, Take now, Resume autopilot; node acknowledges in ≤ 300 ms; the UI shows pending until acked.
**E6.3 Node chat** (P1): ops ↔ producer messages with system events inline.
**E6.4 Show timeline** (P1): 60-minute strip with automatic takes, holds and manual takes.
**E6.5 Incidents** (P0): OBS drops, stale feed, output dropped, data fixes, with time and actor.

### E7 · Crew, links and access (phase P3)

**E7.1 Roles** (P0, screen 5): ops lead, producer, observer, crew, enforced server-side.
**E7.2 Invites** (P0): email + in-app; role per show; revoke.
**E7.3 Browser source links** (P0): per node and output, LAN / This PC / Cloud relay (relay is P2), copy and QR, tally.
**E7.4 Key rotation** (P1): rotate pushes the new key to connected sources; old links die after 60 s.
**E7.5 Co-stream links** (P1): watch-party overlay (score, series, veto), no controls, expires at series end.

### E8 · Reports and results loop (phase P4)

**E8.1 Results to the bracket** (P0, screen 6): GEP map end with a final score creates a verified map result for the Esportra match; conflicts with a reported result open the existing dispute flow instead of overwriting.
**E8.2 Show report** (P1): KPIs, sponsor time on air, VOD chapters, incidents, share cards.
**E8.3 Sponsor proof** (P1): per-sponsor minutes, placements, timestamps and thumbnails; PDF export.
**E8.4 VOD chapters** (P1): from segment and round events, YouTube-ready text.

### E9 · Offline and sync (phase P2)

**E9.1 Run offline** (P0, screen 14): with no internet, graphics, autopilot, OBS control and LAN capture continue.
**E9.2 Sync queue** (P0): results, corrections and report data persist on disk and replay in order when online.
**E9.3 Conflicts** (P1): match assignment and results conflicts show both versions with who and when; config uses last-writer-wins.

### E10 · Phone remote (phase P5)

**E10.1** (P2, screen 18): QR pairing from the console; now/next with Hold, Skip, Take now; triggers; alerts; same session as the console.

### E11 · Onboarding (phase P3)

**E11.1** (P0, screen 19): nine-step checklist with progress and resume. Every step deep-links to where it happens. Target: a new org completes it in ≤ 30 min.

---

## 10. Non-functional requirements

| Area | Requirement |
|---|---|
| **Performance** | GEP → on screen ≤ 150 ms p95 on LAN. Take ≤ 100 ms same PC. Remote take ack ≤ 300 ms. Graphics at 60 fps on a GTX 1650 / i5-9400 class streaming PC while OBS encodes 1080p60. Node CPU ≤ 5% and RAM ≤ 400 MB idle with all outputs connected |
| **Reliability** | Node crash rate < 1 per 50 show-hours. Auto-restart and resume the current segment after a crash in ≤ 10 s. No on-air blanking from any single failure (OBS link, internet, cloud, observer PC) |
| **Compatibility** | Windows 10 22H2+ and 11. OBS 28+ (obs-websocket v5). vMix 26+. Valorant observer client. Browsers for web: last 2 versions of Chrome, Edge, Firefox, Safari |
| **Scalability** | 50 concurrent live nodes at GA, 500 within a year. Hub fan-out per show ≤ 20 web viewers |
| **Security** | See §13 |
| **Accessibility** | WCAG 2.2 AA on web surfaces; keyboard-complete console; colour never the only signal |
| **Localization** | English at GA; strings externalized; Urdu-ready layout (RTL not required for GA) |
| **Observability** | Node heartbeats, structured logs (local, rotated 7 days), crash reports with consent, show event stream as metrics source |
| **Updates** | Node checks for updates when idle, never during a live show; rollback to previous version available |

---

## 11. Data model

Proposed Supabase tables (RLS on every table, default deny), or .NET-owned equivalents where the domain already lives there:

| Entity | Fields | Notes |
|---|---|---|
| `broadcast_shows` | id, organization_id, tournament_id, name, stage_ids[], hud_pack, theme jsonb, rundown_template_id, status, created_by | One per covered tournament scope |
| `broadcast_show_matches` | show_id, match_id, node_id?, starts_at, status (queued, live, done, skipped) | Created as the bracket produces matches |
| `broadcast_nodes` | id, organization_id, name, capabilities jsonb, app_version, last_seen_at, token_hash, revoked_at | Pairing via RPC only |
| `broadcast_pairing_codes` | code_hash, organization_id, expires_at, used_at | Single use, 10 min |
| `rundown_templates` | id, organization_id?, name, best_of, version, published_at | System templates have null org |
| `rundown_segments` | template_id, version, position, key, trigger jsonb, graphics jsonb, scene_key, transition jsonb, hold_seconds, mode, repeats_per_map | Immutable per version |
| `automation_rules` | id, template_id, version, segment_key?, when jsonb, only_if jsonb, actions jsonb, enabled | In-round rules attach to a segment |
| `broadcast_outputs` | node_id, kind, key_hash, rotated_at | Keys shown once |
| `broadcast_crew` | show_id, user_id, role | ops_lead, producer, observer, crew |
| `broadcast_talent` | show_id, name, role, handle | Lower thirds |
| `broadcast_sponsors` | show_id, name, logo_path, placements[], read_text, rotation_seconds | Sponsor proof joins events to these |
| `broadcast_events` | id, show_id, node_id, match_id, type, payload jsonb, actor_id?, command_id?, created_at | Append-only; source of reports and metrics |
| `broadcast_corrections` | match_id, map_number, before jsonb, after jsonb, source (producer, gep), actor_id, created_at | Feeds bracket correction records |

**Event types** (non-exhaustive): `segment.armed`, `segment.held`, `segment.skipped`, `take.auto`, `take.manual`, `trigger.fired`, `data.fixed`, `obs.disconnected`, `obs.connected`, `feed.stale`, `feed.recovered`, `output.dropped`, `result.verified`, `sponsor.onair` (start/stop), `node.offline`, `node.online`.

---

## 12. Interfaces and contracts

Detail lives in [`README.md §10`](README.md#10-data-contracts-and-backend-links). Summary:

| Interface | Contract |
|---|---|
| **Web ↔ API** | REST for CRUD on shows, templates, rules, crew, nodes; existing auth; Zod schemas shared with forms |
| **Broadcast hub** (SignalR) | `Heartbeat`, `Event`, `CommandAck` up; `ShowConfig`, `MatchContext`, `Command` down. Node-initiated connection, node token auth |
| **Node ↔ graphics** | Existing HUD room protocol (`snapshot`, `patch` with `v`, `event`, `resync`), unchanged |
| **Observer → node** | WebSocket `role=ingest` with node key; raw GEP messages; adapter runs on the node |
| **Node → OBS** | obs-websocket v5 requests and events (connect, read and build scenes, takes, transitions, replay flow, screenshots for monitor) |
| **Node → vMix** | HTTP API functions; XML state for tally |
| **Results** | Node posts `result.verified` with map number, score, Riot match id; API creates the verified map result or opens a dispute on conflict |

Versioning: hub messages carry `schema: 1`; nodes refuse newer major versions and prompt to update when idle.

---

## 13. Security, privacy and compliance

Aligned with the repo's blocking security rules (`CLAUDE.md`):

1. **Never trust the client.** Role, ownership and assignment are checked in RLS, RPCs and hub authorization. The node token only allows its org's shows and assigned matches.
2. **No service-role keys in the desktop app.** Only the node token (OS credential store) and public anon config.
3. **Output keys** are per node, hashed at rest, rotatable. Graphics are read-only (`role=overlay`). Write roles (`control`, `ingest`) need the key.
4. **Observer isolation:** capture-only can only send ingest messages; it can't issue commands.
5. **Audit:** every on-air change is an event with actor or system source.
6. **Personal data:** player Riot IDs and display names already exist in Esportra. Webcam frames are never captured by us. Crash reports are opt-in and scrubbed of tokens.
7. **Riot and Overwolf:** follow Riot's broadcast and API policies for Valorant art and data (art loads from the community API at runtime; no redistribution). GEP use per Overwolf's terms. Confirm commercial terms before paid tiers (§19).
8. **Never weaken RLS, triggers or storage policies** to make a feature work.

---

## 14. Release plan and milestones

| Phase | Content | Exit criteria | Estimate |
|---|---|---|---|
| **P0 · Node** | Desktop app with embedded HUD server and graphics, pairing, Capture only, Outputs, capture status, simulator | A paired node serves all graphics to OBS from GEP on a real observer PC; LAN latency ≤ 150 ms p95 | 3 weeks |
| **P1 · OBS control** | Connect, one-click scene build, segment → scene, takes, replays, tally, console monitors and take bar | Producer can run a Bo3 manually from the console without touching OBS | 3 weeks |
| **P2 · Autopilot** | Templates, triggers, hold windows, in-round rules, safety, Fix data, offline queue | A recorded Bo3 runs end to end on autopilot with ≥ 80% automatic takes in simulation | 3 weeks |
| **P3 · Web Broadcast** | Migrations + RLS, shows, sync, nodes, assignment, live monitor, crew, links, onboarding | A new org goes from tournament to first live show in ≤ 30 min in a moderated test | 4 weeks |
| **P4 · Loop and reports** | Results to the bracket, report, sponsor proof, VOD chapters, co-stream links | 90% of produced maps confirm results without manual entry in alpha events | 2 weeks |
| **Alpha** | Esportra-run events on 1–2 nodes | 10 shows, ≤ 1 on-air incident per 10 shows | 2 weeks (overlaps P4) |
| **Beta** | 5–10 partner organizers | Success metrics trending to targets; no P0 bugs open for 7 days | 4 weeks |
| **GA** | Public, paid tier on | Metrics in §7 tracked; support playbook ready | — |
| **P5** | Phone remote, vMix polish, multi-switcher | | 2 weeks |
| **P6** | Graphics Studio (desktop) | Separate PRD | — |

Estimates assume one desktop engineer, one full-stack engineer, part-time design and QA. They are planning guidance, not commitments.

---

## 15. Quality plan

- **Unit:** adapter (GEP shapes), rundown state machine, rule evaluation, hold/skip/take logic, conflict resolution (Vitest, existing tests extended).
- **Integration:** node ↔ OBS against a real OBS in CI (Windows runner), node ↔ hub with a test hub, results loop against a staging API.
- **Simulation:** recorded matches replayed at speed through autopilot; assert segment order, scene changes and hold behaviour.
- **Chaos:** kill OBS, drop internet, stop observer PC, close a source mid-show; assert no blanking and correct alerts.
- **Security:** RLS tests as non-admin (other org, crew, observer), token revocation, key rotation, command spoofing.
- **Performance:** latency harness from GEP ingest to frame paint; CPU and RAM on the reference PC during 1080p60 encode.
- **Acceptance:** each epic's criteria above, verified with evidence by QA before phase exit.
- **Test matrix:** Windows 10/11 × OBS 28/30/31 × Studio Mode on/off × single-PC / two-PC × vMix 26/27.

---

## 16. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Riot policy limits commercial use of art or data | Medium | High | Legal review before paid tier; art loaded at runtime, not redistributed; fallback to text-only graphics |
| Overwolf review slows releases | Medium | Medium | Decide distribution early (§19); keep capture a thin module so most code ships outside it |
| GEP gaps or changes (no round timer, limited health) | High | Medium | Fallback rules already designed; adapter covered by recorded-message tests; monitor Overwolf changelogs |
| OBS version differences | Medium | Medium | Target obs-websocket v5 only; test matrix; graceful capability detection |
| Venue networks block LAN traffic between PCs | Medium | Medium | Single-PC mode; diagnostics on Capture screen; documented firewall rule |
| Producers distrust autopilot | Medium | High | Hold windows everywhere, Manual segments, simulator rehearsal, visible audit |
| Scope creep into a full production suite | High | Medium | Non-goals in §6.3; Studio as separate PRD |
| Single engineer bottleneck on desktop | Medium | High | P0 reuses the existing HUD; hire or contract a second desktop engineer before P2 |

---

## 17. Packaging and pricing hypotheses

To validate in beta; not decided.

| Tier | For | Includes |
|---|---|---|
| **Free** | Community tournaments | 1 node, Esportra pack, autopilot with manual-default rundown, Esportra watermark on holding screens |
| **Pro** | Organizers who stream weekly | 4 nodes, full autopilot, sponsor proof, VOD chapters, co-stream links, no watermark |
| **Event** | One-off big events | Unlimited nodes for 7 days, priority support, custom theme setup |

Hypothesis: sponsor proof and hands-free autopilot are the paid triggers; nodes are the volume lever.

---

## 18. Decisions log

| # | Decision | Why | Date |
|---|---|---|---|
| D1 | **Hybrid architecture:** desktop production node + web Broadcast section | GEP and OBS are local; the show must survive internet drops; ops and monitoring belong on the web | 3 Oct 2026 |
| D2 | OBS/vMix control via obs-websocket v5 / vMix HTTP API from the node, not webhooks or the web | OBS exposes a local WebSocket; the cloud can't reach venue LANs reliably | 3 Oct 2026 |
| D3 | **Autopilot with hold windows** as the core interaction | Industry automates blindly; producers need to trust and stop it | 3 Oct 2026 |
| D4 | Rounds never switch scenes; graphics update inside the in-game HUD | Fewer OBS changes, failures stay harmless | 3 Oct 2026 |
| D5 | Reuse the existing HUD graphics, room server and adapter unchanged inside the node | Fastest path; already tested | 3 Oct 2026 |
| D6 | **Graphics Studio deferred** to a desktop phase (Compositor as UX reference) | Better as a desktop app; not needed for automation value | 3 Oct 2026 |
| D7 | Rose = on air only; amber = cued/hold | Interface must tell the truth about what viewers see | 3 Oct 2026 |
| D8 | Esportra theme kept alongside old OBS overlay themes on `/debug/riot` | Test the new design without breaking existing setups | 3 Oct 2026 |

---

## 19. Open questions

| # | Question | Blocks | Owner |
|---|---|---|---|
| Q1 | Distribute the node through Overwolf (ow-electron app review) or as a signed installer with GEP support? | P0 packaging | CTO |
| Q2 | Riot terms for commercial broadcast use of Valorant art and GEP data in paid tiers | Paid launch | CEO / legal |
| Q3 | Supabase tables vs .NET-owned domain for broadcast data (the API already owns tournaments) | P3 migrations | CTO + database lead |
| Q4 | Cloud relay for remote productions at GA, or later? | E7.3 scope | CPO |
| Q5 | Is the phone remote needed at GA for floor producers? | P5 timing | CPO |
| Q6 | Which partner organizers join beta? | Beta | COO |
| Q7 | Pricing tiers and node limits | GA | CFO |

---

## 20. What's next

**Immediately (this week):**
1. CEO review of this PRD and the 19 screens; approve scope (§6) and phases (§14).
2. Answer Q1 and Q3; they shape P0 and P3.
3. Promote the share-card and overlay work on `staging` to production after a look on staging (already pending).

**P0 kickoff (next 3 weeks), in order:**
1. Create the desktop app shell in `esportra-desktop` (ow-electron) with sign-in and pairing (E1.1).
2. Embed `server/server.js`, `overlays/` and `core/` from `esportra-valorant-hud`; serve them per node with output keys (E1.2).
3. Port `adapters/valorant-gep.js` and the capture starter into Capture only mode with LAN ingest (E1.3).
4. Build the Capture and Outputs screens from pictures 10–12 (E1.4).
5. Simulator from ndjson logs (E1.5).
6. Exit test on a real observer PC + OBS (latency, stability).

**Parallel (web, low risk):** draft migrations and RLS for `broadcast_nodes`, `broadcast_pairing_codes`, `broadcast_shows`; review with the database and security leads before P3.

---

## 21. Glossary

| Term | Meaning |
|---|---|
| **Node** | A paired production PC running the Esportra Broadcast desktop app |
| **Show** | A tournament (or stages of it) covered with one look and rundown |
| **Rundown** | Ordered segments for a match type (Bo1, Bo3) |
| **Segment** | A part of the show with its trigger, graphics, scene, transition and hold window |
| **Rule** | When + Only if + Then actions; in-round rules run inside a segment |
| **Hold window** | Countdown before an automatic take, during which anyone can hold or skip |
| **Autopilot** | The node running segments and rules on its own |
| **PVW / PGM** | Preview (next) and Program (on air), as in OBS Studio Mode or vMix |
| **Tally** | Indicator of what is on air (rose) or in preview (amber) |
| **GEP** | Overwolf Game Events Provider: Valorant game data available to apps on the same PC |
| **Capture only** | Desktop app mode on the observer PC that only sends game data |
| **Browser source** | A web page added to OBS/vMix as a video source |
| **obs-websocket** | OBS's built-in remote-control WebSocket server (v5, OBS 28+) |

---

## 22. Appendix: related work shipped this cycle

Production (`main`) and staging (`staging`), newest first:

| Commit | Change | Env |
|---|---|---|
| `9f8679af` | Esportra Broadcast screens (web, desktop node, system) | staging |
| `3a3f2830` | Broadcast design kit and first web screens | staging |
| `82d4dd76` | Broadcast redesign of match and player share cards | staging |
| `5794c800` | Esportra theme for the Riot OBS overlay | staging |
| `1bb540d5` | Share cards for captains and organizers; tournament card image fix; Riot match id hidden in bracket results | staging |
| `04153519` | Riot stats window performance (cached catalogs, cheaper effects) | production |
| `fd09fb2b` | Full-height public bracket; full Riot match stats restored | production |
| `e01ad451` | Tournament card hover fix and compact card | production |
| `95827e4a` | One tournament card for browse, manage and profiles | production |
| `e22b68f8`, `4315f0be` | Notifications redesign | production |
