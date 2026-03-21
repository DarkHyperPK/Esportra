# Performance Fixing Guide — Esportra Web Platform

**Companion to**: `ALIGNMENT_AUDIT.md`
**Approach**: For every finding — isolate the problem, trace its root cause, explain why it causes harm, and apply a robust permanent fix (no bandaids).

---

## How to use this guide

Each fix follows the same structure:

1. **Isolate** — Where exactly is the problem? Exact file, line, component tree path.
2. **Root cause** — Why does this code exist, and what makes it wrong?
3. **How it causes harm** — The concrete user-facing or system-level impact.
4. **The robust fix** — Full code with explanation. Not a workaround — a permanent solution.
5. **Verify** — How to confirm the fix worked.

Fixes are ordered by severity (HIGH first), then grouped by category within each severity level.

---

# HIGH Severity Fixes

---

## FIX-01: Remove production debug import (`testSupabase`)

### Isolate

```
src/App.tsx:142 → import './utils/testSupabase'
src/utils/testSupabase.ts:45 → testSupabaseConnection() auto-executes on import
```

The import sits at the top-level of `App.tsx`. Because `App.tsx` is the root of the entire SPA, this module is eagerly loaded and executed on every single page load, in every environment.

### Root cause

This was a developer debugging utility added during early Supabase integration to verify the connection worked. It was never gated behind an environment check and was left in the production import chain. The function uses a top-level side-effect call pattern (`testSupabaseConnection()` at line 45) — the function runs the instant the module is evaluated by the bundler, before any React component mounts.

### How it causes harm

Every production user, on every page load, triggers:
1. `supabase.auth.getSession()` — an HTTP round-trip to the auth server
2. `supabase.from('profiles').select('count').limit(1)` — an HTTP round-trip to PostgREST

These are completely wasted requests. On slow connections, they compete for bandwidth with the actual data the page needs. They also leak implementation details (table names) into the browser console via `console.error` on failure.

### The robust fix

**Step 1**: Delete the import from `App.tsx`.

```diff
// src/App.tsx
- // Test Supabase connection on app start
- // Test Supabase connection on app start
- import './utils/testSupabase';
```

**Step 2**: Delete the file entirely.

```bash
rm src/utils/testSupabase.ts
```

If you want to keep a health-check utility for local dev, rewrite it as a dev-only module:

```ts
// src/utils/devHealthCheck.ts (optional — only if you want to keep this for local dev)
if (import.meta.env.DEV) {
  const { supabase } = await import('@/lib/supabase');

  const { error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) console.warn('[Dev] Supabase session check failed:', sessionErr.message);

  const { error: dbErr } = await supabase.from('profiles').select('count').limit(1);
  if (dbErr) console.warn('[Dev] Supabase DB check failed:', dbErr.message);
}
```

This uses `import.meta.env.DEV` — Vite tree-shakes the entire block out of production builds.

### Verify

1. `npm run build` — search the `dist/` output for `testSupabase` → should find nothing
2. Open production build in browser → Network tab → should see zero requests to `/rest/v1/profiles?select=count&limit=1` on page load

---

## FIX-02: Remove unused dependencies

### Isolate

```
package.json → dependencies section
```

Six packages installed that are never imported anywhere in `src/`:

| Package | Approx size | Why it's here |
|---------|-------------|---------------|
| `tesseract.js` | ~8 MB | Was likely explored for OCR feature, never used |
| `@aws-sdk/client-s3` | ~4 MB | Was likely explored for direct S3 uploads, Supabase Storage is used instead |
| `styled-components` | ~1.2 MB | Legacy — project uses Tailwind CSS |
| `@g-loot/react-tournament-brackets` | ~0.7 MB | Replaced by custom `GraphBracket` |
| `keen-slider` | ~0.4 MB | Was likely explored for carousels, `embla-carousel-react` is used instead |
| `react-svg-pan-zoom` | ~0.4 MB | Was likely explored for bracket pan/zoom, custom implementation used |

Also, `@vitejs/plugin-react` (Babel) is in `dependencies` but `@vitejs/plugin-react-swc` (SWC) is in `devDependencies` and is the one actually used in `vite.config.ts`.

### Root cause

Packages were added during exploration/prototyping and never cleaned up. They don't get tree-shaken because they were never imported — but they bloat `node_modules`, slow `npm install`, and could accidentally be imported by a future developer who sees them in `package.json` and assumes they're in use.

### How it causes harm

- `npm install` takes longer (14.7 MB extra)
- Dependency audit surface is larger (more potential CVEs to track)
- Confusing for new contributors who see them listed

### The robust fix

```bash
npm uninstall tesseract.js @aws-sdk/client-s3 styled-components @g-loot/react-tournament-brackets keen-slider react-svg-pan-zoom @vitejs/plugin-react
```

### Verify

1. `npm run build` → should succeed with zero errors
2. `npm ls --depth=0` → none of the 7 packages should appear

---

## FIX-03: Split the monolithic vendor-main chunk

### Isolate

```
vite.config.ts:29-39 → manualChunks function
```

The current logic: if a module is in `node_modules` and isn't recharts, framer-motion, lucide-react, or @supabase, it goes into `vendor-main`. This means React, React DOM, React Router, TanStack Query, 20+ Radix packages, Zod, date-fns, react-hook-form, SignalR, etc. are all in one chunk.

### Root cause

The original chunking strategy was a good start — it split the obvious big libraries. But the fallback `return 'vendor-main'` catches everything else into a single file. As the project grew, this chunk grew with it.

### How it causes harm

