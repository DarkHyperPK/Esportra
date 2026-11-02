# C–F. Database, backend, frontend and delivery plan

## Status
- **Built (this change):** security fixes S1–S3 (backend commit held locally, see below), debug route guard, these docs.
- **Not built:** Phase 1 normalized ingestion. It needs a .NET toolchain to compile and test, which the authoring
  environment could not reach (`builds.dotnet.microsoft.com` blocked). No placeholder analytics were added.

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
