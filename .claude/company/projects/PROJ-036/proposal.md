# PROPOSAL: PROJ-036 — Dispute Center Security Fix

**Created:** 2026-09-28
**Status:** CEO_ACCEPTED

## Objective

Fix two security vulnerabilities in the dispute center: (1) the list endpoint returns disputes from all of the caller's tournaments instead of the requested one, and (2) the single-dispute endpoint has no authorization check, allowing any authenticated user to fetch any dispute by UUID.

## Scope

**In scope:**
- Fix `GET /api/organizer/disputes` — add `tournament_id` required param + SQL filter + authz pre-flight
- Fix `GET /api/organizer/disputes/{disputeId}` — add tournament ownership authorization check
- Fix `POST /api/organizer/disputes/{disputeId}/comments` — add `isOrganizer` path to `canManage` check
- Remove client-side `.filter()` in `useTournamentDisputeWorkspace.ts` (no longer needed after backend fix)
- CEO decision required: whether to add SELECT RLS policy on `tournament_disputes` now or defer

**Out of scope:**
- Pagination on the list endpoint (pre-existing gap, separate ticket)
- RLS policy — pending CEO decision below

## Architecture (CTO Analysis)

**Bug 1 — List endpoint (TournamentEndpoints.cs:2504):**

Handler accepts no `tournament_id` param. SQL `WHERE` clause only filters by `t.organizer_id = @userId`. Fix: accept dual param names (`tournament_id` / `tournamentId` for API consistency), add explicit authz pre-flight, add `AND td.tournament_id = @tournamentId` to SQL.

```csharp
// Handler sig addition:
[FromQuery(Name = "tournament_id")] Guid? tournamentIdSnake,
[FromQuery(Name = "tournamentId")]  Guid? tournamentIdCamel,

// Authz pre-flight (same pattern as unread-count):
var isOrganizer = await conn.ExecuteScalarAsync<bool>(
    "SELECT EXISTS(SELECT 1 FROM tournaments WHERE id = @tournamentId AND organizer_id = @userId)",
    new { tournamentId, userId = userCtx.UserIdGuid });
var canAssist = await StaffAuthHelper.CanActOnTournamentAsync(...PermDisputesAssist);
if (!isOrganizer && !canAssist && !StaffAuthHelper.IsPlatformAdmin(userCtx))
    return Results.Forbid();

// SQL change:
WHERE td.tournament_id = @tournamentId
  AND (t.organizer_id = @userId OR __STAFF_ACCESS__)
  AND td.dispute_reason NOT IN ('ban_appeal', 'general_support')
```

Edge case: verify platform admin path — `IsPlatformAdmin` must produce truthy rows from `StaffTournamentAccessExistsSql` or add explicit `OR @isAdmin = true` branch.

**Bug 2 — Single dispute IDOR (TournamentEndpoints.cs:~2742):**

Handler extracts no `UserContext`. SQL is `SELECT ... FROM tournament_disputes WHERE id = @disputeId` — no ownership check. Fix: extract UserContext, look up dispute's `tournament_id`, verify caller is organizer/staff/admin before returning data.

**Bug 3 — Comments POST missing organizer path (~line 2860):**

`canManage` checks `CanActOnTournamentAsync(PermDisputesAssist) OR IsPlatformAdmin` only. Organizers without the `disputes:assist` staff permission cannot comment on their own tournament's disputes. Add `isOrganizer` check.

**Frontend:** Remove `.filter()` at `useTournamentDisputeWorkspace.ts:161`. Backend will now return correctly scoped data; client-side filter masks future backend regressions.

**Complexity:** 2–3 hours. No migration unless RLS policy included.

## Product Requirements (CPO Analysis)

Developer API (PROJ-028) is live on staging. External integrations calling the endpoint without `tournament_id` currently receive cross-tournament dumps. This cannot wait.