- **Cache invalidation**: Updating any single dependency (even a patch bump to `zod`) invalidates the entire vendor-main chunk for every user
- **Parse time**: One large JS file takes longer to parse than several smaller files loaded in parallel
- **No granular loading**: Every page loads libraries only used by other pages (e.g., the landing page downloads SignalR even though it doesn't use real-time features)

### The robust fix

```ts
// vite.config.ts — replace the manualChunks function
manualChunks(id) {
  if (id.includes('node_modules')) {
    // Isolated large libraries (already existed)
    if (id.includes('recharts')) return 'vendor-charts';
    if (id.includes('framer-motion')) return 'vendor-framer';
    if (id.includes('lucide-react')) return 'vendor-lucide';
    if (id.includes('@supabase')) return 'vendor-supabase';

    // New splits — group by domain
    if (id.includes('@radix-ui')) return 'vendor-radix';
    if (id.includes('@tanstack')) return 'vendor-tanstack';
    if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
    if (id.includes('zod') || id.includes('react-hook-form') || id.includes('@hookform')) return 'vendor-forms';
    if (id.includes('@microsoft/signalr')) return 'vendor-signalr';
    if (id.includes('date-fns')) return 'vendor-date';

    // Catch-all for remaining small packages
    return 'vendor-misc';
  }
}
```

**Why this grouping**:
- `vendor-react` — changes only on React major bumps (rare)
- `vendor-radix` — all shadcn/ui primitives, changes only when shadcn is updated
- `vendor-tanstack` — React Query + React Virtual, changes infrequently
- `vendor-forms` — Zod + react-hook-form, changes infrequently
- `vendor-signalr` — only loaded by pages that use real-time features
- `vendor-date` — date-fns, very stable
- `vendor-misc` — small catch-all, less impactful if invalidated

### Verify

1. `npm run build` → check `dist/assets/` for the new chunk files
2. Compare total bundle size before/after (should be roughly the same, but distributed across more files)
3. Load the landing page → Network tab → `vendor-signalr` should NOT be loaded (it's only needed by pages with real-time features)

---

## FIX-04: Memoize UnifiedProfileContext

### Isolate

```
src/contexts/UnifiedProfileContext.tsx
├── Line 127: UnifiedProfileProvider component
├── Lines 136-264: loadUnifiedProfile (plain function, recreated every render)
├── Lines 267-293: switchMode (plain function)
├── Lines 296-309: canAccessMode (plain function)
├── Lines 312-326: updateProfile (plain function)
├── Lines 329-331: refreshProfile (plain function)
├── Lines 334-405: 7 getter functions (all plain functions)
├── Lines 411-426: value object (plain object literal, new reference every render)
└── Line 429: Provider renders with this value
```

### Root cause

The provider creates 12 functions and 1 object literal on every render. In React, when a context value is a new reference, **every consumer** of that context re-renders — even if the actual data hasn't changed. Since this provider wraps the entire app (it's inside `AuthProvider` → `RoleProvider` → ... → `UnifiedProfileProvider`), any state change in any parent causes all consumers to re-render.

The effect at line 407 depends on `[user, authProfile]` — but `authProfile` is the full object from `useAuth()`. If `AuthContext` returns a new object reference (which it likely does on any auth state change), `loadUnifiedProfile` runs again, setting `isLoading` → `true` then `false`, which triggers 2 state changes → 2 re-renders → 2 new `value` objects → all consumers re-render twice.

### How it causes harm

Every component using `useUnifiedProfile()` — profile pages, navbar avatar display, mode switcher, earning displays — re-renders on every unrelated state change anywhere up the tree. On a page with 10 consumers, that's 10 wasted re-renders per cycle.

### The robust fix

```tsx
// src/contexts/UnifiedProfileContext.tsx — rewrite the provider body

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
// ... other imports stay the same

export const UnifiedProfileProvider: React.FC<UnifiedProfileProviderProps> = ({ children }) => {
  const { user, profile: authProfile } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UnifiedProfile | null>(null);
  const [currentMode, setCurrentMode] = useState<ProfileMode>('player');
  const [isLoading, setIsLoading] = useState(true);

  // Stable reference: only changes when user ID changes
  const userId = user?.id;
  const authProfileId = authProfile?.id;

  const loadUnifiedProfile = useCallback(async () => {
    if (!userId || !authProfile) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [profileData, statsData] = await Promise.all([
        apiClient.get<any>(`/api/profiles/${userId}`).catch(() => null),
        apiClient.get<any>(`/api/profiles/${userId}/stats`).catch(() => null),
      ]);

      // ... same profile building logic ...
      // (keep the entire unifiedProfile construction as-is)

      const unifiedProfile: UnifiedProfile = {
        id: authProfile.id,
        username: authProfile.username || '',
        full_name: authProfile.full_name || '',
        email: authProfile.email || '',
        avatar_url: authProfile.avatar_url,
        created_at: authProfile.created_at || new Date().toISOString(),
        // ... rest stays identical
        reputation: { /* same */ },
        player_profile: { /* same */ },
        organizer_profile: { /* same */ },
        venue_profile: { /* same */ },
        messaging: { unread_count: 0, recent_conversations: [] },
        notifications: { unread_count: 0, recent_notifications: [] },
        financial: { /* same */ },
      } as UnifiedProfile; // Cast since we're showing the pattern, not full fields

      setProfile(unifiedProfile);

      const savedMode = localStorage.getItem('profileMode') as ProfileMode;
      if (savedMode && ['player', 'organizer', 'venue_owner'].includes(savedMode)) {
        setCurrentMode(savedMode);
      }
    } catch (error) {
      console.error('Error loading unified profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, authProfileId]); // <-- Depend on primitives, not objects

  const switchMode = useCallback(async (mode: ProfileMode): Promise<boolean> => {
    if (!profile) return false;
    // canAccessMode is called here — it reads from closure, which is fine
    // since switchMode itself is only recreated when profile/authProfile changes
    const role = authProfile?.role;
    const canAccess = mode === 'player' ||
      (mode === 'organizer' && (role === 'admin' || profile.organizer_profile.verification_status === 'verified')) ||
      (mode === 'venue_owner' && (role === 'admin' || profile.venue_profile.verification_status === 'verified'));

    if (!canAccess) {
      toast({ title: 'Access Denied', description: `You don't have access to ${mode} mode`, variant: 'destructive' });
      return false;
    }

    setCurrentMode(mode);
    localStorage.setItem('profileMode', mode);
    toast({ title: 'Mode Switched', description: `Switched to ${mode} mode` });
    return true;
  }, [profile, authProfile?.role, toast]);

  const canAccessMode = useCallback((mode: ProfileMode): boolean => {
    if (!profile) return false;
    switch (mode) {
      case 'player': return true;
      case 'organizer':
        return authProfile?.role === 'admin' || profile.organizer_profile.verification_status === 'verified';
      case 'venue_owner':
        return authProfile?.role === 'admin' || profile.venue_profile.verification_status === 'verified';
      default: return false;
    }
  }, [profile, authProfile?.role]);

  const updateProfile = useCallback(async (updates: Partial<UnifiedProfile>): Promise<boolean> => {
    if (!profile) return false;
    try {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  }, [profile]);

  const refreshProfile = useCallback(async (): Promise<void> => {
    await loadUnifiedProfile();
  }, [loadUnifiedProfile]);

  const getCurrentDisplayName = useCallback((): string => {
    if (!profile) return 'User';
    switch (currentMode) {
      case 'player': return profile.full_name || profile.username;
      case 'organizer': return profile.organizer_profile.company_name || 'Organizer';
      case 'venue_owner': return profile.venue_profile.venue_name || 'Venue Owner';
      default: return profile.full_name || profile.username;
    }
  }, [profile, currentMode]);

  const getCurrentAvatar = useCallback((): string | null => {
    if (!profile) return null;
    switch (currentMode) {
      case 'player': return profile.avatar_url ?? null;
      case 'organizer': return profile.organizer_profile.company_logo ?? null;
      case 'venue_owner': return profile.venue_profile.venue_logo ?? null;
      default: return profile.avatar_url ?? null;
    }
  }, [profile, currentMode]);

  const getCurrentEarnings = useCallback((): number => {
    if (!profile) return 0;
    switch (currentMode) {
      case 'player': return profile.player_profile.gaming_stats.total_earnings;
      case 'organizer': return profile.organizer_profile.business_stats.total_revenue;
      case 'venue_owner': return profile.venue_profile.venue_stats.total_revenue;
      default: return 0;
    }
  }, [profile, currentMode]);

  const getCurrentStats = useCallback((): any => {
    if (!profile) return {};
    switch (currentMode) {
      case 'player': return profile.player_profile.gaming_stats;
      case 'organizer': return profile.organizer_profile.business_stats;
      case 'venue_owner': return profile.venue_profile.venue_stats;
      default: return {};
    }
  }, [profile, currentMode]);

  const getUnifiedRating = useCallback((): number => {
    return profile?.reputation.overall_rating || 0;
  }, [profile?.reputation.overall_rating]);

  const getUnifiedBadges = useCallback((): string[] => {
    return profile?.reputation.badges || [];
  }, [profile?.reputation.badges]);

  const getUnifiedActivity = useCallback((): any[] => {
    return [];
  }, []);

  useEffect(() => {
    loadUnifiedProfile();
  }, [loadUnifiedProfile]); // <-- Now stable: only runs when userId or authProfileId changes

  const value = useMemo<UnifiedProfileContextType>(() => ({
    profile,
    currentMode,
    isLoading,
    switchMode,
    canAccessMode,
    updateProfile,
    refreshProfile,
    getCurrentDisplayName,
    getCurrentAvatar,
    getCurrentEarnings,
    getCurrentStats,
    getUnifiedRating,
    getUnifiedBadges,
    getUnifiedActivity,
  }), [
    profile, currentMode, isLoading,
    switchMode, canAccessMode, updateProfile, refreshProfile,
    getCurrentDisplayName, getCurrentAvatar, getCurrentEarnings, getCurrentStats,
    getUnifiedRating, getUnifiedBadges, getUnifiedActivity,
  ]);

  return (
    <UnifiedProfileContext.Provider value={value}>
      {children}
    </UnifiedProfileContext.Provider>
  );
};
```

**Key changes**:
1. Every function → `useCallback` with minimal deps
2. `useEffect` depends on `loadUnifiedProfile` which depends on `userId` (primitive), not `user` (object)
3. `value` → `useMemo` — only creates a new reference when actual data changes
4. `authProfile` object replaced with `authProfile?.role` and `authProfileId` in deps

### Verify

1. React DevTools → Profiler → interact with the app → consumers of `useUnifiedProfile` should only re-render when profile/mode actually changes
2. Add `console.count('UnifiedProfileProvider render')` temporarily — should fire once on mount, not on every interaction

---

## FIX-05: Fix AdminContext `hasPermission` defeating `useMemo`

### Isolate

```
src/contexts/AdminContext.tsx
├── Line 114-118: hasPermission — plain inline function (new reference every render)
├── Line 120-127: useMemo depends on hasPermission → re-runs every render
```

### Root cause

`hasPermission` is defined as a regular function inside the component body. It closes over `isAdmin`, `roles`, and `permissions`. Because it's not wrapped in `useCallback`, it's a new function reference on every render. Since `useMemo` at line 120 lists `hasPermission` in its deps array, the memo is invalidated every render — making it functionally useless.

### How it causes harm

The `AdminContext.Provider` value is a new object every render. Every `useAdmin()` consumer re-renders whenever `AdminProvider` re-renders (which happens whenever `AuthProvider` re-renders, which happens on any auth state change). The admin sidebar, permission checks in route guards, and admin tool pages all re-render unnecessarily.

### The robust fix

```tsx
// src/contexts/AdminContext.tsx — fix hasPermission

