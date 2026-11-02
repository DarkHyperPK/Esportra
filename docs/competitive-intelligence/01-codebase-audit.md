# A. Codebase audit — Competitive Intelligence (VALORANT)

Audited 2026-11-02 against `Esportra` `staging` and `esportra-backend` `staging`. The frontend is a thin client: it
makes **no** Supabase table queries (only auth and storage) and calls the .NET API through `src/lib/apiClient.ts`. The
Riot integration, every table, and every job live in `esportra-backend`. `supabase/migrations/` here is deprecated and
empty; real migrations are DbUp scripts in `esportra-backend/src/Esportra.Infrastructure/Migrations/Scripts/`.

## Existing capabilities (reuse, do not duplicate)

| Area | What exists | Where |
|---|---|---|
| Riot Sign On | Authorize URL with encrypted state, callback, scope `openid`, `accounts/me` | `IntegrationEndpoints.cs` |
| Riot account tables | `riot_accounts` (legacy) and `player_riot_accounts` (competitive), dual-written | migrations `20261001000002`, `20261023000004` |
| Name changes | `riot_account_name_history`, `RiotIdRefreshService` + job | `Services/RiotIdRefreshService.cs` |
| Riot client | Allow-listed prefixes (`account`, `active-shards`, `val/match/v1/matches`, `matchlists`, `content`, `ranked leaderboards`), shard resolution | `Infrastructure/Integrations/RiotApiClient.cs` |
| Match ids | Matchlist search for custom games by PUUID, map and score; scrim recent matches | `Services/RiotMatchLookup.cs`, `ScrimEndpoints.cs` |
| Server re-verification | Re-fetches the Riot match, checks each account against rosters, retries for indexing lag | `ScheduledJobs/ScoreboardRiotCheckJob.cs` |
| Match math | ACS, ADR, HS%, first bloods, economy and weapon timelines | `Services/ValorantMatchStatsHelper.cs` |
| Player archive | Ranked/competitive matches per linked player: kills, deaths, assists, agent, tier | `valorant_player_matches`, `player_game_stats`, `ValorantStatsSyncService` |
| Teams | `team_members` (`is_active`), `team_membership_history` (written on leave/kick), `team_roster_members` | migrations |
| Scrims | `scrim_sessions`, `scrim_session_games` (per map, `riot_match_id`, `match_data`), `team_scrim_stats` RPC | migrations `20261103100000`, `20261102130000` |
| Tournaments | `brkt_matches`, `brkt_match_games` (`riot_match_id`, `match_details`), `match_result_reports` | schema dump |
| Veto | `match_map_veto_actions`, `match_map_vetos`, public veto sessions, `game_maps` (uuid keyed) | migrations |
| Agent/map metadata | `src/lib/valorantAgents.ts`, `valorantUiAssets.json` (roles), `useValorantCatalog.ts` (map coordinate multipliers), `valorantMapAssets.ts` | frontend |
| Jobs / tests | Hangfire on Postgres; Testcontainers `ApiFactory`; Riot samples in `ScoreboardOcr/RiotMatchSamples.cs` | backend |
| Frontend | Profile (`pages/profile/ProfilePage.tsx`), team page, scrim session page, match detail dialog, `CareerTimelinePage`, recharts | frontend |

## Missing capabilities

- No normalized match model: no per-player, per-round, per-kill or per-damage tables. Rich Riot JSON exists only as
  jsonb inside reports/games.
- No roster snapshot per scrim or tournament map. Tournament lineups are snapshotted per tournament registration only.
- No server-owned analytics source. Scrim `match_data` and tournament `match_data`/`match_details` are **client
  supplied** (`ScrimGameEndpoints.ReportAsync`, `MatchSystemEndpoints`). Nothing analytic may be derived from them.
- No match-to-scrim association record, data-quality state, or audit trail for manual association.
- No per-player consent record for match-data analytics or analytics visibility (only `show_riot_account`,
  `riotIdVisible` and LFG `profile_visible`).
- No coach notes, improvement objectives, career milestones, or agent-role metadata owned by the backend.
- Veto rows are not linked to the played Riot map; `game_maps` is keyed by uuid, Riot uses `mapId` paths.
- The player archive covers `competitive` queue only; custom games (scrims/tournaments) are not archived per player.

## Security findings

| ID | Severity | Finding | Status |
|---|---|---|---|
| S1 | CRITICAL (suspected) | `riot_accounts` stored RSO access/refresh tokens in plain text with `SELECT USING (true)` / any-authenticated policies on a Supabase project whose anon key ships in the bundle. Tokens were never read after linking. | Fixed in backend commit (not yet pushed). Production exposure **not probed**; rotate the RSO client secret. |
| S2 | HIGH | `/api/integrations/riot/proxy` and `/enriched-match` let any signed-in user read any player's matchlist or any match through Esportra's production key; allow-list did not reject `..`. | Fixed: proxy Admin-only, enriched-match visibility rule, traversal rejected. Debug routes guarded in frontend. |
| S3 | MEDIUM | Unlinking left `player_riot_accounts`; `riot_account_name_history` readable by everyone (PUUID ↔ name). | Fixed. |
| S4 | integrity | Client-supplied `match_data` trusted as a source. | Addressed by the server-side ingestion design (Phase 1, not built yet). |

Other items found, not changed: `SoloTournamentRegistration.tsx` reads `riotAccount.game_name`/`tag_line` but the hook
returns camelCase (likely undefined); `ProfilePage.tsx` calls `apiClient` directly in a page; `/debug/riot/overlay*` and
`share-cards` routes remain unguarded (overlay needs a session and is now subject to the enriched-match visibility
rule; kept open because it may be used as a stream source).

## Technical risks and unverified items

- Whether Postgres is reachable through the data API in production (assumed yes for S1).
- Riot's policy scope for each analytic, data retention, and whether VAL-MATCH-V1 returns custom games for all linked
  players. Treat as requiring confirmation against the registered app.
- Riot may index custom games minutes late (existing job already retries).
- The sandbox used for this work could not install .NET, so backend C# changes are **uncompiled and untested**.
