# PROPOSAL: PROJ-038 — Active Match List on Tournament Overview Panel

**Created:** 2026-09-28
**Status:** IMPLEMENTATION_COMPLETE

## Objective

Add a live "Active Matches" section to the tournament Overview panel so organizers can immediately see which matches are currently in progress when they open the dashboard, without navigating to the Brackets page. A tournament may have matches running across multiple stages simultaneously; the Overview should surface all of them in one glance with team names, score, and round context.

## Scope

**In scope:**
- New backend endpoint: `GET /api/tournaments/{id}/active-matches` returning all `in_progress` matches across all stages for the tournament
- `useActiveMatches` React hook querying the endpoint, polling every 30s
- "Active Matches" section in `OverviewPanel.tsx` using `ReadOnlyMatchCard` for each match
- Empty state when no matches are live
- BR tournaments: only show standard bracket matches (`brkt_matches`); BR game results are tracked separately in `br_game_results` and are not applicable here

**Out of scope:**
- BR game results / live game widget (separate concern)
- Match detail drill-down (clicking a card navigates to Brackets — not part of this panel)
- Spectator controls or score editing from the Overview panel

## Architecture (CTO Analysis)

**Backend — new endpoint:**

File: `src/Esportra.Api/Endpoints/MatchSystemEndpoints.cs` (or `TournamentEndpoints.cs` if co-locating)

```
GET /api/tournaments/{id:guid}/active-matches
RequireAuthorization("Authenticated")
```

SQL:
```sql
SELECT
    bm.id,
    bm.match_number,
    bm.round,
    bm.best_of,
    bm.status,
    bm.scheduled_time,
    bm.started_at,
    bm.team1_name,
    bm.team2_name,
    bm.team1_score,
    bm.team2_score,
    bv.bracket_type,
    ts.name AS stage_name,
    ts.id AS stage_id
FROM brkt_matches bm
JOIN brkt_versions bv ON bv.id = bm.version_id
JOIN tournament_stages ts ON ts.id = bv.stage_id
JOIN tournaments t ON t.id = ts.tournament_id
WHERE ts.tournament_id = @id
  AND bm.status = 'in_progress'
ORDER BY bm.started_at DESC NULLS LAST
```

Auth check: user must be authenticated + either organizer or tournament is viewable (can use existing `CanManageTournamentAsync` or simply require `Authenticated` since RLS on `brkt_matches` already enforces visibility).

Response DTO (new or reuse `MatchResponse` + add `stage_name`, `bracket_type`):
```csharp
public sealed record ActiveMatchResponse(
    Guid Id,
    int MatchNumber,
    int Round,
    int BestOf,
    string Status,
    DateTime? ScheduledTime,
    DateTime? StartedAt,
    string? Team1Name,
    string? Team2Name,
    int Team1Score,
    int Team2Score,
    string? BracketType,
    string StageName,
    Guid StageId
);
```

**Frontend — hook:**

`src/hooks/useActiveMatches.ts`:
```ts
export function useActiveMatches(tournamentId: string) {
  return useQuery({
    queryKey: ['active-matches', tournamentId],
    queryFn: () => apiClient.get<ActiveMatch[]>(`/api/tournaments/${tournamentId}/active-matches`),
    refetchInterval: 30_000,
    enabled: !!tournamentId,
  });
}
```

**Frontend — OverviewPanel section:**

Use `ReadOnlyMatchCard` (already exists at `src/components/bracket/ReadOnlyMatchCard.tsx`) — lightweight, no actions. Render one card per active match. Show stage name as a label above each card. Empty state: "No matches currently in progress."

Show section only when tournament status is `'ongoing'`. Hide entirely for `'draft'`, `'published'`, `'open'`, `'completed'`.

## Product Requirements (CPO Analysis)

**User story:** As a tournament organizer, when I open my tournament dashboard, I want to immediately see which matches are currently happening so I can monitor the tournament's progress without hunting through bracket pages.

**Acceptance criteria:**
1. When tournament is `ongoing` and has `in_progress` bracket matches, the Overview panel shows an "Active Matches" section listing all of them
2. Each match shows: stage name, round label, team names, current score, best-of indicator
3. If no matches are in progress, the section shows an empty state ("No live matches right now")
4. If tournament is not `ongoing`, the section is hidden entirely
5. Data refreshes every 30 seconds automatically
6. BR tournaments show the section only if they have bracket stages (not all BR tournaments have bracket stages)

**Success criteria:**
- Organizer can confirm a match is live without leaving the Overview panel
- Score updates are visible within 30s of a change

## Executive Insights

**Security (CIO):** `brkt_matches` already has RLS. The new endpoint must require `Authenticated` auth and filter by tournament ownership or participant status. No new attack surface beyond reading match status and team names — both already public within a tournament's context. Use parameterized query only (already confirmed in pattern above). Low risk.

**Cost (CFO):** Single SQL query with indexed join chain (`version_id`, `stage_id`, `tournament_id` all have FK indexes). Polling at 30s interval is consistent with existing bracket views. No additional infrastructure cost.

**Operations (COO):** Straightforward addition to an existing panel. No migration required (reads only). No operational complexity.

## Conflicts Requiring CEO Decision

No conflicts — scope is small and well-defined.

## Agent Assignments

- Senior Backend Engineer → new endpoint + DTO
- Senior Frontend Engineer → `useActiveMatches` hook + OverviewPanel section using ReadOnlyMatchCard

## Risks

- `ReadOnlyMatchCard` may require a prop shape that doesn't exactly match the new DTO — need to check actual props before wiring. Low risk, quick fix if needed.
- BR tournaments with no bracket stages will show "No live matches" — this is correct behavior.

## Success Criteria

Organizer opens Overview panel during an ongoing tournament and can see all currently running matches with team names and scores, refreshing automatically every 30 seconds.

## Acceptance Criteria

1. `GET /api/tournaments/{id}/active-matches` returns all `in_progress` brkt_matches for the tournament across all stages
2. Response includes: match_number, round, team1_name, team2_name, team1_score, team2_score, best_of, stage_name, started_at
3. Overview panel shows "Active Matches" section when tournament is `ongoing`
4. Each match rendered with ReadOnlyMatchCard
5. Section hidden when tournament is not `ongoing`
6. Empty state shown when no matches in progress
7. Auto-refresh every 30s
8. Endpoint requires authentication; unauthorized returns 401