// Replace lines 114-127 with:
const hasPermission = useCallback((perm: string): boolean => {
  if (!isAdmin) return false;
  if (roles.includes('super_admin')) return true;
  return permissions.includes(perm);
}, [isAdmin, roles, permissions]);

const value = useMemo<AdminContextValue>(() => ({
  isAdmin,
  roles,
  permissions,
  loading: loadingAdmin,
  hasPermission,
  refresh: load
}), [isAdmin, roles, permissions, loadingAdmin, hasPermission, load]);
```

Now `hasPermission` only changes when `isAdmin`, `roles`, or `permissions` change — which only happens after an API call. The `useMemo` on `value` actually works as intended.

### Verify

1. React DevTools → inspect `AdminContext.Provider` → the value reference should stay stable between renders when no admin data changes
2. `console.count('AdminProvider useMemo')` inside the memo factory — should fire once on mount and only after admin role refreshes

---

## FIX-06: Memoize bracket graph components

### Isolate

```
src/components/bracket/GraphBracket.tsx
├── Line 51: zoom state lives in same component that renders all nodes/edges
├── Lines 316-318: edges.map → renders EdgePath for every edge
├── Lines 322-352: nodes.map → renders GraphMatchCard for every node
├── Line 397-426: EdgePath defined as plain component (no React.memo)

