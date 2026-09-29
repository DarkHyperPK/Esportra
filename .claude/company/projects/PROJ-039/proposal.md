# PROPOSAL: PROJ-039 — Frontend Redesign Integration (PRs #13–#16)

**Created:** 2026-09-29
**Status:** APPROVED

## Objective

Review and integrate 4 stacked CEO-authored frontend redesign PRs into staging. Do not alter design, styling, copy, or UX decisions. Fix only integration mismatches between frontend code and backend API contracts.

## Scope

**In scope:**
- Audit every API endpoint URL, request payload, response parser, hook import, and data contract across all 113 files in PRs #13–#16
- Fix integration mismatches (wrong URLs, field name casing, missing exports)
- Merge PRs in order: #13 → #14 → #15 → #16

**Out of scope:**
- Design, styling, copy, or UX changes (CEO constraint)
- Backend changes (PRs are frontend-only)
- New features beyond what the PRs implement

## Architecture (CTO Analysis)

Full contract audit completed across all 4 PRs. **One bug found:**

| File | Line | Bug | Fix |
|------|------|-----|-----|
| `src/hooks/useTournamentWizard.ts` | ~350 | `PUT /api/tournaments/{id}/map-pools` (plural) | Change to `/map-pool` (singular) |

This causes a 404 when saving map pool from the full setup wizard's UPDATE path. The CREATE path is unaffected (sends `mapPoolIds` inside the main POST body).

**All other contracts verified PASS:**
- BasicInfoPanel, PrizePayoutsPanel, AdvancedSettingsPanel, RegistrationPanel, BrandingPanel, StaffPanel — all PUT payloads use correct camelCase field names
- InvitationsPanel — uses `useTournamentInvitations` hook with all 5 correct API paths
- ParticipantsPanel — check-in URL correct
- OverviewPanel — pure layout, no API calls
- useTournamentOverviewModel — composes existing hooks correctly
- QuickCreateForm — POST payload correct
- Stage setup wizard — pure logic, no direct API calls
- Kit components — pure UI, no API interaction

## Product Requirements (CPO Analysis)

The 4 PRs implement a coherent redesign:
1. Dashboard shell with "what needs me" queue, lifecycle track, permission-based nav
2. Design kit with shared components, redesigned create-tournament flow
3. All config panels rebuilt on shared kit with proper save/discard UX
4. Stage setup wizard split from 1,501-line monolith into testable modules

Each PR's acceptance criteria are internally consistent. The only integration risk is the map pool URL bug, which blocks saving map pool from the edit wizard.

## Conflicts Requiring CEO Decision

No conflicts — single bug fix. PRs are ready to merge after the fix.

## Agent Assignments

- Senior Frontend Engineer → fix map-pool URL, merge PRs in order

## Risks

- Merge conflicts between PR branches and current staging (our recent PROJ-038 OverviewPanel changes will conflict with PR #13's OverviewPanel rewrite — PR's version should win since it's the full redesign)
- PR #13's OverviewPanel replaces our active-matches section (PROJ-038) — needs to be re-integrated after merge

## Acceptance Criteria

1. `useTournamentWizard.ts` URL fixed from `/map-pools` to `/map-pool`
2. All 4 PRs merged to staging in order: #13 → #14 → #15 → #16
3. `npm run build` passes after final merge
4. `tsc --noEmit` introduces no new errors
5. PROJ-038 active matches section re-integrated into PR's OverviewPanel
