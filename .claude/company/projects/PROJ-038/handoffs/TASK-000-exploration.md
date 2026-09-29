# TASK-000: Codebase Exploration — PROJ-038 Active Matches

## OverviewPanel (current state)
**File:** `src/components/organizer/tournament-manage/panels/OverviewPanel.tsx`
Props: `tournament`, `participants`, `stages`, `canActAsOwner`, `isBattleRoyale`
Current sections: stat strip, copy link, dates, recently registered (5), recently checked-in (5), description. No match data.

`tournament.id` is available inside the component — a self-contained `useQuery` inside OverviewPanel is sufficient. PanelRouter changes are NOT required.

## useTournamentDashboard — no match data
`GET /api/tournaments/{slugOrId}` returns only `{ tournament, participants, stages, ... }`. Zero match fields. Active match data must come from a separate query.

## Existing match components
- `src/components/bracket/ReadOnlyMatchCard.tsx` — exists, likely lean (not yet read fully)
- `src/pages/tournaments/brackets/MatchCard.tsx` — 537 lines, too heavy/interactive for an overview widget
- `src/components/bracket/VirtualizedMatchesList.tsx` — group-scroll container, not suited for a small panel widget

## TypeScript types (bracketTypes.ts)
- `MatchStatus = 'pending' | 'in_progress' | 'completed' | 'disputed' | 'cancelled'`
- `MatchWithTeams extends Match` — has `team1?: Team`, `team2?: Team`
- `Match` has: `id, tournament_id, stage_id, round, match_number, team1_id, team2_id, status, scheduled_time, team1_score, team2_score`

## BLOCKING GAP: No matching backend endpoint
No `GET /api/tournaments/{id}/matches?status=in_progress` that is session/bearer authenticated and joins team names.

Existing options:
- `GET /api/stages/{stageId}/matches` — bearer auth, correct auth, but per-stage, no status filter
- `GET /api/v1/tournaments/{id}/matches` — API key only, not for browser sessions

**Must add:** `GET /api/tournaments/{id}/active-matches` in `MatchSystemEndpoints.cs` or `TournamentEndpoints.cs`

Required joins: `brkt_matches → brkt_versions → tournament_stages` WHERE `tournament_stages.tournament_id = @id AND bm.status = 'in_progress'`

Minimum response fields per match:
- `id, match_number, round_index, bracket_type, best_of, status, scheduled_time`
- `team1_name, team1_score, team2_name, team2_score` (joined)
- `stage_name` (from tournament_stages)

## PanelRouter — no changes needed
`tournament.id` is already in scope inside OverviewPanel via `tournament.id`. New useQuery inside OverviewPanel is sufficient architecture.
