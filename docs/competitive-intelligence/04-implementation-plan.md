# C–F. Database, backend, frontend and delivery plan

## Status
- **Scope (decided with the product owner):** scrims only, for a team's own members, built from auto-fetch (Riot) and OCR
  (screenshot) data, in one place: **Scrims → Your scrims data** (`/competitive/scrims/data`).
- **Built:** security fixes S1–S3; the verified Riot match store with rosters frozen at report time (Phase 1); and the
  scrim data model (coverage tiers, record, map pool with evidence, compositions, players, lineups, recent maps) served by
  `GET /api/scrims/teams/{teamId}/data`.
- **Removed:** the public career and intelligence endpoints, the profile Performance tab, the team-page record sections,
  the Settings analytics toggle and the tournament verification badge and registration. The earlier
  `player_analytics_settings` table is left in place, unused, and can be dropped by a later migration.
- **Not built:** per-player history pages, veto-to-result for scrims (scrim vetoes live in the public veto tool and are
  not linked to played maps), roster timeline, coach notes and milestones, ratings, AI insights.
- **Known limits:** OCR figures are as the screenshot showed them; attack/defense, first deaths and multi-kills need
  auto-fetched maps; the attack/defense split assumes Riot's round role values are "Attacker" and "Defender" (verified
  only against test data); the roster for Riot maps is frozen when the map is reported.

## C. Database
Reuse: `riot_accounts`/`player_riot_accounts`, `team_members`, `team_membership_history`, `team_roster_members`,
`scrim_session_games`, `brkt_match_games`, `match_map_veto_actions`, `game_maps`, `player_game_profiles`.
New (service-role-only RLS, REVOKE from anon/authenticated, one concern per migration, idempotent):
`provider_matches` (UNIQUE provider+provider_match_id, `data_status`), `provider_match_payloads` (raw JSON + sha256),
`provider_match_associations` (UNIQUE per match and per game), `provider_match_association_events` (audit),
`provider_match_roster_snapshots` (frozen at first write), and VALORANT tables `valorant_match_players`, `_teams`,
`_rounds`, `_round_player_stats`, `_round_damage`, `_match_kills`. Analytics computed on demand over indexed tables; aggregates only after measurement.

## D. Backend
`ValorantMatchNormalizer` (pure), `ProviderMatchIngestJob` (Hangfire; advisory lock; server-side Riot fetch; replace
children in one transaction; 404 reschedule, 429 retry), `ProviderMatchVerifier` (pure), enqueue on scrim
report save with `riot_match_id`, admin backfill, and the endpoints in the API reference below. Access checks live in endpoints.

## E. Frontend
`pages/competitive/scrims/ScrimDataPage.tsx` (route `/competitive/scrims/data`, linked from the Scrims sidebar, bottom
nav and the workspace header) renders `components/competitive/scrims/data/ScrimDataPanel`: coverage, record, activity,
map pool, compositions, players, roster and recent maps. Data via `hooks/competitive/useScrimData` (Zod-validated).
`MatchDataStatusBadge` on each scrim map row shows whether Riot's record backs the reported result.

## F. Priorities
Preserve: scrim and tournament reporting, OCR, existing Riot sync. Delivered: the verified match store and Your scrims data. Infrastructure:
ingestion and roster snapshots. Advanced: round/kill/economy dashboards, coach notes, milestones. Future: ratings
(documented methodology), AI insights (cite stats and n), additional games.

## API reference
| Route | Who | Purpose |
|---|---|---|
| `GET /api/scrims/teams/{teamId}/data` | active members of the team, staff admins | the team's scrim data, all sections |
| `GET /api/scrims/sessions/{id}/games/{n}/provider-match` | the two teams' active members, admins | Riot verification of one scrim map |
| `POST /api/admin/provider-matches/associations` | staff | manual, audited association of a Riot match to a scrim map |
| `POST /api/admin/provider-matches/backfill?limit=` | staff | queue ingestion of reported scrim maps that have no association |
