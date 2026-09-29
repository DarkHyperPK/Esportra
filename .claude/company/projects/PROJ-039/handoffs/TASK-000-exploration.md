# TASK-000: Codebase Exploration — PROJ-039 Frontend Redesign Integration

## Summary

Audited all API-touching files across PRs #13–#16 (tip: `origin/claude/stage-setup-wizard`). One confirmed bug found. All other contracts match.

## PR #13 — Dashboard Shell + Nav + Overview

### OverviewPanel.tsx — PASS
Pure layout component. Takes `model: TournamentOverviewModel` (pre-computed), `onNavigateTab`. No direct API calls.

### useTournamentOverviewModel.ts — PASS
Composes data from `useTournamentDashboard` + `useTournamentInvitations` + pure service functions. Uses `useTournamentInvitations(tournament?.id, { list: true })` — correct hook. All data fields match `DashboardTournament`/`DashboardParticipant` shape.

### attention.ts — PASS
Pure function. No API calls. Derives attention items from counts passed in.

### TournamentDashboard.tsx — PASS
Uses `useTournamentDashboard(slug)`, `useTournamentAccess(slug)`, `useTournamentOverviewModel(...)`. All hooks exist. New props `overview` and `onNavigateTab` passed to PanelRouter match its interface.

### dashboardNav.ts — PASS
Pure nav config. No API calls. Drives nav visibility from permission flags.

## PR #14 — Design Kit + Create Flow

### QuickCreateForm.tsx — PASS
Calls `apiClient.post('/api/tournaments', {...})`. Payload uses camelCase correctly.

### useTournamentWizard.ts — **FAIL** (1 bug)
**Line ~350:** `apiClient.put(\`/api/tournaments/${tournamentId}/map-pools\`, { mapIds })` — URL is `/map-pools` (plural). Backend endpoint is `PUT /api/tournaments/{id}/map-pool` (singular). This will 404 on the UPDATE path when saving map pool from the full wizard.

CREATE path is fine — `mapPoolIds` is sent inside the main `POST /api/tournaments` body, which the backend handles.

### Kit components (tone.ts, Field, ChoiceCard, etc.) — N/A
No API calls. Pure UI components.

## PR #15 — Dashboard Panels

### BasicInfoPanel.tsx — PASS
PUT payload: `{ name, description, startDate, endDate, region }` — all camelCase, matches backend `UpdateTournamentRequest`.

### PrizePayoutsPanel.tsx — PASS
PUT payload: `{ currency, prizePool, entryFee, payoutMethod, paymentInstructions, manualPayoutNotes, settings }` — all camelCase. Correct.

### AdvancedSettingsPanel.tsx — PASS
- Map pool GET: `apiClient.get<{ id: string }[]>(\`/api/tournaments/${id}/map-pool\`)` — correct URL, correct response shape.
- Map pool PUT: `apiClient.put(\`/api/tournaments/${id}/map-pool\`, { mapIds })` — correct URL.
- Tournament PUT payload: `{ assistedReportingEnabled, requiredAccountLinks, discordLinkCount, serverRegion, settings }` — camelCase. Correct.

### ParticipantsPanel.tsx — PASS
Check-in: `apiClient.post(\`/api/tournaments/${id}/participants/${pid}/check-in\`, {})` — correct URL. Backend now accepts 'registered' status.

### InvitationsPanel.tsx — PASS
Uses `useTournamentInvitations` hook. All 5 operations (draft, send, revoke, resend, importCsv) use the hook's correct API paths.

### RegistrationPanel.tsx — PASS
PUT payload: `{ maxTeams, registrationDeadline, checkInRequired, checkInDeadline, autoRemoveUnchecked, reservedInviteSlots, inviteExpiryDays, settings }` — all camelCase. Correct.

### BrandingPanel.tsx — PASS
PUT payload: `{ bannerUrl, logoUrl, streamUrl }` — camelCase. Correct.

### StaffPanel.tsx — PASS
No direct API calls (delegates to existing staff hooks).

### PanelRouter.tsx — PASS
New props: `overview: TournamentOverviewModel`, `onNavigateTab`. All cases route correctly. OverviewPanel receives `model` and `onNavigateTab`.

## PR #16 — Stage Setup Wizard

### stageSetupRules.ts — PASS
Pure logic. No API calls.

### StageSetupWizard.tsx — PASS
Delegates stage saving to existing hooks/endpoints. No direct API URL references.

## Bugs Found

| # | File | Line | Issue | Severity |
|---|------|------|-------|----------|
| 1 | `src/hooks/useTournamentWizard.ts` | ~350 | URL `/map-pools` should be `/map-pool` (singular) | HIGH — 404 on wizard update |

## Integration Notes

- The PRs introduce a `useDirtyState` context from `TournamentDashboardShell` — panels call `setDirty(isDirty)` for unsaved-changes guard. This is self-contained within the PR.
- `PanelSaveBar` is a new shared component for config panels' save/discard UX.
- `DashboardTournament` type in the PR is comprehensive and matches our backend response.
- Kit components (`src/components/ui/kit/`) are pure UI with no API interaction.
- The PR's `tone.ts` moved from `tournament-manage/` to `ui/kit/` — the old location is removed.
