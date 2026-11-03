# C–F. Database, backend, frontend and delivery plan

## Status
- **Built and pushed:** security fixes S1–S3 (backend `staging`), debug-route admin guard, these docs, and the
  Phase 1 data foundation (below). Backend: 51 new unit/integration tests run against the full migration replay on
  Postgres 16; frontend: 1016 tests, lint and `npm run build` pass.
- **Phase 2 built:** player and team career records (totals, agents, maps, teams played for, monthly activity, paged game history) on the profile "Performance" tab and the team page "Competitive Record" section.
- **Not built (later phases):** map/agent/composition analytics, round-level dashboards,
  coach workspace, milestones, ratings, AI insights. The tables to power them exist; no placeholder statistics were added.
- **Deviations from the first plan:** the analytics visibility setting is its own table
  (`player_analytics_settings`, absent row = private) rather than a column on `player_game_profiles`, which needs a
  full profile row to exist. Tournament games are keyed by (match, game number), not by report row, because both
  teams report the same game. Confirmation of a scrim map does not re-run verification (it does not change the data).
- **Known limits:** the roster is frozen when the result is reported; a player who leaves between the game and the
  report is still in that roster, and one who joined after is not. Stand-ins without a linked account appear as
  `unmatched`. Opponent coaches are excluded from rosters. Matches are only fetched for games that name a Riot match;
  a Riot match unlisted after ~3 hours of retries is marked `unavailable` and the result stands as reported.

## C. Database
Reuse: `riot_accounts`/`player_riot_accounts`, `team_members`, `team_membership_history`, `team_roster_members`,
`scrim_session_games`, `brkt_match_games`, `match_map_veto_actions`, `game_maps`, `player_game_profiles`.
New (service-role-only RLS, REVOKE from anon/authenticated, one concern per migration, idempotent):
`provider_matches` (UNIQUE provider+provider_match_id, `data_status`), `provider_match_payloads` (raw JSON + sha256),
`provider_match_associations` (UNIQUE per match and per game), `provider_match_association_events` (audit),
`provider_match_roster_snapshots` (frozen at first write), and VALORANT tables `valorant_match_players`, `_teams`,
`_rounds`, `_round_player_stats`, `_round_damage`, `_match_kills`. Add `player_game_profiles.analytics_visibility`
default `private`. Analytics computed on demand over indexed tables; aggregates only after measurement.

## D. Backend
`ValorantMatchNormalizer` (pure), `ProviderMatchIngestJob` (Hangfire; advisory lock; server-side Riot fetch; replace
children in one transaction; 404 reschedule, 429 retry), `ProviderMatchVerifier` (pure), enqueue on scrim/tournament
report save with `riot_match_id`, admin backfill, endpoints `GET /api/provider-matches/{id}`, per-game association,
admin manual association, `PUT /api/competitive/analytics-visibility`. Access checks live in endpoints.

## E. Frontend
Phase 1: `types/providerMatch.ts`, `schemas/providerMatch.ts`, `hooks/competitive/useProviderMatch.ts`,
`MatchDataStatusBadge`, analytics visibility section in Settings. Later: player career/performance tabs on
`ProfilePage`, team Competitive Intelligence on `TeamProfilePage`, match detail page, coach workspace.

## F. Priorities
Preserve: scrim/tournament reporting, OCR, existing Riot sync. MVP: Phase 1 + player/team basics. Infrastructure:
ingestion, snapshots, consent. Advanced: round/kill/economy dashboards, coach notes, milestones. Future: ratings
(documented methodology), AI insights (cite stats and n), additional games.

## API reference (Phase 1)
| Route | Who | Purpose |
|---|---|---|
| `GET /api/scrims/sessions/{id}/games/{n}/provider-match` | active members of either team, admins | status, reasons, scoreboard (no PUUIDs) |
| `GET /api/matches/{id}/games/{n}/provider-match` | any signed-in user | same for a tournament game (scoreboards are public) |
| `GET/PUT /api/competitive/analytics-visibility` | the player | `private` (default) or `public` |
| `POST /api/admin/provider-matches/associations` | staff | manual, audited association |
| `POST /api/admin/provider-matches/backfill?limit=` | staff | queue ingestion of existing reported games |
| `GET /api/competitive/players/{id}/career` (+ `/matches?before=&limit=`) | per the access rules in doc 03 | career summary and paged games |
| `GET /api/competitive/teams/{id}/career` (+ `/matches`) | signed-in users | team record; members also get the roster appearances |