src/components/bracket/GraphMatchCard.tsx
├── Line 29: GraphMatchCard is a plain React.FC (no React.memo)

Problem: Changing zoom triggers a re-render of GraphBracket, which re-renders
every single GraphMatchCard and EdgePath — even though their props haven't changed.
```

### Root cause

`zoom` is CSS transform state — it only affects the container's `transform: scale(...)`. But because `zoom` lives in the same component that renders all bracket nodes, React re-renders the entire node/edge tree on every zoom change. Neither `GraphMatchCard` nor `EdgePath` is wrapped in `React.memo`, so React has no way to skip them.

Additionally, the `onGoLive`, `onReportScore`, and `onOpenVeto` callbacks are inline arrow functions created inside the `.map()` loop (lines 343-348). These are new function references every render, which would defeat `React.memo` even if it were added.

### How it causes harm

A 32-team single-elimination bracket has 31 match nodes + 30 edges = 61 components. A 128-team bracket has 127 + 126 = 253 components. Every zoom click re-renders all of them. Users see jank/stutter when zooming, especially on mobile.

### The robust fix

**Step 1**: Wrap `GraphMatchCard` in `React.memo`.

```tsx
// src/components/bracket/GraphMatchCard.tsx
// Change the export at line 29 from:
export const GraphMatchCard: React.FC<GraphMatchCardProps> = ({ ... }) => {
// To:
export const GraphMatchCard: React.FC<GraphMatchCardProps> = React.memo(({ ... }) => {
  // ... entire component body stays the same
});

// Also wrap TeamRow:
const TeamRow: React.FC<{ ... }> = React.memo(({ team, score, isWinner, isBye }) => {
  // ... same body
});
```

**Step 2**: Wrap `EdgePath` in `React.memo` and extract it.

```tsx
// src/components/bracket/GraphBracket.tsx — replace lines 397-426
const EdgePath: React.FC<{ edge: BracketEdge; nodes: BracketNode[] }> = React.memo(({ edge, nodes }) => {
    const source = nodes.find(n => n.id === edge.source_match_id);
    const target = nodes.find(n => n.id === edge.target_match_id);

    if (!source || !target || source.x === undefined || source.y === undefined || target.x === undefined || target.y === undefined) {
        return null;
    }

    const startX = source.x + MATCH_WIDTH;
    const startY = source.y + MATCH_HEIGHT / 2;
    const endX = target.x;
    const endY = edge.target_slot === 1
        ? target.y + MATCH_HEIGHT * 0.3
        : target.y + MATCH_HEIGHT * 0.7;
    const controlX1 = startX + (endX - startX) / 2;
    const controlX2 = endX - (endX - startX) / 2;

    return (
        <path
            d={`M ${startX} ${startY} C ${controlX1} ${startY}, ${controlX2} ${endY}, ${endX} ${endY}`}
            fill="none"
            stroke={edge.type === 'winner' ? '#64748b' : '#ef4444'}
            strokeWidth="2"
            strokeDasharray={edge.type === 'loser' ? '4 4' : undefined}
            className="opacity-50 hover:opacity-100 transition-opacity"
        />
    );
});
```

**Step 3**: Stabilize callback props in `GraphBracket` to avoid defeating `React.memo`.

```tsx
// Inside GraphBracket component, replace the inline arrows in the .map() with useCallback:

const handleGoLiveForNode = useCallback((nodeId: string) => {
    const node = data?.nodes.find(n => n.id === nodeId);
    if (node) handleGoLive(node);
}, [data?.nodes, handleGoLive]);

const handleReportScoreForNode = useCallback((nodeId: string) => {
    const node = data?.nodes.find(n => n.id === nodeId);
    if (node) handleReportScore(node);
}, [data?.nodes, handleReportScore]);

// Then in the .map():
<GraphMatchCard
    node={node}
    team1={node.team1_id ? teamsMap.get(node.team1_id) : null}
    team2={node.team2_id ? teamsMap.get(node.team2_id) : null}
    team1Score={(node as any).team1_score}
    team2Score={(node as any).team2_score}
    isOrganizer={isOrganizer}
    onGoLive={() => handleGoLiveForNode(node.id)}
    onReportScore={() => handleReportScoreForNode(node.id)}
    onOpenVeto={() => { /* ... */ }}
/>
```

> **Note**: The inline `() => handleGoLiveForNode(node.id)` still creates a new reference per render. For maximum optimization, pass `nodeId` as a prop and let `GraphMatchCard` call the stable callback internally. But the `React.memo` on `GraphMatchCard` with a custom comparator is the 80/20 win.

### Verify

1. React DevTools → Profiler → click zoom in/out → `GraphMatchCard` instances should show "Did not render" (greyed out)
2. Test with a 32-team bracket — zoom should feel noticeably smoother

---

## FIX-07: Eliminate N+1 fetches in tournament Details.tsx

### Isolate

```
src/pages/tournaments/Details.tsx
├── Lines 200-207: for each team_id → individual apiClient.get('/api/teams/${id}')
├── Lines 211-216: for each user_id → individual apiClient.get('/api/profiles/${id}')
```

### Root cause

`fetchPublicParticipants` was written before batch endpoints existed. It fetches participants as a list, then resolves team names and user profiles one-by-one using `Promise.all`. While `Promise.all` runs them concurrently (not truly sequential), the browser's HTTP/2 connection limit (typically 100 concurrent streams) means 200+ requests still queue up. Each request also has per-request overhead (TLS, headers, server-side auth check).

The `GraphBracket` component already uses `POST /api/teams/batch` (line 84 in GraphBracket.tsx) — but `Details.tsx` doesn't use it.

### How it causes harm

A 32-team tournament with 5-player rosters:
- 32 team fetches + 160 profile fetches = **192 HTTP requests**
- At ~50ms each with server overhead = **~3-10 seconds** of loading time
- This runs on the public tournament details page — the most-visited page in the app

### The robust fix

**Step 1**: Use the existing batch teams endpoint. Create a batch profiles endpoint if it doesn't exist.

```tsx
// src/pages/tournaments/Details.tsx — replace lines 200-216

// Resolve teams in batch (use existing endpoint)
let teamMap: Record<string, { logo_url: string | null; name: string }> = {};
if (teamIds.length > 0) {
  const teams = await apiClient.post<any[]>('/api/teams/batch', { ids: teamIds });
  (teams || []).forEach((t: any) => {
    teamMap[t.id] = { logo_url: t.logo_url, name: t.name };
  });
}

// Resolve profiles in batch
if (allUserIds.size > 0) {
  const profiles = await apiClient.post<any[]>('/api/profiles/batch', {
    ids: Array.from(allUserIds),
  });

  const profileMap: Record<string, any> = {};
  (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

  participants.forEach(p => {
    if (p.user_id && profileMap[p.user_id]) {
      const profile = profileMap[p.user_id];
      p.user = profile;
      // ... same display_name logic
    }
  });
}
```

**Step 2**: If `POST /api/profiles/batch` doesn't exist in the .NET API, create it:

```csharp
// Esportra.Api/Endpoints/ProfileEndpoints.cs
app.MapPost("/api/profiles/batch", async (BatchIdsRequest req, NpgsqlConnection db) =>
{
    var profiles = await db.QueryAsync<ProfileDto>(
        "SELECT id, username, full_name, avatar_url, riot_tag, faceit_nickname FROM profiles WHERE id = ANY(@Ids)",
        new { Ids = req.Ids.ToArray() });
    return Results.Ok(profiles);
}).RequireAuthorization();
```

This reduces 192 HTTP requests → 2 HTTP requests.

**Step 3**: Also convert this entire function to a `useQuery` call for caching (see FIX-13).

### Verify

1. Open Network tab → navigate to a tournament with 32 teams
2. Should see exactly 1 request to `/api/tournaments/{id}/participants`, 1 to `/api/teams/batch`, 1 to `/api/profiles/batch`
3. Page load time should drop from 5-10s to <1s

---

## FIX-08: Fix CaptainMatchPage sequential waterfall

### Isolate

```
src/pages/tournaments/CaptainMatchPage.tsx
├── Lines 85-97: bracketVersions query (waits for tournament)
├── Lines 100-114: allGraphData query — sequential for...of loop (lines 106-110)
├── Lines 160-170: captain-teams query — individual fetches per team (lines 164-165)
```

### Root cause

Three problems:

1. **Sequential for...of in an async query**: `for (const version of bracketVersions)` awaits each `repo.getGraphStructure(version.id)` one at a time. If there are 3 versions, that's 3 sequential round-trips.

2. **N+1 team fetches**: Uses individual `apiClient.get('/api/teams/${id}')` instead of the batch endpoint that `GraphBracket.tsx` already uses.

3. **Waterfall dependency chain**: tournament → bracketVersions → allGraphData → teams. Each level can only start after the previous one completes.

### How it causes harm

- 3 bracket versions × ~100ms each = 300ms wasted (could be 100ms in parallel)
- 16 team fetches × ~50ms each = 800ms wasted (could be one 50ms batch request)
- The captain match page is time-critical — captains need it during live matches

### The robust fix

```tsx
// src/pages/tournaments/CaptainMatchPage.tsx

// FIX 1: Parallel graph structure fetches (replace lines 100-114)
const { data: allGraphData, isLoading: graphLoading, refetch: refetchBracket } = useQuery({
    queryKey: ['captain-all-matches', bracketVersions?.map((v: any) => v.id).join(',')],
    queryFn: async () => {
        if (!bracketVersions || bracketVersions.length === 0) return { nodes: [], edges: [] };

        // Fetch all versions in PARALLEL, not sequential
        const results = await Promise.all(
            bracketVersions.map(version => repo.getGraphStructure(version.id))
        );

        const allNodes: any[] = [];
        const allEdges: any[] = [];
        for (const { nodes, edges } of results) {
            allNodes.push(...nodes);
            allEdges.push(...edges);
        }
        return { nodes: allNodes, edges: allEdges };
    },
    enabled: bracketVersions && bracketVersions.length > 0,
});

// FIX 2: Batch team fetches (replace lines 160-170)
const { data: teamsData } = useQuery({
    queryKey: ['captain-teams', teamIds.join(',')],
    queryFn: async () => {
        if (teamIds.length === 0) return [];
        return apiClient.post<any[]>('/api/teams/batch', { ids: teamIds });
    },
    enabled: teamIds.length > 0,
});
```

### Verify

1. Network tab → navigate to captain match page → should see one `/api/teams/batch` instead of N individual `/api/teams/` calls
2. Graph structure requests should fire in parallel (check timing waterfall in Network tab)

---

## FIX-09: Fix useMessaging SignalR reconnection bug

### Isolate

```
src/hooks/useMessaging.ts
├── Line 217-271: SignalR useEffect
├── Line 271: deps = [user, conversationIds, currentConversation]
├── Line 224-250: MessageReceived handler reads currentConversation from closure
├── Line 267-269: cleanup stops connection
```

### Root cause

`currentConversation` is included in the `useEffect` dependency array. But the effect's setup phase builds the SignalR connection and registers handlers, and the cleanup phase stops the connection. This means:

1. User opens conversation A → effect runs → connection established → joins all conversations
2. User switches to conversation B → `currentConversation` changes → effect cleanup runs → **connection.stop()** → effect setup runs → **new connection established** → joins all conversations again

The `currentConversation` variable is only used inside the `MessageReceived` handler (lines 225, 240) to decide whether to append the message to the current view or just increment the unread count. It should be read from a ref, not from the closure.

### How it causes harm

Every conversation switch:
1. Destroys the WebSocket connection (triggers server-side cleanup)
2. Opens a new WebSocket connection (new TLS handshake, new auth)
3. Re-invokes `JoinConversations` for all conversations
4. Brief window where messages are missed (between stop and reconnect)

Users with frequent conversation switching experience message drops and latency spikes.

### The robust fix

```tsx
// src/hooks/useMessaging.ts

// Add a ref for currentConversation (after the state declarations, around line 58)
const currentConversationRef = useRef<Conversation | null>(null);

// Keep the ref in sync (add after the useState declarations)
useEffect(() => {
  currentConversationRef.current = currentConversation;
}, [currentConversation]);

// Replace the SignalR useEffect (lines 217-271):
useEffect(() => {
    if (!user || conversationIds.length === 0) return;

    const connection = buildHubConnection(HubPaths.Conversation);
    connectionRef.current = connection;

    connection.on('MessageReceived', (newMessage: Message) => {
      const current = currentConversationRef.current; // <-- Read from ref, not closure

      if (current && newMessage.conversation_id === current.id) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
      }

      setConversations(prev => {
        return prev.map(conv => {
          if (conv.id === newMessage.conversation_id) {
            return {
              ...conv,
              last_message: newMessage,
              updated_at: newMessage.created_at,
              unread_count: currentConversationRef.current?.id === conv.id
                ? (conv.unread_count || 0)
                : (conv.unread_count || 0) + 1,
            };
          }
          return conv;
        }).sort((a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      });
    });

    connection.on('MessageEdited', (update: { id: string; content: string; is_edited: boolean; edited_at: string }) => {
      setMessages(prev => prev.map(msg =>
        msg.id === update.id ? { ...msg, content: update.content, is_edited: update.is_edited, edited_at: update.edited_at } : msg
      ));
    });

    connection.on('MessageDeleted', (payload: { id: string }) => {
      setMessages(prev => prev.filter(msg => msg.id !== payload.id));
    });

    startWithRetry(connection)
      .then(() => connection.invoke('JoinConversations', conversationIds))
      .catch(err => console.error('[ConversationHub] Failed to connect:', err));

    return () => {
      connection.stop();
      connectionRef.current = null;
    };
}, [user, conversationIds]); // <-- currentConversation REMOVED from deps
```

### Verify

1. Open messaging → switch between conversations → Network tab → WebSocket should remain the same connection (no new WS handshakes)
2. Console should NOT show repeated `[ConversationHub] Failed to connect` or reconnection logs
3. Send a message from another user while switching conversations → message should still appear in real-time

---

## FIX-10: Fix useTeamMutations wrong query key

### Isolate

```
src/hooks/teams/useTeamMutations.ts:113 → invalidates ['user_teams']
src/hooks/useTeamManagement.ts:95 → actual query key is ['my-teams']
```

### Root cause

The mutation was written (or last updated) at a time when the query key was `'user_teams'`. Later, `useTeamManagement.ts` was refactored to use `'my-teams'` (line 95). The mutation's invalidation was never updated to match.

### How it causes harm

After editing a team (name, logo, banner), the team list page shows the **old data** until the user manually refreshes or navigates away. The stale cache is never invalidated because the invalidation targets a key that doesn't exist in the query cache.

### The robust fix

```tsx
// src/hooks/teams/useTeamMutations.ts — replace line 113
onSuccess: (data, variables) => {
    queryClient.invalidateQueries({ queryKey: ['team', variables.teamId] });
    queryClient.invalidateQueries({ queryKey: ['my-teams'] }); // <-- Match the actual query key
},
```

### Verify

1. Edit a team name → navigate back to team list → name should be updated immediately without manual refresh
2. Search the codebase for `['user_teams']` — should find zero results after this fix

---

## FIX-11: Move Google Fonts from CSS @import to HTML preload

### Isolate

```
src/index.css:2 → @import url('https://fonts.googleapis.com/css2?family=Inter:...')
index.html → no font preloading
```

### Root cause

CSS `@import` is render-blocking. The browser cannot paint anything until the CSS file is fully downloaded and parsed. An `@import` inside CSS creates a dependency chain: HTML → load CSS → find @import → load external font CSS → load WOFF2 files → paint text.

### How it causes harm

First Contentful Paint is delayed by 200-500ms depending on connection speed. The external Google Fonts API must be contacted, which adds DNS lookup + TCP + TLS + HTTP round-trip before any font CSS is even received.

### The robust fix

**Step 1**: Remove the @import from CSS.

```diff
// src/index.css
- /* Google Fonts - must be first */
- @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@400;600;700;800&display=swap');
```

**Step 2**: Add preload hints to `index.html`.

```html
<!-- index.html — inside <head>, after the meta tags -->

<!-- Preconnect to Google Fonts (DNS + TCP + TLS ahead of time) -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- Load font CSS as non-blocking preload -->
<link rel="preload" as="style"
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@400;600;700;800&display=swap" />
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@400;600;700;800&display=swap"
  media="print" onload="this.media='all'" />
<noscript>
  <link rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@400;600;700;800&display=swap" />
</noscript>
```

**How this works**:
- `rel="preconnect"` — starts DNS/TCP/TLS early
- `rel="preload" as="style"` — tells browser to fetch the font CSS with high priority but not block rendering
- `media="print" onload="this.media='all'"` — classic non-blocking stylesheet pattern: browser downloads it but doesn't apply until loaded, then switches to `all` media

### Verify

1. Lighthouse → Performance → check that "Eliminate render-blocking resources" no longer flags the Google Fonts URL
2. First Contentful Paint should improve by 200-500ms

---

# MEDIUM Severity Fixes

---

## FIX-12: Eagerly import SuspensionGuard

### Isolate

```
src/App.tsx:43 → SuspensionGuard lazy-loaded
src/App.tsx:168 → wraps ALL routes
```

### Root cause

`SuspensionGuard` is `React.lazy()` loaded but wraps every single route (line 168). It's the first component inside `<React.Suspense>`. If its chunk hasn't loaded when the user navigates, the entire app shows the `PremiumLoadingScreen` fallback — not just the target page.

### The robust fix

```diff
// src/App.tsx — change line 43 from lazy to static import
- const SuspensionGuard = React.lazy(() => import("./components/auth/SuspensionGuard").then(m => ({ default: m.SuspensionGuard })));
+ import { SuspensionGuard } from "@/components/auth/SuspensionGuard";
```

SuspensionGuard is tiny (it's just a wrapper component). The cost of including it in the main bundle is negligible compared to the jarring full-page loading screen it causes when lazy-loaded.

---

## FIX-13: Migrate Details.tsx raw fetches to TanStack Query

### Isolate

```
src/pages/tournaments/Details.tsx
├── fetchPublicParticipants — useCallback + useEffect + useState
├── 4-5 other useEffect fetch patterns
├── Line 579-585: stale-deps bug (checkRegistration not in deps)
```

### Root cause

These fetch patterns predate the project's adoption of TanStack Query. They use the manual `useEffect → setState → loading` pattern with no caching, deduplication, retry, or stale-while-revalidate.

### The robust fix

Convert `fetchPublicParticipants` to a `useQuery`:

```tsx
const { data: enrichedParticipants = [], isLoading: participantsLoading } = useQuery({
  queryKey: ['tournament-participants-enriched', tournament?.id],
  queryFn: async () => {
    const participantsData = await apiClient.get<any[]>(`/api/tournaments/${tournament!.id}/participants`);
    if (!participantsData) return [];

    const participants = participantsData as any[];
    const teamIds = [...new Set(participants.filter(p => p.team_id).map(p => p.team_id))];
    const allUserIds = [...new Set(participants.filter(p => p.user_id).map(p => p.user_id))];

    // Batch fetch teams + profiles in parallel
    const [teams, profiles] = await Promise.all([
      teamIds.length > 0
        ? apiClient.post<any[]>('/api/teams/batch', { ids: teamIds })
        : Promise.resolve([]),
      allUserIds.length > 0
        ? apiClient.post<any[]>('/api/profiles/batch', { ids: allUserIds })
        : Promise.resolve([]),
    ]);

    const teamMap = Object.fromEntries((teams || []).map(t => [t.id, t]));
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    // Enrich participants
    return participants.map(p => ({
      ...p,
      user: p.user_id ? profileMap[p.user_id] : undefined,
      team_logo: p.team_logo || teamMap[p.team_id]?.logo_url,
      team_name: teamMap[p.team_id]?.name || p.team_name,
      display_name: getDisplayName(p, profileMap[p.user_id], tournament?.game),
    }));
  },
  enabled: !!tournament?.id,
  staleTime: 60_000, // 1 minute
});
```

Apply the same pattern to all other `useEffect + useState` fetches in the file.

---

## FIX-14: Fix Framer Motion `height: 'auto'` layout thrash

### Isolate

9 locations across 6 files:
- `src/pages/auth/SignUp.tsx:288`
- `src/pages/tournaments/brackets/MatchCard.tsx:357`
- `src/components/navigation/MobileNav.tsx:32`
- `src/components/organizer/OrganizationStaffManager.tsx:470, 687`
- `src/components/tournament/MatchAutoReport.tsx:322, 414`
- `src/components/tournament/RoundSchedulingPanel.tsx:457`
- `src/components/tournament/wizard/StepBasicInfo.tsx:181`

### Root cause

When Framer Motion animates `height: 'auto'`, it measures the element's natural height on every frame using `getBoundingClientRect()`, which forces a browser layout recalculation. This creates a layout → paint → layout → paint cycle (layout thrashing) for the duration of the animation.

### The robust fix

Replace `height: 'auto'` with a `grid` transition pattern that doesn't force layout recalc:

```tsx
// Before (layout thrash):
<motion.div
  initial={{ height: 0, opacity: 0 }}
  animate={{ height: 'auto', opacity: 1 }}
  exit={{ height: 0, opacity: 0 }}
  className="overflow-hidden"
>
  {children}
</motion.div>

// After (no layout thrash — uses CSS grid trick):
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2 }}
  style={{ display: 'grid' }}
>
  <motion.div
    initial={{ gridTemplateRows: '0fr' }}
    animate={{ gridTemplateRows: '1fr' }}
    exit={{ gridTemplateRows: '0fr' }}
    transition={{ duration: 0.2 }}
    style={{ overflow: 'hidden' }}
  >
    <div style={{ minHeight: 0 }}>
      {children}
    </div>
  </motion.div>
</motion.div>
```

Alternatively, for simpler cases, just animate opacity and use `AnimatePresence` with `mode="wait"`:

```tsx
<AnimatePresence mode="wait">
  {isOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  )}
