# PROJ-035 — Codebase Exploration

## FILE INVENTORY

**Wizard steps (src/components/tournament/wizard/)**
- StepBasicInfo.tsx, StepFormatRules.tsx, StepBranding.tsx, StepPrizeDistribution.tsx, StepRegistration.tsx, StepSettings.tsx, StepReview.tsx

**Dashboard panels (src/components/organizer/tournament-manage/panels/)**
- OverviewPanel, BasicInfoPanel, BrandingPanel, RegistrationPanel, PrizePayoutsPanel, AdvancedSettingsPanel, MapVetoPanel, FormatStagesPanel, SchedulePanel, StaffPanel, ParticipantsPanel

---

## WIZARD STEP FIELDS

### Step 1 — Basic Info
name, game (locked in edit), gameMode (locked in edit), teamSize, isOnline, venue (LAN only), region (locked in edit), launchState (draft/private/public), startDate+startTime, endDate+endTime, status (edit only)

### Step 2 — Format & Rules
stages (InlineStageEditor, locked after creation), maxTeams, mapPoolIds (TournamentMapPoolSelector), **rules** (textarea — tournament rules text), teamSize, BR fields: brScoringPreset, brCustomScoring, brKillCap, brTiebreaker

### Step 3 — Branding
bannerUrl, description (required, 20–5000 chars), discordUrl (**DEAD — never submitted**), twitterUrl (**DEAD — never submitted**), streamUrl → stored in `tournaments.stream_url` column

### Step 4 — Prize Distribution
currency (locked in edit), prizePool (locked in edit), entryFee (locked in edit), paymentInstructions, payoutMethod, manualPayoutNotes, prizeDistribution (PrizeDistributionConfig — **READ-ONLY in edit mode**)

### Step 5 — Registration
registrationCloses (datetime), checkInRequired (switch), checkInWindowMinutes (number, shown when checkInRequired), autoRemoveUnchecked (switch), invitedTeamsEnabled (switch), reservedInviteSlots, inviteExpiryDays

### Step 6 — Settings
mapVetoEnabled (switch, game-gated), assistedMatchReporting (switch, game-gated), requiredAccountLinks (select), serverRegion (CS2 only), discordLinkCount (switch+select)

---

## DASHBOARD PANELS — FIELDS & API CALLS

### BasicInfoPanel
Shows: name, description, startDate, endDate, registrationDeadline
PUT fields: name, description, startDate, endDate, registrationDeadline

### BrandingPanel
Shows: bannerUrl, logoUrl (logo is dashboard-only — wizard has no logo step)
PUT fields: bannerUrl, logoUrl

### RegistrationPanel
Shows: maxTeams, registrationDeadline, checkInDeadline, autoRemoveUnchecked (last two only when check_in_required=true)
**NOT shown:** checkInWindowMinutes, registrationOpens, reservedInviteSlots, inviteExpiryDays, invitedTeamsEnabled
PUT fields: maxTeams, registrationDeadline, checkInDeadline, autoRemoveUnchecked

### PrizePayoutsPanel
Shows: currency, prize_pool, entry_fee, payout_method
PUT fields: currency, prize_pool, entry_fee, settings.payoutMethod
Also embeds PrizeDistributionTab (read-only display of prize_distribution, payout records, reward distributions)
**NO edit UI for prize_distribution** despite useSavePrizeDistribution hook existing

### AdvancedSettingsPanel (currently "Settings" tab)
Shows: scoreReportedBy, checkInLevel (enum), mapVetoEnabled, assistedMatchReporting, discordWebhookUrl, streamUrl
PUT: checkInRequired (derived), settings.{scoreReportedBy, checkInLevel, mapVetoEnabled, assistedMatchReporting, discordWebhookUrl, streamUrl}

### MapVetoPanel
Shows: map pool selector (reads GET /api/games/maps?game=...)
Reads: tournament.settings.mapPoolIds (JSONB)
PUT: settings.mapPoolIds (JSONB only — diverges from DB table)

---

## CONFIRMED BUGS

