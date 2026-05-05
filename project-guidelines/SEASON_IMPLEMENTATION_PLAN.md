# Season Feature — Complete Implementation Plan

> **Status:** Phases 1-3 (Foundation) Complete, Phases 4-8 Remaining
> **Date:** May 5, 2026
> **Goal:** Complete all remaining phases per D:\season-plan.txt

---

## Implementation Strategy

**Order of Execution:**
1. Phase 2 (Backend Services) — Core logic foundation
2. Phase 3 (API Layer) — Expose backend services
3. Phase 6 (Player Experience) — High-value public features
4. Phase 5 (Season Management) — Organizer tools
5. Phase 4 (Wizard Redesign) — Polish creator experience
6. Phase 7 (Admin Tools) — Operations support
7. Phase 8 (Testing) — Verification and hardening

**Rationale:**
- Backend services (Phase 2) must exist before APIs (Phase 3)
- Public APIs (Phase 3) required for player experience (Phase 6)
- Player experience is highest value for adoption
- Testing (Phase 8) last to verify everything works

---

## Phase 2: Backend Services (Complete)

### 2.1 Advancement Processor Service

**Objective:** Automatically process team advancement when tournaments complete.

**Files to Create:**
- `src/Esportra.Core/Season/SeasonAdvancementProcessor.cs` — Core advancement logic
- `src/Esportra.Core/Season/SeasonAdvancementRuleEvaluator.cs` — Rule evaluation (top N, percentage, points, manual)
- `src/Esportra.Core/Season/SeasonSeedingService.cs` — Seeding logic (preserve, reseed, randomize, manual)

**Files to Modify:**
- `src/Esportra.Api/Endpoints/SeasonEndpoints.cs` — Add advancement processing endpoint
- `src/Esportra.Infrastructure/Migrations/Scripts/` — Add trigger or worker migration if needed

**Implementation Steps:**

1. **Create SeasonAdvancementProcessor.cs**
   ```csharp
   public class SeasonAdvancementProcessor
   {
       public async Task ProcessTournamentCompletion(Guid tournamentId, CancellationToken ct)
       {
           // 1. Load tournament final standings
           // 2. Load outgoing advancement connections
           // 3. For each connection, evaluate rule
           // 4. Create advancement records
           // 5. Add teams to target tournament
           // 6. Seed teams based on seed mode
           // 7. Update season standings
           // 8. Write audit log
       }
   }
   ```

2. **Create SeasonAdvancementRuleEvaluator.cs**
   ```csharp
   public class SeasonAdvancementRuleEvaluator
   {
       public List<AdvancementDecision> Evaluate(
           List<TeamStanding> standings,
           AdvancementConnection connection
       ) {
           // Handle: top_n, top_percentage, points_threshold, manual_selection
       }
   }
   ```

3. **Create SeasonSeedingService.cs**
   ```csharp
   public class SeasonSeedingService
   {
       public void SeedTeams(
           List<Guid> teamIds,
           Guid targetTournamentId,
           SeedMode mode
       ) {
           // Handle: preserve_seed, reseed_by_points, randomize, manual
       }
   }
   ```

4. **Add API Endpoint**
   ```csharp
   app.MapPost("/api/seasons/{id}/advancement/process", async (
       Guid seasonId,
       Guid tournamentId,
       IDbConnectionFactory db,
       SeasonAdvancementProcessor processor,
       CancellationToken ct
   ) => {
       await processor.ProcessTournamentCompletion(tournamentId, ct);
       return Results.Ok();
   }).RequireAuthorization();
   ```

5. **Integration with Tournament Completion**
   - Hook into tournament completion workflow (existing tournament service)
   - Call advancement processor when tournament status changes to "completed"

**Validation:**
- Rule evaluation produces correct team counts
- Seeding respects seed mode
- Transaction rollback on failure
- Audit log entries created

---

### 2.2 Notification Hooks

**Objective:** Send notifications for season events (published, qualified, eliminated, etc.).

**Files to Create:**
- `src/Esportra.Core/Season/SeasonNotificationService.cs` — Notification orchestration
- `src/Esportra.Core/Season/SeasonNotificationTemplates.cs` — Email/in-app templates