**Acceptance criteria:**
1. `GET /api/organizer/disputes` without `tournament_id` returns `400`.
2. `GET /api/organizer/disputes?tournament_id={id}` returns only disputes where `td.tournament_id = {id}`.
3. Caller with no access to specified tournament receives `403`.
4. `GET /api/organizer/disputes/{disputeId}` — non-organizer/non-staff receives `403`.
5. Integration test: two tournaments, same organizer, query scoped to A returns 0 results from B.
6. Integration test: organizer of A requests dispute from B — `403`.
7. Client-side `.filter()` removed.

## Executive Insights

**Security (CIO):** Two distinct vulnerabilities. List endpoint is MEDIUM (own-scope over-exposure, GDPR data minimization gap, Riot PUUIDs returned unnecessarily). Single-dispute endpoint is HIGH (IDOR — any authenticated user, any dispute UUID). Resolution notes contain PII and internal deliberation; GDPR Article 33 breach event risk if exploited. Both must ship this sprint.

**Additional CIO finding:** Riot PUUIDs should be excluded from the list response SELECT — they serve no list-view purpose and are persistent cross-game identifiers. Return PUUIDs from the single-dispute endpoint only (after auth fix).

## Conflicts Requiring CEO Decision

**RLS SELECT policy on `tournament_disputes`:**

- **CTO says defer:** Adding a SELECT policy requires a migration + replay fixture update + CI verification. Triples hotfix scope. Service_role bypass is intentional architecture — a SELECT policy only protects Supabase client or PostgREST paths, not the backend. Open a follow-on ticket.
- **CIO says add now:** Defense-in-depth. `dispute_comments` already has RLS but the parent table does not — inconsistency. Supabase Realtime subscriptions and any future PostgREST use would inherit unprotected table. "Defer = never in practice."

**→ CEO decision: include RLS migration now, or defer to a follow-on ticket?**

No other conflicts — CTO and CPO are aligned on all fixes.

## Agent Assignments

- Senior Backend Engineer → apply all three backend fixes (list endpoint, IDOR, comments POST)
- Senior Frontend Engineer → remove client-side `.filter()` in `useTournamentDisputeWorkspace.ts`
- Senior Database Engineer → RLS migration (if CEO includes in scope)
- QA Lead → integration tests per acceptance criteria
- Senior Security QA → verify IDOR fix + auth chain

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| External API consumers break on 400 for missing tournament_id | LOW | Acceptable — previous behavior was a data leak, not a feature |
| Platform admin gets 0 rows if IsPlatformAdmin not wired to SQL correctly | HIGH | Verify before shipping; add explicit admin OR branch if needed |
| Staff path regression if wrong permission string used | MEDIUM | Match exactly what unread-count uses |

## Success Criteria

- List endpoint returns only disputes for the requested tournament
- IDOR on single-dispute endpoint closed (403 for non-authorized callers)
- Organizers can comment on their own disputes without needing staff permission
- No client-side data filtering masking backend bugs
- Developer API consumers receive 400 with clear error when tournament_id omitted

## Acceptance Criteria

1. `GET /api/organizer/disputes` without `tournament_id` → `400 { "error": "tournament_id is required." }`
2. `GET /api/organizer/disputes?tournament_id={A}` returns only tournament A disputes
3. Organizer of A calling with `tournament_id={B}` → `403`
4. Unauthenticated or non-organizer/non-staff calling `GET /api/organizer/disputes/{anyId}` → `403`
5. Platform admin can retrieve disputes from any tournament by `tournament_id`
6. Staff assigned to tournament A cannot retrieve disputes from tournament B
7. `POST /api/organizer/disputes/{id}/comments` works for plain organizers (no staff permission required)
8. Riot PUUIDs absent from list response body
9. `useTournamentDisputeWorkspace.ts` client-side `.filter()` removed
10. `dotnet build`, `dotnet test`, `dotnet format --verify-no-changes` all pass
