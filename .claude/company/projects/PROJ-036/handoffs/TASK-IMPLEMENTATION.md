# PROJ-036 — Implementation Handoff

**Status:** HANDOFF
**Date:** 2026-09-28

## Files Changed

### Backend (`d:/esportra-backend`)

**`src/Esportra.Api/Endpoints/TournamentEndpoints.cs`**

1. `GET /api/organizer/disputes` (line ~2504):
   - Added `[FromQuery(Name = "tournament_id")]` + `[FromQuery(Name = "tournamentId")]` dual param
   - Added 400 return if `tournamentId` is null
   - Added explicit authz pre-flight: `isOrganizer` EXISTS check + `CanActOnTournamentAsync(PermDisputesAssist)` + `IsPlatformAdmin`
   - Added `AND td.tournament_id = @tournamentId` as first predicate in SQL WHERE
   - Added `tournamentId` to Dapper params
   - Removed `'puuid', ra.puuid` from riot_accounts JSONB subquery (persistent cross-game identifier, no list-view purpose)

2. `GET /api/organizer/disputes/{disputeId}` (line ~2742):
   - Added `HttpContext ctx` + `UserContext` extraction + 401 guard
   - Added tournament_id lookup from dispute
   - Added `isOrganizer` + `canAssist` + `IsPlatformAdmin` authorization check — returns 403 if not authorized
   - Fixed IDOR: was accessible to any authenticated user

3. `POST /api/organizer/disputes/{disputeId}/comments` (line ~2860):
   - Added `isDisputeOrganizer` EXISTS check
   - Changed `if (!canManage && !IsPlatformAdmin)` to `if (!isDisputeOrganizer && !canManage && !IsPlatformAdmin)`
   - Fixed: plain organizers without `disputes:assist` staff permission can now comment on their own tournament disputes

**`src/Esportra.Infrastructure/Migrations/Scripts/20260928000001_tournament_disputes_select_rls.sql`** (new)
- `ALTER TABLE tournament_disputes ENABLE ROW LEVEL SECURITY`
- SELECT policy `tournament_disputes_select_policy`: allows raised_by_user_id, organizer, assigned_to_user_id, staff with disputes:assist, admins/moderators, service_role
- Pattern matches `dispute_comments` RLS from 20260304000008

### Frontend (`d:/frag-and-book-main`)

**`src/hooks/useTournamentDisputeWorkspace.ts`** (line ~161)
- Removed `d.tournament_id === tournamentId &&` from client-side `.filter()`
- Backend now enforces scoping; filter was masking backend regressions
- Retained `d.raised_by_user_id !== actorUserId` (intentional UI filter: exclude organizer's own submissions)

## Verification

- `dotnet build` passes (0 errors)
- `dotnet format --verify-no-changes` exits 0
- Frontend TS errors are pre-existing bracket component issues unrelated to this change
