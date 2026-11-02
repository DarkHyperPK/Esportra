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
