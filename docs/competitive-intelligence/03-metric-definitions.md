# Metric definitions

Every derived metric stores or shows: matches/rounds included, date range, source, and whether data is partial.
Percentages with fewer than 10 samples are labelled "insufficient sample" and never called a strength or weakness.

- **ACS** = `stats.score` ÷ `roundsPlayed` (rounded to integer). **K/D** = kills ÷ max(deaths, 1) shown with the
  denominator rule. **KDA** = (kills + assists) ÷ max(deaths, 1). **ADR** = total damage ÷ rounds played.
- **Headshot / body / leg share** = hits to that location ÷ all damage events with locations. It describes where
  shots landed, **not** aim accuracy (misses are not recorded).
- **Opening kill (first blood)**: the kill with the smallest `timeSinceRoundStartMillis` in a round; ties broken by
  `timeSinceGameStartMillis`, then by killer PUUID, then victim PUUID (compared as ordinal strings). Riot nests kills
  under their killer, so source order is not chronological and is never used. Its victim has the opening death.
  Opening duel win rate = opening kills ÷ (opening kills + opening deaths). Each kill gets a 1-based `kill_ordinal`
  per round from this same ordering.
- **Multi-kill**: kills by one player inside one round; 2K–5K counted once per round at the highest count
  (six or more cannot happen; anything ≥ 5 is counted as an ace).
- **Clutch (approximate)**: reconstruct living players per round from kill events; a clutch starts when a player is the
  last living on their team facing n ≥ 1 enemies. Deaths with no kill event (rare) make this approximate, so clutch
  metrics carry the label "approximate".
- **Attack/defense**: from `roundResults.winningTeamRole`; a team's side for a round is derived from role of that
  team in that round, never assumed from halves.
- **Round win rate** = rounds won ÷ rounds played. **Match win rate** counts verified matches only.
- **Consistency**: population standard deviation of the per-match value over the last N verified matches, reported
  with N; compared to the mean as coefficient of variation. No single composite score.