</AnimatePresence>
```

---

## FIX-15: Remove console.log from production paths

### Isolate

30+ calls across hot paths:
- `src/hooks/useMapVetoMachine.ts` — 8 calls (lines 358, 447, 451, 476, 482, 529, 554, 630)
- `src/pages/tournaments/CaptainMatchPage.tsx` — 14 calls
- `src/components/effects/SeamlessVideoLoop.tsx:43` — fires on every video loop

### Root cause

Debug logging added during development, never cleaned up.

### The robust fix

**Step 1**: Delete all `console.log` calls from the files listed above. Keep `console.error` and `console.warn` for genuine error reporting.

**Step 2**: Add an ESLint rule to prevent future console.log in commits:

```json
// .eslintrc or eslint.config.js — add to rules:
"no-console": ["warn", { "allow": ["warn", "error"] }]
```

This allows `console.warn` and `console.error` but flags `console.log` and `console.info` as warnings.

---

## FIX-16: Fix SeamlessVideoLoop preloading

### Isolate

```
src/components/effects/SeamlessVideoLoop.tsx:36 → preload="auto"
src/App.tsx:155-161 → used as global background on every page
```

### Root cause

`preload="auto"` tells the browser to download the entire video file eagerly. Since this component is the global background on every single page, the full video downloads on first page load — even on mobile, even on slow connections.

### The robust fix

```tsx
// src/components/effects/SeamlessVideoLoop.tsx
<video
    ref={videoRef}
    src={src}
    preload="metadata"        // Only load video metadata, not the full file
    autoPlay
    muted
    playsInline
    loop
    crossOrigin="anonymous"
    className="absolute inset-0 w-full h-full object-cover"
    // Remove console.log/error handlers:
    // onPlay and onError handlers removed — no debug logging in production