**Files to Modify:**
- `src/Esportra.Api/Endpoints/SeasonEndpoints.cs` — Call notification service on mutations
- Existing notification infrastructure (if any)

**Implementation Steps:**

1. **Create SeasonNotificationService.cs**
   ```csharp
   public class SeasonNotificationService
   {
       public async Task NotifySeasonPublished(Guid seasonId, List<Guid> participantIds);
       public async Task NotifyTeamAdvanced(Guid advancementRecordId);
       public async Task NotifyTeamEliminated(Guid teamId, Guid seasonId);
       public async Task NotifyTournamentStarting(Guid tournamentId, List<Guid> teamIds);
       public async Task NotifyScheduleChanged(Guid seasonId);
       public async Task NotifyManualOverride(Guid overrideId, List<Guid> affectedTeamIds);
   }
   ```

2. **Create SeasonNotificationTemplates.cs**
   - Email templates for each notification type
   - In-app notification templates

3. **Integrate with Endpoints**
   - Call `NotifySeasonPublished` after publish
   - Call `NotifyTeamAdvanced` after advancement record creation
   - Call `NotifyTeamEliminated` after elimination

**Validation:**
- Notifications sent to correct recipients
- Templates render correctly
- Resend integration works (if using Resend)
- In-app notifications appear

---

## Phase 3: API Layer (Complete)

### 3.1 Public APIs

**Objective:** Expose public season data for player discovery.

**Files to Modify:**
- `src/Esportra.Api/Endpoints/SeasonEndpoints.cs` — Add public endpoints

**Endpoints to Add:**

```csharp
// GET /api/public/seasons — Discovery
app.MapGet("/api/public/seasons", async (
    string? game,
    string? status,
    IDbConnectionFactory db,
    CancellationToken ct
) => {
    // Return public, published seasons only
    // Pagination support
    // Filter by game, status
});

// GET /api/public/seasons/:slug — Public season page
app.MapGet("/api/public/seasons/{slug}", async (
    string slug,
    IDbConnectionFactory db,
    CancellationToken ct
) => {
    // Return season details, tournaments, standings
    // Only if is_public=true and status=published/active/completed
});

// GET /api/public/seasons/:id/tournaments — Tournament list
app.MapGet("/api/public/seasons/{id}/tournaments", async (
    Guid id,
    IDbConnectionFactory db,
    CancellationToken ct
) => {
    // Return season_tournaments with tournament details
});

// GET /api/public/seasons/:id/standings — Standings
app.MapGet("/api/public/seasons/{id}/standings", async (
    Guid id,
    IDbConnectionFactory db,
    CancellationToken ct
) => {
    // Return season_standings ordered by rank
});

// GET /api/public/seasons/:id/team/:teamId/path — Team journey
app.MapGet("/api/public/seasons/{id}/team/{teamId}/path", async (
    Guid id,
    Guid teamId,
    IDbConnectionFactory db,
    CancellationToken ct
) => {
    // Return advancement records for this team
    // Show their path through the season
});
```

**Validation:**
- Draft seasons not exposed
- Private seasons not exposed
- Pagination works
- Slug lookup works

---

### 3.2 Admin APIs

**Objective:** Admin tools for season moderation and overrides.

**Files to Modify:**
- `src/Esportra.Api/Endpoints/SeasonEndpoints.cs` — Add admin endpoints

**Endpoints to Add:**

```csharp
// PATCH /api/admin/seasons/:id/status — Force status change
app.MapPatch("/api/admin/seasons/{id}/status", async (
    Guid id,
    string status,
    string reason,
    IDbConnectionFactory db,
    CancellationToken ct
) => {
    // Require admin role
    // Write audit log
    // Allow status override even if normally blocked
}).RequireAuthorization("Admin");

// GET /api/admin/seasons/:id/audit — Admin audit view
app.MapGet("/api/admin/seasons/{id}/audit", async (
    Guid id,
    IDbConnectionFactory db,
    CancellationToken ct
) => {
    // Return full audit log for season
    // Include IP, user agent, before/after values
}).RequireAuthorization("Admin");

// POST /api/admin/seasons/:id/force-advancement — Manual override
app.MapPost("/api/admin/seasons/{id}/force-advancement", async (
    Guid id,
    ForceAdvancementRequest request,
    IDbConnectionFactory db,
    SeasonAdvancementProcessor processor,
    CancellationToken ct
) => {
    // Require admin role
    // Create manual advancement record
    // Write audit log
    // Notify affected teams
}).RequireAuthorization("Admin");
```

