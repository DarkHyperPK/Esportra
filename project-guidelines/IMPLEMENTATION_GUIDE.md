# Esportra Implementation Guide

> **Version 4.0** — Last Updated: March 2026
> The end-to-end protocol for thinking about, designing, and building features on the Esportra platform.

---

## Table of Contents
1. [What End-to-End Means](#1-what-end-to-end-means)
2. [The 7-Phase Protocol](#2-the-7-phase-protocol)
3. [Phase 1: Discovery — Ask the Right Questions](#3-phase-1-discovery--ask-the-right-questions)
4. [Phase 2: Interaction Mapping — Who Touches This and How](#4-phase-2-interaction-mapping--who-touches-this-and-how)
5. [Phase 3: Finalized Interaction List + Edge Cases](#5-phase-3-finalized-interaction-list--edge-cases)
6. [Phase 4: Implementation Plan](#6-phase-4-implementation-plan)
7. [Phase 5: Backend Build](#7-phase-5-backend-build)
8. [Phase 6: Frontend Build](#8-phase-6-frontend-build)
9. [Phase 7: Verification](#9-phase-7-verification)
10. [Worked Example: Bracket Generation](#10-worked-example-bracket-generation)
11. [Technical Reference](#11-technical-reference)
12. [Rules](#12-rules)

---

## 1. What End-to-End Means

End-to-end doesn't mean "frontend + backend." It means the feature is **fully thought through from concept to verification** — including who uses it, how they use it, what can go wrong, and how the system behaves in every scenario before a single line of code is written.

The protocol has 7 phases. The first 4 are **thinking and design**. The last 3 are **building and verifying**. Most implementation failures happen because someone skipped the thinking and jumped straight to code.

```
THINKING (Phases 1-4)          BUILDING (Phases 5-7)
┌──────────────────────┐      ┌──────────────────────┐
│ 1. Discovery         │      │ 5. Backend Build     │
│ 2. Interaction Map   │ ───► │ 6. Frontend Build    │
│ 3. Edge Cases        │      │ 7. Verification      │
│ 4. Implementation    │      │                      │
│    Plan              │      │                      │
└──────────────────────┘      └──────────────────────┘
```

**UI-only changes are not permitted** unless explicitly requested for prototyping. Every feature needs the full pipeline.

---

## 2. The 7-Phase Protocol

| Phase | Name | Purpose | Output |
|-------|------|---------|--------|
| **1** | Discovery | Understand the feature deeply | Answered question list |
| **2** | Interaction Mapping | Map every actor, action, and system touchpoint | Interaction diagram |
| **3** | Edge Cases & Finalization | Catch everything that can go wrong | Finalized interaction + edge case list |
| **4** | Implementation Plan | Professional-grade build plan | Ordered task list with file-level specificity |
| **5** | Backend Build | Database, RLS, RPCs, storage | Working backend, testable in isolation |
| **6** | Frontend Build | Hooks, types, components, UX states | Working UI connected to backend |
| **7** | Verification | Prove it works end-to-end | Verified across roles, states, and breakpoints |

**Do not skip phases. Do not reorder them.**

---

## 3. Phase 1: Discovery — Ask the Right Questions

Before anything else, interrogate the feature request. A vague request like "add bracket generation" is not actionable. You need answers.

### The question categories

**1. Scope & Definition**
- What exactly does this feature do? What does it NOT do?
- Is this a new feature or an extension of something that exists?
- What's the minimum viable version vs the full version?

**2. Users & Roles**
- Who is the primary user of this feature? (player, organizer, venue owner, admin, system)
- Are there secondary users? (e.g., organizer creates brackets, but players view them)
- What permissions does each role need?

**3. Behavior & Logic**
- What are the possible states this feature can be in?
- What triggers state transitions? (user action, time, system event)
- Is this feature real-time? Does it need live updates?
- Is this feature triggered manually or automatically?

**4. Data & Persistence**
- What data does this feature create, read, update, or delete?
- Does this data need to survive page refresh? Session expiry? Account deletion?
- Does this feature interact with existing data? Which tables?

**5. Dependencies**
- Does this feature depend on another feature existing first?
- Does another feature depend on this one?
- Are there external services involved? (RAWG, Riot API, Faceit, Resend)

### Example: Bracket Generation

```
Q: What does "bracket generation" mean?
A: Given a list of registered teams and a tournament format (single elim, double elim,
   swiss, round robin), produce a complete bracket structure with matchups, rounds, and
   advancement paths.

Q: Who triggers it?
A: The organizer. Only the organizer (or tournament staff with bracket:edit permission)
   can generate a bracket. Players only view it.

Q: What formats are supported?
A: Single elimination, double elimination, Swiss, round robin.

Q: Can a bracket be regenerated after it's created?
A: Yes — the organizer can reset and regenerate if no matches have been played yet.
   Once a match has a result, the bracket is locked.

Q: Is it real-time?
A: Yes. When a match result is submitted, all connected clients see the bracket update
   via SignalR BracketHub.

Q: What data does it create?
A: brkt_versions (version snapshot), brkt_matches (individual matches),
   brkt_advancements (edges connecting matches for winner progression).
```

---

## 4. Phase 2: Interaction Mapping — Who Touches This and How

Map every actor that interacts with the feature, every action they can take, and every system response. This reveals complexity that's invisible from a feature description alone.

### How to map interactions

For each actor, list:
1. **What they can do** (actions)
2. **What they see** (views/states)
3. **What triggers** when they act (system side effects)
4. **What feedback** they receive (UI response)

### Template

```
ACTOR: [Role]
├── ACTION: [What they do]
│   ├── PRECONDITION: [What must be true before this action]
│   ├── SYSTEM RESPONSE: [What happens in the backend]
│   ├── UI FEEDBACK: [What the user sees]
│   └── SIDE EFFECTS: [What else changes — notifications, cache invalidation, etc.]
```

### Example: Bracket Generation — Interaction Map

```
ACTOR: Organizer
├── ACTION: Generate bracket
│   ├── PRECONDITION: Tournament has ≥2 registered teams, no existing bracket (or bracket is reset)
│   ├── SYSTEM RESPONSE: BracketGenerator creates brkt_version + brkt_matches + brkt_advancements
│   ├── UI FEEDBACK: Bracket visualization appears, success toast
│   └── SIDE EFFECTS: All connected viewers see bracket via BracketHub.VersionCreated
│
├── ACTION: Reset bracket
│   ├── PRECONDITION: No matches have recorded results
│   ├── SYSTEM RESPONSE: Delete brkt_matches and brkt_advancements for this version
│   ├── UI FEEDBACK: Confirmation dialog → bracket clears → "Bracket reset" toast
│   └── SIDE EFFECTS: BracketHub.BracketReset fires to all viewers
│
├── ACTION: Edit a match (swap teams, change schedule)
│   ├── PRECONDITION: Match has not been played
│   ├── SYSTEM RESPONSE: Update brkt_matches row
│   ├── UI FEEDBACK: Match card updates inline
│   └── SIDE EFFECTS: BracketHub.MatchUpdated fires
│
├── ACTION: Record match result
│   ├── PRECONDITION: Match is in "ready" or "live" state
│   ├── SYSTEM RESPONSE: Update scores, trigger advancement service
│   ├── UI FEEDBACK: Winner highlighted, loser grayed out, next match populated
│   └── SIDE EFFECTS: BracketHub.MatchUpdated, notifications to next match teams

ACTOR: Player
├── VIEW: See bracket for a tournament they're in
│   ├── Their next match is highlighted
│   ├── Completed matches show scores
│   └── Click a match → navigate to captain match page
│
├── VIEW: See bracket for a tournament they're NOT in
│   ├── Read-only spectator view
│   └── No action buttons, just visualization

ACTOR: System (automated)
├── TRIGGER: Match result recorded
│   ├── AdvancementService moves winner to next match
│   ├── StageCompletionService checks if all matches in a round are complete
│   └── If stage complete → trigger next stage or mark tournament complete
│
├── TRIGGER: worker-bracket-advancement (Edge Function)
│   ├── Webhook fires when brkt_matches row updates with a winner
│   └── Advances team through brkt_advancements edges
```

### What this reveals

By mapping interactions, you discover:
- **3 distinct actors** (organizer, player, system) with different permissions
- **5 organizer actions** each with preconditions that need enforcement
- **2 player views** that need different UI states
- **2 automated triggers** that happen without any user action
- **Real-time requirements** — SignalR events on every mutation

This is information you wouldn't have if you jumped straight to "create a table."

---

## 5. Phase 3: Finalized Interaction List + Edge Cases

Take the interaction map and stress-test it. For every action, ask: "What if this goes wrong?"

### Edge case categories

| Category | Questions to Ask |
|----------|-----------------|
| **Timing** | What if two users act at the same time? What if a session expires mid-action? |
| **Data integrity** | What if referenced data is deleted? What if the user's team disbands mid-tournament? |
| **Permissions** | What if someone crafts a direct API call bypassing the UI? |
| **State conflicts** | What if the bracket is regenerated while a match is being played? |
| **Network** | What if the connection drops during a real-time update? |
| **Scale** | What if there are 256 teams? 1024? Does the bracket render? |
| **Empty/null** | What if a team has no logo? What if a player has no username? |
| **Rollback** | Can this action be undone? What happens if someone wants to reverse it? |

### Example: Bracket Generation — Edge Cases

```
EDGE CASE: Odd number of teams
RESOLUTION: Single/double elim → add BYE rounds. Swiss → pair down. RR → skip.

EDGE CASE: Team withdraws after bracket generation
RESOLUTION: Mark their matches as forfeit. Advance opponent automatically.

EDGE CASE: Organizer regenerates bracket after first match played
RESOLUTION: Block it. Show error: "Cannot reset bracket — matches have been played."

EDGE CASE: Two match results submitted simultaneously
RESOLUTION: Database-level locking on brkt_matches row. Second write fails gracefully.

EDGE CASE: SignalR connection drops during bracket update
RESOLUTION: Client reconnects and refetches full bracket state. No partial updates.

EDGE CASE: 256-team double elimination bracket
RESOLUTION: Pan/zoom via usePanZoom hook. Lazy render off-screen matches.

EDGE CASE: Tournament has registered teams but some haven't checked in
RESOLUTION: Only checked-in teams are seeded. Others are marked as no-shows.

EDGE CASE: Organizer clicks "Generate" twice rapidly
RESOLUTION: Disable button on first click. Mutation has loading state.
```

### Finalized interaction list

After edge cases are resolved, produce a clean list:

```
BRACKET GENERATION — FINALIZED INTERACTIONS

Organizer:
  ✓ Generate bracket (formats: SE, DE, Swiss, RR)
  ✓ Reset bracket (only if no results recorded)
  ✓ Edit match (swap teams, reschedule — only if not played)
  ✓ Record match result (triggers advancement)
  ✓ Fullscreen bracket view (for streaming)
  ✗ Cannot regenerate once matches have results
  ✗ Cannot edit matches that have been played

Player:
  ✓ View bracket (own match highlighted)
  ✓ Click match → navigate to captain match page
  ✗ Cannot modify bracket in any way

System:
  ✓ Auto-advance winners through brkt_advancements
  ✓ Auto-detect stage completion
  ✓ Broadcast updates via SignalR BracketHub
  ✓ Handle BYE rounds for odd team counts

Edge cases handled:
  ✓ Odd team count → BYEs
  ✓ Team withdrawal → auto-forfeit
  ✓ Double-submit → DB locking
  ✓ Connection drop → full state refetch
  ✓ Large brackets → pan/zoom + lazy render
```

---

## 6. Phase 4: Implementation Plan

Now — and only now — write the technical implementation plan. This is the bridge between design and code.

### Plan structure

The plan must specify:
1. **Database changes** — exact tables, columns, RLS policies, triggers, RPCs
2. **Backend logic** — services, generators, edge functions
3. **Type definitions** — TypeScript interfaces matching the schema
4. **Custom hooks** — queries, mutations, real-time subscriptions
5. **Components** — what to build, what to reuse, what to modify
6. **Wiring** — how components connect to hooks, how hooks connect to the backend
7. **Build order** — what must be built first, what depends on what

### Example: Bracket Generation — Implementation Plan

```
1. DATABASE (migration: YYYYMMDDHHMMSS_bracket_system.sql)
   - Create table: brkt_versions (id, tournament_id, stage_id, format, created_at)
   - Create table: brkt_matches (id, version_id, round, position, team1_id, team2_id,
     winner_id, scores, status, scheduled_at)
   - Create table: brkt_advancements (id, from_match_id, to_match_id, slot)
   - RLS: Organizer can INSERT/UPDATE on brkt_matches where tournament.organizer_id = auth.uid()
   - RLS: Public can SELECT on all three tables (brackets are public)
   - Trigger: trg_match_result → calls advancement logic

2. SERVICES (src/services/bracket/)
   - BracketGenerator.ts — orchestrator, picks correct generator by format
   - SingleEliminationGenerator.ts — tree generation, BYE handling, seeding
   - DoubleEliminationGenerator.ts — WB/LB/GF structure
   - SwissGenerator.ts — round pairing algorithm
   - RoundRobinGenerator.ts — full schedule generation
   - AdvancementService.ts — moves winners through brkt_advancements
   - StageCompletionService.ts — detects when all matches in stage are done

3. TYPES (src/types/bracket.ts)
   - BracketVersion, BracketMatch, BracketAdvancement interfaces
   - MatchStatus union type: 'pending' | 'ready' | 'live' | 'completed' | 'forfeit'
   - BracketFormat union type: 'single_elimination' | 'double_elimination' | 'swiss' | 'round_robin'

4. HOOKS (src/hooks/)
   - useGraphBracket — fetch bracket data + SignalR BracketHub subscription
   - useBracketRealtime — handle MatchUpdated, MatchInserted, BracketReset events
   - useStageRealtime — handle StageUpdated, VersionCreated events
   - useMatchScheduling — stage scheduling config

5. COMPONENTS (src/components/bracket/)
   - GraphBracket.tsx — main visualization with pan/zoom
   - GraphMatchCard.tsx — individual match card
   - BracketGeneratorUI.tsx — organizer controls (generate, reset)
   - BracketRenderer.tsx — renders bracket from version data
   - StandingsTable.tsx — Swiss/RR standings

6. PAGES
   - src/pages/tournaments/Brackets.tsx — public bracket page
   - src/pages/tournaments/brackets/FullscreenBracketPage.tsx — streaming view
   - src/pages/organizer/ManageBracketPage.tsx — organizer management

7. BUILD ORDER
   ① Database tables + RLS (testable via SQL)
   ② Generator services (testable in isolation with mock data)
   ③ Type definitions
   ④ Hooks (testable by calling from a throwaway component)
   ⑤ Components (connect to hooks, visual review)
   ⑥ Real-time wiring (verify updates propagate)
   ⑦ Edge cases (BYEs, forfeits, large brackets)
```

---

## 7. Phase 5: Backend Build

With the plan finalized, build the backend. This phase produces a working, testable backend that the frontend can connect to.

### Checklist
```
□ Migration written and reviewed
□ RLS policies in place (default deny, explicit allow)
□ Security triggers protect sensitive fields
□ RPCs exist for complex multi-table operations (SECURITY DEFINER for admin ops)
□ Storage buckets created (if applicable)
□ Edge Functions deployed (if applicable)
□ Tested: query as non-admin user, verify access control
□ Tested: query as wrong role, verify denial
```

### Migration pattern
```sql
-- File: supabase/migrations/YYYYMMDDHHMMSS_feature_name.sql

CREATE TABLE IF NOT EXISTS public.feature_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.feature_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own" ON public.feature_table
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own" ON public.feature_table
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Common RLS patterns
| Pattern | Use Case | Policy |
|---------|----------|--------|
| **Owner-only** | Private data | `auth.uid() = user_id` |
| **Public Read** | Profiles, published tournaments | `USING (true)` for SELECT |
| **Role-based** | Admin features | Check `admin_user_roles` |
| **Organizer** | Tournament management | `auth.uid() = organizer_id` |
| **Participant** | Match access | Join through `tournament_participants` |

### RPC pattern (admin operations)
```sql
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
    p_dispute_id UUID,
    p_resolution TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM admin_user_roles
        WHERE user_id = auth.uid() AND role_id IN (
            SELECT id FROM admin_roles WHERE role_name = 'super_admin'
        )
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE disputes SET status = 'resolved', resolution = p_resolution
    WHERE id = p_dispute_id;
END;
$$;
```

### Storage buckets
| Bucket | Purpose | Public |
|--------|---------|--------|
| `users.avatars` | Profile pictures | Yes |
| `organizer-banners` | Organizer banners | Yes |
| `organizer-media` | Media gallery | Yes |
| `tournaments.banners` | Tournament covers | Yes |
| `tournaments.media` | Tournament photos/videos | Yes |
| `teams.logos` | Team logos | Yes |
| `system.assets.website` | Platform assets | Yes |

---

## 8. Phase 6: Frontend Build

Connect the UI to the backend. Every data operation goes through a custom hook. No raw Supabase calls in components.

### Custom hook pattern
```typescript
// src/hooks/useFeature.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const useFeature = (featureId: string) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data, isLoading, error } = useQuery({
        queryKey: ['feature', featureId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('feature_table')
                .select('*')
                .eq('id', featureId)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!featureId,
        staleTime: 1000 * 60 * 5,
    });

    const updateFeature = useMutation({
        mutationFn: async (updates: Partial<Feature>) => {
            const { data, error } = await supabase
                .from('feature_table')
                .update(updates)
                .eq('id', featureId);
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feature', featureId] });
            toast({ title: 'Updated!', description: 'Changes saved.' });
        },
        onError: (error: Error) => {
            toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
        },
    });

    return { data, isLoading, error, updateFeature };
};
```

### Query configuration
```typescript
{
    staleTime: 1000 * 60 * 5,   // 5 min — data considered fresh
    gcTime: 1000 * 60 * 30,     // 30 min — cache garbage collection
    enabled: !!dependency,       // Conditional fetching
    refetchOnWindowFocus: false, // Prevent refetch on tab switch
}
```

### Component integration
```typescript
const TournamentPage = ({ tournamentId }: Props) => {
    const { data, isLoading, error, refetch } = useTournament(tournamentId);

    if (isLoading) return <TournamentSkeleton />;
    if (error) return <ErrorState message="Failed to load tournament." retry={refetch} />;
    if (!data) return <EmptyState message="Tournament not found." />;

    return <TournamentContent tournament={data} />;
};
```

### State management

**Query keys** — hierarchical and consistent:
```typescript
['tournaments']                                // All tournaments
['tournaments', tournamentId]                  // Single tournament
['tournaments', tournamentId, 'participants']  // Tournament participants
['tournaments', tournamentId, 'bracket']       // Tournament bracket
['matches', matchId]                           // Single match
['matches', matchId, 'veto']                   // Match veto state
```

**Cache invalidation:**
```typescript
// After mutation — invalidate specific
queryClient.invalidateQueries({ queryKey: ['tournaments', tournamentId] });

// After mutation — invalidate all related
queryClient.invalidateQueries({ queryKey: ['tournaments'] });

// Optimistic update for immediate UI feedback
queryClient.setQueryData(['tournaments', id], (old) => ({ ...old, ...update }));
```

**Where state lives:**
| State Type | Where | Example |
|-----------|-------|---------|
| **Server data** | TanStack Query | Tournament list, user profile |
| **Auth state** | React Context (`AuthContext`) | Current user, session |
| **UI state** | Component `useState` | Dialog open/closed, selected tab |
| **Form state** | React Hook Form | Input values, validation errors |
| **URL state** | React Router (`useSearchParams`) | Filters, pagination |

### Real-time wiring

**Supabase Realtime:**
```typescript
useEffect(() => {
    const channel = supabase
        .channel('match-updates')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'brkt_matches', filter: `id=eq.${matchId}` },
            () => queryClient.invalidateQueries({ queryKey: ['matches', matchId] })
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
}, [matchId]);
```

**SignalR hubs:**
| Hub Path | Purpose |
|----------|---------|
| `/hubs/notifications` | Push notifications |
| `/hubs/bracket` | Bracket match updates |
| `/hubs/match` | Check-in, time proposals, results, disputes |
| `/hubs/veto` | Map veto state machine |
| `/hubs/chat` | Match-scoped chat |
| `/hubs/conversations` | Direct messaging |
| `/hubs/live` | Venue seat status |

**Match Hub (`/hubs/match`) — match room invalidation matrix:**

| Hub event | Invalidate query keys |
|-----------|----------------------|
| `CheckInUpdated` | `match-checkins`, `match-room-state` |
| `TimeProposalUpdated` | `match-time-proposals`, `match-room-state` |
| `StatusChanged` | `match-checkins`, `match-time-proposals`, `match-room-state`, bracket queries |

- One `JoinMatch` per match page — use `useMatchRoomRealtime` on `CaptainMatchPage`; child cards pass `subscribeRealtime: false`.
- Check-in UI reads live status from `useMatchCheckin`, not stale `roomState` booleans.
- Backend must broadcast `TimeProposalUpdated` after propose / accept / reject / counter.

**Auth roles cache:** invalidate `meRolesQueryKey` on sign-in, sign-out, and user-id change (`AuthContext`).

**Real-time rules:**
- Always clean up subscriptions on unmount.
- Use filters to avoid receiving unrelated events.
- Invalidate TanStack Query cache — don't manually set data from payloads.

### Frontend checklist
```
□ Custom hook handles all data fetching and mutations
□ TypeScript types match database schema
□ Loading state visible (skeleton or spinner)
□ Error state shows meaningful message + retry
□ Empty state designed (not blank)
□ Toast feedback on mutations
□ Cache invalidation works (no stale data)
□ Mobile viewport tested
□ Keyboard navigation works
```

---

## 9. Phase 7: Verification

The feature isn't done until it's verified across every dimension.

### Verification matrix
| Dimension | Test |
|-----------|------|
| **Persistence** | Action → refresh page → data still there |
| **Role access** | Correct role can access, wrong role is blocked |
| **Error recovery** | Network fails → reconnects → data is correct |
| **Build** | `npm run build` → zero errors |
| **Console** | No errors or warnings on affected pages |
| **Mobile** | Usable on 375px viewport (iPhone SE) |
| **Edge cases** | Test every edge case from Phase 3 |

### Common debugging
| Symptom | Check |
|---------|-------|
| Data doesn't appear | Is the RLS policy blocking SELECT? |
| Insert/update fails silently | Is the RLS policy blocking the mutation? |
| Wrong data shape | Is the TypeScript type matching the DB schema? |
| Stale data after mutation | Is cache invalidation firing? Check query keys. |
| Component doesn't re-render | Is the query key changing when it should? |

---

## 10. Worked Example: Bracket Generation

Here's how the full 7-phase protocol plays out for a real feature.

### Phase 1: Discovery
```
Feature: Bracket generation for tournaments

Questions answered:
- Formats: Single elim, double elim, Swiss, round robin
- Trigger: Organizer manually generates. System auto-advances on match result.
- Reset: Allowed only if no match results exist
- Real-time: Yes, via SignalR BracketHub
- Data: brkt_versions, brkt_matches, brkt_advancements
- Depends on: Tournament must exist with registered teams
```

### Phase 2: Interaction Map
```
Organizer → Generate, Reset, Edit match, Record result
Player → View bracket (own match highlighted), Navigate to match
System → Auto-advance winners, Detect stage completion, Broadcast updates
```

### Phase 3: Edge Cases
```
✓ Odd team count → BYE rounds
✓ Team withdrawal → auto-forfeit + advance opponent
✓ Reset after results → blocked with error message
✓ Double-submit → database-level row locking
✓ Connection drop → full state refetch on reconnect
✓ 256 teams → pan/zoom + lazy rendering
✓ Rapid button clicks → button disabled during mutation
```

### Phase 4: Plan
```
① Migration: brkt_versions + brkt_matches + brkt_advancements + RLS
② Services: BracketGenerator, SE/DE/Swiss/RR generators, AdvancementService
③ Types: BracketVersion, BracketMatch, MatchStatus, BracketFormat
④ Hooks: useGraphBracket, useBracketRealtime, useStageRealtime
⑤ Components: GraphBracket, GraphMatchCard, BracketGeneratorUI, StandingsTable
⑥ Pages: Brackets.tsx, FullscreenBracketPage.tsx, ManageBracketPage.tsx
```

### Phase 5: Backend
```
Migration deployed. RLS tested: organizer can write, public can read, wrong user blocked.
```

### Phase 6: Frontend
```
Hooks connected. Components built. Loading/error/empty states in place.
Real-time verified: match result → bracket updates on all connected clients.
```

### Phase 7: Verification
```
✓ Generate bracket → refresh → bracket persists
✓ Record result → winner advances automatically
✓ Player view → own match highlighted, no edit controls
✓ Reset → works pre-results, blocked post-results
✓ npm run build → zero errors
✓ Mobile → pan/zoom works on touch
```

---

## 11. Technical Reference

### Project architecture
```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base components (shadcn/ui)
│   ├── tournament/      # Tournament-specific
│   ├── organizer/       # Organizer-specific
│   ├── player/          # Player-specific
│   ├── bracket/         # Bracket visualization
│   ├── admin/           # Admin panel
│   └── navigation/      # Navbar, sidebar
├── pages/               # Route-level components
├── hooks/               # Custom React hooks (50+)
├── services/            # Business logic (bracket, veto)
├── lib/                 # Core utilities (Supabase client, SignalR client, query client)
├── contexts/            # React context providers
├── types/               # TypeScript type definitions
├── schemas/             # Zod validation schemas
├── config/              # App configuration
└── utils/               # Helper functions

supabase/
├── migrations/          # SQL migration files (auto-deployed)
└── functions/           # Edge Functions (auto-deployed)
```

### Tech stack
| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | React 18 + Vite | UI framework |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Components** | Radix UI + shadcn/ui | Accessible primitives |
| **State** | TanStack React Query | Server state management |
| **Forms** | React Hook Form + Zod | Form handling + validation |
| **Backend** | Supabase + .NET API | Database, Auth, Storage, API |
| **Real-time** | SignalR (7 hubs) | Live updates |
| **Animation** | Framer Motion | UI animations |
| **Routing** | React Router | Client-side routing |
| **Mobile** | Capacitor | Android/iOS native shell |

### Import aliases
```typescript
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { TournamentRow } from "@/types/tournament";
```

### File upload pattern
```typescript
const uploadFile = async (file: File, bucket: string, path: string) => {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
};
```

Upload rules:
- Validate file type and size before uploading.
- Max avatar: 5MB. Max banner: 10MB.
- Use `upsert: true` for avatars/banners.
- Unique paths: `{userId}/{timestamp}-{filename}`.

---

## 12. Rules

1. **Phases 1-4 are not optional.** Thinking before coding is not a suggestion. It is the protocol.
2. **Discovery comes first.** If you can't answer the questions in Phase 1, you're not ready to build.
3. **Map every interaction.** If you don't know who touches the feature and how, you'll miss cases.
4. **Edge cases are found during design, not after launch.** Phase 3 exists because production bugs are expensive.
5. **The plan comes before the code.** Phase 4 produces a build order. Follow it.
6. **Backend before frontend.** Phase 5 completes before Phase 6 starts.
7. **No raw Supabase calls in components.** Custom hooks only. No exceptions.
8. **Every table gets RLS.** Default deny. Explicit allow.
9. **Loading, error, and empty states are mandatory.** Every data-dependent component handles all three.
10. **Verify persistence.** If you can't refresh the page and see the data, the feature isn't done.
11. **Test with non-admin roles.** Admin service role bypasses RLS — testing as admin proves nothing.
12. **The feature isn't done until Phase 7 passes.** Not when the code compiles. Not when it "looks right." When verification passes.

---

## Related Documents
- [Coding Guidelines](./CODING_GUIDELINES.md) — Code standards and patterns
- [Code Quality Guidelines](./CODE_QUALITY_GUIDELINES.md) — Quality standards, review checklist
- [Features Guidelines](./FEATURES_GUIDELINES.md) — Feature scoping and delivery
- [UI Style Guide](./UI_STYLE_GUIDE.md) — Visual design system
- [UX Guidelines](./UX_GUIDELINES.md) — User experience patterns
- [Features Documentation](./FEATURES_DOCUMENTATION.md) — Complete platform feature inventory
