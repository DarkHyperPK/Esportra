# PROJ-035 — CPO Product Requirements

## Executive Summary

The tournament dashboard has 9 confirmed bugs, 13 data round-trip gaps, and an information architecture that splits related concepts across unrelated panels. This project consolidates the organizer dashboard so every wizard-created value is visible and editable in the correct panel, removes dead UI, and merges the Map Pool & Veto panel into Settings.

---

## 1. User Stories

### US-1: Wizard-to-Dashboard Data Continuity
**As an organizer**, when I create a tournament through the wizard, I expect every value I configured to appear in the correct dashboard panel without re-entering anything.

_Motivation:_ Currently 13 fields set in the wizard are either invisible, stored at the wrong path, or point to a different key in the dashboard. The organizer loses trust in the tool when values silently vanish.

### US-2: Check-In Consolidation
**As an organizer**, I should be able to configure all check-in settings (toggle on/off, level, window size, deadline, auto-remove unchecked) from the Registration panel, because check-in is about participant readiness — not "advanced settings."

_Motivation:_ Currently the check-in toggle and level selector live in Settings, while deadline and auto-remove live in Registration. The Registration panel displays a "go to Settings to enable" message, forcing a context switch for a single conceptual workflow.

### US-3: Editable Prize Distribution
**As an organizer**, I should be able to edit prize distribution percentages, placement rewards, and payout notes from the Prize & Payouts panel after tournament creation, using the same template picker available during creation.

_Motivation:_ The backend endpoint (`PUT /api/tournaments/{id}/prize-distribution`) and the frontend hook (`useSavePrizeDistribution`) both exist. No UI calls either. The organizer currently has zero ability to adjust prize splits post-creation.

### US-4: Map Pool & Veto in Settings
**As an organizer**, I should find map pool selection and veto configuration inside the Settings tab, not as a separate navigation item, because map/veto is a game-rule setting — not a standalone workflow.

_Motivation:_ The CEO explicitly requires this. Map Pool & Veto is a dependent sub-feature (gated by `mapVetoEnabled` toggle already in Settings), so it belongs inside the same panel.

### US-5: Stream URL Visibility
**As an organizer**, the stream URL I set during tournament creation should be visible and editable in the correct panel without having to re-enter it.

_Motivation:_ BUG 2 — wizard stores to `tournaments.stream_url` column; Settings panel reads `settings.streamUrl` (JSONB). Always blank on dashboard after wizard creation.

### US-6: Assisted Reporting Consistency
**As an organizer**, if I enable assisted match reporting during creation, it should show as enabled when I open the dashboard Settings panel.

_Motivation:_ BUG 1 — wizard writes `settings.assistedReportingEnabled`; dashboard reads `settings.assistedMatchReporting`. Key mismatch causes the value to silently reset to off.

### US-7: Map Pool Data Integrity
**As an organizer**, the map pool I selected during creation should appear correctly in the dashboard (now inside Settings), not show as empty.

_Motivation:_ BUG 3 — wizard inserts into `tournament_map_pools` DB table; MapVetoPanel reads from `settings.mapPoolIds` JSONB. Two different storage mechanisms for the same concept.

### US-8: Tournament Rules Editing
**As an organizer**, I should be able to view and edit the tournament rules text from the dashboard after creation.

_Motivation:_ Wizard Step 2 collects `rules` (textarea) and stores it. No dashboard panel displays or edits it. The field exists in `UpdateTournamentRequest` but has no UI.

### US-9: Missing Registration Fields
**As an organizer**, I should be able to view and edit registration-related fields (checkInWindowMinutes, invitedTeamsEnabled, reservedInviteSlots, inviteExpiryDays) from the Registration panel.

_Motivation:_ These are set in the wizard but have no dashboard UI. Organizers cannot adjust invite slots or check-in window after creation.

### US-10: Payment Instructions & Manual Payout Notes
**As an organizer**, I should be able to edit payment instructions and manual payout notes from the Prize & Payouts panel.

_Motivation:_ Both fields exist in the backend update request but have no dashboard UI. Organizers who chose "manual" payout need to be able to update disbursement instructions.

### US-11: Dead Field Cleanup
**As an organizer**, I should not see form fields that do nothing (discordUrl, twitterUrl, seedingType, thirdPlaceMatch in the wizard), because phantom controls erode trust in the platform.

_Motivation:_ BUGs 6 and 7 — these fields are collected in the wizard but silently dropped on submit. They waste organizer time and create false expectations.

### US-12: Server Region Editing
**As an organizer**, I should be able to view and edit the server region after tournament creation.

_Motivation:_ BUG 8 — `serverRegion` exists in `CreateTournamentRequest` but not in `UpdateTournamentRequest`. No dashboard panel shows it. Organizers who need to change region are stuck.

---

## 2. Information Architecture — Canonical Panel Assignment

### Mental Model

The dashboard navigation splits into two conceptual groups that already exist: **Operations** (running the event) and **Configuration** (defining the event). The IA decision below assigns every setting to exactly one Configuration panel based on a simple organizer question: "What am I configuring?"