**Validation:**
- Authorization enforced
- Audit logs written
- Manual override works

---

### 3.3 Advancement APIs

**Objective:** Dedicated endpoints for advancement management.

**Files to Modify:**
- `src/Esportra.Api/Endpoints/SeasonEndpoints.cs` — Add advancement endpoints

**Endpoints to Add:**

```csharp
// GET /api/seasons/:id/advancement — Advancement connections
app.MapGet("/api/seasons/{id}/advancement", async (
    Guid id,
    IDbConnectionFactory db,
    CancellationToken ct
) => {
    // Return all advancement connections for season
    // Include source/target tournament details
}).RequireAuthorization();

// POST /api/seasons/:id/advancement/validate — Validate graph
app.MapPost("/api/seasons/{id}/advancement/validate", async (
    Guid id,
    IDbConnectionFactory db,
    CancellationToken ct
) => {
    // Run graph validation
    // Check for cycles, invalid targets, capacity issues
    // Return validation result with errors
}).RequireAuthorization();

// POST /api/seasons/:id/advancement/manual-override — Manual override
app.MapPost("/api/seasons/:id}/advancement/manual-override", async (
    Guid id,
    ManualOverrideRequest request,
    IDbConnectionFactory db,
    SeasonAdvancementProcessor processor,
    CancellationToken ct
) => {
    // Require season admin role
    // Create manual advancement record
    // Write audit log
    // Notify affected teams
}).RequireAuthorization();
```

**Validation:**
- Graph validation catches cycles
- Manual override requires reason
- Authorization enforced

---

### 3.4 Idempotency

**Objective:** Prevent duplicate operations on retry.

**Files to Modify:**
- `src/Esportra.Api/Endpoints/SeasonEndpoints.cs` — Add idempotency keys
- `src/Esportra.Infrastructure/Migrations/Scripts/` — Add idempotency table

**Implementation:**

1. **Create idempotency table**
   ```sql
   CREATE TABLE season_idempotency_keys (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       key TEXT NOT NULL UNIQUE,
       endpoint TEXT NOT NULL,
       request_payload JSONB,
       response_payload JSONB,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       expires_at TIMESTAMPTZ
   );
   CREATE INDEX idx_season_idempotency_key ON season_idempotency_keys(key);
   CREATE INDEX idx_season_idempotency_expires ON season_idempotency_keys(expires_at);
   ```

2. **Add idempotency middleware to publish endpoint**
   ```csharp
   app.MapPost("/api/seasons/{id}/publish", async (
       Guid id,
       [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
       PublishSeasonRequest request,
       IDbConnectionFactory db,
       CancellationToken ct
   ) => {
       if (!string.IsNullOrEmpty(idempotencyKey))
       {
           // Check if key exists
           // If yes, return cached response
           // If no, proceed and store response
       }
       // ... existing publish logic
   });
   ```

**Validation:**
- Duplicate publish with same key returns same result
- Keys expire after 24 hours
- No duplicate tournaments created

---

## Phase 6: Player Experience (Complete)

### 6.1 Public Season Page

**Objective:** Rich public page for players to discover and follow seasons.

**Files to Create:**
- `src/pages/seasons/SeasonPublic.tsx` — Main public season page
- `src/components/season/public/SeasonHero.tsx` — Hero section with banner
- `src/components/season/public/SeasonTournamentFlow.tsx` — Visual tournament flow
- `src/components/season/public/SeasonStandingsPublic.tsx` — Public standings view
- `src/components/season/public/SeasonSchedule.tsx` — Schedule timeline

