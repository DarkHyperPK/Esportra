# Draft Bracket System - Production-Grade Implementation Plan

## Overview
**Purpose**: Allow organizers to create draft/simulation brackets with mock teams to understand the bracket system, test seeding algorithms, and validate bracket configurations before creating real tournaments.

**Target Users**: Tournament organizers, administrators
**Key Benefits**: 
- Low-risk environment to learn bracket system
- Test bracket seeding and progression logic
- Validate bracket configurations before deployment
- Reduce errors in live tournament creation

**Platform Architecture**:
- Supabase (PostgreSQL) database
- .NET C# backend (esportra-backend)
- TypeScript/React frontend
- SignalR for real-time updates
- Graph-based bracket structure (BracketGraph with nodes/edges)
- Existing bracket generators (SingleEliminationGenerator, DoubleEliminationGenerator, etc.)
- Existing bracket visualization components (BracketRenderer, GraphBracket)

---

## Phase 1: Database Schema (Supabase)

### 1.1 Supabase Schema Additions

**Add draft mode to existing tournaments table:**
```sql
ALTER TABLE tournaments ADD COLUMN is_draft BOOLEAN DEFAULT FALSE;
ALTER TABLE tournaments ADD COLUMN draft_status VARCHAR(50) DEFAULT 'draft'; -- 'draft' | 'simulated' | 'archived'
ALTER TABLE tournaments ADD COLUMN mock_data JSONB DEFAULT '{}';

CREATE INDEX idx_tournaments_draft ON tournaments(is_draft, organizer_id);
CREATE INDEX idx_tournaments_draft_status ON tournaments(draft_status) WHERE is_draft = TRUE;
```

**Create draft teams table:**
```sql
CREATE TABLE draft_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    seed INTEGER,
    metadata JSONB DEFAULT '{}', -- mock team data (skill level, region, etc.)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_draft_teams_tournament ON draft_teams(tournament_id);
CREATE UNIQUE INDEX idx_draft_teams_tournament_seed ON draft_teams(tournament_id, seed);
```

**Follow existing bracket table patterns:**
- Use existing `brkt_versions` table for draft bracket versions
- Use existing `brkt_matches` table for draft bracket matches
- Use existing `brkt_advancements` table for draft bracket edges
- Use existing `brkt_layout` table for draft bracket layout coordinates
- Draft brackets will have `status = 'draft'` in brkt_versions

### 1.2 TypeScript Types Update

**Update Supabase types:**
```typescript
// src/integrations/supabase/types.ts
export interface Database {
  public: {
    Tables: {
      draft_teams: {
        Row: { /* ... */ }
        Insert: { /* ... */ }
        Update: { /* ... */ }
      }
    }
  }
}
```

---

## Phase 2: .NET Backend Services

### 2.1 Service Structure

```
src/Esportra.Core/DraftBrackets/
├── DraftBracketService.cs
├── DraftTeamService.cs
└── MockDataGenerator.cs

src/Esportra.Api/Endpoints/
├── DraftBracketEndpoints.cs (Minimal API pattern)

src/Esportra.Contracts/Requests/
├── DraftBracketRequests.cs

src/Esportra.Contracts/Responses/
├── DraftBracketResponses.cs
```

### 2.2 Service Responsibilities

**DraftBracketService:**
- CRUD operations for draft brackets using Dapper
- Duplicate/archive draft brackets
- Authorization checks using existing UserContext
- Audit logging using existing AuditService
- Use existing BracketPersistenceService for bracket operations

**DraftTeamService:**
- Bulk insert/update/delete draft teams using Dapper
- Seed validation (unique seeds)
- Team shuffling
- Skill level balancing

**MockDataGenerator:**
- Generate random team names
- Assign random skill levels and regions
- Generate balanced team distributions
- Configurable team count

### 2.3 Integration with Existing Services

**Reuse existing services:**
- BracketPersistenceService for saving/loading bracket graphs
- Existing bracket generators (SingleEliminationGenerator, DoubleEliminationGenerator, etc.)
- GraphValidator for bracket validation
- MatchFinalizationService for simulation results
- BracketHub for real-time updates

