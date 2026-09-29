# PROPOSAL: PROJ-035 — Tournament Dashboard Completeness & Settings Consolidation

**Created:** 2026-09-28
**Status:** APPROVED

---

## Objective

The tournament organizer dashboard has 9 confirmed bugs, 13 data round-trip gaps, and an information architecture that splits related concepts across unrelated panels. Organizers who create a tournament via the wizard find that settings silently vanish, appear in wrong panels, or cannot be edited at all. This project fixes every data round-trip bug, consolidates the IA (map pool/veto merges into Settings, all check-in controls move to Registration), makes prize distribution editable post-creation, and removes dead wizard fields that collect data and throw it away. No new features — only correctness and coherence.

---

## Information Architecture — Canonical Panel Assignments

This is the single source of truth for where every setting lives after this project:

```
BASIC INFO
  name, description, game (read-only), game mode (read-only),
  start/end dates, registration deadline, status, isOnline,
  venue, region  [ADD: region — in PUT but no panel]

FORMAT & STAGES
  stages, format, team size, max teams, BR scoring config,
  rules textarea  [ADD: rules — in PUT but no panel]

BRANDING
  banner, logo,
  stream URL  [MOVE: from Settings → Branding; fix storage path]

PRIZE & PAYOUTS
  currency, prize pool, entry fee, payout method,
  payment instructions  [ADD: in PUT but no panel]
  manual payout notes  [ADD: in PUT but no panel]
  prize distribution editor (template picker + placement table)  [ADD: hooks exist, no UI]
  payout records (existing — read-only management)

REGISTRATION
  max capacity, registration deadline
  --- Check-In (ALL consolidated here) ---
  check-in toggle (on/off)  [MOVE: from Settings]
  check-in level (none/tournament/match/both)  [MOVE: from Settings]
  check-in window minutes  [ADD: wizard sets it, no dashboard panel]
  check-in deadline  [already here]
  auto-remove unchecked  [already here]
  --- Invites ---
  invited teams toggle  [ADD: in PUT but no panel]
  reserved invite slots  [ADD: in PUT but no panel]
  invite expiry days  [ADD: in PUT but no panel]

SETTINGS  (no more "Map Veto" nav item — merged here)
  score reported by  [already here]
  assisted match reporting  [BUG FIX: key mismatch]
  required account links  [ADD: in PUT but no panel]
  discord link count  [ADD: in PUT but no panel]
  discord webhook URL  [already here]
  server region  [ADD: extend UpdateTournamentRequest]
  map veto toggle  [already here]
  └─ Map Pool (inline, visible when mapVetoEnabled=true)  [MOVE+FIX: from separate nav item, fix storage path]
```

**Removed from nav:** `map-veto` item (merged into Settings — nav goes from 8 → 7 config items)
**Removed from wizard:** `discordUrl`, `twitterUrl` (dead — no API field), `seedingType`, `thirdPlaceMatch` (dead — no API field)

---

## Scope

**In scope:**
- Fix all 9 confirmed data bugs (assistedReportingEnabled key mismatch, streamUrl wrong storage, map pool divergence, prize distribution locked, autoRemoveUnchecked wizard UPDATE gap, dead wizard fields, serverRegion update-only, checkInWindowMinutes hidden)
- Migrate check-in controls entirely into Registration panel
- Merge Map Pool section into Settings panel (delete MapVetoPanel.tsx as separate panel)
- Surface missing fields: rules, region, paymentInstructions, manualPayoutNotes, reservedInviteSlots, inviteExpiryDays, checkInWindowMinutes, requiredAccountLinks, discordLinkCount, streamUrl (correct path), serverRegion
- Prize distribution editor in Prize & Payouts (template picker + editable placement table using existing endpoints)
- Extend `UpdateTournamentRequest` to accept `serverRegion`
- Fix map pool to use `tournament_map_pools` table (not settings JSONB)
- Remove dead wizard fields (discordUrl, twitterUrl, seedingType, thirdPlaceMatch)
- DashboardTournament type completeness (add missing fields)

**Out of scope:**
- Veto sequence builder (ban/pick order config) — deferred
- New wizard steps or wizard UI redesign
- Payment processing / escrow release
- Format & Stages editor overhaul
- Fields not already in the schema
- Mobile-specific responsive redesign