**Files to Modify:**
- `src/App.tsx` — Add public season route
- `src/hooks/useSeasons.ts` — Add public season hooks

**Implementation Steps:**

1. **Create usePublicSeason hook**
   ```typescript
   export function usePublicSeason(slug: string) {
       return useQuery({
           queryKey: ['publicSeason', slug],
           queryFn: () => apiClient.get(`/api/public/seasons/${slug}`)
       });
   }
   ```

2. **Create SeasonPublic.tsx**
   ```typescript
   export default function SeasonPublic() {
       const { slug } = useParams();
       const { data: season } = usePublicSeason(slug!);
       const { data: tournaments } = usePublicSeasonTournaments(season.id);
       const { data: standings } = usePublicSeasonStandings(season.id);

       return (
           <div>
               <SeasonHero season={season} />
               <SeasonTournamentFlow tournaments={tournaments} />
               <SeasonStandingsPublic standings={standings} />
               <SeasonSchedule tournaments={tournaments} />
           </div>
       );
   }
   ```

3. **Create SeasonHero.tsx**
   - Banner image
   - Season name, game, dates
   - Registration status
   - Call-to-action (register for qualifiers)

4. **Create SeasonTournamentFlow.tsx**
   - Visual flow diagram (similar to structure builder but read-only)
   - Show advancement paths
   - Lock status for future events
   - Click to view tournament details

5. **Create SeasonStandingsPublic.tsx**
   - Table with team/player names, points, rank, status
   - Filter by region
   - Pagination for large standings

6. **Create SeasonSchedule.tsx**
   - Timeline view of all tournaments
   - Show dates, locations, registration windows
   - Highlight upcoming events

**Validation:**
- Public page loads for published seasons
- Draft seasons return 404
- Standings render correctly
- Tournament flow visualizes correctly

---

### 6.2 Team Journey

**Objective:** Show a team's path through the season.

**Files to Create:**
- `src/components/season/public/TeamJourney.tsx` — Team journey visualization

**Implementation:**

```typescript
export function TeamJourney({ seasonId, teamId }: { seasonId: string; teamId: string }) {
    const { data: path } = useTeamJourney(seasonId, teamId);

    return (
        <div className="space-y-4">
            {path.map((record) => (
                <div key={record.id} className="flex items-center gap-4">
                    <div className="w-32">{record.sourceTournamentName}</div>
                    <ArrowRight />
                    <div className="w-32">{record.destinationTournamentName}</div>
                    <Badge>{record.status}</Badge>
                </div>
            ))}
        </div>
    );
}
```

**Validation:**
- Shows all advancement records for team
- Shows qualification status
- Shows elimination points

---

### 6.3 Qualifier Registration

**Objective:** Allow players to register for qualifiers from season page.

**Files to Modify:**
- `src/components/season/public/SeasonTournamentFlow.tsx` — Add register buttons
- Existing tournament registration flow

**Implementation:**

1. **Add register button to tournament cards**
   - Only show if tournament is open for registration
   - Link to tournament registration page
   - Show "Locked" if not qualified

2. **Locked state UI**
   ```typescript
   if (tournament.locked) {
       return (
           <div className="text-gray-400">
               {tournament.name} is locked. Qualify from {tournament.sourceTournament} to enter.
           </div>
       );
   }
   ```

**Validation:**
- Register button appears for open tournaments
- Locked state shows correct message
- Registration flow works

---

### 6.4 Locked/Unlocked States

**Objective:** Visual indication of tournament accessibility.

**Files to Modify:**
- `src/components/season/public/SeasonTournamentFlow.tsx` — Add locked/unlocked badges

**Implementation:**

```typescript
function TournamentCard({ tournament, userStatus }: Props) {
    const isLocked = tournament.locked;
    const isUnlocked = userStatus === 'qualified';

    return (
        <div className={`card ${isLocked ? 'opacity-50' : ''}`}>
            <Badge variant={isUnlocked ? 'success' : isLocked ? 'locked' : 'default'}>
                {isUnlocked ? 'Unlocked' : isLocked ? 'Locked' : 'Open'}
            </Badge>
            {/* ... */}
        </div>
    );
}
```

