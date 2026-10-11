# Design log

One line per shipped surface. The Creative Lead appends after every APPROVED review and reads the last entries before choosing a direction (the sameness check in `design-recipe`). If a new piece would look the same whatever its brief, the direction was chosen by habit.

| Date | Project / piece | Surface | Direction (+ blend) | Archetype | Hero | What was new / try next |
|---|---|---|---|---|---|---|
| 2026-09-29 | Tournament dashboard redesign | Organizer dashboard shell + Overview | Command Console, Broadcast header | Pulse + scoreboard | "Needs you" queue | Nav grouped by intent (Run / Community / Configure); lifecycle track. Next: try Editorial for the recap view |
| 2026-09-29 | Create flow | Quick-create + wizard | Broadcast | Fork, then path | The first decision (game / setup path) | Shared kit (`src/components/ui/kit`); words written before layout |
| 2026-09-29 | Dashboard panels | Configure + Participants + Invitations | Command Console | Scoreboard, settings anatomy | Sticky save state | PanelSaveBar; roster visible without hover |
| 2026-09-29 | Stage setup wizard | Dialog wizard | Broadcast | Path, verdict-style review | The path from first match to final | Three-question stage form; numbered review path |
| 2026-09-29 | Design recipe boards | Brand reference boards | Broadcast (specimen) | Scoreboard grid of devices | "Every match, official." | Rendered signature moves + archetypes in real brand colours |
| 2026-09-30 | PROJ-040 C-5 | RegistrationPanel check-in ChoiceGroup | Command Console (L0) | Settings anatomy (inherited) | Two valid cards | Removed ghost options; InlineNotice neutral below ChoiceGroup. Try: same pattern for other parked features. |
| 2026-09-30 | PROJ-040 C-6 | TournamentAnnouncementPanel staff view | Command Console (L0) | Settings anatomy (inherited) | Announcement list | canActAsOwner gate; InlineNotice neutral replaces compose button for staff. No new components. |
| 2026-10-01 | Map veto redesign | MapVeto (match room, bracket, token link) + public veto tool | Broadcast | Face-off scorebug → path (step track) → scoreboard grid (pool) | The turn: "Your turn. Ban a map." + turn clock | Rose cue only on the team on the clock; hover action bar (white speaks, rose confirms on press); series lineup slots with "To be decided"; designed map-art fallback replaces stock photos |
| 2026-10-01 | Public match details | Bracket → match dialog | Broadcast | Verdict scorebug → map tabs → scoreboard | Series score (2 : 1), winner white + rose underline | Map-by-map tabs, two-row round strip (position, not colour), MVP tag; veto moves first when no results. Try next: Editorial recap for finals |
| 2026-10-01 | Veto order (iteration 4) | MapVeto step track | Broadcast | Strip of verdict cards | The map decision per card | CEO chose "VCT broadcast strip" over lanes/list/series-first. One card per map decision; side choices fold into their pick; bans grey, picks white-band, current card lifts. Lesson: ask for the reference direction before the 2nd redesign |

## 2026-10-02 — Broadcast veto overlay: paced playback

- The OBS broadcast overlay no longer mirrors the veto live. It plays it back one beat at a time (ban 3.6s, pick 3.6s, decider 3.9s, side 2.4s, 0.7s breath between), so a fast veto never blurs into a jump. Players keep the realtime view; broadcast gets the edited sequence.
- Each beat lifts its card (translateY + 4.5% scale) while the rest of the row dims, then plays a timeline: ban = 1.3s pen stroke, 1.4s colour drain, stamp drops in blurred at 1.8s, impact shake; pick = light sweep, white frame draws itself, stamp; decider = red bleeds in with a red frame, stamp, stays raised.
- `playback=replay` on the overlay URL plays the whole veto from the first action whenever the source loads (host tools: "Full replay"). Live mode starts from what's settled once history has loaded.

## 2026-10-02 — Public brackets (tournament bracket page + free bracket tool)