- **Economy buy class** (Esportra label, not Riot's): pistol round (rounds 1 and 13), eco (team loadout < 6,000),
  force/half (6,000–19,999), full (≥ 20,000). Thresholds are configurable constants and shown to users.
- **Verified match**: a Riot custom game, completed, whose players map by PUUID to exactly the two reporting teams'
  rosters, matching the reported map and score. Partially verified when some players are unlinked; disputed when the
  data contradicts the report.

## Verification of a reported game against Riot (implemented)

A reported scrim map or tournament game that names a Riot match gets a server-side check; the client's copy of the
match is never trusted. Statuses: **verified**, **partially_verified**, **unverified**, **disputed**, **duplicate**,
**pending** (see the table in the verifier's source, `ProviderMatchVerifier`).

- A team's Riot side is found from the linked accounts in the roster **as it was when the result was reported**.
- Disputed when: not a custom game; one team split across both sides; both teams on the same side; a reported score
  differs from the rounds Riot recorded for that side; the reported map is a known map and differs from Riot's.
- Partially verified when everything agrees but some Riot players cannot be matched to a roster member. Those
  players are listed as `unmatched` with no identity; nothing is inferred for them.
- Unverified when no roster account appears in the match (including when no one has linked Riot, in which case
  Riot is not asked at all).
- A Riot match counts once: a second game claiming it is stored as **duplicate** and ignored for analytics.
- Map names are compared only for Riot internal names this project has confirmed (Duality=Bind, Bonsai=Split,
  Ascent, Port=Icebox, Triad=Haven, Foxtrot=Breeze, Canyon=Fracture, Pitt=Pearl, Jam=Lotus, Juliett=Sunset,
  Infinity=Abyss). Unknown codenames or free-text map names are not compared.

## Scrim Insights (implemented)

Scope: **scrims only**, for the team's own members. Nothing here is public, and tournament games are not included.

**What counts.** A scrim map counts once both teams have confirmed it (or staff resolved it with a winner). Reported,
disputed and void maps are not counted; the page says how many are waiting. Every counted map contributes its result and
map; what else it contributes depends on its **data tier**:

| Tier | Source | Contributes |
|---|---|---|
| Full data | Auto-fetched Riot game whose association is verified or partly verified | Everything: every player's stats, agents, attack/defense rounds, first kills/deaths, plants/defuses |
| Screenshot | OCR scoreboard stored on the map | Each player's own line as shown (ACS, K/D/A, ADR, HS%, first bloods, plants/defuses), agents and roster match. No rounds, so no attack/defense, first deaths or multi-kills |
| Score only | A typed map, or a Riot game that is pending, unverified or does not match Riot | The result and the map |

A Riot game is never given full data on the team's say-so: if Riot's record disagrees with the report, the map counts
for its result only and is listed as "does not match Riot". Screenshot figures are what the screenshot showed (the other
team confirmed the result, not each player's numbers), so they are labelled as limited.

**Formulas.** Weighted over rounds, null (shown as "—") when there is nothing to divide by, and each player figure uses
only the maps that provide it and says how many ("from 2 of 4 maps"). A screenshot map's rounds are the sum of its two
scores.

| Figure | Definition |
|---|---|
| Win rate | maps won ÷ confirmed maps, with a 95% Wilson range shown |
| Round win rate | rounds won ÷ rounds played |
| ACS / ADR | round-weighted mean of the player's per-map ACS / ADR (Riot: score ÷ rounds, damage ÷ rounds; screenshot: as shown) |
| K/D | kills ÷ max(deaths, 1) over maps that have kills, deaths and assists; KDA adds assists |
| Headshot % | Riot: headshots ÷ located hits; screenshot: as shown. Where hits landed, not aim accuracy |
| First kills / deaths | first elimination of a round (tie-break above). First deaths exist for full-data maps only |
| Attack / defense | rounds won on that side ÷ rounds played on it, from full-data maps only. A team's side in a round is the winner's role if it won, otherwise the opposite role |

**Map pool.** A map is called a strength or weakness only with at least 5 maps *and* when the 95% Wilson range of its
win rate lies wholly above or below the team's overall win rate; otherwise "in line with overall" or "too few maps".
Pool maps with no confirmed map are listed as unplayed.

**Compositions** are the five agents the team fielded (Riot or screenshot, in any order), with results by map. They
describe what happened; the page says a higher win rate is not proof a composition is better, since map, opponent,
side and players differ. Roles come from bundled agent metadata, separate from match records.

**Lineups, substitutes and pairs** use the roster as it was when a Riot map was reported, and the roster-matched player on
a screenshot map (their current team role, since it is not stored per map). Maps with fewer than five known players make
a "partial" lineup. Substitute and pair comparisons are descriptive: the games differ in more than the player.

**Who sees it.** Active members of the team, and staff admins. Everyone else gets nothing. This replaces the earlier
public career and tournament surfaces, which were removed.

### Matchmade (ranked) games on staging

By default only custom games are verified. With the backend setting `Riot__AllowNonCustomMatches=true` (staging only), a ranked, unrated or other matchmade game can be attached to a scrim map. It can never be fully verified: the opposing scrim team is not in it, so only the reporting team's side and the score are checked (`partially_verified`, reason `queue_not_custom`). These maps count in the same record and map pool, and the page states how many came from a matchmade queue. A wrong score still disputes the game.

### Per-map report

`GET /api/scrims/sessions/{id}/games/{n}/insights` (members of either scrim team) shows one verified Riot map in depth: scoreboard, round timeline, opening duels, kill feed, damage, economy, abilities and spike. Nothing is stored; every figure is computed from Riot's recorded match and shows its sample.

- **ACS** = score ÷ rounds. **ADR** = damage ÷ rounds. **K/D** = kills ÷ max(deaths, 1). Headshot/body/leg share = that hit type ÷ all located hits (not aim accuracy).
- **KAST** = rounds with a kill, an assist, survival or a trade (the killer is killed by a teammate within 5 s) ÷ rounds, from the kill feed.
- **Opening duel** = the first kill of a round; duels won = opening kills ÷ (opening kills + opening deaths); win rates after first blood / first death are counted over rounds with a result.
- **Buy** = average loadout value per player: eco ≤ 2,000, full ≥ 3,900, otherwise force; rounds 1 and 13 are pistol rounds. Riot numbers rounds from 0; the report counts from 1.
- **Abilities** are Riot's per-map cast totals. Riot gives no per-round counts, so there is no per-round ability view.
- Opponent players appear by name for this one match only, as in a match history. They are never aggregated across matches. A map without verified Riot data says so and shows no invented sections.

### Scrim Insights tabs

Scrim Insights (`/competitive/scrims/data?tab=`) shows one category at a time: Overview, Maps, Map picks, Agents & comps, Players, Roster. The map report (`.../report?tab=`) has Scoreboard, Rounds, Kills & damage, Economy, Utility & spike. The open tab is kept in the URL.

- **Map picks** (`GET /api/scrims/teams/{id}/map-picks`) counts only scrims whose veto finished. Your side in the veto is your place in the scrim. A game's veto map is the n-th pick, then the decider, shifted back by voided maps. Results are split by who chose the map. Bo1 has no picks, only bans and a decider.
- **Agents** and **players by agent** use every map with an agent recorded; K/D and ACS use only maps that have them and show how many. Results describe maps where the agent was in play, not that it caused them.

### Team and player reports

`GET /api/scrims/teams/{id}/report` and `.../players/{userId}/report` cover the team's last 30 Riot-verified, confirmed scrim maps. Figures are round-weighted over the maps they come from and show their sample; nothing is computed from one map into a "highlight". Highlights are rules over the report's own figures: best/weakest map (3+ maps), attack/defense gap (40+ rounds each, 15+ points apart), pistol rounds (6+), top ACS and opening duels (3+ maps, 8+ duels), form (last 5 vs previous 5 over 10+ maps, 5+ points). Consistency is the standard deviation of ACS across maps. Staff (captain, owner, manager, coach) and admins see every player; other members see team figures and only their own player report.

### Decisive moments, opponents, trends, heatmaps

- **Decisive moments** are worked out from who was alive when, using the kill feed. A death is *traded* when a teammate kills the killer within 5 seconds. A *clutch* is the last player alive against one or more enemies. *Led / trailed* rounds are those where your team had more / fewer players alive at some point. *Post-plant* and *retake* are rounds where your team / the opponent planted. *Anti-eco* is your full buy against their eco; *loadout edge* is 1,000+ more or less loadout value per player. Findings are rules with minimum samples (for example post-plant needs 8 rounds) and always quote their evidence.
- **Opponents** are scrim partners as teams only. Nothing about their players is shown or aggregated across matches.
- **Trends** compare the last 5 / 10 maps with the ones before and this month with last; a comparison needs enough maps in both periods, and a change inside the usual swing reads "no clear change".
- **Heatmaps** plot positions at the moments Riot recorded (a kill's killer location, a victim's location, plants, defuses), never movement. Coordinates become map positions with Riot's conversion: across = y x xMultiplier + xScalarToAdd, down = x x yMultiplier + yScalarToAdd.