### 2.4 Database Operations

**Use Dapper pattern:**
- IDbConnectionFactory for database connections
- Transactions for multi-table operations
- Parameterized queries
- Async operations with CancellationToken

---

## Phase 3: .NET Minimal API Endpoints

### 3.1 Draft Bracket Endpoints

**Location:** `src/Esportra.Api/Endpoints/DraftBracketEndpoints.cs`

**Follow existing pattern:**
- Use Minimal API (MapPost, MapGet, MapPatch, MapDelete)
- Use snake_case JSON naming policy for frontend compatibility
- Use IHubContext<BracketHub> for real-time broadcasts
- Use .RequireAuthorization("Organizer") for authorization
- Use UserContext from HttpContext.Items

**Endpoints:**
- `POST /api/draft-brackets` - Create draft bracket
- `GET /api/draft-brackets` - List user's draft brackets
- `GET /api/draft-brackets/{id}` - Get draft bracket details
- `PATCH /api/draft-brackets/{id}` - Update draft bracket
- `DELETE /api/draft-brackets/{id}` - Delete draft bracket
- `POST /api/draft-brackets/{id}/duplicate` - Duplicate draft bracket

**Draft Team Endpoints:**
- `POST /api/draft-brackets/{id}/teams` - Add team to bracket
- `GET /api/draft-brackets/{id}/teams` - List teams in bracket
- `PATCH /api/draft-brackets/{id}/teams/{teamId}` - Update team
- `DELETE /api/draft-brackets/{id}/teams/{teamId}` - Remove team
- `POST /api/draft-brackets/{id}/teams/generate` - Generate mock teams
- `POST /api/draft-brackets/{id}/teams/shuffle` - Shuffle team seeds
- `POST /api/draft-brackets/{id}/teams/reset` - Reset all seeds

### 3.2 Draft Simulation Endpoints

**Location:** Extend existing `src/Esportra.Api/Endpoints/BracketEndpoints.cs`

**Add draft-specific endpoints:**
- `POST /api/draft-brackets/{id}/generate-bracket` - Generate bracket structure (use existing bracket generators)
- `POST /api/draft-brackets/{id}/simulate` - Simulate bracket progression
- `POST /api/draft-brackets/{id}/simulate-round` - Simulate specific round
- `POST /api/draft-brackets/{id}/reset` - Reset simulation (use existing BracketPersistenceService.ResetAsync)
- `POST /api/draft-brackets/{id}/validate` - Validate bracket configuration (use existing GraphValidator)

### 3.3 Convert to Tournament Endpoint

**Location:** `src/Esportra.Api/Endpoints/DraftBracketEndpoints.cs`

**Endpoint:** `POST /api/draft-brackets/{id}/convert`

**Process:**
- Validate draft bracket configuration
- Create new tournament (non-draft)
- Import teams as registrations
- Generate bracket structure using existing generators
- Save bracket using BracketPersistenceService
- Archive draft bracket
- Broadcast update via BracketHub

---

## Phase 4: SignalR Real-Time Updates

### 4.1 Extend Existing BracketHub

**Location:** `src/Esportra.Api/Hubs/BracketHub.cs`

**Add draft-specific events:**
- `DraftTeamUpdated` - Broadcast when draft teams change
- `DraftSimulated` - Broadcast when simulation completes
- `DraftReset` - Broadcast when simulation resets

**Use existing pattern:**
- Group naming: `bracket:{versionId}`, `tournament:{tournamentId}`
- IHubContext<BracketHub> for broadcasting
- Strongly-typed events (BracketHubEvents)

### 4.2 Frontend SignalR Integration

**Use existing infrastructure:**
- Extend existing signalrClient.ts
- Use existing BracketHub connection
- Real-time bracket visualization updates
- Real-time simulation progress

---

## Phase 5: Frontend Components

### 5.1 Draft Bracket Management Page

**Location:** `src/pages/organizer/DraftBrackets.tsx`