**BUG 1 — assistedMatchReporting key mismatch:**
Wizard writes `settings.assistedReportingEnabled`. Dashboard panel reads/writes `settings.assistedMatchReporting`. Different keys → wizard-enabled value shows as disabled in dashboard.

**BUG 2 — streamUrl storage mismatch:**
Wizard → `tournaments.stream_url` column. Dashboard reads `settings.streamUrl` (JSONB). Column never read by Settings panel. Always shows blank after wizard creation.

**BUG 3 — Map pool storage divergence:**
Wizard → `tournament_map_pools` DB table (via InsertMapPoolAsync). MapVetoPanel reads/writes `settings.mapPoolIds` JSONB. After wizard creation, panel shows empty pool.

**BUG 4 — Prize distribution uneditable after creation:**
`PUT /api/tournaments/{id}/prize-distribution` endpoint exists. `useSavePrizeDistribution` hook exists. No UI calls either.

**BUG 5 — autoRemoveUnchecked dropped in wizard UPDATE path:**
CREATE payload includes it. UPDATE (useTournamentWizard.ts edit path) does NOT. Wizard edits silently revert this field.

**BUG 6 — discordUrl / twitterUrl dead fields:**
StepBranding collects them. Submit handler omits them. No API field exists.

**BUG 7 — seedingType / thirdPlaceMatch dead fields:**
In TournamentWizardData, shown in StepReview, but no API field and never submitted.

**BUG 8 — serverRegion only on CREATE:**
In CreateTournamentRequest. Missing from UpdateTournamentRequest. No dashboard panel.

**BUG 9 — checkInWindowMinutes no dashboard UI:**
Stored as settings.checkInWindowMinutes by wizard. No dashboard panel reads or edits it.

---

## DATA ROUND-TRIP GAPS

| Wizard field | Storage location | Dashboard gap |
|---|---|---|
| discordUrl | NOWHERE (silently dropped) | Dead field — never stored |
| twitterUrl | NOWHERE (silently dropped) | Dead field — never stored |
| streamUrl | tournaments.stream_url column | Panel reads wrong path (JSONB) |
| checkInWindowMinutes | settings JSONB | No dashboard UI |
| registrationOpens | settings.registrationOpensAt | No dashboard UI |
| seedingType | NOWHERE | Dead field |
| thirdPlaceMatch | NOWHERE | Dead field |
| serverRegion | tournaments.server_region | No update path, no dashboard panel |
| prizeDistribution | tournaments.prize_distribution | No dashboard edit UI |
| paymentInstructions | tournaments.payment_instructions | No dashboard panel |
| mapPoolIds | tournament_map_pools table | Panel reads wrong path (JSONB) |
| rules | tournaments.rules (via top-level field) | No dashboard panel shows it |

---

## BACKEND ENDPOINT SUMMARY

### UpdateTournamentRequest — accepted fields
Name, Description, Game, Format, GameMode, Status, MaxTeams, TeamSize, EntryFee, PrizePool, StartDate, EndDate, RegistrationDeadline, BannerUrl, LogoUrl, Region, IsPublic, CheckInRequired, CheckInDeadline, AutoRemoveUnchecked, Rewards, StreamUrl, Rules, DeletedAt, ClearDeletedAt, Settings (JSONB), PaymentInstructions, Currency, WinnerTeamName, ReservedInviteSlots, InviteExpiryDays, PrizeDistribution, PayoutMethod, ManualPayoutNotes, AssistedReportingEnabled, RequiredAccountLinks, DiscordLinkCount

### In CreateTournamentRequest but NOT UpdateTournamentRequest
- serverRegion, TournamentType, TemplateId, VenueAddress

### Prize/distribution endpoints
- GET/PUT/DELETE /api/tournaments/{id}/prize-distribution ← useSavePrizeDistribution exists but NO UI calls it
- GET /api/tournaments/{id}/prize-distribution/templates ← hook exists but NO UI calls it
- PUT /api/tournaments/{id}/map-pools ← wizard edit path only, NOT used by dashboard MapVetoPanel