- Direction: Broadcast, L0, same world as map veto and match details. Archetype: header → scoreboard strip → PATH (tree) ending in a SPOTLIGHT (champion seat).
- Hero: a found team's route lit in rose through the tree (dashed rose for the road still ahead) to a champion seat at the end, which carries the largest type on the canvas once decided.
- New: pure layout service (named rounds: Round of 16 / Quarterfinals / Upper final / Lower round N / Grand final; lower bracket centred on its feeders; grand final between both brackets), scorebug match card (caption strip + two rows, winner white, live rose), connectors that brighten once decided, "Find a team", summary strip (played / live / teams / champion), matches list as the phone default, stage tabs replacing the 256 px sidebar.
- Tool: builder with segmented format / best of / size and a slots meter; runner with a report panel (score steppers, winner pre-picked from the score, "Up next" list of ready matches), confirm on reset and delete; embed with a title strip and "Powered by Esportra".
- Removed: emoji section headings, orange winner bars, rainbow initial avatars, blue "?" placeholders.

## 2026-10-05 — PROJ-053 T3: Scoreboard OCR review surface

- Direction: Broadcast, L0 (inherited scoreboard world). Archetype: scoreboard grid (existing) with inline confirmation rows → submit verdict. Hero: rose cue light (2 px left border + NOT READABLE tag) that migrates from elimination rows to the submit button as each row is confirmed — one cue in motion, never two at once.
- New: OCR confidence indicators inline in existing rows with zero layout disruption; rose-cue migration enforced in logic (`unconfirmedEliminationCount > 0`); auto-confirm on name edit so fixing a name does not require a second tap; State 4 (all clean) adds no UI at all; negative-margin padding (`py-2.5 -my-2.5`) for 44 px tap target on inline text-only buttons without breaking text flow.
- Try next: same rose-migrates-to-action pattern for other gated submit flows (proof upload, score dispute).

## 2026-10-08 — PROJ-046 T5: Esportra Broadcast operator UI

- Direction: Control Room (new direction — first desktop production tool in the log). Rejected: Broadcast/web (cinematic staging destroys scannability for 45 peer items), Command Console/web (management-flow patterns do not map to a fixed single-screen tool), Community (wrong register).
- Archetype: fixed three-panel shell — sidebar (identity + match selector + HUD status) · catalogue grid (3-col, 45 overlay cards) · state editor (field list / raw JSON toggle).
- Hero: the HUD status bar — one stripe of color (green/gray/amber/rose) at the base of the sidebar, readable from 1 metre. Everything else is utility.
- New: Control Room direction established for desktop production surfaces; pulse-ring animation spec (only animation in the app beyond copy feedback text swap); state machine for sign-in → match selection rendered in-panel with no modals; two-mode state editor (field list + raw JSON toggle) designed for power-user override without adding a heavy dependency.
- Try next: if a venue screen surface is built, evaluate Control Room vs Broadcast-scaled; the panel-strip approach (color stripe as health signal) could carry to other monitoring surfaces.

## 2026-10-02 — Public match details: premium result page with proof

- Direction: Broadcast, L0. Archetype: SPOTLIGHT hero (scoreline) → strip of map cards → per-map breakdown, then tabs for Map veto and Proof.
- Hero: the series score at 88px on the deciding map's art, each team's colour glowing behind its crest (stronger for the winner), loser dimmed, winner white + rose underline (the one rose cue). Bottom strip says how the result was reported ("All 3 maps pulled from Riot", "1 from Riot · 1 by screenshot").
- Two reporting methods are now first-class: a result pulled from Riot (shield, emerald, Riot match id shown) vs reported with a screenshot (camera) vs a typed score (pen). Each map carries its source and its verification state (Verified / Awaiting confirmation / Disputed / Rejected).
- Proof tab: "Pulled from Riot" list, then screenshots grouped per map, opening a full-size lightbox (prev/next, arrows, "Open original").
- Removed: old scorebug, series strip and evidence grid.

