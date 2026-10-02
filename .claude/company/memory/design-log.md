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