**Validation:**
- Locked tournaments grayed out
- Unlocked tournaments highlighted
- Open tournaments show normal state

---

## Phase 5: Season Management (Complete)

### 5.1 Announcements

**Objective:** Send announcements to season participants.

**Files to Create:**
- `src/Esportra.Infrastructure/Migrations/Scripts/20260505XXXXXX_season_announcements.sql` — Announcements table
- `src/components/season/management/SeasonAnnouncements.tsx` — Announcements management UI
- `src/hooks/useSeasonAnnouncements.ts` — Announcements hooks

**Files to Modify:**
- `src/Esportra.Api/Endpoints/SeasonEndpoints.cs` — Add announcements endpoints
- `src/pages/organizer/SeasonManage.tsx` — Wire up announcements tab

**Implementation Steps:**

1. **Create announcements table**
   ```sql
   CREATE TABLE season_announcements (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
       title TEXT NOT NULL,
       body TEXT NOT NULL,
       target_audience TEXT NOT NULL, -- 'all', 'qualified', 'eliminated', 'specific_tournament'
       target_tournament_id UUID NULL REFERENCES tournaments(id),
       created_by UUID NOT NULL REFERENCES profiles(id),
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );
   CREATE INDEX idx_season_announcements_season ON season_announcements(season_id);
   ```

2. **Add API endpoints**
   ```csharp
   app.MapGet("/api/seasons/{id}/announcements", ...);
   app.MapPost("/api/seasons/{id}/announcements", ...);
   app.MapDelete("/api/seasons/{id}/announcements/{announcementId}", ...);
   ```

3. **Create SeasonAnnouncements.tsx**
   - List existing announcements
   - Create new announcement form
   - Target audience selector (all, qualified, eliminated, specific tournament)
   - Delete button

4. **Integrate with notification service**
   - Send in-app notification when announcement created
   - Send email notification (if enabled)

**Validation:**
- Announcements created and listed
- Target audience filtering works
- Notifications sent

---

### 5.2 Full Advancement Dashboard

**Objective:** Dedicated dashboard for managing advancement.

**Files to Create:**
- `src/components/season/management/SeasonAdvancementDashboard.tsx` — Full advancement management UI

**Files to Modify:**
- `src/pages/organizer/SeasonManage.tsx` — Replace advancement tab with dashboard

**Implementation:**

1. **Create SeasonAdvancementDashboard.tsx**
   - Visual graph of all advancement connections
   - List of all advancement rules
   - Edit rule modal
   - Delete rule button
   - Manual override button
   - Advancement records table (showing actual team movements)

2. **Features**
   - Add new connection (source → target)
   - Edit existing connection (change rule, seed mode)
   - Delete connection
   - View advancement records (who advanced, when, from where)
   - Manual override (add team to tournament manually)
   - Bulk operations (approve all pending, reject all pending)

**Validation:**
- Graph renders correctly
- Rules can be added/edited/deleted
- Advancement records display
- Manual override works

---

## Phase 4: Wizard Redesign (Decision)

### Decision Point: Inline Config vs Separate Wizard

**Current State:** Tournament configuration moved to separate tournament wizard (quick-create from management workspace).

**Plan Called For:** Inline tournament configuration in wizard Step 3.

**Recommendation:** Keep current approach (separate wizard) for these reasons:
1. Separation of concerns — season wizard focuses on structure/advancement
2. Reusability — tournament wizard is already battle-tested
3. Simpler wizard — fewer steps, less overwhelming
4. Quick-create provides convenience — can create tournaments inline from management workspace

**If Inline Config is Desired:**

**Files to Modify:**
- `src/components/season/wizard/SeasonWizard.tsx` — Add Step 3 for tournament config
- `src/components/season/wizard/StepConfigureTournamentsInline.tsx` — New inline config component
- `src/types/seasonWizard.ts` — Add tournament config to wizard data

**Implementation:**
1. Reintroduce Step 3 for tournament configuration
2. Use tournament config fields from `useTournamentWizard`
3. Add bulk config features (apply to all, copy from another)
4. Keep quick-create as alternative for post-publish additions

