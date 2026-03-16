# Esportra Features Guidelines

> **Version 1.0** — Last Updated: March 2026
> How to scope, plan, build, and ship features on the Esportra platform.

---

## Table of Contents
1. [Feature Philosophy](#1-feature-philosophy)
2. [Feature Categories](#2-feature-categories)
3. [Scoping Rules](#3-scoping-rules)
4. [Definition of Done](#4-definition-of-done)
5. [Feature Delivery Checklist](#5-feature-delivery-checklist)
6. [Breaking Changes](#6-breaking-changes)
7. [Feature Flags & Rollout](#7-feature-flags--rollout)
8. [Platform Features Map](#8-platform-features-map)
9. [Rules](#9-rules)

---

## 1. Feature Philosophy

### Build what players and organizers actually need

Every feature must answer: **who wants this, and what problem does it solve?** If you can't answer both, the feature isn't ready to build.

### Principles

| Principle | Description |
|-----------|-------------|
| **Ship vertical slices** | A feature that works end-to-end for one user flow is better than half-built features across three flows. |
| **No UI-only features** | Every user-facing feature requires backend persistence. A "like" button that doesn't save to the database is not a feature — it's a lie. |
| **One feature, one concern** | A "tournament creation" feature handles creating tournaments. It doesn't also handle team management. Keep scope tight. |
| **Degrade gracefully** | If a feature depends on an external service (RAWG API, Riot OAuth), the app must still work when that service is down. Show fallbacks, not crashes. |

---

## 2. Feature Categories

### Player-facing
Features used by people who play in tournaments.

| Feature Area | Examples |
|-------------|---------|
| **Registration** | Sign up, sign in, OAuth (Faceit, Riot), profile setup |
| **Tournaments** | Browse, filter, register, check-in, view brackets, report scores |
| **Teams** | Create, invite members, manage roster, leave team |
| **Matches** | Map veto, score reporting, dispute filing |
| **Profile** | Avatar, bio, match history, stats, linked accounts |
| **Notifications** | Match ready, check-in open, dispute updates, team invites |

### Organizer-facing
Features used by people who create and run tournaments.

| Feature Area | Examples |
|-------------|---------|
| **Tournament Wizard** | Create tournament (game, format, rules, schedule, prizes) |
| **Match Management** | Assign refs, override scores, manage disputes |
| **Organizer Profile** | Banner, bio, media gallery, social links, past events |
| **Analytics** | Participation rate, completion rate, dispute rate |

### Venue-facing
Features for gaming venue owners and operators.

| Feature Area | Examples |
|-------------|---------|
| **Venue Listing** | Submit venue, set availability, pricing, photos |
| **Booking System** | Real-time availability, booking flow, confirmation |
| **Station Management** | Desktop app integration, real-time station grid |

### Admin-facing
Features for platform administrators.

| Feature Area | Examples |
|-------------|---------|
| **Dashboard** | Platform-wide stats (users, tournaments, revenue) |
| **User Management** | View profiles, suspend/unsuspend, role assignment |
| **Tournament Oversight** | Approve, feature, reject tournaments |
| **Dispute Center** | Review disputes, resolve, escalate |
| **Venue Approval** | Review venue submissions, approve/reject |
| **Audit Logs** | Track all admin actions |

---

## 3. Scoping Rules

### Before you write any code

1. **Identify the user role.** Who is this for? Player, organizer, venue owner, admin?
2. **Define the happy path.** What does the user do, step by step, when everything works?
3. **Define the sad paths.** What happens when: data is missing, network fails, permissions are denied, the user cancels halfway?
4. **List the database changes.** New tables? New columns? New RLS policies? New RPCs?
5. **List the affected files.** Which hooks, components, pages, and types change?
6. **Identify dependencies.** Does this feature need another feature to exist first? (e.g., dispute system needs match reporting)

### Scope control

| Do | Don't |
|----|-------|
| Build what was requested | Add "nice to have" extras |
| Handle the main flow + critical error paths | Handle every theoretical edge case |
| Reuse existing components and hooks | Build new abstractions "for the future" |
| Ship a working vertical slice | Ship 70% of three features |

### Size estimation

| Size | Description | Example |
|------|-------------|---------|
| **Small** | Single file change, no DB migration | Fix button label, adjust spacing |
| **Medium** | 2-5 files, may include a migration | Add a filter to tournament browse, new profile field |
| **Large** | 5-15 files, migration + RLS + hook + UI | Tournament check-in system, dispute resolution flow |
| **Epic** | 15+ files, multiple migrations, new page(s) | Venue booking system, map veto system |

---

## 4. Definition of Done

A feature is **done** when all of the following are true:

### Backend
- [ ] Database schema exists (migration committed)
- [ ] RLS policies are in place (default deny, explicit allow)
- [ ] Security triggers protect sensitive fields (if applicable)
- [ ] RPCs exist for complex operations (if applicable)
- [ ] Data persists correctly (create, read, update, delete all work)

### Frontend
- [ ] Custom hook handles data fetching and mutations
- [ ] TypeScript types match the database schema
- [ ] Loading states are visible (skeletons or spinners)
- [ ] Error states show meaningful messages
- [ ] Empty states are designed (not blank)
- [ ] Toast notifications confirm user actions
- [ ] TanStack Query cache invalidation works (no stale data after mutations)

### UX
- [ ] Happy path works end-to-end (action → feedback → persistence → page refresh → data still there)
- [ ] Keyboard navigation works for all interactive elements
- [ ] Mobile layout is usable (44px touch targets, no horizontal scroll)
- [ ] Confirmation dialogs guard destructive actions

### Quality
- [ ] `npm run build` passes with zero errors
- [ ] No console errors or warnings in the browser
- [ ] Tested with at least 2 user roles (player + the relevant role)
- [ ] No hardcoded data — everything comes from the database
- [ ] No `any` types added without a comment explaining why

---

## 5. Feature Delivery Checklist

Follow this order. Don't skip steps.

### Phase 1: Database & Security
```
1. Write migration SQL
2. Add RLS policies (default deny)
3. Add security triggers (if fields need protection)
4. Add RPCs (if complex logic lives in Postgres)
5. Test: query as authenticated user, verify access control
```

### Phase 2: Logic Layer
```
6. Create/update TypeScript types
7. Create/update custom hook(s)
8. Add TanStack Query keys (consistent naming)
9. Add cache invalidation on mutations
10. Test: hook returns data, mutations persist
```

### Phase 3: UI
```
11. Build/update component(s)
12. Add loading states (skeleton/spinner)
13. Add error states (message + action)
14. Add empty states (message + CTA)
15. Add toast feedback for mutations
16. Test: visual review across breakpoints
```

### Phase 4: Verification
```
17. Full happy-path test (action → persist → refresh → still there)
18. Role-based test (can the right users access? are wrong users blocked?)
19. Build check: npm run build → zero errors
20. Console check: no errors or warnings
```

---

## 6. Breaking Changes

### What counts as a breaking change
- Removing or renaming a database column
- Changing an RLS policy to be more restrictive
- Removing or renaming a public-facing route
- Changing a hook's return signature
- Removing a component prop that other components depend on

### How to handle them
1. **Never remove a column that's still referenced in frontend code.** Update the frontend first, deploy it, then remove the column in a separate migration.
2. **Never change an RLS policy without testing with real user roles.** What works for admin doesn't prove anything.
3. **Deprecate, then remove.** If a component prop is going away, mark it optional first, deploy, then remove in a follow-up.

---

## 7. Feature Flags & Rollout

### When to use feature flags
- Large features that take multiple PRs to complete
- Features that need A/B testing
- Features that depend on external services that might not be ready

### Implementation
Feature flags are stored in the `app_config` table:

```sql
-- Check if a feature is enabled
SELECT value FROM app_config WHERE key = 'feature.venue_booking' AND value = 'true';
```

In the frontend:
```typescript
const { data: isEnabled } = useQuery({
  queryKey: ['feature-flag', 'venue_booking'],
  queryFn: async () => {
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'feature.venue_booking')
      .single();
    return data?.value === 'true';
  },
});
```

### Rollout process
1. Merge feature behind a flag (flag = `false`)
2. Enable on staging, test thoroughly
3. Enable on production
4. Once stable, remove the flag and the conditional code

---

## 8. Platform Features Map

Current state of major features:

| Feature | Status | Key Files |
|---------|--------|-----------|
| **Auth (Email)** | ✅ Complete | `AuthContext.tsx`, `useAuthActions.ts` |
| **Auth (Faceit OAuth)** | ✅ Complete | `useFaceitAccount.ts`, `faceit-oauth` edge function |
| **Tournament Browse** | ✅ Complete | `Tournaments.tsx`, `TournamentCard.tsx` |
| **Tournament Creation** | ✅ Complete | `useTournamentWizard.ts`, `CreateTournament.tsx` |
| **Tournament Registration** | ✅ Complete | `useTournamentRegistrationStatus.ts` |
| **Check-in System** | ✅ Complete | `useCheckIn.ts` |
| **Bracket System** | ✅ Complete | `services/bracket/`, bracket components |
| **Map Veto** | ✅ Complete | `services/vetoService/`, `MapVeto.tsx` |
| **Score Reporting** | ✅ Complete | Match management hooks |
| **Team Management** | ✅ Complete | `useTeamManagement.ts` |
| **Player Profiles** | ✅ Complete | `PlayerProfile.tsx`, `useProfileManagement.ts` |
| **Organizer Profiles** | ✅ Complete | `OrganizerProfile.tsx`, media gallery |
| **Dispute System** | ✅ Complete | `MyDisputes.tsx`, `DisputeCenter.tsx` |
| **Venue Listing** | ✅ Complete | `VenueDetails.tsx`, `useVenueBooking.ts` |
| **Venue Booking** | ✅ Complete | `VenueBooking.tsx` |
| **Admin Dashboard** | ✅ Complete | `AdminDashboard.tsx`, `get_admin_dashboard_stats` RPC |
| **Notifications** | ✅ Complete | Real-time via Supabase |
| **CS2 Integration** | ⏸️ Parked | Do not implement without explicit instruction |

---

## 9. Rules

1. **Every feature is E2E.** No UI without backend. No backend without UI. Ship complete vertical slices.
2. **No feature without RLS.** If it touches the database, it has row-level security. No exceptions.
3. **No raw Supabase calls in components.** All data access goes through custom hooks in `src/hooks/`.
4. **One migration per concern.** Don't mix unrelated schema changes in a single migration file.
5. **Features ship working or don't ship.** Half-done features are worse than no features. If you can't finish it, don't merge it.
6. **Test with the right role.** Admin service role bypasses RLS. Testing as admin proves nothing about your security policies.
7. **The happy path is table stakes.** Error states, loading states, and empty states are required. Not optional. Not "nice to have."
8. **No hardcoded data in production code.** Every piece of displayed data comes from the database or a configuration source.
9. **Scope is sacred.** Build what was asked for. If you think of an improvement, file it as a separate task. Don't scope-creep mid-implementation.
10. **CS2 integration is parked.** Do not implement any CS2/Faceit match integration unless explicitly instructed.

---

## Related Documents
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md) — E2E development protocol
- [Coding Guidelines](./CODING_GUIDELINES.md) — Code standards
- [UI Style Guide](./UI_STYLE_GUIDE.md) — Visual design system
- [UX Guidelines](./UX_GUIDELINES.md) — User experience patterns
- [Code Quality Guidelines](./CODE_QUALITY_GUIDELINES.md) — Quality standards