**Features:**
- List all draft brackets with status indicators
- Create new draft bracket wizard
- Duplicate/delete brackets with confirmation
- Archive old brackets
- Filter by status (draft, simulated, archived)
- Search by bracket name
- Sort by creation date or last updated
- Use React Query for data fetching
- Call Minimal API endpoints

### 5.2 Draft Bracket Editor

**Location:** `src/components/draft-bracket/DraftBracketEditor.tsx`

**Features:**
- Bracket configuration panel (type, team count)
- Generate mock teams button
- Generate bracket structure button
- Simulation controls (simulate round, simulate all, reset)
- Real-time bracket visualization via SignalR
- Edit match results manually
- Undo/redo support for bracket changes
- Export bracket configuration
- Convert to tournament button
- Use existing BracketRenderer component
- Call Minimal API endpoints

### 5.3 Team Management Component

**Location:** `src/components/draft-bracket/TeamManager.tsx`

**Features:**
- Generate mock teams (configurable count)
- Manual team entry form
- Team list with seed display
- Drag-and-drop seed reordering
- Shuffle seeds button
- Reset seeds button
- Edit team name and metadata
- Remove team button
- Bulk operations (delete all, regenerate all)
- Call Minimal API endpoints

### 5.4 Bracket Visualization

**Location:** Reuse existing `src/components/bracket/BracketRenderer.tsx`

**Features:**
- Extend existing BracketRenderer for draft mode
- Editable match cards
- Click to set match winner
- Display team seeds and skill levels
- Show match status indicators
- Zoom and pan controls
- Export bracket as image
- Receive real-time updates via SignalR

### 5.5 API Client Integration

**Location:** `src/lib/apiClient.ts` or create `src/lib/draftBracketClient.ts`

**Pattern:**
- Use existing apiClient pattern
- Call Minimal API endpoints
- Handle snake_case JSON conversion
- Error handling
- Loading states

---

## Phase 6: Export/Import Functionality

### 6.1 Export Formats

**JSON Format:**
- Bracket configuration (name, type, team count)
- Team list with seeds and metadata
- Match structure (if simulated)
- Simulation results (if any)

**CSV Format:**
- Team list only (seed, name, skill level, region)
- For importing teams into other brackets

### 6.2 Import Validation

- Validate JSON structure
- Check team count matches bracket type
- Validate seed uniqueness
- Validate bracket type compatibility
- Rollback on validation error
- Show detailed error messages

### 6.3 Frontend Components

**BracketExporter:**
- Dropdown menu with export options
- JSON export for full configuration
- CSV export for team list only
- Auto-filename based on bracket name
- Call Minimal API endpoint for export

**BracketImporter:**
- File upload component
- JSON format validation
- Preview before import
- Merge or replace option
- Import progress indicator
- Call Minimal API endpoint for import

---

## Phase 7: Type Definitions

### 7.1 TypeScript Types

**Location:** `src/types/draft-bracket.ts`

**Types to add:**
- DraftBracket interface (extends Tournament)
- DraftTeam interface
- DraftMatch interface
- BracketConfiguration interface
- SimulationOptions interface

### 7.2 Extend Existing Types

**Location:** `src/types/bracketTypes.ts`

**Extensions:**
- Add isDraft flag to BracketMatch
- Add mockScore to BracketMatch
- Add draft-specific metadata

### 7.3 .NET Request/Response Types

**Location:** `src/Esportra.Contracts/Requests/DraftBracketRequests.cs`

**Pattern:**
- Use records for DTOs
- Follow existing pattern (TeamSeedDto, GenerateBracketRequest)
- Snake_case property names for JSON serialization

---

## Phase 8: Security & Authorization

### 8.1 Backend Authorization (.NET)

**Endpoint-level authorization:**
- Use `.RequireAuthorization("Organizer")` on endpoints
- Only organizers can create draft brackets
- Only bracket owner can edit/delete
- Admin can view all draft brackets for support
- Rate limiting on bracket generation
- Audit logging using existing AuditService

**Pattern:**
- Use existing UserContext from HttpContext.Items
- Check organizer_id matches current user
- Use existing authorization policies