## 2026-10-10 — PROJ-057 P3: Esportra Air Web Broadcast screens (T27–T32)

- T27 Shows list: Command Console, L0 strict. Archetype: Scoreboard (list). Hero: rose pulse dot on any live show. Rose cue: one pulse dot per live row; no rose elsewhere. New: status semantic mapping for broadcast show lifecycle (live=rose, scheduled=amber, draft=zinc, ended=zinc-muted).
- T28 Show detail + rundown editor: Command Console, L0 strict. Archetype: three-panel production workspace. Hero: show status + Go Live/End Show action. Rose cue: 2px border on selected rundown segment (draft); rose strip on header (live). New: `CommandShowHeader` (shared 52px sticky header, status-tinted, added to CommandSurface.tsx); `RundownRow` (drag handle + type icon + inline edit + status chip); Framer Reorder for rundown + sponsor grid DnD. Live state differentiates from draft via header tint only — no page redesign.
- T29 Node monitor: Command Console, L0 strict. Archetype: Pulse (health) + Scoreboard. Hero: the offline/stale node card. Rose cue: 2px left border on offline card only (emerald for healthy — rose reserved for "needs you"). New: `NodeCard` component with dual health indicators.
- T30 Crew management: Command Console, L0 strict. Archetype: settings anatomy (invite) + Scoreboard (crew table). Hero: the invite link (shown once in modal). Rose cue: primary "Generate invite link" button (rose fill via slide hover).
- T31 Sponsor config: Command Console, L0 strict. Archetype: card grid + settings anatomy. Hero: logo preview. Rose cue: "Add sponsor" primary action. New: `SponsorCard` component; drag-to-reorder grid (Framer Reorder).
- T32 Onboarding checklist: Broadcast (lead), L0 strict. Archetype: Stage header → Path. Hero: N/9 complete count (Poppins 900, 48px). Rose cue: progress bar fill (transitions to emerald at full completion). New: `SetupChecklist` + `StepRow` components; non-wizard checklist pattern (any-order completion, completion derived from backend state not user input). Try next: rose-migrates-to-completion pattern for other setup flows (venue booking, tournament create).
- Rejected on all six: Broadcast for T27-T31 (hero energy conflicts with multi-panel density); Control Room (reserved for desktop production tool, PROJ-046 T5); Community (wrong register); Command Console for T32 (flat equal-weight treatment loses 0→9 arc).
- Sameness check: T27–T31 are all Command Console; signals justify the match (expert operator tool, dense management data, L0 strict). T32 Broadcast breaks the run. Five Console + one Broadcast is not habit — it is signal-driven.

## 2026-10-09 — PROJ-057: Esportra Air Desktop P0 screens (Pair, Readiness, Capture, Outputs)

- Direction: Command Console (lead), L0 strict. Rejected: Broadcast (stage presence fights tabular data), Control Room (correct for the live producer console, differentiated for these setup/monitoring screens), Community (wrong register).
- Archetype: Pair = Path. Readiness = Pulse + Scoreboard. Capture = Scoreboard + Pulse. Outputs = Scoreboard.
- Hero: Pair = code input field. Readiness = least-healthy row. Capture = GEP feed status line ("Live · 34 msg/s"). Outputs = URL in each row.
- New: full P0 token set codified (correcting border-radius 4px → 0px throughout; correcting rose focus rings → white 2px solid #F4F4F5; retiring --c-accent for interactive chrome); red #EF4444 for errors distinct from rose #F43F5E (ON AIR only); Mono as the data face for all URLs, latency values, codes, hotkey badges; health row anatomy (dot + label + sub-text + fix action); Regenerate confirmation dialog with consequence copy before destructive verb on button.
- Try next: if the live producer console (Readiness → console transition) is designed, evaluate whether the status dot system carries into the console's autopilot state indicators with the same anatomy, or whether a distinct tally-style is needed for the PGM/PVW row.
