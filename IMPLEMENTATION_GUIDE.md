# Esportra Implementation Guide

> **Version 3.0** — Last Updated: March 2026
> The end-to-end protocol for building features on the Esportra platform.

---

## Table of Contents
1. [Core Mandate](#1-core-mandate)
2. [Project Architecture](#2-project-architecture)
3. [The 4-Phase Protocol](#3-the-4-phase-protocol)
4. [Backend Development](#4-backend-development)
5. [Frontend Development](#5-frontend-development)
6. [State Management](#6-state-management)
7. [Storage & Media](#7-storage--media)
8. [Real-time Features](#8-real-time-features)
9. [Verification](#9-verification)
10. [Common Patterns](#10-common-patterns)
11. [Rules](#11-rules)

---

## 1. Core Mandate

**Every feature is end-to-end.** UI-only changes are not permitted unless explicitly requested for prototyping.

| Anti-Pattern | Why It's Bad | Correct Approach |
|-------------|-------------|-----------------|
| UI-only changes | Data doesn't persist | Build backend first |
| Raw Supabase in components | Breaks separation of concerns | Use custom hooks |
| Skipping RLS | Security vulnerability | Always define policies |
| Hardcoded data | Not maintainable | Fetch from database |

---

## 2. Project Architecture

### Directory Structure
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
│
├── pages/               # Route-level components
│   ├── tournaments/
│   ├── organizer/
│   ├── admin/
│   ├── venues/
│   ├── user/
│   └── auth/
│
├── hooks/               # Custom React hooks (32+)
├── services/            # Business logic (bracket, veto)
├── lib/                 # Core utilities (Supabase client, query client)
├── contexts/            # React context providers
├── types/               # TypeScript type definitions
├── schemas/             # Zod validation schemas
├── config/              # App configuration
└── utils/               # Helper functions

supabase/
├── migrations/          # SQL migration files (auto-deployed)
└── functions/           # Edge Functions (auto-deployed)
```

### Tech Stack
| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | React 18 + Vite | UI framework |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Components** | Radix UI + shadcn/ui | Accessible primitives |
| **State** | TanStack React Query | Server state management |
| **Forms** | React Hook Form + Zod | Form handling + validation |
| **Backend** | Supabase | Database, Auth, Storage, Edge Functions |
| **Animation** | Framer Motion | UI animations |
| **Routing** | React Router | Client-side routing |
| **Mobile** | Capacitor | Android/iOS native shell |

---

## 3. The 4-Phase Protocol

When receiving any feature request, follow this order strictly.

### Phase 1: Database & Security
```
1. Does the table/column exist? If NO → write migration
2. RLS policies defined? If NO → add them (default deny)
3. Security triggers needed? If YES → add them
4. Complex logic? If YES → create RPC (SECURITY DEFINER for admin ops)
5. Test: query as authenticated non-admin user, verify access control
```

### Phase 2: Logic Layer
```
6. Create/update TypeScript types in src/types/
7. Create/update custom hook(s) in src/hooks/
8. Add TanStack Query keys (consistent, hierarchical)
9. Add cache invalidation on mutations
10. Add Zod schemas for validation (if applicable)
11. Test: hook returns correct data, mutations persist
```

### Phase 3: UI
```
12. Build/update components (follow UI Style Guide)
13. Add loading states (skeleton or spinner)
14. Add error states (message + retry action)
15. Add empty states (message + CTA)
16. Add toast feedback for mutations
17. Connect UI to hooks (no raw Supabase calls)
18. Test: visual review across breakpoints
```

### Phase 4: Verification
```
19. Happy path: action → persist → refresh → data still there
20. Role test: correct users can access, wrong users are blocked
21. Build: npm run build → zero errors
22. Console: no errors or warnings on affected pages
```

**Do not skip phases.** Do not start UI work before the backend is verified.

---

## 4. Backend Development

### Creating Migrations
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

### Common RLS Patterns
| Pattern | Use Case | Policy |
|---------|----------|--------|
| **Owner-only** | Private data | `auth.uid() = user_id` |
| **Public Read** | Profiles, published tournaments | `USING (true)` for SELECT |
| **Role-based** | Admin features | Check `profiles.role` or `admin_user_roles` |
| **Organizer** | Tournament management | `auth.uid() = organizer_id` |
| **Participant** | Match access | Join through `tournament_participants` |

### RPC functions
For operations that span multiple tables or need elevated permissions:

```sql
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
    p_dispute_id UUID,
    p_resolution TEXT,
    p_admin_notes TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM admin_user_roles
        WHERE user_id = auth.uid() AND role_id IN (
            SELECT id FROM admin_roles WHERE role_name = 'super_admin'
        )
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE disputes
    SET status = 'resolved', resolution = p_resolution, admin_notes = p_admin_notes
    WHERE id = p_dispute_id;
END;
$$;
```

### Storage Buckets
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

## 5. Frontend Development

### Custom Hooks — The Standard Pattern

Every data operation goes through a hook. No exceptions.

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
            toast({
                title: 'Update failed',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    return { data, isLoading, error, updateFeature };
};
```

### Query Configuration
```typescript
{
    staleTime: 1000 * 60 * 5,   // 5 min — data considered fresh
    gcTime: 1000 * 60 * 30,     // 30 min — cache garbage collection
    enabled: !!dependency,       // Conditional fetching
    refetchOnWindowFocus: false, // Prevent refetch on tab switch
}
```

### Component Integration
```typescript
const TournamentPage = ({ tournamentId }: Props) => {
    const { data, isLoading, error, refetch } = useTournament(tournamentId);

    if (isLoading) return <TournamentSkeleton />;
    if (error) return <ErrorState message="Failed to load tournament." retry={refetch} />;
    if (!data) return <EmptyState message="Tournament not found." />;

    return <TournamentContent tournament={data} />;
};
```

---

## 6. State Management

### TanStack Query Keys — Hierarchical and Consistent
```typescript
['tournaments']                                // All tournaments
['tournaments', tournamentId]                  // Single tournament
['tournaments', tournamentId, 'participants']  // Tournament participants
['tournaments', tournamentId, 'bracket']       // Tournament bracket
['matches', matchId]                           // Single match
['matches', matchId, 'veto']                   // Match veto state
['organizer-profile', slug]                    // Organizer profile
['organizer-media', organizerId]               // Organizer media
['teams', teamId]                              // Single team
['notifications', userId]                      // User notifications
['admin-dashboard-stats']                      // Admin dashboard
```

### Cache Invalidation
```typescript
// After mutation — invalidate specific query
queryClient.invalidateQueries({ queryKey: ['tournaments', tournamentId] });

// After mutation — invalidate all related queries
queryClient.invalidateQueries({ queryKey: ['tournaments'] });

// Optimistic update for immediate UI feedback
queryClient.setQueryData(['tournaments', id], (old) => ({
    ...old,
    ...optimisticUpdate,
}));
```

### What goes where
| State Type | Where | Example |
|-----------|-------|---------|
| **Server data** | TanStack Query | Tournament list, user profile |
| **Auth state** | React Context (`AuthContext`) | Current user, session |
| **UI state** | Component `useState` | Dialog open/closed, selected tab |
| **Form state** | React Hook Form | Input values, validation errors |
| **URL state** | React Router (`useSearchParams`) | Filters, pagination, active tab |

---

## 7. Storage & Media

### File Upload Pattern
```typescript
const uploadFile = async (file: File, bucket: string, path: string) => {
    const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

    return publicUrl;
};
```

### Image Processing
Use `src/lib/imageUtils.ts` for cropping, resizing, and brightness adjustment.

### Upload rules
- Validate file type and size on the frontend before uploading.
- Max avatar size: 5MB. Max banner size: 10MB.
- Use `upsert: true` for avatars/banners (replace, don't accumulate).
- Generate unique paths: `{userId}/{timestamp}-{filename}`.

---

## 8. Real-time Features

### Supabase Realtime Pattern
```typescript
useEffect(() => {
    const channel = supabase
        .channel('match-updates')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'brkt_matches', filter: `id=eq.${matchId}` },
            (payload) => {
                queryClient.invalidateQueries({ queryKey: ['matches', matchId] });
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}, [matchId]);
```

### Real-time Enabled Tables
| Table | Events | Use Case |
|-------|--------|----------|
| `brkt_matches` | UPDATE | Score updates, match status |
| `brkt_versions` | INSERT | Bracket version changes |
| `match_map_vetos` | UPDATE | Veto state changes |
| `match_map_veto_actions` | INSERT | New veto actions |
| `notifications` | INSERT | User notifications |
| `tournament_check_ins` | INSERT, UPDATE | Check-in status |

### Real-time rules
- Always clean up subscriptions in the `useEffect` return function.
- Use filters (e.g., `filter: 'id=eq.xxx'`) to avoid receiving unrelated events.
- Invalidate TanStack Query cache on realtime events — don't manually set data from the payload (let the query refetch for consistency).

---

## 9. Verification

### Manual Verification Checklist
- [ ] Perform action in UI
- [ ] Check browser console for errors
- [ ] Query database to verify data persisted
- [ ] Refresh page — state is preserved
- [ ] Test with different user roles (player, organizer, admin)
- [ ] Test error paths (network off, invalid input, expired session)
- [ ] Test on mobile viewport
- [ ] `npm run build` passes

### Common Debugging
| Symptom | Check |
|---------|-------|
| Data doesn't appear | Is the RLS policy blocking SELECT? |
| Insert/update fails silently | Is the RLS policy blocking the mutation? |
| Wrong data shape | Is the TypeScript type matching the DB schema? |
| Stale data after mutation | Is cache invalidation firing? Check query keys. |
| Component doesn't re-render | Is the query key changing when it should? |

---

## 10. Common Patterns

### Profile Picture Upload
1. **Backend**: Verify `users.avatars` bucket exists, `profiles.avatar_url` column.
2. **Hook**: `useProfileManagement` — file upload + DB update.
3. **UI**: Camera icon overlay → file input → crop dialog → upload.
4. **Verify**: Upload → refresh → image persists.

### Tournament Registration
1. **Backend**: `tournament_participants` table, RLS allows INSERT for authenticated users.
2. **Hook**: `useTournamentRegistrationStatus` — check status, submit, handle full tournament.
3. **UI**: Registration modal with team selection, loading/error states.
4. **Verify**: Register → check participants table → count increments.

### Dispute Filing
1. **Backend**: `disputes` table, RLS allows INSERT for match participants. Admin notification RPC.
2. **Hook**: Mutation for dispute creation, query for user's disputes.
3. **UI**: Dispute form with reason selection, evidence upload, confirmation.
4. **Verify**: Submit → appears in "My Disputes" → admin sees it in Dispute Center.

### Import Aliases
```typescript
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { TournamentRow } from "@/types/tournament";
```

---

## 11. Rules

1. **E2E or nothing.** Every feature needs backend (schema + RLS) → logic (hooks + types) → UI → verification.
2. **Follow the 4 phases in order.** Don't start UI before backend is tested.
3. **No raw Supabase calls in components.** Custom hooks only.
4. **Every table gets RLS.** Default deny. Explicit allow.
5. **Types match the schema.** If the DB column is `snake_case`, the TypeScript interface maps it to `camelCase` — but the Supabase query uses `snake_case`.
6. **TanStack Query for all server state.** No `useState` + `useEffect` for data fetching.
7. **Realtime subscriptions clean up on unmount.** No orphaned channels.
8. **Loading, error, and empty states are mandatory.** Every data-dependent component handles all three.
9. **Verify persistence.** If you can't refresh the page and see the data, the feature isn't done.
10. **Test with non-admin roles.** Admin service role bypasses RLS — testing as admin proves nothing.

---

## Related Documents
- [Coding Guidelines](./CODING_GUIDELINES.md) — Code standards and patterns
- [Code Quality Guidelines](./CODE_QUALITY_GUIDELINES.md) — Quality standards, review checklist
- [Features Guidelines](./FEATURES_GUIDELINES.md) — Feature scoping and delivery
- [UI Style Guide](./UI_STYLE_GUIDE.md) — Visual design system
- [UX Guidelines](./UX_GUIDELINES.md) — User experience patterns