### 8.2 Database Security (Supabase RLS)

**Policies:**
- Draft brackets visible only to organizer
- Draft teams follow bracket ownership
- No public access to draft data
- Admin override for support cases

### 8.3 Frontend Authorization

**Hook:** `src/hooks/useDraftBracketAuth.ts`

**Checks:**
- User is bracket owner
- User is admin (support override)
- Read-only vs edit permissions
- Delete permission check

**Pattern:**
- Use existing auth context
- Check user role and ownership

---

## Phase 9: Testing Strategy

### 9.1 Backend Unit Tests (.NET)

**Test coverage:**
- MockDataGenerator logic
- DraftBracketService CRUD operations
- DraftTeamService seed validation
- Simulation engine
- Authorization checks
- Audit logging

**Pattern:**
- Use xUnit or NUnit (existing test framework)
- Mock IDbConnectionFactory
- Test Dapper queries
- Test authorization policies

### 9.2 Backend Integration Tests (.NET)

**Test scenarios:**
- Create draft bracket
- Generate and insert teams
- Generate bracket structure using existing generators
- Simulate bracket progression
- Convert draft to tournament
- Archive draft bracket

**Pattern:**
- Use test database
- Test full endpoint flow
- Test SignalR broadcasts
- Test authorization

### 9.3 Frontend Unit Tests

**Test coverage:**
- Component rendering
- User interactions
- API integration with Minimal API endpoints
- Error handling
- Form validation
- SignalR connection handling

**Pattern:**
- Use React Testing Library
- Mock API calls
- Mock SignalR connection
- Test loading states

### 9.4 E2E Tests

**Test flows:**
- Create draft bracket from scratch
- Generate mock teams and bracket
- Simulate entire tournament
- Export bracket configuration
- Import bracket configuration
- Convert draft to real tournament

**Pattern:**
- Use Playwright or Cypress
- Test full user journey
- Test real-time updates

---

## Phase 10: Performance Considerations

### 10.1 Backend Optimization

- Cache bracket templates in memory
- Use bulk insert for teams using Dapper
- Optimize bracket generation queries
- Index draft bracket queries (already defined in schema)
- Async operations for simulation
- Use existing BracketPersistenceService patterns

### 10.2 Frontend Optimization

- Lazy load bracket visualization
- Debounce simulation controls (300ms)
- Virtual scrolling for team lists (100+ teams)
- React.memo for bracket nodes
- SignalR for real-time updates (avoid polling)
- Use existing bracket rendering optimizations

### 10.3 Resource Limits

**Limits:**
- Max 5 active draft brackets per organizer
- Max 128 teams per bracket
- Auto-archive brackets older than 30 days
- Cleanup job to remove old archived brackets

---

## Phase 11: User Experience

### 11.1 Onboarding

**First-time user flow:**
- Tutorial overlay for first visit
- Sample draft bracket templates
- Quick start guide
- Interactive tooltips
- Video walkthrough (optional)

### 11.2 Error Handling

**Error types:**
- Invalid team count
- Duplicate seeds
- Invalid bracket type
- Simulation errors
- Conversion errors

**Error display:**
- Clear error messages
- Recovery suggestions
- Undo capability
- Error logging for support

### 11.3 Accessibility

**Features:**
- Keyboard navigation
- Screen reader support
- High contrast mode
- Zoom controls
- ARIA labels

---

## Implementation Timeline

**Week 1**: Supabase schema, .NET types, DraftBracketService
**Week 2**: DraftTeamService, MockDataGenerator
**Week 3**: Minimal API endpoints (DraftBracketEndpoints), authorization
**Week 4**: SignalR hub integration (extend BracketHub)
**Week 5**: Frontend components (DraftBrackets page, TeamManager)
**Week 6**: Bracket integration, simulation controls
**Week 7**: Export/import functionality, convert to tournament
**Week 8**: Testing, optimization, polish

---

## Success Metrics

- Draft bracket creation time < 1 minute
- 64-team bracket simulation < 3 seconds
- 90% of users successfully convert draft to tournament
- Bracket-related support tickets reduced by 30%