| Panel | Organizer Question | Contents |
|---|---|---|
| **Basic Info** | "What is this tournament?" | name, description, game (read-only), game mode (read-only), start/end dates, registration deadline, status, isOnline, venue, region |
| **Format & Stages** | "How does competition work?" | stages, format, team size, max teams, rules (textarea), BR scoring (preset, custom, kill cap, tiebreaker) |
| **Branding** | "What does it look like?" | banner, logo, stream URL |
| **Prize & Payouts** | "What do winners get?" | currency, prize pool, entry fee, payout method, payment instructions, manual payout notes, prize distribution (editable with template picker), payout records |
| **Registration** | "Who can join, and when are they ready?" | registration deadline, registration opens, max capacity, check-in toggle (on/off), check-in level (none/tournament/match/both), check-in window (minutes), check-in deadline, auto-remove unchecked, invited teams toggle, reserved invite slots, invite expiry days |
| **Settings** | "What are the game rules and technical knobs?" | score reported by, map veto toggle, **map pool selector** (inline, shown when veto enabled), **veto sequence config**, assisted match reporting, discord webhook URL, required account links, discord link count, server region |
| **Staff** | "Who helps me run this?" | (unchanged) |

### Key IA Decisions

**Check-in moves entirely to Registration.** The Settings panel currently owns the check-in level selector and derives `checkInRequired` from it. This is wrong — check-in is a participant-readiness concept, not a game-rule concept. After the move:
- Registration panel gains: check-in toggle (on/off), check-in level (tournament/match/both), check-in window (minutes), check-in deadline, auto-remove unchecked
- Settings panel loses: check-in level selector and its associated `checkInRequired` derivation
- The "Off — enable in Settings" cross-link text in Registration is removed entirely

**Map Pool & Veto merges into Settings as a collapsible section.** The standalone `map-veto` nav item is removed. Inside Settings, when `mapVetoEnabled` is toggled on, an inline section expands showing the map pool selector (using the existing `TournamentMapPoolSelector` component) and eventually the veto sequence configuration. This keeps the toggle and its dependent config co-located.

**Stream URL moves to Branding.** The stream URL is a public-facing tournament identity element (like the banner or description). It belongs in Branding, not buried in Settings JSONB. The Settings panel stops showing it.

**Rules moves to Format & Stages.** The rules textarea is a competition-rules concept. It belongs alongside format and scoring configuration, not in Basic Info.

**Server Region goes to Settings.** It is a technical config knob (which infrastructure region to route matches through). The backend `UpdateTournamentRequest` must be extended to accept it.

### Navigation After This Project

**OPERATIONS:** Overview, Participants, Brackets, Standings, Schedule, Games (BR), Announcements, Bans, Disputes, Payments

**CONFIGURATION:** Basic Info, Format & Stages, Branding, Prize & Payouts, Registration, Staff, Settings

The `map-veto` nav item is removed. Total configuration items goes from 8 to 7.

---

## 3. Acceptance Criteria

### Data Round-Trip Integrity

**AC-01.** Every field set during wizard creation is visible in its assigned dashboard panel on first load, with no re-entry required. The full field list is enumerated in the panel assignment table above.

**AC-02.** The `assistedReportingEnabled` / `assistedMatchReporting` key mismatch is resolved. A single canonical key is used in both wizard submission and dashboard read/write. Existing tournaments with the old key are handled via a migration or read-time fallback.

**AC-03.** `streamUrl` uses a single canonical storage path. The wizard and the Branding panel (its new home) both read/write the same location. Existing tournaments with `stream_url` column data display correctly.

**AC-04.** Map pool uses a single canonical storage path. The wizard and the Settings panel (map pool section) both read/write the same source. Existing tournaments with `tournament_map_pools` table rows display correctly.

**AC-05.** `autoRemoveUnchecked` is included in the wizard UPDATE path (edit mode), not just the CREATE path.

### Check-In Consolidation

**AC-06.** The Registration panel contains: check-in toggle (on/off), check-in level selector (none/tournament/match/both), check-in window (minutes), check-in deadline (datetime), and auto-remove unchecked (switch).

**AC-07.** The Settings panel no longer contains any check-in controls (no level selector, no derived `checkInRequired`).

**AC-08.** The "Off — enable in Settings" cross-link in Registration is removed. The toggle is now inline in Registration.

**AC-09.** `checkInWindowMinutes` (wizard-created) is visible and editable in Registration.

### Map Pool & Veto in Settings

**AC-10.** The `map-veto` nav item is removed from `CONFIGURATION_NAV` in `TournamentDashboardNav.tsx`.

**AC-11.** The Settings panel shows an inline map pool section (using `TournamentMapPoolSelector`) that is conditionally visible when `mapVetoEnabled` is true.

**AC-12.** Saving in the Settings panel persists both settings toggles AND the map pool selection in a single PUT call.