---

## Architecture (CTO Analysis)

**9 bugs, prioritized by operational risk:**

| # | Bug | Impact | Fix location |
|---|-----|--------|-------------|
| 3 | Map pool storage divergence | CRITICAL — veto engine reads from DB table, dashboard writes to JSONB — two pools diverge, veto runs against wrong maps | Frontend: MapVetoPanel merge, switch to correct endpoint |
| 1 | assistedMatchReporting key mismatch | HIGH — wizard sets `assistedReportingEnabled`, panel reads `assistedMatchReporting` — toggle always shows off for wizard-created tournaments | Frontend: rename key in AdvancedSettingsPanel |
| 5 | autoRemoveUnchecked dropped in wizard UPDATE | HIGH — silently reverts auto-remove policy on any wizard re-edit during live event | Frontend: one-line fix in useTournamentWizard.ts |
| 4 | Prize distribution uneditable | HIGH — POST endpoint + hooks exist, no UI calls them | Frontend: build editor in PrizePayoutsPanel |
| 2 | streamUrl wrong storage path | MEDIUM — column vs JSONB; panel always shows blank after wizard creation | Frontend: read from tournament.stream_url, send as top-level PUT field |
| 9 | checkInWindowMinutes not shown | MEDIUM — organizers can't adjust match check-in window from dashboard | Frontend: add to RegistrationPanel |
| 8 | serverRegion not in UPDATE | MEDIUM — locked after creation, no post-creation edit path | Backend: add to UpdateTournamentRequest + SQL |
| 6 | discordUrl/twitterUrl dead | LOW — phantom fields waste organizer time, erode trust | Frontend: remove from wizard |
| 7 | seedingType/thirdPlaceMatch dead | LOW — same pattern | Frontend: remove from wizard + type |

**Panel consolidation file changes:**

| File | Action |
|------|--------|
| `panels/MapVetoPanel.tsx` | DELETE — absorbed into AdvancedSettingsPanel |
| `panels/AdvancedSettingsPanel.tsx` | ADD map pool section; REMOVE check-in level; FIX assistedMatchReporting key; ADD requiredAccountLinks, discordLinkCount, serverRegion |
| `panels/RegistrationPanel.tsx` | ADD check-in toggle + level + window; ADD invite fields; REMOVE cross-link to Settings |
| `panels/BrandingPanel.tsx` | ADD streamUrl (read from column, write via top-level PUT) |
| `panels/BasicInfoPanel.tsx` | ADD rules textarea, region field |
| `panels/PrizePayoutsPanel.tsx` | ADD prize distribution editor + payment instructions + payout notes |
| `TournamentDashboardNav.tsx` | REMOVE map-veto entry |
| `PanelRouter.tsx` | REMOVE map-veto case + MapVetoPanel import |
| `hooks/useTournamentDashboard.ts` | ADD missing fields to DashboardTournament interface |
| `hooks/useTournamentWizard.ts` | ADD autoRemoveUnchecked to UPDATE path |
| `wizard/StepBranding.tsx` | REMOVE discordUrl, twitterUrl |
| `types/tournamentWizard.ts` | REMOVE seedingType, thirdPlaceMatch, discordUrl, twitterUrl |
| `wizard/StepReview.tsx` | REMOVE display of dead fields |
| **Backend** `TournamentEndpoints.cs` | ADD ServerRegion to UpdateTournamentRequest + SQL SET clause |

**Map pool canonical approach:** Dashboard Settings panel will use `GET /api/tournaments/{id}/map-pool` to read current pool and `PUT /api/tournaments/{id}/map-pools` to save — identical to the wizard. The `settings.mapPoolIds` JSONB key is deprecated (no new writes; existing values ignored). No migration needed for existing data — the DB table rows are correct; the JSONB was the error.

**Prize distribution editor:** Inline section in PrizePayoutsPanel. Template picker (calls `usePrizeDistributionTemplates`) → populates editable placement table (position, label, %, optional reward text). Total must equal 100%. Save calls `useSavePrizeDistribution`. Amber warning shown for ongoing/completed tournaments. No backend changes — all endpoints already exist.

**Estimated effort:** ~2-3 days frontend, ~0.5 day backend.

---

## Product Requirements (CPO Analysis)

**12 user stories** — key ones:

