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

## Your scrims data (implemented)

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
