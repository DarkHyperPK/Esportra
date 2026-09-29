# PROJ-035 — Implementation Complete

**Status:** HANDOFF
**Date:** 2026-09-28

## Files Changed

### Backend (`d:/esportra-backend`)
- `src/Esportra.Api/Endpoints/TournamentEndpoints.cs`
  - Added `string? ServerRegion = null` to `UpdateTournamentRequest` record
  - Added `server_region = COALESCE(@serverRegion, server_region)` to UPDATE SQL SET clause
  - Added `server_region` to RETURNING clause
  - Added `serverRegion = req.ServerRegion` to Dapper anonymous params

### Frontend (`d:/frag-and-book-main`)
- `src/hooks/useTournamentDashboard.ts` — Added missing fields to `DashboardTournament`: `stream_url`, `rules`, `region`, `server_region`, `payment_instructions`, `manual_payout_notes`, `check_in_window_minutes`
- `src/components/organizer/tournament-manage/panels/AdvancedSettingsPanel.tsx` — Full rewrite:
  - Fixed `assistedMatchReporting` → `assistedReportingEnabled` (BUG 1 fix) with fallback for old key
  - Removed check-in level block (moved to Registration)
  - Removed streamUrl (moved to Branding)
  - Added server region input field
  - Added requiredAccountLinks + discordLinkCount fields
  - Added inline map pool section using correct `GET /api/tournaments/{id}/map-pool` + `PUT /api/tournaments/{id}/map-pools` endpoints (BUG 3 fix)
  - Sends `assistedReportingEnabled` as top-level field (not in settings JSONB)
- `src/components/organizer/tournament-manage/panels/RegistrationPanel.tsx` — Full rewrite:
  - Added check-in level selector (none/tournament/match/both) — moved from Settings
  - Added checkInWindowMinutes field (BUG 9 fix)
  - Removed "Off — enable in Settings" cross-link
  - Added invitedTeamsEnabled toggle
  - Added reservedInviteSlots and inviteExpiryDays fields
  - Sends `checkInRequired` derived from `checkInLevel`
  - Sends `checkInLevel` and `checkInWindowMinutes` to settings JSONB
- `src/components/organizer/tournament-manage/panels/BrandingPanel.tsx`:
  - Added `streamUrl` field reading from `tournament.stream_url` column (BUG 2 fix)
  - Sends as top-level `streamUrl` PUT field
- `src/components/organizer/tournament-manage/panels/BasicInfoPanel.tsx`:
  - Removed `registrationDeadline` (CEO decision — Registration only)
  - Added `region` field
- `src/hooks/useTournamentWizard.ts`:
  - Added `autoRemoveUnchecked: data.autoRemoveUnchecked` to UPDATE path (BUG 5 fix)
- `src/types/tournamentWizard.ts`:
  - Removed dead fields: `discordUrl`, `twitterUrl`, `seedingType`, `thirdPlaceMatch` (BUGs 6/7 fix)
  - Added `requiredAccountLinks` field
- `src/components/tournament/wizard/StepBranding.tsx`:
  - Removed Discord URL and Twitter URL inputs
  - Simplified to stream URL only
- `src/components/tournament/wizard/StepReview.tsx`:
  - Removed seeding/third-place display, removed `SEEDING_TYPE_LABELS` import
- `src/schemas/tournamentSchema.ts`:
  - Removed `seedingType` and `thirdPlaceMatch` from format schema
  - Removed `discordUrl` and `twitterUrl` from branding schema
- `src/utils/wizardValidation.ts`:
  - Removed `discordUrl`/`twitterUrl` from field labels and step map
- `src/pages/tournaments/Edit.tsx`:
  - Removed dead field assignments (`seedingType`, `thirdPlaceMatch`, `discordUrl`, `twitterUrl`)

## Bugs Fixed
- BUG 1: assistedMatchReporting key mismatch — FIXED (fallback read + canonical write)
- BUG 2: streamUrl wrong storage path — FIXED (BrandingPanel reads tournament.stream_url column)
- BUG 3: Map pool storage divergence — FIXED (AdvancedSettingsPanel uses tournament_map_pools table)
- BUG 5: autoRemoveUnchecked dropped in wizard UPDATE — FIXED
- BUG 6/7: Dead wizard fields (discordUrl, twitterUrl, seedingType, thirdPlaceMatch) — REMOVED
- BUG 8: serverRegion not in UPDATE — FIXED (backend + frontend)
- BUG 9: checkInWindowMinutes no dashboard UI — FIXED

## Bug 4 Status
BUG 4 (prize distribution editor) — NOT YET IMPLEMENTED. The PrizePayoutsPanel still needs the distribution editor + payment instructions. Deferred — can be added in a follow-up.

## Verification
- `dotnet build` passes (0 errors, 4 pre-existing warnings)
- `dotnet format --verify-no-changes` exits 0
- `npx tsc --noEmit` — no new errors introduced by these changes (pre-existing bracket component errors unrelated)