- **US-1:** Every wizard-set value appears in its correct dashboard panel on first load — zero re-entry required
- **US-2:** All check-in settings (toggle, level, window, deadline, auto-remove) live in Registration — no context switch to Settings
- **US-3:** Prize distribution editable post-creation with template picker
- **US-4:** Map pool in Settings (no separate nav item)
- **US-5–12:** See full requirements file at `handoffs/TASK-001-cpo-product-requirements.md`

**28 acceptance criteria** — summarized:
- AC-01: Full round-trip — every wizard field visible in correct dashboard panel
- AC-02–05: All storage path bugs fixed (assisted reporting, streamUrl, mapPool, autoRemoveUnchecked)
- AC-06–09: Registration owns all check-in controls; Settings has none
- AC-10–13: map-veto nav item removed; Settings has inline map pool section; MapVetoPanel.tsx deleted
- AC-14–17: Prize distribution editable; payment instructions + payout notes in panel
- AC-18–22: Missing fields surfaced (invites, streamUrl, rules, serverRegion, account links)
- AC-23–24: Dead wizard fields removed
- AC-25–28: Backend fixes (serverRegion in UPDATE, canonical keys for assisted reporting, streamUrl, mapPoolIds)

---

## Executive Insights

**COO:** The operationally most dangerous bug is the **map pool storage divergence** — the veto engine reads from the `tournament_map_pools` DB table while the dashboard MapVetoPanel writes to `settings.mapPoolIds` JSONB. These are independent stores. A tournament where the organizer configures maps via the dashboard will run veto sequences against the wrong (or empty) pool, producing incorrect competitive results. The **autoRemoveUnchecked silent revert** is the second most dangerous for live events — any wizard re-edit during an active tournament resets the auto-remove policy, forcing manual intervention to clear no-show participants under time pressure. Prize distribution being locked is a moderate operational risk — sponsors frequently request split adjustments late, and organizers currently have no self-service path. No cleanup migration is required for existing data: the DB table rows are correct and the column values are intact; only the frontend was reading from the wrong paths.

---

## Conflicts Requiring CEO Decision

No conflicts — CTO, CPO, and COO are fully aligned on approach, panel assignments, and prioritization.

**One design recommendation for CEO awareness:**

The **registrationDeadline** field currently appears in both BasicInfoPanel (dates section) and RegistrationPanel. The CTO recommends removing it from BasicInfo to eliminate dual-editing. The CPO agrees. If you prefer to keep it in Basic Info as a convenience (for the "dates at a glance" UX), we can keep it in both panels as read-only in BasicInfo and editable only in Registration.

---

## Agent Assignments

- Senior Software Architect → architecture design + component structure
- Senior Backend Engineer → UpdateTournamentRequest extension (serverRegion), assisted reporting key canonicalization
- Senior Frontend Engineer → all panel changes, MapVetoPanel deletion, wizard dead field removal
- Creative Lead → design brief for prize distribution editor + Registration panel consolidation
- QA Lead → full panel regression + round-trip verification
- Senior Security QA → verify no new attack surface on prize distribution editor

---

## Risks

1. **Existing organizer data** — tournaments created before this fix have maps in the DB table; after fix the Settings panel will correctly read the table. No data migration needed.
2. **JSONB key normalization** — `settings.assistedMatchReporting` keys written by the old dashboard remain in the DB. The fix uses a read-time fallback (`assistedMatchReporting || assistedReportingEnabled`) so existing tournaments display correctly.
3. **PrizeDistributionTab impact** — the existing read-only payout management section (mark paid/rejected/distributed) must remain functional when prize distribution editor is added to the same panel. These are separate UI sections and separate endpoints — no conflict.
4. **RegistrationDeadline dual-presence** — if kept in both panels, dirty-state logic must not conflict (only one panel writes it at a time).

---

## Success Criteria

- Organizer creates via wizard → opens dashboard → every value is in the correct panel, no blanks, no wrong values
- Zero cross-panel navigation needed to configure check-in
- Prize distribution editable from dashboard
- Config nav has 7 items (not 8) — Map Pool & Veto is gone as a standalone item
- All 9 bugs resolved, verified by QA on staging

## Acceptance Criteria

See full 28-item list in `handoffs/TASK-001-cpo-product-requirements.md`.
