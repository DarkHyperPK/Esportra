# Metric definitions

Every derived metric stores or shows: matches/rounds included, date range, source, and whether data is partial.
Percentages with fewer than 10 samples are labelled "insufficient sample" and never called a strength or weakness.

- **ACS** = `stats.score` ÷ `roundsPlayed` (rounded to integer). **K/D** = kills ÷ max(deaths, 1) shown with the
  denominator rule. **KDA** = (kills + assists) ÷ max(deaths, 1). **ADR** = total damage ÷ rounds played.
- **Headshot / body / leg share** = hits to that location ÷ all damage events with locations. It describes where
  shots landed, **not** aim accuracy (misses are not recorded).
- **Opening kill (first blood)**: the kill with the smallest `timeSinceRoundStartMillis` in a round; ties broken by
  `timeSinceGameStartMillis`, then by source array order. Its victim has the opening death. Opening duel win rate =
  opening kills ÷ (opening kills + opening deaths).
- **Multi-kill**: kills by one player inside one round; 2K–5K counted once per round at the highest count.
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