/>
```

With `preload="metadata"`, the browser only fetches enough to know the video dimensions and duration. The actual video data loads progressively as the browser starts playback via `autoPlay`.

---

## FIX-17: Add `loading="lazy"` to offscreen images

### Root cause

Most `<img>` tags in the codebase use bare `<img src={...}>` without `loading="lazy"`. The browser eagerly fetches all images, even those scrolled far below the fold.

### The robust fix

Create a shared image component:

```tsx
// src/components/ui/LazyImage.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  eager?: boolean; // For above-the-fold images that should NOT be lazy
}

export const LazyImage: React.FC<LazyImageProps> = ({ eager, className, ...props }) => (
  <img
    loading={eager ? 'eager' : 'lazy'}
    decoding="async"
    className={cn(className)}
    {...props}
  />
);
```

Then progressively replace `<img>` with `<LazyImage>` across the codebase, starting with the highest-traffic pages (tournament details, venue search, team lists).

---

## FIX-18: Add `.limit()` to unbounded list queries

### Root cause

Several hooks fetch entire tables without pagination. As the database grows, these queries return larger and larger payloads.

### The robust fix

Audit every list query and ensure it has a `limit` parameter. For API endpoints, add `?page=1&pageSize=25` query parameters. For Supabase direct queries (any remaining), add `.range(offset, offset + pageSize - 1)`.

Priority targets:
- Participant lists in `Details.tsx` (already addressed in FIX-07)
- Admin user lists in `useAdminUsers.ts`
- Staff lists in `useTournamentStaff.ts`

---

# Quick Reference Checklist

| Fix | File(s) | Time | Done? |
|-----|---------|------|-------|
| FIX-01 | App.tsx, testSupabase.ts | 5 min | [ ] |
| FIX-02 | package.json | 5 min | [ ] |
| FIX-03 | vite.config.ts | 10 min | [ ] |
| FIX-04 | UnifiedProfileContext.tsx | 30 min | [ ] |
| FIX-05 | AdminContext.tsx | 5 min | [ ] |
| FIX-06 | GraphBracket.tsx, GraphMatchCard.tsx | 20 min | [ ] |
| FIX-07 | Details.tsx + .NET batch endpoint | 1 hr | [ ] |
| FIX-08 | CaptainMatchPage.tsx | 15 min | [ ] |
| FIX-09 | useMessaging.ts | 15 min | [ ] |
| FIX-10 | useTeamMutations.ts | 2 min | [ ] |
| FIX-11 | index.css, index.html | 10 min | [ ] |
| FIX-12 | App.tsx | 2 min | [ ] |
| FIX-13 | Details.tsx | 30 min | [ ] |
| FIX-14 | 6 files with height:'auto' | 30 min | [ ] |
| FIX-15 | useMapVetoMachine, CaptainMatchPage, etc. | 15 min | [ ] |
| FIX-16 | SeamlessVideoLoop.tsx | 5 min | [ ] |
| FIX-17 | Create LazyImage + replace <img> tags | 1 hr | [ ] |
| FIX-18 | Various hooks | 30 min | [ ] |

**Total estimated effort**: ~5-6 hours for all 18 fixes.

**Recommended execution order** (maximum ROI per hour):
1. FIX-01 + FIX-02 + FIX-12 (10 min, instant wins)
2. FIX-05 + FIX-10 (7 min, bug fixes)
3. FIX-11 + FIX-16 + FIX-15 (30 min, network + cleanup)
4. FIX-04 + FIX-09 (45 min, biggest rendering + real-time wins)
5. FIX-03 + FIX-06 (30 min, bundle + bracket)
6. FIX-07 + FIX-08 + FIX-13 (1.5 hr, data fetching overhaul)
7. FIX-14 + FIX-17 + FIX-18 (2 hr, polish)