**Decision:** Document this decision point. Implement only if user explicitly requests inline config.

---

## Phase 7: Admin Tools (Complete)

### 7.1 Admin Audit Trail

**Objective:** Dedicated admin view for season audit logs.

**Files to Create:**
- `src/pages/admin/AdminSeasonAudit.tsx` — Admin audit log viewer

**Files to Modify:**
- `src/Esportra.Api/Endpoints/SeasonEndpoints.cs` — Ensure admin audit endpoint exists
- `src/App.tsx` — Add admin audit route

**Implementation:**

1. **Create AdminSeasonAudit.tsx**
   - Full audit log table
   - Filter by action type, actor, date range
   - Show before/after values
   - Show IP, user agent
   - Export to CSV

2. **Add admin audit endpoint** (if not exists)
   ```csharp
   app.MapGet("/api/admin/seasons/{id}/audit", async (
       Guid id,
       string? action,
       DateTime? from,
       DateTime? to,
       IDbConnectionFactory db,
       CancellationToken ct
   ) => {
       // Return filtered audit log
   }).RequireAuthorization("Admin");
   ```

**Validation:**
- Audit log loads
- Filters work
- Export works

---

### 7.2 Manual Override Interface

**Objective:** Admin UI for manual advancement overrides.

**Files to Create:**
- `src/pages/admin/AdminSeasonOverride.tsx` — Manual override UI

**Implementation:**

1. **Create AdminSeasonOverride.tsx**
   - Select season
   - Select source tournament
   - Select team(s) to advance
   - Select target tournament
   - Enter reason (required)
   - Submit override
   - Show confirmation

2. **Call admin force-advancement endpoint**

**Validation:**
- Override creates advancement record
- Audit log written
- Notification sent

---

### 7.3 Analytics Dashboard

**Objective:** Platform-wide season analytics.

**Files to Create:**
- `src/pages/admin/AdminSeasonAnalytics.tsx` — Analytics dashboard
- `src/Esportra.Api/Endpoints/SeasonEndpoints.cs` — Add analytics endpoints

**Implementation:**

1. **Add analytics endpoints**
   ```csharp
   app.MapGet("/api/admin/seasons/analytics", async (
       IDbConnectionFactory db,
       CancellationToken ct
   ) => {
       // Return:
       // - Most active seasons
       // - Popular games
       // - Season completion rate
       // - Dispute rate
       // - Organizer performance
       // - Season growth over time
   }).RequireAuthorization("Admin");
   ```

2. **Create AdminSeasonAnalytics.tsx**
   - Charts for each metric
   - Date range filters
   - Export to CSV

**Validation:**
- Analytics load
- Charts render
- Filters work

---

## Phase 8: Testing (Complete)

### 8.1 Unit Tests

**Files to Create:**
- `src/Esportra.Core.Tests/Season/SeasonAdvancementProcessorTests.cs`
- `src/Esportra.Core.Tests/Season/SeasonAdvancementRuleEvaluatorTests.cs`
- `src/Esportra.Core.Tests/Season/SeasonSeedingServiceTests.cs`
- `src/__tests__/season/seasonBuilderUtils.test.ts` (expand existing)

**Test Cases:**

1. **Advancement Processor Tests**
   - Process tournament completion creates correct advancement records
   - Process with no connections returns empty
   - Process with multiple connections creates multiple records
   - Transaction rollback on failure

2. **Rule Evaluator Tests**
   - Top N rule returns correct number of teams
   - Top percentage rule returns correct percentage
   - Points threshold rule returns teams above threshold
   - Manual selection returns specified teams

3. **Seeding Service Tests**
   - Preserve seed maintains original order
   - Reseed by points orders by points descending
   - Randomize produces different order each time
   - Manual seed uses provided order

4. **Graph Validation Tests**
   - Cycle detection works
   - Invalid target detection works
   - Capacity validation works

---

### 8.2 Integration Tests

**Files to Create:**
- `src/Esportra.Api.Tests/Season/SeasonPublishIntegrationTests.cs`
- `src/Esportra.Api.Tests/Season/SeasonAdvancementIntegrationTests.cs`

