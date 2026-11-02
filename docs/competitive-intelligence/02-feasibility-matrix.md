# B. API feasibility matrix

Classes: **Direct** (field as supplied) · **Derived** (deterministic from fields) · **Approximate** (stated assumptions)
· **Unavailable** (needs data we do not have). "Today" = accessible to Esportra now with a server-side fetch.
All Riot data comes from `GET /val/match/v1/matches/{matchId}` (VAL-MATCH-V1) and must be checked against real
responses; field presence varies by queue/version.

| Metric family (brief §) | Riot fields | Esportra fields | Class | Today | Notes |
|---|---|---|---|---|---|
| K/D/A, score, rounds, ACS (6.2) | players.stats | puuid ↔ user | Direct/Derived | Yes | ACS = score ÷ roundsPlayed |
| Damage, ADR, HS/body/leg share (6.2, 16) | roundResults.playerStats.damage | — | Derived | Yes | Never labelled "accuracy" |
| Opening kills/deaths (6.3) | kills.timeSinceRoundStartMillis | — | Derived | Yes | Tie-break defined in doc 03 |
| Multi-kills (6.4) | kills per round | — | Derived | Yes | Within one round only |
| Clutches (6.5) | kills, roundResults | roster | Approximate | Partial | Deaths without a kill event (e.g. fall) are invisible |
| Consistency (6.6) | per-match stats | — | Derived | Yes | Formula documented, shows n |
| Agent role (7.4) | characterId | agent metadata table | Derived | Yes | Metadata kept apart from matches |
| Win rate, rounds won/lost (8) | teams.won, roundsWon | team ↔ match | Direct | Yes | Needs match ↔ team association |
| Attack/defense win rate (10.1) | roundResults.winningTeamRole | — | Derived | Yes | Role per round, sides swap at half |
| Roster/lineup analytics (9) | players.puuid | roster snapshot | Derived | **No** | Needs snapshot table (Phase 1) |
| Substitute analytics (9.4) | players.puuid | snapshot role | Derived | **No** | Same |
| Map pool (10.2) | mapId | veto, game_maps | Derived | Partial | Needs Riot mapId ↔ game_maps mapping |
| Veto-to-result (10.4) | mapId | veto actions | Derived | Partial | Veto records exist; join missing |
| Composition (11) | characterId ×5 | roster | Derived | After ingest | Observational only, not causal |
| Economy (12) | economy.loadoutValue/spent/remaining/weapon/armor | — | Direct | After ingest | Buy class = Esportra label, not Riot |
| Ability casts (13.1) | stats.abilityCasts | — | Direct | After ingest | |
| Utility effectiveness (13.3) | — | — | Unavailable | No | Flash/smoke impact not in schema |
| Round & momentum (14) | roundResults | — | Derived | After ingest | |
| Kill events, weapons (15) | kills.finishingDamage | — | Direct | After ingest | |
| Plants/defuses (17) | bombPlanter/Defuser, plantSite, times | — | Direct | After ingest | Not every round has a plant |
| Heatmaps (18) | victimLocation, plantLocation | map transform | Approximate | After ingest | Per-map coordinate adapter needed; discrete points only |
| Movement paths, crosshair (18.3) | — | — | Unavailable | No | |
| Scrim quality / rating (19.3, 23) | — | — | Unavailable | No | Needs a documented methodology |
| Opponent scouting of personal data (27.3) | — | — | Excluded | — | Out of scope by policy |

Permissions: the production key and RSO linkage cover linked players; unlinked players yield no stats (marked
`unlinked`). Riot policy coverage of stored per-round data and retention needs written confirmation.
