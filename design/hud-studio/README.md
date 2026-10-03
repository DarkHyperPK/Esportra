# Esportra Broadcast: UI/UX recipe and ingredients

The HUD tool, grown from `esportra-valorant-hud` into a product: a **tournament-driven broadcast system**. Every match on an Esportra schedule becomes a show. The show runs itself on a production PC next to OBS or vMix, the graphics follow the game on their own, and people step in only when a judgment call is needed.

- **Pictures** (this folder) are the UI/UX: every screen, state and interaction is drawn. Numbered white squares on each picture are explained in [§7](#7-screen-by-screen).
- **This document** is the recipe and the ingredients: what each part does, how it behaves, how it moves, and how it connects to the backend.
- Editable sources: `design/source/hud/*.mjs` (kit: `design/source/hud-kit.mjs`). Rebuild with `node design/source/build.mjs hud`.
- Graphics Studio (designing your own HUDs) is **deferred** to a later desktop phase ([§13](#13-build-order)).

Sample teams and people are fictional. Monitors and thumbnails show the HUD's own demo renders.

---

## Contents

1. [The pictures](#1-the-pictures)
2. [Product, people and permissions](#2-product-people-and-permissions)
3. [Industry today, and how we are better](#3-industry-today-and-how-we-are-better)
4. [Architecture: web plans, the desktop node runs the show](#4-architecture)
5. [User flow, end to end](#5-user-flow-end-to-end)
6. [Design direction and tokens](#6-design-direction-and-tokens)
7. [Screen by screen](#7-screen-by-screen)
8. [Motion](#8-motion)
9. [Automation model](#9-automation-model)
10. [Data, contracts and backend links](#10-data-contracts-and-backend-links)
11. [Reliability and performance budgets](#11-reliability-and-performance-budgets)
12. [Accessibility and keyboard](#12-accessibility-and-keyboard)
13. [Build order](#13-build-order)
14. [Open questions](#14-open-questions)

---

## 1. The pictures

| # | Picture | Surface | What it shows |
|---|---|---|---|
| 1 | [`web-01-home.png`](web-01-home.png) | Web | Tonight's shows, live matches with autopilot state, queue built from the schedule, nodes, alerts |
| 2 | [`web-02-show-setup.png`](web-02-show-setup.png) | Web | Show setup step 2: HUD pack, theme, teams synced from the tournament, what the crew gets |
| 3 | [`web-03-rundown.png`](web-03-rundown.png) | Web | Rundown segments driven by tournament state; rule editor with hold window and test fire |
| 4 | [`web-04-live-monitor.png`](web-04-live-monitor.png) | Web | Every node on air, remote hold/take, node chat, incidents, show timeline |
| 5 | [`web-05-crew-links.png`](web-05-crew-links.png) | Web | Crew and roles, browser sources with OBS tally, one-click scene build, co-stream links |
| 6 | [`web-06-report.png`](web-06-report.png) | Web | Post-show report: automation stats, sponsor proof, VOD chapters, results to the bracket |
| 7 | [`desk-07-pair-readiness.png`](desk-07-pair-readiness.png) | Desktop | Pairing, show and match, readiness checklist, what autopilot does next |
| 8 | [`desk-08-console.png`](desk-08-console.png) | Desktop | Producer console: PVW/PGM, Take, autopilot now/next with hold, layers, triggers, live data |
| 9 | [`desk-09-scenes.png`](desk-09-scenes.png) | Desktop | OBS/vMix connection, scenes built by Esportra, segment → scene map, transitions, replays |
| 10 | [`desk-10-capture.png`](desk-10-capture.png) | Desktop | GEP features and freshness, fallbacks, player PCs, live state, simulator |
| 11 | [`desk-11-observer.png`](desk-11-observer.png) | Desktop | Observer PC in capture-only mode |
| 12 | [`desk-12-outputs.png`](desk-12-outputs.png) | Desktop | Browser sources served by the node, connections, manual add steps |
| 13 | [`desk-13-data-fix.png`](desk-13-data-fix.png) | Desktop | Fix data drawer with bracket correction and history |
| 14 | [`desk-14-offline-sync.png`](desk-14-offline-sync.png) | Desktop | Offline mode, sync queue, conflict resolver |
| 15 | [`sys-15-how-it-works.png`](sys-15-how-it-works.png) | System | Architecture and a match start to finish across Esportra, node, OBS and screen |
| 16 | [`sys-16-states.png`](sys-16-states.png) | System | Failure, empty and loading states |
| 17 | [`sys-17-components-motion.png`](sys-17-components-motion.png) | System | Controls in every state, tally, monitors, countdown, take, easing |
| 18 | [`sys-18-phone-remote.png`](sys-18-phone-remote.png) | System | Phone remote for the floor producer |
| 19 | [`sys-19-onboarding.png`](sys-19-onboarding.png) | System | Nine-step setup checklist |

---

## 2. Product, people and permissions

**The promise:** link a tournament, pair a PC, add five browser sources in OBS once. From then on every match produces itself, and your crew only steps in for the moments that need a person.

| Role | Where they work | Can do | Cannot do |
|---|---|---|---|
| **Ops lead** | Web (any device) | Create shows, edit rundowns and rules, assign nodes, see every node, remote hold/take, read reports | Change OBS settings on a node's PC |
| **Producer** | Desktop console on the production PC, phone remote, or web live monitor (one node) | Hold, skip, take, fire triggers, fix data, pause or resume autopilot | Edit rules for the whole show (proposes a change instead) |
| **Observer** | Observer PC, capture-only app | Send game data, mark replays, flag moments | Anything that changes what is on air |
| **Crew** | Sources page (web or desktop Outputs) | Copy browser-source URLs, run connection checks, test pattern | Controls of any kind |
| **Talent** (casters) | None (managed by producer) | Appear on lower thirds and the casters scene | - |

Permissions are enforced on the server (RLS and hub authorization), never by hiding buttons ([§10](#10-data-contracts-and-backend-links)).

---

## 3. Industry today, and how we are better

**What exists (October 2026):**

| Tool | Model | Strengths | Gaps we exploit |
|---|---|---|---|
| **LHM.gg** (Lexogrine HUD Manager) | Desktop app plus cloud storage | OBS/vMix integration, automatic replay scene at round end, claims about 80% automation; Scout AI observer and auto replays for CS2/Dota 2; Valorant HUDs | Teams and matches are set up inside LHM; the tournament lives elsewhere. Valorant automation lags CS2. One production at a time |
| **Singular.live** | Cloud graphics | Remote operation, data integration, broadcast-grade | Not game-aware; needs data plumbing per show |
| **NodeCG** (+ obs-websocket) | Open-source framework | Flexible browser graphics, OBS control | A developer tool; every show is a project |
| **SuperConductor** | Rundown and playout controller | Timeline control of OBS, vMix, ATEM, CasparCG | No game data, no tournament |
| **Community Valorant tools** (RCVolus observer tool, Spectra, Overwolf observer bridges) | Observer-PC agent + HTML overlays | Free, VCT-like looks | No automation, no ops, fragile setup |

**Where Esportra is better** (each is a design commitment visible in the pictures):

1. **Tournament-native, zero setup.** Teams, logos, rosters, schedule, veto and series score already live in Esportra. A show is created from a tournament, and new matches join as the bracket advances (pictures 1, 2).
2. **The loop closes.** GEP's final score confirms the map result back into the bracket, and corrections are recorded with their source (pictures 6, 13).
3. **Autopilot with a human hold.** Every automatic take can carry a hold window: a visible countdown anyone can stop. Safer than blind automation, faster than manual (pictures 3, 8, 17).
4. **Rundowns follow tournament state**, not a clock: check-in, veto, agent select, round phase and map end drive the show (pictures 3, 15).
5. **Many matches at once.** Parallel nodes, one live monitor, auto-queued matches, co-stream links for teams and creators (pictures 1, 4, 5).
6. **LAN-first and low-bandwidth.** The node runs the show without internet and syncs later (picture 14).
7. **Proof and payoff after the show.** Sponsor time on air, VOD chapters from round events, share cards (picture 6).

Sources: [LHM.gg broadcast and overlay management](https://lhm.gg/features/broadcast-tournament-and-overlay-management), [LHM.gg Valorant guide](https://lhm.gg/blog/how-to-host-a-valorant-tournament-with-pro-grade-valorant-huds-and-valorant-overlays), [LHM CS2 features](https://www.lhm.gg/features/multiple-game-support/cs2), [LHM CS2 replays](https://guide.lhm.gg/docs/lhm-basics/cs2-replays/), [NodeCG overview](https://www.ozdyckproductions.com/blog/streaming-graphics-nodecg), [awesome-nodecg](https://github.com/nodecg/awesome-nodecg), [EBU awesome-broadcasting (SuperConductor)](https://github.com/ebu/awesome-broadcasting), [Singular.live comparison](https://quadraviz.com/compare/singular-live), [RCVolus valorant-observer-tool](https://github.com/RCVolus/valorant-observer-tool), [Overwolf observer bridge example](https://github.com/officialzodiacarena-a11y/zodiacleaguetournaments/pull/34).

---

## 4. Architecture

Picture 15 is the diagram. In one sentence: **the web plans and watches; the desktop node runs the show next to OBS; OBS only switches scenes, and the graphics inside each scene follow the match by themselves.**

### 4.1 What runs where

| Part | Runs on | Made of | Job |
|---|---|---|---|
| **Esportra web → Broadcast** | Cloud, any browser | Existing React app (`/organizer/broadcast/...`) + .NET API + SignalR | Shows, rundowns, rules, nodes, crew, live monitor, reports |
| **Broadcast hub** | Cloud | SignalR hub (new `BroadcastHub`) | Config down to nodes, status and events up, remote commands |
| **Production node** | Streaming PC (Windows) | Esportra Broadcast desktop app (ow-electron, alongside `esportra-desktop`) | Show runner + autopilot, local HUD server, OBS/vMix controller, producer console, offline queue |
| **Local HUD server** | Inside the node | The existing `server/server.js` (rooms, snapshot + JSON merge patch, event log, HTTP API) | Serves the 45 graphics as browser sources and pushes state to them |
| **Graphics** | Inside OBS as browser sources | The existing `overlays/*.html` + `core/hud.js` | Render state; show and hide their own parts |
| **Observer capture** | Observer PC | Same desktop app in **Capture only** mode, using `adapters/valorant-gep.js` | Read GEP next to the game, send it to the node over LAN |
| **OBS / vMix** | Streaming PC or LAN | Unchanged | Mix, encode, stream; obey scene commands |

### 4.2 Who talks to whom

| From → To | Channel | Carries |
|---|---|---|
| Web ↔ cloud | REST + SignalR (existing patterns) | Show config, monitor data |
| Cloud ↔ node | SignalR client **initiated by the node** (outbound only, works behind venue NAT) | Down: show config, match context (teams, logos, veto, series), remote commands. Up: heartbeat, tally, autopilot state, events, results |
| Observer → node | WebSocket on the LAN (`role=ingest`, node key) | Raw GEP messages; the node runs the adapter |
| Node → graphics | The existing HUD protocol over `ws://host:5300/ws?match=…&role=overlay` | `snapshot`, `patch` (with version `v`), `event` |
| Node → OBS | **obs-websocket v5** (built into OBS 28+, default port 4455, password auth) | Scene switches, transitions, replay buffer, scene building; OBS events back for tally |
| Node → vMix | vMix HTTP API (default port 8088) | Inputs to preview/program, transitions, stingers, overlays; XML state for tally |

### 4.3 Why not webhooks, and why not control OBS from the web

OBS doesn't receive webhooks. It exposes a WebSocket server on the PC it runs on. A cloud page can't reliably reach that (NAT, firewalls, venue Wi-Fi), and the show would stop when the internet drops. So the **node**, on the same PC or LAN as OBS, holds the obs-websocket connection. A remote **Take** from the web goes cloud → node → OBS.

### 4.4 Two layers of control

| Layer | Example | Controlled by | OBS involved? |
|---|---|---|---|
| **Inside a graphic** | Economy board in buy phase, killfeed, ace banner, spike timer | HUD state from the node | **No.** The page shows its own parts |
| **Which scene is on air** | Holding → Fullscreen intro → Gameplay → Replay → Fullscreen result | Node via obs-websocket / vMix API | Yes, a handful of times per map |

Rounds never switch scenes. That keeps OBS calm and makes most failures harmless: if OBS control drops, the graphics keep updating.

---

## 5. User flow, end to end

### 5.1 Before the event: web, once per tournament (pictures 19, 2, 3, 5)

1. **Broadcast → Get started.** Link the tournament. Its matches become shows; future matches join as the bracket advances.
2. **Choose the look.** Pick a HUD pack (the 45 Esportra graphics today; custom packs later from Graphics Studio). Team colours and logos come from team profiles.
3. **Rundown.** Start from the Bo1 or Bo3 template. Each segment says what starts it, which graphics show, which OBS scene, and its hold window. Adjust rules if needed, test-fire on the simulator.
4. **Brand & talent.** Sponsors (rotation, reads), casters (names for lower thirds), event bug.
5. **Nodes & crew.** Assign matches to production PCs, invite producer, observer, crew.

### 5.2 Production PC setup: once per machine, about 5 minutes (pictures 7, 9, 12, 11)

1. Install **Esportra Broadcast** on the streaming PC, sign in. The app shows a pairing code; enter it on the web (or scan the QR). The PC now appears as a node.
2. In OBS: **Tools → WebSocket Server Settings → Enable**. The app finds OBS on the same PC automatically; for a LAN OBS, paste IP and password once.
3. **Build scenes (one click).** The app creates *Holding, Gameplay, Fullscreen, Replay, Casters* in OBS, puts the right Esportra browser sources in each (1920×1080, "shutdown when not visible" off), and leaves labelled slots for the crew's own sources: game feed (NDI or capture) and caster cameras. Crews with existing scenes skip this and map their scene names on the Scenes screen instead.
4. **Observer PC:** install the same app, choose **Capture only**, pick the production PC. It reads GEP from the Valorant observer client and sends it over the LAN. On a single-PC setup, capture runs on the node itself.
5. **Readiness** (picture 7) turns green: Esportra, show and match, game data, OBS, scenes, browser sources, talent, internet. Any red row has a one-click fix ("Add for me").

### 5.3 Show day: what happens on its own (pictures 8, 15)

| Moment | Node does | OBS shows | On screen |
|---|---|---|---|
| Match room opens (T−15) | Loads match context from Esportra | **Holding** | Starting soon with countdown and teams |
| Both teams checked in | Hold 5 s on the console, then stinger | **Fullscreen** | Match intro |
| Veto running on Esportra | Feeds bans and picks live | Fullscreen | Map veto |
| GEP: agent select | Updates graphic | Fullscreen | Agent select |
| GEP: round live | Stinger | **Gameplay** | Game feed + in-game HUD |
| Each round | No scene changes. Rules show economy in buy phase, recap at round end, spike timer, banners | Gameplay | Inside the HUD |
| Replay (observer F9 or producer F3) | `SaveReplayBuffer` → load clip → Replay scene → back on clip end | **Replay** | Replay bug |
| Tech pause | Hold 3 s, then pause panel (or BRB scene per rule) | Gameplay or BRB | Pause panel |
| Map ends | Hold 5 s, stinger | Fullscreen | Map result, then series |
| Series ends | Manual by default (casters often want the desk) | Fullscreen or Casters | Champion or next match |
| Bracket advances | Queues the next match on this node | Holding | New countdown |

The GEP final score confirms the map result into the bracket; a verified badge appears on the web.

### 5.4 What people do during the show

- **Producer:** watches PVW/PGM and the **Next** card. If autopilot is about to do something wrong, **Hold** (H). To jump ahead, **Take now** (Space). One-off moments: caster lower third, toast, poll, sponsor read, replay. Wrong data: **Fix data**.
- **Ops lead:** live monitor across nodes, node chat, remote hold/take, moves matches between nodes if one fails.
- **Crew:** keeps OBS running; never touches HUD data.
- **Observer:** observes; F9 marks a replay, F10 flags a moment for the producer.

### 5.5 After the show (picture 6)

The report builds itself when the series ends: time on air, automatic vs manual takes, incidents, sponsor time on air (exportable proof), VOD chapters (copy to YouTube), results sent to the bracket, share cards.

### 5.6 When things go wrong (pictures 16, 14)

| Failure | Behaviour | The one action |
|---|---|---|
| OBS disconnects | Autopilot pauses on that node; graphics keep updating; alert on console, phone and web | **Resume autopilot** on reconnect |
| GEP feed stale (no events for 10 s during a live round) | Live stats freeze with a small "feed paused" tag | Check observer PC, or switch to manual score |
| Output dropped | Card turns red on Outputs and web | Open in OBS (usually "shutdown when not visible") |
| Node offline | Web shows last seen and its next match | Move the match to another node |
| Internet drops | Nothing on air changes; sync queue fills on disk | None; resolve conflicts when back |
| Match rescheduled | Rundown and countdown shift | None |
| Forfeit | Skip to result with forfeit label, then next match | Hold to keep casters on the desk |

---

## 6. Design direction and tokens

**Direction:** Command Console (dense, calm, tabular, fast) inside Esportra's Broadcast chrome. Product surfaces vary density, not identity. The design-recipe Direction Contract for this surface:

| Decision | Value |
|---|---|
| Ground | Stage black `#09090B`, panels `#111114`, hairlines `rgba(255,255,255,.07)` |
| Type | Poppins 800 for titles and hero numbers; Inter for UI text; JetBrains Mono for captions, timecodes, URLs, hotkeys |
| Corners | Square everywhere (only dots and phone frames are round) |
| **Rose `#F43F5E`** | **Means ON AIR / PGM / live, and nothing else.** Program monitor ring, ON AIR tally, Take button, live count in the nav |
| **Amber `#FBBF24`** | Cued, preview, hold window, automatic-next. PVW ring, hold countdown, Auto chips |
| White | The action and selection: primary buttons, active nav, selected segment, toggles on |
| Green / amber / red | Health only: connected, attention, broken |
| Team colour | Only inside team frames (crests, team swatches) |
| Density | 34–40 px rows, 13–13.5 px body, 9.5–11 px mono captions |
| Spacing rhythm | 14 / 16 / 22 / 24 px between groups; panels breathe more than rows |

**Copy voice:** plain, present tense, says what happens next. "Autopilot cuts to Holding when the match room opens." Never "Error 502". Every alert says what happened, what still works, and the one thing to do.

---

## 7. Screen by screen

For each screen: purpose, the numbered callouts on the picture, states, and interactions. Shared interaction rules (all screens):

- **Hover:** rows lighten to `rgba(255,255,255,.04)`; secondary buttons raise their border to 35% white; primary buttons dim to `#E4E4E7`; Take deepens to `#E11D48`. 120 ms colour transition. No movement on hover.
- **Press:** 1 px down shift, darker fill, 60 ms.
- **Focus:** 2 px white ring outside a 2 px stage gap. Never rose.
- **Disabled:** 35% opacity, no hover, tooltip says why.
- **Copy buttons** swap their icon to a check for 1.2 s and announce "Copied".
- **Live values** (scores, latency, timers) never animate their digits except countdowns; changes flash the cell background for 400 ms.

### 7.1 Web · Broadcast home (picture 1)

Purpose: what's on tonight, what needs a person.

1. **KPI strip:** live now, queued today, nodes (with attention dot), hands-free %, sponsor time on air. Each tile links to its detail (live monitor, rundowns, nodes, reports).
2. **Autopilot line on each live card:** "next Round recap in 0:04". Clicking opens the live monitor focused on that node. The countdown mirrors the node's hold window.
3. **Up next:** auto-queued from the schedule, sorted by start time. Status chips: Ready, Rescheduled, Waiting on result (depends on a previous series), Needs a node (red, the only blocker).
4. **Production nodes:** each with capabilities (GEP, OBS/vMix, feeds) and state. "Pair a node" opens the pairing dialog.
5. **Alerts:** newest first, tone-coded, time-stamped. Clicking jumps to the cause. Resolved alerts fade to the incidents log after 10 min.

States: empty (no shows, see picture 16), loading (skeleton cards), node offline (card red, alert pinned).

### 7.2 Web · Show setup (picture 2)

1. **Step rail:** Tournament ✓ → HUD pack → Brand & talent → Nodes & crew. Coverage summary says which stages and how many matches are included, and that new matches join automatically.
2. **HUD pack picker:** Esportra packs / My packs / Studio (soon). Cards preview the pack's in-game graphic; selected card gets the amber PVW ring and a "Selected" chip (amber = "this will go on air", not live yet).
3. **Synced from the tournament:** teams, logos, colours, rosters with a Live sync chip. Team edits update graphics within seconds; overrides live in Brand & talent.
4. **What your crew gets:** the browser sources this pack creates per node. Sets expectations before anyone opens OBS.
5. **Footer:** Back, Preview on a node (runs the simulator on a paired node), Continue.

Interactions: changing the pack updates the preview everywhere; theme toggles apply instantly in the preview. Validation is inline and never blocks Back.

### 7.3 Web · Rundown and rules (picture 3)

1. **Segments:** drag handle (reorder; locked segments can't move above prerequisites), trigger line, graphics thumbnails, OBS scene chip, hold window, auto/manual toggle. `5×` marks a segment that repeats per map. Selected segment has the white left bar.
2. **Rule drawer:** When (trigger), Only if (conditions), Then (ordered actions: OBS, vMix, graphic, sponsor, wait). "+ Add action" lists only actions the assigned nodes support.
3. **Hold window:** Auto / Hold N s / Manual. Copy under it explains exactly what the producer will see.
4. **In-round rules:** run inside "Map · live rounds" without scene changes.

Interactions: test fire runs the rule on a node's simulator and reports each action's result and timing. **Publish to nodes** pushes a new rundown version; nodes switch at the next segment boundary, never mid-segment. Unpublished changes show a "Draft" chip.

### 7.4 Web · Live monitor (picture 4)

1. **Tile:** teams, ON AIR tally, PGM (rose ring) and PVW (amber ring) mirrored from OBS at 2 fps (thumbnails, not video), score and map.
2. **Autopilot bar:** next action with countdown; **Hold** and **Take now** send remote commands (the node acknowledges in under 300 ms; the button shows a spinner until then).
3. **Paused tile:** amber outline, the reason, and **Resume autopilot**.
4. **Node chat:** messages between ops and the node's producer; system messages (holds, takes) appear inline.
5. **Starting next:** queue with node assignment; a red outline marks a match with no node.
6. **Show timeline:** last 60 min of segments with markers for automatic takes (grey), holds (amber), manual takes (white). Hover a marker for who and why.

Grid / Focus toggle: Focus shows one node large with its full event log.

### 7.5 Web · Crew and links (picture 5)

1. **Crew table** with roles and status; Invite sends an email and an in-app invite.
2. **Studio crew** can be a device, not a person: a sources-only link for the OBS PC.
3. **Co-stream links:** watch-party overlay (score, series, veto) for teams and creators; expires at series end.
4. **Browser sources:** per node, LAN / This PC / Cloud relay URLs with a key. Tally per source: ON AIR, In OBS (connected), Not added.
5. **Let the app build your OBS scenes** (recommended) or the manual guide. Rotating the key updates every connected source without re-pasting (sources reconnect with the new key pushed over their live socket).

### 7.6 Web · Post-show report (picture 6)

1. **KPIs:** on air, automatic takes, holds and manual, incidents, median GEP latency.
2. **Sponsor time on air:** minutes per sponsor with placements; Export sponsor proof (PDF with timestamps and thumbnails).
3. **VOD chapters:** built from segment and round events; Copy for YouTube.
4. **Results sent to the bracket:** map scores verified from Riot; series outcome and what it unlocked; share cards.
5. **Incidents and overrides:** time, node, what happened, who, impact.

### 7.7 Desktop · Pair and readiness (picture 7)

1. **This PC:** node name, owner org, pairing code for another PC (expires in 10 min).
2. **Show and match:** Auto follows the rundown's assignment; manual pick is for covering another node.
3. **Readiness checklist:** eight rows, each with state and detail. Rows recheck every 2 s.
4. **One-click fixes** on failing rows (e.g. "Add for me" creates the missing browser source in OBS).
5. **Start autopilot** (primary) or **Run manually**.
6. **What autopilot does next:** the next five segments with their triggers, so the producer knows what will happen before pressing Start.

### 7.8 Desktop · Producer console (picture 8)

The heart of show day. Everything is reachable by keyboard.

1. **PVW** (amber): what the next take will put on air. Autopilot loads PVW first when OBS Studio Mode is on.
2. **Take / Cut / Stinger:** Take uses the segment's transition; Cut and Stinger force one. **Space** takes.
3. **Next card:** trigger, action, countdown ring. **H** holds (ring freezes, card shows "Held by Ayesha", autopilot waits for Take or Skip), **S** skips, Take takes now.
4. **Coming up:** the following segments.
5. **Graphic layers:** In-game, Between rounds, Full screen. Each row: state (On = rose outline, Auto = amber, Off) and hotkey. Clicking toggles manual on/off; Auto rows are controlled by rules until the producer overrides them, then show "Manual" until the next segment.
6. **Triggers:** tech pause (amber because it changes the show's state), timeout, replay, toast, caster lower third, poll, stinger, sponsor read. F1–F8.
7. **Live data strip** and **Fix data** (picture 13).
8. **Event log:** kills, plants, holds, takes, round results; newest on top.

Lower thirds (right column) are one click for talent and player spotlight.

### 7.9 Desktop · Scenes (picture 9)

1. **Connection:** OBS version, address, Studio Mode, scene collection, what we control.
2. **Scenes built by Esportra:** tree of scenes and their sources. Slots needing your sources are amber ("Add your source"); the app detects when the crew adds them (`InputCreated` / scene item events) and the slot turns into the real source name.
3. **Composition and layer order** of the selected scene, plus the warning strip for open slots.
4. **Segment → scene:** dropdowns list scenes read live from OBS (`GetSceneList`).
5. **Transitions and replays:** stinger file and cut point, replay buffer length; test buttons run against OBS without changing the program scene (they use preview).

More switchers: link several OBS instances or vMix; each segment can target one.

### 7.10 Desktop · Capture (picture 10)

1. **Source KPIs:** observer PC, latency, messages per second, gaps (resyncs).
2. **GEP features:** what the game sends, status (Live or Covered), freshness, 60 s activity bars.
3. **Player PCs (optional):** exact health and ability charges when installed on player PCs.
4. **Live state:** the current HUD state version and key fields.
5. **Simulate:** recorded match (`.ndjson` from the HUD server's event log) or scripted round; drives graphics and autopilot; OBS switching only if allowed.
6. **Fallback rules** for fields GEP doesn't provide (spike timer from the plant event, round timer counted locally, unobserved health hidden).

### 7.11 Desktop · Observer capture-only (picture 11)

1. **Sending status** with destination and latency (green square, never rose: it isn't on air).
2. **Valorant, GEP, messages sent.**
3. **Hotkeys:** F9 mark replay, F10 flag a moment, Ctrl+Shift+P pause sending.
4. **Pause sending** and **Change production PC**. No show controls exist in this mode by design.

### 7.12 Desktop · Outputs (picture 12)

1. **Every browser source** this node serves, with live preview.
2. **This PC / LAN / Cloud relay** address modes (cloud relay is for remote production where OBS isn't on the venue LAN).
3. **Output cards:** tally, connections, URL with copy, resolution, frame health. Two connections usually mean the source sits in two scenes.
4. **Manual add steps** for crews skipping the one-click build.

### 7.13 Desktop · Fix data (picture 13)

1. **Apply semantics:** changes go on air on Apply; the feed won't overwrite a fixed field until the next round.
2. **Score** steppers.
3. **Names on screen:** Riot ID → display name (saved per player for the whole tournament).
4. **Bracket prompt** whenever a map score changes: On air only, or Air and bracket (records a correction with the producer as source).
5. **History** with Undo last.

The console stays visible behind the drawer so the producer sees the fix land.

### 7.14 Desktop · Offline and sync (picture 14)

1. **Offline banner:** duration, reassurance, retry timer.
2. **Waiting to sync:** queued results, corrections, report data; persisted to disk.
3. **What still works offline** vs what doesn't.
4. **Conflict resolver:** shows both versions with who and when; one choice per conflict.
5. **Connection history.**

### 7.15–7.19 System boards (pictures 15–19)

- **How it works (15):** the architecture and a match start to finish in four lanes: Esportra, node autopilot, OBS scene, on screen. Rose marks the live Gameplay scene; amber marks hold windows.
- **States (16):** eight designed states with what happened, what still works, and the action.
- **Components and motion (17):** see §8.
- **Phone remote (18):** opens from a QR on the desktop app; same session as the console. Now/next with Hold, Skip, Take now (56 px targets); triggers grid; alerts with Resume autopilot.
- **Onboarding (19):**
  1. Nine-step checklist; the current step is highlighted with its input inline.
  2. Pairing code entry on step 4.
  3. Progress and time left; you can stop any time and resume where you left off.

---

## 8. Motion

**Rule zero:** motion marks a change of state, never decoration. The HUD's own rule applies to the app too: animations fire on **state transitions** (a version change), so a screen that reloads mid-show returns in the right state without replaying old animations.

| Token | Duration | Easing | Used for |
|---|---|---|---|
| `enter` | 180 ms | `cubic-bezier(.2,0,0,1)` | Drawers, menus, new rows |
| `exit` | 120 ms | `cubic-bezier(.4,0,1,1)` | Closing, removing |
| `alert-in` | 240 ms | `cubic-bezier(.3,0,0,1)` | Alerts slide 12 px from the top edge + fade |
| `flash` | 400 ms | linear | Live value changed (background tint fades out) |
| `hover` | 120 ms | linear | Colour only |
| `press` | 60 ms | linear | 1 px shift |

**Choreography:**

- **Hold countdown:** the amber ring drains linearly over the hold window, number steps each second. At zero the ring turns rose for 200 ms and the take happens. Hold freezes the ring and the card shows who held it.
- **Take (PVW → PGM):** the console mirrors OBS events (`SceneTransitionStarted` → `CurrentProgramSceneChanged`); it never animates a take OBS didn't make. With a stinger, the PGM monitor switches at the stinger's cut point (600 ms).
- **Tally change:** chip swaps instantly (no fade). Tally must never lag what's on air.
- **Lists that update live** (event log, alerts): new item enters at the top with `enter`; others shift without animation to avoid motion sickness during busy rounds.
- **Reduced motion:** rings become a number, wipes become cuts, slide-ins become fades, flashes become a static dot for 1 s.

---

## 9. Automation model

**Concepts:**

| Concept | Meaning |
|---|---|
| **Show** | A tournament (or part of it) covered with one look and one rundown template |
| **Node** | A paired production PC that runs shows |
| **Rundown** | Ordered segments for one match type (Bo1, Bo3) |
| **Segment** | A part of the show: trigger, graphics, scene, transition, hold window, auto/manual |
| **Rule** | When + Only if + Then (ordered actions); in-round rules live inside a segment |
| **Action** | OBS (scene, transition, replay), vMix (input, overlay), graphic (show/hide/duration), sponsor read, wait |
| **Hold window** | Seconds of visible countdown before an automatic take; Auto = 0, Manual = waits for Take |

**Triggers** (what can start a segment or rule):
- Tournament: match room opened, check-in complete, veto step, veto complete, map result verified, series decided, rescheduled, forfeit.
- GEP: agent select, round phase (buy, live, end), kill, multi-kill, spike planted or defused, match end.
- Time: at a clock time, after N seconds.
- People: hotkey, phone tap, remote command, observer flag.

**Segment state machine:**

```
queued → armed (trigger met) → holding (countdown) → taking → on air → done
              │                    │ H: held ──── Take ──┘
              │                    └ S: skipped → done
              └ prerequisites missing → blocked (alert)
```

**Safety rules:**
- No automatic take during a tech pause or timeout, unless the rule is the pause rule itself.
- Segments marked Manual never auto-take, but they still arm and show in Next.
- If OBS is disconnected, autopilot pauses; it never queues takes to replay later.
- Every automatic action carries a command id; the node ignores duplicates (idempotent), so remote double-taps can't double-cut.
- Every hold, skip, manual take and data fix is audited (who, when, why if given).

---

## 10. Data, contracts and backend links

Follows the repo order: **migration (RLS) → types → schema → hook → components → page**. Tables are proposals for review by the database and security leads.

### 10.1 Proposed tables (Supabase, RLS on every table)

| Table | Key columns | RLS |
|---|---|---|
| `broadcast_shows` | id, organization_id, tournament_id, name, hud_pack, theme jsonb, status | Org staff read/write; public none |
| `broadcast_nodes` | id, organization_id, name, capabilities jsonb, last_seen_at, token_hash | Org staff read; write via RPC only (pairing) |
| `broadcast_assignments` | show_id, match_id, node_id, starts_at | Org staff |
| `rundown_templates` / `rundown_segments` | template_id, order, trigger jsonb, graphics jsonb, scene, transition, hold_seconds, mode | Org staff; versioned on publish |
| `automation_rules` | segment_id or show_id, when jsonb, only_if jsonb, actions jsonb | Org staff |
| `broadcast_outputs` | node_id, kind, key_hash, rotated_at | Org staff; keys returned once |
| `broadcast_events` | node_id, match_id, type, payload jsonb, actor_id, created_at | Insert by node RPC; read org staff |
| `broadcast_crew` | show_id, user_id, role | Org admins manage; members read own |

Writes from nodes go through RPCs or the .NET API with a **node token** scoped to its organization and assigned matches. No service-role key ever ships in the desktop app.

### 10.2 Hub messages (SignalR `BroadcastHub`)

| Direction | Message | Payload |
|---|---|---|
| Node → hub | `Heartbeat` | node id, versions, OBS/GEP state, tally, autopilot state (every 2 s) |
| Node → hub | `Event` | segment changes, takes, holds, incidents, results |
| Hub → node | `ShowConfig` | show, rundown version, rules, theme, outputs |
| Hub → node | `MatchContext` | teams, logos, rosters, series, veto steps (pushed on change) |
| Hub → node | `Command` | `{ id, type: hold|skip|take|resume|trigger, segmentId?, by }` |
| Node → hub | `CommandAck` | `{ id, ok, error? }` |

### 10.3 Local HUD room (unchanged protocol)

The node embeds the existing server and its contract (`snapshot` / `patch` with version `v` / `event`, `resync` on gaps, ndjson log). Match context from the hub and GEP from the adapter both become patches on the same room state (`core/state.default.js`), so every graphic keeps working as built.

### 10.4 OBS (obs-websocket v5) used by the node

| Need | Requests and events |
|---|---|
| Connect | `Hello` / `Identify` with password (OBS 28+, port 4455) |
| Read scenes | `GetSceneList`, `GetSceneItemList` |
| Build scenes | `CreateScene`, `CreateInput` (`browser_source` with url, width 1920, height 1080, `shutdown: false`), slot placeholders |
| Take | Studio Mode: `SetCurrentPreviewScene` + `TriggerStudioModeTransition`; otherwise `SetCurrentProgramScene` |
| Transitions | `SetCurrentSceneTransition`, `SetCurrentSceneTransitionDuration` |
| Replays | `SaveReplayBuffer` → `ReplayBufferSaved` (path) → `SetInputSettings` on the replay media source → switch to Replay → `MediaInputPlaybackEnded` → return |
| Tally | `CurrentProgramSceneChanged`, `CurrentPreviewSceneChanged`, `SceneTransitionStarted/Ended` |
| Detect crew sources | `InputCreated`, `SceneItemCreated` |
| Monitor thumbnails | `GetSourceScreenshot` at 2 fps for the web live monitor |

vMix equivalents: `PreviewInput`, `Cut`, `Fade`, `Stinger1`, `OverlayInput1In/Out`, replay functions; tally from the `/api` XML state.

### 10.5 Pairing and output keys

1. Node requests a pairing code (10 min, single use).
2. Org staff enters it on the web.
3. Server issues a node token (hashed at rest), revocable from Production nodes.
4. Output URLs carry a per-node key. Rotating it pushes the new key to connected sources over their socket. Old URLs stop working after a 60 s grace.

---

## 11. Reliability and performance budgets

| Budget | Target |
|---|---|
| GEP event → graphic on screen (LAN) | under 150 ms p95 |
| Producer Take → OBS program change | under 100 ms on the same PC |
| Remote Take (web) → node ack | under 300 ms with good internet |
| Heartbeat | 2 s; node marked "attention" after 6 s, "offline" after 20 s |
| GEP stale | no events for 10 s during a live round |
| Reconnect | OBS: backoff 1, 2, 4, 8 s, max 10 s. Hub: same, then every 15 s |
| Offline queue | on disk, survives restart, ordered, idempotent replay |
| Graphics | 60 fps; no layout thrash; images preloaded per map |

Resync: graphics request a snapshot when they see a gap in `v` (existing behaviour). Conflicts after offline: last-writer-wins for config, explicit resolver for match assignment and results.

---

## 12. Accessibility and keyboard

- **Colour is never the only signal:** tally chips always carry text (ON AIR, PVW, OFF); health chips carry words.
- **Contrast:** body text ≥ 4.5:1 on panels; captions ≥ 3:1 at their size.
- **Focus order** follows reading order; drawers trap focus and return it on close.
- **Screen readers:** tally changes and alerts are announced politely; the hold countdown announces start and result only (not every second).
- **Targets:** 34 px minimum on desktop, 56 px on the phone remote.

**Console keyboard map:**

| Key | Action |
|---|---|
| Space | Take |
| H / S | Hold / Skip the next automatic take |
| 1–8 | In-game layers |
| Q–I | Between-rounds layers |
| A–J | Full-screen graphics |
| F1–F8 | Triggers (tech pause, timeout, replay, toast, lower third, poll, stinger, sponsor) |
| Ctrl+D | Fix data |
| Ctrl+P | Pause or resume autopilot |
| Esc | Close drawer, cancel a pending manual action |

Hotkeys are rebindable and work when the console window is focused; global hotkeys are opt-in.

---

## 13. Build order

| Phase | Ships | Builds on |
|---|---|---|
| **P0 · Node** | Desktop app packaging the existing HUD server, overlays and GEP adapter; Capture only mode; Outputs; local console | `esportra-valorant-hud`, `esportra-desktop` (ow-electron) |
| **P1 · OBS control** | obs-websocket connection, one-click scene build, segment → scene, Take/Cut/Stinger, replay flow, tally | P0 |
| **P2 · Autopilot** | Rundown runner, hold windows, in-round rules, Fix data, event log | P1 |
| **P3 · Web Broadcast** | Shows, nodes and pairing, match context sync, live monitor, crew and links (migrations + RLS first) | Esportra API, SignalR |
| **P4 · Reports and loop** | Results to the bracket, sponsor proof, VOD chapters, share cards, co-stream links | P3 |
| **P5 · Phone remote, vMix, multi-node polish** | | P2, P3 |
| **P6 · Graphics Studio (desktop)** | Design your own HUDs and bind data (Compositor-style editor: layers, canvas, inspector, bindings, states) | P0–P2 |

---

## 14. Open questions

1. **Riot policy:** confirm the broadcast and commercial use of Valorant art and GEP data for paid tiers.
2. **Overwolf distribution:** ship the node as an Overwolf-reviewed ow-electron app, or a signed installer with GEP support? This decides update cadence.
3. **Cloud relay:** offer hosted browser sources for fully remote productions (adds bandwidth cost), or LAN/this-PC only at launch?
4. **Pricing:** how many parallel nodes per plan; is the hands-free automation in the free tier?
5. **Replays without OBS replay buffer:** also support vMix replay and a dedicated replay PC?