**Test Cases:**

1. **Publish Transaction Tests**
   - Publish creates all tournaments atomically
   - Failed tournament creation rolls back everything
   - Duplicate publish with idempotency key returns same result
   - Publish with no linked tournaments fails

2. **Advancement Processing Tests**
   - Tournament completion processes advancement
   - Manual override creates record and audit log
   - Public endpoints do not expose draft seasons

---

### 8.3 E2E Tests

**Files to Create:**
- `src/e2e/season/seasonCreation.spec.ts`
- `src/e2e/season/seasonPublish.spec.ts`
- `src/e2e/season/seasonAdvancement.spec.ts`
- `src/e2e/season/seasonPublic.spec.ts`

**Test Cases:**

1. **Organizer Flow**
   - Create season with 5 qualifiers, 4 events, 1 grand final
   - Configure tournaments inline (or via quick-create)
   - Connect advancement
   - Publish
   - Confirm all tournaments exist

2. **Player Flow**
   - View public season
   - Register for qualifier
   - Complete qualifier (simulated)
   - Advance to event
   - Advance to final
   - View standings

3. **Admin Flow**
   - View season
   - Inspect audit log
   - Force advancement
   - Archive season

---

### 8.4 Performance Tests

**Files to Create:**
- `src/performance/season/seasonLoadTests.ts`

**Test Cases:**
- 64 tournaments in one season
- 128 advancement connections
- Large standings table (100+ teams)
- Concurrent registrations
- Concurrent publish retry/idempotency

**Tools:** k6, Artillery, or similar

---

### 8.5 Security Tests

**Files to Create:**
- `src/security/season/seasonSecurityTests.ts`

**Test Cases:**
- Cross-org access denied
- Draft season hidden from public
- Unauthorized advancement override denied
- Duplicate publish retry does not duplicate tournaments
- XSS payloads sanitized in descriptions/announcements
- RLS policies enforced (if applicable)

---

### 8.6 Accessibility Tests

**Files to Create:**
- `src/a11y/season/seasonA11yTests.ts`

**Test Cases:**
- Keyboard navigation for flow builder
- Screen reader labels for tournament cards and connections
- No icon-only ambiguous buttons
- Color contrast
- Mobile layout

**Tools:** axe-core, Lighthouse

---

## Implementation Timeline

**Week 1-2: Phase 2 (Backend Services)**
- Advancement processor
- Notification hooks

**Week 3: Phase 3 (API Layer)**
- Public APIs
- Admin APIs
- Advancement APIs
- Idempotency

**Week 4-5: Phase 6 (Player Experience)**
- Public season page
- Team journey
- Registration flow
- Locked/unlocked states

**Week 6: Phase 5 (Season Management)**
- Announcements
- Full advancement dashboard

**Week 7: Phase 7 (Admin Tools)**
- Admin audit trail
- Manual override interface
- Analytics dashboard

**Week 8: Phase 4 (Wizard Redesign)**
- Decision on inline config
- Implement if needed

**Week 9-10: Phase 8 (Testing)**
- Unit tests
- Integration tests
- E2E tests
- Performance tests
- Security tests
- Accessibility tests

**Total: 10 weeks**

---

## Risk Mitigation

1. **Advancement Processor Complexity**
   - Risk: Complex logic, edge cases
   - Mitigation: Extensive unit tests, gradual rollout

2. **Notification Service Integration**
   - Risk: Resend API failures, email deliverability
   - Mitigation: Retry logic, fallback to in-app only

3. **Public API Performance**
   - Risk: Large seasons slow to load
   - Mitigation: Pagination, caching, query optimization

4. **E2E Test Flakiness**
   - Risk: Tests fail intermittently
   - Mitigation: Retry logic, stable test data, proper cleanup

5. **Security Vulnerabilities**
   - Risk: Authorization bypass, XSS
   - Mitigation: Security review, penetration testing

---

## Success Criteria

- All 8 phases complete
- All test suites passing
- Performance targets met (64 tournaments, 128 connections)
- Security audit passed
- Accessibility audit passed
- Public season page live
- Auto-advancement working
- Admin tools operational