**AC-13.** The `MapVetoPanel.tsx` file and its PanelRouter route are removed (no dead code).

### Prize Distribution Editing

**AC-14.** The Prize & Payouts panel displays the current prize distribution with an "Edit" action that opens the distribution editor (same component used in the wizard).

**AC-15.** The distribution editor allows selecting from distribution templates (via the existing `/api/tournaments/{id}/prize-distribution/templates` endpoint) or manual entry.

**AC-16.** Saving prize distribution calls `PUT /api/tournaments/{id}/prize-distribution` (existing endpoint) and refreshes the panel.

**AC-17.** `paymentInstructions` and `manualPayoutNotes` are visible and editable in Prize & Payouts.

### Missing Fields Surfaced

**AC-18.** Registration panel shows `invitedTeamsEnabled` (toggle), `reservedInviteSlots` (number), and `inviteExpiryDays` (number) — all editable.

**AC-19.** Branding panel shows `streamUrl` (input field), reading from the canonical storage path.

**AC-20.** Format & Stages panel shows `rules` (textarea), editable.

**AC-21.** Settings panel shows `serverRegion` (select or input), editable. Backend `UpdateTournamentRequest` accepts `serverRegion`.

**AC-22.** Settings panel shows `requiredAccountLinks` and `discordLinkCount`, reading from the correct keys.

### Dead Field Cleanup

**AC-23.** `discordUrl` and `twitterUrl` fields are removed from the wizard `StepBranding` form. No ghost inputs remain.

**AC-24.** `seedingType` and `thirdPlaceMatch` are removed from `TournamentWizardData` and `StepReview`. No ghost display remains.

### Backend Fixes

**AC-25.** `UpdateTournamentRequest` accepts `serverRegion`, allowing post-creation edits.

**AC-26.** The settings JSONB write path uses one canonical key for assisted reporting (recommendation: `assistedReportingEnabled` to match the wizard, with a read-time fallback for `assistedMatchReporting`).

**AC-27.** Stream URL read/write in the dashboard uses the canonical path (recommendation: `tournaments.stream_url` column as source of truth, with the settings panel reading from the column, not JSONB).

**AC-28.** Map pool read/write in the dashboard uses the canonical path (recommendation: `tournament_map_pools` table as source of truth, with a query to hydrate the selector. The JSONB `mapPoolIds` key is deprecated).

---

## 4. Out of Scope

- **New wizard steps or wizard UI redesign.** Only bug fixes (dead field removal, missing field in UPDATE path) touch the wizard. No new steps.
- **Veto sequence builder UI.** The veto sequence configuration (ban/pick order, BO counts) is a separate feature. This project only moves the map pool selector into Settings; full veto-sequence editing is deferred.
- **Prize distribution payment processing.** Editing distribution percentages is in scope; building actual payment rails or escrow release flows is not.
- **Format & Stages editor overhaul.** Adding the `rules` textarea to this panel is in scope; redesigning the stage editor or inline stage configuration is not.
- **New fields not in the current schema.** If a field does not currently exist in the wizard, backend request, or database, it is not added. This project is about surfacing and fixing what already exists.
- **Mobile-specific responsive redesign.** The panels should work at mobile widths (they already do via the existing responsive grid), but no mobile-specific UX work is in scope.
- **Completion state / publish-readiness recalculation.** The `CompletionBadge` system may need minor updates if panels change shape, but a redesign of the completion-state engine is out of scope.

---

## 5. Success Criteria

### Organizer Confidence (Primary)
The organizer creates a tournament via wizard, navigates to the dashboard, and **every value they set is visible in the correct panel** without any "where did my setting go?" moments. Round-trip test: set all wizard fields, save, reload dashboard, verify all values appear. Zero data loss.

### Zero Cross-Panel Context Switching for Check-In
The organizer configures all check-in settings (enable, level, window, deadline, auto-remove) without ever leaving the Registration panel. The Settings tab has no check-in controls.

### Post-Creation Prize Editing
The organizer can change prize distribution splits after creation (before payout). The edit flow uses familiar template picker + manual override. Save persists and the read-only display updates immediately.

### Reduced Navigation Cognitive Load
Configuration nav goes from 8 items to 7 (Map Pool & Veto merged into Settings). The organizer's mental model maps to fewer, more logical groupings.

### Bug Regression
All 9 confirmed bugs are resolved. Specifically:
- Assisted reporting toggle reflects wizard value (BUG 1)
- Stream URL visible after wizard creation (BUG 2)
- Map pool visible after wizard creation (BUG 3)
- Prize distribution editable (BUG 4)
- autoRemoveUnchecked persists through wizard edit (BUG 5)
- Dead fields removed from wizard (BUGs 6, 7)
- Server region editable post-creation (BUG 8)
- Check-in window visible in dashboard (BUG 9)

### Measurable (Post-Ship)
- Support tickets about "my settings disappeared" drop to zero
- Time-to-configure (wizard + dashboard adjustments) decreases by removing the need for redundant re-entry
- No new bugs introduced in panels that were not modified
